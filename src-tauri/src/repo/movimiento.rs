use rusqlite::Connection;
use uuid::Uuid;

use crate::domain::movimiento::*;
use crate::domain::{ahora, normalizar_codigo};
use crate::error::{AppError, AppResult};
use crate::security::puede;

/// Tupla de datos de una línea para la anulación inversa.
type LineaInversa = (
    String,
    Option<String>,
    i64,
    Option<String>,
    Option<String>,
    Option<String>,
    Option<String>,
);

/// Genera el número correlativo del movimiento (SPEC §6.1): MOV-YYYY-NNNNNN.
fn generar_numero(conn: &Connection, anio: &str) -> AppResult<String> {
    let count: i64 = conn.query_row(
        "SELECT COUNT(*) FROM movimientos WHERE numero LIKE ?1",
        [format!("MOV-{anio}-%")],
        |r| r.get(0),
    )?;
    Ok(format!("MOV-{anio}-{:06}", count + 1))
}

/// Lee un producto y devuelve si controla lote / vencimiento / está activo.
#[allow(dead_code)]
struct ReglasProducto {
    controla_lote: bool,
    controla_vencimiento: bool,
    perecedero: bool,
    activo: bool,
    sku: String,
}

fn reglas_producto(conn: &Connection, id: &str) -> AppResult<ReglasProducto> {
    let mut stmt = conn.prepare(
        "SELECT controla_lote, controla_vencimiento, perecedero, activo, sku
         FROM productos WHERE id = ?1",
    )?;
    let mut rows = stmt.query_map([id], |r| {
        Ok(ReglasProducto {
            controla_lote: r.get::<_, i64>(0)? != 0,
            controla_vencimiento: r.get::<_, i64>(1)? != 0,
            perecedero: r.get::<_, i64>(2)? != 0,
            activo: r.get::<_, i64>(3)? != 0,
            sku: r.get(4)?,
        })
    })?;
    rows.next()
        .transpose()
        .map_err(AppError::from)?
        .ok_or_else(|| AppError::NoEncontrado("producto", id.to_string()))
}

/// Código de una ubicación para mensajes claros (SPEC §14.2).
fn codigo_ubicacion(conn: &Connection, id: &str) -> AppResult<String> {
    conn.query_row("SELECT codigo FROM ubicaciones WHERE id = ?1", [id], |r| {
        r.get(0)
    })
    .map_err(|_| AppError::NoEncontrado("ubicación", id.to_string()))
}

fn codigo_lote(conn: &Connection, id: &str) -> AppResult<String> {
    conn.query_row("SELECT numero FROM lotes WHERE id = ?1", [id], |r| r.get(0))
        .map_err(|_| AppError::NoEncontrado("lote", id.to_string()))
}

/// Consulta el saldo materializado actual de (ubicacion, producto, lote).
fn saldo_actual(
    conn: &Connection,
    ubicacion: &str,
    producto: &str,
    lote: Option<&str>,
) -> AppResult<i64> {
    let lote_key = lote.unwrap_or_default();
    let mut stmt = conn.prepare(
        "SELECT COALESCE(SUM(cantidad), 0) FROM saldos
         WHERE ubicacion_id = ?1 AND producto_id = ?2 AND lote_key = ?3",
    )?;
    let mut rows = stmt.query_map(rusqlite::params![ubicacion, producto, lote_key], |r| {
        r.get(0)
    })?;
    rows.next()
        .transpose()?
        .ok_or(AppError::CampoRequerido("saldo".into()))
}

/// Consulta el stock total de un producto (suma de ubicaciones) — para mínimos.
pub fn stock_total_producto(conn: &Connection, producto: &str) -> AppResult<i64> {
    let mut stmt =
        conn.prepare("SELECT COALESCE(SUM(cantidad), 0) FROM saldos WHERE producto_id = ?1")?;
    let mut rows = stmt.query_map([producto], |r| r.get(0))?;
    rows.next()
        .transpose()?
        .ok_or(AppError::CampoRequerido("saldo".into()))
}

