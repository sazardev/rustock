use rusqlite::Connection;
use uuid::Uuid;

use crate::domain::ahora;
use crate::domain::inventario::*;
use crate::error::{AppError, AppResult};
use crate::security::puede;

pub fn crear_sesion(
    conn: &Connection,
    nuevo: &NuevaSesionInventario,
) -> AppResult<SesionInventario> {
    puede(conn, Some(&nuevo.created_by), "inventario", "ejecutar")?;
    let id = Uuid::new_v4().to_string();
    let ts = ahora();
    let anio = &ts[..4];
    let count: i64 = conn.query_row(
        "SELECT COUNT(*) FROM sesiones_inventario WHERE numero LIKE ?1",
        [format!("INV-{anio}-%")],
        |r| r.get(0),
    )?;
    let numero = format!("INV-{anio}-{:04}", count + 1);
    let estado = if nuevo.fecha_inicio.is_some() {
        "EN_CURSO"
    } else {
        "PLANEADA"
    };
    conn.execute(
        "INSERT INTO sesiones_inventario (id, numero, tipo, estado, almacen_id, alcance, fecha_inicio, fecha_fin,
                responsable_id, conteo_ciego, exige_doble_conteo, created_by, created_at)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13)",
        rusqlite::params![
            id, numero, nuevo.tipo, estado, nuevo.almacen_id, nuevo.alcance, nuevo.fecha_inicio,
            nuevo.fecha_fin, nuevo.responsable_id, nuevo.conteo_ciego as i64,
            nuevo.exige_doble_conteo as i64, nuevo.created_by, ts
        ],
    )?;
    Ok(obtener_sesion(conn, &id)?.expect("recién insertada"))
}

pub fn listar_sesiones(
    conn: &Connection,
    estado: Option<&str>,
) -> AppResult<Vec<SesionInventario>> {
    let mut stmt = conn.prepare(
        "SELECT id, numero, tipo, estado, almacen_id, alcance, fecha_inicio, fecha_fin,
                responsable_id, conteo_ciego, exige_doble_conteo, created_by, created_at, closed_by, closed_at
         FROM sesiones_inventario
         WHERE (?1 IS NULL OR estado = ?1)
         ORDER BY created_at DESC",
    )?;
    let rows = stmt
        .query_map([estado], map_sesion)?
        .collect::<Result<Vec<_>, _>>()?;
    Ok(rows)
}

pub fn obtener_sesion(conn: &Connection, id: &str) -> AppResult<Option<SesionInventario>> {
    let mut stmt = conn.prepare(
        "SELECT id, numero, tipo, estado, almacen_id, alcance, fecha_inicio, fecha_fin,
                responsable_id, conteo_ciego, exige_doble_conteo, created_by, created_at, closed_by, closed_at
         FROM sesiones_inventario WHERE id = ?1",
    )?;
    let mut rows = stmt.query_map([id], map_sesion)?;
    rows.next().transpose().map_err(AppError::from)
}

fn map_sesion(r: &rusqlite::Row<'_>) -> rusqlite::Result<SesionInventario> {
    Ok(SesionInventario {
        id: r.get(0)?,
        numero: r.get(1)?,
        tipo: r.get(2)?,
        estado: r.get(3)?,
        almacen_id: r.get(4)?,
        alcance: r.get(5)?,
        fecha_inicio: r.get(6)?,
        fecha_fin: r.get(7)?,
        responsable_id: r.get(8)?,
        conteo_ciego: r.get::<_, i64>(9)? != 0,
        exige_doble_conteo: r.get::<_, i64>(10)? != 0,
        created_by: r.get(11)?,
        created_at: r.get(12)?,
        closed_by: r.get(13)?,
        closed_at: r.get(14)?,
    })
}

/// Registra un conteo (SPEC §11.4). Valida el estado de la sesión y el conteo ciego.
pub fn registrar_conteo(conn: &Connection, nuevo: &NuevoConteo) -> AppResult<Conteo> {
    nuevo.validar()?;
    puede(
        conn,
        Some(&nuevo.usuario_contador_id),
        "inventario",
        "ejecutar",
    )?;
    let tx = conn.unchecked_transaction()?;

    let estado: String = tx.query_row(
        "SELECT estado FROM sesiones_inventario WHERE id = ?1",
        [&nuevo.sesion_id],
        |r| r.get(0),
    )?;
    if estado != "EN_CURSO" {
        return Err(AppError::TransicionInvalida("EN_CURSO".into(), estado));
    }

    // Validar que el producto controla lote (SPEC §11.4).
    let controla_lote: i64 = tx.query_row(
        "SELECT controla_lote FROM productos WHERE id = ?1",
        [&nuevo.producto_id],
        |r| r.get(0),
    )?;
    if controla_lote != 0 && nuevo.lote_id.is_none() {
        return Err(AppError::LoteRequerido("producto".into()));
    }

    let id = Uuid::new_v4().to_string();
    tx.execute(
        "INSERT INTO conteos (id, sesion_id, ubicacion_id, producto_id, lote_id, cantidad_contada,
                conteo_numero, usuario_contador_id, timestamp, nota)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10)",
        rusqlite::params![
            id,
            nuevo.sesion_id,
            nuevo.ubicacion_id,
            nuevo.producto_id,
            nuevo.lote_id,
            nuevo.cantidad_contada,
            nuevo.conteo_numero,
            nuevo.usuario_contador_id,
            ahora(),
            nuevo.nota
        ],
    )?;
    tx.commit()?;
    Ok(obtener_conteo(conn, &id)?.expect("recién insertado"))
}

