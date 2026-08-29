use serde::{Deserialize, Serialize};

use super::{Auditoria, ahora};

/// Roles por defecto (SPEC §4.2). No pueden eliminarse.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum RolSistema {
    Admin,
    Gerente,
    EncargadoAlmacen,
    Operador,
    Lector,
}

impl RolSistema {
    pub fn codigo(&self) -> &'static str {
        match self {
            Self::Admin => "ADMIN",
            Self::Gerente => "GERENTE",
            Self::EncargadoAlmacen => "ENCARGADO_ALMACEN",
            Self::Operador => "OPERADOR",
            Self::Lector => "LECTOR",
        }
    }

    pub fn descripcion(&self) -> &'static str {
        match self {
            Self::Admin => "Control total",
            Self::Gerente => "Ve todo, crea y valida movimientos, gestiona catálogos",
            Self::EncargadoAlmacen => "Gestiona movimientos y ejecuta inventario",
            Self::Operador => "Registra movimientos de entrada/salida/traslado",
            Self::Lector => "Solo lectura",
        }
    }

    pub const ALL: [RolSistema; 5] = [
        Self::Admin,
        Self::Gerente,
        Self::EncargadoAlmacen,
        Self::Operador,
        Self::Lector,
    ];
}

/// Recurso para permisos granulares (SPEC §4.3).
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum Recurso {
    Almacen,
    Zona,
    Rack,
    Seccion,
    Ubicacion,
    Caja,
    Producto,
    Categoria,
    Uom,
    Proveedor,
    Cliente,
    Lote,
    Usuario,
    Rol,
    Movimiento,
    Entrada,
    Salida,
    Traslado,
    Ajuste,
    Inventario,
    Comentario,
    Reporte,
    Configuracion,
    /// Lectura por escáner (SPEC §14.3): usar el escáner y consultar su
    /// registro de eventos.
    Escaneo,
    /// Reglas de negocio configurables (SPEC §16).
    Regla,
}

impl Recurso {
    pub fn as_str(&self) -> &'static str {
        match self {
            Self::Almacen => "almacen",
            Self::Zona => "zona",
            Self::Rack => "rack",
            Self::Seccion => "seccion",
            Self::Ubicacion => "ubicacion",
            Self::Caja => "caja",
            Self::Producto => "producto",
            Self::Categoria => "categoria",
            Self::Uom => "uom",
            Self::Proveedor => "proveedor",
            Self::Cliente => "cliente",
            Self::Lote => "lote",
            Self::Usuario => "usuario",
            Self::Rol => "rol",
            Self::Movimiento => "movimiento",
            Self::Entrada => "entrada",
            Self::Salida => "salida",
            Self::Traslado => "traslado",
            Self::Ajuste => "ajuste",
            Self::Inventario => "inventario",
            Self::Comentario => "comentario",
            Self::Reporte => "reporte",
            Self::Configuracion => "configuracion",
            Self::Escaneo => "escaneo",
            Self::Regla => "regla",
        }
    }
}

/// Acciones granulares (SPEC §4.3).
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum Accion {
    Ver,
    Crear,
    Editar,
    Eliminar,
    Desactivar,
    Aprobar,
    Anular,
    Exportar,
    Ejecutar,
    Cerrar,
    Asignar,
    /// Ejecutar una lectura por escáner (SPEC §14.3).
    Usar,
}

impl Accion {
    pub fn as_str(&self) -> &'static str {
        match self {
            Self::Ver => "ver",
            Self::Crear => "crear",
            Self::Editar => "editar",
            Self::Eliminar => "eliminar",
            Self::Desactivar => "desactivar",
            Self::Aprobar => "aprobar",
            Self::Anular => "anular",
            Self::Exportar => "exportar",
            Self::Ejecutar => "ejecutar",
            Self::Cerrar => "cerrar",
            Self::Asignar => "asignar",
            Self::Usar => "usar",
        }
    }
}

