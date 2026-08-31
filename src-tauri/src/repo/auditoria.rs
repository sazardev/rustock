use rusqlite::Connection;

use crate::domain::Paginado;
use crate::domain::seguridad::{EventoAuditoria, RegistrarVista};
use crate::error::{AppError, AppResult};

// ============ Tracking total (Hito 25) ============

/// Nombre de la empresa (tenant) para el snapshot del evento. Es una sola
/// fila (`configuracion_empresa.id = 'default'`); si no hay nombre todavía
/// (instalación recién creada), el tenant queda `None`.
pub fn tenant_actual(conn: &Connection) -> AppResult<Option<String>> {
    Ok(conn.query_row(
        "SELECT nombre FROM configuracion_empresa WHERE id = 'default'",
        [],
        |r| r.get(0),
    )?)
}

/// Clasifica un comando backend en módulo de la aplicación (para análisis
/// por módulo). Agrupa por recurso, no por verbo.
pub fn modulo_de_comando(comando: &str) -> Option<&'static str> {
    let m = match comando {
        "login" | "logout" | "quien_soy" | "bootstrap_admin" => "Sesión",
        "puedo" => "Permisos",
        "buscar" => "Búsqueda",
        _ if comando.starts_with("listar_historial")
            || comando.starts_with("metricas_historial")
            || comando.starts_with("metricas_actividad") =>
        {
            "Historial"
        }
        _ if comando.starts_with("obtener_dashboard")
            || comando.starts_with("obtener_kpis")
            || comando.starts_with("kardex") =>
        {
            "Dashboard"
        }
        _ if comando.contains("_almacen")
            || comando.contains("_zona")
            || comando.contains("_rack")
            || comando.contains("_seccion") =>
        {
            "Almacenes"
        }
        _ if comando.contains("_ubicacion") || comando.contains("_caja") => "Ubicaciones",
        _ if comando.contains("_producto") || comando.contains("_lote") => "Productos",
        _ if comando.contains("_categoria") => "Categorías",
        _ if comando.contains("_uom") => "Unidades de medida",
        _ if comando.contains("_proveedor") => "Proveedores",
        _ if comando.contains("_cliente") => "Clientes",
        _ if comando.contains("_usuario")
            || comando.contains("_rol")
            || comando.contains("_password") =>
        {
            "Usuarios"
        }
        _ if comando.contains("_configuracion")
            || comando.contains("_preferencias")
            || comando.contains("_tema")
            || comando.contains("_archivo") =>
        {
            "Configuración"
        }
        _ if comando.contains("_sucursal") => "Sucursales",
        _ if comando.contains("_movimiento")
            || comando.contains("_linea")
            || comando.contains("_traslado")
            || comando.contains("_saldo")
            || comando.contains("_sugerir")
            || comando.contains("_entrada")
            || comando.contains("_salida")
            || comando.contains("_ajuste") =>
        {
            "Movimientos"
        }
        _ if comando.contains("_sesion")
            || comando.contains("_conteo")
            || comando.contains("_inventario")
            || comando.contains("_precision") =>
        {
            "Inventario físico"
        }
        _ if comando.contains("_comentario") => "Comentarios",
        _ if comando.contains("_alerta") => "Alertas",
        _ if comando.contains("_lote") => "Lotes",
        _ if comando.starts_with("donde_esta_")
            || comando.starts_with("origen_de_")
            || comando.starts_with("movimientos_de_producto")
            || comando.starts_with("lotes_por_vencer")
            || comando.starts_with("historial_caja") =>
        {
            "Trazabilidad"
        }
        _ => "Otros",
    };
    Some(m)
}

/// Proceso de negocio asociado a un comando backend (SPEC §18). Los flujos
/// de extremo a extremo dejan huella procesable para el análisis predictivo.
pub fn proceso_de_comando(comando: &str) -> Option<&'static str> {
    let p = match comando {
        "login" | "logout" | "quien_soy" | "bootstrap_admin" => "sesión",
        _ if comando.starts_with("crear_movimiento")
            || comando.starts_with("editar_movimiento")
            || comando.starts_with("enviar_a_aprobacion")
            || comando.starts_with("aprobar_movimiento")
            || comando.starts_with("anular_movimiento") =>
        {
            "gestión de movimientos"
        }
        _ if comando.starts_with("crear_traslado") => "traslado de mercancía",
        _ if comando.starts_with("crear_sesion")
            || comando.starts_with("iniciar_sesion")
            || comando.starts_with("registrar_conteo")
            || comando.starts_with("cerrar_sesion")
            || comando.starts_with("diferencias_sesion") =>
        {
            "inventario físico"
        }
        _ if comando.starts_with("crear_comentario")
            || comando.starts_with("editar_comentario")
            || comando.starts_with("ocultar_comentario") =>
        {
            "comentarios"
        }
        _ if comando.starts_with("registrar_") => "registro de datos",
        _ if comando.starts_with("bootstrap_") => "puesta en marcha",
        _ => return None,
    };
    Some(p)
}

