//! Generación de etiquetas imprimibles (SPEC §14.3, Fase 10 · Entrega 2).
//!
//! Rustock imprime lo que después va a leer: la etiqueta que se pega en una
//! caja lleva exactamente el código con el que `resolver_escaneo` encuentra
//! esa caja. Por eso la generación vive en Rust, junto a la resolución — si
//! el formato del código lo decidiera el frontend, nada garantizaría que lo
//! impreso y lo buscado coincidan.
//!
//! Dos simbologías, cada una en su sitio:
//!
//! - **Code128** para códigos internos (SKU, ubicación, lote, caja): es la
//!   simbología lineal densa que cualquier lector de mano de almacén lee sin
//!   configurar nada, y acepta todo ASCII imprimible.
//! - **QR** cuando el código es largo o la etiqueta es pequeña: aguanta
//!   suciedad y lecturas en ángulo, que es la vida real de una caja.
//!
//! El QR usa el crate `qrcode` (Reed-Solomon y enmascarado no son código que
//! se escriba a mano). Code128 va implementado aquí: está completamente
//! especificado, son ~110 patrones, y hacerlo propio evita una dependencia y
//! deja el SVG bajo control.

use serde::{Deserialize, Serialize};

/// Simbología de la etiqueta.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "UPPERCASE")]
pub enum Simbologia {
    Code128,
    Qr,
}

impl Simbologia {
    pub fn as_str(&self) -> &'static str {
        match self {
            Self::Code128 => "CODE_128",
            Self::Qr => "QR_CODE",
        }
    }
}

/// Los 107 patrones de Code128, uno por símbolo (0..=106).
///
/// Cada patrón son dígitos de ancho alternando barra y espacio, empezando por
/// barra (`2,1,2,2,2,2` = barra de 2 módulos, espacio de 1, barra de 2…).
/// Todos suman 11 módulos en 6 tramos, **salvo el de parada**: son 7 tramos y
/// 13 módulos (`2331112`), porque termina en una barra extra que cierra el
/// símbolo. Omitir esa barra final produce un código que muchos lectores
/// rechazan, así que el tipo es de longitud variable a propósito.
const PATRONES: [&[u8]; 107] = [
    b"212222", b"222122", b"222221", b"121223", b"121322", b"131222", b"122213", b"122312",
    b"132212", b"221213", b"221312", b"231212", b"112232", b"122132", b"122231", b"113222",
    b"123122", b"123221", b"223211", b"221132", b"221231", b"213212", b"223112", b"312131",
    b"311222", b"321122", b"321221", b"312212", b"322112", b"322211", b"212123", b"212321",
    b"232121", b"111323", b"131123", b"131321", b"112313", b"132113", b"132311", b"211313",
    b"231113", b"231311", b"112133", b"112331", b"132131", b"113123", b"113321", b"133121",
    b"313121", b"211331", b"231131", b"213113", b"213311", b"213131", b"311123", b"311321",
    b"331121", b"312113", b"312311", b"332111", b"314111", b"221411", b"431111", b"111224",
    b"111422", b"121124", b"121421", b"141122", b"141221", b"112214", b"112412", b"122114",
    b"122411", b"142112", b"142211", b"241211", b"221114", b"413111", b"241112", b"134111",
    b"111242", b"121142", b"121241", b"114212", b"124112", b"124211", b"411212", b"421112",
    b"421211", b"212141", b"214121", b"412121", b"111143", b"111341", b"131141", b"114113",
    b"114311", b"411113", b"411311", b"113141", b"114131", b"311141", b"411131", b"211412",
    b"211214", b"211232", b"2331112",
];

/// Símbolo de arranque en Code B (ASCII imprimible completo, mayúsculas y
/// minúsculas). Se usa siempre: la ganancia de densidad de Code C solo
/// aparece con códigos puramente numéricos y largos, y no compensa la
/// complejidad de conmutar de conjunto a mitad del código.
const INICIO_B: usize = 104;
const PARADA: usize = 106;

