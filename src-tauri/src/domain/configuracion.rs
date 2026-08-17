//! Configuración de empresa y preferencias de usuario (SPEC §4.3, §14.4, §17.1).
//!
//! La configuración de empresa es la fila única que elige el ADMIN:
//! datos básicos, zona horaria y formato de fecha por defecto, umbral de
//! aviso de vencimiento, política de aprobación y stock mínimo por defecto.
//! Las preferencias de usuario son personales (tamaño de fuente, orden del
//! sidebar) y de presentación (zona horaria / formato de fecha propios, con
//! `None` = heredar de la empresa).

use serde::{Deserialize, Serialize};

use crate::error::{AppError, AppResult};

/// Zonas horarias soportadas por la UI (SPEC §14.4: fechas en zona configurada).
/// Se validan contra IANA; esta lista es la que expone la UI.
pub const ZONAS_HORARIAS: [&str; 12] = [
    "America/Lima",
    "America/Mexico_City",
    "America/Bogota",
    "America/Santiago",
    "America/Argentina/Buenos_Aires",
    "America/Caracas",
    "America/Guatemala",
    "America/Panama",
    "America/Havana",
    "America/Sao_Paulo",
    "Europe/Madrid",
    "UTC",
];

/// Formatos de fecha que soporta la app (DESIGN §9.2).
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum FormatoFecha {
    /// `08 ago 2026`
    #[serde(rename = "DD_MMM_YYYY")]
    DdMmmYyyy,
    /// `08/08/2026`
    #[serde(rename = "DD_MM_YYYY")]
    DdMmYyyy,
    /// `2026-08-08`
    #[serde(rename = "YYYY_MM_DD")]
    YyyyMmDd,
}

impl FormatoFecha {
    pub fn parse(s: &str) -> Option<Self> {
        match s {
            "DD_MMM_YYYY" => Some(Self::DdMmmYyyy),
            "DD_MM_YYYY" => Some(Self::DdMmYyyy),
            "YYYY_MM_DD" => Some(Self::YyyyMmDd),
            _ => None,
        }
    }
}

/// Tamaños de fuente de la UI (se aplica como escala `rem` del root).
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum TamanioFuente {
    #[serde(rename = "PEQUENA")]
    Pequena,
    #[serde(rename = "MEDIA")]
    Media,
    #[serde(rename = "GRANDE")]
    Grande,
}

impl TamanioFuente {
    pub fn parse(s: &str) -> Option<Self> {
        match s {
            "PEQUENA" => Some(Self::Pequena),
            "MEDIA" => Some(Self::Media),
            "GRANDE" => Some(Self::Grande),
            _ => None,
        }
    }
}

/// Configuración de empresa (fila única). Lectura para quien tenga
/// `configuracion:ver`; escritura con `configuracion:editar` (solo ADMIN en
/// la matriz por defecto, SPEC §4.4).
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ConfiguracionEmpresa {
    pub id: String,
    pub nombre: Option<String>,
    pub codigo: Option<String>,
    pub descripcion: Option<String>,
    pub zona_horaria: String,
    pub formato_fecha: String,
    pub dias_aviso_vencimiento: i64,
    pub requiere_aprobacion: bool,
    pub stock_minimo_default: Option<i64>,
    // Datos de la empresa (sucursal principal y datos fiscales/contacto).
    pub pais: Option<String>,
    pub ciudad: Option<String>,
    pub direccion: Option<String>,
    pub codigo_postal: Option<String>,
    pub razon_social: Option<String>,
    pub documento_fiscal: Option<String>,
    pub direccion_fiscal: Option<String>,
    pub telefono: Option<String>,
    pub email_contacto: Option<String>,
    pub sitio_web: Option<String>,
    pub latitud: Option<f64>,
    pub longitud: Option<f64>,
    // Tema de la UI (DESIGN §3.1): paleta global y modo claro/oscuro.
    pub tema_id: String,
    pub modo_oscuro: bool,
    pub updated_by: Option<String>,
    pub updated_at: String,
}

