use serde::{Deserialize, Serialize};

use crate::error::{AppError, AppResult};

/// Tipos de movimiento (SPEC §6.1).
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "UPPERCASE")]
pub enum TipoMovimiento {
    Entrada,
    Salida,
    Traslado,
    Ajuste,
    Consumo,
}

impl TipoMovimiento {
    pub fn as_str(&self) -> &'static str {
        match self {
            Self::Entrada => "ENTRADA",
            Self::Salida => "SALIDA",
            Self::Traslado => "TRASLADO",
            Self::Ajuste => "AJUSTE",
            Self::Consumo => "CONSUMO",
        }
    }
}

/// Sub-tipos según tipo (SPEC §7.1, §8.1).
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "UPPERCASE")]
pub enum SubTipoMovimiento {
    // Entradas (SPEC §7.1)
    Compra,
    DevolucionCliente,
    AjustePositivo,
    Inicial,
    TrasladoEntrada,
    // Salidas (SPEC §8.1)
    Cliente,
    DevolucionProveedor,
    Merma,
    AjusteNegativo,
    TrasladoSalida,
}

impl SubTipoMovimiento {
    pub fn as_str(&self) -> &'static str {
        match self {
            Self::Compra => "COMPRA",
            Self::DevolucionCliente => "DEVOLUCION_CLIENTE",
            Self::AjustePositivo => "AJUSTE_POSITIVO",
            Self::Inicial => "INICIAL",
            Self::TrasladoEntrada => "TRASLADO_ENTRADA",
            Self::Cliente => "CLIENTE",
            Self::DevolucionProveedor => "DEVOLUCION_PROVEEDOR",
            Self::Merma => "MERMA",
            Self::AjusteNegativo => "AJUSTE_NEGATIVO",
            Self::TrasladoSalida => "TRASLADO_SALIDA",
        }
    }

    pub fn parse(s: &str) -> Option<Self> {
        match s {
            "COMPRA" => Some(Self::Compra),
            "DEVOLUCION_CLIENTE" => Some(Self::DevolucionCliente),
            "AJUSTE_POSITIVO" => Some(Self::AjustePositivo),
            "INICIAL" => Some(Self::Inicial),
            "TRASLADO_ENTRADA" => Some(Self::TrasladoEntrada),
            "CLIENTE" => Some(Self::Cliente),
            "DEVOLUCION_PROVEEDOR" => Some(Self::DevolucionProveedor),
            "MERMA" => Some(Self::Merma),
            "AJUSTE_NEGATIVO" => Some(Self::AjusteNegativo),
            "TRASLADO_SALIDA" => Some(Self::TrasladoSalida),
            _ => None,
        }
    }

    /// ¿Es `tipo` coherente con este sub-tipo? Refleja exactamente los casos
    /// que `aprobar_movimiento` sabe ejecutar (match por `tipo` y, dentro de
    /// AJUSTE, por `sub_tipo`). Sin este chequeo, un cliente HTTP/IPC puede
    /// crear combinaciones sin sentido (ej. `ENTRADA` + `MERMA`) que
    /// `aprobar_movimiento` aplica igual: como el efecto de saldo lo decide
    /// `tipo` (no `sub_tipo`), una "merma" así **incrementa** el saldo en vez
    /// de reducirlo, corrompiendo saldos, reportes de mermas/ajustes (SPEC
    /// §16.2) y la trazabilidad (§14.1).
    pub fn tipo_valido(&self, tipo: TipoMovimiento) -> bool {
        use TipoMovimiento as T;
        match self {
            Self::Compra | Self::DevolucionCliente | Self::Inicial | Self::TrasladoEntrada => {
                tipo == T::Entrada
            }
            Self::Cliente | Self::DevolucionProveedor | Self::Merma => tipo == T::Salida,
            // TRASLADO_SALIDA se usa tanto en el traslado intra-almacén
            // (tipo TRASLADO) como en la pierna de salida del traslado
            // inter-almacén (tipo SALIDA, SPEC §9.3).
            Self::TrasladoSalida => matches!(tipo, T::Salida | T::Traslado),
            Self::AjustePositivo | Self::AjusteNegativo => tipo == T::Ajuste,
        }
    }
}

/// Estado del movimiento (SPEC §6.2).
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "UPPERCASE")]
pub enum EstadoMovimiento {
    Borrador,
    PendienteAprobacion,
    Aprobado,
    Anulado,
}

