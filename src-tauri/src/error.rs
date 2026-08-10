use serde::Serialize;

/// Errores de dominio de Rustock (SPEC §14.2, §15.10).
/// Mensajes claros, en español, listos para mostrar al usuario.
#[allow(dead_code)]
#[derive(Debug, thiserror::Error)]
pub enum AppError {
    #[error(
        "Saldo insuficiente en {ubicacion}: {disponible} disponibles, se intentaron {intentado}"
    )]
    SaldoInsuficiente {
        ubicacion: String,
        disponible: i64,
        intentado: i64,
    },

    #[error("El saldo no puede quedar negativo en {ubicacion} (producto {producto})")]
    SaldoNegativo { ubicacion: String, producto: String },

    #[error("El código '{0}' ya existe")]
    CodigoDuplicado(String),

    #[error("El campo '{0}' es obligatorio")]
    CampoRequerido(String),

    #[error("El motivo es obligatorio (mínimo 3 caracteres)")]
    MotivoRequerido,

    #[error("El lote '{0}' está vencido y no puede salir a cliente ni devolverse al proveedor")]
    LoteVencido(String),

    #[error("El producto '{0}' controla lote: todo movimiento debe indicar lote")]
    LoteRequerido(String),

    #[error("No se encontró {0} con id '{1}'")]
    NoEncontrado(&'static str, String),

    #[error("No se puede desactivar {0} porque tiene saldo > 0")]
    DesactivarConSaldo(&'static str),

    #[error("La ubicación '{0}' supera su capacidad máxima")]
    CapacidadExcedida(String),

    #[error("Acción no autorizada: se requiere permiso '{0}'")]
    SinPermiso(String),

    #[error("No hay una sesión activa: inicia sesión para continuar")]
    NoAutenticado,

    #[error("Usuario o contraseña incorrectos")]
    CredencialesInvalidas,

    #[error("La contraseña debe tener al menos 8 caracteres")]
    PasswordDebil,

    #[error("El filtro '{0}' no es válido para este recurso")]
    FiltroInvalido(String),

    #[error("La caja '{0}' está restringida a otro producto/lote")]
    CajaRestringida(String),

    #[error("La entidad {0} está inactiva y no admite esta operación")]
    EntidadInactiva(&'static str),

    #[error("Un movimiento aprobado no puede editarse")]
    MovimientoAprobadoNoEditable,

    #[error("Un movimiento aprobado solo puede anularse; se generará el inverso")]
    MovimientoAprobado,

    #[error("Un movimiento anulado no puede re-aprobarse")]
    MovimientoAnulado,

    #[error("El estado '{0}' no es una transición válida desde '{1}'")]
    TransicionInvalida(String, String),

    #[error("No se puede eliminar {0}: tiene historial asociado")]
    ConHistorial(&'static str),

    #[error("La categoría no puede tener ciclos en su jerarquía")]
    CicloCategoria,

    #[error("Error de base de datos: {0}")]
    Db(#[from] rusqlite::Error),

    #[error("Error de serialización: {0}")]
    Json(#[from] serde_json::Error),
}

impl Serialize for AppError {
    fn serialize<S>(&self, serializer: S) -> Result<S::Ok, S::Error>
    where
        S: serde::Serializer,
    {
        serializer.serialize_str(&self.to_string())
    }
}

pub type AppResult<T> = Result<T, AppError>;
