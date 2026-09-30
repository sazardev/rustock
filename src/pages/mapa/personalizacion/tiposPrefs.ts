import type { UnidadLongitud } from "../unidades";

/** Criterio con el que se colorean los nodos y el stock del mapa. */
export type ModoColor = "tipo" | "ocupacion" | "vencimiento" | "producto" | "categoria";
export const MODOS_COLOR: readonly ModoColor[] = [
  "tipo",
  "ocupacion",
  "vencimiento",
  "producto",
  "categoria",
];

/** Nivel de calidad grafica (ver `perfilesCalidad.ts`). */
export type NivelCalidad = "bajo" | "medio" | "alto";
export const NIVELES_CALIDAD: readonly NivelCalidad[] = ["bajo", "medio", "alto"];

export const UNIDADES_LONGITUD: readonly UnidadLongitud[] = ["cm", "m", "pies"];

/** Tamanos de celda de la rejilla del piso (m). */
export const TAMANOS_REJILLA_M: readonly number[] = [0.5, 1, 2, 5];

/** Rango de la distancia maxima de las etiquetas (m). */
export const DISTANCIA_ETIQUETA_MIN_M = 10;
export const DISTANCIA_ETIQUETA_MAX_M = 80;

export interface PrefsMapa {
  /** Etiquetas de nodos visibles en la escena. */
  etiquetas: boolean;
  /** Contenido de la etiqueta: cada campo se activa por separado. */
  etiquetaCodigo: boolean;
  etiquetaOcupacion: boolean;
  etiquetaSku: boolean;
  etiquetaDimensiones: boolean;
  /** Distancia (m) a la que la etiqueta se apaga del todo. */
  etiquetaDistanciaM: number;
  autoRotar: boolean;
  /** Sombras suaves (luz direccional). */
  sombras: boolean;
  /** Productos dibujados dentro de las celdas. */
  stock: boolean;
  /** Multiplicador de la sensibilidad de la mirada al caminar (1 = base). */
  sensibilidadMirada: number;
  /** Unidad de las medidas mostradas (el modelo siempre guarda cm). */
  unidad: UnidadLongitud;
  colorModo: ModoColor;
  /** Rejilla del piso y tamano de su celda (m). */
  rejilla: boolean;
  rejillaM: number;
  calidad: NivelCalidad;
}

export const PREFS_DEFECTO: PrefsMapa = {
  etiquetas: true,
  etiquetaCodigo: true,
  etiquetaOcupacion: true,
  etiquetaSku: true,
  etiquetaDimensiones: false,
  etiquetaDistanciaM: 48,
  autoRotar: false,
  sombras: true,
  stock: true,
  sensibilidadMirada: 1,
  unidad: "cm",
  colorModo: "producto",
  rejilla: true,
  rejillaM: 1,
  calidad: "medio",
};
