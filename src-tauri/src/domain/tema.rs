//! Paletas de tema de la UI (DESIGN §3.1 "Rust & Iron").
//!
//! La identidad visual se define por **paletas predefinidas** (cerradas, con
//! un acento cada una) más un **modo claro/oscuro**. Cada paleta declara solo
//! su acento (claro y oscuro); el resto de los tokens — escala de acento,
//! neutros, superficies, semánticos y sombras — se genera por modo para
//! garantizar escalas coherentes y contraste legible.
//!
//! La elección vive en el backend (configuración de empresa global + preferencia
//! personal por usuario, con `null` = heredar); la UI solo aplica el mapa de
//! variables que devuelven los comandos `listar_temas` / `obtener_tema` /
//! `obtener_tema_global`. Cero lógica de color en el frontend.

use serde::{Deserialize, Serialize};
use std::collections::BTreeMap;

/// Id de la paleta por defecto (el óxido original de la identidad).
pub const TEMA_DEFECTO: &str = "rust";

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "UPPERCASE")]
pub enum ModoColor {
    Claro,
    Oscuro,
}

/// Resumen de una paleta para el selector de la UI (muestras de acento).
#[derive(Debug, Clone, Serialize)]
pub struct ResumenTema {
    pub id: String,
    pub nombre: String,
    /// Muestra del acento en modo claro (para el selector).
    pub color_claro: String,
    /// Muestra del acento en modo oscuro (para el selector).
    pub color_oscuro: String,
}

/// Tema resuelto listo para aplicar: el mapa token -> valor que el frontend
/// escribe como variables CSS sobre el root (sobrescriben los defaults de
/// `tokens.css` en runtime).
#[derive(Debug, Clone, Serialize)]
pub struct TemaActivo {
    pub id: String,
    pub nombre: String,
    pub modo: ModoColor,
    pub variables: BTreeMap<String, String>,
}

type Rgb = (u8, u8, u8);

struct Paleta {
    id: &'static str,
    nombre: &'static str,
    acento_claro: Rgb,
    acento_oscuro: Rgb,
}

/// Paletas predefinidas (lista cerrada). Cada una define su acento por modo;
/// el resto de los tokens se genera en `generar_variables`.
const PALETAS: [Paleta; 6] = [
    Paleta {
        id: "rust",
        nombre: "Óxido",
        acento_claro: (183, 65, 14),   // #B7410E — el acento original
        acento_oscuro: (224, 137, 86), // #E08956 — óxido luminoso para fondo oscuro
    },
    Paleta {
        id: "bosque",
        nombre: "Bosque",
        acento_claro: (46, 125, 50),    // #2E7D32
        acento_oscuro: (111, 191, 115), // #6FBF73
    },
    Paleta {
        id: "oceano",
        nombre: "Océano",
        acento_claro: (21, 101, 192),  // #1565C0
        acento_oscuro: (95, 167, 238), // #5FA7EE
    },
    Paleta {
        id: "uva",
        nombre: "Uva",
        acento_claro: (106, 27, 154),   // #6A1B9A
        acento_oscuro: (180, 124, 214), // #B47CD6
    },
    Paleta {
        id: "miel",
        nombre: "Miel",
        acento_claro: (180, 83, 9),    // #B45309
        acento_oscuro: (227, 168, 87), // #E3A857
    },
    Paleta {
        id: "pizarra",
        nombre: "Pizarra",
        acento_claro: (71, 85, 105),    // #475569
        acento_oscuro: (143, 163, 184), // #8FA3B8
    },
];

pub fn listar_temas() -> Vec<ResumenTema> {
    PALETAS
        .iter()
        .map(|p| ResumenTema {
            id: p.id.to_string(),
            nombre: p.nombre.to_string(),
            color_claro: a_hex(p.acento_claro),
            color_oscuro: a_hex(p.acento_oscuro),
        })
        .collect()
}

/// ¿Existe una paleta con este id?
pub fn es_tema_valido(id: &str) -> bool {
    PALETAS.iter().any(|p| p.id == id)
}

/// Variables CSS del tema (id, modo) listas para aplicar.
pub fn obtener_tema(id: &str, modo: ModoColor) -> Option<TemaActivo> {
    let paleta = PALETAS.iter().find(|p| p.id == id)?;
    Some(TemaActivo {
        id: id.to_string(),
        nombre: paleta.nombre.to_string(),
        modo,
        variables: generar_variables(paleta, modo),
    })
}

