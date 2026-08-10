//! Motor de consulta universal (SPEC §15): paginación, orden, búsqueda,
//! filtros, proyección, agregación y exportación para cualquier listado.
//!
//! Regla de seguridad central: los nombres de columna que llegan del cliente
//! (`filters`, `sort`, `q` vía `buscable`, `fields`, `group_by`, `metrics`)
//! **nunca** se interpolan directamente en SQL. Siempre se resuelven primero
//! contra la allowlist explícita de un [`ResourceSchema`]; un nombre que no
//! está en la lista es un error de negocio (`AppError::FiltroInvalido`), no
//! una oportunidad de inyección. Los valores siempre viajan como parámetros
//! ligados (`rusqlite::types::Value`), nunca como texto concatenado.

use rusqlite::types::Value as SqlValue;
use rusqlite::Connection;
use serde::Deserialize;
use serde_json::{Map, Value as JsonValue};

use crate::domain::{Agregado, AgregadoMeta, Listado, Paginado};
use crate::error::{AppError, AppResult};

pub const PAGE_SIZE_DEFAULT: i64 = 50;
pub const PAGE_SIZE_MAX: i64 = 200;
/// Tope de seguridad para `page_size: -1` o `export: true` (SPEC §15.2, §15.8).
pub const EXPORT_MAX: i64 = 5000;

/// Parámetros de consulta universal recibidos por IPC (SPEC §15.9). Un único
/// struct nombrado: Tauri IPC pasa argumentos con nombre, no un query string.
#[derive(Debug, Clone, Deserialize, Default)]
#[serde(default)]
pub struct ListParams {
    pub page: Option<i64>,
    pub page_size: Option<i64>,
    /// `"campo,-otro"` — el signo precede a cada campo (SPEC §15.3).
    pub sort: Option<String>,
    /// Búsqueda de texto libre, multi-término, todos deben coincidir (SPEC §15.4).
    pub q: Option<String>,
    /// `"campo:operador:valor"`, repetible (SPEC §15.5).
    pub filters: Option<Vec<String>>,
    /// `"AND"` (defecto) o `"OR"` entre los filtros de `filters`.
    pub filter_logic: Option<String>,
    /// Proyección de campos (SPEC §15.6). Si se omite, se devuelven todos.
    pub fields: Option<Vec<String>>,
    /// Campo de agrupación (SPEC §15.7). Si está presente, la respuesta es de grupos.
    pub group_by: Option<String>,
    /// `"sum(campo)"`, `"count(*)"`, `"avg(campo)"`, `"min(campo)"`, `"max(campo)"`.
    pub metrics: Option<Vec<String>>,
    /// Ignora la paginación y aplica el tope de seguridad (SPEC §15.8).
    pub export: bool,
}

/// Tipo declarado de una columna: gobierna cómo se parsean los valores de
/// filtro y cómo se traduce el valor crudo de SQLite a JSON.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum ColTipo {
    Texto,
    Entero,
    Real,
    Booleano,
}

/// Una columna consultable de un recurso: nombre público + expresión SQL real.
#[derive(Debug, Clone, Copy)]
pub struct ColumnDef {
    pub nombre: &'static str,
    pub expr: &'static str,
    pub tipo: ColTipo,
    pub filtrable: bool,
    pub ordenable: bool,
    pub buscable: bool,
}

/// Declaración de un recurso consultable: de dónde viene (`from`, con JOINs
/// si hace falta para rutas de relación) y qué columnas admite. Es la
/// allowlist completa: nada fuera de `columnas` llega a una sentencia SQL.
pub struct ResourceSchema {
    pub from: &'static str,
    pub columnas: &'static [ColumnDef],
    /// Expresión de `ORDER BY` cuando no se pide `sort` (SPEC §15.3: más
    /// reciente primero, desempate estable).
    pub orden_defecto: &'static str,
}

impl ResourceSchema {
    fn columna(&self, nombre: &str) -> AppResult<&ColumnDef> {
        self.columnas
            .iter()
            .find(|c| c.nombre == nombre)
            .ok_or_else(|| AppError::FiltroInvalido(nombre.to_string()))
    }

    fn columna_filtrable(&self, nombre: &str) -> AppResult<&ColumnDef> {
        let col = self.columna(nombre)?;
        if !col.filtrable {
            return Err(AppError::FiltroInvalido(nombre.to_string()));
        }
        Ok(col)
    }

    fn columna_ordenable(&self, nombre: &str) -> AppResult<&ColumnDef> {
        let col = self.columna(nombre)?;
        if !col.ordenable {
            return Err(AppError::FiltroInvalido(nombre.to_string()));
        }
        Ok(col)
    }
}

/// Punto de entrada único: ejecuta un listado universal contra `schema` según
/// `params` y devuelve la respuesta ya lista para serializar al frontend.
pub fn listar(conn: &Connection, schema: &ResourceSchema, params: &ListParams) -> AppResult<Listado> {
    if let Some(group_by) = params.group_by.as_deref() {
        return agregar(conn, schema, params, group_by).map(Listado::Grupos);
    }
    filas(conn, schema, params).map(Listado::Filas)
}