/// Cambios aceptados sobre la configuración de empresa. Todos opcionales:
/// solo se actualizan los campos presentes.
#[derive(Debug, Clone, Default, Deserialize)]
pub struct EditarConfiguracionEmpresa {
    pub nombre: Option<Option<String>>,
    pub codigo: Option<Option<String>>,
    pub descripcion: Option<Option<String>>,
    pub zona_horaria: Option<String>,
    pub formato_fecha: Option<String>,
    pub dias_aviso_vencimiento: Option<i64>,
    pub requiere_aprobacion: Option<bool>,
    pub stock_minimo_default: Option<Option<i64>>,
    pub pais: Option<Option<String>>,
    pub ciudad: Option<Option<String>>,
    pub direccion: Option<Option<String>>,
    pub codigo_postal: Option<Option<String>>,
    pub razon_social: Option<Option<String>>,
    pub documento_fiscal: Option<Option<String>>,
    pub direccion_fiscal: Option<Option<String>>,
    pub telefono: Option<Option<String>>,
    pub email_contacto: Option<Option<String>>,
    pub sitio_web: Option<Option<String>>,
    pub latitud: Option<Option<f64>>,
    pub longitud: Option<Option<f64>>,
    /// Id de la paleta de tema (DESIGN §3.1). `None` = no tocar; se valida
    /// contra la lista de paletas predefinidas.
    pub tema_id: Option<String>,
    /// Modo oscuro global (interruptor claro/oscuro). `None` = no tocar.
    pub modo_oscuro: Option<bool>,
}

impl EditarConfiguracionEmpresa {
    /// Valida los valores que sí vienen, sin inventar reglas nuevas: la zona
    /// horaria debe existir en la lista soportada y el formato de fecha en el
    /// enum; los umbrales no pueden ser negativos; las coordenadas dentro de
    /// rangos geográficos plausibles.
    pub fn validar(&self) -> AppResult<()> {
        if let Some(z) = &self.zona_horaria
            && !ZONAS_HORARIAS.contains(&z.as_str())
        {
            return Err(AppError::CampoInvalido(format!(
                "zona_horaria '{z}' no soportada"
            )));
        }
        if let Some(f) = &self.formato_fecha
            && FormatoFecha::parse(f).is_none()
        {
            return Err(AppError::CampoInvalido(format!(
                "formato_fecha '{f}' no soportado"
            )));
        }
        if let Some(d) = self.dias_aviso_vencimiento
            && d < 0
        {
            return Err(AppError::CampoInvalido(
                "dias_aviso_vencimiento no puede ser negativo".into(),
            ));
        }
        if let Some(Some(m)) = self.stock_minimo_default
            && m < 0
        {
            return Err(AppError::CampoInvalido(
                "stock_minimo_default no puede ser negativo".into(),
            ));
        }
        if let Some(Some(lat)) = self.latitud
            && !(-90.0..=90.0).contains(&lat)
        {
            return Err(AppError::CampoInvalido(
                "latitud fuera de rango (-90 a 90)".into(),
            ));
        }
        if let Some(Some(lng)) = self.longitud
            && !(-180.0..=180.0).contains(&lng)
        {
            return Err(AppError::CampoInvalido(
                "longitud fuera de rango (-180 a 180)".into(),
            ));
        }
        if let Some(t) = &self.tema_id
            && !crate::domain::tema::es_tema_valido(t)
        {
            return Err(AppError::CampoInvalido(format!(
                "tema '{t}' no existe en la lista de paletas"
            )));
        }
        Ok(())
    }
}

/// Preferencias personales de un usuario. `None` en zona horaria/formato de
/// fecha significa "heredar de la configuración de empresa".
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PreferenciasUsuario {
    pub usuario_id: String,
    pub tamano_fuente: String,
    pub orden_sidebar: Option<String>,
    pub zona_horaria: Option<String>,
    pub formato_fecha: Option<String>,
    /// Paleta de tema propia; `None` = heredar de la empresa.
    pub tema_id: Option<String>,
    /// Modo oscuro propio; `None` = heredar de la empresa.
    pub modo_oscuro: Option<bool>,
    /// ¿Mostrar sugerencias de Ayuda en el command palette (Ctrl+K)?
    pub ayuda_en_palette: bool,
    pub updated_at: String,
}

/// Preferencias **resueltas** de la sesión activa: los valores efectivos que
/// la UI debe usar, con los fallbacks de la empresa ya aplicados. Es lo que
/// consume el frontend para formatear fechas, escalar la fuente y ordenar el
/// sidebar sin necesidad de permiso sobre `configuracion` (SPEC §14.4). Para
/// el tema, además del valor resuelto se informa si se heredó de la empresa
/// (para que la UI muestre "heredar" o un valor propio).
#[derive(Debug, Clone, Serialize)]
pub struct PreferenciasResueltas {
    pub usuario_id: String,
    pub tamano_fuente: String,
    pub orden_sidebar: Option<String>,
    pub zona_horaria: String,
    pub formato_fecha: String,
    pub dias_aviso_vencimiento: i64,
    pub requiere_aprobacion: bool,
    pub stock_minimo_default: Option<i64>,
    pub tema_id: String,
    pub tema_heredado: bool,
    pub modo_oscuro: bool,
    pub modo_oscuro_heredado: bool,
    /// ¿Mostrar sugerencias de Ayuda en el command palette (Ctrl+K)?
    pub ayuda_en_palette: bool,
}