// ============ Generación de tokens ============

fn a_hex(c: Rgb) -> String {
    format!("#{:02x}{:02x}{:02x}", c.0, c.1, c.2)
}

/// Mezcla `a` con `b` según `t` (0 = todo `a`, 1 = todo `b`).
fn mezclar(a: Rgb, b: Rgb, t: f32) -> Rgb {
    let f = |x: u8, y: u8| (x as f32 * (1.0 - t) + y as f32 * t).round() as u8;
    (f(a.0, b.0), f(a.1, b.1), f(a.2, b.2))
}

const BLANCO: Rgb = (255, 255, 255);
const NEGRO: Rgb = (0, 0, 0);

// Neutros del modo claro (la identidad "Rust & Iron" original, tokens.css).
const GRIS_CLARO: [(&str, Rgb); 10] = [
    ("--color-gray-50", (251, 250, 248)),
    ("--color-gray-100", (244, 242, 238)),
    ("--color-gray-200", (232, 228, 221)),
    ("--color-gray-300", (209, 203, 193)),
    ("--color-gray-400", (170, 160, 150)),
    ("--color-gray-500", (129, 119, 107)),
    ("--color-gray-600", (95, 87, 77)),
    ("--color-gray-700", (70, 63, 55)),
    ("--color-gray-800", (48, 43, 37)),
    ("--color-gray-900", (32, 28, 23)),
];

const INK_CLARO: [(&str, Rgb); 8] = [
    ("--color-ink-950", (21, 15, 11)),
    ("--color-ink-900", (31, 24, 19)),
    ("--color-ink-800", (44, 35, 27)),
    ("--color-ink-700", (61, 50, 38)),
    ("--color-ink-600", (85, 70, 53)),
    ("--color-ink-400", (161, 140, 120)),
    ("--color-ink-200", (201, 188, 171)),
    ("--color-ink-50", (245, 240, 233)),
];

// Neutros del modo oscuro: grises invertidos con tinte tierra (el "blanco"
// del tema es el texto y el "negro" el fondo), superficies profundas.
const GRIS_OSCURO: [(&str, Rgb); 10] = [
    ("--color-gray-50", (33, 31, 27)), // fondo más oscuro del contenido
    ("--color-gray-100", (42, 39, 35)),
    ("--color-gray-200", (55, 51, 46)),
    ("--color-gray-300", (78, 73, 66)),
    ("--color-gray-400", (107, 101, 92)),
    ("--color-gray-500", (138, 131, 120)),
    ("--color-gray-600", (168, 161, 150)),
    ("--color-gray-700", (203, 197, 188)),
    ("--color-gray-800", (226, 222, 214)),
    ("--color-gray-900", (237, 234, 228)), // texto principal
];

const INK_OSCURO: [(&str, Rgb); 8] = [
    ("--color-ink-950", (13, 11, 9)),
    ("--color-ink-900", (21, 18, 14)), // sidebar
    ("--color-ink-800", (31, 27, 22)),
    ("--color-ink-700", (44, 38, 30)),
    ("--color-ink-600", (62, 53, 43)),
    ("--color-ink-400", (138, 125, 108)),
    ("--color-ink-200", (181, 169, 150)),
    ("--color-ink-50", (234, 228, 218)),
];

