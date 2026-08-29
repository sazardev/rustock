pub mod alerta;
pub mod catalogo;
pub mod configuracion;
pub mod etiqueta;
pub mod inventario;
pub mod movimiento;
pub mod regla;
pub mod seguridad;
pub mod sesion;
pub mod tema;

use chrono::Utc;
use serde::{Deserialize, Serialize};

/// Campos de auditoría comunes (SPEC §4.5).
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Auditoria {
    pub created_by: Option<String>,
    pub created_at: String,
    pub updated_by: Option<String>,
    pub updated_at: String,
}

/// Código normalizado (SPEC §14.7): mayúsculas, sin espacios al inicio/fin.
pub fn normalizar_codigo(codigo: &str) -> String {
    codigo.trim().to_uppercase()
}

/// Convierte un timestamp en texto ISO-8601 (RFC 3339, UTC).
pub fn ahora() -> String {
    Utc::now().to_rfc3339()
}

#[allow(dead_code)]
pub type FechaHora = String;

/// Resultado paginado unificado (SPEC §15.10).
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Paginado<T> {
    pub data: Vec<T>,
    pub meta: PaginadoMeta,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PaginadoMeta {
    pub total: i64,
    pub page: i64,
    pub page_size: i64,
    pub total_pages: i64,
    pub has_next: bool,
    pub has_prev: bool,
}

impl<T> Paginado<T> {
    pub fn new(data: Vec<T>, total: i64, page: i64, page_size: i64) -> Self {
        let total_pages = if page_size <= 0 {
            1
        } else {
            (total + page_size - 1) / page_size
        };
        let total_pages = total_pages.max(1);
        Self {
            data,
            meta: PaginadoMeta {
                total,
                page,
                page_size,
                total_pages,
                has_next: page < total_pages,
                has_prev: page > 1,
            },
        }
    }
}

/// Resultado de agregación unificado (SPEC §15.7, §15.10).
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Agregado<T> {
    pub groups: Vec<T>,
    pub meta: AgregadoMeta,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AgregadoMeta {
    pub total: i64,
}

/// Respuesta unificada de un listado universal (SPEC §15.10): filas paginadas
/// o grupos agregados, según si la consulta pidió `group_by`.
#[derive(Debug, Clone, Serialize)]
#[serde(untagged)]
pub enum Listado {
    Filas(Paginado<serde_json::Value>),
    Grupos(Agregado<serde_json::Value>),
}

/// Tipo de ubicación (SPEC §3.5).
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "UPPERCASE")]
pub enum TipoUbicacion {
    Standard,
    Picking,
    Reserva,
    Recepcion,
    Cuarentena,
    Devolucion,
    Danado,
    Expedicion,
}

impl TipoUbicacion {
    pub fn as_str(&self) -> &'static str {
        match self {
            Self::Standard => "STANDARD",
            Self::Picking => "PICKING",
            Self::Reserva => "RESERVA",
            Self::Recepcion => "RECEPCION",
            Self::Cuarentena => "CUARENTENA",
            Self::Devolucion => "DEVOLUCION",
            Self::Danado => "DANADO",
            Self::Expedicion => "EXPEDICION",
        }
    }

    pub fn parse(s: &str) -> Option<Self> {
        match s {
            "STANDARD" => Some(Self::Standard),
            "PICKING" => Some(Self::Picking),
            "RESERVA" => Some(Self::Reserva),
            "RECEPCION" => Some(Self::Recepcion),
            "CUARENTENA" => Some(Self::Cuarentena),
            "DEVOLUCION" => Some(Self::Devolucion),
            "DANADO" => Some(Self::Danado),
            "EXPEDICION" => Some(Self::Expedicion),
            _ => None,
        }
    }
}
