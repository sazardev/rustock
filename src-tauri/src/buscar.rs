//! Búsqueda global del command palette (SPEC §15.4).
//!
//! Consulta varios recursos en una sola llamada — cada uno con permisos
//! (`puede`) y columnas buscables indexadas — y devuelve resultados
//! normalizados y agrupados, ordenados por relevancia (coincidencia exacta
//! en el código/SKU/número > prefijo > contiene). Es un servicio de lectura:
//! nunca altera datos.
//!
//! El frontend mapea cada `recurso` a su icono y ruta de detalle; aquí solo
//! se resuelven las etiquetas crudas. Los valores de tipo/estado de
//! movimientos, sesiones y alertas viajan en `datos` para que la UI los
//! etiquete con sus propios textos (DESIGN §9.1).

use rusqlite::Connection;
use rusqlite::types::Value as SqlValue;
use serde::Serialize;
use serde_json::{Map, Value as JsonValue};

use crate::error::AppResult;
use crate::query::{self, ResourceSchema};

/// Un resultado individual, listo para serializar al frontend.
#[derive(Debug, Clone, Serialize)]
pub struct BuscarItem {
    pub id: String,
    /// Etiqueta principal (código/SKU/número/nombre).
    pub titulo: String,
    /// Etiqueta secundaria legible (nombre, origen…). `None` cuando la
    /// secundaria se compone en `datos` (p. ej. tipo/estado de un movimiento).
    pub subtitulo: Option<String>,
    /// Datos crudos adicionales (clave = nombre de columna): tipo/estado de
    /// un movimiento o sesión, entidad ancla de una alerta. La UI los
    /// etiqueta con sus propios mapas.
    pub datos: Option<JsonValue>,
}

/// Un grupo de resultados para una entidad (recurso) concreta.
#[derive(Debug, Clone, Serialize)]
pub struct BuscarGrupo {
    /// Clave de recurso que el frontend mapea a icono + ruta de detalle
    /// (misma nomenclatura que `CATALOGOS` del frontend).
    pub recurso: String,
    pub items: Vec<BuscarItem>,
}

/// Respuesta completa del comando `buscar`.
#[derive(Debug, Clone, Serialize)]
pub struct BuscarRespuesta {
    pub query: String,
    pub grupos: Vec<BuscarGrupo>,
}

/// Configuración de un recurso consultable por el palette: su schema del
/// motor universal, las columnas que componen cada etiqueta, la clave de
/// relevancia y el recurso de la matriz de permisos (SPEC §4.3).
struct RecursoBusqueda {
    /// Clave pública que ve el frontend (coincide con `CATALOGOS`).
    recurso: &'static str,
    /// Recurso de la matriz de permisos para la acción `ver`.
    permiso: &'static str,
    schema: &'static ResourceSchema,
    id_col: &'static str,
    titulo_col: &'static str,
    subtitulo_col: Option<&'static str>,
    /// Columna de código/SKU/número usada para el orden por relevancia.
    clave_col: &'static str,
    /// Columnas adicionales incluidas en `datos` (clave JSON = nombre de columna).
    datos_cols: &'static [&'static str],
}

