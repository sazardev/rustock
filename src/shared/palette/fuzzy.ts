/**
 * Coincidencia de texto del command palette.
 *
 * Motor de búsqueda heurístico con inteligencia de dominio:
 *  1. Normaliza (minúsculas + sin acentos) y divide la consulta en términos
 *     (ignorando conectores como "de", "para", "como").
 *  2. Expande cada término con sinónimos del negocio ("recibir" → "entrada",
 *     "vencer" → "vencimiento") para entender lo que el usuario quiere decir.
 *  3. Puntúa cada término contra cada campo del candidato (título > subtítulo
 *     > keywords) según la calidad de la coincidencia: igualdad > prefijo de
 *     palabra > subcadena > subsecuencia (tipo fzf).
 *  4. TODOS los términos deben coincidir en al menos un campo; la puntuación
 *     suma las mejores coincidencias por término con peso por campo.
 *
 * Devuelve una puntuación o `null` si no hay coincidencia.
 */

/** Conectores que no aportan a la búsqueda (se ignoran al tokenizar). */
const CONECTORES = new Set([
  "de",
  "la",
  "el",
  "los",
  "las",
  "un",
  "una",
  "unos",
  "unas",
  "a",
  "al",
  "y",
  "o",
  "u",
  "e",
  "del",
  "en",
  "para",
  "como",
  "por",
  "con",
  "que",
  "cuando",
  "como",
  "mi",
  "tu",
  "su",
  "al",
  "por",
]);

/** Sinónimos del dominio: término del usuario → términos que existen en el
 *  contenido indexado. Se expanden al buscar para mejorar la predicción. */
const SINONIMOS: Record<string, string[]> = {
  recibir: ["entrada", "recepcion", "compra", "proveedor"],
  llegada: ["entrada", "recepcion", "compra"],
  ingreso: ["entrada", "recepcion"],
  comprar: ["entrada", "compra", "proveedor"],
  despachar: ["salida", "despacho", "cliente"],
  enviar: ["salida", "despacho", "cliente"],
  pedido: ["salida", "despacho", "cliente"],
  vender: ["salida", "despacho", "cliente"],
  mover: ["traslado"],
  trasladar: ["traslado"],
  contar: ["conteo", "inventario", "conteos"],
  conteo: ["inventario", "conteos"],
  vence: ["vencimiento", "lote"],
  caduca: ["vencimiento", "lote"],
  expira: ["vencimiento", "lote"],
  faltante: ["diferencia", "ajuste"],
  sobrante: ["diferencia", "ajuste"],
  merma: ["merma", "salida", "perdida"],
  crear: ["nuevo", "crear"],
  nuevo: ["crear", "nuevo"],
  editar: ["editar", "cambiar"],
  cambiar: ["editar"],
  eliminar: ["eliminar", "desactivar"],
  borrar: ["eliminar", "desactivar"],
  aprobar: ["aprobar", "aprobacion"],
  anular: ["anular", "anulacion"],
  stock: ["stock", "saldo", "existencia"],
  existencia: ["stock", "saldo"],
  producto: ["producto", "sku", "articulo"],
  articulo: ["producto", "sku"],
  almacen: ["almacen", "bodega"],
  bodega: ["almacen", "ubicacion"],
  ubicacion: ["ubicacion", "bin"],
  reporte: ["reporte", "informe", "reportes"],
  informe: ["reporte", "reportes"],
  usuario: ["usuario", "cuenta", "rol"],
  cuenta: ["usuario"],
  codigo: ["codigo", "sku", "codigo-barras"],
  barras: ["codigo-barras", "codigo"],
};

function normalizar(texto: string): string {
  return texto
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase();
}

/** Divide la consulta en términos significativos (sin conectores). */
export function terminosConsulta(consulta: string): string[] {
  return normalizar(consulta)
    .split(/[\s]+/)
    .map((t) => t.trim())
    .filter((t) => t.length > 1 && !CONECTORES.has(t));
}

/** Variantes de un término: el propio término más sus sinónimos del dominio. */
function variantesDeTermino(termino: string): string[] {
  const sinonimos = SINONIMOS[termino] ?? [];
  return [termino, ...sinonimos];
}