/// Genera la escala de acento (50-900, 10 pasos) según el modo.
/// - Claro: los tintes (50-400) se aclaran hacia blanco; los tonos (600-900)
///   se oscurecen hacia negro (escala clásica sobre fondo claro).
/// - Oscuro: los tintes (50-400) se generan mezclando con el fondo oscuro
///   (tintes sutiles, no blancos); los tonos (600-900) suben hacia blanco
///   para que el acento contraste sobre superficies oscuras.
fn escala_acento(acento: Rgb, modo: ModoColor) -> [(String, String); 10] {
    // (grado, proporción de la mezcla): tintes con el fondo, tonos con el destino.
    let tintes: [(u16, f32); 5] = match modo {
        ModoColor::Claro => [
            (50, 0.93),
            (100, 0.85),
            (200, 0.70),
            (300, 0.55),
            (400, 0.35),
        ],
        ModoColor::Oscuro => [
            (50, 0.90),
            (100, 0.80),
            (200, 0.65),
            (300, 0.45),
            (400, 0.20),
        ],
    };
    let tonos: [(u16, f32); 4] = match modo {
        ModoColor::Claro => [(600, 0.12), (700, 0.25), (800, 0.40), (900, 0.55)],
        ModoColor::Oscuro => [(600, 0.08), (700, 0.18), (800, 0.32), (900, 0.48)],
    };
    let fondo = if modo == ModoColor::Oscuro {
        GRIS_OSCURO[0].1
    } else {
        BLANCO
    };
    let destino = if modo == ModoColor::Oscuro {
        BLANCO
    } else {
        NEGRO
    };

    let mut escala = Vec::with_capacity(10);
    for (grado, t) in tintes {
        escala.push((
            format!("--color-blue-{grado}"),
            a_hex(mezclar(acento, fondo, t)),
        ));
    }
    escala.push(("--color-blue-500".to_string(), a_hex(acento)));
    for (grado, t) in tonos {
        escala.push((
            format!("--color-blue-{grado}"),
            a_hex(mezclar(acento, destino, t)),
        ));
    }
    escala.try_into().expect("10 pasos exactos")
}

fn semantico_claro() -> Vec<(&'static str, String)> {
    vec![
        ("--color-success-500", a_hex((22, 163, 74))),
        ("--color-success-600", a_hex((18, 138, 62))),
        ("--color-warning-500", a_hex((217, 119, 6))),
        ("--color-warning-600", a_hex((180, 83, 9))),
        ("--color-danger-500", a_hex((225, 29, 72))),
        ("--color-danger-600", a_hex((190, 18, 60))),
        ("--color-success-bg", a_hex((239, 251, 243))),
        ("--color-success-text", a_hex((22, 101, 52))),
        ("--color-warning-bg", a_hex((255, 248, 235))),
        ("--color-warning-text", a_hex((146, 64, 14))),
        ("--color-danger-bg", a_hex((255, 240, 242))),
        ("--color-danger-text", a_hex((159, 18, 57))),
    ]
}

fn semantico_oscuro() -> Vec<(&'static str, String)> {
    vec![
        ("--color-success-500", a_hex((74, 222, 128))),
        ("--color-success-600", a_hex((34, 197, 94))),
        ("--color-warning-500", a_hex((251, 191, 36))),
        ("--color-warning-600", a_hex((245, 158, 11))),
        ("--color-danger-500", a_hex((248, 113, 113))),
        ("--color-danger-600", a_hex((239, 68, 68))),
        ("--color-success-bg", a_hex((18, 37, 26))),
        ("--color-success-text", a_hex((110, 231, 160))),
        ("--color-warning-bg", a_hex((42, 33, 16))),
        ("--color-warning-text", a_hex((252, 211, 77))),
        ("--color-danger-bg", a_hex((46, 20, 25))),
        ("--color-danger-text", a_hex((252, 165, 165))),
    ]
}

fn rgba_str(c: Rgb, a: f32) -> String {
    format!("rgba({}, {}, {}, {})", c.0, c.1, c.2, a)
}

fn sombras_claro(acento: Rgb) -> Vec<(&'static str, String)> {
    let base = (21, 15, 11);
    vec![
        ("--shadow-xs", rgba_str(base, 0.05)),
        (
            "--shadow-sm",
            format!("{}, {}", rgba_str(base, 0.07), rgba_str(base, 0.04)),
        ),
        (
            "--shadow-md",
            format!(
                "0 6px 16px -4px {}, 0 2px 4px -2px {}",
                rgba_str(base, 0.12),
                rgba_str(base, 0.06)
            ),
        ),
        (
            "--shadow-lg",
            format!(
                "0 16px 32px -8px {}, 0 4px 8px -4px {}",
                rgba_str(base, 0.16),
                rgba_str(base, 0.07)
            ),
        ),
        (
            "--shadow-focus-ring",
            "0 0 0 2px var(--color-white), 0 0 0 4px var(--color-blue-300)".to_string(),
        ),
        (
            "--shadow-glow-primary",
            format!(
                "0 0 0 1px {}, 0 6px 16px -2px {}",
                rgba_str(acento, 0.18),
                rgba_str(acento, 0.25)
            ),
        ),
        ("--topbar-scroll-bg", "rgba(255, 255, 255, 0.85)".into()),
        ("--scrim-overlay", "rgba(21, 15, 11, 0.4)".into()),
    ]
}