/// Crea un movimiento en estado BORRADOR (SPEC §6.2). No afecta stock.
pub fn crear_movimiento(conn: &Connection, nuevo: &NuevoMovimiento) -> AppResult<Movimiento> {
    nuevo.validar()?;
    puede(conn, Some(&nuevo.created_by), "movimiento", "crear")?;

    let tipo = nuevo.tipo()?.as_str();
    let sub_tipo = nuevo.sub_tipo()?.as_str();
    let id = Uuid::new_v4().to_string();
    let ts = ahora();
    let anio = &ts[..4];
    let numero = generar_numero(conn, anio)?;
    let fecha_movimiento = nuevo.fecha_movimiento.clone().unwrap_or_else(ahora);

    let tx = conn.unchecked_transaction()?;

    // Validaciones por línea (producto activo, lote requerido, etc.).
    for linea in &nuevo.lineas {
        let reglas = reglas_producto(&tx, &linea.producto_id)?;
        if !reglas.activo {
            return Err(AppError::EntidadInactiva("producto"));
        }
        // SPEC §3.7: si controla_lote, toda línea debe indicar lote.
        if reglas.controla_lote && linea.lote_id.is_none() {
            return Err(AppError::LoteRequerido(reglas.sku));
        }
        // Validar que el lote pertenezca al producto (integridad §14.1).
        if let Some(lote_id) = &linea.lote_id {
            let existe: i64 = tx.query_row(
                "SELECT COUNT(*) FROM lotes WHERE id = ?1 AND producto_id = ?2",
                rusqlite::params![lote_id, linea.producto_id],
                |r| r.get(0),
            )?;
            if existe == 0 {
                return Err(AppError::NoEncontrado("lote", lote_id.clone()));
            }
        }
    }

    tx.execute(
        "INSERT INTO movimientos (id, tipo, sub_tipo, numero, estado, fecha_movimiento, motivo,
                origen_ubicacion_id, destino_ubicacion_id, proveedor_id, cliente_id, sesion_inventario_id,
                documento_referencia, notas, created_by, created_at)
         VALUES (?1, ?2, ?3, ?4, 'BORRADOR', ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14, ?15)",
        rusqlite::params![
            id, tipo, sub_tipo, numero, fecha_movimiento, nuevo.motivo,
            nuevo.origen_ubicacion_id, nuevo.destino_ubicacion_id, nuevo.proveedor_id, nuevo.cliente_id,
            nuevo.sesion_inventario_id, nuevo.documento_referencia, nuevo.notas, nuevo.created_by, ts
        ],
    )?;

    for linea in &nuevo.lineas {
        let lid = Uuid::new_v4().to_string();
        tx.execute(
            "INSERT INTO movimiento_lineas (id, movimiento_id, producto_id, lote_id, cantidad,
                    origen_ubicacion_id, destino_ubicacion_id, caja_origen_id, caja_destino_id)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9)",
            rusqlite::params![
                lid,
                id,
                linea.producto_id,
                linea.lote_id,
                linea.cantidad,
                linea.origen_ubicacion_id,
                linea.destino_ubicacion_id,
                linea.caja_origen_id,
                linea.caja_destino_id
            ],
        )?;
    }

    EventoAuditoria(&tx).registrar(
        Some(&nuevo.created_by),
        "crear",
        "movimiento",
        Some(&id),
        None,
        None,
    )?;
    tx.commit()?;
    Ok(obtener_movimiento(conn, &id)?.expect("recién insertado"))
}

/// Pasa un movimiento de BORRADOR a PENDIENTE_APROBACION.
pub fn enviar_a_aprobacion(conn: &Connection, id: &str, by: &str) -> AppResult<Movimiento> {
    puede(conn, Some(by), "movimiento", "crear")?;
    let tx = conn.unchecked_transaction()?;
    let estado = estado_movimiento(&tx, id)?;
    match estado {
        EstadoMovimiento::Borrador => {
            tx.execute(
                "UPDATE movimientos SET estado = 'PENDIENTE_APROBACION', updated_at = ?2 WHERE id = ?1",
                rusqlite::params![id, ahora()],
            )?;
        }
        _ => {
            return Err(AppError::TransicionInvalida(
                "PENDIENTE_APROBACION".into(),
                estado.as_str().into(),
            ));
        }
    }
    EventoAuditoria(&tx).registrar(
        Some(by),
        "enviar_a_aprobacion",
        "movimiento",
        Some(id),
        None,
        None,
    )?;
    tx.commit()?;
    Ok(obtener_movimiento(conn, id)?.expect("existe"))
}

