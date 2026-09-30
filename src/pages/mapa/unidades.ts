/**
 * Unidades del mapa. Toda coordenada y medida del modelo esta en centimetros
 * (1 unidad = 1 cm). La escena 3D trabaja en metros: 1 unidad = 0.01 m.
 */
export const CM = 1;
/** Metros de escena por unidad del modelo. */
export const M_POR_UNIDAD = 0.01;

export type UnidadLongitud = "cm" | "m" | "pies";

const CM_POR_PIE = 30.48;

/** Unidades del modelo (cm) a metros de escena. */
export const aEscena = (unidades: number): number => unidades * M_POR_UNIDAD;
/** Metros de escena a unidades del modelo (cm). */
export const deEscena = (metros: number): number => metros / M_POR_UNIDAD;

/** Longitud legible en la unidad pedida ("90 cm", "1.2 m", "3 ft"). */
export function formatearLongitud(cm: number, unidad: UnidadLongitud = "cm"): string {
  if (unidad === "m") {
    return `${redondear(cm / 100, 2)} m`;
  }
  if (unidad === "pies") {
    return `${redondear(cm / CM_POR_PIE, 1)} ft`;
  }
  return `${Math.round(cm)} cm`;
}

function redondear(valor: number, decimales: number): number {
  const f = 10 ** decimales;
  return Math.round(valor * f) / f;
}

/** Unidad elegida por el usuario (misma clave que las preferencias del 3D). */
export function leerUnidadMapa(): UnidadLongitud {
  try {
    const crudo = window.localStorage.getItem("rustock.mapa3d");
    const unidad = crudo ? (JSON.parse(crudo) as { unidad?: string }).unidad : undefined;
    return unidad === "m" || unidad === "pies" ? unidad : "cm";
  } catch {
    return "cm";
  }
}