fn sombras_oscuro(acento: Rgb) -> Vec<(&'static str, String)> {
    vec![
        ("--shadow-xs", rgba_str(NEGRO, 0.45)),
        (
            "--shadow-sm",
            format!("{}, {}", rgba_str(NEGRO, 0.55), rgba_str(NEGRO, 0.3)),
        ),
        (
            "--shadow-md",
            format!(
                "0 6px 16px -4px {}, 0 2px 4px -2px {}",
                rgba_str(NEGRO, 0.65),
                rgba_str(NEGRO, 0.4)
            ),
        ),
        (
            "--shadow-lg",
            format!(
                "0 16px 32px -8px {}, 0 4px 8px -4px {}",
                rgba_str(NEGRO, 0.75),
                rgba_str(NEGRO, 0.45)
            ),
        ),
        (
            "--shadow-focus-ring",
            "0 0 0 2px var(--color-surface-sunken), 0 0 0 4px var(--color-blue-300)".into(),
        ),
        (
            "--shadow-glow-primary",
            format!(
                "0 0 0 1px {}, 0 6px 16px -2px {}",
                rgba_str(acento, 0.32),
                rgba_str(acento, 0.4)
            ),
        ),
        ("--topbar-scroll-bg", "rgba(38, 35, 31, 0.85)".into()),
        ("--scrim-overlay", "rgba(0, 0, 0, 0.6)".into()),
    ]
}

/// Pares (token, color) de neutros: escalas gris e ink por modo.
type ParNeutros = &'static [(&'static str, Rgb)];

/// Construye el mapa completo de variables CSS para (paleta, modo).
fn generar_variables(p: &Paleta, modo: ModoColor) -> BTreeMap<String, String> {
    let mut v: BTreeMap<String, String> = BTreeMap::new();
    let acento = if modo == ModoColor::Claro {
        p.acento_claro
    } else {
        p.acento_oscuro
    };

    v.insert(
        "--color-scheme".into(),
        if modo == ModoColor::Claro {
            "light"
        } else {
            "dark"
        }
        .into(),
    );

    let (gris, ink): (ParNeutros, ParNeutros) = if modo == ModoColor::Claro {
        (&GRIS_CLARO, &INK_CLARO)
    } else {
        (&GRIS_OSCURO, &INK_OSCURO)
    };
    for (k, val) in gris {
        v.insert((*k).to_string(), a_hex(*val));
    }
    for (k, val) in ink {
        v.insert((*k).to_string(), a_hex(*val));
    }

    if modo == ModoColor::Claro {
        v.insert("--color-white".into(), "#ffffff".into());
        v.insert("--color-surface".into(), "#ffffff".into());
        v.insert("--color-surface-muted".into(), "#fbfaf8".into());
        v.insert("--color-surface-sunken".into(), "#f4f2ee".into());
    } else {
        v.insert("--color-white".into(), "#26231f".into());
        v.insert("--color-surface".into(), "#26231f".into());
        v.insert("--color-surface-muted".into(), "#1b1916".into());
        v.insert("--color-surface-sunken".into(), "#161412".into());
    }

    let escala = escala_acento(acento, modo);
    for (k, val) in &escala {
        v.insert(k.clone(), val.clone());
    }

    let semanticos = if modo == ModoColor::Claro {
        semantico_claro()
    } else {
        semantico_oscuro()
    };
    for (k, val) in semanticos {
        v.insert(k.to_string(), val);
    }

    // Fondos y textos de información derivados del acento de la paleta.
    let a50 = escala
        .iter()
        .find(|(k, _)| k == "--color-blue-50")
        .map(|(_, x)| x.clone())
        .unwrap_or_default();
    let a300 = escala
        .iter()
        .find(|(k, _)| k == "--color-blue-300")
        .map(|(_, x)| x.clone())
        .unwrap_or_default();
    let a800 = escala
        .iter()
        .find(|(k, _)| k == "--color-blue-800")
        .map(|(_, x)| x.clone())
        .unwrap_or_default();
    v.insert("--color-info-bg".into(), a50);
    v.insert(
        "--color-info-text".into(),
        if modo == ModoColor::Claro { a800 } else { a300 },
    );

    let sombras = if modo == ModoColor::Claro {
        sombras_claro(acento)
    } else {
        sombras_oscuro(acento)
    };
    for (k, val) in sombras {
        v.insert(k.to_string(), val);
    }

    v
}

