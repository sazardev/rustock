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

    #[error("El valor '{0}' no es válido")]
    CampoInvalido(String),

    #[error("La contraseña actual no coincide")]
    PasswordActualIncorrecta,

    #[error("El sistema quedaría sin ningún administrador activo")]
    UltimoAdmin,

    #[error("El motivo es obligatorio (mínimo 3 caracteres)")]
    MotivoRequerido,

    /// La instalación está mal configurada. No es un error de negocio: se da
    /// al arrancar, ante quien despliega, y por eso el mensaje dice qué campo
    /// arreglar en vez de traducirse para el operador de almacén.
    #[error("Configuración inválida: {0}")]
    Configuracion(String),

    #[error("No se pudo completar la copia de seguridad: {0}")]
    Backup(String),

    #[error("El lote '{0}' está vencido y no puede salir a cliente ni devolverse al proveedor")]
    LoteVencido(String),

    #[error("El producto '{0}' controla lote: todo movimiento debe indicar lote")]
    LoteRequerido(String),

    #[error("No se encontró {0} con id '{1}'")]
    NoEncontrado(&'static str, String),

    #[error("No se puede desactivar {0} porque tiene saldo > 0")]
    DesactivarConSaldo(&'static str),

    #[error("Regla de negocio '{regla}': {detalle}")]
    ReglaIncumplida { regla: String, detalle: String },

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

    #[error(
        "No se puede aplicar un ajuste manual en {0}: hay una sesión de inventario en curso en este almacén. Regístralo como diferencia de la sesión"
    )]
    AjusteBloqueadoPorInventario(String),

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

    #[error(
        "El {tipo_a} '{codigo_a}' se solapa con el {tipo_b} '{codigo_b}' en el mapa. Ajusta la posición o el tamaño para que no coincidan"
    )]
    SolapeMapa {
        tipo_a: &'static str,
        codigo_a: String,
        tipo_b: &'static str,
        codigo_b: String,
    },

    #[error("El tamaño del {0} no es válido: ancho y profundidad deben ser mayores a {1} unidades")]
    DimensionInvalida(&'static str, i64),

    #[error("Error de base de datos: {0}")]
    Db(#[from] rusqlite::Error),

    #[error("Error de serialización: {0}")]
    Json(#[from] serde_json::Error),
}

impl AppError {
    /// Código estable del error (SPEC §17.3).
    ///
    /// Es lo que la interfaz traduce. El mensaje en castellano sigue viajando
    /// para los registros y como respaldo, pero **no es lo que se muestra**:
    /// si lo fuera, quien use Rustock en inglés recibiría los errores en
    /// castellano justo cuando más importa entender qué ha pasado.
    ///
    /// Los códigos no cambian nunca aunque se reescriba el mensaje: son
    /// contrato con el cliente, igual que un nombre de campo.
    pub fn codigo(&self) -> &'static str {
        match self {
            Self::SaldoInsuficiente { .. } => "SALDO_INSUFICIENTE",
            Self::SaldoNegativo { .. } => "SALDO_NEGATIVO",
            Self::CodigoDuplicado(_) => "CODIGO_DUPLICADO",
            Self::CampoRequerido(_) => "CAMPO_REQUERIDO",
            Self::CampoInvalido(_) => "CAMPO_INVALIDO",
            Self::PasswordActualIncorrecta => "PASSWORD_ACTUAL_INCORRECTA",
            Self::UltimoAdmin => "ULTIMO_ADMIN",
            Self::MotivoRequerido => "MOTIVO_REQUERIDO",
            Self::Configuracion(_) => "CONFIGURACION",
            Self::Backup(_) => "BACKUP",
            Self::LoteVencido(_) => "LOTE_VENCIDO",
            Self::LoteRequerido(_) => "LOTE_REQUERIDO",
            Self::NoEncontrado(..) => "NO_ENCONTRADO",
            Self::DesactivarConSaldo(_) => "DESACTIVAR_CON_SALDO",
            Self::ReglaIncumplida { .. } => "REGLA_INCUMPLIDA",
            Self::CapacidadExcedida(_) => "CAPACIDAD_EXCEDIDA",
            Self::SinPermiso(_) => "SIN_PERMISO",
            Self::NoAutenticado => "NO_AUTENTICADO",
            Self::CredencialesInvalidas => "CREDENCIALES_INVALIDAS",
            Self::PasswordDebil => "PASSWORD_DEBIL",
            Self::FiltroInvalido(_) => "FILTRO_INVALIDO",
            Self::CajaRestringida(_) => "CAJA_RESTRINGIDA",
            Self::AjusteBloqueadoPorInventario(_) => "AJUSTE_BLOQUEADO_POR_INVENTARIO",
            Self::EntidadInactiva(_) => "ENTIDAD_INACTIVA",
            Self::MovimientoAprobadoNoEditable => "MOVIMIENTO_APROBADO_NO_EDITABLE",
            Self::MovimientoAprobado => "MOVIMIENTO_APROBADO",
            Self::MovimientoAnulado => "MOVIMIENTO_ANULADO",
            Self::TransicionInvalida(..) => "TRANSICION_INVALIDA",
            Self::ConHistorial(_) => "CON_HISTORIAL",
            Self::CicloCategoria => "CICLO_CATEGORIA",
            Self::SolapeMapa { .. } => "SOLAPE_MAPA",
            Self::DimensionInvalida(..) => "DIMENSION_INVALIDA",
            Self::Db(_) => "ERROR_BASE_DE_DATOS",
            Self::Json(_) => "ERROR_SERIALIZACION",
        }
    }

    /// Datos con los que la interfaz redacta la frase en su idioma.
    ///
    /// Los nombres de los campos son parte del contrato: cambiarlos rompe la
    /// traducción igual que cambiar el nombre de una columna rompe una consulta.
    pub fn datos(&self) -> serde_json::Value {
        use serde_json::json;
        match self {
            Self::SaldoInsuficiente {
                ubicacion,
                disponible,
                intentado,
            } => {
                json!({ "ubicacion": ubicacion, "disponible": disponible, "intentado": intentado })
            }
            Self::SaldoNegativo {
                ubicacion,
                producto,
            } => json!({ "ubicacion": ubicacion, "producto": producto }),
            Self::CodigoDuplicado(v) => json!({ "codigo": v }),
            Self::CampoRequerido(v) | Self::CampoInvalido(v) => json!({ "campo": v }),
            Self::LoteVencido(v) => json!({ "lote": v }),
            Self::LoteRequerido(v) => json!({ "producto": v }),
            Self::NoEncontrado(entidad, id) => json!({ "entidad": entidad, "id": id }),
            Self::DesactivarConSaldo(entidad)
            | Self::EntidadInactiva(entidad)
            | Self::ConHistorial(entidad) => json!({ "entidad": entidad }),
            Self::ReglaIncumplida { regla, detalle } => {
                json!({ "regla": regla, "detalle": detalle })
            }
            Self::CapacidadExcedida(v) | Self::AjusteBloqueadoPorInventario(v) => {
                json!({ "ubicacion": v })
            }
            Self::SinPermiso(v) => json!({ "permiso": v }),
            Self::FiltroInvalido(v) => json!({ "filtro": v }),
            Self::CajaRestringida(v) => json!({ "caja": v }),
            Self::TransicionInvalida(destino, origen) => {
                json!({ "destino": destino, "origen": origen })
            }
            Self::SolapeMapa {
                tipo_a,
                codigo_a,
                tipo_b,
                codigo_b,
            } => json!({
                "tipoA": tipo_a, "codigoA": codigo_a,
                "tipoB": tipo_b, "codigoB": codigo_b
            }),
            Self::DimensionInvalida(entidad, minimo) => {
                json!({ "entidad": entidad, "minimo": minimo })
            }
            Self::Db(e) => json!({ "detalle": e.to_string() }),
            Self::Json(e) => json!({ "detalle": e.to_string() }),
            // Los errores sin datos no llevan nada: la frase se basta sola.
            _ => json!({}),
        }
    }
}

impl Serialize for AppError {
    /// Se serializa como objeto, no como texto: la interfaz necesita el código
    /// y los datos para redactar la frase en el idioma activo (SPEC §17.3).
    /// `mensaje` viaja también, para los registros y como respaldo si aparece
    /// un código que el diccionario todavía no conoce.
    fn serialize<S>(&self, serializer: S) -> Result<S::Ok, S::Error>
    where
        S: serde::Serializer,
    {
        use serde::ser::SerializeStruct;
        let mut estado = serializer.serialize_struct("AppError", 3)?;
        estado.serialize_field("codigo", self.codigo())?;
        estado.serialize_field("datos", &self.datos())?;
        estado.serialize_field("mensaje", &self.to_string())?;
        estado.end()
    }
}

pub type AppResult<T> = Result<T, AppError>;
