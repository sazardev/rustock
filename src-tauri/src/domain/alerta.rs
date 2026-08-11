use serde::{Deserialize, Serialize};

/// Alerta (SPEC §17).
#[allow(dead_code)]
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Alerta {
    pub id: String,
    pub tipo: String,
    pub severidad: String,
    pub entidad: String,
    pub entidad_id: Option<String>,
    pub fecha_deteccion: String,
    pub estado: String,
    pub detalle: Option<String>,
}

/// Recursos válidos para anclar un comentario (SPEC §12.2): cualquier
/// entidad del dominio que ya participe de la matriz de permisos (§4.3).
pub const ENTIDADES_COMENTABLES: &[&str] = &[
    "almacen",
    "zona",
    "rack",
    "seccion",
    "ubicacion",
    "caja",
    "producto",
    "categoria",
    "uom",
    "proveedor",
    "cliente",
    "lote",
    "movimiento",
    "inventario",
    "usuario",
];

/// Comentario anclado a cualquier entidad (SPEC §12).
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Comentario {
    pub id: String,
    pub entidad: String,
    pub entidad_id: String,
    pub usuario_id: String,
    pub texto: String,
    pub editado: bool,
    pub oculto: bool,
    pub oculto_by: Option<String>,
    pub oculto_at: Option<String>,
    pub created_at: String,
    pub updated_at: String,
}

/// Una versión anterior del texto de un comentario (SPEC §12.1: "el texto
/// original no se pierde").
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct HistorialComentario {
    pub id: String,
    pub comentario_id: String,
    pub texto_anterior: String,
    pub editado_by: Option<String>,
    pub editado_at: String,
}

#[derive(Debug, Clone, Deserialize)]
pub struct NuevoComentario {
    pub entidad: String,
    pub entidad_id: String,
    pub texto: String,
    /// Nunca llega por IPC: lo resuelve el comando desde la sesión activa (SPEC §4.1).
    #[serde(skip_deserializing, default)]
    pub usuario_id: String,
}

impl NuevoComentario {
    pub fn validar(&self) -> Result<(), crate::error::AppError> {
        if self.texto.trim().is_empty() {
            return Err(crate::error::AppError::CampoRequerido("texto".into()));
        }
        if !ENTIDADES_COMENTABLES.contains(&self.entidad.as_str()) {
            return Err(crate::error::AppError::CampoRequerido("entidad".into()));
        }
        Ok(())
    }
}