fn filas(conn: &Connection, schema: &ResourceSchema, params: &ListParams) -> AppResult<Paginado<JsonValue>> {
    let (where_sql, binds) = construir_where(schema, params)?;
    let order_sql = construir_order(schema, params.sort.as_deref())?;

    let columnas_salida: Vec<&ColumnDef> = match &params.fields {
        Some(campos) if !campos.is_empty() => campos
            .iter()
            .map(|c| schema.columna(c))
            .collect::<AppResult<Vec<_>>>()?,
        _ => schema.columnas.iter().collect(),
    };
    let select_list = columnas_salida
        .iter()
        .map(|c| c.expr)
        .collect::<Vec<_>>()
        .join(", ");

    let total: i64 = conn.query_row(
        &format!("SELECT COUNT(*) FROM {}{where_sql}", schema.from),
        rusqlite::params_from_iter(binds.iter()),
        |r| r.get(0),
    )?;

    let quiere_todo = params.export || params.page_size == Some(-1);
    let (limit, offset, page_reportado, page_size_reportado) = if quiere_todo {
        (EXPORT_MAX, 0, 1, total.clamp(0, EXPORT_MAX).max(1))
    } else {
        let page = params.page.unwrap_or(1).max(1);
        let page_size = params
            .page_size
            .unwrap_or(PAGE_SIZE_DEFAULT)
            .clamp(1, PAGE_SIZE_MAX);
        (page_size, (page - 1) * page_size, page, page_size)
    };

    let mut todos_binds = binds.clone();
    todos_binds.push(SqlValue::Integer(limit));
    todos_binds.push(SqlValue::Integer(offset));
    let sql = format!(
        "SELECT {select_list} FROM {}{where_sql} ORDER BY {order_sql} LIMIT ? OFFSET ?",
        schema.from
    );
    let mut stmt = conn.prepare(&sql)?;
    let filas: Vec<JsonValue> = stmt
        .query_map(rusqlite::params_from_iter(todos_binds.iter()), |r| {
            fila_a_json(r, &columnas_salida)
        })?
        .collect::<Result<Vec<_>, _>>()?;

    Ok(Paginado::new(filas, total, page_reportado, page_size_reportado))
}

fn agregar(
    conn: &Connection,
    schema: &ResourceSchema,
    params: &ListParams,
    group_by: &str,
) -> AppResult<Agregado<JsonValue>> {
    let col_group = schema.columna(group_by)?;
    let (where_sql, binds) = construir_where(schema, params)?;

    let metricas = params.metrics.clone().unwrap_or_default();
    let mut select_metricas = Vec::new();
    let mut alias_metricas = Vec::new();
    for m in &metricas {
        let (funcion, campo) = parsear_metrica(m)?;
        let expr = if campo == "*" {
            "*".to_string()
        } else {
            schema.columna(&campo)?.expr.to_string()
        };
        let alias = format!("m_{funcion}_{}", campo.replace('*', "total"));
        select_metricas.push(format!("{}({expr}) AS {alias}", funcion.to_uppercase()));
        alias_metricas.push(alias);
    }
    let select_extra = if select_metricas.is_empty() {
        String::new()
    } else {
        format!(", {}", select_metricas.join(", "))
    };
    let sql = format!(
        "SELECT {} AS key, COUNT(*) AS count{select_extra} FROM {}{where_sql} GROUP BY {} ORDER BY count DESC",
        col_group.expr, schema.from, col_group.expr
    );
    let mut stmt = conn.prepare(&sql)?;
    let grupos: Vec<JsonValue> = stmt
        .query_map(rusqlite::params_from_iter(binds.iter()), |r| {
            let mut obj = Map::new();
            let key: SqlValue = r.get(0)?;
            obj.insert("key".into(), valor_a_json(key, false));
            let count: i64 = r.get(1)?;
            obj.insert("count".into(), JsonValue::from(count));
            for (i, alias) in alias_metricas.iter().enumerate() {
                let v: SqlValue = r.get(2 + i)?;
                obj.insert(alias.clone(), valor_a_json(v, false));
            }
            Ok(JsonValue::Object(obj))
        })?
        .collect::<Result<Vec<_>, _>>()?;

    let total = grupos.len() as i64;
    Ok(Agregado {
        groups: grupos,
        meta: AgregadoMeta { total },
    })
}