/// Recursos buscables del palette. Orden declarativo: los catálogos con ruta
/// de detalle propia, luego operación (movimientos, sesiones). Las alertas
/// se resuelven aparte (`buscar_alertas`). Zonas/racks/secciones/cajas se
/// navegan anidadas y no tienen ruta de detalle, por eso no se listan aquí.
const RECURSOS: &[RecursoBusqueda] = &[
    RecursoBusqueda {
        recurso: "productos",
        permiso: "producto",
        schema: &query::PRODUCTO_SCHEMA,
        id_col: "id",
        titulo_col: "sku",
        subtitulo_col: Some("nombre"),
        clave_col: "sku",
        datos_cols: &[],
    },
    RecursoBusqueda {
        recurso: "ubicaciones",
        permiso: "ubicacion",
        schema: &query::UBICACION_SCHEMA,
        id_col: "id",
        titulo_col: "codigo",
        subtitulo_col: Some("nombre"),
        clave_col: "codigo",
        datos_cols: &[],
    },
    RecursoBusqueda {
        recurso: "lotes",
        permiso: "lote",
        schema: &query::LOTE_SCHEMA,
        id_col: "id",
        titulo_col: "numero",
        subtitulo_col: Some("origen"),
        clave_col: "numero",
        datos_cols: &[],
    },
    RecursoBusqueda {
        recurso: "proveedores",
        permiso: "proveedor",
        schema: &query::PROVEEDOR_SCHEMA,
        id_col: "id",
        titulo_col: "codigo",
        subtitulo_col: Some("nombre"),
        clave_col: "codigo",
        datos_cols: &[],
    },
    RecursoBusqueda {
        recurso: "clientes",
        permiso: "cliente",
        schema: &query::CLIENTE_SCHEMA,
        id_col: "id",
        titulo_col: "codigo",
        subtitulo_col: Some("nombre"),
        clave_col: "codigo",
        datos_cols: &[],
    },
    RecursoBusqueda {
        recurso: "almacenes",
        permiso: "almacen",
        schema: &query::ALMACEN_SCHEMA,
        id_col: "id",
        titulo_col: "codigo",
        subtitulo_col: Some("nombre"),
        clave_col: "codigo",
        datos_cols: &[],
    },
    RecursoBusqueda {
        recurso: "categorias",
        permiso: "categoria",
        schema: &query::CATEGORIA_SCHEMA,
        id_col: "id",
        titulo_col: "nombre",
        subtitulo_col: Some("descripcion"),
        clave_col: "nombre",
        datos_cols: &[],
    },
    RecursoBusqueda {
        recurso: "uoms",
        permiso: "uom",
        schema: &query::UOM_SCHEMA,
        id_col: "id",
        titulo_col: "codigo",
        subtitulo_col: Some("nombre"),
        clave_col: "codigo",
        datos_cols: &[],
    },
    RecursoBusqueda {
        recurso: "movimientos",
        permiso: "movimiento",
        schema: &query::MOVIMIENTO_SCHEMA,
        id_col: "id",
        titulo_col: "numero",
        subtitulo_col: None,
        clave_col: "numero",
        datos_cols: &["tipo", "estado"],
    },
    RecursoBusqueda {
        recurso: "sesiones_inventario",
        permiso: "inventario",
        schema: &query::SESION_INVENTARIO_SCHEMA,
        id_col: "id",
        titulo_col: "numero",
        subtitulo_col: None,
        clave_col: "numero",
        datos_cols: &["tipo", "estado"],
    },
];

/// Busca `q` en todos los recursos consultables, respetando la matriz de
/// permisos por recurso (SPEC §4.4): un recurso sin permiso `ver` se omite
/// del resultado, no es un error.
pub fn buscar(conn: &Connection, usuario_id: &str, q: &str) -> AppResult<BuscarRespuesta> {
    let q = q.trim().to_string();
    if q.is_empty() {
        return Ok(BuscarRespuesta {
            query: q,
            grupos: Vec::new(),
        });
    }

    let limite = 6;
    let mut grupos = Vec::new();

    for cfg in RECURSOS {
        if crate::security::puede(conn, Some(usuario_id), cfg.permiso, "ver").is_err() {
            continue;
        }
        let items = buscar_en_schema(conn, cfg, &q, limite)?;
        if !items.is_empty() {
            grupos.push(BuscarGrupo {
                recurso: cfg.recurso.to_string(),
                items,
            });
        }
    }

    if crate::security::puede(conn, Some(usuario_id), "movimiento", "ver").is_ok() {
        let items = buscar_alertas(conn, &q, limite)?;
        if !items.is_empty() {
            grupos.push(BuscarGrupo {
                recurso: "alertas".to_string(),
                items,
            });
        }
    }

    Ok(BuscarRespuesta { query: q, grupos })
}

