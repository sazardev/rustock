/**
 * Espejo en TypeScript del motor de layout físico `src-tauri/src/mapa.rs`
 * (SPEC §14, regla de solapes). MISMA matriz de pares prohibidos, MISMA
 * intersección AABB con desigualdad estricta (tocarse por borde no es
 * solape). El backend es quien rechaza de verdad; esto existe para dar
 * feedback en vivo durante el arrastre (ghost rojo) sin esperar al servidor.
 *
 * Si cambias una regla aquí, cámbiala también en Rust y viceversa.
 */
import type { TipoNodo } from "./mapa-almacen-datos";

/** Paso de la rejilla de ajuste magnético (modo construcción). */
export const PASO_REJILLA = 10;
/** Lado mínimo aceptado por el backend para tipos redimensionables. */
export const LADO_MINIMO = 10;

export interface RectMapa {
  x: number;
  y: number;
  ancho: number;
  profundo: number;
}

/** Intersección AABB estricta: compartir borde NO cuenta como solape. */
export function rectsSolapan(a: RectMapa, b: RectMapa): boolean {
  return (
    a.x < b.x + b.ancho && b.x < a.x + a.ancho && a.y < b.y + b.profundo && b.y < a.y + a.profundo
  );
}

const PARES_PROHIBIDOS = new Set<string>([
  "zona|zona",
  "pasillo|pasillo",
  "rack|rack",
  "ubicacion|ubicacion",
  "pasillo|rack",
  "rack|pasillo",
  "pasillo|ubicacion",
  "ubicacion|pasillo",
  "rack|ubicacion",
  "ubicacion|rack",
]);

/** Zona vs hijos: contención permitida. Espejo exacto de `solape_prohibido`. */
export function solapeProhibido(a: TipoNodo, b: TipoNodo): boolean {
  return PARES_PROHIBIDOS.has(`${a}|${b}`);
}

/** Primer choque del rect candidato contra los demás nodos (para colorear el
 * ghost y para bloquear el drop). Devuelve el código del nodo que choca. */
export function primerChoque(
  propioTipo: TipoNodo,
  propioId: string,
  rect: RectMapa,
  otros: {
    id: string;
    codigo: string;
    tipo: TipoNodo;
    ancho: number;
    profundidad: number;
    pos_x: number | null;
    pos_y: number | null;
  }[],
): string | null {
  for (const n of otros) {
    if (n.id === propioId && n.tipo === propioTipo) continue;
    if (!solapeProhibido(propioTipo, n.tipo)) continue;
    if (n.pos_x === null || n.pos_y === null) continue;
    const otro: RectMapa = {
      x: n.pos_x,
      y: n.pos_y,
      ancho: n.ancho,
      profundo: n.profundidad,
    };
    if (rectsSolapan(rect, otro)) {
      return n.codigo || n.id;
    }
  }
  return null;
}

/** Ajuste magnético a la rejilla (con Alt se desactiva en el llamador). */
export function snap(valor: number): number {
  return Math.round(valor / PASO_REJILLA) * PASO_REJILLA;
}

/** Resuelve la zona contenedora de un punto central: la de menor área que lo
 * contiene (la más específica si hay zonas anidadas). Devuelve null si el
 * punto no cae dentro de ninguna zona posicionada. */
export function zonaContenedoraDePunto(
  px: number,
  py: number,
  zonas: {
    id: string;
    codigo?: string;
    ancho: number;
    profundidad: number;
    pos_x: number | null;
    pos_y: number | null;
  }[],
): string | null {
  let mejor: { id: string; area: number } | null = null;
  for (const z of zonas) {
    if (z.pos_x === null || z.pos_y === null) continue;
    if (px < z.pos_x || py < z.pos_y) continue;
    if (px > z.pos_x + z.ancho || py > z.pos_y + z.profundidad) continue;
    const area = z.ancho * z.profundidad;
    if (!mejor || area < mejor.area) {
      mejor = { id: z.id, area };
    }
  }
  return mejor?.id ?? null;
}

// ============ Sugerencia: posición válida más cercana (apoyo al arrastrar) ============

const RADIO_SUGERENCIA = 18;

/** Si el candidato actual choca, busca la posición válida más cercana (búsqueda
 * en anillos sobre la rejilla, distancia Chebyshev) para SUGERIRLA con un
 * fantasma verde. Devuelve null si el candidato ya es válido (no hace falta
 * sugerir) o si no hay posición válida en el radio. */
export function sugerirPosicion(
  tipo: TipoNodo,
  ancho: number,
  profundo: number,
  origen: { x: number; y: number },
  otros: Parameters<typeof primerChoque>[3],
  idPropio?: string,
): { x: number; y: number } | null {
  return posicionLibreCercana(tipo, ancho, profundo, origen, otros, idPropio, true);
}

/** Posición libre más cercana al origen para un rect del tamaño dado: el
 * origen si ya cabe, o la primera válida en anillos Chebyshev sobre la
 * rejilla. `soloSiChoca=false` devuelve siempre una posición (útil para
 * duplicar: coloca la copia junto al original sin chocar). */
export function posicionLibreCercana(
  tipo: TipoNodo,
  ancho: number,
  profundo: number,
  origen: { x: number; y: number },
  otros: Parameters<typeof primerChoque>[3],
  idPropio?: string,
  soloSiChoca = true,
): { x: number; y: number } | null {
  const prohibidos = otros.filter(
    (o) =>
      o.id !== idPropio && solapeProhibido(tipo, o.tipo) && o.pos_x !== null && o.pos_y !== null,
  );
  if (prohibidos.length === 0) return soloSiChoca ? null : { x: origen.x, y: origen.y };
  const rects = prohibidos.map((o) => ({
    x: o.pos_x as number,
    y: o.pos_y as number,
    ancho: o.ancho,
    profundo: o.profundidad,
  }));
  const cabe = (x: number, y: number) =>
    !rects.some((r) => rectsSolapan({ x, y, ancho, profundo }, r));
  // Origen crudo (sin snap): si el candidato actual ya cabe, no hay nada que
  // sugerir; los anillos se alejan en pasos de rejilla desde ahí.
  const ox = origen.x;
  const oy = origen.y;
  if (cabe(ox, oy)) return soloSiChoca ? null : { x: ox, y: oy };
  for (let radio = 1; radio <= RADIO_SUGERENCIA; radio++) {
    for (let dx = -radio; dx <= radio; dx++) {
      for (let dy = -radio; dy <= radio; dy++) {
        if (Math.max(Math.abs(dx), Math.abs(dy)) !== radio) continue; // solo el anillo
        const x = ox + dx * PASO_REJILLA;
        const y = oy + dy * PASO_REJILLA;
        if (cabe(x, y)) return { x, y };
      }
    }
  }
  return null;
}