fn parsear_metrica(m: &str) -> AppResult<(String, String)> {
    let m = m.trim();
    let abre = m
        .find('(')
        .ok_or_else(|| AppError::FiltroInvalido(m.to_string()))?;
    let cierra = m
        .rfind(')')
        .ok_or_else(|| AppError::FiltroInvalido(m.to_string()))?;
    if cierra <= abre {
        return Err(AppError::FiltroInvalido(m.to_string()));
    }
    let funcion = m[..abre].trim().to_ascii_lowercase();
    let campo = m[abre + 1..cierra].trim().to_string();
    if !["sum", "count", "avg", "min", "max"].contains(&funcion.as_str()) {
        return Err(AppError::FiltroInvalido(format!(
            "función de agregación no soportada: {funcion}"
        )));
    }
    if campo.is_empty() {
        return Err(AppError::FiltroInvalido(m.to_string()));
    }
    Ok((funcion, campo))
}

fn construir_where(schema: &ResourceSchema, params: &ListParams) -> AppResult<(String, Vec<SqlValue>)> {
    let mut clausulas = Vec::new();
    let mut binds = Vec::new();

    if let Some(filtros) = &params.filters {
        for f in filtros {
            let mut partes = f.splitn(3, ':');
            let campo = partes
                .next()
                .filter(|s| !s.is_empty())
                .ok_or_else(|| AppError::FiltroInvalido(f.clone()))?;
            let operador = partes
                .next()
                .ok_or_else(|| AppError::FiltroInvalido(f.clone()))?;
            let valor = partes
                .next()
                .ok_or_else(|| AppError::FiltroInvalido(f.clone()))?;
            let col = schema.columna_filtrable(campo)?;
            let (sql, vals) = clausula_filtro(col, operador, valor)?;
            clausulas.push(sql);
            binds.extend(vals);
        }
    }

    let logic = match params.filter_logic.as_deref() {
        Some(s) if s.eq_ignore_ascii_case("OR") => "OR",
        _ => "AND",
    };
    let mut where_sql = if clausulas.is_empty() {
        String::new()
    } else {
        format!(" WHERE ({})", clausulas.join(&format!(" {logic} ")))
    };

    if let Some(q) = &params.q {
        let terminos: Vec<&str> = q.split_whitespace().collect();
        let buscables: Vec<&ColumnDef> = schema.columnas.iter().filter(|c| c.buscable).collect();
        if !terminos.is_empty() && !buscables.is_empty() {
            let mut grupos_terminos = Vec::new();
            for t in &terminos {
                let ors: Vec<String> = buscables
                    .iter()
                    .map(|c| format!("{} LIKE ? ESCAPE '\\'", c.expr))
                    .collect();
                grupos_terminos.push(format!("({})", ors.join(" OR ")));
                for _ in &buscables {
                    binds.push(SqlValue::Text(escapar_like(t, true, true)));
                }
            }
            let clausula_q = format!("({})", grupos_terminos.join(" AND "));
            if where_sql.is_empty() {
                where_sql = format!(" WHERE {clausula_q}");
            } else {
                where_sql.push_str(&format!(" AND {clausula_q}"));
            }
        }
    }

    Ok((where_sql, binds))
}

fn construir_order(schema: &ResourceSchema, sort: Option<&str>) -> AppResult<String> {
    let Some(sort) = sort.filter(|s| !s.trim().is_empty()) else {
        return Ok(schema.orden_defecto.to_string());
    };
    let mut partes = Vec::new();
    for tok in sort.split(',').map(str::trim).filter(|s| !s.is_empty()) {
        let (desc, nombre) = match tok.strip_prefix('-') {
            Some(resto) => (true, resto),
            None => (false, tok),
        };
        let col = schema.columna_ordenable(nombre)?;
        partes.push(format!("{} {}", col.expr, if desc { "DESC" } else { "ASC" }));
    }
    if partes.is_empty() {
        Ok(schema.orden_defecto.to_string())
    } else {
        Ok(partes.join(", "))
    }
}