impl EstadoMovimiento {
    pub fn as_str(&self) -> &'static str {
        match self {
            Self::Borrador => "BORRADOR",
            Self::PendienteAprobacion => "PENDIENTE_APROBACION",
            Self::Aprobado => "APROBADO",
            Self::Anulado => "ANULADO",
        }
    }

    pub fn parse(s: &str) -> Option<Self> {
        match s {
            "BORRADOR" => Some(Self::Borrador),
            "PENDIENTE_APROBACION" => Some(Self::PendienteAprobacion),
            "APROBADO" => Some(Self::Aprobado),
            "ANULADO" => Some(Self::Anulado),
            _ => None,
        }
    }
}

/// Línea de movimiento (SPEC §6.1).
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LineaMovimiento {
    pub id: String,
    pub movimiento_id: String,
    pub producto_id: String,
    pub lote_id: Option<String>,
    pub cantidad: i64,
    pub origen_ubicacion_id: Option<String>,
    pub destino_ubicacion_id: Option<String>,
    pub caja_origen_id: Option<String>,
    pub caja_destino_id: Option<String>,
    /// Costo unitario de la entrada (valorización, Fase D). Solo lo portan las
    /// líneas de entrada; alimenta el costo del producto según el método.
    pub costo_unitario: Option<f64>,
}

/// Línea de entrada (creación desde el frontend).
#[derive(Debug, Clone, Deserialize)]
pub struct NuevaLinea {
    pub producto_id: String,
    #[serde(default)]
    pub lote_id: Option<String>,
    pub cantidad: i64,
    #[serde(default)]
    pub origen_ubicacion_id: Option<String>,
    #[serde(default)]
    pub destino_ubicacion_id: Option<String>,
    #[serde(default)]
    pub caja_origen_id: Option<String>,
    #[serde(default)]
    pub caja_destino_id: Option<String>,
    /// Costo unitario opcional de la línea (entradas; valorización Fase D).
    #[serde(default)]
    pub costo_unitario: Option<f64>,
}

/// Movimiento completo (SPEC §6.1).
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Movimiento {
    pub id: String,
    pub tipo: String,
    pub sub_tipo: String,
    pub numero: String,
    pub estado: String,
    pub fecha_movimiento: String,
    pub motivo: Option<String>,
    pub origen_ubicacion_id: Option<String>,
    pub destino_ubicacion_id: Option<String>,
    pub proveedor_id: Option<String>,
    pub cliente_id: Option<String>,
    pub sesion_inventario_id: Option<String>,
    pub documento_referencia: Option<String>,
    pub notas: Option<String>,
    pub movimiento_inverso_id: Option<String>,
    pub created_by: String,
    pub created_at: String,
    pub approved_by: Option<String>,
    pub approved_at: Option<String>,
    pub anulado_by: Option<String>,
    pub anulado_at: Option<String>,
}

/// Creación de movimiento desde el frontend.
#[derive(Debug, Clone, Deserialize)]
pub struct NuevoMovimiento {
    pub tipo: String,
    pub sub_tipo: String,
    #[serde(default)]
    pub fecha_movimiento: Option<String>,
    #[serde(default)]
    pub motivo: Option<String>,
    #[serde(default)]
    pub origen_ubicacion_id: Option<String>,
    #[serde(default)]
    pub destino_ubicacion_id: Option<String>,
    #[serde(default)]
    pub proveedor_id: Option<String>,
    #[serde(default)]
    pub cliente_id: Option<String>,
    #[serde(default)]
    pub sesion_inventario_id: Option<String>,
    #[serde(default)]
    pub documento_referencia: Option<String>,
    #[serde(default)]
    pub notas: Option<String>,
    pub lineas: Vec<NuevaLinea>,
    /// Nunca llega por IPC: lo resuelve el comando desde la sesión activa (SPEC §4.1).
    #[serde(skip_deserializing, default)]
    pub created_by: String,
}

impl NuevoMovimiento {
    pub fn tipo(&self) -> AppResult<TipoMovimiento> {
        match self.tipo.as_str() {
            "ENTRADA" => Ok(TipoMovimiento::Entrada),
            "SALIDA" => Ok(TipoMovimiento::Salida),
            "TRASLADO" => Ok(TipoMovimiento::Traslado),
            "AJUSTE" => Ok(TipoMovimiento::Ajuste),
            "CONSUMO" => Ok(TipoMovimiento::Consumo),
            _ => Err(AppError::CampoRequerido("tipo".into())),
        }
    }

    pub fn sub_tipo(&self) -> AppResult<SubTipoMovimiento> {
        SubTipoMovimiento::parse(&self.sub_tipo)
            .ok_or_else(|| AppError::CampoRequerido("sub_tipo".into()))
    }

