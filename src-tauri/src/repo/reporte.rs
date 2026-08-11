//! Métricas, dashboard y KPIs (SPEC §16). El estándar de consulta universal
//! (§15) ya cubre la mayoría de los reportes tabulares de §16.2 (stock
//! actual, movimientos/entradas/salidas por periodo) contra los esquemas de
//! `query.rs`; aquí solo viven los cálculos que ese motor genérico no puede
//! expresar directamente: el resumen del dashboard, el kardex con saldo
//! acumulado y un par de KPIs agregados de negocio.

use rusqlite::{Connection, OptionalExtension};
use serde::Serialize;

use crate::domain::ahora;
use crate::error::AppResult;

/// Indicadores de cabecera del dashboard (SPEC §16.1).
#[derive(Debug, Clone, Serialize)]
pub struct DashboardResumen {
    pub total_skus_activos: i64,
    pub total_unidades: i64,
    pub alertas_activas: i64,
    pub precision_sku_ultima_sesion: Option<f64>,
    pub movimientos_hoy: i64,
    pub ubicaciones_con_stock: i64,
    pub ubicaciones_totales: i64,
    pub ocupacion_pct: f64,
}

pub fn dashboard(conn: &Connection) -> AppResult<DashboardResumen> {
    let total_skus_activos: i64 =
        conn.query_row("SELECT COUNT(*) FROM productos WHERE activo = 1", [], |r| {
            r.get(0)
        })?;
    let total_unidades: i64 =
        conn.query_row("SELECT COALESCE(SUM(cantidad), 0) FROM saldos", [], |r| {
            r.get(0)
        })?;
    let alertas_activas: i64 = conn.query_row(
        "SELECT COUNT(*) FROM alertas WHERE estado = 'ABIERTA'",
        [],
        |r| r.get(0),
    )?;

    let ultima_sesion: Option<String> = conn
        .query_row(
            "SELECT id FROM sesiones_inventario WHERE estado = 'CERRADA' ORDER BY closed_at DESC LIMIT 1",
            [],
            |r| r.get(0),
        )
        .optional()?;
    let precision_sku_ultima_sesion = match &ultima_sesion {
        Some(id) => Some(crate::repo::inventario::precision_sesion(conn, id)?.precision_sku),
        None => None,
    };

    let hoy = ahora()[..10].to_string();
    let movimientos_hoy: i64 = conn.query_row(
        "SELECT COUNT(*) FROM movimientos WHERE substr(fecha_movimiento, 1, 10) = ?1",
        [&hoy],
        |r| r.get(0),
    )?;

    let ubicaciones_totales: i64 = conn.query_row(
        "SELECT COUNT(*) FROM ubicaciones WHERE activo = 1",
        [],
        |r| r.get(0),
    )?;
    let ubicaciones_con_stock: i64 = conn.query_row(
        "SELECT COUNT(DISTINCT ubicacion_id) FROM saldos WHERE cantidad > 0",
        [],
        |r| r.get(0),
    )?;
    let ocupacion_pct = if ubicaciones_totales > 0 {
        (ubicaciones_con_stock as f64 / ubicaciones_totales as f64) * 100.0
    } else {
        0.0
    };

    Ok(DashboardResumen {
        total_skus_activos,
        total_unidades,
        alertas_activas,
        precision_sku_ultima_sesion,
        movimientos_hoy,
        ubicaciones_con_stock,
        ubicaciones_totales,
        ocupacion_pct,
    })
}

/// KPIs agregados de negocio (SPEC §16.3) que no son un simple resumen del
/// dashboard: tasa de merma y lotes vencidos aún con saldo (deberían tender
/// a 0 según el SPEC).
#[derive(Debug, Clone, Serialize)]
pub struct KpisGenerales {
    pub tasa_merma_pct: f64,
    pub lotes_vencidos_sin_dar_de_baja: i64,
}

