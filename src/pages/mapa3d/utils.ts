import { ALTO_NODO, ANCHO_NODO, type NodoMapa } from "../mapa-almacen-datos";
import type { EstadoColocacion } from "../mapa/motor";

export function esCampoDeTexto(el: EventTarget | null): boolean {
  if (!(el instanceof HTMLElement)) {
    return false;
  }
  return el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.tagName === "SELECT";
}

/** Detecta soporte WebGL ANTES de montar el `<Canvas>`: sin GPU/driver (VMs,
 * servidores, navegadores viejos) three.js no puede crear contexto y R3F
 * falla en silencio dejando un lienzo vacío — se avisa con error claro
 * (DESIGN §8.4) en vez de una página que parece rota. */
export function tieneWebGL(): boolean {
  try {
    const prueba = document.createElement("canvas");
    return Boolean(prueba.getContext("webgl2") ?? prueba.getContext("webgl"));
  } catch {
    return false;
  }
}

/** Tamaño real desde BD con fallback a las constantes históricas. */
export const tamRealDe = (n: NodoMapa) => ({
  ancho: typeof n.ancho === "number" && n.ancho > 0 ? n.ancho : ANCHO_NODO[n.tipo],
  profundo:
    typeof n.profundidad === "number" && n.profundidad > 0 ? n.profundidad : ALTO_NODO[n.tipo],
});

/** Sin tinte emissive (negro). Nombre CSS: evita un literal hex fuera de tokens. */
export const SIN_TINTE = "black";

/** Tinte emissive del nodo: el semáforo del arrastre (verde libre, ámbar
 * advertencia, rojo bloqueado) gana; luego el resaltado; durante un
 * gesto, los obstáculos (par prohibido con lo arrastrado) brillan rojo tenue
 * para mostrar qué NO se puede pisar; resto apagado. */
export function tinteDe(
  resaltado: boolean,
  estado: EstadoColocacion | null,
  obstaculo: boolean,
): string {
  // El semáforo de un arrastre en curso manda sobre el resaltado: el nodo
  // arrastrado siempre está seleccionado y, si no, nunca se vería.
  if (estado === "bloqueado") {
    return "--color-danger-500";
  }
  if (estado === "advertencia") {
    return "--color-warning-500";
  }
  if (estado === "libre") {
    return "--color-success-500";
  }
  if (resaltado) {
    return "--color-blue-500";
  }
  return obstaculo ? "--color-danger-500" : SIN_TINTE;
}

export function intensidadDe(
  resaltado: boolean,
  estado: EstadoColocacion | null,
  obstaculo: boolean,
): number {
  if (estado) {
    return 0.45;
  }
  if (resaltado) {
    return 0.5;
  }
  return obstaculo ? 0.28 : 0;
}