/// Aprobar = ejecutar las líneas atómicamente (SPEC §6.2). Único estado que altera saldos.
pub fn aprobar_movimiento(conn: &Connection, id: &str, by: &str) -> AppResult<Movimiento> {
    puede(conn, Some(by), "movimiento", "aprobar")?;
    let tx = conn.unchecked_transaction()?;

    let (estado, tipo, sub_tipo) = estado_tipo(&tx, id)?;
    if estado != EstadoMovimiento::Borrador && estado != EstadoMovimiento::PendienteAprobacion {
        return Err(AppError::TransicionInvalida(
            "APROBADO".into(),
            estado.as_str().into(),
        ));
    }
    let tipo_mov = tipo.as_str();
    let sub = sub_tipo.as_str();

    // Cargar líneas.
    let mut stmt = tx.prepare(
        "SELECT id, producto_id, lote_id, cantidad, origen_ubicacion_id, destino_ubicacion_id,
                caja_origen_id, caja_destino_id
         FROM movimiento_lineas WHERE movimiento_id = ?1",
    )?;
    let lineas = stmt
        .query_map([id], |r| {
            Ok(LineaMovimiento {
                id: r.get(0)?,
                movimiento_id: id.to_string(),
                producto_id: r.get(1)?,
                lote_id: r.get(2)?,
                cantidad: r.get(3)?,
                origen_ubicacion_id: r.get(4)?,
                destino_ubicacion_id: r.get(5)?,
                caja_origen_id: r.get(6)?,
                caja_destino_id: r.get(7)?,
            })
        })?
        .collect::<Result<Vec<_>, _>>()?;
    drop(stmt);

    for linea in &lineas {
        let reglas = reglas_producto(&tx, &linea.producto_id)?;
        // Productos inactivos no reciben entradas ni salidas (SPEC §3.7).
        if !reglas.activo {
            return Err(AppError::EntidadInactiva("producto"));
        }

        let (origen, destino) = match tipo_mov {
            "ENTRADA" => (None, Some(destino_obligatorio(&tx, sub, linea)?)),
            "SALIDA" => (Some(origen_obligatorio(&tx, sub, linea)?), None),
            "TRASLADO" => (
                Some(origen_obligatorio(&tx, sub, linea)?),
                Some(destino_obligatorio(&tx, sub, linea)?),
            ),
            "AJUSTE" => match sub {
                "AJUSTE_POSITIVO" => (None, Some(destino_obligatorio(&tx, sub, linea)?)),
                "AJUSTE_NEGATIVO" => (Some(origen_obligatorio(&tx, sub, linea)?), None),
                _ => return Err(AppError::CampoRequerido("sub_tipo".into())),
            },
            "CONSUMO" => (Some(origen_obligatorio(&tx, sub, linea)?), None),
            _ => return Err(AppError::CampoRequerido("tipo".into())),
        };

        // Salidas y traslados: saldo suficiente (SPEC §14.2), nunca negativo.
        if let Some(ori) = &origen {
            let disponible = saldo_actual(&tx, ori, &linea.producto_id, linea.lote_id.as_deref())?;
            if disponible < linea.cantidad {
                let codigo = codigo_ubicacion(&tx, ori)?;
                return Err(AppError::SaldoInsuficiente {
                    ubicacion: codigo,
                    disponible,
                    intentado: linea.cantidad,
                });
            }
            // Regla dura §8.6: lote vencido no sale como CLIENTE ni DEVOLUCION_PROVEEDOR.
            if (sub == "CLIENTE" || sub == "DEVOLUCION_PROVEEDOR")
                && let Some(lote_id) = &linea.lote_id
            {
                let vencimiento: Option<String> = tx.query_row(
                    "SELECT fecha_vencimiento FROM lotes WHERE id = ?1",
                    [lote_id],
                    |r| r.get(0),
                )?;
                if let Some(venc) = vencimiento {
                    let hoy = &ahora()[..10];
                    if venc.as_str() < hoy {
                        let num = codigo_lote(&tx, lote_id)?;
                        return Err(AppError::LoteVencido(num));
                    }
                }
            }
        }

        // Entradas y traslados: validar capacidad de destino (SPEC §5.4, §3.5).
        if let Some(dest) = &destino {
            validar_capacidad(&tx, dest, &linea.producto_id, linea.cantidad)?;
        }

        aplicar_linea(&tx, linea, origen.as_deref(), destino.as_deref())?;
    }

    let ts = ahora();
    tx.execute(
        "UPDATE movimientos SET estado = 'APROBADO', approved_by = ?2, approved_at = ?3 WHERE id = ?1",
        rusqlite::params![id, by, ts],
    )?;
    crate::domain::seguridad::EventoAuditoria::registrar(
        &tx,
        Some(by),
        "aprobar",
        "movimiento",
        Some(id),
        None,
        None,
        None,
    )?;
    tx.commit()?;
    Ok(obtener_movimiento(conn, id)?.expect("existe"))
}