/// ¿Es un carácter representable en Code B? (ASCII 32..=126)
pub fn code128_admite(texto: &str) -> bool {
    !texto.is_empty() && texto.bytes().all(|b| (32..=126).contains(&b))
}

/// Convierte el texto a la secuencia de símbolos Code128, checksum incluido.
///
/// El dígito de control es `(inicio + Σ posición·valor) mod 103`, con las
/// posiciones empezando en 1. Es lo que hace que un lector distinga una
/// lectura buena de una manchada.
fn simbolos_code128(texto: &str) -> Option<Vec<usize>> {
    if !code128_admite(texto) {
        return None;
    }
    let mut simbolos = vec![INICIO_B];
    let mut suma = INICIO_B;
    for (i, byte) in texto.bytes().enumerate() {
        let valor = (byte - 32) as usize;
        simbolos.push(valor);
        suma += valor * (i + 1);
    }
    simbolos.push(suma % 103);
    simbolos.push(PARADA);
    Some(simbolos)
}

/// Anchos de módulo de la secuencia, alternando barra/espacio desde barra.
/// Se expone para poder verificar la codificación sin depender del SVG.
pub fn code128_modulos(texto: &str) -> Option<Vec<bool>> {
    let simbolos = simbolos_code128(texto)?;
    let mut modulos = Vec::new();
    for simbolo in simbolos {
        for (i, ancho) in PATRONES[simbolo].iter().enumerate() {
            let ancho = (ancho - b'0') as usize;
            // Los tramos alternan empezando en barra: pares barra, impares
            // espacio. El patrón de parada tiene 7 tramos, así que cierra en
            // barra (índice 6, par) como exige la norma.
            let es_barra = i % 2 == 0;
            modulos.extend(std::iter::repeat_n(es_barra, ancho));
        }
    }
    Some(modulos)
}

/// Escapa texto para insertarlo en un SVG sin romperlo ni inyectar marcado.
fn escapar(texto: &str) -> String {
    texto
        .replace('&', "&amp;")
        .replace('<', "&lt;")
        .replace('>', "&gt;")
        .replace('"', "&quot;")
        .replace('\'', "&apos;")
}

/// Medidas de una etiqueta, en milímetros reales sobre el papel.
#[derive(Debug, Clone, Copy)]
pub struct Medidas {
    pub ancho_mm: f64,
    pub alto_mm: f64,
}

/// Ancho de barra estrecha ("dimensión X") por debajo del cual un escáner de
/// almacén empieza a fallar. 0,25 mm es el valor seguro para una térmica de
/// 203 dpi; por debajo de 0,19 mm no lee casi ningún lector de mano.
pub const MODULO_MINIMO_MM: f64 = 0.25;
pub const MODULO_CRITICO_MM: f64 = 0.19;

/// Etiqueta ya generada: el SVG listo para imprimir y el código que lleva.
#[derive(Debug, Clone, Serialize)]
pub struct Etiqueta {
    /// Tipo de entidad etiquetada (`PRODUCTO`, `UBICACION`, `LOTE`, `CAJA`).
    pub tipo: String,
    pub entidad_id: String,
    /// El código impreso — exactamente lo que leerá el escáner.
    pub codigo: String,
    /// Texto humano bajo el código (nombre del producto, de la ubicación…).
    pub titulo: String,
    /// Segunda línea opcional (categoría, almacén, vencimiento…).
    pub subtitulo: Option<String>,
    pub simbologia: String,
    pub svg: String,
    /// Ancho de la barra estrecha en milímetros (solo Code128; `None` en QR).
    ///
    /// Es el dato que decide si la etiqueta se podrá leer: un código largo en
    /// una etiqueta pequeña produce barras tan finas que ningún escáner las
    /// resuelve. Se devuelve para poder avisar **antes** de imprimir cien
    /// etiquetas inútiles, en vez de descubrirlo pegándolas en las cajas.
    pub modulo_mm: Option<f64>,
    /// Aviso legible cuando la etiqueta es de dudosa lectura.
    pub advertencia: Option<String>,
}