pub fn obtener_conteo(conn: &Connection, id: &str) -> AppResult<Option<Conteo>> {
    let mut stmt = conn.prepare(
        "SELECT id, sesion_id, ubicacion_id, producto_id, lote_id, cantidad_contada,
                conteo_numero, usuario_contador_id, timestamp, nota
         FROM conteos WHERE id = ?1",
    )?;
    let mut rows = stmt.query_map([id], map_conteo)?;
    rows.next().transpose().map_err(AppError::from)
}

pub fn listar_conteos(conn: &Connection, sesion_id: &str) -> AppResult<Vec<Conteo>> {
    let mut stmt = conn.prepare(
        "SELECT id, sesion_id, ubicacion_id, producto_id, lote_id, cantidad_contada,
                conteo_numero, usuario_contador_id, timestamp, nota
         FROM conteos WHERE sesion_id = ?1 ORDER BY timestamp",
    )?;
    let rows = stmt
        .query_map([sesion_id], map_conteo)?
        .collect::<Result<Vec<_>, _>>()?;
    Ok(rows)
}

fn map_conteo(r: &rusqlite::Row<'_>) -> rusqlite::Result<Conteo> {
    Ok(Conteo {
        id: r.get(0)?,
        sesion_id: r.get(1)?,
        ubicacion_id: r.get(2)?,
        producto_id: r.get(3)?,
        lote_id: r.get(4)?,
        cantidad_contada: r.get(5)?,
        conteo_numero: r.get(6)?,
        usuario_contador_id: r.get(7)?,
        timestamp: r.get(8)?,
        nota: r.get(9)?,
    })
}

/// Diferencias entre lo contado y el saldo en sistema (SPEC §11.5).
pub fn diferencias_sesion(
    conn: &Connection,
    sesion_id: &str,
) -> AppResult<Vec<DiferenciaInventario>> {
    let conteos = listar_conteos(conn, sesion_id)?;
    let mut result: Vec<DiferenciaInventario> = Vec::new();
    for c in conteos {
        let lote_key = c.lote_id.clone().unwrap_or_default();
        let saldo: i64 = conn.query_row(
            "SELECT COALESCE(SUM(cantidad), 0) FROM saldos
             WHERE ubicacion_id = ?1 AND producto_id = ?2 AND lote_key = ?3",
            rusqlite::params![c.ubicacion_id, c.producto_id, lote_key],
            |r| r.get(0),
        )?;
        let diferencia = c.cantidad_contada - saldo;
        let tipo = if diferencia == 0 {
            "conciliado".to_string()
        } else if diferencia > 0 {
            "sobrante".to_string()
        } else {
            "faltante".to_string()
        };
        result.push(DiferenciaInventario {
            ubicacion_id: c.ubicacion_id,
            producto_id: c.producto_id,
            lote_id: c.lote_id,
            saldo_sistema: saldo,
            cantidad_contada: c.cantidad_contada,
            diferencia,
            tipo,
        });
    }
    Ok(result)
}