/// Permiso `recurso:accion` (SPEC §4.3).
#[allow(dead_code)]
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Permiso {
    pub id: String,
    pub recurso: String,
    pub accion: String,
    pub rol_id: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Rol {
    pub id: String,
    pub codigo: String,
    pub descripcion: Option<String>,
    pub es_sistema: bool,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Usuario {
    pub id: String,
    pub nombre_usuario: String,
    pub nombre_completo: String,
    pub email: Option<String>,
    /// Nunca se envía al frontend (SPEC §4.1: solo el backend conoce el hash).
    #[serde(skip_serializing)]
    pub password_hash: String,
    pub rol_id: String,
    pub activo: bool,
    pub ultimo_acceso_at: Option<String>,
    #[serde(flatten)]
    pub auditoria: Auditoria,
}

/// Datos para crear un usuario. `password` viaja en texto plano por IPC local
/// (proceso único, sin red) y se hashea en Rust antes de persistir — el
/// frontend nunca calcula ni ve un hash. `created_by` nunca llega por IPC: lo
/// resuelve el comando desde la sesión activa (SPEC §4.1).
#[derive(Debug, Clone, Deserialize)]
pub struct NuevoUsuario {
    pub nombre_usuario: String,
    pub nombre_completo: String,
    #[serde(default)]
    pub email: Option<String>,
    pub password: String,
    pub rol_id: String,
    #[serde(skip_deserializing, default)]
    pub created_by: Option<String>,
}

impl NuevoUsuario {
    pub fn validar(&self) -> Result<(), crate::error::AppError> {
        if self.nombre_usuario.trim().is_empty() {
            return Err(crate::error::AppError::CampoRequerido(
                "nombre_usuario".into(),
            ));
        }
        if self.nombre_completo.trim().is_empty() {
            return Err(crate::error::AppError::CampoRequerido(
                "nombre_completo".into(),
            ));
        }
        if self.password.len() < 8 {
            return Err(crate::error::AppError::PasswordDebil);
        }
        if self.rol_id.trim().is_empty() {
            return Err(crate::error::AppError::CampoRequerido("rol_id".into()));
        }
        Ok(())
    }
}

/// Cambios aceptados sobre un usuario (SPEC §4.1). `nombre_usuario` no se
/// puede cambiar por este camino: es el identificador estable de la sesión,
/// igual que los códigos de los catálogos (SPEC §14.7).
#[derive(Debug, Clone, Default, Deserialize)]
pub struct EditarUsuario {
    pub nombre_completo: Option<String>,
    pub email: Option<Option<String>>,
    pub rol_id: Option<String>,
}

impl EditarUsuario {
    pub fn validar(&self) -> Result<(), crate::error::AppError> {
        if let Some(n) = &self.nombre_completo
            && n.trim().is_empty()
        {
            return Err(crate::error::AppError::CampoRequerido(
                "nombre_completo".into(),
            ));
        }
        if let Some(rol) = &self.rol_id
            && rol.trim().is_empty()
        {
            return Err(crate::error::AppError::CampoRequerido("rol_id".into()));
        }
        Ok(())
    }
}

/// Evento de auditoría (SPEC §4.5). Inmutable.
/// Registra el historial completo de actividad del usuario con hora, fecha
/// y métricas del backend (comando, duración, éxito, nivel) más el tracking
/// total (Hito 25): tipo de evento, ruta/módulo/proceso, metadatos, tenant y
/// tiempo local — la materia prima del análisis de actividad.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct EventoAuditoria {
    pub id: i64,
    pub usuario_id: Option<String>,
    pub accion: String,
    pub entidad: String,
    pub entidad_id: Option<String>,
    pub antes: Option<String>,
    pub despues: Option<String>,
    pub timestamp: String,
    pub origen: Option<String>,
    pub comando: Option<String>,
    pub duracion_ms: Option<i64>,
    pub exito: bool,
    pub nivel: String,
    /// `COMANDO` (backend) o `VISTA` (navegación del frontend).
    pub tipo_evento: String,
    /// Ruta del frontend (solo eventos de vista).
    pub ruta: Option<String>,
    /// Módulo de la aplicación (Dashboard, Movimientos, Productos...).
    pub modulo: Option<String>,
    /// Proceso de negocio asociado (recepción, despacho, inventario...).
    pub proceso: Option<String>,
    /// Metadatos JSON extra (parámetros de búsqueda, entidad visitada...).
    pub metadatos: Option<String>,
    /// Nombre de la empresa (tenant) al momento del evento.
    pub tenant: Option<String>,
    /// Tiempo que el usuario permaneció en la vista (ms).
    pub duracion_vista_ms: Option<i64>,
    /// Hora local del usuario (0-23) — denormalizada para análisis por hora.
    pub hora_local: Option<i64>,
    /// Día de la semana local (1=lunes ... 7=domingo).
    pub dia_semana: Option<i64>,
}

/// Datos que el frontend envía al registrar la visita a una página
/// (tracking de navegación, Hito 25). `ruta` y `modulo` son obligatorios;
/// el resto enriquece el análisis (proceso de negocio, duración, tiempo local).
#[derive(Debug, Clone, Deserialize)]
pub struct RegistrarVista {
    pub ruta: String,
    pub modulo: String,
    #[serde(default)]
    pub proceso: Option<String>,
    #[serde(default)]
    pub metadatos: Option<serde_json::Value>,
    #[serde(default)]
    pub duracion_vista_ms: Option<i64>,
    #[serde(default)]
    pub hora_local: Option<i64>,
    #[serde(default)]
    pub dia_semana: Option<i64>,
    #[serde(default)]
    pub cliente_info: Option<serde_json::Value>,
}

impl RegistrarVista {
    pub fn validar(&self) -> Result<(), crate::error::AppError> {
        if self.ruta.trim().is_empty() {
            return Err(crate::error::AppError::CampoRequerido("ruta".into()));
        }
        if self.modulo.trim().is_empty() {
            return Err(crate::error::AppError::CampoRequerido("modulo".into()));
        }
        if let Some(h) = self.hora_local
            && !(0..=23).contains(&h)
        {
            return Err(crate::error::AppError::CampoRequerido(
                "hora_local fuera de rango (0-23)".into(),
            ));
        }
        if let Some(d) = self.dia_semana
            && !(1..=7).contains(&d)
        {
            return Err(crate::error::AppError::CampoRequerido(
                "dia_semana fuera de rango (1-7)".into(),
            ));
        }
        Ok(())
    }
}

impl EventoAuditoria {
    #[allow(clippy::too_many_arguments)]
    pub fn registrar(
        conn: &rusqlite::Connection,
        usuario_id: Option<&str>,
        accion: &str,
        entidad: &str,
        entidad_id: Option<&str>,
        antes: Option<&str>,
        despues: Option<&str>,
        origen: Option<&str>,
    ) -> crate::error::AppResult<()> {
        Self::registrar_con_metricas(
            conn,
            usuario_id,
            accion,
            entidad,
            entidad_id,
            antes,
            despues,
            origen,
            None,
            None,
            true,
            "ESCRITURA",
        )
    }

    /// Registra un evento con métricas completas (hora, fecha, duración, éxito, nivel).
    #[allow(clippy::too_many_arguments)]
    pub fn registrar_con_metricas(
        conn: &rusqlite::Connection,
        usuario_id: Option<&str>,
        accion: &str,
        entidad: &str,
        entidad_id: Option<&str>,
        antes: Option<&str>,
        despues: Option<&str>,
        origen: Option<&str>,
        comando: Option<&str>,
        duracion_ms: Option<i64>,
        exito: bool,
        nivel: &str,
    ) -> crate::error::AppResult<()> {
        Self::registrar_detallado(
            conn,
            usuario_id,
            accion,
            entidad,
            entidad_id,
            antes,
            despues,
            origen,
            comando,
            duracion_ms,
            exito,
            nivel,
            "COMANDO",
            None,
            None,
            None,
            None,
            None,
            None,
            None,
            None,
        )
    }

    /// Registro completo con tracking total (tipo de evento, ruta, módulo,
    /// proceso, metadatos, tenant y tiempo local).
    #[allow(clippy::too_many_arguments)]
    pub fn registrar_detallado(
        conn: &rusqlite::Connection,
        usuario_id: Option<&str>,
        accion: &str,
        entidad: &str,
        entidad_id: Option<&str>,
        antes: Option<&str>,
        despues: Option<&str>,
        origen: Option<&str>,
        comando: Option<&str>,
        duracion_ms: Option<i64>,
        exito: bool,
        nivel: &str,
        tipo_evento: &str,
        ruta: Option<&str>,
        modulo: Option<&str>,
        proceso: Option<&str>,
        metadatos: Option<&str>,
        tenant: Option<&str>,
        duracion_vista_ms: Option<i64>,
        hora_local: Option<i64>,
        dia_semana: Option<i64>,
    ) -> crate::error::AppResult<()> {
        let ts = ahora();
        conn.execute(
            "INSERT INTO auditoria (usuario_id, accion, entidad, entidad_id, antes, despues, timestamp, origen, comando, duracion_ms, exito, nivel, tipo_evento, ruta, modulo, proceso, metadatos, tenant, duracion_vista_ms, hora_local, dia_semana)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14, ?15, ?16, ?17, ?18, ?19, ?20, ?21)",
            rusqlite::params![
                usuario_id, accion, entidad, entidad_id, antes, despues, ts, origen,
                comando, duracion_ms, exito as i64, nivel, tipo_evento, ruta, modulo,
                proceso, metadatos, tenant, duracion_vista_ms, hora_local, dia_semana
            ],
        )?;
        Ok(())
    }
}