/// Dibuja un Code128 como SVG, con el código en texto legible debajo.
///
/// El texto humano no es decoración: cuando la etiqueta se raya y el lector
/// falla, alguien tiene que poder teclear el código a mano.
pub fn svg_code128(texto: &str, medidas: Medidas) -> Option<String> {
    let modulos = code128_modulos(texto)?;
    let total = modulos.len() as f64;

    // Zona muda: 10 módulos a cada lado. Sin ella muchos lectores no
    // arrancan la lectura, y es el fallo de impresión más común.
    let muda = 10.0;
    let ancho_util = total + muda * 2.0;
    let alto_barras = medidas.alto_mm * 0.66;
    let escala = medidas.ancho_mm / ancho_util;

    let mut barras = String::new();
    let mut i = 0usize;
    while i < modulos.len() {
        if !modulos[i] {
            i += 1;
            continue;
        }
        let inicio = i;
        while i < modulos.len() && modulos[i] {
            i += 1;
        }
        let x = (muda + inicio as f64) * escala;
        let w = (i - inicio) as f64 * escala;
        barras.push_str(&format!(
            r#"<rect x="{x:.3}" y="0" width="{w:.3}" height="{alto_barras:.3}"/>"#
        ));
    }

    let alto_texto = medidas.alto_mm - alto_barras;
    let y_texto = alto_barras + alto_texto * 0.72;
    let tamano = (alto_texto * 0.62).min(medidas.ancho_mm / (texto.len().max(6) as f64) * 1.6);
    Some(format!(
        r##"<svg xmlns="http://www.w3.org/2000/svg" width="{ancho}mm" height="{alto}mm" viewBox="0 0 {ancho} {alto}" role="img" aria-label="Código de barras {etiqueta}"><rect width="{ancho}" height="{alto}" fill="#ffffff"/><g fill="#000000">{barras}</g><text x="{centro:.3}" y="{y_texto:.3}" text-anchor="middle" font-family="monospace" font-size="{tamano:.3}" fill="#000000" letter-spacing="0.2">{etiqueta}</text></svg>"##,
        ancho = medidas.ancho_mm,
        alto = medidas.alto_mm,
        centro = medidas.ancho_mm / 2.0,
        etiqueta = escapar(texto),
    ))
}

/// Dibuja un QR como SVG. Corrección de errores media (15%): equilibra
/// tamaño del módulo y tolerancia a una etiqueta sucia o rozada.
pub fn svg_qr(texto: &str, medidas: Medidas) -> Option<String> {
    use qrcode::{EcLevel, QrCode};

    let codigo = QrCode::with_error_correction_level(texto.as_bytes(), EcLevel::M).ok()?;
    let ancho_modulos = codigo.width();
    let lado = medidas.ancho_mm.min(medidas.alto_mm);
    // Zona muda de 4 módulos, que es la que exige la norma del QR.
    let muda = 4.0;
    let escala = lado / (ancho_modulos as f64 + muda * 2.0);

    let colores = codigo.to_colors();
    let mut celdas = String::new();
    for fila in 0..ancho_modulos {
        for columna in 0..ancho_modulos {
            if colores[fila * ancho_modulos + columna] == qrcode::Color::Dark {
                let x = (muda + columna as f64) * escala;
                let y = (muda + fila as f64) * escala;
                // +0.02 de solape: evita las líneas blancas de un píxel que
                // aparecen entre celdas contiguas al rasterizar para imprimir.
                celdas.push_str(&format!(
                    r#"<rect x="{x:.3}" y="{y:.3}" width="{w:.3}" height="{w:.3}"/>"#,
                    w = escala + 0.02
                ));
            }
        }
    }

    Some(format!(
        r##"<svg xmlns="http://www.w3.org/2000/svg" width="{lado}mm" height="{lado}mm" viewBox="0 0 {lado} {lado}" role="img" aria-label="Código QR {etiqueta}"><rect width="{lado}" height="{lado}" fill="#ffffff"/><g fill="#000000">{celdas}</g></svg>"##,
        etiqueta = escapar(texto),
    ))
}

