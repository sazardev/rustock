/** Geometria AABB y rejilla, sin dependencias. */
import { PASO_REJILLA } from "../reglas";
import type { RectMapa } from "./tipos";

/** Interseccion AABB estricta: compartir borde NO cuenta como solape. */
export function rectsSolapan(a: RectMapa, b: RectMapa): boolean {
  return (
    a.x < b.x + b.ancho && b.x < a.x + a.ancho && a.y < b.y + b.profundo && b.y < a.y + a.profundo
  );
}

/** El rect `interior` cabe completo dentro de `exterior` (bordes incluidos). */
export function rectContiene(exterior: RectMapa, interior: RectMapa): boolean {
  return (
    interior.x >= exterior.x &&
    interior.y >= exterior.y &&
    interior.x + interior.ancho <= exterior.x + exterior.ancho &&
    interior.y + interior.profundo <= exterior.y + exterior.profundo
  );
}

/** Ajuste magnetico a la rejilla (con Alt se desactiva en el llamador). */
export function snap(valor: number): number {
  return Math.round(valor / PASO_REJILLA) * PASO_REJILLA;
}
