/** Matemática pura del encuadre: zoom anclado, límites y ajuste a contenido. */
import type { RectMapa } from "../../mapa/motor";
import type { ViewBox } from "../tipos";

/** Píxeles de pantalla por cm: todo el almacén cabe / un cm se ve grande. */
export const PX_POR_CM_MIN = 0.03;
export const PX_POR_CM_MAX = 8;
/** Margen alrededor del contenido al encuadrar (fracción de cada lado). */
const MARGEN = 0.06;

const acotar = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));

/** Zoom multiplicando el ancho visible por `factor` (<1 acerca) de modo que
 * `ancla` (punto del plano) conserve su posición relativa en pantalla. */
export function zoomAncladoEn(
  v: ViewBox,
  factor: number,
  ancla: { x: number; y: number },
  anchoPx: number,
): ViewBox {
  const w = acotar(v.w * factor, anchoPx / PX_POR_CM_MAX, anchoPx / PX_POR_CM_MIN);
  const k = w / v.w;
  return {
    x: ancla.x - (ancla.x - v.x) * k,
    y: ancla.y - (ancla.y - v.y) * k,
    w,
    h: v.h * k,
  };
}

/** Desplaza la vista para que `punto` caiga en la fracción (fx, fy) del lienzo. */
export function anclarPunto(
  v: ViewBox,
  punto: { x: number; y: number },
  fx: number,
  fy: number,
): ViewBox {
  return { ...v, x: punto.x - fx * v.w, y: punto.y - fy * v.h };
}

/** Mantiene el ancho y fuerza la proporción del elemento (sin deformar). */
export function conAspecto(v: ViewBox, anchoPx: number, altoPx: number): ViewBox {
  if (anchoPx <= 0 || altoPx <= 0) {
    return v;
  }
  const h = (v.w * altoPx) / anchoPx;
  return { ...v, y: v.y + (v.h - h) / 2, h };
}

/** Caja que muestra todos los rects con un margen, respetando el aspecto. */
export function encuadrarRects(rects: RectMapa[], anchoPx: number, altoPx: number): ViewBox | null {
  if (rects.length === 0 || anchoPx <= 0 || altoPx <= 0) {
    return null;
  }
  const x0 = Math.min(...rects.map((r) => r.x));
  const y0 = Math.min(...rects.map((r) => r.y));
  const x1 = Math.max(...rects.map((r) => r.x + r.ancho));
  const y1 = Math.max(...rects.map((r) => r.y + r.profundo));
  const aspecto = anchoPx / altoPx;
  const bw = Math.max(x1 - x0, 1);
  const bh = Math.max(y1 - y0, 1);
  const w = acotar(
    Math.max(bw, bh * aspecto) * (1 + 2 * MARGEN),
    anchoPx / PX_POR_CM_MAX,
    anchoPx / PX_POR_CM_MIN,
  );
  const h = w / aspecto;
  return { x: (x0 + x1) / 2 - w / 2, y: (y0 + y1) / 2 - h / 2, w, h };
}