/// Genera el SVG de la simbología pedida, o `None` si el código no se puede
/// representar en ella (Code128 solo admite ASCII imprimible).
pub fn svg(texto: &str, simbologia: Simbologia, medidas: Medidas) -> Option<String> {
    match simbologia {
        Simbologia::Code128 => svg_code128(texto, medidas),
        Simbologia::Qr => svg_qr(texto, medidas),
    }
}

/// Ancho de la barra estrecha que tendría este código a estas medidas.
/// `None` para QR, que no tiene barras sino celdas cuadradas.
pub fn modulo_mm(texto: &str, simbologia: Simbologia, medidas: Medidas) -> Option<f64> {
    if simbologia != Simbologia::Code128 {
        return None;
    }
    let modulos = code128_modulos(texto)?.len() as f64;
    // 10 módulos de zona muda a cada lado, igual que en el dibujo.
    Some(medidas.ancho_mm / (modulos + 20.0))
}

/// Aviso de legibilidad, o `None` si la etiqueta está en buen tamaño.
pub fn advertencia(modulo_mm: Option<f64>) -> Option<String> {
    let ancho = modulo_mm?;
    if ancho < MODULO_CRITICO_MM {
        Some(format!(
            "Barras de {ancho:.2} mm: demasiado finas, la mayoría de lectores no podrán leerla. Usa una etiqueta más ancha o cambia a QR."
        ))
    } else if ancho < MODULO_MINIMO_MM {
        Some(format!(
            "Barras de {ancho:.2} mm: por debajo de los {MODULO_MINIMO_MM} mm recomendados. Puede fallar en impresoras de 203 dpi o con la etiqueta rozada."
        ))
    } else {
        None
    }
}

// ============ Formatos de salida (Fase 10 · Entrega 2b) ============
//
// El SVG sirve para ver e imprimir desde el navegador, pero un almacén real
// imprime de otras formas, y hay que tolerarlas todas:
//
//  - **ZPL** — el lenguaje de Zebra, que hablan también la mayoría de las
//    térmicas genéricas. Es texto plano: se manda tal cual al puerto 9100 de
//    la impresora y sale la etiqueta, sin driver, sin sistema operativo de por
//    medio y sin pasar por un diálogo de impresión.
//  - **EPL** — el predecesor de ZPL. Muchas térmicas baratas y los modelos
//    antiguos solo entienden esto.
//  - **PDF** — el denominador común: cualquier impresora, cualquier sistema,
//    y además se archiva y se envía por correo. Se genera a mano con las
//    fuentes base de PDF, así que no incrusta tipografías ni añade una
//    dependencia.
//
// La imagen (PNG) la rasteriza el frontend desde el SVG con un lienzo: es
// presentación pura y no necesita viajar hasta aquí.

/// Formato de salida de una tanda de etiquetas.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "UPPERCASE")]
pub enum Formato {
    Svg,
    Zpl,
    Epl,
    Pdf,
}