/// Anular: si el movimiento afectó stock (APROBADO), genera el inverso (SPEC §6.2).
pub fn anular_movimiento(conn: &Connection, id: &str, by: &str) -> AppResult<Movimiento> {
    puede(conn, Some(by), "movimiento", "anular")?;
    let tx = conn.unchecked_transaction()?;
    let (estado, tipo, sub_tipo) = estado_tipo(&tx, id)?;
    match estado {
        EstadoMovimiento::Aprobado => {
            let inverso_id = Uuid::new_v4().to_string();
            let ts = ahora();
            let anio = &ts[..4];
            let numero = generar_numero(&tx, anio)?;

            // Cargar líneas del original.
            let mut stmt = tx.prepare(
                "SELECT producto_id, lote_id, cantidad, origen_ubicacion_id, destino_ubicacion_id,
                        caja_origen_id, caja_destino_id
                 FROM movimiento_lineas WHERE movimiento_id = ?1",
            )?;
            let lineas: Vec<LineaInversa> = stmt
                .query_map([id], |r| {
                    Ok((
                        r.get(0)?,
                        r.get(1)?,
                        r.get(2)?,
                        r.get(3)?,
                        r.get(4)?,
                        r.get(5)?,
                        r.get(6)?,
                    ))
                })?
                .collect::<Result<_, _>>()?;
            drop(stmt);

            // Invertir tipo/sentido.
            let (tipo_inv, sub_inv) = invertir_tipo(tipo.as_str(), sub_tipo.as_str())?;

            tx.execute(
                "INSERT INTO movimientos (id, tipo, sub_tipo, numero, estado, fecha_movimiento, motivo,
                        documento_referencia, notas, movimiento_inverso_id, created_by, created_at, anulado_by, anulado_at)
                 VALUES (?1, ?2, ?3, ?4, 'APROBADO', ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13)",
                rusqlite::params![
                    inverso_id, tipo_inv, sub_inv, numero, ahora(),
                    "Anulación del movimiento original", Option::<&str>::None, Option::<&str>::None, id, by, ts, by, ts
                ],
            )?;

            // Ejecutar líneas inversas contra los saldos.
            for (producto, lote, cantidad, orig, dest, _co, _cd) in &lineas {
                // Invertir el sentido: lo que entró sale, lo que salió entra.
                let (nuevo_origen, nuevo_destino) = match tipo_inv {
                    // SALIDA inversa: sale desde el destino de la entrada original.
                    "SALIDA" => (dest.clone(), None),
                    // ENTRADA inversa: entra al origen de la salida original.
                    "ENTRADA" => (None, orig.clone()),
                    // TRASLADO inverso: intercambiar origen/destino.
                    "TRASLADO" => (dest.clone(), orig.clone()),
                    "AJUSTE" => (orig.clone(), dest.clone()),
                    _ => (None, None),
                };
                // Validar saldo en origen del inverso.
                if let Some(o) = &nuevo_origen {
                    let disp = saldo_actual(&tx, o, producto, lote.as_deref())?;
                    if disp < *cantidad {
                        let codigo = codigo_ubicacion(&tx, o)?;
                        return Err(AppError::SaldoInsuficiente {
                            ubicacion: codigo,
                            disponible: disp,
                            intentado: *cantidad,
                        });
                    }
                }
                aplicar_linea_inversa(
                    &tx,
                    &inverso_id,
                    producto,
                    lote.as_deref(),
                    *cantidad,
                    nuevo_origen.as_deref(),
                    nuevo_destino.as_deref(),
                )?;
            }

            // Marcar original como anulado.
            tx.execute(
                "UPDATE movimientos SET estado = 'ANULADO', anulado_by = ?2, anulado_at = ?3, movimiento_inverso_id = ?4 WHERE id = ?1",
                rusqlite::params![id, by, ts, inverso_id],
            )?;
            crate::domain::seguridad::EventoAuditoria::registrar(
                &tx,
                Some(by),
                "anular",
                "movimiento",
                Some(id),
                None,
                None,
                None,
            )?;
            tx.commit()?;
        }
        EstadoMovimiento::Borrador | EstadoMovimiento::PendienteAprobacion => {
            // Sin efecto sobre stock: solo se marca anulado.
            let ts = ahora();
            tx.execute(
                "UPDATE movimientos SET estado = 'ANULADO', anulado_by = ?2, anulado_at = ?3 WHERE id = ?1",
                rusqlite::params![id, by, ts],
            )?;
            EventoAuditoria(&tx).registrar(
                Some(by),
                "anular",
                "movimiento",
                Some(id),
                None,
                None,
            )?;
            tx.commit()?;
        }
        EstadoMovimiento::Anulado => {
            return Err(AppError::MovimientoAnulado);
        }
    }
    Ok(obtener_movimiento(conn, id)?.expect("existe"))
}