/// Cambios aceptados sobre las preferencias de un usuario. Todos opcionales.
#[derive(Debug, Clone, Default, Deserialize)]
pub struct EditarPreferenciasUsuario {
    pub tamano_fuente: Option<String>,
    pub orden_sidebar: Option<Option<String>>,
    pub zona_horaria: Option<Option<String>>,
    pub formato_fecha: Option<Option<String>>,
    /// Paleta de tema propia: `None` = no tocar, `Some(None)` = heredar de la
    /// empresa, `Some(Some(id))` = fijar paleta (se valida contra la lista).
    pub tema_id: Option<Option<String>>,
    /// Modo oscuro propio: `None` = no tocar, `Some(None)` = heredar,
    /// `Some(Some(bool))` = fijar modo.
    pub modo_oscuro: Option<Option<bool>>,
    /// Mostrar ayuda en el command palette: `None` = no tocar.
    pub ayuda_en_palette: Option<bool>,
}

impl EditarPreferenciasUsuario {
    pub fn validar(&self) -> AppResult<()> {
        if let Some(t) = &self.tamano_fuente
            && TamanioFuente::parse(t).is_none()
        {
            return Err(AppError::CampoInvalido(format!(
                "tamano_fuente '{t}' no soportado"
            )));
        }
        if let Some(Some(z)) = &self.zona_horaria
            && !ZONAS_HORARIAS.contains(&z.as_str())
        {
            return Err(AppError::CampoInvalido(format!(
                "zona_horaria '{z}' no soportada"
            )));
        }
        if let Some(Some(f)) = &self.formato_fecha
            && FormatoFecha::parse(f).is_none()
        {
            return Err(AppError::CampoInvalido(format!(
                "formato_fecha '{f}' no soportado"
            )));
        }
        if let Some(Some(t)) = &self.tema_id
            && !crate::domain::tema::es_tema_valido(t)
        {
            return Err(AppError::CampoInvalido(format!(
                "tema '{t}' no existe en la lista de paletas"
            )));
        }
        Ok(())
    }
}

// ============ Sucursales ============

/// Sucursal / punto de operación de la empresa con ubicación geográfica.
/// La gestiona el ADMIN con el permiso `configuracion:ver/editar` (no es un
/// recurso de negocio del SPEC: es un dato de configuración de la empresa).
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Sucursal {
    pub id: String,
    pub codigo: String,
    pub nombre: String,
    pub pais: Option<String>,
    pub ciudad: Option<String>,
    pub direccion: Option<String>,
    pub latitud: Option<f64>,
    pub longitud: Option<f64>,
    pub activo: bool,
    #[serde(flatten)]
    pub auditoria: super::Auditoria,
}

#[derive(Debug, Clone, Default, Deserialize)]
pub struct NuevaSucursal {
    pub codigo: String,
    pub nombre: String,
    #[serde(default)]
    pub pais: Option<String>,
    #[serde(default)]
    pub ciudad: Option<String>,
    #[serde(default)]
    pub direccion: Option<String>,
    #[serde(default)]
    pub latitud: Option<f64>,
    #[serde(default)]
    pub longitud: Option<f64>,
    #[serde(skip_deserializing, default)]
    pub created_by: Option<String>,
}

#[derive(Debug, Clone, Default, Deserialize)]
pub struct EditarSucursal {
    pub nombre: Option<String>,
    pub pais: Option<Option<String>>,
    pub ciudad: Option<Option<String>>,
    pub direccion: Option<Option<String>>,
    pub latitud: Option<Option<f64>>,
    pub longitud: Option<Option<f64>>,
}

impl NuevaSucursal {
    pub fn validar(&self) -> AppResult<()> {
        if self.codigo.trim().is_empty() {
            return Err(AppError::CampoRequerido("codigo".into()));
        }
        if self.nombre.trim().is_empty() {
            return Err(AppError::CampoRequerido("nombre".into()));
        }
        validar_coordenadas(self.latitud, self.longitud)?;
        Ok(())
    }
}

