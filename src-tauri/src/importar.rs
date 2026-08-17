//! Importación masiva de catálogos y stock inicial (puesta en marcha).
//!
//! Recibe filas deserializadas del frontend (el cliente parsea el CSV) y las
//! valida contra las MISMAS reglas de negocio que los comandos `crear_*`
//! (normalización, unicidad, UOM activa, capacidad…), insertando en una sola
//! transacción. Las filas con errores no abortan el resto: se reportan por
//! fila para corregirlas y reintentar.

use rusqlite::Connection;
use serde_json::Value;

use crate::domain::catalogo::{NuevaUbicacion, NuevoProducto};
use crate::domain::movimiento::{NuevaLinea, NuevoMovimiento};
use crate::error::{AppError, AppResult};
use crate::security::puede;

/// Resultado de una fila importada. `fila` es 1-based sobre el archivo
/// (incluye la cabecera, por eso la primera fila de datos es la 2).
#[derive(Debug, Clone, serde::Serialize)]
pub struct ResultadoImportacion {
    pub fila: i64,
    pub ok: bool,
    pub error: Option<String>,
    pub id: Option<String>,
}

fn str_campo(v: &Value, clave: &str) -> AppResult<String> {
    let s = v
        .get(clave)
        .and_then(Value::as_str)
        .map(str::trim)
        .filter(|s| !s.is_empty())
        .ok_or_else(|| AppError::CampoRequerido(clave.into()))?;
    Ok(s.to_string())
}

fn opt_str(v: &Value, clave: &str) -> Option<String> {
    v.get(clave)
        .and_then(Value::as_str)
        .map(str::trim)
        .filter(|s| !s.is_empty())
        .map(String::from)
}

fn opt_i64(v: &Value, clave: &str) -> Option<i64> {
    v.get(clave).and_then(Value::as_i64)
}

fn opt_f64(v: &Value, clave: &str) -> Option<f64> {
    v.get(clave).and_then(Value::as_f64)
}

fn opt_bool(v: &Value, clave: &str) -> bool {
    v.get(clave)
        .and_then(Value::as_str)
        .map(|s| {
            matches!(
                s.to_lowercase().as_str(),
                "1" | "true" | "si" | "sí" | "yes"
            )
        })
        .unwrap_or(false)
}

fn es_uuid(s: &str) -> bool {
    s.len() == 36 && s.chars().filter(|c| *c == '-').count() == 4
}

/// Resuelve una UOM por id o por código. Devuelve el id real.
fn resolver_uom(conn: &Connection, v: &Value, clave: &str) -> AppResult<Option<String>> {
    let Some(s) = opt_str(v, clave) else {
        return Ok(None);
    };
    if es_uuid(&s) {
        return Ok(Some(s));
    }
    conn.query_row("SELECT id FROM uoms WHERE codigo = ?1", [&s], |r| r.get(0))
        .map(Some)
        .map_err(|_| AppError::NoEncontrado("unidad de medida", s))
}

/// Resuelve una categoría por nombre o por id.
fn resolver_categoria(conn: &Connection, v: &Value) -> AppResult<Option<String>> {
    let Some(s) = opt_str(v, "categoria") else {
        return Ok(None);
    };
    if es_uuid(&s) {
        return Ok(Some(s));
    }
    conn.query_row("SELECT id FROM categorias WHERE nombre = ?1", [&s], |r| {
        r.get(0)
    })
    .map(Some)
    .map_err(|_| AppError::NoEncontrado("categoría", s))
}

fn importar_producto(conn: &Connection, v: &Value, actor: &str) -> AppResult<String> {
    let sku = str_campo(v, "sku")?;
    let nombre = str_campo(v, "nombre")?;
    let uom_base = resolver_uom(conn, v, "uom_base")?
        .ok_or_else(|| AppError::CampoRequerido("uom_base".into()))?;
    let producto = crate::repo::catalogo::crear_producto(
        conn,
        &NuevoProducto {
            costo_unitario: None,
            sku,
            nombre,
            descripcion: opt_str(v, "descripcion"),
            categoria_id: resolver_categoria(conn, v)?,
            uom_base_id: uom_base,
            uom_venta_id: resolver_uom(conn, v, "uom_venta")?,
            uom_compra_id: resolver_uom(conn, v, "uom_compra")?,
            codigo_barras: opt_str(v, "codigo_barras"),
            peso_unitario: opt_f64(v, "peso"),
            volumen_unitario: opt_f64(v, "volumen"),
            stock_minimo: opt_i64(v, "stock_minimo"),
            stock_maximo: opt_i64(v, "stock_maximo"),
            controla_lote: opt_bool(v, "controla_lote"),
            controla_vencimiento: opt_bool(v, "controla_vencimiento"),
            perecedero: opt_bool(v, "perecedero"),
            created_by: Some(actor.into()),
        },
    )?;
    Ok(producto.id)
}