/// Aplica una línea sobre los saldos materializados (incremento/decremento).
/// `lote_key` = '' cuando no hay lote, para que ON CONFLICT funcione en SQLite.
fn aplicar_linea(
    tx: &Connection,
    linea: &LineaMovimiento,
    origen: Option<&str>,
    destino: Option<&str>,
) -> AppResult<()> {
    let lote_key = linea.lote_id.clone().unwrap_or_default();
    // Salida de origen: valor neto negativo; ON CONFLICT suma (resta).
    if let Some(o) = origen {
        tx.execute(
            "INSERT INTO saldos (ubicacion_id, producto_id, lote_id, lote_key, cantidad, updated_at)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6)
             ON CONFLICT(ubicacion_id, producto_id, lote_key) DO UPDATE SET
               cantidad = cantidad + excluded.cantidad,
               updated_at = excluded.updated_at",
            rusqlite::params![o, linea.producto_id, linea.lote_id, lote_key, -linea.cantidad, ahora()],
        )?;
    }
    // Entrada en destino: valor neto positivo; ON CONFLICT suma.
    if let Some(d) = destino {
        tx.execute(
            "INSERT INTO saldos (ubicacion_id, producto_id, lote_id, lote_key, cantidad, updated_at)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6)
             ON CONFLICT(ubicacion_id, producto_id, lote_key) DO UPDATE SET
               cantidad = cantidad + excluded.cantidad,
               updated_at = excluded.updated_at",
            rusqlite::params![d, linea.producto_id, linea.lote_id, lote_key, linea.cantidad, ahora()],
        )?;
    }
    Ok(())
}

/// Aplica una línea inversa durante la anulación.
fn aplicar_linea_inversa(
    tx: &Connection,
    movimiento_id: &str,
    producto: &str,
    lote: Option<&str>,
    cantidad: i64,
    origen: Option<&str>,
    destino: Option<&str>,
) -> AppResult<()> {
    let lid = Uuid::new_v4().to_string();
    tx.execute(
        "INSERT INTO movimiento_lineas (id, movimiento_id, producto_id, lote_id, cantidad, origen_ubicacion_id, destino_ubicacion_id)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)",
        rusqlite::params![lid, movimiento_id, producto, lote, cantidad, origen, destino],
    )?;
    let lote_key = lote.unwrap_or_default();
    if let Some(o) = origen {
        tx.execute(
            "INSERT INTO saldos (ubicacion_id, producto_id, lote_id, lote_key, cantidad, updated_at)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6)
             ON CONFLICT(ubicacion_id, producto_id, lote_key) DO UPDATE SET
               cantidad = cantidad + excluded.cantidad, updated_at = excluded.updated_at",
            rusqlite::params![o, producto, lote, lote_key, -cantidad, ahora()],
        )?;
    }
    if let Some(d) = destino {
        tx.execute(
            "INSERT INTO saldos (ubicacion_id, producto_id, lote_id, lote_key, cantidad, updated_at)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6)
             ON CONFLICT(ubicacion_id, producto_id, lote_key) DO UPDATE SET
               cantidad = cantidad + excluded.cantidad, updated_at = excluded.updated_at",
            rusqlite::params![d, producto, lote, lote_key, cantidad, ahora()],
        )?;
    }
    Ok(())
}

