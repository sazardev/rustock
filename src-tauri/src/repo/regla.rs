//! Reglas de negocio: persistencia y evaluación (SPEC §16).
//!
//! La parte interesante no es guardarlas, es **evaluarlas**. Cuando una línea
//! de movimiento va a entrar en una ubicación, hay que responder: ¿qué reglas
//! alcanzan a esta ubicación, y cómo quedaría el ámbito de cada una si esto
//! se aprueba?
//!
//! Dos decisiones sostienen todo el módulo:
//!
//! 1. **Se evalúa el estado resultante, no el actual.** La pregunta no es "¿el
//!    rack está por debajo de 800 kg?" sino "¿seguiría por debajo *después* de
//!    meter esto?". Comprobar el estado actual dejaría entrar siempre la
//!    última caja, que es justo la que rompe el límite.
//!
//! 2. **La regla del ámbito superior alcanza a todo lo que cuelga de él.** Una
//!    regla de zona se escribe una vez y protege sus racks y ubicaciones. Sin
//!    esto habría que repetirla ubicación por ubicación, y la primera que se
//!    olvidara sería el agujero.

use rusqlite::{Connection, params};
use uuid::Uuid;

use crate::domain::ahora;
use crate::domain::regla::{
    Ambito, Incumplimiento, NuevaRegla, Regla, Severidad, TipoRegla, mensaje_tope,
};
use crate::error::{AppError, AppResult};

// ============ Persistencia ============

fn fila_a_regla(r: &rusqlite::Row<'_>) -> rusqlite::Result<Regla> {
    Ok(Regla {
        id: r.get(0)?,
        codigo: r.get(1)?,
        nombre: r.get(2)?,
        descripcion: r.get(3)?,
        ambito: r.get(4)?,
        ambito_id: r.get(5)?,
        ambito_etiqueta: None,
        tipo: r.get(6)?,
        valor_numerico: r.get(7)?,
        valor_referencia: r.get(8)?,
        referencia_etiqueta: None,
        severidad: r.get(9)?,
        mensaje: r.get(10)?,
        activa: r.get(11)?,
        created_at: r.get(12)?,
        updated_at: r.get(13)?,
        created_by: r.get(14)?,
        updated_by: r.get(15)?,
    })
}

const COLUMNAS: &str = "id, codigo, nombre, descripcion, ambito, ambito_id, tipo,
     valor_numerico, valor_referencia, severidad, mensaje, activa,
     created_at, updated_at, created_by, updated_by";

pub fn crear(conn: &Connection, nueva: &NuevaRegla) -> AppResult<Regla> {
    nueva.validar()?;
    let id = Uuid::new_v4().to_string();
    let ts = ahora();
    conn.execute(
        "INSERT INTO reglas_negocio (
            id, codigo, nombre, descripcion, ambito, ambito_id, tipo,
            valor_numerico, valor_referencia, severidad, mensaje, activa,
            created_at, updated_at, created_by
         ) VALUES (?1,?2,?3,?4,?5,?6,?7,?8,?9,?10,?11,?12,?13,?13,?14)",
        params![
            id,
            nueva.codigo.trim(),
            nueva.nombre.trim(),
            nueva.descripcion,
            nueva.ambito,
            nueva.ambito_id,
            nueva.tipo,
            nueva.valor_numerico,
            nueva.valor_referencia,
            nueva.severidad,
            nueva.mensaje,
            nueva.activa,
            ts,
            nueva.created_by,
        ],
    )
    .map_err(|e| {
        if e.to_string().contains("UNIQUE") {
            AppError::CodigoDuplicado(nueva.codigo.trim().to_string())
        } else {
            AppError::from(e)
        }
    })?;
    obtener(conn, &id)?.ok_or(AppError::NoEncontrado("regla", id))
}

pub fn obtener(conn: &Connection, id: &str) -> AppResult<Option<Regla>> {
    let mut stmt = conn.prepare(&format!(
        "SELECT {COLUMNAS} FROM reglas_negocio WHERE id = ?1"
    ))?;
    let mut filas = stmt.query_map([id], fila_a_regla)?;
    match filas.next() {
        Some(fila) => Ok(Some(enriquecer(conn, fila?)?)),
        None => Ok(None),
    }
}