pub fn kpis_generales(conn: &Connection) -> AppResult<KpisGenerales> {
    let unidades_merma: i64 = conn.query_row(
        "SELECT COALESCE(SUM(ml.cantidad), 0) FROM movimiento_lineas ml
         JOIN movimientos m ON m.id = ml.movimiento_id
         WHERE m.sub_tipo = 'MERMA' AND m.estado = 'APROBADO'",
        [],
        |r| r.get(0),
    )?;
    let unidades_entrada: i64 = conn.query_row(
        "SELECT COALESCE(SUM(ml.cantidad), 0) FROM movimiento_lineas ml
         JOIN movimientos m ON m.id = ml.movimiento_id
         WHERE m.tipo = 'ENTRADA' AND m.estado = 'APROBADO'",
        [],
        |r| r.get(0),
    )?;
    let tasa_merma_pct = if unidades_entrada > 0 {
        (unidades_merma as f64 / unidades_entrada as f64) * 100.0
    } else {
        0.0
    };

    let hoy = ahora()[..10].to_string();
    let lotes_vencidos_sin_dar_de_baja: i64 = conn.query_row(
        "SELECT COUNT(*) FROM lotes l
         WHERE l.fecha_vencimiento IS NOT NULL AND l.fecha_vencimiento < ?1
           AND (SELECT COALESCE(SUM(cantidad), 0) FROM saldos WHERE lote_id = l.id) > 0",
        [&hoy],
        |r| r.get(0),
    )?;

    Ok(KpisGenerales {
        tasa_merma_pct,
        lotes_vencidos_sin_dar_de_baja,
    })
}

/// Línea de kardex (SPEC §16.2: "todos los movimientos con saldo acumulado").
/// Es un kardex global del producto (todas las ubicaciones): un traslado
/// aporta su lado de salida y de entrada en la misma línea, netos entre sí.
#[derive(Debug, Clone, Serialize)]
pub struct KardexLinea {
    pub movimiento_id: String,
    pub numero: String,
    pub tipo: String,
    pub sub_tipo: String,
    pub fecha_movimiento: String,
    pub entrada: i64,
    pub salida: i64,
    pub saldo_acumulado: i64,
}

pub fn kardex_producto(
    conn: &Connection,
    producto_id: &str,
    lote_id: Option<&str>,
) -> AppResult<Vec<KardexLinea>> {
    let mut sql = String::from(
        "SELECT m.id, m.numero, m.tipo, m.sub_tipo, m.fecha_movimiento, ml.origen_ubicacion_id, ml.destino_ubicacion_id, ml.cantidad
         FROM movimiento_lineas ml JOIN movimientos m ON m.id = ml.movimiento_id
         WHERE ml.producto_id = ?1 AND m.estado = 'APROBADO'",
    );
    let mut binds: Vec<rusqlite::types::Value> = vec![producto_id.to_string().into()];
    if let Some(l) = lote_id {
        sql.push_str(" AND ml.lote_id = ?2");
        binds.push(l.to_string().into());
    }
    sql.push_str(" ORDER BY m.fecha_movimiento ASC, m.created_at ASC");

    let mut stmt = conn.prepare(&sql)?;
    #[allow(clippy::type_complexity)]
    let filas: Vec<(
        String,
        String,
        String,
        String,
        String,
        Option<String>,
        Option<String>,
        i64,
    )> = stmt
        .query_map(rusqlite::params_from_iter(binds.iter()), |r| {
            Ok((
                r.get(0)?,
                r.get(1)?,
                r.get(2)?,
                r.get(3)?,
                r.get(4)?,
                r.get(5)?,
                r.get(6)?,
                r.get(7)?,
            ))
        })?
        .collect::<Result<_, _>>()?;

    let mut acumulado = 0i64;
    let mut resultado = Vec::with_capacity(filas.len());
    for (id, numero, tipo, sub_tipo, fecha_movimiento, origen, destino, cantidad) in filas {
        let entrada = if destino.is_some() { cantidad } else { 0 };
        let salida = if origen.is_some() { cantidad } else { 0 };
        acumulado += entrada - salida;
        resultado.push(KardexLinea {
            movimiento_id: id,
            numero,
            tipo,
            sub_tipo,
            fecha_movimiento,
            entrada,
            salida,
            saldo_acumulado: acumulado,
        });
    }
    Ok(resultado)
}