/// Valida la capacidad máxima de una ubicación antes de ingresar (SPEC §5.4).
fn validar_capacidad(
    tx: &Connection,
    ubicacion: &str,
    producto: &str,
    cantidad: i64,
) -> AppResult<()> {
    let capacidad: Option<i64> = tx.query_row(
        "SELECT capacidad_maxima FROM ubicaciones WHERE id = ?1",
        [ubicacion],
        |r| r.get(0),
    )?;
    if let Some(cap) = capacidad {
        let actual: i64 = saldo_actual(tx, ubicacion, producto, None)?;
        if actual + cantidad > cap {
            let codigo = codigo_ubicacion(tx, ubicacion)?;
            return Err(AppError::CapacidadExcedida(codigo));
        }
    }
    Ok(())
}

fn origen_obligatorio(_tx: &Connection, _sub: &str, linea: &LineaMovimiento) -> AppResult<String> {
    linea
        .origen_ubicacion_id
        .clone()
        .ok_or_else(|| AppError::CampoRequerido("origen_ubicacion_id".into()))
}

fn destino_obligatorio(_tx: &Connection, _sub: &str, linea: &LineaMovimiento) -> AppResult<String> {
    linea
        .destino_ubicacion_id
        .clone()
        .ok_or_else(|| AppError::CampoRequerido("destino_ubicacion_id".into()))
}

fn estado_movimiento(conn: &Connection, id: &str) -> AppResult<EstadoMovimiento> {
    let s: String = conn.query_row("SELECT estado FROM movimientos WHERE id = ?1", [id], |r| {
        r.get(0)
    })?;
    EstadoMovimiento::parse(&s).ok_or_else(|| AppError::CampoRequerido("estado".into()))
}

fn estado_tipo(conn: &Connection, id: &str) -> AppResult<(EstadoMovimiento, String, String)> {
    conn.query_row(
        "SELECT estado, tipo, sub_tipo FROM movimientos WHERE id = ?1",
        [id],
        |r| {
            let estado = r.get::<_, String>(0)?;
            let tipo = r.get::<_, String>(1)?;
            let sub = r.get::<_, String>(2)?;
            Ok((
                EstadoMovimiento::parse(&estado).ok_or(rusqlite::Error::InvalidQuery)?,
                tipo,
                sub,
            ))
        },
    )
    .map_err(|_| AppError::NoEncontrado("movimiento", id.to_string()))
}

fn invertir_tipo(tipo: &str, sub: &str) -> AppResult<(&'static str, &'static str)> {
    match (tipo, sub) {
        ("ENTRADA", "COMPRA") => Ok(("SALIDA", "DEVOLUCION_PROVEEDOR")),
        ("ENTRADA", "DEVOLUCION_CLIENTE") => Ok(("SALIDA", "CLIENTE")),
        ("ENTRADA", "AJUSTE_POSITIVO") => Ok(("SALIDA", "AJUSTE_NEGATIVO")),
        ("ENTRADA", "INICIAL") => Ok(("SALIDA", "AJUSTE_NEGATIVO")),
        ("ENTRADA", "TRASLADO_ENTRADA") => Ok(("SALIDA", "TRASLADO_SALIDA")),
        ("SALIDA", "CLIENTE") => Ok(("ENTRADA", "DEVOLUCION_CLIENTE")),
        ("SALIDA", "DEVOLUCION_PROVEEDOR") => Ok(("ENTRADA", "COMPRA")),
        ("SALIDA", "MERMA") => Ok(("ENTRADA", "AJUSTE_POSITIVO")),
        ("SALIDA", "AJUSTE_NEGATIVO") => Ok(("ENTRADA", "AJUSTE_POSITIVO")),
        ("SALIDA", "TRASLADO_SALIDA") => Ok(("ENTRADA", "TRASLADO_ENTRADA")),
        ("TRASLADO", _) => Ok(("TRASLADO", "TRASLADO_ENTRADA")),
        ("AJUSTE", "AJUSTE_POSITIVO") => Ok(("SALIDA", "AJUSTE_NEGATIVO")),
        ("AJUSTE", "AJUSTE_NEGATIVO") => Ok(("ENTRADA", "AJUSTE_POSITIVO")),
        _ => Err(AppError::CampoRequerido("inversión no soportada".into())),
    }
}

