//! Repositorio de configuración de empresa y preferencias de usuario.
//!
//! La configuración de empresa es una fila única con `id = 'default'` que
//! nace con valores por defecto en la migración. Las preferencias de usuario
//! nacen igualmente con valores por defecto en el primer acceso, para que la
//! UI siempre tenga algo coherente que mostrar.

use rusqlite::Connection;

use crate::domain::ahora;
use crate::domain::configuracion::{
    ConfiguracionEmpresa, EditarConfiguracionEmpresa, EditarPreferenciasUsuario,
    PreferenciasResueltas, PreferenciasUsuario,
};
use crate::domain::seguridad::EventoAuditoria;
use crate::error::{AppError, AppResult};

const ID_FILA: &str = "default";

// ============ Configuración de empresa ============

fn map_configuracion(r: &rusqlite::Row<'_>) -> rusqlite::Result<ConfiguracionEmpresa> {
    Ok(ConfiguracionEmpresa {
        id: r.get(0)?,
        nombre: r.get(1)?,
        codigo: r.get(2)?,
        descripcion: r.get(3)?,
        zona_horaria: r.get(4)?,
        formato_fecha: r.get(5)?,
        dias_aviso_vencimiento: r.get(6)?,
        requiere_aprobacion: r.get::<_, i64>(7)? != 0,
        stock_minimo_default: r.get(8)?,
        pais: r.get(9)?,
        ciudad: r.get(10)?,
        direccion: r.get(11)?,
        codigo_postal: r.get(12)?,
        razon_social: r.get(13)?,
        documento_fiscal: r.get(14)?,
        direccion_fiscal: r.get(15)?,
        telefono: r.get(16)?,
        email_contacto: r.get(17)?,
        sitio_web: r.get(18)?,
        latitud: r.get(19)?,
        longitud: r.get(20)?,
        tema_id: r.get(21)?,
        modo_oscuro: r.get::<_, i64>(22)? != 0,
        updated_by: r.get(23)?,
        updated_at: r.get(24)?,
    })
}

/// Devuelve la configuración de empresa. La fila por defecto la crea la
/// migración (`INSERT OR IGNORE`), así que aquí siempre existe.
pub fn obtener_configuracion_empresa(conn: &Connection) -> AppResult<ConfiguracionEmpresa> {
    conn.query_row(
        "SELECT id, nombre, codigo, descripcion, zona_horaria, formato_fecha,
                dias_aviso_vencimiento, requiere_aprobacion, stock_minimo_default,
                pais, ciudad, direccion, codigo_postal, razon_social,
                documento_fiscal, direccion_fiscal, telefono, email_contacto,
                sitio_web, latitud, longitud, tema_id, modo_oscuro, updated_by, updated_at
         FROM configuracion_empresa WHERE id = ?1",
        [ID_FILA],
        map_configuracion,
    )
    .map_err(AppError::from)
}

