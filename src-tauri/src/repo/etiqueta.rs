//! Etiquetas de entidades (SPEC §14.3.5, Fase 10 · Entrega 2).
//!
//! Traduce una entidad del catálogo a la etiqueta que se pega en el estante o
//! en la caja. La regla que sostiene todo el módulo: **el código impreso es
//! exactamente el código con el que `resolver_escaneo` encuentra la entidad**.
//! Imprimir una cosa y buscar otra sería una etiqueta que no sirve para nada,
//! así que ambas rutas leen del mismo sitio y en el mismo orden.

use rusqlite::Connection;
use serde::{Deserialize, Serialize};

use crate::domain::etiqueta::{
    Disposicion, Dpi, Etiqueta, Formato, Medidas, Simbologia, advertencia, code128_admite, epl,
    modulo_mm, pdf, svg, zpl,
};
use crate::error::{AppError, AppResult};

/// Tipos de entidad etiquetables. Coinciden con los que resuelve el escáner.
pub const TIPOS: [&str; 4] = ["PRODUCTO", "UBICACION", "LOTE", "CAJA"];

/// Petición de impresión: qué entidades, en qué simbología y a qué tamaño.
#[derive(Debug, Clone, Deserialize)]
pub struct PeticionEtiquetas {
    /// `PRODUCTO` | `UBICACION` | `LOTE` | `CAJA`.
    pub tipo: String,
    /// Ids de las entidades a etiquetar.
    pub ids: Vec<String>,
    pub simbologia: Simbologia,
    /// Ancho de la etiqueta en milímetros reales sobre el papel.
    #[serde(default = "ancho_por_defecto")]
    pub ancho_mm: f64,
    #[serde(default = "alto_por_defecto")]
    pub alto_mm: f64,
    /// Formato de salida. Por defecto SVG, que es lo que muestra la pantalla.
    #[serde(default = "formato_por_defecto")]
    pub formato: Formato,
    /// Resolución de la impresora. Solo afecta a ZPL y EPL, que miden en
    /// puntos: la misma etiqueta sale de otro tamaño si el dato es incorrecto.
    #[serde(default)]
    pub dpi: Dpi,
    #[serde(default)]
    pub disposicion: Disposicion,
}

fn formato_por_defecto() -> Formato {
    Formato::Svg
}

fn ancho_por_defecto() -> f64 {
    50.0
}

fn alto_por_defecto() -> f64 {
    25.0
}

/// El recurso de permisos al que pertenece cada tipo. Imprimir la etiqueta de
/// algo exige poder verlo: no es una acción nueva, es una forma de leerlo.
pub fn recurso_de(tipo: &str) -> AppResult<&'static str> {
    match tipo {
        "PRODUCTO" => Ok("producto"),
        "UBICACION" => Ok("ubicacion"),
        "LOTE" => Ok("lote"),
        "CAJA" => Ok("caja"),
        _ => Err(AppError::CampoInvalido(format!(
            "tipo de etiqueta '{tipo}' (debe ser uno de {})",
            TIPOS.join(", ")
        ))),
    }
}

/// Datos crudos de la entidad, antes de convertirlos en etiqueta.
struct Fuente {
    codigo: String,
    titulo: String,
    subtitulo: Option<String>,
}