/// Resuelve el contenedor de una ubicación por su código (zona, rack o
/// sección) y devuelve los ids (solo uno es `Some`).
fn resolver_contenedor(
    conn: &Connection,
    codigo: &str,
) -> AppResult<(Option<String>, Option<String>, Option<String>)> {
    let zona: Option<String> = conn
        .query_row("SELECT id FROM zonas WHERE codigo = ?1", [codigo], |r| {
            r.get(0)
        })
        .ok();
    if let Some(z) = zona {
        return Ok((None, None, Some(z)));
    }
    let rack: Option<String> = conn
        .query_row("SELECT id FROM racks WHERE codigo = ?1", [codigo], |r| {
            r.get(0)
        })
        .ok();
    if let Some(r) = rack {
        return Ok((None, Some(r), None));
    }
    let seccion: Option<String> = conn
        .query_row(
            "SELECT id FROM secciones WHERE codigo = ?1",
            [codigo],
            |r| r.get(0),
        )
        .ok();
    if let Some(s) = seccion {
        return Ok((Some(s), None, None));
    }
    Err(AppError::NoEncontrado(
        "contenedor (zona, rack o sección)",
        codigo.into(),
    ))
}

fn importar_ubicacion(conn: &Connection, v: &Value, actor: &str) -> AppResult<String> {
    let codigo = str_campo(v, "codigo")?;
    let contenedor = str_campo(v, "ubicado_en")?;
    let (seccion_id, rack_id, zona_id) = resolver_contenedor(conn, &contenedor)?;
    let tipo = opt_str(v, "tipo").unwrap_or_else(|| "STANDARD".into());
    let u = crate::repo::catalogo::crear_ubicacion(
        conn,
        &NuevaUbicacion {
            codigo,
            nombre: opt_str(v, "nombre"),
            seccion_id,
            rack_id,
            zona_id,
            tipo: Some(tipo),
            capacidad_maxima: opt_i64(v, "capacidad_maxima"),
            created_by: Some(actor.into()),
        },
    )?;
    Ok(u.id)
}

/// Resuelve un producto por SKU (el CSV usa el SKU, el identificador canónico).
fn resolver_producto_por_sku(conn: &Connection, sku: &str) -> AppResult<String> {
    conn.query_row("SELECT id FROM productos WHERE sku = ?1", [sku], |r| {
        r.get(0)
    })
    .map_err(|_| AppError::NoEncontrado("producto", sku.into()))
}

