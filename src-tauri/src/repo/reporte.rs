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

/// Desglose de movimientos de hoy por tipo (SPEC §16.1: "entradas/salidas/
/// traslados/ajustes").
#[derive(Debug, Clone, Default, Serialize)]
pub struct MovimientosHoyPorTipo {
    pub entradas: i64,
    pub salidas: i64,
    pub traslados: i64,
    pub ajustes: i64,
}

/// Indicadores de cabecera del dashboard (SPEC §16.1).
#[derive(Debug, Clone, Serialize)]
pub struct DashboardResumen {
    pub total_skus_activos: i64,
    pub total_unidades: i64,
    /// Costo de entrada acumulado: `SUM(saldos.cantidad * productos.costo_unitario)`
    /// (SPEC §16.1: "costo promedio o costo de entrada, configurable" — v1 usa
    /// el costo unitario ya mantenido por producto, actualizado a promedio
    /// móvil en cada entrada aprobada, ver `actualizar_costo_producto`).
    /// Los productos sin `costo_unitario` capturado aportan 0 (no se estima).
    pub valor_inventario: f64,
    pub alertas_activas: i64,
    pub precision_sku_ultima_sesion: Option<f64>,
    pub movimientos_hoy: i64,
    pub movimientos_hoy_por_tipo: MovimientosHoyPorTipo,
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
    let valor_inventario: f64 = conn.query_row(
        "SELECT COALESCE(SUM(s.cantidad * COALESCE(p.costo_unitario, 0)), 0)
         FROM saldos s JOIN productos p ON p.id = s.producto_id",
        [],
        |r| r.get(0),
    )?;
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
    let movimientos_hoy_por_tipo = {
        let mut stmt = conn.prepare(
            "SELECT tipo, COUNT(*) FROM movimientos
             WHERE substr(fecha_movimiento, 1, 10) = ?1
             GROUP BY tipo",
        )?;
        let filas = stmt
            .query_map([&hoy], |r| {
                Ok((r.get::<_, String>(0)?, r.get::<_, i64>(1)?))
            })?
            .collect::<Result<Vec<_>, _>>()?;
        let mut desglose = MovimientosHoyPorTipo::default();
        for (tipo, n) in filas {
            match tipo.as_str() {
                "ENTRADA" => desglose.entradas = n,
                "SALIDA" => desglose.salidas = n,
                "TRASLADO" => desglose.traslados = n,
                "AJUSTE" => desglose.ajustes = n,
                _ => {}
            }
        }
        desglose
    };

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
        valor_inventario,
        alertas_activas,
        precision_sku_ultima_sesion,
        movimientos_hoy,
        movimientos_hoy_por_tipo,
        ubicaciones_con_stock,
        ubicaciones_totales,
        ocupacion_pct,
    })
}

/// KPIs agregados de negocio (SPEC §16.3), los 8 definidos:
/// 1-3. precisión SKU/cantidad/ubicación: de la última sesión cerrada (misma
///    fuente que el dashboard, §16.1).
/// 4-5. rotación de stock y días de cobertura: sobre una ventana móvil de 30
///    días de salidas aprobadas — el SPEC no fija la ventana ("informativo"),
///    30 días es el horizonte estándar de rotación de inventario.
/// 6. tasa de merma.
/// 7. lotes vencidos sin dar de baja.
/// 8. antigüedad del stock: días desde la última entrada aprobada, promedio
///    ponderado por unidades en saldo, por lote.
#[derive(Debug, Clone, Serialize)]
pub struct KpisGenerales {
    pub precision_sku_ultima_sesion: Option<f64>,
    pub precision_cantidad_ultima_sesion: Option<f64>,
    pub exactitud_ubicacion_ultima_sesion: Option<f64>,
    /// Salidas aprobadas de los últimos 30 días ÷ stock actual (proxy de
    /// "stock promedio" — no se mantienen snapshots históricos de saldo).
    pub rotacion_stock_30d: f64,
    /// `None` si no hubo salidas en los últimos 30 días (consumo diario = 0,
    /// cobertura indefinida en vez de división por cero).
    pub dias_cobertura: Option<f64>,
    pub tasa_merma_pct: f64,
    pub lotes_vencidos_sin_dar_de_baja: i64,
    /// `None` si no hay saldo (nada que envejecer).
    pub antiguedad_stock_dias: Option<f64>,
}

