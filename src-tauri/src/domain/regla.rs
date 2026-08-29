//! Reglas de negocio configurables (SPEC §16).
//!
//! El almacén de cada cliente tiene restricciones que no caben en el modelo
//! general: un rack que no aguanta más de 800 kg, un pasillo de refrigerados
//! donde no puede entrar química, una zona de picking que solo admite un
//! producto por ubicación. Codificarlas en Rust obligaría a recompilar por
//! cliente; dejarlas fuera obliga a confiar en que nadie se equivoque.
//!
//! Una regla es una frase con tres partes: **dónde** aplica (ámbito), **qué**
//! limita o prohíbe (tipo), y **qué pasa si se incumple** (severidad).
//!
//!   "En el RACK-A1 (dónde), el peso total no puede pasar de 800 kg (qué), y
//!    si se pasa no se aprueba el movimiento (severidad)."
//!
//! Las reglas no inventan datos: se evalúan sobre lo que ya sabe el sistema
//! —peso y volumen del producto, categoría, lote, vencimiento— y sobre el
//! saldo real del ámbito. Una regla que necesite un dato que el producto no
//! tiene se declara incumplible y lo dice, en vez de dejar pasar en silencio.

use serde::{Deserialize, Serialize};

use crate::error::{AppError, AppResult};

/// Nivel del árbol físico donde aplica una regla.
///
/// El orden es el del árbol: una regla de `Zona` alcanza a todos los racks y
/// ubicaciones que cuelgan de ella. Así se escribe una vez lo que vale para
/// toda una nave, sin repetirlo ubicación por ubicación.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "UPPERCASE")]
pub enum Ambito {
    Almacen,
    Zona,
    Pasillo,
    Rack,
    Seccion,
    Ubicacion,
}

impl Ambito {
    pub fn as_str(&self) -> &'static str {
        match self {
            Self::Almacen => "ALMACEN",
            Self::Zona => "ZONA",
            Self::Pasillo => "PASILLO",
            Self::Rack => "RACK",
            Self::Seccion => "SECCION",
            Self::Ubicacion => "UBICACION",
        }
    }

    pub fn desde(texto: &str) -> AppResult<Self> {
        Ok(match texto {
            "ALMACEN" => Self::Almacen,
            "ZONA" => Self::Zona,
            "PASILLO" => Self::Pasillo,
            "RACK" => Self::Rack,
            "SECCION" => Self::Seccion,
            "UBICACION" => Self::Ubicacion,
            _ => {
                return Err(AppError::CampoInvalido(format!(
                    "ámbito de regla '{texto}'"
                )));
            }
        })
    }

    /// Nombre en singular, para los mensajes que lee una persona.
    pub fn etiqueta(&self) -> &'static str {
        match self {
            Self::Almacen => "el almacén",
            Self::Zona => "la zona",
            Self::Pasillo => "el pasillo",
            Self::Rack => "el rack",
            Self::Seccion => "la sección",
            Self::Ubicacion => "la ubicación",
        }
    }
}

/// Qué limita o prohíbe la regla.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")]
pub enum TipoRegla {
    /// Peso total acumulado en el ámbito, en kilogramos.
    PesoMaximo,
    /// Unidades totales acumuladas en el ámbito.
    CantidadMaxima,
    /// Volumen total acumulado, en las unidades del producto.
    VolumenMaximo,
    /// Cuántos productos distintos pueden convivir en el ámbito.
    /// Con valor 1 fuerza la homogeneidad: una ubicación, un SKU.
    ProductosDistintosMaximo,
    /// Una categoría que no puede entrar (química fuera del pasillo de comida).
    CategoriaProhibida,
    /// Solo esa categoría puede entrar (pasillo dedicado a refrigerados).
    CategoriaExclusiva,
    /// Un producto concreto que no puede entrar.
    ProductoProhibido,
    /// Nada entra sin lote, aunque el producto no lo exija por sí mismo.
    RequiereLote,
    /// Ningún lote vencido puede entrar, ni siquiera en un ajuste.
    ProhibirVencido,
}

