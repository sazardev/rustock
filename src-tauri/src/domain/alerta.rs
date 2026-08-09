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

/// Comentario anclado a cualquier entidad (SPEC §12).
#[allow(dead_code)]
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Comentario {
    pub id: String,
    pub entidad: String,
    pub entidad_id: String,
    pub usuario_id: String,
    pub texto: String,
    pub editado: bool,
    pub oculto: bool,
    pub created_at: String,
    pub updated_at: String,
}

#[allow(dead_code)]
#[derive(Debug, Clone, Deserialize)]
pub struct NuevoComentario {
    pub entidad: String,
    pub entidad_id: String,
    pub usuario_id: String,
    pub texto: String,
}

impl NuevoComentario {
    #[allow(dead_code)]
    pub fn validar(&self) -> Result<(), crate::error::AppError> {
        if self.texto.trim().is_empty() {
            return Err(crate::error::AppError::CampoRequerido("texto".into()));
        }
        Ok(())
    }
}