impl Formato {
    pub fn as_str(&self) -> &'static str {
        match self {
            Self::Svg => "SVG",
            Self::Zpl => "ZPL",
            Self::Epl => "EPL",
            Self::Pdf => "PDF",
        }
    }

    /// Tipo MIME, para que el navegador sepa qué está descargando.
    pub fn mime(&self) -> &'static str {
        match self {
            Self::Svg => "image/svg+xml",
            // ZPL y EPL son texto plano: se envían a la impresora o se guardan
            // en un archivo que el sistema de etiquetado del cliente consume.
            Self::Zpl | Self::Epl => "text/plain",
            Self::Pdf => "application/pdf",
        }
    }

    pub fn extension(&self) -> &'static str {
        match self {
            Self::Svg => "svg",
            Self::Zpl => "zpl",
            Self::Epl => "epl",
            Self::Pdf => "pdf",
        }
    }
}

/// Resolución de la impresora, en puntos por pulgada.
///
/// Importa de verdad: ZPL y EPL miden en **puntos**, no en milímetros. La
/// misma etiqueta enviada a una impresora de 203 dpi y a una de 300 dpi sale
/// de tamaños distintos si no se convierte con la resolución correcta.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, Default)]
#[serde(rename_all = "snake_case")]
pub enum Dpi {
    /// 203 dpi (8 puntos/mm) — la resolución más común en térmicas de etiqueta.
    #[default]
    D203,
    /// 300 dpi (11,8 puntos/mm) — etiquetas pequeñas o con mucho texto.
    D300,
    /// 600 dpi (23,6 puntos/mm) — industrial.
    D600,
}

impl Dpi {
    pub fn valor(&self) -> f64 {
        match self {
            Self::D203 => 203.0,
            Self::D300 => 300.0,
            Self::D600 => 600.0,
        }
    }

    /// Puntos por milímetro.
    pub fn por_mm(&self) -> f64 {
        self.valor() / 25.4
    }
}

/// Disposición sobre el papel.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, Default)]
#[serde(rename_all = "snake_case")]
pub enum Disposicion {
    /// Una etiqueta por página — impresora térmica de rollo.
    Rollo,
    /// Varias por hoja A4 — impresora de oficina con hojas de etiquetas.
    #[default]
    Hoja,
}

/// Escapa el texto para un literal de cadena PDF.
fn escapar_pdf(texto: &str) -> String {
    texto
        .replace('\\', "\\\\")
        .replace('(', "\\(")
        .replace(')', "\\)")
}

/// Escapa el texto para un campo de datos ZPL/EPL.
///
/// En ZPL los caracteres `^` y `~` son de control; se sustituyen en vez de
/// escaparse porque un código que los contenga no es imprimible en Code128 de
/// forma fiable y es preferible una etiqueta correcta a una etiqueta rara.
fn limpiar_para_impresora(texto: &str) -> String {
    texto.replace(['^', '~'], "-")
}

/// Genera el ZPL de una tanda de etiquetas, una por etiqueta física.
///
/// Se delega el dibujo del código a la propia impresora (`^BC` para Code128,
/// `^BQ` para QR) en vez de mandar una imagen: sale infinitamente más nítido
/// —la impresora dibuja sobre su rejilla real de puntos— y el trabajo pesa
/// unos cientos de bytes en lugar de varios megas.
pub fn zpl(etiquetas: &[Etiqueta], medidas: Medidas, dpi: Dpi) -> String {
    let px = |mm: f64| (mm * dpi.por_mm()).round() as i64;
    let ancho = px(medidas.ancho_mm);
    let alto = px(medidas.alto_mm);
    let margen = px(2.0);
    let alto_barras = px(medidas.alto_mm * 0.6);

    let mut salida = String::new();
    for etiqueta in etiquetas {
        let codigo = limpiar_para_impresora(&etiqueta.codigo);
        salida.push_str("^XA\n");
        // Ancho de la etiqueta y longitud de la hoja: sin esto la impresora
        // usa su configuración guardada y recorta o desplaza el contenido.
        salida.push_str(&format!("^PW{ancho}\n^LL{alto}\n^LH0,0\n"));

        if etiqueta.simbologia == "QR_CODE" {
            // La magnificación es el tamaño del módulo en puntos: se calcula
            // para que el QR ocupe el alto disponible.
            let magnificacion = ((alto - margen * 2) / 33).clamp(1, 10);
            salida.push_str(&format!(
                "^FO{margen},{margen}^BQN,2,{magnificacion}^FDQA,{codigo}^FS\n"
            ));
        } else {
            // `^BY` fija el ancho del módulo estrecho: es lo que decide si el
            // código se puede leer (ver `MODULO_MINIMO_MM`).
            let modulo = (px(medidas.ancho_mm) / (codigo.len() as i64 * 11 + 35)).max(2);
            salida.push_str(&format!("^BY{modulo},3,{alto_barras}\n"));
            salida.push_str(&format!(
                "^FO{margen},{margen}^BCN,{alto_barras},Y,N,N^FD{codigo}^FS\n"
            ));
        }

        // Texto humano: si la etiqueta se raya, alguien tiene que poder leerlo.
        let titulo = limpiar_para_impresora(&etiqueta.titulo);
        salida.push_str(&format!(
            "^FO{margen},{y}^A0N,{alto_texto},{alto_texto}^FB{ancho_texto},1,0,L,0^FD{titulo}^FS\n",
            y = alto - px(4.5),
            alto_texto = px(3.0),
            ancho_texto = ancho - margen * 2,
        ));
        salida.push_str("^PQ1\n^XZ\n");
    }
    salida
}

