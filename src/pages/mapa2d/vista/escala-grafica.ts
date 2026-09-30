/** Longitud "redonda" (1, 2, 5 x 10^n) de la barra de escala para un zoom dado. */
import type { UnidadLongitud } from "../../mapa/unidades";

const CM_POR_PIE = 30.48;
const CM_POR_UNIDAD: Record<UnidadLongitud, number> = { cm: 1, m: 100, pies: CM_POR_PIE };

function valorRedondo(v: number): number {
  const e = 10 ** Math.floor(Math.log10(v));
  const m = v / e;
  return (m >= 5 ? 5 : m >= 2 ? 2 : 1) * e;
}

/** `cmPorPx` = cm que abarca un píxel de pantalla; `objetivoPx` = largo deseado. */
export function escalaGrafica(
  cmPorPx: number,
  unidad: UnidadLongitud,
  objetivoPx: number,
): { cm: number; px: number } {
  const porUnidad = CM_POR_UNIDAD[unidad];
  const cm = valorRedondo((objetivoPx * cmPorPx) / porUnidad) * porUnidad;
  return { cm, px: cm / cmPorPx };
}