pub fn kpis_generales(conn: &Connection) -> AppResult<KpisGenerales> {
    let ultima_sesion: Option<String> = conn
        .query_row(
            "SELECT id FROM sesiones_inventario WHERE estado = 'CERRADA' ORDER BY closed_at DESC LIMIT 1",
            [],
            |r| r.get(0),
        )
        .optional()?;
    let (
        precision_sku_ultima_sesion,
        precision_cantidad_ultima_sesion,
        exactitud_ubicacion_ultima_sesion,
    ) = match &ultima_sesion {
        Some(id) => {
            let p = crate::repo::inventario::precision_sesion(conn, id)?;
            (
                Some(p.precision_sku),
                Some(p.precision_cantidad),
                Some(p.exactitud_ubicacion),
            )
        }
        None => (None, None, None),
    };

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

    let unidades_salida_30d: i64 = conn.query_row(
        "SELECT COALESCE(SUM(ml.cantidad), 0) FROM movimiento_lineas ml
         JOIN movimientos m ON m.id = ml.movimiento_id
         WHERE m.tipo = 'SALIDA' AND m.estado = 'APROBADO'
           AND julianday(?1) - julianday(substr(m.fecha_movimiento, 1, 10)) <= 30
           AND julianday(?1) - julianday(substr(m.fecha_movimiento, 1, 10)) >= 0",
        [&hoy],
        |r| r.get(0),
    )?;
    let stock_actual: i64 =
        conn.query_row("SELECT COALESCE(SUM(cantidad), 0) FROM saldos", [], |r| {
            r.get(0)
        })?;
    let rotacion_stock_30d = if stock_actual > 0 {
        unidades_salida_30d as f64 / stock_actual as f64
    } else {
        0.0
    };
    let consumo_diario_promedio = unidades_salida_30d as f64 / 30.0;
    let dias_cobertura = if consumo_diario_promedio > 0.0 {
        Some(stock_actual as f64 / consumo_diario_promedio)
    } else {
        None
    };

    // Antigüedad: para cada lote con saldo > 0, días desde su última entrada
    // aprobada; promedio ponderado por las unidades en saldo de ese lote.
    // Para stock sin lote (producto no controla_lote), se usa la última
    // entrada aprobada de ese producto hacia esa ubicación como proxy.
    let antiguedad_stock_dias: Option<f64> = {
        let mut stmt = conn.prepare(
            "SELECT s.cantidad,
                    (SELECT MAX(m.fecha_movimiento) FROM movimientos m
                     JOIN movimiento_lineas ml ON ml.movimiento_id = m.id
                     WHERE m.tipo = 'ENTRADA' AND m.estado = 'APROBADO'
                       AND ml.producto_id = s.producto_id
                       AND (s.lote_key = '' OR ml.lote_id = s.lote_id)) AS ultima_entrada
             FROM saldos s
             WHERE s.cantidad > 0",
        )?;
        let filas: Vec<(i64, Option<String>)> = stmt
            .query_map([], |r| Ok((r.get(0)?, r.get(1)?)))?
            .collect::<Result<Vec<_>, _>>()?;
        let mut unidades_total = 0.0;
        let mut dias_ponderados = 0.0;
        for (cantidad, ultima_entrada) in filas {
            let Some(fecha) = ultima_entrada else {
                continue;
            };
            let dias: f64 = conn.query_row(
                "SELECT julianday(?1) - julianday(substr(?2, 1, 10))",
                [&hoy, &fecha],
                |r| r.get(0),
            )?;
            let dias = dias.max(0.0);
            unidades_total += cantidad as f64;
            dias_ponderados += dias * cantidad as f64;
        }
        if unidades_total > 0.0 {
            Some(dias_ponderados / unidades_total)
        } else {
            None
        }
    };

    Ok(KpisGenerales {
        precision_sku_ultima_sesion,
        precision_cantidad_ultima_sesion,
        exactitud_ubicacion_ultima_sesion,
        rotacion_stock_30d,
        dias_cobertura,
        tasa_merma_pct,
        lotes_vencidos_sin_dar_de_baja,
        antiguedad_stock_dias,
    })
}