pub fn editar(conn: &Connection, id: &str, cambios: &NuevaRegla, by: &str) -> AppResult<Regla> {
    cambios.validar()?;
    let filas = conn.execute(
        "UPDATE reglas_negocio SET
            codigo = ?2, nombre = ?3, descripcion = ?4, ambito = ?5, ambito_id = ?6,
            tipo = ?7, valor_numerico = ?8, valor_referencia = ?9, severidad = ?10,
            mensaje = ?11, activa = ?12, updated_at = ?13, updated_by = ?14
         WHERE id = ?1",
        params![
            id,
            cambios.codigo.trim(),
            cambios.nombre.trim(),
            cambios.descripcion,
            cambios.ambito,
            cambios.ambito_id,
            cambios.tipo,
            cambios.valor_numerico,
            cambios.valor_referencia,
            cambios.severidad,
            cambios.mensaje,
            cambios.activa,
            ahora(),
            by,
        ],
    )?;
    if filas == 0 {
        return Err(AppError::NoEncontrado("regla", id.to_string()));
    }
    obtener(conn, id)?.ok_or(AppError::NoEncontrado("regla", id.to_string()))
}

pub fn eliminar(conn: &Connection, id: &str) -> AppResult<()> {
    let filas = conn.execute("DELETE FROM reglas_negocio WHERE id = ?1", [id])?;
    if filas == 0 {
        return Err(AppError::NoEncontrado("regla", id.to_string()));
    }
    Ok(())
}

pub fn listar(conn: &Connection) -> AppResult<Vec<Regla>> {
    let mut stmt = conn.prepare(&format!(
        "SELECT {COLUMNAS} FROM reglas_negocio ORDER BY activa DESC, ambito, codigo"
    ))?;
    let filas = stmt.query_map([], fila_a_regla)?;
    let mut salida = Vec::new();
    for fila in filas {
        salida.push(enriquecer(conn, fila?)?);
    }
    Ok(salida)
}

/// Rellena los nombres legibles del ámbito y de la referencia.
///
/// Se hace al leer y no al guardar: si mañana se renombra un rack, la regla
/// debe mostrar el nombre nuevo, no una copia vieja.
fn enriquecer(conn: &Connection, mut regla: Regla) -> AppResult<Regla> {
    if let Some(id) = &regla.ambito_id {
        let tabla = match Ambito::desde(&regla.ambito)? {
            Ambito::Almacen => "almacenes",
            Ambito::Zona => "zonas",
            Ambito::Pasillo => "pasillos",
            Ambito::Rack => "racks",
            Ambito::Seccion => "secciones",
            Ambito::Ubicacion => "ubicaciones",
        };
        regla.ambito_etiqueta = conn
            .query_row(
                &format!("SELECT codigo FROM {tabla} WHERE id = ?1"),
                [id],
                |r| r.get::<_, String>(0),
            )
            .ok();
    }
    if let Some(ref_id) = &regla.valor_referencia {
        let tipo = TipoRegla::desde(&regla.tipo)?;
        regla.referencia_etiqueta = match tipo {
            TipoRegla::CategoriaProhibida | TipoRegla::CategoriaExclusiva => conn
                .query_row(
                    "SELECT nombre FROM categorias WHERE id = ?1",
                    [ref_id],
                    |r| r.get::<_, String>(0),
                )
                .ok(),
            TipoRegla::ProductoProhibido => conn
                .query_row("SELECT sku FROM productos WHERE id = ?1", [ref_id], |r| {
                    r.get::<_, String>(0)
                })
                .ok(),
            _ => None,
        };
    }
    Ok(regla)
}

// ============ Evaluación ============

/// Los ancestros de una ubicación en el árbol físico, de la propia ubicación
/// hacia arriba. Es lo que permite que una regla de zona alcance a sus racks.
struct Ancestros {
    ubicacion: String,
    seccion: Option<String>,
    rack: Option<String>,
    pasillo: Option<String>,
    zona: Option<String>,
    almacen: Option<String>,
}