pub fn obtener_movimiento(conn: &Connection, id: &str) -> AppResult<Option<Movimiento>> {
    let mut stmt = conn.prepare(
        "SELECT id, tipo, sub_tipo, numero, estado, fecha_movimiento, motivo,
                origen_ubicacion_id, destino_ubicacion_id, proveedor_id, cliente_id, sesion_inventario_id,
                documento_referencia, notas, movimiento_inverso_id, created_by, created_at,
                approved_by, approved_at, anulado_by, anulado_at
         FROM movimientos WHERE id = ?1",
    )?;
    let mut rows = stmt.query_map([id], map_movimiento)?;
    rows.next().transpose().map_err(AppError::from)
}

fn map_movimiento(r: &rusqlite::Row<'_>) -> rusqlite::Result<Movimiento> {
    Ok(Movimiento {
        id: r.get(0)?,
        tipo: r.get(1)?,
        sub_tipo: r.get(2)?,
        numero: r.get(3)?,
        estado: r.get(4)?,
        fecha_movimiento: r.get(5)?,
        motivo: r.get(6)?,
        origen_ubicacion_id: r.get(7)?,
        destino_ubicacion_id: r.get(8)?,
        proveedor_id: r.get(9)?,
        cliente_id: r.get(10)?,
        sesion_inventario_id: r.get(11)?,
        documento_referencia: r.get(12)?,
        notas: r.get(13)?,
        movimiento_inverso_id: r.get(14)?,
        created_by: r.get(15)?,
        created_at: r.get(16)?,
        approved_by: r.get(17)?,
        approved_at: r.get(18)?,
        anulado_by: r.get(19)?,
        anulado_at: r.get(20)?,
    })
}

/// Saldos por (ubicación, producto, lote) — consulta canónica SPEC §5.2.
pub fn listar_saldos(
    conn: &Connection,
    ubicacion: Option<&str>,
    producto: Option<&str>,
) -> AppResult<Vec<Saldo>> {
    let mut stmt = conn.prepare(
        "SELECT ubicacion_id, producto_id, lote_id, cantidad, updated_at
         FROM saldos
         WHERE (?1 IS NULL OR ubicacion_id = ?1) AND (?2 IS NULL OR producto_id = ?2)
         ORDER BY ubicacion_id, producto_id",
    )?;
    let rows = stmt
        .query_map(rusqlite::params![ubicacion, producto], |r| {
            Ok(Saldo {
                ubicacion_id: r.get(0)?,
                producto_id: r.get(1)?,
                lote_id: r.get(2)?,
                cantidad: r.get(3)?,
                updated_at: r.get(4)?,
            })
        })?
        .collect::<Result<Vec<_>, _>>()?;
    Ok(rows)
}

/// Saldo negativo como indicador de bug: consulta de auditoría (SPEC §14.2).
#[allow(dead_code)]
pub fn saldos_negativos(conn: &Connection) -> AppResult<Vec<Saldo>> {
    let mut stmt = conn.prepare(
        "SELECT ubicacion_id, producto_id, lote_id, cantidad, updated_at
         FROM saldos WHERE cantidad < 0 ORDER BY cantidad",
    )?;
    let rows = stmt
        .query_map([], |r| {
            Ok(Saldo {
                ubicacion_id: r.get(0)?,
                producto_id: r.get(1)?,
                lote_id: r.get(2)?,
                cantidad: r.get(3)?,
                updated_at: r.get(4)?,
            })
        })?
        .collect::<Result<Vec<_>, _>>()?;
    Ok(rows)
}

// Helper para auditoría dentro de transacciones.
struct EventoAuditoria<'a>(&'a Connection);
impl<'a> EventoAuditoria<'a> {
    fn registrar(
        &self,
        usuario_id: Option<&str>,
        accion: &str,
        entidad: &str,
        entidad_id: Option<&str>,
        antes: Option<&str>,
        despues: Option<&str>,
    ) -> AppResult<()> {
        crate::domain::seguridad::EventoAuditoria::registrar(
            self.0, usuario_id, accion, entidad, entidad_id, antes, despues, None,
        )
    }
}

#[allow(unused)]
fn _normalizar(c: &str) -> String {
    normalizar_codigo(c)
}