impl TipoRegla {
    pub fn as_str(&self) -> &'static str {
        match self {
            Self::PesoMaximo => "PESO_MAXIMO",
            Self::CantidadMaxima => "CANTIDAD_MAXIMA",
            Self::VolumenMaximo => "VOLUMEN_MAXIMO",
            Self::ProductosDistintosMaximo => "PRODUCTOS_DISTINTOS_MAXIMO",
            Self::CategoriaProhibida => "CATEGORIA_PROHIBIDA",
            Self::CategoriaExclusiva => "CATEGORIA_EXCLUSIVA",
            Self::ProductoProhibido => "PRODUCTO_PROHIBIDO",
            Self::RequiereLote => "REQUIERE_LOTE",
            Self::ProhibirVencido => "PROHIBIR_VENCIDO",
        }
    }

    pub fn desde(texto: &str) -> AppResult<Self> {
        Ok(match texto {
            "PESO_MAXIMO" => Self::PesoMaximo,
            "CANTIDAD_MAXIMA" => Self::CantidadMaxima,
            "VOLUMEN_MAXIMO" => Self::VolumenMaximo,
            "PRODUCTOS_DISTINTOS_MAXIMO" => Self::ProductosDistintosMaximo,
            "CATEGORIA_PROHIBIDA" => Self::CategoriaProhibida,
            "CATEGORIA_EXCLUSIVA" => Self::CategoriaExclusiva,
            "PRODUCTO_PROHIBIDO" => Self::ProductoProhibido,
            "REQUIERE_LOTE" => Self::RequiereLote,
            "PROHIBIR_VENCIDO" => Self::ProhibirVencido,
            _ => return Err(AppError::CampoInvalido(format!("tipo de regla '{texto}'"))),
        })
    }

    /// ¿Necesita un número (un tope) para tener sentido?
    pub fn requiere_valor(&self) -> bool {
        matches!(
            self,
            Self::PesoMaximo
                | Self::CantidadMaxima
                | Self::VolumenMaximo
                | Self::ProductosDistintosMaximo
        )
    }

    /// ¿Necesita apuntar a otra entidad (una categoría, un producto)?
    pub fn requiere_referencia(&self) -> bool {
        matches!(
            self,
            Self::CategoriaProhibida | Self::CategoriaExclusiva | Self::ProductoProhibido
        )
    }

    /// Unidad del tope, para los mensajes.
    pub fn unidad(&self) -> &'static str {
        match self {
            Self::PesoMaximo => "kg",
            Self::VolumenMaximo => "unidades de volumen",
            Self::CantidadMaxima => "unidades",
            Self::ProductosDistintosMaximo => "productos distintos",
            _ => "",
        }
    }
}

/// Qué ocurre cuando la regla se incumple.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "UPPERCASE")]
pub enum Severidad {
    /// El movimiento no se aprueba. La mercancía no entra.
    Bloquea,
    /// Se deja pasar y se avisa. Sirve para estrenar una regla sin frenar la
    /// operación mientras se comprueba que está bien puesta.
    Advierte,
}

impl Severidad {
    pub fn as_str(&self) -> &'static str {
        match self {
            Self::Bloquea => "BLOQUEA",
            Self::Advierte => "ADVIERTE",
        }
    }

    pub fn desde(texto: &str) -> AppResult<Self> {
        Ok(match texto {
            "BLOQUEA" => Self::Bloquea,
            "ADVIERTE" => Self::Advierte,
            _ => {
                return Err(AppError::CampoInvalido(format!(
                    "severidad de regla '{texto}'"
                )));
            }
        })
    }
}

/// Una regla tal como se guarda y se lee.
#[derive(Debug, Clone, Serialize)]
pub struct Regla {
    pub id: String,
    pub codigo: String,
    pub nombre: String,
    pub descripcion: Option<String>,
    pub ambito: String,
    /// `None` = aplica a **todos** los elementos de ese ámbito.
    pub ambito_id: Option<String>,
    /// Nombre legible del elemento del ámbito, para los listados.
    pub ambito_etiqueta: Option<String>,
    pub tipo: String,
    pub valor_numerico: Option<f64>,
    pub valor_referencia: Option<String>,
    pub referencia_etiqueta: Option<String>,
    pub severidad: String,
    /// Mensaje propio del cliente. Si falta, el sistema redacta uno.
    pub mensaje: Option<String>,
    pub activa: bool,
    pub created_at: String,
    pub updated_at: String,
    pub created_by: Option<String>,
    pub updated_by: Option<String>,
}