// ============ Registro de eventos ============

/// Registra la invocación de un comando backend con el tracking total:
/// módulo derivado, proceso derivado y snapshot del tenant (SPEC §4.5, §13).
pub fn registrar_invocacion(
    conn: &Connection,
    usuario_id: Option<&str>,
    comando: &str,
    duracion_ms: i64,
    exito: bool,
    origen: Option<&str>,
    desde: Option<&crate::domain::seguridad::Desde>,
) -> AppResult<()> {
    let tenant = tenant_actual(conn)?;
    EventoAuditoria::registrar_detallado(
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
        "COMANDO",
        None,
        modulo_de_comando(comando),
        proceso_de_comando(comando),
        None,
        tenant.as_deref(),
        None,
        None,
        None,
        desde,
    )
}

/// Registra la visita del frontend a una página (tracking de navegación).
/// `usuario_id` lo resuelve el comando desde la sesión; el resto lo envía la
/// UI (ruta, módulo, duración, tiempo local, metadatos de cliente).
pub fn registrar_vista(
    conn: &Connection,
    usuario_id: &str,
    vista: &RegistrarVista,
    desde: Option<&crate::domain::seguridad::Desde>,
) -> AppResult<()> {
    let tenant = tenant_actual(conn)?;
    // Los metadatos del evento combinan lo que envía la UI con la info de
    // cliente (navegador, plataforma, pantalla) en un solo JSON.
    let metadatos = match (&vista.metadatos, &vista.cliente_info) {
        (Some(m), Some(c)) => {
            let mut obj = m.clone();
            if let Some(objeto) = obj.as_object_mut() {
                objeto.insert("cliente".into(), c.clone());
            }
            Some(obj.to_string())
        }
        (Some(m), None) => Some(m.to_string()),
        (None, Some(c)) => Some(c.to_string()),
        (None, None) => None,
    };
    EventoAuditoria::registrar_detallado(
        conn,
        Some(usuario_id),
        "navegar",
        "pagina",
        Some(&vista.ruta),
        None,
        Some(&vista.ruta),
        None,
        None,
        None,
        true,
        "LECTURA",
        "VISTA",
        Some(&vista.ruta),
        Some(&vista.modulo),
        vista.proceso.as_deref(),
        metadatos.as_deref(),
        tenant.as_deref(),
        vista.duracion_vista_ms,
        vista.hora_local,
        vista.dia_semana,
        desde,
    )
}

// ============ Consulta (SPEC §15) ============

/// Consulta el historial completo de actividad con paginación y filtros
/// combinables (usuario, comando, nivel, tipo de evento, módulo, ruta,
/// proceso, resultado y rango de fechas). Cumple el estándar universal de
/// consulta (SPEC §15): filtrable, ordenable (por fecha desc) y paginable.
#[allow(clippy::too_many_arguments)]
pub fn listar_historial(
    conn: &Connection,
    usuario_id: Option<&str>,
    comando: Option<&str>,
    nivel: Option<&str>,
    tipo_evento: Option<&str>,
    modulo: Option<&str>,
    ruta: Option<&str>,
    proceso: Option<&str>,
    exito: Option<bool>,
    desde: Option<&str>,
    hasta: Option<&str>,
    sesion_id: Option<&str>,
    ip: Option<&str>,
    origen: Option<&str>,
    page: i64,
    page_size: i64,
) -> AppResult<Paginado<EventoAuditoria>> {
    let page = page.max(1);
    let page_size = if page_size == -1 {
        -1
    } else {
        page_size.clamp(1, 200)
    };
    let (offset, limit) = if page_size == -1 {
        (0, 5000) // tope de seguridad para exportaciones (SPEC §15.2)
    } else {
        ((page - 1) * page_size, page_size)
    };

    let mut where_clauses = Vec::new();
    let mut params: Vec<rusqlite::types::Value> = Vec::new();
    macro_rules! cond_eq {
        ($campo:expr, $valor:expr) => {
            if let Some(v) = $valor {
                where_clauses.push(format!("{} = ?{}", $campo, params.len() + 1));
                params.push(v.to_string().into());
            }
        };
    }
    cond_eq!("usuario_id", usuario_id);
    cond_eq!("comando", comando);
    cond_eq!("nivel", nivel);
    cond_eq!("tipo_evento", tipo_evento);
    cond_eq!("modulo", modulo);
    cond_eq!("ruta", ruta);
    cond_eq!("proceso", proceso);
    // Las tres preguntas de una investigación: «reconstruye esta visita»,
    // «¿quién entró desde esta IP?» y «¿esto vino de la ventana o del navegador?».
    cond_eq!("sesion_id", sesion_id);
    cond_eq!("ip", ip);
    cond_eq!("origen", origen);
    if let Some(e) = exito {
        where_clauses.push(format!("exito = ?{}", params.len() + 1));
        params.push((if e { 1 } else { 0 }).into());
    }
    if let Some(d) = desde {
        where_clauses.push(format!("timestamp >= ?{}", params.len() + 1));
        params.push(d.to_string().into());
    }
    if let Some(h) = hasta {
        where_clauses.push(format!("timestamp <= ?{}", params.len() + 1));
        params.push(h.to_string().into());
    }
    let where_sql = if where_clauses.is_empty() {
        String::new()
    } else {
        format!(" WHERE {}", where_clauses.join(" AND "))
    };

    let total: i64 = conn.query_row(
        &format!("SELECT COUNT(*) FROM auditoria{where_sql}"),
        rusqlite::params_from_iter(params.iter()),
        |r| r.get(0),
    )?;

    let mut stmt = conn.prepare(&format!(
        "SELECT id, usuario_id, accion, entidad, entidad_id, antes, despues, timestamp,
                origen, comando, duracion_ms, exito, nivel, tipo_evento, ruta, modulo,
                proceso, metadatos, tenant, duracion_vista_ms, hora_local, dia_semana,
                sesion_id, ip, agente
         FROM auditoria{where_sql}
         ORDER BY timestamp DESC, id DESC
         LIMIT ?{} OFFSET ?{}",
        params.len() + 1,
        params.len() + 2
    ))?;
    let mut all_params: Vec<rusqlite::types::Value> = params;
    all_params.push(limit.into());
    all_params.push(offset.into());
    let rows = stmt
        .query_map(rusqlite::params_from_iter(all_params.iter()), map_evento)?
        .collect::<Result<Vec<_>, _>>()?;
    Ok(Paginado::new(rows, total, page, page_size))
}