    /// Reglas de negocio comunes al crear (SPEC §6, §7, §8, §10).
    pub fn validar(&self) -> AppResult<()> {
        // Al menos una línea, todas con cantidad > 0 (SPEC §6.1).
        if self.lineas.is_empty() {
            return Err(AppError::CampoRequerido("lineas".into()));
        }
        for linea in &self.lineas {
            if linea.cantidad <= 0 {
                return Err(AppError::CampoRequerido("cantidad (> 0)".into()));
            }
        }

        // Coherencia tipo/sub_tipo (SPEC §6.1, §7.1, §8.1, §9): un sub_tipo
        // fuera de su familia (ej. ENTRADA + MERMA) produciría un efecto de
        // saldo indefinido al aprobar.
        let tipo = self.tipo()?;
        let subtipo = self.sub_tipo()?;
        if !subtipo.tipo_valido(tipo) {
            return Err(AppError::CampoInvalido(format!(
                "sub_tipo '{}' no es válido para tipo '{}'",
                subtipo.as_str(),
                tipo.as_str()
            )));
        }

        // Ajustes y mermas: motivo obligatorio (SPEC §7.4, §8.4, §8.5, §10.3).
        let requiere_motivo = matches!(
            subtipo,
            SubTipoMovimiento::AjustePositivo
                | SubTipoMovimiento::AjusteNegativo
                | SubTipoMovimiento::Merma
        );
        if requiere_motivo {
            let motivo = self.motivo.as_deref().unwrap_or("").trim();
            if motivo.len() < 3 {
                return Err(AppError::MotivoRequerido);
            }
        }
        Ok(())
    }
}

/// Cambios aceptados sobre un movimiento en `BORRADOR`/`PENDIENTE_APROBACION`
/// (SPEC §6.2: un aprobado no se edita). Solo el creador puede editarlo.
/// `tipo`/`sub_tipo`/`numero` son estables (definen la semántica); se
/// actualizan los campos operativos y se reemplazan las líneas. Los campos
/// opcionales son `Option<Option<T>>`: `None` = no tocar, `Some(None)` =
/// dejar nulo, `Some(Some(v))` = fijar valor.
#[derive(Debug, Clone, Deserialize)]
pub struct EditarMovimiento {
    #[serde(default)]
    pub fecha_movimiento: Option<String>,
    #[serde(default)]
    pub motivo: Option<Option<String>>,
    #[serde(default)]
    pub proveedor_id: Option<Option<String>>,
    #[serde(default)]
    pub cliente_id: Option<Option<String>>,
    #[serde(default)]
    pub documento_referencia: Option<Option<String>>,
    #[serde(default)]
    pub notas: Option<Option<String>>,
    pub lineas: Vec<NuevaLinea>,
}

/// Solicitud de traslado (SPEC §9). Es una línea única: producto, lote,
/// cantidad y su par origen/destino. Si origen y destino resuelven al mismo
/// almacén se crea un solo movimiento `TRASLADO`; si no, dos movimientos
/// ligados (SPEC §9.3) — ver `TrasladoCreado`.
#[derive(Debug, Clone, Deserialize)]
pub struct NuevoTraslado {
    pub producto_id: String,
    #[serde(default)]
    pub lote_id: Option<String>,
    pub cantidad: i64,
    pub origen_ubicacion_id: String,
    pub destino_ubicacion_id: String,
    #[serde(default)]
    pub caja_origen_id: Option<String>,
    #[serde(default)]
    pub caja_destino_id: Option<String>,
    #[serde(default)]
    pub documento_referencia: Option<String>,
    #[serde(default)]
    pub notas: Option<String>,
    /// Nunca llega por IPC: lo resuelve el comando desde la sesión activa (SPEC §4.1).
    #[serde(skip_deserializing, default)]
    pub created_by: String,
}

/// Resultado de crear un traslado: un único movimiento si es intra-almacén,
/// o dos movimientos ligados por el mismo `documento_referencia` si es
/// inter-almacén (SPEC §9.3): `salida` es el `TRASLADO`/`SALIDA` según el
/// caso, `entrada` solo existe cuando hubo que cruzar de almacén.
#[derive(Debug, Clone, Serialize)]
pub struct TrasladoCreado {
    pub salida: Movimiento,
    pub entrada: Option<Movimiento>,
}

/// Saldo materializado (SPEC §5, §15.11).
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Saldo {
    pub ubicacion_id: String,
    pub producto_id: String,
    pub lote_id: Option<String>,
    pub cantidad: i64,
    pub updated_at: String,
}
