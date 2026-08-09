use serde::{Deserialize, Serialize};

/// Sesión del sistema (parámetros de configuración).
#[allow(dead_code)]
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ParametroSistema {
    pub clave: String,
    pub valor: String,
    pub descripcion: Option<String>,
    pub updated_at: String,
}