/// Genera el EPL de una tanda. Mismo criterio que en ZPL: la impresora dibuja.
pub fn epl(etiquetas: &[Etiqueta], medidas: Medidas, dpi: Dpi) -> String {
    let px = |mm: f64| (mm * dpi.por_mm()).round() as i64;
    let ancho = px(medidas.ancho_mm);
    let alto = px(medidas.alto_mm);
    let margen = px(2.0);
    let alto_barras = px(medidas.alto_mm * 0.6);

    let mut salida = String::new();
    for etiqueta in etiquetas {
        let codigo = limpiar_para_impresora(&etiqueta.codigo);
        salida.push_str("\nN\n");
        salida.push_str(&format!("q{ancho}\nQ{alto},24\n"));

        if etiqueta.simbologia == "QR_CODE" {
            let escala = ((alto - margen * 2) / 33).clamp(1, 10);
            salida.push_str(&format!("b{margen},{margen},Q,m2,s{escala},\"{codigo}\"\n"));
        } else {
            let estrecho = (ancho / (codigo.len() as i64 * 11 + 35)).clamp(2, 6);
            salida.push_str(&format!(
                "B{margen},{margen},0,1,{estrecho},{ancho_barra},{alto_barras},B,\"{codigo}\"\n",
                ancho_barra = estrecho * 3,
            ));
        }

        let titulo = limpiar_para_impresora(&etiqueta.titulo);
        salida.push_str(&format!(
            "A{margen},{y},0,2,1,1,N,\"{titulo}\"\n",
            y = alto - px(4.5),
        ));
        salida.push_str("P1\n");
    }
    salida
}

/// Milímetros a puntos tipográficos (1 pt = 1/72 pulgada).
fn mm_a_pt(mm: f64) -> f64 {
    mm * 72.0 / 25.4
}

/// Rectángulos negros y textos que componen una etiqueta en el PDF.
struct DibujoEtiqueta {
    rects: Vec<(f64, f64, f64, f64)>,
    texto_codigo: String,
    titulo: String,
}

