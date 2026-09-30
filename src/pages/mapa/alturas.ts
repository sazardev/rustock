/** Alturas y bases reales (cm) de cada nodo para dibujarlo en 3D. */
import type { NodoMapa } from "../mapa2d/nodo-tipos";
import { medidasRack } from "./celdas/medidasRack";

/** Espesor de la losa de una zona (cm). */
export const LOSA_ZONA_CM = 10;

const ALTURA_DEFECTO_CM = {
  zona: LOSA_ZONA_CM,
  /** Marca de piso del pasillo (cm). */
  pasillo: 2,
  /** Ubicacion de piso: una tarima con carga (cm). */
  ubicacion: 40,
} as const;

/** Altura del prisma del nodo: la explicita o la derivada por tipo. */
export function alturaNodoCm(n: NodoMapa): number {
  if (n.tipo === "rack") {
    return medidasRack(n).altura;
  }
  return n.altura ?? ALTURA_DEFECTO_CM[n.tipo];
}

/** Cota del suelo del nodo: la guardada o, sin ella, la cara superior de la
 * losa (todo lo que no es zona apoya sobre ella). */
export function baseNodoCm(n: NodoMapa): number {
  return n.pos_z ?? (n.tipo === "zona" ? 0 : LOSA_ZONA_CM);
}
