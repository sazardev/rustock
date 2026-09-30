/** Datos de lectura de cada ubicacion de rack (codigo y ocupacion) para
 * rotular y colorear sus celdas en el 3D. */
import type { Ubicacion } from "../../../shared/types";

export interface InfoCelda {
  codigo: string;
  /** 0-1, o null si la ubicacion no declara capacidad. */
  ocupacion: number | null;
  cantidad: number;
}

export function construirInfoCeldas(
  ubicaciones: Ubicacion[],
  cantidadPorUbicacion: Map<string, number>,
): Map<string, InfoCelda> {
  const mapa = new Map<string, InfoCelda>();
  for (const u of ubicaciones) {
    const cantidad = cantidadPorUbicacion.get(u.id) ?? 0;
    mapa.set(u.id, {
      codigo: u.codigo,
      cantidad,
      ocupacion: u.capacidad_maxima ? cantidad / u.capacidad_maxima : null,
    });
  }
  return mapa;
}