/// Métricas agregadas del historial de comandos (SPEC §16.3): totales,
/// tasa de éxito y top por comando/día. Se mantiene para compatibilidad con
/// el reporte de auditoría; el análisis profundo vive en `metricas_actividad`.
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
             WHERE tipo_evento = 'COMANDO'
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

// ============ Análisis profundo de actividad (Hito 25) ============

/// Métricas del centro de actividad: resumen + desgloses por módulo, día,
/// hora, día de la semana, usuario, proceso y ruta, más insights automáticos
/// ("predictivo e inteligente") derivados de los propios datos.
#[derive(Debug, Clone, serde::Serialize)]
pub struct MetricasActividad {
    /// Rango efectivo del análisis (ISO-8601, por defecto últimos 30 días).
    pub desde: Option<String>,
    pub hasta: Option<String>,
    pub resumen: ResumenActividad,
    pub por_modulo: Vec<ModuloActividad>,
    pub por_dia: Vec<DiaActividad>,
    pub por_hora: Vec<HoraActividad>,
    pub por_dia_semana: Vec<DiaSemanaActividad>,
    pub por_usuario: Vec<UsuarioActividad>,
    pub por_proceso: Vec<ProcesoActividad>,
    pub top_rutas: Vec<RutaActividad>,
    pub insights: Vec<InsightActividad>,
}

#[derive(Debug, Clone, serde::Serialize)]
pub struct ResumenActividad {
    pub total_eventos: i64,
    pub total_vistas: i64,
    pub total_operaciones: i64,
    pub escrituras: i64,
    pub lecturas: i64,
    pub exitos: i64,
    pub errores: i64,
    pub tasa_exito: f64,
    pub usuarios_activos: i64,
    pub duracion_vista_promedio_ms: Option<f64>,
}

#[derive(Debug, Clone, serde::Serialize)]
pub struct ModuloActividad {
    pub modulo: String,
    pub vistas: i64,
    pub operaciones: i64,
    pub duracion_vista_ms: i64,
}

#[derive(Debug, Clone, serde::Serialize)]
pub struct DiaActividad {
    pub dia: String,
    pub vistas: i64,
    pub operaciones: i64,
}

#[derive(Debug, Clone, serde::Serialize)]
pub struct HoraActividad {
    pub hora: i64,
    pub vistas: i64,
    pub operaciones: i64,
}

#[derive(Debug, Clone, serde::Serialize)]
pub struct DiaSemanaActividad {
    pub dia_semana: i64,
    pub vistas: i64,
    pub operaciones: i64,
}

#[derive(Debug, Clone, serde::Serialize)]
pub struct UsuarioActividad {
    pub usuario_id: Option<String>,
    pub vistas: i64,
    pub operaciones: i64,
    pub duracion_vista_ms: i64,
}

#[derive(Debug, Clone, serde::Serialize)]
pub struct ProcesoActividad {
    pub proceso: String,
    pub total: i64,
}