/// Actividad de un usuario en el periodo (SPEC §16.2: "desempeño de
/// usuarios — Nº de movimientos por usuario/periodo").
#[derive(Debug, Clone, serde::Serialize)]
pub struct DesempenoUsuario {
    pub usuario_id: String,
    pub nombre_usuario: String,
    pub nombre_completo: String,
    pub total_movimientos: i64,
    pub entradas: i64,
    pub salidas: i64,
    pub traslados: i64,
    pub ajustes: i64,
    pub aprobados: i64,
    pub anulados: i64,
}

/// Reporte de desempeño de usuarios (SPEC §16.2): movimientos creados por
/// usuario, desglosados por tipo y por resultado (aprobado/anulado), en un
/// rango de fechas opcional (`desde`/`hasta`, sobre `created_at`).
pub fn desempeno_usuarios(
    conn: &Connection,
    desde: Option<&str>,
    hasta: Option<&str>,
) -> AppResult<Vec<DesempenoUsuario>> {
    let mut sql = String::from(
        "SELECT u.id, u.nombre_usuario, u.nombre_completo,
                COUNT(*) AS total,
                SUM(CASE WHEN m.tipo = 'ENTRADA' THEN 1 ELSE 0 END) AS entradas,
                SUM(CASE WHEN m.tipo = 'SALIDA' THEN 1 ELSE 0 END) AS salidas,
                SUM(CASE WHEN m.tipo = 'TRASLADO' THEN 1 ELSE 0 END) AS traslados,
                SUM(CASE WHEN m.tipo = 'AJUSTE' THEN 1 ELSE 0 END) AS ajustes,
                SUM(CASE WHEN m.estado = 'APROBADO' THEN 1 ELSE 0 END) AS aprobados,
                SUM(CASE WHEN m.estado = 'ANULADO' THEN 1 ELSE 0 END) AS anulados
         FROM movimientos m JOIN usuarios u ON (u.id = m.created_by OR u.nombre_usuario = m.created_by)
         WHERE 1=1",
    );
    let mut binds: Vec<rusqlite::types::Value> = Vec::new();
    if let Some(d) = desde {
        sql.push_str(" AND substr(m.created_at, 1, 10) >= ?");
        binds.push(d.to_string().into());
    }
    if let Some(h) = hasta {
        sql.push_str(" AND substr(m.created_at, 1, 10) <= ?");
        binds.push(h.to_string().into());
    }
    sql.push_str(" GROUP BY u.id, u.nombre_usuario, u.nombre_completo ORDER BY total DESC");

    let mut stmt = conn.prepare(&sql)?;
    let rows = stmt
        .query_map(rusqlite::params_from_iter(binds.iter()), |r| {
            Ok(DesempenoUsuario {
                usuario_id: r.get(0)?,
                nombre_usuario: r.get(1)?,
                nombre_completo: r.get(2)?,
                total_movimientos: r.get(3)?,
                entradas: r.get(4)?,
                salidas: r.get(5)?,
                traslados: r.get(6)?,
                ajustes: r.get(7)?,
                aprobados: r.get(8)?,
                anulados: r.get(9)?,
            })
        })?
        .collect::<Result<Vec<_>, _>>()?;
    Ok(rows)
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