/// Consulta un recurso con schema del motor universal. La relevancia la
/// ordena la propia SQL: coincidencia exacta en la clave (case-insensitive),
/// luego prefijo, luego cualquier coincidencia.
fn buscar_en_schema(
    conn: &Connection,
    cfg: &RecursoBusqueda,
    q: &str,
    limite: i64,
) -> AppResult<Vec<BuscarItem>> {
    let id_expr = cfg.schema.columna(cfg.id_col)?.expr;
    let titulo_expr = cfg.schema.columna(cfg.titulo_col)?.expr;
    let sub_expr = match cfg.subtitulo_col {
        Some(c) => cfg.schema.columna(c)?.expr,
        None => "NULL",
    };
    let extra_exprs: Vec<&str> = cfg
        .datos_cols
        .iter()
        .map(|c| cfg.schema.columna(c).map(|col| col.expr))
        .collect::<AppResult<Vec<_>>>()?;
    let clave_expr = cfg.schema.columna(cfg.clave_col)?.expr;

    let select_extra = extra_exprs
        .iter()
        .map(|e| format!(", {e}"))
        .collect::<String>();

    let (condicion, mut binds) = query::condicion_busqueda(cfg.schema, q);
    let where_sql = if condicion.is_empty() {
        String::new()
    } else {
        format!(" WHERE {condicion}")
    };

    // Relevancia multi-columna: primero la coincidencia exacta en la clave
    // (código/SKU/número), luego prefijo de la clave, luego el título completo
    // contiene la frase, luego el subtítulo la contiene, y por último el resto.
    // Así una búsqueda por nombre de producto encuentra el registro correcto
    // aunque el SKU no coincida. `q` es la frase completa (ya pasó el WHERE).
    // Placeholders exclusivamente posicionales (no mezclar ?NNN con ?): cada
    // ? del ORDER BY recibe su bind en el mismo orden.
    let primer_termino = q.split_whitespace().next().unwrap_or(q);
    let q_like = query::escapar_like(q, true, true);
    binds.push(SqlValue::Text(primer_termino.to_string())); // clave = q (exacta)
    binds.push(SqlValue::Text(primer_termino.to_string())); // clave LIKE q%
    binds.push(SqlValue::Text(q_like.clone())); // título LIKE %q%
    binds.push(SqlValue::Text(q_like.clone())); // subtítulo LIKE %q%
    binds.push(SqlValue::Integer(limite));

    let sql = format!(
        "SELECT {id_expr}, {titulo_expr}, {sub_expr}{select_extra} \
         FROM {from}{where_sql} \
         ORDER BY CASE \
           WHEN LOWER({clave_expr}) = LOWER(?) THEN 0 \
           WHEN LOWER({clave_expr}) LIKE LOWER(?) || '%' THEN 1 \
           WHEN LOWER({titulo_expr}) LIKE ? ESCAPE '\\' THEN 2 \
           WHEN LOWER({sub_expr}) LIKE ? ESCAPE '\\' THEN 3 \
           ELSE 4 \
         END, {orden} \
         LIMIT ?",
        from = cfg.schema.from,
        orden = cfg.schema.orden_defecto,
    );

    let mut stmt = conn.prepare(&sql)?;
    let filas = stmt
        .query_map(rusqlite::params_from_iter(binds.iter()), |r| {
            let id: String = r.get(0)?;
            let titulo: String = r.get(1)?;
            let subtitulo: Option<String> = r.get(2)?;
            let mut datos = Map::new();
            for (i, clave) in cfg.datos_cols.iter().enumerate() {
                let valor: Option<String> = r.get(3 + i)?;
                if let Some(v) = valor {
                    datos.insert((*clave).to_string(), JsonValue::from(v));
                }
            }
            let datos = if datos.is_empty() {
                None
            } else {
                Some(JsonValue::Object(datos))
            };
            Ok(BuscarItem {
                id,
                titulo,
                subtitulo,
                datos,
            })
        })?
        .collect::<Result<Vec<_>, _>>()?;

    Ok(filas)
}

/// Alerta abierta cuyo tipo o detalle coincide con `q`. Devuelve la entidad
/// ancla (`entidad`/`entidad_id`) en `datos` para que el frontend enlace a
/// la causa raíz (SPEC §17.2, Hito 19).
fn buscar_alertas(conn: &Connection, q: &str, limite: i64) -> AppResult<Vec<BuscarItem>> {
    let termino = q.split_whitespace().next().unwrap_or(q);
    let like = query::escapar_like(termino, true, true);
    let sql = "SELECT id, tipo, IFNULL(detalle, ''), entidad, entidad_id, estado \
               FROM alertas \
               WHERE estado = 'ABIERTA' \
                 AND (tipo LIKE ?1 ESCAPE '\\' OR IFNULL(detalle, '') LIKE ?1 ESCAPE '\\') \
               ORDER BY fecha_deteccion DESC \
               LIMIT ?2";
    let mut stmt = conn.prepare(sql)?;
    let filas = stmt
        .query_map(rusqlite::params![like, limite], |r| {
            let id: String = r.get(0)?;
            let tipo: String = r.get(1)?;
            let detalle: String = r.get(2)?;
            let entidad: Option<String> = r.get(3)?;
            let entidad_id: Option<String> = r.get(4)?;
            let estado: String = r.get(5)?;
            let datos = JsonValue::Object(Map::from_iter([
                ("tipo".to_string(), JsonValue::from(tipo.clone())),
                ("estado".to_string(), JsonValue::from(estado)),
                (
                    "entidad".to_string(),
                    entidad.map(JsonValue::from).unwrap_or(JsonValue::Null),
                ),
                (
                    "entidad_id".to_string(),
                    entidad_id.map(JsonValue::from).unwrap_or(JsonValue::Null),
                ),
            ]));
            Ok(BuscarItem {
                id,
                titulo: tipo,
                subtitulo: if detalle.is_empty() {
                    None
                } else {
                    Some(detalle)
                },
                datos: Some(datos),
            })
        })?
        .collect::<Result<Vec<_>, _>>()?;
    Ok(filas)
}