/// Datos para crear o editar una regla.
#[derive(Debug, Clone, Deserialize)]
pub struct NuevaRegla {
    pub codigo: String,
    pub nombre: String,
    #[serde(default)]
    pub descripcion: Option<String>,
    pub ambito: String,
    #[serde(default)]
    pub ambito_id: Option<String>,
    pub tipo: String,
    #[serde(default)]
    pub valor_numerico: Option<f64>,
    #[serde(default)]
    pub valor_referencia: Option<String>,
    pub severidad: String,
    #[serde(default)]
    pub mensaje: Option<String>,
    #[serde(default = "activa_por_defecto")]
    pub activa: bool,
    #[serde(default)]
    pub created_by: Option<String>,
}

fn activa_por_defecto() -> bool {
    true
}

impl NuevaRegla {
    /// Valida que la regla sea una frase completa.
    ///
    /// Una regla a medias es peor que no tener regla: un tope sin número no
    /// limita nada, y una prohibición sin categoría no prohíbe nada — pero
    /// ambas aparecen en la lista como si protegieran algo.
    pub fn validar(&self) -> AppResult<()> {
        if self.codigo.trim().is_empty() {
            return Err(AppError::CampoRequerido("código de la regla".into()));
        }
        if self.nombre.trim().is_empty() {
            return Err(AppError::CampoRequerido("nombre de la regla".into()));
        }
        let ambito = Ambito::desde(&self.ambito)?;
        let tipo = TipoRegla::desde(&self.tipo)?;
        Severidad::desde(&self.severidad)?;

        if tipo.requiere_valor() {
            match self.valor_numerico {
                None => {
                    return Err(AppError::CampoRequerido(format!(
                        "límite en {} para la regla '{}'",
                        tipo.unidad(),
                        self.nombre
                    )));
                }
                Some(v) if v <= 0.0 => {
                    return Err(AppError::CampoInvalido(format!(
                        "límite de la regla '{}' (debe ser mayor que 0)",
                        self.nombre
                    )));
                }
                _ => {}
            }
        }

        if tipo.requiere_referencia() && self.valor_referencia.as_deref().unwrap_or("").is_empty() {
            return Err(AppError::CampoRequerido(format!(
                "categoría o producto al que se refiere la regla '{}'",
                self.nombre
            )));
        }

        // Una regla de ámbito `Ubicacion` sin elemento concreto aplicaría a
        // todas las ubicaciones del almacén. Es válido y a veces es lo que se
        // quiere ("ninguna ubicación admite más de un SKU"), así que no se
        // impide; solo se documenta aquí para que no parezca un descuido.
        let _ = ambito;
        Ok(())
    }
}

/// Resultado de evaluar una regla contra un movimiento concreto.
#[derive(Debug, Clone, Serialize)]
pub struct Incumplimiento {
    pub regla_id: String,
    pub regla_codigo: String,
    pub regla_nombre: String,
    pub severidad: String,
    /// Explicación en castellano de qué se incumple y por cuánto.
    pub mensaje: String,
    /// Ubicación de destino donde se detectó.
    pub ubicacion_codigo: String,
    /// Valor que tendría el ámbito si el movimiento se aprobara.
    pub valor_resultante: Option<f64>,
    pub limite: Option<f64>,
}

/// Redacta el mensaje de un incumplimiento de tope numérico.
pub fn mensaje_tope(
    tipo: TipoRegla,
    ambito: Ambito,
    ambito_etiqueta: &str,
    resultante: f64,
    limite: f64,
) -> String {
    let unidad = tipo.unidad();
    format!(
        "{} {} quedaría en {resultante:.2} {unidad} y el límite es {limite:.2} {unidad}.",
        ambito.etiqueta(),
        ambito_etiqueta,
    )
}