/** Calidad de coincidencia de un término (o de una de sus variantes) contra un
 *  texto de campo. Devuelve un valor en (0,1] o `null` si no coincide. */
function calidadEnCampo(termino: string, campo: string): number | null {
  if (!campo) return null;
  if (campo === termino) return 1;
  if (campo.startsWith(termino)) return 0.97;
  if (campo.split(/\s+/).some((palabra) => palabra.startsWith(termino))) return 0.92;
  if (campo.includes(termino)) return 0.85;

  // Subsecuencia tipo fzf: los caracteres del término aparecen en orden.
  let qi = 0;
  let racha = 0;
  let mejorRacha = 0;
  for (let i = 0; i < campo.length && qi < termino.length; i++) {
    if (campo[i] === termino[qi]) {
      qi++;
      racha++;
      if (racha > mejorRacha) mejorRacha = racha;
    } else {
      racha = 0;
    }
  }
  if (qi < termino.length) return null;
  return Math.round((0.55 + (mejorRacha / termino.length) * 0.35) * 100) / 100;
}

export interface TextoCandidato {
  titulo: string;
  subtitulo?: string;
  keywords?: string;
}

const PESO_TITULO = 4;
const PESO_SUBTITULO = 2;
const PESO_KEYWORDS = 1;

/** Puntúa un candidato contra la consulta. `null` si algún término no
 *  coincide en ningún campo. La puntuación favorece: todos los términos
 *  presentes, títulos por encima de subtítulos/keywords, y coincidencias
 *  compactas (prefijo > subcadena > subsecuencia). */
export function puntuacionCandidato(consulta: string, candidato: TextoCandidato): number | null {
  const terminos = terminosConsulta(consulta);
  if (terminos.length === 0) return 100;

  const campos: Array<[string, number]> = [
    [candidato.titulo, PESO_TITULO],
    [candidato.subtitulo ?? "", PESO_SUBTITULO],
    [candidato.keywords ?? "", PESO_KEYWORDS],
  ];
  const camposNormalizados = campos.map(([texto, peso]) => [normalizar(texto), peso] as const);

  let total = 0;
  let terminosCoincidentes = 0;

  for (const termino of terminos) {
    let mejorCalidad: number | null = null;
    for (const variante of variantesDeTermino(termino)) {
      for (const [campo, peso] of camposNormalizados) {
        const calidad = calidadEnCampo(variante, campo);
        if (calidad !== null && (mejorCalidad === null || calidad > mejorCalidad)) {
          mejorCalidad = calidad;
          // Premio extra por coincidir en el título.
          if (peso === PESO_TITULO) mejorCalidad = Math.min(1, mejorCalidad + 0.05);
        }
      }
    }
    if (mejorCalidad === null) return null;
    terminosCoincidentes++;
    total += mejorCalidad;
  }

  // Cuantos más términos coincidan y más completos, mejor. El multiplicador
  // premia consultas de varias palabras que encuentran TODAS sus piezas.
  const cobertura = terminosCoincidentes / terminos.length;
  const base = (total / terminos.length) * 100;
  return Math.round(base * (0.6 + cobertura * 0.4));
}

/** Compatibilidad: puntúa un texto plano (título) contra la consulta. */
export function puntuacionCoincidencia(consulta: string, texto: string): number | null {
  return puntuacionCandidato(consulta, { titulo: texto });
}

/** Posición (en el título crudo) del primer término que coincide como
 *  prefijo o subcadena, para resaltarlo. Devuelve -1 si no hay un tramo
 *  resaltable (solo coincide por subsecuencia o por sinónimo). */
export function indiceResaltado(consulta: string, texto: string): number {
  const q = normalizar(consulta).trim();
  const t = normalizar(texto);
  if (!q || !t) return -1;
  for (const termino of terminosConsulta(consulta)) {
    const pos = t.indexOf(termino);
    if (pos >= 0) return pos;
    for (const variante of variantesDeTermino(termino)) {
      const posV = t.indexOf(variante);
      if (posV >= 0) return posV;
    }
  }
  return t.indexOf(q);
}
