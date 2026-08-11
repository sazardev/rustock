//! Alertas (SPEC §17): se recalculan sobre datos indexados (saldos,
//! vencimientos, movimientos pendientes) y se persisten para poder
//! resolverlas/ignorarlas sin perder el estado entre consultas.

use rusqlite::{Connection, OptionalExtension};
use uuid::Uuid;

use crate::domain::alerta::Alerta;
use crate::domain::{ahora, seguridad::EventoAuditoria};
use crate::error::{AppError, AppResult};
use crate::repo::trazabilidad::fecha_mas_dias;
use crate::security::puede;

fn map_alerta(r: &rusqlite::Row<'_>) -> rusqlite::Result<Alerta> {
    Ok(Alerta {
        id: r.get(0)?,
        tipo: r.get(1)?,
        severidad: r.get(2)?,
        entidad: r.get(3)?,
        entidad_id: r.get(4)?,
        fecha_deteccion: r.get(5)?,
        estado: r.get(6)?,
        detalle: r.get(7)?,
    })
}

const SELECT_ALERTA: &str = "SELECT id, tipo, severidad, entidad, entidad_id, fecha_deteccion, estado, detalle FROM alertas";

/// Crea o refresca una alerta abierta para (tipo, entidad, entidad_id). No
/// reabre alertas que el usuario marcó `IGNORADA` explícitamente.
fn upsert_alerta(
    tx: &Connection,
    tipo: &str,
    severidad: &str,
    entidad: &str,
    entidad_id: &str,
    detalle: &str,
) -> AppResult<()> {
    let existe: Option<String> = tx
        .query_row(
            "SELECT id FROM alertas WHERE tipo = ?1 AND entidad = ?2 AND entidad_id = ?3 AND estado != 'IGNORADA'",
            rusqlite::params![tipo, entidad, entidad_id],
            |r| r.get(0),
        )
        .optional()?;
    let ts = ahora();
    match existe {
        Some(id) => {
            tx.execute(
                "UPDATE alertas SET detalle = ?2, estado = 'ABIERTA', fecha_deteccion = ?3 WHERE id = ?1",
                rusqlite::params![id, detalle, ts],
            )?;
        }
        None => {
            let id = Uuid::new_v4().to_string();
            tx.execute(
                "INSERT INTO alertas (id, tipo, severidad, entidad, entidad_id, fecha_deteccion, estado, detalle)
                 VALUES (?1, ?2, ?3, ?4, ?5, ?6, 'ABIERTA', ?7)",
                rusqlite::params![id, tipo, severidad, entidad, entidad_id, ts, detalle],
            )?;
        }
    }
    Ok(())
}

/// Resuelve automáticamente las alertas `ABIERTA` de `tipo` cuya condición ya
/// no está entre `activos` (la lista completa de entidades que SÍ cumplen la
/// condición en este recálculo).
fn resolver_ausentes(tx: &Connection, tipo: &str, activos: &[String]) -> AppResult<()> {
    if activos.is_empty() {
        tx.execute(
            "UPDATE alertas SET estado = 'RESUELTA' WHERE tipo = ?1 AND estado = 'ABIERTA'",
            [tipo],
        )?;
        return Ok(());
    }
    let placeholders = activos.iter().map(|_| "?").collect::<Vec<_>>().join(",");
    let sql = format!(
        "UPDATE alertas SET estado = 'RESUELTA' WHERE tipo = ?1 AND estado = 'ABIERTA' AND entidad_id NOT IN ({placeholders})"
    );
    let mut params: Vec<&dyn rusqlite::ToSql> = vec![&tipo];
    for a in activos {
        params.push(a);
    }
    tx.execute(&sql, params.as_slice())?;
    Ok(())
}