/// Aplica solo los campos presentes de `cambios` (los `None` no tocan nada).
pub fn guardar_configuracion_empresa(
    conn: &Connection,
    cambios: &EditarConfiguracionEmpresa,
    actor: &str,
) -> AppResult<ConfiguracionEmpresa> {
    cambios.validar()?;
    let ts = ahora();
    conn.execute(
        "UPDATE configuracion_empresa SET
            nombre            = COALESCE(?1, nombre),
            codigo            = COALESCE(?2, codigo),
            descripcion       = COALESCE(?3, descripcion),
            zona_horaria      = COALESCE(?4, zona_horaria),
            formato_fecha     = COALESCE(?5, formato_fecha),
            dias_aviso_vencimiento = COALESCE(?6, dias_aviso_vencimiento),
            requiere_aprobacion    = COALESCE(?7, requiere_aprobacion),
            stock_minimo_default   = ?8,
            pais              = ?9,
            ciudad            = ?10,
            direccion         = ?11,
            codigo_postal     = ?12,
            razon_social      = ?13,
            documento_fiscal  = ?14,
            direccion_fiscal  = ?15,
            telefono          = ?16,
            email_contacto    = ?17,
            sitio_web         = ?18,
            latitud           = ?19,
            longitud          = ?20,
            tema_id           = COALESCE(?21, tema_id),
            modo_oscuro       = COALESCE(?22, modo_oscuro),
            updated_by        = ?23,
            updated_at        = ?24
         WHERE id = ?25",
        rusqlite::params![
            cambios.nombre.as_ref().and_then(|v| v.as_ref()),
            cambios.codigo.as_ref().and_then(|v| v.as_ref()),
            cambios.descripcion.as_ref().and_then(|v| v.as_ref()),
            cambios.zona_horaria.as_ref(),
            cambios.formato_fecha.as_ref(),
            cambios.dias_aviso_vencimiento,
            cambios.requiere_aprobacion.map(|b| b as i64),
            cambios
                .stock_minimo_default
                .as_ref()
                .and_then(|v| v.as_ref()),
            cambios.pais.as_ref().and_then(|v| v.as_ref()),
            cambios.ciudad.as_ref().and_then(|v| v.as_ref()),
            cambios.direccion.as_ref().and_then(|v| v.as_ref()),
            cambios.codigo_postal.as_ref().and_then(|v| v.as_ref()),
            cambios.razon_social.as_ref().and_then(|v| v.as_ref()),
            cambios.documento_fiscal.as_ref().and_then(|v| v.as_ref()),
            cambios.direccion_fiscal.as_ref().and_then(|v| v.as_ref()),
            cambios.telefono.as_ref().and_then(|v| v.as_ref()),
            cambios.email_contacto.as_ref().and_then(|v| v.as_ref()),
            cambios.sitio_web.as_ref().and_then(|v| v.as_ref()),
            cambios.latitud.as_ref().and_then(|v| v.as_ref()),
            cambios.longitud.as_ref().and_then(|v| v.as_ref()),
            cambios.tema_id.as_ref(),
            cambios.modo_oscuro.map(|b| b as i64),
            actor,
            ts,
            ID_FILA,
        ],
    )?;
    EventoAuditoria::registrar(
        conn,
        Some(actor),
        "editar",
        "configuracion_empresa",
        Some(ID_FILA),
        None,
        None,
        None,
    )?;
    obtener_configuracion_empresa(conn)
}

// ============ Preferencias de usuario ============

fn map_preferencias(r: &rusqlite::Row<'_>) -> rusqlite::Result<PreferenciasUsuario> {
    Ok(PreferenciasUsuario {
        usuario_id: r.get(0)?,
        tamano_fuente: r.get(1)?,
        orden_sidebar: r.get(2)?,
        zona_horaria: r.get(3)?,
        formato_fecha: r.get(4)?,
        tema_id: r.get(5)?,
        modo_oscuro: r.get::<_, Option<i64>>(6)?.map(|b| b != 0),
        ayuda_en_palette: r.get::<_, i64>(7)? != 0,
        updated_at: r.get(8)?,
    })
}

/// Devuelve las preferencias de un usuario, creándolas con valores por
/// defecto la primera vez. No escribe eventos de auditoría en ese primer
/// acceso: es una lectura que materializa el default.
pub fn obtener_preferencias_usuario(
    conn: &Connection,
    usuario_id: &str,
) -> AppResult<PreferenciasUsuario> {
    let ts = ahora();
    conn.execute(
        "INSERT OR IGNORE INTO preferencias_usuario (usuario_id, tamano_fuente, updated_at)
         VALUES (?1, 'MEDIA', ?2)",
        rusqlite::params![usuario_id, ts],
    )?;
    conn.query_row(
        "SELECT usuario_id, tamano_fuente, orden_sidebar, zona_horaria, formato_fecha,
                tema_id, modo_oscuro, ayuda_en_palette, updated_at
         FROM preferencias_usuario WHERE usuario_id = ?1",
        [usuario_id],
        map_preferencias,
    )
    .map_err(AppError::from)
}