/// Lee la entidad y decide qué código llevará impreso.
///
/// Para un producto el código preferido es su código de barras comercial —
/// si lo tiene, es el que ya viene impreso en el envase y el que el escáner
/// resuelve primero. Si no lo tiene, se imprime el SKU, que es el código
/// interno y también resoluble.
fn leer_fuente(conn: &Connection, tipo: &str, id: &str) -> AppResult<Fuente> {
    let fila = match tipo {
        "PRODUCTO" => conn.query_row(
            "SELECT COALESCE(NULLIF(p.codigo_barras, ''), p.sku), p.nombre, c.nombre
             FROM productos p LEFT JOIN categorias c ON c.id = p.categoria_id
             WHERE p.id = ?1",
            [id],
            |r| {
                Ok(Fuente {
                    codigo: r.get(0)?,
                    titulo: r.get(1)?,
                    subtitulo: r.get(2)?,
                })
            },
        ),
        "UBICACION" => conn.query_row(
            "SELECT u.codigo, u.codigo, a.nombre
             FROM ubicaciones u LEFT JOIN almacenes a ON a.id = u.almacen_id
             WHERE u.id = ?1",
            [id],
            |r| {
                Ok(Fuente {
                    codigo: r.get(0)?,
                    titulo: r.get(1)?,
                    subtitulo: r.get(2)?,
                })
            },
        ),
        "LOTE" => conn.query_row(
            "SELECT l.numero, l.numero, p.nombre
             FROM lotes l LEFT JOIN productos p ON p.id = l.producto_id
             WHERE l.id = ?1",
            [id],
            |r| {
                Ok(Fuente {
                    codigo: r.get(0)?,
                    titulo: r.get(1)?,
                    subtitulo: r.get(2)?,
                })
            },
        ),
        "CAJA" => conn.query_row(
            "SELECT c.codigo, COALESCE(NULLIF(c.nombre, ''), c.codigo), u.codigo
             FROM cajas c LEFT JOIN ubicaciones u ON u.id = c.ubicacion_id
             WHERE c.id = ?1",
            [id],
            |r| {
                Ok(Fuente {
                    codigo: r.get(0)?,
                    titulo: r.get(1)?,
                    subtitulo: r.get(2)?,
                })
            },
        ),
        _ => return Err(recurso_de(tipo).unwrap_err()),
    };

    fila.map_err(|_| AppError::NoEncontrado("la entidad a etiquetar", id.to_string()))
}

/// Genera las etiquetas pedidas. Falla completa si alguna entidad no existe o
/// si su código no cabe en la simbología elegida: es preferible no imprimir
/// nada a imprimir una hoja con etiquetas ilegibles intercaladas.
pub fn generar(conn: &Connection, peticion: &PeticionEtiquetas) -> AppResult<Vec<Etiqueta>> {
    recurso_de(&peticion.tipo)?;
    if peticion.ids.is_empty() {
        return Err(AppError::CampoRequerido(
            "entidades a etiquetar (selecciona al menos una)".into(),
        ));
    }
    // Tope defensivo: una hoja A4 lleva 24 etiquetas; 500 son 21 hojas y ya
    // es más de lo que cabe en una sesión de impresión razonable.
    if peticion.ids.len() > 500 {
        return Err(AppError::CampoInvalido(
            "cantidad de etiquetas (máximo 500 por impresión)".into(),
        ));
    }

    let medidas = Medidas {
        ancho_mm: peticion.ancho_mm.clamp(20.0, 210.0),
        alto_mm: peticion.alto_mm.clamp(10.0, 297.0),
    };

    let mut etiquetas = Vec::with_capacity(peticion.ids.len());
    for id in &peticion.ids {
        let fuente = leer_fuente(conn, &peticion.tipo, id)?;

        if peticion.simbologia == Simbologia::Code128 && !code128_admite(&fuente.codigo) {
            return Err(AppError::CampoInvalido(format!(
                "código '{}' en Code128 (solo admite ASCII imprimible; usa QR para esta etiqueta)",
                fuente.codigo
            )));
        }

        let svg = svg(&fuente.codigo, peticion.simbologia, medidas).ok_or_else(|| {
            AppError::CampoInvalido(format!("código '{}' para etiqueta", fuente.codigo))
        })?;

        let ancho_modulo = modulo_mm(&fuente.codigo, peticion.simbologia, medidas);
        etiquetas.push(Etiqueta {
            tipo: peticion.tipo.clone(),
            entidad_id: id.clone(),
            codigo: fuente.codigo,
            titulo: fuente.titulo,
            subtitulo: fuente.subtitulo,
            simbologia: peticion.simbologia.as_str().to_string(),
            svg,
            modulo_mm: ancho_modulo,
            advertencia: advertencia(ancho_modulo),
        });
    }
    Ok(etiquetas)
}

/// Entidad candidata a etiquetar, para el selector de la pantalla.
#[derive(Debug, Clone, Serialize)]
pub struct Etiquetable {
    pub id: String,
    pub codigo: String,
    pub nombre: String,
}