fn clausula_filtro(col: &ColumnDef, operador: &str, valor: &str) -> AppResult<(String, Vec<SqlValue>)> {
    match operador {
        "eq" => Ok((format!("{} = ?", col.expr), vec![parsear_valor(col.tipo, valor)?])),
        "neq" => Ok((format!("{} <> ?", col.expr), vec![parsear_valor(col.tipo, valor)?])),
        "gt" => Ok((format!("{} > ?", col.expr), vec![parsear_valor(col.tipo, valor)?])),
        "gte" => Ok((format!("{} >= ?", col.expr), vec![parsear_valor(col.tipo, valor)?])),
        "lt" => Ok((format!("{} < ?", col.expr), vec![parsear_valor(col.tipo, valor)?])),
        "lte" => Ok((format!("{} <= ?", col.expr), vec![parsear_valor(col.tipo, valor)?])),
        "in" | "nin" => {
            let vals: Vec<&str> = valor.split(',').map(str::trim).filter(|s| !s.is_empty()).collect();
            if vals.is_empty() {
                return Err(AppError::FiltroInvalido(format!("{operador} requiere al menos un valor")));
            }
            let placeholders = vals.iter().map(|_| "?").collect::<Vec<_>>().join(",");
            let binds = vals
                .iter()
                .map(|v| parsear_valor(col.tipo, v))
                .collect::<AppResult<Vec<_>>>()?;
            let negado = if operador == "nin" { "NOT " } else { "" };
            Ok((format!("{}{} IN ({placeholders})", negado, col.expr), binds))
        }
        "contains" => Ok((
            format!("{} LIKE ? ESCAPE '\\'", col.expr),
            vec![SqlValue::Text(escapar_like(valor, true, true))],
        )),
        "starts" => Ok((
            format!("{} LIKE ? ESCAPE '\\'", col.expr),
            vec![SqlValue::Text(escapar_like(valor, false, true))],
        )),
        "ends" => Ok((
            format!("{} LIKE ? ESCAPE '\\'", col.expr),
            vec![SqlValue::Text(escapar_like(valor, true, false))],
        )),
        "between" => {
            let partes: Vec<&str> = valor.splitn(2, ',').map(str::trim).collect();
            if partes.len() != 2 || partes[0].is_empty() || partes[1].is_empty() {
                return Err(AppError::FiltroInvalido(
                    "between requiere dos valores separados por coma".into(),
                ));
            }
            Ok((
                format!("{} BETWEEN ? AND ?", col.expr),
                vec![parsear_valor(col.tipo, partes[0])?, parsear_valor(col.tipo, partes[1])?],
            ))
        }
        "is_null" => Ok((
            format!("{} IS {}NULL", col.expr, if es_verdadero(valor) { "" } else { "NOT " }),
            vec![],
        )),
        "not_null" => Ok((
            format!("{} IS {}NULL", col.expr, if es_verdadero(valor) { "NOT " } else { "" }),
            vec![],
        )),
        otro => Err(AppError::FiltroInvalido(format!("operador desconocido: {otro}"))),
    }
}

fn es_verdadero(valor: &str) -> bool {
    matches!(valor.trim().to_ascii_lowercase().as_str(), "true" | "1")
}

/// Escapa `%`, `_` y `\` de un valor de usuario antes de envolverlo en
/// comodines LIKE, para que el operador de filtro nunca inyecte comodines
/// implícitos desde datos arbitrarios.
fn escapar_like(valor: &str, comodin_izq: bool, comodin_der: bool) -> String {
    let escapado = valor.replace('\\', "\\\\").replace('%', "\\%").replace('_', "\\_");
    match (comodin_izq, comodin_der) {
        (true, true) => format!("%{escapado}%"),
        (false, true) => format!("{escapado}%"),
        (true, false) => format!("%{escapado}"),
        (false, false) => escapado,
    }
}

fn parsear_valor(tipo: ColTipo, raw: &str) -> AppResult<SqlValue> {
    let raw = raw.trim();
    Ok(match tipo {
        ColTipo::Texto => SqlValue::Text(raw.to_string()),
        ColTipo::Entero => SqlValue::Integer(
            raw.parse::<i64>()
                .map_err(|_| AppError::FiltroInvalido(format!("valor entero inválido: {raw}")))?,
        ),
        ColTipo::Real => SqlValue::Real(
            raw.parse::<f64>()
                .map_err(|_| AppError::FiltroInvalido(format!("valor numérico inválido: {raw}")))?,
        ),
        ColTipo::Booleano => SqlValue::Integer(match raw.to_ascii_lowercase().as_str() {
            "true" | "1" => 1,
            "false" | "0" => 0,
            _ => return Err(AppError::FiltroInvalido(format!("valor booleano inválido: {raw}"))),
        }),
    })
}

fn fila_a_json(row: &rusqlite::Row<'_>, columnas: &[&ColumnDef]) -> rusqlite::Result<JsonValue> {
    let mut obj = Map::new();
    for (i, col) in columnas.iter().enumerate() {
        let val: SqlValue = row.get(i)?;
        obj.insert(col.nombre.to_string(), valor_a_json(val, col.tipo == ColTipo::Booleano));
    }
    Ok(JsonValue::Object(obj))
}

fn valor_a_json(val: SqlValue, es_booleano: bool) -> JsonValue {
    match val {
        SqlValue::Null => JsonValue::Null,
        SqlValue::Integer(n) if es_booleano => JsonValue::Bool(n != 0),
        SqlValue::Integer(n) => JsonValue::from(n),
        SqlValue::Real(f) => serde_json::Number::from_f64(f).map(JsonValue::Number).unwrap_or(JsonValue::Null),
        SqlValue::Text(s) => JsonValue::String(s),
        SqlValue::Blob(_) => JsonValue::Null,
    }
}

// ============ Esquemas por recurso (allowlist de columnas, SPEC §3-§13) ============

