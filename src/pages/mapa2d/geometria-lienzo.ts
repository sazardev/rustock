/** Geometría pura del lienzo: posiciones base, redimensionado y dibujo. */
import { LADO_MINIMO, type RectMapa } from "../mapa-geometria";
import { posicionPorDefecto, type NodoMapa, type TipoNodo } from "./nodo-tipos";
import type { Esquina } from "./tipos";

/** El índice usado para la rejilla de respaldo es la posición del nodo
 * dentro de la lista completa de su tipo (no solo entre los "sin
 * posición"): así un nodo ya posicionado no libera su índice y otro nodo
 * sin posición no termina colisionando con sus coordenadas reales. */
export function posicionesBase(nodos: NodoMapa[]): Map<string, { x: number; y: number }> {
  const indicePorTipo: Record<TipoNodo, number> = { zona: 0, pasillo: 0, rack: 0, ubicacion: 0 };
  const mapa = new Map<string, { x: number; y: number }>();
  for (const n of nodos) {
    const indice = indicePorTipo[n.tipo]++;
    if (n.pos_x !== null && n.pos_y !== null) {
      mapa.set(n.id, { x: n.pos_x, y: n.pos_y });
    } else {
      mapa.set(n.id, posicionPorDefecto(indice, n.tipo));
    }
  }
  return mapa;
}

/** Redimensionado: las aristas fijas son las opuestas a la esquina tomada. */
export function redimensionar(
  inicio: RectMapa,
  esquina: Esquina,
  dx: number,
  dy: number,
  snapSi: (valor: number) => number,
): RectMapa {
  let izq = inicio.x;
  let der = inicio.x + inicio.ancho;
  let top = inicio.y;
  let bot = inicio.y + inicio.profundo;
  if (esquina.includes("e")) {
    der += snapSi(dx);
  }
  if (esquina.includes("w")) {
    izq += snapSi(dx);
  }
  if (esquina.includes("s")) {
    bot += snapSi(dy);
  }
  if (esquina.includes("n")) {
    top += snapSi(dy);
  }
  // Mínimo por lado: la esquina movida cede antes que invertir el rect.
  if (der - izq < LADO_MINIMO) {
    if (esquina.includes("e")) {
      der = izq + LADO_MINIMO;
    } else {
      izq = der - LADO_MINIMO;
    }
  }
  if (bot - top < LADO_MINIMO) {
    if (esquina.includes("s")) {
      bot = top + LADO_MINIMO;
    } else {
      top = bot - LADO_MINIMO;
    }
  }
  return { x: izq, y: top, ancho: der - izq, profundo: bot - top };
}

/** Rectángulo normalizado entre el punto de inicio del trazo y el actual. */
export function rectEntrePuntos(x0: number, y0: number, x1: number, y1: number): RectMapa {
  return {
    x: Math.min(x0, x1),
    y: Math.min(y0, y1),
    ancho: Math.abs(x1 - x0),
    profundo: Math.abs(y1 - y0),
  };
}

export function sinClave<T>(prev: Record<string, T>, id: string): Record<string, T> {
  const copia = { ...prev };
  delete copia[id];
  return copia;
}
