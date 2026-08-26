use serde::{Deserialize, Serialize};

/// Sesión de inventario (SPEC §11.1).
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SesionInventario {
    pub id: String,
    pub numero: String,
    pub tipo: String,
    pub estado: String,
    pub almacen_id: String,
    pub alcance: Option<String>,
    pub fecha_inicio: Option<String>,
    pub fecha_fin: Option<String>,
    pub responsable_id: Option<String>,
    pub conteo_ciego: bool,
    pub exige_doble_conteo: bool,
    pub created_by: String,
    pub created_at: String,
    pub closed_by: Option<String>,
    pub closed_at: Option<String>,
    pub anulado_by: Option<String>,
    pub anulado_at: Option<String>,
}

#[derive(Debug, Clone, Deserialize)]
pub struct NuevaSesionInventario {
    pub tipo: String,
    pub almacen_id: String,
    #[serde(default)]
    pub alcance: Option<String>,
    #[serde(default)]
    pub fecha_inicio: Option<String>,
    #[serde(default)]
    pub fecha_fin: Option<String>,
    #[serde(default)]
    pub responsable_id: Option<String>,
    #[serde(default)]
    pub conteo_ciego: bool,
    #[serde(default)]
    pub exige_doble_conteo: bool,
    /// Nunca llega por IPC: lo resuelve el comando desde la sesión activa (SPEC §4.1).
    #[serde(skip_deserializing, default)]
    pub created_by: String,
}

/// Registro de conteo (SPEC §11.4).
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Conteo {
    pub id: String,
    pub sesion_id: String,
    pub ubicacion_id: String,
    pub producto_id: String,
    pub lote_id: Option<String>,
    pub cantidad_contada: i64,
    pub conteo_numero: i64,
    pub usuario_contador_id: String,
    pub timestamp: String,
    pub nota: Option<String>,
}

fn default_conteo_numero() -> i64 {
    1
}

#[derive(Debug, Clone, Deserialize)]
pub struct NuevoConteo {
    pub sesion_id: String,
    pub ubicacion_id: String,
    pub producto_id: String,
    #[serde(default)]
    pub lote_id: Option<String>,
    pub cantidad_contada: i64,
    #[serde(default = "default_conteo_numero")]
    pub conteo_numero: i64,
    /// Nunca llega por IPC: lo resuelve el comando desde la sesión activa (SPEC §4.1).
    #[serde(skip_deserializing, default)]
    pub usuario_contador_id: String,
    #[serde(default)]
    pub nota: Option<String>,
}

impl NuevoConteo {
    pub fn validar(&self) -> Result<(), crate::error::AppError> {
        if self.cantidad_contada < 0 {
            return Err(crate::error::AppError::CampoRequerido(
                "cantidad_contada (>= 0)".into(),
            ));
        }
        if self.conteo_numero < 1 {
            return Err(crate::error::AppError::CampoRequerido(
                "conteo_numero (>= 1)".into(),
            ));
        }
        Ok(())
    }
}

/// Resultado de la conciliación de una línea (SPEC §11.5).
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DiferenciaInventario {
    pub ubicacion_id: String,
    pub producto_id: String,
    pub lote_id: Option<String>,
    pub saldo_sistema: i64,
    pub cantidad_contada: i64,
    pub diferencia: i64,
    pub tipo: String, // "conciliado" | "sobrante" | "faltante"
}

/// Métricas de precisión de una sesión cerrada (SPEC §11.6). Toma el último
/// conteo (`conteo_numero` más alto) por (ubicación, producto, lote). Una
/// unidad "correcta" es la unidad contada menos la diferencia absoluta de su
/// línea (SPEC §16.3: precisión por cantidad).
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PrecisionSesion {
    pub sesion_id: String,
    pub skus_contados: i64,
    pub skus_exactos: i64,
    pub precision_sku: f64,
    pub unidades_contadas: i64,
    pub unidades_correctas: i64,
    pub precision_cantidad: f64,
    pub ubicaciones_contadas: i64,
    pub ubicaciones_exactas: i64,
    pub exactitud_ubicacion: f64,
}
