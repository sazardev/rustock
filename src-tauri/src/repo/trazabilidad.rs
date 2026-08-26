//! Consultas de trazabilidad (SPEC §13.4): las 5 preguntas que el sistema
//! debe poder responder sobre dónde está, de dónde vino y quién tocó el
//! stock.

use rusqlite::Connection;

use crate::domain::ahora;
use crate::domain::movimiento::Movimiento;
use crate::error::AppResult;
use crate::security::puede;

/// "¿Dónde está ahora el lote X?" → ubicaciones + cantidades.
#[derive(Debug, Clone, serde::Serialize)]
pub struct UbicacionDeLote {
    pub ubicacion_id: String,
    pub ubicacion_codigo: String,
    pub cantidad: i64,
}

pub fn donde_esta_lote(
    conn: &Connection,
    lote_id: &str,
    actor: &str,
) -> AppResult<Vec<UbicacionDeLote>> {
    puede(conn, Some(actor), "lote", "ver")?;
    let mut stmt = conn.prepare(
        "SELECT s.ubicacion_id, u.codigo, s.cantidad
         FROM saldos s JOIN ubicaciones u ON u.id = s.ubicacion_id
         WHERE s.lote_id = ?1 AND s.cantidad > 0
         ORDER BY u.codigo",
    )?;
    let rows = stmt
        .query_map([lote_id], |r| {
            Ok(UbicacionDeLote {
                ubicacion_id: r.get(0)?,
                ubicacion_codigo: r.get(1)?,
                cantidad: r.get(2)?,
            })
        })?
        .collect::<Result<Vec<_>, _>>()?;
    Ok(rows)
}

/// "¿De dónde vino la unidad que despaché hoy?" → para cada línea de una
/// salida, los movimientos de entrada (aprobados) del mismo producto/lote
/// que pudieron haberla abastecido, del más antiguo al más reciente (FIFO).
#[derive(Debug, Clone, serde::Serialize)]
pub struct OrigenLinea {
    pub producto_id: String,
    pub lote_id: Option<String>,
    pub movimiento_origen_id: String,
    pub numero: String,
    pub sub_tipo: String,
    pub fecha_movimiento: String,
    pub cantidad: i64,
}

pub fn origen_de_salida(
    conn: &Connection,
    movimiento_id: &str,
    actor: &str,
) -> AppResult<Vec<OrigenLinea>> {
    puede(conn, Some(actor), "movimiento", "ver")?;
    // Fecha de la salida para filtrar solo entradas anteriores (SPEC §13.4).
    let fecha_salida: String = conn
        .query_row(
            "SELECT fecha_movimiento FROM movimientos WHERE id = ?1",
            [movimiento_id],
            |r| r.get(0),
        )
        .unwrap_or_else(|_| "9999-12-31".to_string());
    let mut stmt = conn.prepare(
        "SELECT ml.producto_id, ml.lote_id, m.id, m.numero, m.sub_tipo, m.fecha_movimiento, ml.cantidad
         FROM movimiento_lineas origen_ml
         JOIN movimiento_lineas ml
           ON ml.producto_id = origen_ml.producto_id
          AND ((ml.lote_id IS NULL AND origen_ml.lote_id IS NULL) OR ml.lote_id = origen_ml.lote_id)
         JOIN movimientos m ON m.id = ml.movimiento_id
         WHERE origen_ml.movimiento_id = ?1
           AND m.tipo = 'ENTRADA' AND m.estado = 'APROBADO'
           AND m.fecha_movimiento <= ?2
         ORDER BY m.fecha_movimiento ASC
         LIMIT 100",
    )?;
    let rows = stmt
        .query_map(rusqlite::params![movimiento_id, fecha_salida], |r| {
            Ok(OrigenLinea {
                producto_id: r.get(0)?,
                lote_id: r.get(1)?,
                movimiento_origen_id: r.get(2)?,
                numero: r.get(3)?,
                sub_tipo: r.get(4)?,
                fecha_movimiento: r.get(5)?,
                cantidad: r.get(6)?,
            })
        })?
        .collect::<Result<Vec<_>, _>>()?;
    Ok(rows)
}

