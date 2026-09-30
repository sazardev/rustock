/** Unidad de longitud elegida en las preferencias compartidas del mapa. */
import { usePrefsMapa } from "../mapa/personalizacion";
import type { UnidadLongitud } from "../mapa/unidades";

export function useUnidadMapa(): UnidadLongitud {
  return usePrefsMapa().prefs.unidad;
}