/// Convierte una etiqueta a primitivas de dibujo, en milímetros y con el
/// origen arriba a la izquierda (luego se voltea al sistema del PDF).
fn dibujar(etiqueta: &Etiqueta, medidas: Medidas) -> Option<DibujoEtiqueta> {
    let mut rects = Vec::new();

    if etiqueta.simbologia == "QR_CODE" {
        use qrcode::{EcLevel, QrCode};
        let codigo =
            QrCode::with_error_correction_level(etiqueta.codigo.as_bytes(), EcLevel::M).ok()?;
        let n = codigo.width();
        let lado = medidas.ancho_mm.min(medidas.alto_mm);
        let muda = 4.0;
        let escala = lado / (n as f64 + muda * 2.0);
        let colores = codigo.to_colors();
        for fila in 0..n {
            for columna in 0..n {
                if colores[fila * n + columna] == qrcode::Color::Dark {
                    rects.push((
                        (muda + columna as f64) * escala,
                        (muda + fila as f64) * escala,
                        escala,
                        escala,
                    ));
                }
            }
        }
    } else {
        let modulos = code128_modulos(&etiqueta.codigo)?;
        let muda = 10.0;
        let escala = medidas.ancho_mm / (modulos.len() as f64 + muda * 2.0);
        let alto_barras = medidas.alto_mm * 0.66;
        let mut i = 0usize;
        while i < modulos.len() {
            if !modulos[i] {
                i += 1;
                continue;
            }
            let inicio = i;
            while i < modulos.len() && modulos[i] {
                i += 1;
            }
            rects.push((
                (muda + inicio as f64) * escala,
                0.0,
                (i - inicio) as f64 * escala,
                alto_barras,
            ));
        }
    }

    Some(DibujoEtiqueta {
        rects,
        texto_codigo: etiqueta.codigo.clone(),
        titulo: etiqueta.titulo.clone(),
    })
}

/// Genera un PDF con las etiquetas.
///
/// Se escribe a mano y a propósito: un PDF de rectángulos y texto con las
/// fuentes base (Helvetica, presente en todo lector desde 1993) no necesita
/// incrustar tipografías ni una dependencia de cientos de miles de líneas.
/// El resultado es determinista y se puede diffear.
pub fn pdf(etiquetas: &[Etiqueta], medidas: Medidas, disposicion: Disposicion) -> Vec<u8> {
    // Página: la etiqueta misma en rollo, A4 en hoja.
    let (pagina_ancho, pagina_alto) = match disposicion {
        Disposicion::Rollo => (medidas.ancho_mm, medidas.alto_mm),
        Disposicion::Hoja => (210.0, 297.0),
    };
    let margen_hoja = 8.0;
    let separacion = 2.0;

    // Cuántas caben por hoja.
    let (columnas, filas) = match disposicion {
        Disposicion::Rollo => (1usize, 1usize),
        Disposicion::Hoja => (
            (((pagina_ancho - margen_hoja * 2.0 + separacion) / (medidas.ancho_mm + separacion))
                .floor() as usize)
                .max(1),
            (((pagina_alto - margen_hoja * 2.0 + separacion) / (medidas.alto_mm + separacion))
                .floor() as usize)
                .max(1),
        ),
    };
    let por_pagina = columnas * filas;

    let mut paginas: Vec<String> = Vec::new();
    for grupo in etiquetas.chunks(por_pagina) {
        let mut contenido = String::from("0 0 0 rg\n");
        for (indice, etiqueta) in grupo.iter().enumerate() {
            let Some(dibujo) = dibujar(etiqueta, medidas) else {
                continue;
            };
            let (ox, oy) = match disposicion {
                Disposicion::Rollo => (0.0, 0.0),
                Disposicion::Hoja => (
                    margen_hoja + (indice % columnas) as f64 * (medidas.ancho_mm + separacion),
                    margen_hoja + (indice / columnas) as f64 * (medidas.alto_mm + separacion),
                ),
            };

            for (x, y, w, h) in &dibujo.rects {
                // El PDF mide desde abajo: se voltea la coordenada vertical.
                let py = pagina_alto - oy - y - h;
                contenido.push_str(&format!(
                    "{:.3} {:.3} {:.3} {:.3} re f\n",
                    mm_a_pt(ox + x),
                    mm_a_pt(py),
                    mm_a_pt(*w),
                    mm_a_pt(*h),
                ));
            }

            // Código en mono bajo las barras, y el nombre humano debajo.
            if etiqueta.simbologia != "QR_CODE" {
                let tamano = (medidas.alto_mm * 0.16).clamp(1.6, 4.0);
                let y_texto = pagina_alto - oy - medidas.alto_mm * 0.84;
                contenido.push_str(&format!(
                    "BT /F2 {:.2} Tf {:.3} {:.3} Td ({}) Tj ET\n",
                    mm_a_pt(tamano),
                    mm_a_pt(ox + 1.0),
                    mm_a_pt(y_texto),
                    escapar_pdf(&dibujo.texto_codigo),
                ));
            }
            let tamano_titulo = (medidas.alto_mm * 0.13).clamp(1.4, 3.2);
            let y_titulo = pagina_alto - oy - medidas.alto_mm + 1.2;
            contenido.push_str(&format!(
                "BT /F1 {:.2} Tf {:.3} {:.3} Td ({}) Tj ET\n",
                mm_a_pt(tamano_titulo),
                mm_a_pt(ox + 1.0),
                mm_a_pt(y_titulo),
                escapar_pdf(&dibujo.titulo),
            ));
        }
        paginas.push(contenido);
    }
    if paginas.is_empty() {
        paginas.push(String::new());
    }

    ensamblar_pdf(&paginas, mm_a_pt(pagina_ancho), mm_a_pt(pagina_alto))
}

