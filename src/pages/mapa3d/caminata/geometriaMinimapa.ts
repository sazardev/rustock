/** Geometría del minimapa (pura): rectángulos del plano en cm y su encuadre. */
import type { NodoMapa, TipoNodo } from "../../mapa-almacen-datos";
import type { PosicionXY } from "../tipos";
import { tamRealDe } from "../utils";

export interface RectMinimapa {
  tipo: TipoNodo;
  x: number;
  y: number;
  ancho: number;
  profundo: number;
}

export interface GeometriaMinimapa {
  rects: RectMinimapa[];
  /** Caja que envuelve todo (cm). */
  x0: number;
  y0: number;
  x1: number;
  y1: number;
}

/** Lo que se dibuja: zonas, pasillos y racks (las ubicaciones de piso no). */
const TIPOS_EN_MINIMAPA: readonly TipoNodo[] = ["zona", "pasillo", "rack"];

export function geometriaMinimapa(
  nodos: readonly NodoMapa[],
  posicionBase: ReadonlyMap<string, PosicionXY>,
): GeometriaMinimapa {
  const rects: RectMinimapa[] = [];
  let x0 = Infinity;
  let y0 = Infinity;
  let x1 = -Infinity;
  let y1 = -Infinity;
  for (const n of nodos) {
    const p = posicionBase.get(n.id);
    if (!p || !TIPOS_EN_MINIMAPA.includes(n.tipo)) {
      continue;
    }
    const tam = tamRealDe(n);
    rects.push({ tipo: n.tipo, x: p.x, y: p.y, ancho: tam.ancho, profundo: tam.profundo });
    x0 = Math.min(x0, p.x);
    y0 = Math.min(y0, p.y);
    x1 = Math.max(x1, p.x + tam.ancho);
    y1 = Math.max(y1, p.y + tam.profundo);
  }
  if (!Number.isFinite(x0)) {
    return { rects, x0: 0, y0: 0, x1: 1000, y1: 1000 };
  }
  // Las zonas se dibujan primero para que lo demás quede encima.
  const orden = (t: TipoNodo) => TIPOS_EN_MINIMAPA.indexOf(t);
  return { rects: rects.toSorted((a, b) => orden(a.tipo) - orden(b.tipo)), x0, y0, x1, y1 };
}

/** Escala (px por cm) y centro (cm): muestra todo el almacén si cabe con un
 * mínimo de detalle; si no, una ventana de 25 m centrada en el caminante. */
export function encuadreMinimapa(
  g: GeometriaMinimapa,
  lado: number,
  jugador: { x: number; z: number },
): { escala: number; cx: number; cz: number } {
  const VENTANA_MAX_CM = 2500;
  const span = Math.max(g.x1 - g.x0, g.y1 - g.y0, 1) * 1.1;
  if (span <= VENTANA_MAX_CM) {
    return { escala: lado / span, cx: (g.x0 + g.x1) / 2, cz: (g.y0 + g.y1) / 2 };
  }
  return { escala: lado / VENTANA_MAX_CM, cx: jugador.x, cz: jugador.z };
}
