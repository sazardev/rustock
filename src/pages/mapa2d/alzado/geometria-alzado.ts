/** Geometría pura del alzado frontal de un rack (1 unidad = 1 cm, eje y hacia abajo). */
import type { CeldaRack } from "../../mapa/celdas/derivarCeldasRack";
import type { InfoCelda } from "../../mapa/celdas/infoCeldas";
import { medidasRack, type MedidasRack } from "../../mapa/celdas/medidasRack";
import type { NodoMapa } from "../nodo-tipos";

export interface CeldaAlzado {
  ubicacionId: string;
  codigo: string;
  nivel: number;
  bahia: number;
  x: number;
  y: number;
  ancho: number;
  alto: number;
  /** 0-1 o null si la ubicación no declara capacidad. */
  ocupacion: number | null;
  cantidad: number;
}

export interface Alzado {
  medidas: MedidasRack;
  ancho: number;
  altura: number;
  celdas: CeldaAlzado[];
  /** y de cada viga (base de cada nivel), de abajo arriba. */
  vigas: number[];
  /** Tamaño de letra en unidades del dibujo (proporcional a su tamaño). */
  fuente: number;
}

export function construirAlzado(
  rack: NodoMapa,
  celdas: CeldaRack[],
  info: Map<string, InfoCelda>,
): Alzado {
  const medidas = medidasRack(rack);
  const nivelMax = Math.max(medidas.niveles, ...celdas.map((c) => c.nivel));
  const altura = Math.max(medidas.altura, medidas.altoBase + nivelMax * medidas.altoNivel);
  const ancho = rack.ancho;
  return {
    medidas,
    ancho,
    altura,
    celdas: celdas.map((c) => {
      const i = info.get(c.ubicacionId);
      const w = ancho / c.nBahias;
      return {
        ubicacionId: c.ubicacionId,
        codigo: i?.codigo ?? "",
        nivel: c.nivel,
        bahia: c.bahia,
        x: (c.bahia - 1) * w,
        y: altura - (c.zBase + c.alto),
        ancho: w,
        alto: c.alto,
        ocupacion: i?.ocupacion ?? null,
        cantidad: i?.cantidad ?? 0,
      };
    }),
    vigas: Array.from(
      { length: nivelMax },
      (_, k) => altura - (medidas.altoBase + k * medidas.altoNivel),
    ),
    fuente: Math.max(ancho, altura) / 26,
  };
}