#[derive(Debug, Clone, serde::Serialize)]
pub struct RutaActividad {
    pub ruta: String,
    pub modulo: String,
    pub vistas: i64,
    pub duracion_vista_ms: i64,
}

#[derive(Debug, Clone, serde::Serialize)]
pub struct InsightActividad {
    pub titulo: String,
    pub detalle: String,
    pub icono: &'static str,
}

/// Análisis de actividad para el centro de historial (Hito 25): resumen,
/// desgloses por módulo/día/hora/usuario/proceso/ruta e insights automáticos.
/// `desde`/`hasta` (ISO-8601) acotan el periodo; por defecto últimos 30 días.
pub fn metricas_actividad(
    conn: &Connection,
    desde: Option<&str>,
    hasta: Option<&str>,
    usuario_id: Option<&str>,
) -> AppResult<MetricasActividad> {
    // Rango por defecto: últimos 30 días desde hoy (UTC) si no se acota.
    let (desde_efectivo, hasta_efectivo) = (desde, hasta);
    let mut cond = String::new();
    let mut params: Vec<rusqlite::types::Value> = Vec::new();
    macro_rules! cond_eq {
        ($campo:expr, $valor:expr) => {
            if let Some(v) = $valor {
                cond.push_str(&format!(" AND {} = ?{}", $campo, params.len() + 1));
                params.push(v.to_string().into());
            }
        };
    }
    cond_eq!("usuario_id", usuario_id);
    if let Some(d) = desde_efectivo {
        cond.push_str(&format!(" AND timestamp >= ?{}", params.len() + 1));
        params.push(d.to_string().into());
    }
    if let Some(h) = hasta_efectivo {
        cond.push_str(&format!(" AND timestamp <= ?{}", params.len() + 1));
        params.push(h.to_string().into());
    }
    let where_sql = if cond.is_empty() {
        String::from(" WHERE 1=1")
    } else {
        format!(" WHERE 1=1{cond}")
    };

    let resumen = resumen_actividad(conn, &where_sql, &params)?;
    let por_modulo = por_modulo(conn, &where_sql, &params)?;
    let por_dia = por_dia(conn, &where_sql, &params)?;
    let por_hora = por_hora(conn, &where_sql, &params)?;
    let por_dia_semana = por_dia_semana(conn, &where_sql, &params)?;
    let por_usuario = por_usuario(conn, &where_sql, &params)?;
    let por_proceso = por_proceso(conn, &where_sql, &params)?;
    let top_rutas = top_rutas(conn, &where_sql, &params)?;
    let insights = construir_insights(
        conn,
        &resumen,
        &por_modulo,
        &por_hora,
        &por_dia_semana,
        &por_usuario,
        &por_proceso,
        &top_rutas,
    )?;

    Ok(MetricasActividad {
        desde: desde_efectivo.map(str::to_string),
        hasta: hasta_efectivo.map(str::to_string),
        resumen,
        por_modulo,
        por_dia,
        por_hora,
        por_dia_semana,
        por_usuario,
        por_proceso,
        top_rutas,
        insights,
    })
}

fn resumen_actividad(
    conn: &Connection,
    where_sql: &str,
    params: &[rusqlite::types::Value],
) -> AppResult<ResumenActividad> {
    let uno = |sql: &str| -> AppResult<i64> {
        conn.query_row(sql, rusqlite::params_from_iter(params.iter()), |r| r.get(0))
            .map_err(AppError::from)
    };
    let total_eventos = uno(&format!("SELECT COUNT(*) FROM auditoria{where_sql}"))?;
    let total_vistas = uno(&format!(
        "SELECT COUNT(*) FROM auditoria{where_sql} AND tipo_evento = 'VISTA'"
    ))?;
    let total_operaciones = total_eventos - total_vistas;
    let escrituras = uno(&format!(
        "SELECT COUNT(*) FROM auditoria{where_sql} AND tipo_evento = 'COMANDO' AND nivel = 'ESCRITURA'"
    ))?;
    let lecturas = total_operaciones - escrituras;
    let exitos = uno(&format!(
        "SELECT COUNT(*) FROM auditoria{where_sql} AND exito = 1"
    ))?;
    let errores = total_eventos - exitos;
    let usuarios_activos = uno(&format!(
        "SELECT COUNT(DISTINCT usuario_id) FROM auditoria{where_sql}"
    ))?;
    let duracion_vista_promedio_ms: Option<f64> = conn
        .query_row(
            &format!(
                "SELECT AVG(duracion_vista_ms) FROM auditoria{where_sql} AND tipo_evento = 'VISTA' AND duracion_vista_ms IS NOT NULL"
            ),
            rusqlite::params_from_iter(params.iter()),
            |r| r.get(0),
        )
        .map_err(AppError::from)?;
    Ok(ResumenActividad {
        total_eventos,
        total_vistas,
        total_operaciones,
        escrituras,
        lecturas,
        exitos,
        errores,
        tasa_exito: if total_eventos > 0 {
            (exitos as f64 / total_eventos as f64) * 100.0
        } else {
            0.0
        },
        usuarios_activos,
        duracion_vista_promedio_ms,
    })
}