/// "¿Quién tocó el stock del producto Y en un rango de fechas?" → movimientos
/// (con su autor) que tienen al menos una línea de ese producto.
pub fn movimientos_de_producto_en_rango(
    conn: &Connection,
    producto_id: &str,
    desde: &str,
    hasta: &str,
    actor: &str,
) -> AppResult<Vec<Movimiento>> {
    puede(conn, Some(actor), "movimiento", "ver")?;
    let mut stmt = conn.prepare(
        "SELECT DISTINCT m.id, m.tipo, m.sub_tipo, m.numero, m.estado, m.fecha_movimiento, m.motivo,
                m.origen_ubicacion_id, m.destino_ubicacion_id, m.proveedor_id, m.cliente_id, m.sesion_inventario_id,
                m.documento_referencia, m.notas, m.movimiento_inverso_id, m.created_by, m.created_at,
                m.approved_by, m.approved_at, m.anulado_by, m.anulado_at
         FROM movimientos m
         JOIN movimiento_lineas ml ON ml.movimiento_id = m.id
         WHERE ml.producto_id = ?1 AND m.fecha_movimiento BETWEEN ?2 AND ?3
         ORDER BY m.fecha_movimiento DESC",
    )?;
    let rows = stmt
        .query_map(rusqlite::params![producto_id, desde, hasta], map_movimiento)?
        .collect::<Result<Vec<_>, _>>()?;
    Ok(rows)
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

/// "¿Cuánto vence en N días?" → lotes con vencimiento próximo (o ya vencido)
/// y su stock actual (SPEC §13.4, §17.1).
#[derive(Debug, Clone, serde::Serialize)]
pub struct LotePorVencer {
    pub lote_id: String,
    pub numero: String,
    pub producto_id: String,
    pub sku: String,
    pub fecha_vencimiento: String,
    pub cantidad: i64,
    pub vencido: bool,
}

pub fn lotes_por_vencer(
    conn: &Connection,
    dias: i64,
    actor: &str,
) -> AppResult<Vec<LotePorVencer>> {
    puede(conn, Some(actor), "lote", "ver")?;
    let hoy = ahora()[..10].to_string();
    let limite = fecha_mas_dias(&hoy, dias);
    let mut stmt = conn.prepare(
        "SELECT l.id, l.numero, l.producto_id, p.sku, l.fecha_vencimiento,
                COALESCE((SELECT SUM(cantidad) FROM saldos WHERE lote_id = l.id), 0)
         FROM lotes l JOIN productos p ON p.id = l.producto_id
         WHERE l.fecha_vencimiento IS NOT NULL AND l.fecha_vencimiento <= ?1
         ORDER BY l.fecha_vencimiento ASC",
    )?;
    let rows = stmt
        .query_map([&limite], |r| {
            let fecha_vencimiento: String = r.get(4)?;
            Ok(LotePorVencer {
                lote_id: r.get(0)?,
                numero: r.get(1)?,
                producto_id: r.get(2)?,
                sku: r.get(3)?,
                vencido: fecha_vencimiento.as_str() < hoy.as_str(),
                fecha_vencimiento,
                cantidad: r.get(5)?,
            })
        })?
        .filter(|r| {
            r.as_ref()
                .map(|l: &LotePorVencer| l.cantidad > 0)
                .unwrap_or(true)
        })
        .collect::<Result<Vec<_>, _>>()?;
    Ok(rows)
}

/// Un rango del reporte de vencimientos: cuántos lotes y unidades caen en él.
#[derive(Debug, Clone, serde::Serialize)]
pub struct BucketVencimiento {
    pub lotes: Vec<LotePorVencer>,
    pub total_lotes: i64,
    pub total_unidades: i64,
}

impl BucketVencimiento {
    fn de(lotes: Vec<LotePorVencer>) -> Self {
        let total_unidades = lotes.iter().map(|l| l.cantidad).sum();
        BucketVencimiento {
            total_lotes: lotes.len() as i64,
            total_unidades,
            lotes,
        }
    }
}

/// Reporte de vencimientos (SPEC §16.2): "próximos 30/60/90 días y vencidos,
/// por producto/lote/ubicación" en una sola llamada, en vez de que el
/// cliente tenga que invocar `lotes_por_vencer` tres veces con distintos
/// horizontes y deducir los rangos él mismo.
#[derive(Debug, Clone, serde::Serialize)]
pub struct VencimientosPorRango {
    pub vencidos: BucketVencimiento,
    pub proximos_30: BucketVencimiento,
    pub proximos_60: BucketVencimiento,
    pub proximos_90: BucketVencimiento,
}

pub fn vencimientos_por_rango(conn: &Connection, actor: &str) -> AppResult<VencimientosPorRango> {
    let todos = lotes_por_vencer(conn, 90, actor)?;
    let hoy = ahora()[..10].to_string();
    let limite_30 = fecha_mas_dias(&hoy, 30);
    let limite_60 = fecha_mas_dias(&hoy, 60);

    let mut vencidos = Vec::new();
    let mut proximos_30 = Vec::new();
    let mut proximos_60 = Vec::new();
    let mut proximos_90 = Vec::new();
    for lote in todos {
        if lote.vencido {
            vencidos.push(lote);
        } else if lote.fecha_vencimiento.as_str() <= limite_30.as_str() {
            proximos_30.push(lote);
        } else if lote.fecha_vencimiento.as_str() <= limite_60.as_str() {
            proximos_60.push(lote);
        } else {
            proximos_90.push(lote);
        }
    }

    Ok(VencimientosPorRango {
        vencidos: BucketVencimiento::de(vencidos),
        proximos_30: BucketVencimiento::de(proximos_30),
        proximos_60: BucketVencimiento::de(proximos_60),
        proximos_90: BucketVencimiento::de(proximos_90),
    })
}

/// Suma `dias` días a una fecha `YYYY-MM-DD` (aritmética simple, suficiente
/// para el horizonte de alertas de vencimiento).
pub(crate) fn fecha_mas_dias(fecha_iso: &str, dias: i64) -> String {
    use chrono::{Duration, NaiveDate};
    NaiveDate::parse_from_str(fecha_iso, "%Y-%m-%d")
        .map(|f| (f + Duration::days(dias)).format("%Y-%m-%d").to_string())
        .unwrap_or_else(|_| fecha_iso.to_string())
}

/// "¿Dónde estuvo la caja Z?" → historial de movimientos donde participó
/// como origen o destino.
#[derive(Debug, Clone, serde::Serialize)]
pub struct HistorialCaja {
    pub movimiento_id: String,
    pub numero: String,
    pub tipo: String,
    pub sub_tipo: String,
    pub fecha_movimiento: String,
    pub producto_id: String,
    pub cantidad: i64,
    pub rol: String, // "origen" | "destino"
}

pub fn historial_caja(
    conn: &Connection,
    caja_id: &str,
    actor: &str,
) -> AppResult<Vec<HistorialCaja>> {
    puede(conn, Some(actor), "caja", "ver")?;
    let mut stmt = conn.prepare(
        "SELECT m.id, m.numero, m.tipo, m.sub_tipo, m.fecha_movimiento, ml.producto_id, ml.cantidad,
                CASE WHEN ml.caja_origen_id = ?1 THEN 'origen' ELSE 'destino' END
         FROM movimiento_lineas ml
         JOIN movimientos m ON m.id = ml.movimiento_id
         WHERE ml.caja_origen_id = ?1 OR ml.caja_destino_id = ?1
         ORDER BY m.fecha_movimiento ASC",
    )?;
    let rows = stmt
        .query_map([caja_id], |r| {
            Ok(HistorialCaja {
                movimiento_id: r.get(0)?,
                numero: r.get(1)?,
                tipo: r.get(2)?,
                sub_tipo: r.get(3)?,
                fecha_movimiento: r.get(4)?,
                producto_id: r.get(5)?,
                cantidad: r.get(6)?,
                rol: r.get(7)?,
            })
        })?
        .collect::<Result<Vec<_>, _>>()?;
    Ok(rows)
}