fn ancestros_de(conn: &Connection, ubicacion_id: &str) -> AppResult<Ancestros> {
    let (seccion, rack_directo, zona_directa): (Option<String>, Option<String>, Option<String>) =
        conn.query_row(
            "SELECT seccion_id, rack_id, zona_id FROM ubicaciones WHERE id = ?1",
            [ubicacion_id],
            |r| Ok((r.get(0)?, r.get(1)?, r.get(2)?)),
        )
        .map_err(|_| AppError::NoEncontrado("ubicación", ubicacion_id.to_string()))?;

    // Una ubicación cuelga de exactamente una cosa (lo garantiza el CHECK del
    // esquema), pero esa cosa puede estar a distinta altura del árbol.
    let rack = match (&seccion, &rack_directo) {
        (Some(s), _) => conn
            .query_row("SELECT rack_id FROM secciones WHERE id = ?1", [s], |r| {
                r.get::<_, String>(0)
            })
            .ok(),
        (None, Some(r)) => Some(r.clone()),
        _ => None,
    };

    let (pasillo, zona) = match &rack {
        Some(r) => conn
            .query_row(
                "SELECT pasillo_id, zona_id FROM racks WHERE id = ?1",
                [r],
                |row| Ok((row.get::<_, Option<String>>(0)?, row.get::<_, String>(1)?)),
            )
            .map(|(p, z)| (p, Some(z)))
            .unwrap_or((None, None)),
        None => (None, zona_directa.clone()),
    };

    let almacen = match &zona {
        Some(z) => conn
            .query_row("SELECT almacen_id FROM zonas WHERE id = ?1", [z], |r| {
                r.get::<_, String>(0)
            })
            .ok(),
        None => None,
    };

    Ok(Ancestros {
        ubicacion: ubicacion_id.to_string(),
        seccion,
        rack,
        pasillo,
        zona,
        almacen,
    })
}

impl Ancestros {
    /// Id del elemento de este ámbito al que pertenece la ubicación.
    fn id_de(&self, ambito: Ambito) -> Option<&str> {
        match ambito {
            Ambito::Ubicacion => Some(self.ubicacion.as_str()),
            Ambito::Seccion => self.seccion.as_deref(),
            Ambito::Rack => self.rack.as_deref(),
            Ambito::Pasillo => self.pasillo.as_deref(),
            Ambito::Zona => self.zona.as_deref(),
            Ambito::Almacen => self.almacen.as_deref(),
        }
    }
}

/// Condición SQL que selecciona todas las ubicaciones de un ámbito.
///
/// Vive en un solo sitio a propósito: es la definición de "qué cuelga de qué",
/// y tenerla repetida por cada tipo de regla sería garantizar que un día dos
/// copias dejen de coincidir.
fn ubicaciones_del_ambito(ambito: Ambito) -> &'static str {
    match ambito {
        Ambito::Ubicacion => "u.id = ?1",
        Ambito::Seccion => "u.seccion_id = ?1",
        Ambito::Rack => "(u.rack_id = ?1 OR u.seccion_id IN (SELECT id FROM secciones WHERE rack_id = ?1))",
        Ambito::Pasillo => {
            "(u.rack_id IN (SELECT id FROM racks WHERE pasillo_id = ?1)
              OR u.seccion_id IN (SELECT id FROM secciones WHERE rack_id IN (SELECT id FROM racks WHERE pasillo_id = ?1)))"
        }
        Ambito::Zona => {
            "(u.zona_id = ?1
              OR u.rack_id IN (SELECT id FROM racks WHERE zona_id = ?1)
              OR u.seccion_id IN (SELECT id FROM secciones WHERE rack_id IN (SELECT id FROM racks WHERE zona_id = ?1)))"
        }
        Ambito::Almacen => {
            "(u.zona_id IN (SELECT id FROM zonas WHERE almacen_id = ?1)
              OR u.rack_id IN (SELECT id FROM racks WHERE zona_id IN (SELECT id FROM zonas WHERE almacen_id = ?1))
              OR u.seccion_id IN (SELECT id FROM secciones WHERE rack_id IN (SELECT id FROM racks WHERE zona_id IN (SELECT id FROM zonas WHERE almacen_id = ?1))))"
        }
    }
}