impl EditarSucursal {
    pub fn validar(&self) -> AppResult<()> {
        if let Some(n) = &self.nombre
            && n.trim().is_empty()
        {
            return Err(AppError::CampoRequerido("nombre".into()));
        }
        validar_coordenadas(self.latitud.and_then(|l| l), self.longitud.and_then(|l| l))?;
        Ok(())
    }
}

fn validar_coordenadas(lat: Option<f64>, lng: Option<f64>) -> AppResult<()> {
    if let Some(lat) = lat
        && !(-90.0..=90.0).contains(&lat)
    {
        return Err(AppError::CampoInvalido(
            "latitud fuera de rango (-90 a 90)".into(),
        ));
    }
    if let Some(lng) = lng
        && !(-180.0..=180.0).contains(&lng)
    {
        return Err(AppError::CampoInvalido(
            "longitud fuera de rango (-180 a 180)".into(),
        ));
    }
    Ok(())
}

// ============ Archivos de empresa (logo + documentos) ============

/// Archivo adjunto de la empresa. Los bytes se guardan en SQLite (BLOB) y
/// viajan en base64 por IPC/HTTP; la UI los muestra con un data URL.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ArchivoEmpresa {
    pub id: String,
    pub nombre: String,
    pub tipo: String,
    pub mime: String,
    pub tamano: i64,
    pub created_by: Option<String>,
    pub created_at: String,
}

/// Archivo con su contenido (para descargar/ver). `datos_base64` es el
/// contenido codificado; nunca se lista junto a los metadatos por payload.
#[derive(Debug, Clone, Serialize)]
pub struct ArchivoEmpresaCompleto {
    pub id: String,
    pub nombre: String,
    pub tipo: String,
    pub mime: String,
    pub tamano: i64,
    pub created_at: String,
    pub datos_base64: String,
}

/// Subida de un archivo: nombre, tipo (LOGO | DOCUMENTO), mime y bytes en
/// base64. Límites de tamaño (para no dejar crecer la db sin control):
/// logo ≤ 2 MB, documento ≤ 10 MB.
#[derive(Debug, Clone, Deserialize)]
pub struct NuevoArchivoEmpresa {
    pub nombre: String,
    pub tipo: String,
    pub mime: String,
    pub datos_base64: String,
    #[serde(skip_deserializing, default)]
    pub created_by: Option<String>,
}

pub const TIPO_ARCHIVO_LOGO: &str = "LOGO";
pub const TIPO_ARCHIVO_DOCUMENTO: &str = "DOCUMENTO";
pub const MAX_LOGO_BYTES: usize = 2 * 1024 * 1024;
pub const MAX_DOCUMENTO_BYTES: usize = 10 * 1024 * 1024;

impl NuevoArchivoEmpresa {
    pub fn validar(&self) -> AppResult<()> {
        if self.nombre.trim().is_empty() {
            return Err(AppError::CampoRequerido("nombre".into()));
        }
        if self.tipo != TIPO_ARCHIVO_LOGO && self.tipo != TIPO_ARCHIVO_DOCUMENTO {
            return Err(AppError::CampoInvalido(format!(
                "tipo de archivo '{}' no soportado",
                self.tipo
            )));
        }
        let bytes = base64_decode(&self.datos_base64)?;
        let limite = if self.tipo == TIPO_ARCHIVO_LOGO {
            MAX_LOGO_BYTES
        } else {
            MAX_DOCUMENTO_BYTES
        };
        if bytes.len() > limite {
            return Err(AppError::CampoInvalido(format!(
                "el archivo supera el límite de {} bytes",
                limite
            )));
        }
        if bytes.is_empty() {
            return Err(AppError::CampoInvalido("el archivo está vacío".into()));
        }
        Ok(())
    }
}

/// Decodifica base64 a bytes (los datos llegan del frontend codificados).
pub fn base64_decode(s: &str) -> AppResult<Vec<u8>> {
    use base64::Engine;
    base64::engine::general_purpose::STANDARD
        .decode(s)
        .map_err(|_| AppError::CampoInvalido("datos_base64 no es base64 válido".into()))
}

/// Codifica bytes a base64 (para devolver el contenido al frontend).
pub fn base64_encode(bytes: &[u8]) -> String {
    use base64::Engine;
    base64::engine::general_purpose::STANDARD.encode(bytes)
}