/// Cierra la sesión (SPEC §11.5): solo con permiso; genera ajustes de diferencias.
pub fn cerrar_sesion(conn: &Connection, sesion_id: &str, by: &str) -> AppResult<Vec<String>> {
    puede(conn, Some(by), "inventario", "cerrar")?;
    let tx = conn.unchecked_transaction()?;

    let estado: String = tx.query_row(
        "SELECT estado FROM sesiones_inventario WHERE id = ?1",
        [sesion_id],
        |r| r.get(0),
    )?;
    if estado == "CERRADA" {
        return Err(AppError::TransicionInvalida("cerrar".into(), estado));
    }
    if estado != "EN_CURSO" {
        return Err(AppError::TransicionInvalida("EN_CURSO".into(), estado));
    }

    let exige_doble: bool = tx.query_row(
        "SELECT exige_doble_conteo FROM sesiones_inventario WHERE id = ?1",
        [sesion_id],
        |r| r.get::<_, i64>(0),
    )? != 0;

    let difs = diferencias_sesion(&tx, sesion_id)?;
    let mut ajustes = Vec::new();
    for d in difs {
        if d.diferencia == 0 {
            continue;
        }
        if exige_doble {
            // El segundo conteo debe confirmar la cantidad (SPEC §11.3).
            let confirm: i64 = tx.query_row(
                "SELECT COUNT(*) FROM conteos
                 WHERE sesion_id = ?1 AND ubicacion_id = ?2 AND producto_id = ?3 AND conteo_numero >= 2
                   AND (?4 IS NULL OR lote_id = ?4)",
                rusqlite::params![sesion_id, d.ubicacion_id, d.producto_id, d.lote_id],
                |r| r.get(0),
            )?;
            if confirm == 0 {
                return Err(AppError::CampoRequerido(
                    "doble conteo requerido para conciliar la diferencia".into(),
                ));
            }
        }
        let ajuste = generar_ajuste_diferencia(&tx, sesion_id, &d, by)?;
        ajustes.push(ajuste);
    }

    let ts = ahora();
    tx.execute(
        "UPDATE sesiones_inventario SET estado = 'CERRADA', closed_by = ?2, closed_at = ?3, fecha_fin = ?3 WHERE id = ?1",
        rusqlite::params![sesion_id, by, ts],
    )?;
    tx.commit()?;
    Ok(ajustes)
}

/// Genera el ajuste (entrada/salida por "diferencia de inventario") para una diferencia.
fn generar_ajuste_diferencia(
    tx: &Connection,
    sesion_id: &str,
    d: &DiferenciaInventario,
    by: &str,
) -> AppResult<String> {
    let id = Uuid::new_v4().to_string();
    let ts = ahora();
    let anio = &ts[..4];
    let count: i64 = tx.query_row(
        "SELECT COUNT(*) FROM movimientos WHERE numero LIKE ?1",
        [format!("MOV-{anio}-%")],
        |r| r.get(0),
    )?;
    let numero = format!("MOV-{anio}-{:06}", count + 1);

    let (tipo, sub, origen, destino) = if d.diferencia > 0 {
        (
            "ENTRADA",
            "AJUSTE_POSITIVO",
            None,
            Some(d.ubicacion_id.clone()),
        )
    } else {
        (
            "SALIDA",
            "AJUSTE_NEGATIVO",
            Some(d.ubicacion_id.clone()),
            None,
        )
    };

    tx.execute(
        "INSERT INTO movimientos (id, tipo, sub_tipo, numero, estado, fecha_movimiento, motivo,
                origen_ubicacion_id, destino_ubicacion_id, sesion_inventario_id, created_by, created_at,
                approved_by, approved_at)
         VALUES (?1, ?2, ?3, ?4, 'APROBADO', ?5, 'diferencia de inventario', ?6, ?7, ?8, ?9, ?10, ?11, ?10)",
        rusqlite::params![
            id, tipo, sub, numero, ts, origen, destino, sesion_id, by, ts, by
        ],
    )?;

    let lid = Uuid::new_v4().to_string();
    tx.execute(
        "INSERT INTO movimiento_lineas (id, movimiento_id, producto_id, lote_id, cantidad, origen_ubicacion_id, destino_ubicacion_id)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)",
        rusqlite::params![
            lid, id, d.producto_id, d.lote_id, d.diferencia.abs(), origen, destino
        ],
    )?;

    // Aplicar al saldo (valor neto; ON CONFLICT suma).
    let lote_key = d.lote_id.clone().unwrap_or_default();
    if let Some(o) = &origen {
        tx.execute(
            "INSERT INTO saldos (ubicacion_id, producto_id, lote_id, lote_key, cantidad, updated_at)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6)
             ON CONFLICT(ubicacion_id, producto_id, lote_key) DO UPDATE SET
               cantidad = cantidad + excluded.cantidad, updated_at = excluded.updated_at",
            rusqlite::params![o, d.producto_id, d.lote_id, lote_key, -d.diferencia.abs(), ts],
        )?;
    }
    if let Some(dest) = &destino {
        tx.execute(
            "INSERT INTO saldos (ubicacion_id, producto_id, lote_id, lote_key, cantidad, updated_at)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6)
             ON CONFLICT(ubicacion_id, producto_id, lote_key) DO UPDATE SET
               cantidad = cantidad + excluded.cantidad, updated_at = excluded.updated_at",
            rusqlite::params![dest, d.producto_id, d.lote_id, lote_key, d.diferencia.abs(), ts],
        )?;
    }
    Ok(numero)
}