/// Ensambla los objetos del PDF con su tabla de referencias cruzadas.
fn ensamblar_pdf(paginas: &[String], ancho_pt: f64, alto_pt: f64) -> Vec<u8> {
    let n = paginas.len();
    // Numeración: 1 catálogo, 2 páginas, 3 y 4 fuentes, luego por cada página
    // su objeto de página y su contenido.
    let primer_pagina = 5;
    let mut objetos: Vec<String> = Vec::new();

    let kids: Vec<String> = (0..n)
        .map(|i| format!("{} 0 R", primer_pagina + i * 2))
        .collect();

    objetos.push("<< /Type /Catalog /Pages 2 0 R >>".into());
    objetos.push(format!(
        "<< /Type /Pages /Kids [{}] /Count {n} >>",
        kids.join(" ")
    ));
    objetos.push("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>".into());
    objetos.push("<< /Type /Font /Subtype /Type1 /BaseFont /Courier >>".into());

    for (i, contenido) in paginas.iter().enumerate() {
        let id_contenido = primer_pagina + i * 2 + 1;
        objetos.push(format!(
            "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 {ancho_pt:.3} {alto_pt:.3}] \
             /Resources << /Font << /F1 3 0 R /F2 4 0 R >> >> /Contents {id_contenido} 0 R >>"
        ));
        objetos.push(format!(
            "<< /Length {} >>\nstream\n{contenido}endstream",
            contenido.len()
        ));
    }

    let mut salida: Vec<u8> = b"%PDF-1.4\n".to_vec();
    let mut offsets: Vec<usize> = Vec::with_capacity(objetos.len());
    for (i, cuerpo) in objetos.iter().enumerate() {
        offsets.push(salida.len());
        salida.extend_from_slice(format!("{} 0 obj\n{cuerpo}\nendobj\n", i + 1).as_bytes());
    }

    let inicio_xref = salida.len();
    salida.extend_from_slice(format!("xref\n0 {}\n", objetos.len() + 1).as_bytes());
    salida.extend_from_slice(b"0000000000 65535 f \n");
    for offset in &offsets {
        salida.extend_from_slice(format!("{offset:010} 00000 n \n").as_bytes());
    }
    salida.extend_from_slice(
        format!(
            "trailer\n<< /Size {} /Root 1 0 R >>\nstartxref\n{inicio_xref}\n%%EOF\n",
            objetos.len() + 1
        )
        .as_bytes(),
    );
    salida
}