fn por_modulo(
    conn: &Connection,
    where_sql: &str,
    params: &[rusqlite::types::Value],
) -> AppResult<Vec<ModuloActividad>> {
    let mut stmt = conn.prepare(&format!(
        "SELECT COALESCE(modulo, 'Sin módulo') AS m,
                SUM(CASE WHEN tipo_evento = 'VISTA' THEN 1 ELSE 0 END) AS vistas,
                SUM(CASE WHEN tipo_evento = 'COMANDO' THEN 1 ELSE 0 END) AS operaciones,
                SUM(CASE WHEN tipo_evento = 'VISTA' THEN COALESCE(duracion_vista_ms, 0) ELSE 0 END) AS duracion_ms
         FROM auditoria{where_sql}
         GROUP BY m
         ORDER BY vistas + operaciones DESC
         LIMIT 20"
    ))?;
    let rows = stmt
        .query_map(rusqlite::params_from_iter(params.iter()), |r| {
            Ok(ModuloActividad {
                modulo: r.get(0)?,
                vistas: r.get(1)?,
                operaciones: r.get(2)?,
                duracion_vista_ms: r.get(3)?,
            })
        })?
        .collect::<Result<Vec<_>, _>>()?;
    Ok(rows)
}

fn por_dia(
    conn: &Connection,
    where_sql: &str,
    params: &[rusqlite::types::Value],
) -> AppResult<Vec<DiaActividad>> {
    let mut stmt = conn.prepare(&format!(
        "SELECT substr(timestamp, 1, 10) AS dia,
                SUM(CASE WHEN tipo_evento = 'VISTA' THEN 1 ELSE 0 END) AS vistas,
                SUM(CASE WHEN tipo_evento = 'COMANDO' THEN 1 ELSE 0 END) AS operaciones
         FROM auditoria{where_sql}
         GROUP BY dia
         ORDER BY dia ASC
         LIMIT 60"
    ))?;
    let rows = stmt
        .query_map(rusqlite::params_from_iter(params.iter()), |r| {
            Ok(DiaActividad {
                dia: r.get(0)?,
                vistas: r.get(1)?,
                operaciones: r.get(2)?,
            })
        })?
        .collect::<Result<Vec<_>, _>>()?;
    Ok(rows)
}

fn por_hora(
    conn: &Connection,
    where_sql: &str,
    params: &[rusqlite::types::Value],
) -> AppResult<Vec<HoraActividad>> {
    let mut stmt = conn.prepare(&format!(
        "SELECT COALESCE(hora_local, CAST(strftime('%H', timestamp) AS INTEGER)) AS hora,
                SUM(CASE WHEN tipo_evento = 'VISTA' THEN 1 ELSE 0 END) AS vistas,
                SUM(CASE WHEN tipo_evento = 'COMANDO' THEN 1 ELSE 0 END) AS operaciones
         FROM auditoria{where_sql}
         GROUP BY hora
         ORDER BY hora ASC"
    ))?;
    let rows = stmt
        .query_map(rusqlite::params_from_iter(params.iter()), |r| {
            Ok(HoraActividad {
                hora: r.get(0)?,
                vistas: r.get(1)?,
                operaciones: r.get(2)?,
            })
        })?
        .collect::<Result<Vec<_>, _>>()?;
    Ok(rows)
}

fn por_dia_semana(
    conn: &Connection,
    where_sql: &str,
    params: &[rusqlite::types::Value],
) -> AppResult<Vec<DiaSemanaActividad>> {
    let mut stmt = conn.prepare(&format!(
        "SELECT COALESCE(dia_semana, CAST(strftime('%w', timestamp) AS INTEGER) + 1) AS ds,
                SUM(CASE WHEN tipo_evento = 'VISTA' THEN 1 ELSE 0 END) AS vistas,
                SUM(CASE WHEN tipo_evento = 'COMANDO' THEN 1 ELSE 0 END) AS operaciones
         FROM auditoria{where_sql}
         GROUP BY ds
         ORDER BY ds ASC"
    ))?;
    let rows = stmt
        .query_map(rusqlite::params_from_iter(params.iter()), |r| {
            Ok(DiaSemanaActividad {
                dia_semana: r.get(0)?,
                vistas: r.get(1)?,
                operaciones: r.get(2)?,
            })
        })?
        .collect::<Result<Vec<_>, _>>()?;
    Ok(rows)
}