/// Suma actual de una magnitud del producto sobre todo el ámbito.
fn total_actual(conn: &Connection, ambito: Ambito, ambito_id: &str, campo: &str) -> AppResult<f64> {
    let filtro = ubicaciones_del_ambito(ambito);
    let sql = format!(
        "SELECT COALESCE(SUM(s.cantidad * COALESCE(p.{campo}, 0)), 0)
         FROM saldos s
         JOIN ubicaciones u ON u.id = s.ubicacion_id
         JOIN productos p ON p.id = s.producto_id
         WHERE {filtro}"
    );
    Ok(conn.query_row(&sql, [ambito_id], |r| r.get::<_, f64>(0))?)
}

/// Unidades totales del ámbito.
fn cantidad_actual(conn: &Connection, ambito: Ambito, ambito_id: &str) -> AppResult<f64> {
    let filtro = ubicaciones_del_ambito(ambito);
    let sql = format!(
        "SELECT COALESCE(SUM(s.cantidad), 0)
         FROM saldos s JOIN ubicaciones u ON u.id = s.ubicacion_id
         WHERE {filtro}"
    );
    Ok(conn.query_row(&sql, [ambito_id], |r| r.get::<_, i64>(0))? as f64)
}

/// Productos distintos con saldo en el ámbito, excluido el que entra (que se
/// cuenta aparte para saber si añade uno nuevo o refuerza uno existente).
fn productos_distintos(
    conn: &Connection,
    ambito: Ambito,
    ambito_id: &str,
    producto_entrante: &str,
) -> AppResult<(i64, bool)> {
    let filtro = ubicaciones_del_ambito(ambito);
    let sql = format!(
        "SELECT COUNT(DISTINCT s.producto_id),
                MAX(CASE WHEN s.producto_id = ?2 THEN 1 ELSE 0 END)
         FROM saldos s JOIN ubicaciones u ON u.id = s.ubicacion_id
         WHERE {filtro} AND s.cantidad > 0"
    );
    let (total, presente): (i64, Option<i64>) =
        conn.query_row(&sql, params![ambito_id, producto_entrante], |r| {
            Ok((r.get(0)?, r.get(1)?))
        })?;
    Ok((total, presente.unwrap_or(0) == 1))
}

/// Lo que se sabe de la línea que va a entrar.
pub struct LineaEntrante<'a> {
    pub producto_id: &'a str,
    pub lote_id: Option<&'a str>,
    pub cantidad: i64,
    pub ubicacion_destino: &'a str,
}

/// Datos del producto que las reglas necesitan.
struct DatosProducto {
    sku: String,
    categoria_id: Option<String>,
    peso_unitario: Option<f64>,
    volumen_unitario: Option<f64>,
}

fn datos_producto(conn: &Connection, id: &str) -> AppResult<DatosProducto> {
    conn.query_row(
        "SELECT sku, categoria_id, peso_unitario, volumen_unitario FROM productos WHERE id = ?1",
        [id],
        |r| {
            Ok(DatosProducto {
                sku: r.get(0)?,
                categoria_id: r.get(1)?,
                peso_unitario: r.get(2)?,
                volumen_unitario: r.get(3)?,
            })
        },
    )
    .map_err(|_| AppError::NoEncontrado("producto", id.to_string()))
}

fn codigo_ubicacion(conn: &Connection, id: &str) -> String {
    conn.query_row("SELECT codigo FROM ubicaciones WHERE id = ?1", [id], |r| {
        r.get::<_, String>(0)
    })
    .unwrap_or_else(|_| id.to_string())
}