/// Recalcula las 7 condiciones del SPEC §17.1 y sincroniza la tabla
/// `alertas`. `dias_por_vencer` es el horizonte de "lote por vencer" (§17.1).
pub fn regenerar_alertas(conn: &Connection, dias_por_vencer: i64) -> AppResult<()> {
    let tx = conn.unchecked_transaction()?;

    // Stock bajo / stock excedido (SPEC §5.4, §17.1).
    let productos: Vec<(String, String, Option<i64>, Option<i64>)> = tx
        .prepare("SELECT id, sku, stock_minimo, stock_maximo FROM productos WHERE activo = 1")?
        .query_map([], |r| Ok((r.get(0)?, r.get(1)?, r.get(2)?, r.get(3)?)))?
        .collect::<Result<_, _>>()?;
    let mut bajos = Vec::new();
    let mut excedidos = Vec::new();
    for (id, sku, minimo, maximo) in &productos {
        let total: i64 = tx.query_row(
            "SELECT COALESCE(SUM(cantidad), 0) FROM saldos WHERE producto_id = ?1",
            [id],
            |r| r.get(0),
        )?;
        if let Some(min) = minimo
            && total <= *min
        {
            upsert_alerta(
                &tx,
                "STOCK_BAJO",
                "MEDIA",
                "producto",
                id,
                &format!("{sku}: {total} unidades (mínimo {min})"),
            )?;
            bajos.push(id.clone());
        }
        if let Some(max) = maximo
            && total > *max
        {
            upsert_alerta(
                &tx,
                "STOCK_EXCEDIDO",
                "INFO",
                "producto",
                id,
                &format!("{sku}: {total} unidades (máximo {max})"),
            )?;
            excedidos.push(id.clone());
        }
    }
    resolver_ausentes(&tx, "STOCK_BAJO", &bajos)?;
    resolver_ausentes(&tx, "STOCK_EXCEDIDO", &excedidos)?;

    // Ubicación sobrecapacidad (SPEC §5.4, §17.1).
    let ubicaciones: Vec<(String, String, i64)> = tx
        .prepare("SELECT id, codigo, capacidad_maxima FROM ubicaciones WHERE activo = 1 AND capacidad_maxima IS NOT NULL")?
        .query_map([], |r| Ok((r.get(0)?, r.get(1)?, r.get(2)?)))?
        .collect::<Result<_, _>>()?;
    let mut sobrecapacidad = Vec::new();
    for (id, codigo, capacidad) in &ubicaciones {
        let actual: i64 = tx.query_row(
            "SELECT COALESCE(SUM(cantidad), 0) FROM saldos WHERE ubicacion_id = ?1",
            [id],
            |r| r.get(0),
        )?;
        if actual >= *capacidad {
            upsert_alerta(
                &tx,
                "UBICACION_SOBRECAPACIDAD",
                "ALTA",
                "ubicacion",
                id,
                &format!("{codigo}: {actual}/{capacidad}"),
            )?;
            sobrecapacidad.push(id.clone());
        }
    }
    resolver_ausentes(&tx, "UBICACION_SOBRECAPACIDAD", &sobrecapacidad)?;

    // Lote por vencer / lote vencido (SPEC §17.1).
    let hoy = ahora()[..10].to_string();
    let limite = fecha_mas_dias(&hoy, dias_por_vencer);
    let lotes: Vec<(String, String, String, String)> = tx
        .prepare(
            "SELECT l.id, l.numero, p.sku, l.fecha_vencimiento
             FROM lotes l JOIN productos p ON p.id = l.producto_id
             WHERE l.fecha_vencimiento IS NOT NULL AND l.fecha_vencimiento <= ?1",
        )?
        .query_map([&limite], |r| {
            Ok((r.get(0)?, r.get(1)?, r.get(2)?, r.get(3)?))
        })?
        .collect::<Result<_, _>>()?;
    let mut por_vencer = Vec::new();
    let mut vencidos = Vec::new();
    for (id, numero, sku, vencimiento) in &lotes {
        let stock: i64 = tx.query_row(
            "SELECT COALESCE(SUM(cantidad), 0) FROM saldos WHERE lote_id = ?1",
            [id],
            |r| r.get(0),
        )?;
        if stock <= 0 {
            continue;
        }
        if vencimiento.as_str() < hoy.as_str() {
            upsert_alerta(
                &tx,
                "LOTE_VENCIDO",
                "ALTA",
                "lote",
                id,
                &format!("{sku} lote {numero}: venció el {vencimiento}, quedan {stock} unidades"),
            )?;
            vencidos.push(id.clone());
        } else {
            upsert_alerta(
                &tx,
                "LOTE_POR_VENCER",
                "MEDIA",
                "lote",
                id,
                &format!("{sku} lote {numero}: vence el {vencimiento}, {stock} unidades"),
            )?;
            por_vencer.push(id.clone());
        }
    }
    resolver_ausentes(&tx, "LOTE_POR_VENCER", &por_vencer)?;
    resolver_ausentes(&tx, "LOTE_VENCIDO", &vencidos)?;

    // Diferencia de inventario en sesiones abiertas (SPEC §11.5, §17.1).
    let sesiones_en_curso: Vec<String> = tx
        .prepare("SELECT id FROM sesiones_inventario WHERE estado = 'EN_CURSO'")?
        .query_map([], |r| r.get(0))?
        .collect::<Result<_, _>>()?;
    let mut con_diferencias = Vec::new();
    for sesion_id in &sesiones_en_curso {
        let difs = crate::repo::inventario::diferencias_sesion(&tx, sesion_id)?;
        if difs.iter().any(|d| d.diferencia != 0) {
            upsert_alerta(
                &tx,
                "DIFERENCIA_INVENTARIO",
                "MEDIA",
                "inventario",
                sesion_id,
                "Hay diferencias sin conciliar en la sesión",
            )?;
            con_diferencias.push(sesion_id.clone());
        }
    }
    resolver_ausentes(&tx, "DIFERENCIA_INVENTARIO", &con_diferencias)?;

    // Movimiento pendiente de aprobación (SPEC §6.2, §17.1).
    let pendientes: Vec<(String, String)> = tx
        .prepare("SELECT id, numero FROM movimientos WHERE estado = 'PENDIENTE_APROBACION'")?
        .query_map([], |r| Ok((r.get(0)?, r.get(1)?)))?
        .collect::<Result<_, _>>()?;
    let mut ids_pendientes = Vec::new();
    for (id, numero) in &pendientes {
        upsert_alerta(
            &tx,
            "MOVIMIENTO_PENDIENTE",
            "INFO",
            "movimiento",
            id,
            &format!("{numero} espera aprobación"),
        )?;
        ids_pendientes.push(id.clone());
    }
    resolver_ausentes(&tx, "MOVIMIENTO_PENDIENTE", &ids_pendientes)?;

    tx.commit()?;
    Ok(())
}