pub static ALMACEN_SCHEMA: ResourceSchema = ResourceSchema {
    from: "almacenes a",
    orden_defecto: "a.created_at DESC, a.id DESC",
    columnas: &[
        col("id", "a.id", ColTipo::Texto, true, true, false),
        col("codigo", "a.codigo", ColTipo::Texto, true, true, true),
        col("nombre", "a.nombre", ColTipo::Texto, true, true, true),
        col("descripcion", "a.descripcion", ColTipo::Texto, false, false, true),
        col("direccion", "a.direccion", ColTipo::Texto, false, false, true),
        col("activo", "a.activo", ColTipo::Booleano, true, true, false),
        col("created_by", "a.created_by", ColTipo::Texto, true, false, false),
        col("created_at", "a.created_at", ColTipo::Texto, true, true, false),
        col("updated_by", "a.updated_by", ColTipo::Texto, true, false, false),
        col("updated_at", "a.updated_at", ColTipo::Texto, true, true, false),
    ],
};

pub static ZONA_SCHEMA: ResourceSchema = ResourceSchema {
    from: "zonas z",
    orden_defecto: "z.created_at DESC, z.id DESC",
    columnas: &[
        col("id", "z.id", ColTipo::Texto, true, true, false),
        col("codigo", "z.codigo", ColTipo::Texto, true, true, true),
        col("nombre", "z.nombre", ColTipo::Texto, true, true, true),
        col("descripcion", "z.descripcion", ColTipo::Texto, false, false, true),
        col("almacen_id", "z.almacen_id", ColTipo::Texto, true, true, false),
        col("activo", "z.activo", ColTipo::Booleano, true, true, false),
        col("created_by", "z.created_by", ColTipo::Texto, true, false, false),
        col("created_at", "z.created_at", ColTipo::Texto, true, true, false),
        col("updated_by", "z.updated_by", ColTipo::Texto, true, false, false),
        col("updated_at", "z.updated_at", ColTipo::Texto, true, true, false),
    ],
};

pub static RACK_SCHEMA: ResourceSchema = ResourceSchema {
    from: "racks r",
    orden_defecto: "r.created_at DESC, r.id DESC",
    columnas: &[
        col("id", "r.id", ColTipo::Texto, true, true, false),
        col("codigo", "r.codigo", ColTipo::Texto, true, true, true),
        col("nombre", "r.nombre", ColTipo::Texto, false, false, true),
        col("tipo", "r.tipo", ColTipo::Texto, true, true, true),
        col("zona_id", "r.zona_id", ColTipo::Texto, true, true, false),
        col("activo", "r.activo", ColTipo::Booleano, true, true, false),
        col("created_by", "r.created_by", ColTipo::Texto, true, false, false),
        col("created_at", "r.created_at", ColTipo::Texto, true, true, false),
        col("updated_by", "r.updated_by", ColTipo::Texto, true, false, false),
        col("updated_at", "r.updated_at", ColTipo::Texto, true, true, false),
    ],
};

pub static SECCION_SCHEMA: ResourceSchema = ResourceSchema {
    from: "secciones s",
    orden_defecto: "s.created_at DESC, s.id DESC",
    columnas: &[
        col("id", "s.id", ColTipo::Texto, true, true, false),
        col("codigo", "s.codigo", ColTipo::Texto, true, true, true),
        col("nombre", "s.nombre", ColTipo::Texto, false, false, true),
        col("nivel", "s.nivel", ColTipo::Texto, true, true, true),
        col("rack_id", "s.rack_id", ColTipo::Texto, true, true, false),
        col("descripcion", "s.descripcion", ColTipo::Texto, false, false, true),
        col("activo", "s.activo", ColTipo::Booleano, true, true, false),
        col("created_by", "s.created_by", ColTipo::Texto, true, false, false),
        col("created_at", "s.created_at", ColTipo::Texto, true, true, false),
        col("updated_by", "s.updated_by", ColTipo::Texto, true, false, false),
        col("updated_at", "s.updated_at", ColTipo::Texto, true, true, false),
    ],
};

pub static UBICACION_SCHEMA: ResourceSchema = ResourceSchema {
    from: "ubicaciones u",
    orden_defecto: "u.created_at DESC, u.id DESC",
    columnas: &[
        col("id", "u.id", ColTipo::Texto, true, true, false),
        col("codigo", "u.codigo", ColTipo::Texto, true, true, true),
        col("nombre", "u.nombre", ColTipo::Texto, false, false, true),
        col("seccion_id", "u.seccion_id", ColTipo::Texto, true, true, false),
        col("tipo", "u.tipo", ColTipo::Texto, true, true, true),
        col("capacidad_maxima", "u.capacidad_maxima", ColTipo::Entero, true, true, false),
        col("activo", "u.activo", ColTipo::Booleano, true, true, false),
        col("created_by", "u.created_by", ColTipo::Texto, true, false, false),
        col("created_at", "u.created_at", ColTipo::Texto, true, true, false),
        col("updated_by", "u.updated_by", ColTipo::Texto, true, false, false),
        col("updated_at", "u.updated_at", ColTipo::Texto, true, true, false),
    ],
};