fn importar_stock_inicial(conn: &Connection, v: &Value, actor: &str) -> AppResult<String> {
    let sku = str_campo(v, "sku")?;
    let cantidad =
        opt_i64(v, "cantidad").ok_or_else(|| AppError::CampoRequerido("cantidad".into()))?;
    if cantidad <= 0 {
        return Err(AppError::CampoRequerido("cantidad (> 0)".into()));
    }
    let ubicacion_codigo = str_campo(v, "ubicacion")?;
    let producto_id = resolver_producto_por_sku(conn, &sku)?;
    let ubicacion_id: String = conn
        .query_row(
            "SELECT id FROM ubicaciones WHERE codigo = ?1",
            [&ubicacion_codigo],
            |r| r.get(0),
        )
        .map_err(|_| AppError::NoEncontrado("ubicación", ubicacion_codigo.clone()))?;

    // Lote opcional (si el producto controla lote, se exige o se crea).
    let controla_lote: bool = conn
        .query_row(
            "SELECT controla_lote FROM productos WHERE id = ?1",
            [&producto_id],
            |r| r.get::<_, i64>(0),
        )
        .map(|n| n != 0)
        .unwrap_or(false);
    let lote_id: Option<String> = match opt_str(v, "lote") {
        Some(numero) => {
            if !controla_lote {
                return Err(AppError::CampoRequerido(
                    "el producto no controla lote, no se puede importar lote".into(),
                ));
            }
            // Reutilizar si existe, si no crear (con vencimiento opcional).
            let existe: Option<String> = conn
                .query_row(
                    "SELECT id FROM lotes WHERE producto_id = ?1 AND numero = ?2",
                    rusqlite::params![producto_id, numero],
                    |r| r.get(0),
                )
                .ok();
            match existe {
                Some(id) => Some(id),
                None => {
                    let l = crate::repo::catalogo::crear_lote(
                        conn,
                        &crate::domain::catalogo::NuevoLote {
                            numero,
                            producto_id: producto_id.clone(),
                            fecha_fabricacion: opt_str(v, "fecha_fabricacion"),
                            fecha_vencimiento: opt_str(v, "vencimiento"),
                            origen: opt_str(v, "origen_lote"),
                            notas: None,
                            created_by: Some(actor.into()),
                        },
                    )?;
                    Some(l.id)
                }
            }
        }
        None if controla_lote => {
            return Err(AppError::CampoRequerido(
                "el producto controla lote: indica el lote".into(),
            ));
        }
        None => None,
    };

    // Entrada inicial aprobada (SPEC §7.5): carga el stock de arranque.
    let mov = crate::repo::movimiento::crear_movimiento(
        conn,
        &NuevoMovimiento {
            tipo: "ENTRADA".into(),
            sub_tipo: "INICIAL".into(),
            fecha_movimiento: None,
            motivo: Some("Entrada inicial (importación)".into()),
            origen_ubicacion_id: None,
            destino_ubicacion_id: Some(ubicacion_id.clone()),
            proveedor_id: None,
            cliente_id: None,
            sesion_inventario_id: None,
            documento_referencia: opt_str(v, "documento"),
            notas: None,
            created_by: actor.into(),
            lineas: vec![NuevaLinea {
                costo_unitario: None,
                producto_id: producto_id.clone(),
                lote_id: lote_id.clone(),
                cantidad,
                origen_ubicacion_id: None,
                destino_ubicacion_id: Some(ubicacion_id.clone()),
                caja_origen_id: None,
                caja_destino_id: None,
            }],
        },
    )?;
    crate::repo::movimiento::aprobar_movimiento(conn, &mov.id, actor)?;
    Ok(mov.id)
}

fn importar_filas(
    conn: &Connection,
    tipo: &str,
    filas: &[Value],
    actor: &str,
) -> AppResult<Vec<ResultadoImportacion>> {
    let mut resultados = Vec::with_capacity(filas.len());
    for (i, v) in filas.iter().enumerate() {
        let n_fila = (i + 2) as i64; // la cabecera ocupa la fila 1
        let resultado = match tipo {
            "PRODUCTOS" => importar_producto(conn, v, actor),
            "UBICACIONES" => importar_ubicacion(conn, v, actor),
            "STOCK_INICIAL" => importar_stock_inicial(conn, v, actor),
            _ => Err(AppError::CampoRequerido(format!(
                "tipo de importación '{tipo}' no soportado"
            ))),
        };
        match resultado {
            Ok(id) => resultados.push(ResultadoImportacion {
                fila: n_fila,
                ok: true,
                error: None,
                id: Some(id),
            }),
            Err(e) => resultados.push(ResultadoImportacion {
                fila: n_fila,
                ok: false,
                error: Some(e.to_string()),
                id: None,
            }),
        }
    }
    Ok(resultados)
}

/// Importa las filas del tipo indicado. Cada fila se valida e inserta con las
/// mismas funciones `crear_*` (que gestionan su propia transacción), de modo
/// que una fila inválida no aborta las válidas y cada una se reporta con su
/// error. Las filas válidas quedan insertadas; las inválidas se corrigen y se
/// reintentan.
pub fn importar_datos(
    conn: &Connection,
    tipo: &str,
    filas: &[Value],
    actor: &str,
) -> AppResult<Vec<ResultadoImportacion>> {
    // Permisos según el tipo (SPEC §4.4): catálogos → crear del recurso;
    // stock inicial → configuración:ejecutar (ADMIN/GERENTE, §7.5).
    match tipo {
        "PRODUCTOS" => puede(conn, Some(actor), "producto", "crear")?,
        "UBICACIONES" => puede(conn, Some(actor), "ubicacion", "crear")?,
        "STOCK_INICIAL" => {
            puede(conn, Some(actor), "configuracion", "ejecutar")?;
            puede(conn, Some(actor), "movimiento", "crear")?;
        }
        _ => {
            return Err(AppError::CampoRequerido(format!(
                "tipo de importación '{tipo}' no soportado"
            )));
        }
    }

    if filas.is_empty() {
        return Ok(Vec::new());
    }

    importar_filas(conn, tipo, filas, actor)
}