/// Lista las entidades de un tipo que **tienen código imprimible**. Las que no
/// lo tienen no se ofrecen: una etiqueta sin código no se puede escanear, y
/// dejarla elegible solo llevaría a imprimir papel inútil.
pub fn listar_etiquetables(
    conn: &Connection,
    tipo: &str,
    busqueda: Option<&str>,
    limite: i64,
) -> AppResult<Vec<Etiquetable>> {
    recurso_de(tipo)?;
    let limite = limite.clamp(1, 500);
    let patron = format!("%{}%", busqueda.unwrap_or("").trim());

    let sql = match tipo {
        "PRODUCTO" => {
            "SELECT id, COALESCE(NULLIF(codigo_barras, ''), sku), nombre FROM productos
             WHERE activo = 1 AND (sku LIKE ?1 OR nombre LIKE ?1 OR COALESCE(codigo_barras,'') LIKE ?1)
             ORDER BY sku LIMIT ?2"
        }
        "UBICACION" => {
            "SELECT id, codigo, codigo FROM ubicaciones
             WHERE activo = 1 AND codigo LIKE ?1 ORDER BY codigo LIMIT ?2"
        }
        "LOTE" => {
            "SELECT id, numero, numero FROM lotes
             WHERE numero LIKE ?1 ORDER BY numero LIMIT ?2"
        }
        _ => {
            "SELECT id, codigo, COALESCE(NULLIF(nombre, ''), codigo) FROM cajas
             WHERE activo = 1 AND (codigo LIKE ?1 OR COALESCE(nombre,'') LIKE ?1)
             ORDER BY codigo LIMIT ?2"
        }
    };

    let mut stmt = conn.prepare(sql)?;
    let filas = stmt.query_map(rusqlite::params![patron, limite], |r| {
        Ok(Etiquetable {
            id: r.get(0)?,
            codigo: r.get(1)?,
            nombre: r.get(2)?,
        })
    })?;
    let mut salida = Vec::new();
    for fila in filas {
        salida.push(fila?);
    }
    Ok(salida)
}

/// Tanda de etiquetas lista para su destino: pantalla, archivo o impresora.
#[derive(Debug, Clone, Serialize)]
pub struct TandaEtiquetas {
    pub etiquetas: Vec<Etiqueta>,
    pub formato: String,
    pub mime: String,
    pub extension: String,
    /// Contenido en base64. Se codifica siempre igual, sea texto (ZPL, EPL) o
    /// binario (PDF): un solo camino de transporte y de descarga, en vez de
    /// dos ramas que se comportan distinto según el formato.
    pub contenido_base64: String,
    /// Nombre sugerido del archivo al descargarlo.
    pub nombre_archivo: String,
}

/// Genera la tanda en el formato pedido.
pub fn generar_tanda(conn: &Connection, peticion: &PeticionEtiquetas) -> AppResult<TandaEtiquetas> {
    use base64::Engine as _;

    let etiquetas = generar(conn, peticion)?;
    let medidas = Medidas {
        ancho_mm: peticion.ancho_mm.clamp(20.0, 210.0),
        alto_mm: peticion.alto_mm.clamp(10.0, 297.0),
    };

    let bytes: Vec<u8> = match peticion.formato {
        Formato::Svg => {
            // En SVG la tanda es el conjunto de los SVG ya presentes en cada
            // etiqueta; el archivo descargable los concatena en un documento.
            etiquetas
                .iter()
                .map(|e| e.svg.as_str())
                .collect::<Vec<_>>()
                .join("\n")
                .into_bytes()
        }
        Formato::Zpl => zpl(&etiquetas, medidas, peticion.dpi).into_bytes(),
        Formato::Epl => epl(&etiquetas, medidas, peticion.dpi).into_bytes(),
        Formato::Pdf => pdf(&etiquetas, medidas, peticion.disposicion),
    };

    let extension = peticion.formato.extension();
    Ok(TandaEtiquetas {
        formato: peticion.formato.as_str().to_string(),
        mime: peticion.formato.mime().to_string(),
        extension: extension.to_string(),
        contenido_base64: base64::engine::general_purpose::STANDARD.encode(&bytes),
        nombre_archivo: format!(
            "etiquetas-{}-{}.{extension}",
            peticion.tipo.to_lowercase(),
            etiquetas.len()
        ),
        etiquetas,
    })
}