pub static CAJA_SCHEMA: ResourceSchema = ResourceSchema {
    from: "cajas c",
    orden_defecto: "c.created_at DESC, c.id DESC",
    columnas: &[
        col("id", "c.id", ColTipo::Texto, true, true, false),
        col("codigo", "c.codigo", ColTipo::Texto, true, true, true),
        col("nombre", "c.nombre", ColTipo::Texto, false, false, true),
        col("ubicacion_id", "c.ubicacion_id", ColTipo::Texto, true, true, false),
        col("producto_id", "c.producto_id", ColTipo::Texto, true, false, false),
        col("lote_id", "c.lote_id", ColTipo::Texto, true, false, false),
        col("etiqueta", "c.etiqueta", ColTipo::Texto, true, false, true),
        col("activo", "c.activo", ColTipo::Booleano, true, true, false),
        col("created_by", "c.created_by", ColTipo::Texto, true, false, false),
        col("created_at", "c.created_at", ColTipo::Texto, true, true, false),
        col("updated_by", "c.updated_by", ColTipo::Texto, true, false, false),
        col("updated_at", "c.updated_at", ColTipo::Texto, true, true, false),
    ],
};

pub static PRODUCTO_SCHEMA: ResourceSchema = ResourceSchema {
    from: "productos p",
    orden_defecto: "p.created_at DESC, p.id DESC",
    columnas: &[
        col("id", "p.id", ColTipo::Texto, true, true, false),
        // Búsqueda exacta de SKU/código de barras tiene prioridad (SPEC §15.4);
        // ambos son también buscables por texto libre.
        col("sku", "p.sku", ColTipo::Texto, true, true, true),
        col("nombre", "p.nombre", ColTipo::Texto, true, true, true),
        col("descripcion", "p.descripcion", ColTipo::Texto, false, false, true),
        col("categoria_id", "p.categoria_id", ColTipo::Texto, true, true, false),
        col("uom_base_id", "p.uom_base_id", ColTipo::Texto, true, false, false),
        col("uom_venta_id", "p.uom_venta_id", ColTipo::Texto, true, false, false),
        col("uom_compra_id", "p.uom_compra_id", ColTipo::Texto, true, false, false),
        col("codigo_barras", "p.codigo_barras", ColTipo::Texto, true, true, true),
        col("peso_unitario", "p.peso_unitario", ColTipo::Real, true, true, false),
        col("volumen_unitario", "p.volumen_unitario", ColTipo::Real, true, true, false),
        col("stock_minimo", "p.stock_minimo", ColTipo::Entero, true, true, false),
        col("stock_maximo", "p.stock_maximo", ColTipo::Entero, true, true, false),
        col("controla_lote", "p.controla_lote", ColTipo::Booleano, true, true, false),
        col("controla_vencimiento", "p.controla_vencimiento", ColTipo::Booleano, true, true, false),
        col("perecedero", "p.perecedero", ColTipo::Booleano, true, true, false),
        col("activo", "p.activo", ColTipo::Booleano, true, true, false),
        col("created_by", "p.created_by", ColTipo::Texto, true, false, false),
        col("created_at", "p.created_at", ColTipo::Texto, true, true, false),
        col("updated_by", "p.updated_by", ColTipo::Texto, true, false, false),
        col("updated_at", "p.updated_at", ColTipo::Texto, true, true, false),
    ],
};

pub static LOTE_SCHEMA: ResourceSchema = ResourceSchema {
    from: "lotes l",
    orden_defecto: "l.fecha_vencimiento ASC, l.id DESC",
    columnas: &[
        col("id", "l.id", ColTipo::Texto, true, true, false),
        col("numero", "l.numero", ColTipo::Texto, true, true, true),
        col("producto_id", "l.producto_id", ColTipo::Texto, true, true, false),
        col("fecha_fabricacion", "l.fecha_fabricacion", ColTipo::Texto, true, true, false),
        col("fecha_vencimiento", "l.fecha_vencimiento", ColTipo::Texto, true, true, false),
        col("origen", "l.origen", ColTipo::Texto, true, false, true),
        col("notas", "l.notas", ColTipo::Texto, false, false, true),
        col("created_by", "l.created_by", ColTipo::Texto, true, false, false),
        col("created_at", "l.created_at", ColTipo::Texto, true, true, false),
        col("updated_by", "l.updated_by", ColTipo::Texto, true, false, false),
        col("updated_at", "l.updated_at", ColTipo::Texto, true, true, false),
    ],
};

pub static PROVEEDOR_SCHEMA: ResourceSchema = ResourceSchema {
    from: "proveedores pr",
    orden_defecto: "pr.created_at DESC, pr.id DESC",
    columnas: &[
        col("id", "pr.id", ColTipo::Texto, true, true, false),
        col("codigo", "pr.codigo", ColTipo::Texto, true, true, true),
        col("nombre", "pr.nombre", ColTipo::Texto, true, true, true),
        col("contacto_nombre", "pr.contacto_nombre", ColTipo::Texto, false, false, true),
        col("contacto_telefono", "pr.contacto_telefono", ColTipo::Texto, false, false, true),
        col("contacto_email", "pr.contacto_email", ColTipo::Texto, false, false, true),
        col("direccion", "pr.direccion", ColTipo::Texto, false, false, true),
        col("activo", "pr.activo", ColTipo::Booleano, true, true, false),
        col("created_by", "pr.created_by", ColTipo::Texto, true, false, false),
        col("created_at", "pr.created_at", ColTipo::Texto, true, true, false),
        col("updated_by", "pr.updated_by", ColTipo::Texto, true, false, false),
        col("updated_at", "pr.updated_at", ColTipo::Texto, true, true, false),
    ],
};

