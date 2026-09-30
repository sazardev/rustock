/** Caja alineada a los ejes en coordenadas LOCALES del rack (metros de
 * escena, origen en la esquina minima del rack a ras de su base). */
export interface Caja {
  x: number;
  y: number;
  z: number;
  sx: number;
  sy: number;
  sz: number;
}

/** Cajas de todos los racks en un arreglo plano: las del rack `i` son
 * `cajas[inicios[i] .. inicios[i + 1])`. */
export interface GrupoCajas {
  cajas: Caja[];
  inicios: number[];
}

export function grupoVacio(): GrupoCajas {
  return { cajas: [], inicios: [0] };
}

export function cerrarRack(g: GrupoCajas): void {
  g.inicios.push(g.cajas.length);
}
