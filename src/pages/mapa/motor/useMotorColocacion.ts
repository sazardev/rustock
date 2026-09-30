import { useMemo } from "react";
import { leerUnidadMapa } from "../unidades";
import { cuerposDe } from "./cuerpos";
import { crearIndice, type IndiceEspacial } from "./indiceEspacial";
import type { OpcionesColocacion } from "./tipos";

/** Indice espacial de los nodos del mapa (se reconstruye solo cuando cambian)
 * y las opciones de presentacion del motor (unidad elegida por el usuario). */
export function useMotorColocacion(nodos: Parameters<typeof cuerposDe>[0]): {
  indice: IndiceEspacial;
  opciones: OpcionesColocacion;
} {
  const indice = useMemo(() => crearIndice(cuerposDe(nodos)), [nodos]);
  const opciones = useMemo<OpcionesColocacion>(() => ({ unidad: leerUnidadMapa() }), []);
  return { indice, opciones };
}