pub static CLIENTE_SCHEMA: ResourceSchema = ResourceSchema {
    from: "clientes cl",
    orden_defecto: "cl.created_at DESC, cl.id DESC",
    columnas: &[
        col("id", "cl.id", ColTipo::Texto, true, true, false),
        col("codigo", "cl.codigo", ColTipo::Texto, true, true, true),
        col("nombre", "cl.nombre", ColTipo::Texto, true, true, true),
        col("contacto_nombre", "cl.contacto_nombre", ColTipo::Texto, false, false, true),
        col("contacto_telefono", "cl.contacto_telefono", ColTipo::Texto, false, false, true),
        col("contacto_email", "cl.contacto_email", ColTipo::Texto, false, false, true),
        col("direccion", "cl.direccion", ColTipo::Texto, false, false, true),
        col("activo", "cl.activo", ColTipo::Booleano, true, true, false),
        col("created_by", "cl.created_by", ColTipo::Texto, true, false, false),
        col("created_at", "cl.created_at", ColTipo::Texto, true, true, false),
        col("updated_by", "cl.updated_by", ColTipo::Texto, true, false, false),
        col("updated_at", "cl.updated_at", ColTipo::Texto, true, true, false),
    ],
};

pub static UOM_SCHEMA: ResourceSchema = ResourceSchema {
    from: "uoms uo",
    orden_defecto: "uo.codigo ASC, uo.id DESC",
    columnas: &[
        col("id", "uo.id", ColTipo::Texto, true, true, false),
        col("codigo", "uo.codigo", ColTipo::Texto, true, true, true),
        col("nombre", "uo.nombre", ColTipo::Texto, true, true, true),
        col("tipo", "uo.tipo", ColTipo::Texto, true, true, true),
        col("factor", "uo.factor", ColTipo::Entero, true, true, false),
        col("base", "uo.base", ColTipo::Booleano, true, true, false),
        col("created_at", "uo.created_at", ColTipo::Texto, true, true, false),
        col("updated_at", "uo.updated_at", ColTipo::Texto, true, true, false),
    ],
};

pub static CATEGORIA_SCHEMA: ResourceSchema = ResourceSchema {
    from: "categorias ca",
    orden_defecto: "ca.nombre ASC, ca.id DESC",
    columnas: &[
        col("id", "ca.id", ColTipo::Texto, true, true, false),
        col("nombre", "ca.nombre", ColTipo::Texto, true, true, true),
        col("parent_id", "ca.parent_id", ColTipo::Texto, true, true, false),
        col("descripcion", "ca.descripcion", ColTipo::Texto, false, false, true),
        col("activo", "ca.activo", ColTipo::Booleano, true, true, false),
        col("created_by", "ca.created_by", ColTipo::Texto, true, false, false),
        col("created_at", "ca.created_at", ColTipo::Texto, true, true, false),
        col("updated_by", "ca.updated_by", ColTipo::Texto, true, false, false),
        col("updated_at", "ca.updated_at", ColTipo::Texto, true, true, false),
    ],
};

/// Nunca incluye `password_hash` (SPEC §4.1: el hash no sale del backend).
pub static USUARIO_SCHEMA: ResourceSchema = ResourceSchema {
    from: "usuarios us",
    orden_defecto: "us.nombre_usuario ASC, us.id DESC",
    columnas: &[
        col("id", "us.id", ColTipo::Texto, true, true, false),
        col("nombre_usuario", "us.nombre_usuario", ColTipo::Texto, true, true, true),
        col("nombre_completo", "us.nombre_completo", ColTipo::Texto, true, true, true),
        col("email", "us.email", ColTipo::Texto, true, false, true),
        col("rol_id", "us.rol_id", ColTipo::Texto, true, true, false),
        col("activo", "us.activo", ColTipo::Booleano, true, true, false),
        col("ultimo_acceso_at", "us.ultimo_acceso_at", ColTipo::Texto, true, true, false),
        col("created_by", "us.created_by", ColTipo::Texto, true, false, false),
        col("created_at", "us.created_at", ColTipo::Texto, true, true, false),
        col("updated_by", "us.updated_by", ColTipo::Texto, true, false, false),
        col("updated_at", "us.updated_at", ColTipo::Texto, true, true, false),
    ],
};