/// Lista alertas, filtrables por estado. Solo ve una alerta quien tenga
/// `ver` sobre el recurso de su `entidad` (SPEC §17.2).
pub fn listar_alertas(
    conn: &Connection,
    estado: Option<&str>,
    actor: &str,
) -> AppResult<Vec<Alerta>> {
    let mut stmt = conn.prepare(&format!(
        "{SELECT_ALERTA} WHERE (?1 IS NULL OR estado = ?1) ORDER BY severidad DESC, fecha_deteccion DESC"
    ))?;
    let todas = stmt
        .query_map([estado], map_alerta)?
        .collect::<Result<Vec<_>, _>>()?;
    let visibles = todas
        .into_iter()
        .filter(|a| puede(conn, Some(actor), &a.entidad, "ver").is_ok())
        .collect();
    Ok(visibles)
}

fn cambiar_estado_alerta(
    conn: &Connection,
    id: &str,
    nuevo_estado: &str,
    actor: &str,
) -> AppResult<()> {
    let alerta = conn
        .query_row(&format!("{SELECT_ALERTA} WHERE id = ?1"), [id], map_alerta)
        .optional()?
        .ok_or_else(|| AppError::NoEncontrado("alerta", id.to_string()))?;
    puede(conn, Some(actor), &alerta.entidad, "ver")?;
    conn.execute(
        "UPDATE alertas SET estado = ?2 WHERE id = ?1",
        rusqlite::params![id, nuevo_estado],
    )?;
    EventoAuditoria::registrar(
        conn,
        Some(actor),
        if nuevo_estado == "RESUELTA" {
            "resolver"
        } else {
            "ignorar"
        },
        "alerta",
        Some(id),
        None,
        None,
        None,
    )?;
    Ok(())
}

/// Marca una alerta como resuelta manualmente (SPEC §17.2: "resolver una
/// alerta de stock bajo = registrar una entrada..."; esto cubre el caso en
/// que la acción de fondo ya ocurrió y el usuario confirma).
pub fn resolver_alerta(conn: &Connection, id: &str, actor: &str) -> AppResult<()> {
    cambiar_estado_alerta(conn, id, "RESUELTA", actor)
}

/// Marca una alerta como ignorada explícitamente por el usuario.
pub fn ignorar_alerta(conn: &Connection, id: &str, actor: &str) -> AppResult<()> {
    cambiar_estado_alerta(conn, id, "IGNORADA", actor)
}
