import type { NivelCalidad } from "./tiposPrefs";

/** Lo que cambia con cada nivel de calidad grafica. */
export interface PerfilCalidad {
  /** Rango de `devicePixelRatio` del lienzo. */
  dpr: [number, number];
  /** Lado (px) del mapa de sombras. */
  mapaSombras: number;
  /** Distancia (m) a la que el stock pasa de cajas individuales a bloque. */
  radioLodStockM: number;
  /** Tope de etiquetas simultaneas en pantalla. */
  maxEtiquetas: number;
}

export const PERFILES_CALIDAD: Record<NivelCalidad, PerfilCalidad> = {
  bajo: { dpr: [1, 1], mapaSombras: 1024, radioLodStockM: 6, maxEtiquetas: 20 },
  medio: { dpr: [1, 1.75], mapaSombras: 2048, radioLodStockM: 12, maxEtiquetas: 40 },
  alto: { dpr: [1, 2], mapaSombras: 4096, radioLodStockM: 20, maxEtiquetas: 60 },
};