/// Evalúa todas las reglas activas contra una línea que va a entrar.
///
/// Devuelve los incumplimientos, bloqueantes y de aviso. No decide qué hacer
/// con ellos: eso es cosa de quien llama, que sabe si está aprobando un
/// movimiento o solo enseñando una previsualización.
pub fn evaluar_entrada(
    conn: &Connection,
    linea: &LineaEntrante<'_>,
) -> AppResult<Vec<Incumplimiento>> {
    let mut incumplimientos = Vec::new();
    let ancestros = ancestros_de(conn, linea.ubicacion_destino)?;
    let producto = datos_producto(conn, linea.producto_id)?;
    let codigo_ubi = codigo_ubicacion(conn, linea.ubicacion_destino);

    let mut stmt = conn.prepare(&format!(
        "SELECT {COLUMNAS} FROM reglas_negocio WHERE activa = 1"
    ))?;
    let reglas: Vec<Regla> = stmt
        .query_map([], fila_a_regla)?
        .collect::<rusqlite::Result<Vec<_>>>()?;

    for regla in reglas {
        let ambito = Ambito::desde(&regla.ambito)?;
        let tipo = TipoRegla::desde(&regla.tipo)?;

        // ¿Alcanza esta regla a la ubicación de destino?
        let Some(id_ambito) = ancestros.id_de(ambito) else {
            // La ubicación no pertenece a ese nivel del árbol (por ejemplo,
            // cuelga de una zona y la regla es de rack): no aplica.
            continue;
        };
        if let Some(objetivo) = &regla.ambito_id
            && objetivo != id_ambito
        {
            continue;
        }
        let etiqueta_ambito = regla
            .ambito_etiqueta
            .clone()
            .unwrap_or_else(|| codigo_del_ambito(conn, ambito, id_ambito));

        let incumple = match tipo {
            TipoRegla::PesoMaximo | TipoRegla::VolumenMaximo => {
                let campo = if tipo == TipoRegla::PesoMaximo {
                    "peso_unitario"
                } else {
                    "volumen_unitario"
                };
                let unitario = if tipo == TipoRegla::PesoMaximo {
                    producto.peso_unitario
                } else {
                    producto.volumen_unitario
                };
                // Sin el dato del producto la regla no puede decidir. Se avisa
                // en vez de callar: una regla que no puede evaluarse es una
                // protección que el cliente cree tener y no tiene.
                let Some(unitario) = unitario else {
                    incumplimientos.push(Incumplimiento {
                        regla_id: regla.id.clone(),
                        regla_codigo: regla.codigo.clone(),
                        regla_nombre: regla.nombre.clone(),
                        severidad: Severidad::Advierte.as_str().to_string(),
                        mensaje: format!(
                            "No se puede comprobar la regla: el producto {} no tiene {} definido.",
                            producto.sku,
                            if tipo == TipoRegla::PesoMaximo {
                                "peso unitario"
                            } else {
                                "volumen unitario"
                            }
                        ),
                        ubicacion_codigo: codigo_ubi.clone(),
                        valor_resultante: None,
                        limite: regla.valor_numerico,
                    });
                    continue;
                };
                let limite = regla.valor_numerico.unwrap_or(f64::MAX);
                let actual = total_actual(conn, ambito, id_ambito, campo)?;
                let resultante = actual + unitario * linea.cantidad as f64;
                (resultante > limite).then(|| {
                    (
                        mensaje_tope(tipo, ambito, &etiqueta_ambito, resultante, limite),
                        Some(resultante),
                    )
                })
            }
            TipoRegla::CantidadMaxima => {
                let limite = regla.valor_numerico.unwrap_or(f64::MAX);
                let resultante = cantidad_actual(conn, ambito, id_ambito)? + linea.cantidad as f64;
                (resultante > limite).then(|| {
                    (
                        mensaje_tope(tipo, ambito, &etiqueta_ambito, resultante, limite),
                        Some(resultante),
                    )
                })
            }
            TipoRegla::ProductosDistintosMaximo => {
                let limite = regla.valor_numerico.unwrap_or(f64::MAX);
                let (distintos, ya_presente) =
                    productos_distintos(conn, ambito, id_ambito, linea.producto_id)?;
                // Si el producto ya está, no añade variedad: el movimiento
                // refuerza lo que hay en vez de mezclar algo nuevo.
                let resultante = if ya_presente {
                    distintos as f64
                } else {
                    distintos as f64 + 1.0
                };
                (resultante > limite).then(|| {
                    (
                        format!(
                            "{} {} tendría {resultante:.0} productos distintos y el límite es {limite:.0}. El producto {} no puede entrar ahí.",
                            ambito.etiqueta(), etiqueta_ambito, producto.sku
                        ),
                        Some(resultante),
                    )
                })
            }
            TipoRegla::CategoriaProhibida => {
                let prohibida = regla.valor_referencia.as_deref();
                (producto.categoria_id.as_deref() == prohibida && prohibida.is_some()).then(|| {
                    (
                        format!(
                            "El producto {} pertenece a una categoría que no puede entrar en {} {}.",
                            producto.sku, ambito.etiqueta(), etiqueta_ambito
                        ),
                        None,
                    )
                })
            }
            TipoRegla::CategoriaExclusiva => {
                let exclusiva = regla.valor_referencia.as_deref();
                (producto.categoria_id.as_deref() != exclusiva).then(|| {
                    (
                        format!(
                            "{} {} solo admite una categoría, y el producto {} no pertenece a ella.",
                            ambito.etiqueta(), etiqueta_ambito, producto.sku
                        ),
                        None,
                    )
                })
            }
            TipoRegla::ProductoProhibido => {
                (regla.valor_referencia.as_deref() == Some(linea.producto_id)).then(|| {
                    (
                        format!(
                            "El producto {} no puede almacenarse en {} {}.",
                            producto.sku,
                            ambito.etiqueta(),
                            etiqueta_ambito
                        ),
                        None,
                    )
                })
            }
            TipoRegla::RequiereLote => linea.lote_id.is_none().then(|| {
                (
                    format!(
                        "{} {} solo admite mercancía con lote, y esta línea no lo trae.",
                        ambito.etiqueta(),
                        etiqueta_ambito
                    ),
                    None,
                )
            }),
            TipoRegla::ProhibirVencido => {
                let vencido = match linea.lote_id {
                    Some(lote) => conn
                        .query_row(
                            "SELECT fecha_vencimiento IS NOT NULL AND date(fecha_vencimiento) < date('now')
                             FROM lotes WHERE id = ?1",
                            [lote],
                            |r| r.get::<_, bool>(0),
                        )
                        .unwrap_or(false),
                    None => false,
                };
                vencido.then(|| {
                    (
                        format!(
                            "El lote está vencido y {} {} no admite mercancía vencida.",
                            ambito.etiqueta(),
                            etiqueta_ambito
                        ),
                        None,
                    )
                })
            }
        };

        if let Some((mensaje_generado, resultante)) = incumple {
            incumplimientos.push(Incumplimiento {
                regla_id: regla.id.clone(),
                regla_codigo: regla.codigo.clone(),
                regla_nombre: regla.nombre.clone(),
                severidad: regla.severidad.clone(),
                // El mensaje propio del cliente gana: sabe explicar su propia
                // regla mejor que una frase genérica.
                mensaje: regla.mensaje.clone().unwrap_or(mensaje_generado),
                ubicacion_codigo: codigo_ubi.clone(),
                valor_resultante: resultante,
                limite: regla.valor_numerico,
            });
        }
    }

    Ok(incumplimientos)
}