/// Aplica solo los campos presentes de `cambios`. Cada usuario solo puede
/// tocar sus propias preferencias (lo garantiza el comando, que lee el id de
/// la sesión activa — nunca un parámetro del invocador).
pub fn guardar_preferencias_usuario(
    conn: &Connection,
    usuario_id: &str,
    cambios: &EditarPreferenciasUsuario,
) -> AppResult<PreferenciasUsuario> {
    cambios.validar()?;
    // Asegura la fila antes del UPDATE (si el usuario nunca entró antes).
    obtener_preferencias_usuario(conn, usuario_id)?;
    let ts = ahora();
    conn.execute(
        "UPDATE preferencias_usuario SET
            tamano_fuente   = COALESCE(?1, tamano_fuente),
            orden_sidebar   = ?2,
            zona_horaria    = ?3,
            formato_fecha   = ?4,
            tema_id         = ?5,
            modo_oscuro     = ?6,
            ayuda_en_palette = COALESCE(?7, ayuda_en_palette),
            updated_at      = ?8
         WHERE usuario_id = ?9",
        rusqlite::params![
            cambios.tamano_fuente.as_ref(),
            cambios.orden_sidebar.as_ref().and_then(|v| v.as_ref()),
            cambios.zona_horaria.as_ref().and_then(|v| v.as_ref()),
            cambios.formato_fecha.as_ref().and_then(|v| v.as_ref()),
            cambios.tema_id.as_ref().and_then(|v| v.as_ref()),
            cambios
                .modo_oscuro
                .as_ref()
                .and_then(|v| v.as_ref())
                .map(|b| *b as i64),
            cambios.ayuda_en_palette.map(|b| b as i64),
            ts,
            usuario_id,
        ],
    )?;
    obtener_preferencias_usuario(conn, usuario_id)
}

/// Preferencias **resueltas** de un usuario: aplica los fallbacks de la
/// configuración de empresa para zona horaria y formato de fecha, y agrega
/// los parámetros de negocio que la UI necesita (umbral de vencimiento,
/// política de aprobación, stock mínimo por defecto) — SPEC §14.4, §17.1.
pub fn preferencias_resueltas(
    conn: &Connection,
    usuario_id: &str,
) -> AppResult<PreferenciasResueltas> {
    let prefs = obtener_preferencias_usuario(conn, usuario_id)?;
    let config = obtener_configuracion_empresa(conn)?;
    let (tema_id, _modo) = crate::domain::tema::tema_resuelto(
        prefs.tema_id.as_deref(),
        &config.tema_id,
        prefs.modo_oscuro,
        config.modo_oscuro,
    );
    Ok(PreferenciasResueltas {
        usuario_id: prefs.usuario_id,
        tamano_fuente: prefs.tamano_fuente,
        orden_sidebar: prefs.orden_sidebar,
        zona_horaria: prefs
            .zona_horaria
            .filter(|z| !z.is_empty())
            .unwrap_or(config.zona_horaria),
        formato_fecha: prefs
            .formato_fecha
            .filter(|f| !f.is_empty())
            .unwrap_or(config.formato_fecha),
        dias_aviso_vencimiento: config.dias_aviso_vencimiento,
        requiere_aprobacion: config.requiere_aprobacion,
        stock_minimo_default: config.stock_minimo_default,
        tema_id,
        tema_heredado: prefs.tema_id.is_none(),
        modo_oscuro: prefs.modo_oscuro.unwrap_or(config.modo_oscuro),
        modo_oscuro_heredado: prefs.modo_oscuro.is_none(),
        ayuda_en_palette: prefs.ayuda_en_palette,
    })
}

/// Tema activo resuelto para un usuario (variables CSS listas para aplicar).
pub fn tema_activo_de_usuario(
    conn: &Connection,
    usuario_id: &str,
) -> AppResult<crate::domain::tema::TemaActivo> {
    let resueltas = preferencias_resueltas(conn, usuario_id)?;
    let modo = if resueltas.modo_oscuro {
        crate::domain::tema::ModoColor::Oscuro
    } else {
        crate::domain::tema::ModoColor::Claro
    };
    crate::domain::tema::obtener_tema(&resueltas.tema_id, modo)
        .ok_or_else(|| AppError::CampoInvalido(format!("tema '{}' no existe", resueltas.tema_id)))
}

/// Umbral de días de aviso de vencimiento desde la configuración (SPEC §17.1).
pub fn dias_aviso_vencimiento(conn: &Connection) -> AppResult<i64> {
    Ok(obtener_configuracion_empresa(conn)?.dias_aviso_vencimiento)
}

/// Stock mínimo por defecto para productos sin `stock_minimo` (alerta STOCK_BAJO).
pub fn stock_minimo_default(conn: &Connection) -> AppResult<Option<i64>> {
    Ok(obtener_configuracion_empresa(conn)?.stock_minimo_default)
}

/// Usa el umbral configurado cuando no se recibe uno explícito. Así el
/// comando `listar_alertas` sin `dias` respeta la configuración del ADMIN.
pub fn dias_aviso_o_por_defecto(conn: &Connection, dias: Option<i64>) -> AppResult<i64> {
    match dias {
        Some(d) => Ok(d),
        None => dias_aviso_vencimiento(conn),
    }
}