pub static MOVIMIENTO_SCHEMA: ResourceSchema = ResourceSchema {
    from: "movimientos m",
    orden_defecto: "m.fecha_movimiento DESC, m.id DESC",
    columnas: &[
        col("id", "m.id", ColTipo::Texto, true, true, false),
        col("tipo", "m.tipo", ColTipo::Texto, true, true, true),
        col("sub_tipo", "m.sub_tipo", ColTipo::Texto, true, true, true),
        col("numero", "m.numero", ColTipo::Texto, true, true, true),
        col("estado", "m.estado", ColTipo::Texto, true, true, true),
        col("fecha_movimiento", "m.fecha_movimiento", ColTipo::Texto, true, true, false),
        col("motivo", "m.motivo", ColTipo::Texto, false, false, true),
        col("origen_ubicacion_id", "m.origen_ubicacion_id", ColTipo::Texto, true, true, false),
        col("destino_ubicacion_id", "m.destino_ubicacion_id", ColTipo::Texto, true, true, false),
        col("proveedor_id", "m.proveedor_id", ColTipo::Texto, true, false, false),
        col("cliente_id", "m.cliente_id", ColTipo::Texto, true, false, false),
        col("sesion_inventario_id", "m.sesion_inventario_id", ColTipo::Texto, true, false, false),
        col("documento_referencia", "m.documento_referencia", ColTipo::Texto, true, false, true),
        col("notas", "m.notas", ColTipo::Texto, false, false, true),
        col("movimiento_inverso_id", "m.movimiento_inverso_id", ColTipo::Texto, true, false, false),
        col("created_by", "m.created_by", ColTipo::Texto, true, true, false),
        col("created_at", "m.created_at", ColTipo::Texto, true, true, false),
        col("approved_by", "m.approved_by", ColTipo::Texto, true, false, false),
        col("approved_at", "m.approved_at", ColTipo::Texto, true, true, false),
        col("anulado_by", "m.anulado_by", ColTipo::Texto, true, false, false),
        col("anulado_at", "m.anulado_at", ColTipo::Texto, true, false, false),
    ],
};

pub static MOVIMIENTO_LINEA_SCHEMA: ResourceSchema = ResourceSchema {
    from: "movimiento_lineas ml",
    orden_defecto: "ml.id ASC",
    columnas: &[
        col("id", "ml.id", ColTipo::Texto, true, true, false),
        col("movimiento_id", "ml.movimiento_id", ColTipo::Texto, true, true, false),
        col("producto_id", "ml.producto_id", ColTipo::Texto, true, true, false),
        col("lote_id", "ml.lote_id", ColTipo::Texto, true, true, false),
        col("cantidad", "ml.cantidad", ColTipo::Entero, true, true, false),
        col("origen_ubicacion_id", "ml.origen_ubicacion_id", ColTipo::Texto, true, false, false),
        col("destino_ubicacion_id", "ml.destino_ubicacion_id", ColTipo::Texto, true, false, false),
        col("caja_origen_id", "ml.caja_origen_id", ColTipo::Texto, true, false, false),
        col("caja_destino_id", "ml.caja_destino_id", ColTipo::Texto, true, false, false),
    ],
};

pub static SESION_INVENTARIO_SCHEMA: ResourceSchema = ResourceSchema {
    from: "sesiones_inventario si",
    orden_defecto: "si.created_at DESC, si.id DESC",
    columnas: &[
        col("id", "si.id", ColTipo::Texto, true, true, false),
        col("numero", "si.numero", ColTipo::Texto, true, true, true),
        col("tipo", "si.tipo", ColTipo::Texto, true, true, true),
        col("estado", "si.estado", ColTipo::Texto, true, true, true),
        col("almacen_id", "si.almacen_id", ColTipo::Texto, true, true, false),
        col("alcance", "si.alcance", ColTipo::Texto, false, false, true),
        col("fecha_inicio", "si.fecha_inicio", ColTipo::Texto, true, true, false),
        col("fecha_fin", "si.fecha_fin", ColTipo::Texto, true, true, false),
        col("responsable_id", "si.responsable_id", ColTipo::Texto, true, true, false),
        col("conteo_ciego", "si.conteo_ciego", ColTipo::Booleano, true, true, false),
        col("exige_doble_conteo", "si.exige_doble_conteo", ColTipo::Booleano, true, true, false),
        col("created_by", "si.created_by", ColTipo::Texto, true, true, false),
        col("created_at", "si.created_at", ColTipo::Texto, true, true, false),
        col("closed_by", "si.closed_by", ColTipo::Texto, true, false, false),
        col("closed_at", "si.closed_at", ColTipo::Texto, true, false, false),
    ],
};

const fn col(
    nombre: &'static str,
    expr: &'static str,
    tipo: ColTipo,
    filtrable: bool,
    ordenable: bool,
    buscable: bool,
) -> ColumnDef {
    ColumnDef {
        nombre,
        expr,
        tipo,
        filtrable,
        ordenable,
        buscable,
    }
}