fn por_usuario(
    conn: &Connection,
    where_sql: &str,
    params: &[rusqlite::types::Value],
) -> AppResult<Vec<UsuarioActividad>> {
    let mut stmt = conn.prepare(&format!(
        "SELECT usuario_id,
                SUM(CASE WHEN tipo_evento = 'VISTA' THEN 1 ELSE 0 END) AS vistas,
                SUM(CASE WHEN tipo_evento = 'COMANDO' THEN 1 ELSE 0 END) AS operaciones,
                SUM(CASE WHEN tipo_evento = 'VISTA' THEN COALESCE(duracion_vista_ms, 0) ELSE 0 END) AS duracion_ms
         FROM auditoria{where_sql}
         GROUP BY usuario_id
         ORDER BY vistas + operaciones DESC
         LIMIT 20"
    ))?;
    let rows = stmt
        .query_map(rusqlite::params_from_iter(params.iter()), |r| {
            Ok(UsuarioActividad {
                usuario_id: r.get(0)?,
                vistas: r.get(1)?,
                operaciones: r.get(2)?,
                duracion_vista_ms: r.get(3)?,
            })
        })?
        .collect::<Result<Vec<_>, _>>()?;
    Ok(rows)
}

fn por_proceso(
    conn: &Connection,
    where_sql: &str,
    params: &[rusqlite::types::Value],
) -> AppResult<Vec<ProcesoActividad>> {
    let mut stmt = conn.prepare(&format!(
        "SELECT proceso, COUNT(*) AS total
         FROM auditoria{where_sql}
           AND proceso IS NOT NULL
         GROUP BY proceso
         ORDER BY total DESC
         LIMIT 20"
    ))?;
    let rows = stmt
        .query_map(rusqlite::params_from_iter(params.iter()), |r| {
            Ok(ProcesoActividad {
                proceso: r.get(0)?,
                total: r.get(1)?,
            })
        })?
        .collect::<Result<Vec<_>, _>>()?;
    Ok(rows)
}

fn top_rutas(
    conn: &Connection,
    where_sql: &str,
    params: &[rusqlite::types::Value],
) -> AppResult<Vec<RutaActividad>> {
    let mut stmt = conn.prepare(&format!(
        "SELECT COALESCE(ruta, '—') AS r, COALESCE(modulo, '') AS m,
                COUNT(*) AS vistas,
                SUM(COALESCE(duracion_vista_ms, 0)) AS duracion_ms
         FROM auditoria{where_sql}
           AND tipo_evento = 'VISTA' AND ruta IS NOT NULL
         GROUP BY r, m
         ORDER BY vistas DESC
         LIMIT 15"
    ))?;
    let rows = stmt
        .query_map(rusqlite::params_from_iter(params.iter()), |r| {
            Ok(RutaActividad {
                ruta: r.get(0)?,
                modulo: r.get(1)?,
                vistas: r.get(2)?,
                duracion_vista_ms: r.get(3)?,
            })
        })?
        .collect::<Result<Vec<_>, _>>()?;
    Ok(rows)
}