fn codigo_del_ambito(conn: &Connection, ambito: Ambito, id: &str) -> String {
    let tabla = match ambito {
        Ambito::Almacen => "almacenes",
        Ambito::Zona => "zonas",
        Ambito::Pasillo => "pasillos",
        Ambito::Rack => "racks",
        Ambito::Seccion => "secciones",
        Ambito::Ubicacion => "ubicaciones",
    };
    conn.query_row(
        &format!("SELECT codigo FROM {tabla} WHERE id = ?1"),
        [id],
        |r| r.get::<_, String>(0),
    )
    .unwrap_or_else(|_| "—".to_string())
}

/// Evalúa y **corta** si alguna regla bloqueante se incumple.
///
/// Es el punto que usa la aprobación de movimientos: las reglas de aviso se
/// registran y se dejan pasar, las bloqueantes detienen la operación con el
/// mensaje que el cliente escribió.
pub fn exigir_cumplimiento(conn: &Connection, linea: &LineaEntrante<'_>) -> AppResult<()> {
    let incumplimientos = evaluar_entrada(conn, linea)?;
    if let Some(bloqueante) = incumplimientos
        .iter()
        .find(|i| i.severidad == Severidad::Bloquea.as_str())
    {
        return Err(AppError::ReglaIncumplida {
            regla: bloqueante.regla_nombre.clone(),
            detalle: bloqueante.mensaje.clone(),
        });
    }
    Ok(())
}
