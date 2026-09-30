/**
 * Fachada de compatibilidad del motor de colocacion (`./mapa/motor/`). Las
 * reglas viven en `src-tauri/reglas-mapa.json` (una sola fuente compartida con
 * Rust); aqui solo se reexporta lo que otros modulos ya importaban, con las
 * firmas antiguas basadas en listas de nodos.
 */
import type { TipoNodo } from "./mapa/tipos-nodo";
import {
  crearIndice,
  cuerposDe,
  primerCuerpoEnChoque,
  posicionLibreCercana as posicionLibreEnIndice,
  type RectMapa,
} from "./mapa/motor";

export { LADO_MINIMO, PASO_REJILLA, solapeProhibido } from "./mapa/reglas";
export { rectsSolapan, snap, zonaContenedoraDePunto } from "./mapa/motor";
export type { RectMapa } from "./mapa/motor";

interface OtroNodo {
  id: string;
  codigo: string;
  tipo: TipoNodo;
  ancho: number;
  profundidad: number;
  pos_x: number | null;
  pos_y: number | null;
  zona_id?: string | null;
}

/** Código del primer nodo con el que el rect chocaría, o null. Solo choques
 * (sin contención ni holgura): el resultado completo lo da `evaluarColocacion`. */
export function primerChoque(
  propioTipo: TipoNodo,
  propioId: string,
  rect: RectMapa,
  otros: OtroNodo[],
): string | null {
  const c = primerCuerpoEnChoque(crearIndice(cuerposDe(otros)), {
    id: propioId,
    tipo: propioTipo,
    rect,
  });
  return c ? c.codigo || c.id : null;
}

/** Posición libre más cercana al origen (anillos sobre la rejilla). */
export function posicionLibreCercana(
  tipo: TipoNodo,
  ancho: number,
  profundo: number,
  origen: { x: number; y: number },
  otros: OtroNodo[],
  idPropio?: string,
  soloSiChoca = true,
): { x: number; y: number } | null {
  return posicionLibreEnIndice(
    crearIndice(cuerposDe(otros)),
    { id: idPropio ?? "__nuevo__", tipo, ancho, profundo },
    origen,
    { soloSiChoca },
  );
}

/** Sugerencia para el fantasma verde: solo si el candidato actual no cabe. */
export function sugerirPosicion(
  tipo: TipoNodo,
  ancho: number,
  profundo: number,
  origen: { x: number; y: number },
  otros: OtroNodo[],
  idPropio?: string,
): { x: number; y: number } | null {
  return posicionLibreCercana(tipo, ancho, profundo, origen, otros, idPropio, true);
}