/// Deriva los insights automáticos del periodo: picos por hora/día, módulo y
/// usuario dominantes, proceso más frecuente y tendencia de 7 días. Es la
/// capa "inteligente" del centro de actividad.
#[allow(clippy::too_many_arguments)]
fn construir_insights(
    conn: &Connection,
    resumen: &ResumenActividad,
    por_modulo: &[ModuloActividad],
    por_hora: &[HoraActividad],
    por_dia_semana: &[DiaSemanaActividad],
    por_usuario: &[UsuarioActividad],
    por_proceso: &[ProcesoActividad],
    top_rutas: &[RutaActividad],
) -> AppResult<Vec<InsightActividad>> {
    let mut insights: Vec<InsightActividad> = Vec::new();

    if resumen.total_eventos == 0 {
        insights.push(InsightActividad {
            titulo: "Sin actividad en el periodo".into(),
            detalle: "Aún no hay eventos registrados. La actividad del sistema aparecerá aquí en cuanto se usen módulos o comandos.".into(),
            icono: "info",
        });
        return Ok(insights);
    }

    // Hora pico.
    if let Some(pico) = por_hora.iter().max_by_key(|h| h.vistas + h.operaciones) {
        let total: i64 = por_hora.iter().map(|h| h.vistas + h.operaciones).sum();
        let pct = if total > 0 {
            ((pico.vistas + pico.operaciones) as f64 / total as f64) * 100.0
        } else {
            0.0
        };
        insights.push(InsightActividad {
            titulo: format!("Hora pico de actividad: {:02}:00", pico.hora),
            detalle: format!(
                "Concentra el {:.0}% de los eventos del periodo. Es el momento con más uso del sistema.",
                pct
            ),
            icono: "calendario",
        });
    }

    // Día pico.
    if let Some(pico) = por_dia_semana
        .iter()
        .max_by_key(|d| d.vistas + d.operaciones)
    {
        let nombre = match pico.dia_semana {
            1 => "lunes",
            2 => "martes",
            3 => "miércoles",
            4 => "jueves",
            5 => "viernes",
            6 => "sábado",
            _ => "domingo",
        };
        insights.push(InsightActividad {
            titulo: format!("Día de mayor uso: {nombre}"),
            detalle: format!(
                "{} vistas y {} operaciones registradas los {nombre}s en el periodo.",
                pico.vistas, pico.operaciones
            ),
            icono: "calendario",
        });
    }

    // Módulo dominante.
    if let Some(dom) = por_modulo.first() {
        insights.push(InsightActividad {
            titulo: format!("Módulo dominante: {}", dom.modulo),
            detalle: format!(
                "{} vistas y {} operaciones — es donde más tiempo pasa el equipo.",
                dom.vistas, dom.operaciones
            ),
            icono: "dashboard",
        });
    }

    // Ruta más visitada.
    if let Some(r) = top_rutas.first() {
        let segundos = r.duracion_vista_ms / 1000;
        insights.push(InsightActividad {
            titulo: format!("Ruta más visitada: {}", r.ruta),
            detalle: format!(
                "{} visitas y {} de tiempo acumulado en pantalla.",
                r.vistas,
                formato_duracion(segundos)
            ),
            icono: "historial",
        });
    }

    // Usuario más activo.
    if let Some(u) = por_usuario.first() {
        insights.push(InsightActividad {
            titulo: "Usuario más activo".into(),
            detalle: format!(
                "{} con {} vistas y {} operaciones en el periodo.",
                u.usuario_id.as_deref().unwrap_or("sin sesión"),
                u.vistas,
                u.operaciones
            ),
            icono: "usuario",
        });
    }

    // Proceso más frecuente.
    if let Some(p) = por_proceso.first() {
        insights.push(InsightActividad {
            titulo: format!("Proceso más frecuente: {}", p.proceso),
            detalle: format!("{} ejecuciones de {} en el periodo.", p.total, p.proceso),
            icono: "proceso",
        });
    }

    // Tendencia: últimos 7 días vs. los 7 anteriores.
    let tendencia = conn.query_row(
        "SELECT
           (SELECT COUNT(*) FROM auditoria WHERE timestamp >= datetime('now', '-7 days')),
           (SELECT COUNT(*) FROM auditoria WHERE timestamp >= datetime('now', '-14 days') AND timestamp < datetime('now', '-7 days'))",
        [],
        |r| Ok((r.get::<_, i64>(0)?, r.get::<_, i64>(1)?)),
    )?;
    if tendencia.1 > 0 {
        let delta = ((tendencia.0 - tendencia.1) as f64 / tendencia.1 as f64) * 100.0;
        let (verbo, icono) = if delta >= 0.0 {
            ("aumentó", "aprobar")
        } else {
            ("disminuyó", "anular")
        };
        insights.push(InsightActividad {
            titulo: format!(
                "Actividad {verbo} un {:.0}% en la última semana",
                delta.abs()
            ),
            detalle: format!(
                "{} eventos esta semana contra {} la anterior.",
                tendencia.0, tendencia.1
            ),
            icono,
        });
    }

    Ok(insights)
}

/// Formatea segundos a "Xm Ys" (o "Zs").
fn formato_duracion(segundos: i64) -> String {
    if segundos >= 60 {
        format!("{}m {}s", segundos / 60, segundos % 60)
    } else {
        format!("{segundos}s")
    }
}

// ============ Tipos de métricas (compatibles con la UI existente) ============

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
        tipo_evento: r.get(13)?,
        ruta: r.get(14)?,
        modulo: r.get(15)?,
        proceso: r.get(16)?,
        metadatos: r.get(17)?,
        tenant: r.get(18)?,
        duracion_vista_ms: r.get(19)?,
        hora_local: r.get(20)?,
        dia_semana: r.get(21)?,
        sesion_id: r.get(22)?,
        ip: r.get(23)?,
        agente: r.get(24)?,
    })
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

/// Registra que alguien abrió sesión, con desde dónde.
///
/// Es el ancla de la trazabilidad: fija en un solo evento quién entró, cuándo,
/// desde qué IP y con qué cliente. Todo lo que haga después comparte el mismo
/// `sesion_id`, así que reconstruir una visita es filtrar por ese identificador
/// en vez de cruzar horas y usuarios a ojo.
pub fn registrar_sesion_abierta(
    conn: &Connection,
    usuario_id: &str,
    origen: &str,
    desde: &crate::domain::seguridad::Desde,
) -> AppResult<()> {
    let tenant = tenant_actual(conn)?;
    EventoAuditoria::registrar_detallado(
        conn,
        Some(usuario_id),
        "abrir_sesion",
        "sesion",
        desde.sesion_id.as_deref(),
        None,
        None,
        Some(origen),
        Some("login"),
        None,
        true,
        "SEGURIDAD",
        "SESION",
        None,
        Some("Seguridad"),
        Some("acceso"),
        None,
        tenant.as_deref(),
        None,
        None,
        None,
        Some(desde),
    )
}