// ============ Resolución para la sesión ============

/// Resuelve (id de paleta, modo) desde la preferencia propia del usuario (con
/// `None` = heredar de la empresa). Un id inválido se descarta silenciosamente
/// en favor de la empresa / del defecto.
pub fn tema_resuelto(
    tema_propio: Option<&str>,
    tema_empresa: &str,
    oscuro_propio: Option<bool>,
    oscuro_empresa: bool,
) -> (String, ModoColor) {
    let id = tema_propio
        .filter(|t| es_tema_valido(t))
        .or_else(|| es_tema_valido(tema_empresa).then_some(tema_empresa))
        .unwrap_or(TEMA_DEFECTO);
    let oscuro = oscuro_propio.unwrap_or(oscuro_empresa);
    let modo = if oscuro {
        ModoColor::Oscuro
    } else {
        ModoColor::Claro
    };
    (id.to_string(), modo)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn hay_seis_paletas_con_muestras_distintas() {
        let temas = listar_temas();
        assert_eq!(temas.len(), 6);
        let ids: Vec<_> = temas.iter().map(|t| t.id.as_str()).collect();
        assert!(ids.contains(&TEMA_DEFECTO));
        for t in &temas {
            assert!(!t.color_claro.is_empty() && !t.color_oscuro.is_empty());
        }
        let unicas: std::collections::HashSet<_> = ids.iter().collect();
        assert_eq!(unicas.len(), temas.len());
    }

    #[test]
    fn tema_activo_contiene_todos_los_tokens_necesarios() {
        for modo in [ModoColor::Claro, ModoColor::Oscuro] {
            let tema = obtener_tema(TEMA_DEFECTO, modo).expect("tema rust");
            for token in [
                "--color-scheme",
                "--color-blue-50",
                "--color-blue-500",
                "--color-blue-900",
                "--color-ink-900",
                "--color-gray-50",
                "--color-gray-900",
                "--color-white",
                "--color-surface",
                "--color-surface-muted",
                "--color-surface-sunken",
                "--color-success-500",
                "--color-danger-text",
                "--color-info-bg",
                "--color-info-text",
                "--shadow-xs",
                "--shadow-lg",
                "--shadow-focus-ring",
                "--shadow-glow-primary",
                "--topbar-scroll-bg",
                "--scrim-overlay",
            ] {
                assert!(
                    tema.variables.contains_key(token),
                    "falta {token} en {modo:?}"
                );
            }
        }
    }

    #[test]
    fn modo_oscuro_invierte_los_neutros() {
        let claro = obtener_tema(TEMA_DEFECTO, ModoColor::Claro).expect("claro");
        let oscuro = obtener_tema(TEMA_DEFECTO, ModoColor::Oscuro).expect("oscuro");
        let parse = |h: &str| -> u8 {
            let s = h.trim_start_matches('#');
            u8::from_str_radix(&s[0..2], 16).unwrap()
        };
        assert_eq!(claro.variables["--color-gray-900"], "#201c17");
        assert!(parse(&oscuro.variables["--color-gray-900"]) > 200);
        assert!(parse(&claro.variables["--color-gray-900"]) < 50);
        assert!(parse(&oscuro.variables["--color-gray-50"]) < 60);
        assert_eq!(oscuro.variables["--color-scheme"], "dark");
        assert_eq!(claro.variables["--color-scheme"], "light");
    }

    #[test]
    fn tema_invalido_se_descarta_y_usa_el_por_defecto() {
        let (id, modo) = tema_resuelto(Some("no-existe"), TEMA_DEFECTO, None, false);
        assert_eq!(id, TEMA_DEFECTO);
        assert_eq!(modo, ModoColor::Claro);
        assert!(!es_tema_valido("no-existe"));
        assert!(es_tema_valido("bosque"));
        let (id2, modo2) = tema_resuelto(Some("bosque"), "rust", Some(true), false);
        assert_eq!(id2, "bosque");
        assert_eq!(modo2, ModoColor::Oscuro);
    }
}
