use rusqlite::Connection;

use crate::domain::seguridad::EventoAuditoria;
use crate::error::{AppError, AppResult};

/// Consulta el historial completo de actividad (SPEC §13.3, §16.2 auditoría).
/// Filtrable por usuario, comando, nivel y rango de fechas (ISO-8601).
pub fn listar_historial(
    conn: &Connection,
    usuario_id: Option<&str>,
    comando: Option<&str>,
    nivel: Option<&str>,
    desde: Option<&str>,
    hasta: Option<&str>,
    limit: i64,
) -> AppResult<Vec<EventoAuditoria>> {
    let limit = limit.clamp(1, 500);
    let mut stmt = conn.prepare(
        "SELECT id, usuario_id, accion, entidad, entidad_id, antes, despues, timestamp, origen,
                comando, duracion_ms, exito, nivel
         FROM auditoria
         WHERE (?1 IS NULL OR usuario_id = ?1)
           AND (?2 IS NULL OR comando = ?2)
           AND (?3 IS NULL OR nivel = ?3)
           AND (?4 IS NULL OR timestamp >= ?4)
           AND (?5 IS NULL OR timestamp <= ?5)
         ORDER BY timestamp DESC
         LIMIT ?6",
    )?;
    let rows = stmt
        .query_map(
            rusqlite::params![usuario_id, comando, nivel, desde, hasta, limit],
            map_evento,
        )?
        .collect::<Result<Vec<_>, _>>()?;
    Ok(rows)
}

/// Métricas agregadas del historial (SPEC §16.3).
pub fn metricas_historial(conn: &Connection) -> AppResult<MetricasHistorial> {
    let total: i64 = conn.query_row("SELECT COUNT(*) FROM auditoria", [], |r| r.get(0))?;
    let exitos: i64 =
        conn.query_row("SELECT COUNT(*) FROM auditoria WHERE exito = 1", [], |r| {
            r.get(0)
        })?;
    let errores = total - exitos;
    let duracion_promedio_ms: Option<f64> = conn.query_row(
        "SELECT AVG(duracion_ms) FROM auditoria WHERE duracion_ms IS NOT NULL",
        [],
        |r| r.get(0),
    )?;
    let por_comando: Vec<ComandoMetrica> = {
        let mut stmt = conn.prepare(
            "SELECT COALESCE(comando, accion) AS nombre, COUNT(*) AS total,
                    SUM(CASE WHEN exito = 1 THEN 1 ELSE 0 END) AS exitos,
                    SUM(CASE WHEN exito = 0 THEN 1 ELSE 0 END) AS errores,
                    AVG(duracion_ms) AS duracion_promedio_ms
             FROM auditoria
             GROUP BY nombre
             ORDER BY total DESC
             LIMIT 20",
        )?;
        stmt.query_map([], |r| {
            Ok(ComandoMetrica {
                nombre: r.get(0)?,
                total: r.get(1)?,
                exitos: r.get(2)?,
                errores: r.get(3)?,
                duracion_promedio_ms: r.get(4)?,
            })
        })?
        .collect::<Result<Vec<_>, _>>()?
    };
    let por_dia: Vec<DiaMetrica> = {
        let mut stmt = conn.prepare(
            "SELECT substr(timestamp, 1, 10) AS dia, COUNT(*) AS total
             FROM auditoria
             GROUP BY dia
             ORDER BY dia DESC
             LIMIT 30",
        )?;
        stmt.query_map([], |r| {
            Ok(DiaMetrica {
                dia: r.get(0)?,
                total: r.get(1)?,
            })
        })?
        .collect::<Result<Vec<_>, _>>()?
    };
    Ok(MetricasHistorial {
        total,
        exitos,
        errores,
        tasa_exito: if total > 0 {
            (exitos as f64 / total as f64) * 100.0
        } else {
            0.0
        },
        duracion_promedio_ms,
        por_comando,
        por_dia,
    })
}

#[derive(Debug, Clone, serde::Serialize)]
pub struct MetricasHistorial {
    pub total: i64,
    pub exitos: i64,
    pub errores: i64,
    pub tasa_exito: f64,
    pub duracion_promedio_ms: Option<f64>,
    pub por_comando: Vec<ComandoMetrica>,
    pub por_dia: Vec<DiaMetrica>,
}

#[derive(Debug, Clone, serde::Serialize)]
pub struct ComandoMetrica {
    pub nombre: String,
    pub total: i64,
    pub exitos: i64,
    pub errores: i64,
    pub duracion_promedio_ms: Option<f64>,
}

#[derive(Debug, Clone, serde::Serialize)]
pub struct DiaMetrica {
    pub dia: String,
    pub total: i64,
}

fn map_evento(r: &rusqlite::Row<'_>) -> rusqlite::Result<EventoAuditoria> {
    Ok(EventoAuditoria {
        id: r.get(0)?,
        usuario_id: r.get(1)?,
        accion: r.get(2)?,
        entidad: r.get(3)?,
        entidad_id: r.get(4)?,
        antes: r.get(5)?,
        despues: r.get(6)?,
        timestamp: r.get(7)?,
        origen: r.get(8)?,
        comando: r.get(9)?,
        duracion_ms: r.get(10)?,
        exito: r.get::<_, i64>(11)? != 0,
        nivel: r.get(12)?,
    })
}

/// Registra en el historial la invocación de un comando de escritura con sus
/// métricas (hora/fecha, comando, duración, éxito, nivel). Usado por los
/// comandos Tauri de mutación (SPEC §4.5, §13).
pub fn registrar_invocacion(
    conn: &Connection,
    usuario_id: Option<&str>,
    comando: &str,
    duracion_ms: i64,
    exito: bool,
    origen: Option<&str>,
) -> AppResult<()> {
    crate::domain::seguridad::EventoAuditoria::registrar_con_metricas(
        conn,
        usuario_id,
        "invoke",
        "comando",
        None,
        None,
        None,
        origen,
        Some(comando),
        Some(duracion_ms),
        exito,
        nivel_comando(comando),
    )
}

/// Clasifica un comando Tauri en nivel de acceso (para la columna `nivel`).
pub fn nivel_comando(comando: &str) -> &'static str {
    if comando.starts_with("crear_")
        || comando.starts_with("editar_")
        || comando.starts_with("eliminar_")
        || comando.starts_with("aprobar_")
        || comando.starts_with("anular_")
        || comando.starts_with("desactivar_")
        || comando.starts_with("enviar_")
        || comando.starts_with("registrar_")
        || comando.starts_with("cerrar_")
        || comando.starts_with("bootstrap_")
    {
        "ESCRITURA"
    } else {
        "LECTURA"
    }
}

/// Extrae el id de usuario del payload del comando (campo `created_by` o `by`).
#[allow(dead_code)]
pub fn usuario_de_payload(serde_value: &serde_json::Value) -> Option<String> {
    for key in ["created_by", "by", "usuario_id"] {
        if let Some(v) = serde_value.get(key).and_then(|v| v.as_str()) {
            return Some(v.to_string());
        }
    }
    None
}

/// Convierte AppError a texto para el campo `despues`/error de auditoría.
#[allow(dead_code)]
pub fn error_a_texto(e: &AppError) -> String {
    e.to_string()
}