// ============ Sesiones: quién estuvo dentro y desde dónde ============

/// Una visita completa: quién entró, desde dónde, cuándo, y qué hizo.
///
/// Se reconstruye agrupando la auditoría por `sesion_id` en vez de guardarse
/// aparte. Así no hay dos verdades que puedan discrepar: la tabla de eventos
/// **es** el registro, y esto solo es una forma de leerlo.
#[derive(Debug, Clone, serde::Serialize)]
pub struct SesionAuditada {
    pub sesion_id: String,
    pub usuario_id: Option<String>,
    pub nombre_usuario: Option<String>,
    /// `escritorio` o `http`.
    pub origen: Option<String>,
    /// Última IP vista en la sesión. Si cambió durante la visita,
    /// `ips_distintas` es mayor que 1 y conviene mirar el detalle.
    pub ip: Option<String>,
    pub ips_distintas: i64,
    pub agente: Option<String>,
    pub inicio: String,
    pub fin: String,
    /// Minutos entre el primer y el último evento.
    pub duracion_min: i64,
    pub eventos: i64,
    /// Acciones que cambian datos (crear, editar, aprobar, anular…).
    pub escrituras: i64,
    /// Intentos rechazados: permisos denegados y reglas incumplidas.
    pub fallos: i64,
}

/// Reconstruye las sesiones del periodo, de la más reciente a la más antigua.
pub fn listar_sesiones(
    conn: &Connection,
    usuario_id: Option<&str>,
    ip: Option<&str>,
    desde: Option<&str>,
    hasta: Option<&str>,
    limite: i64,
) -> AppResult<Vec<SesionAuditada>> {
    let mut filtros = vec!["a.sesion_id IS NOT NULL".to_string()];
    let mut params: Vec<rusqlite::types::Value> = Vec::new();
    for (campo, valor) in [
        ("a.usuario_id", usuario_id),
        ("a.ip", ip),
        ("a.timestamp >=", desde),
        ("a.timestamp <=", hasta),
    ] {
        if let Some(v) = valor {
            let comparador = if campo.ends_with('=') { "" } else { "=" };
            filtros.push(format!("{campo}{comparador} ?{}", params.len() + 1));
            params.push(v.to_string().into());
        }
    }
    let where_sql = format!(" WHERE {}", filtros.join(" AND "));

    let sql = format!(
        "SELECT a.sesion_id,
                MAX(a.usuario_id),
                MAX(u.nombre_usuario),
                MAX(a.origen),
                MAX(a.ip),
                COUNT(DISTINCT a.ip),
                MAX(a.agente),
                MIN(a.timestamp),
                MAX(a.timestamp),
                COUNT(*),
                SUM(CASE WHEN a.nivel IN ('ESCRITURA', 'CRITICO') THEN 1 ELSE 0 END),
                SUM(CASE WHEN a.exito = 0 THEN 1 ELSE 0 END)
         FROM auditoria a
         LEFT JOIN usuarios u ON u.id = a.usuario_id{where_sql}
         GROUP BY a.sesion_id
         ORDER BY MIN(a.timestamp) DESC
         LIMIT ?{}",
        params.len() + 1
    );
    params.push(limite.clamp(1, 500).into());

    let mut stmt = conn.prepare(&sql)?;
    let filas = stmt
        .query_map(rusqlite::params_from_iter(params.iter()), |r| {
            let inicio: String = r.get(7)?;
            let fin: String = r.get(8)?;
            Ok(SesionAuditada {
                sesion_id: r.get(0)?,
                usuario_id: r.get(1)?,
                nombre_usuario: r.get(2)?,
                origen: r.get(3)?,
                ip: r.get(4)?,
                ips_distintas: r.get(5)?,
                agente: r.get(6)?,
                duracion_min: minutos_entre(&inicio, &fin),
                inicio,
                fin,
                eventos: r.get(9)?,
                escrituras: r.get::<_, Option<i64>>(10)?.unwrap_or(0),
                fallos: r.get::<_, Option<i64>>(11)?.unwrap_or(0),
            })
        })?
        .collect::<rusqlite::Result<Vec<_>>>()?;
    Ok(filas)
}

/// Minutos entre dos marcas ISO-8601. Cero si alguna no se puede leer: una
/// duración rara no debe impedir ver el resto de la sesión.
fn minutos_entre(inicio: &str, fin: &str) -> i64 {
    use chrono::DateTime;
    match (
        DateTime::parse_from_rfc3339(inicio),
        DateTime::parse_from_rfc3339(fin),
    ) {
        (Ok(a), Ok(b)) => (b - a).num_minutes(),
        _ => 0,
    }
}
