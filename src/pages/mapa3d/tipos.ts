import type { RefObject } from "react";
import type { Plane } from "three";
import type { TipoNodo } from "../mapa-almacen-datos";
import type { Guia } from "../mapa/motor";

/** Tipo interno de drei/three-stdlib; no vale la pena importarlo solo para el ref. */
// oxlint-disable-next-line typescript/no-explicit-any
export type ControlsRef = RefObject<any>;

export interface PosicionXY {
  x: number;
  y: number;
}

export type VistaCamara = "iso" | "planta" | "frente";

export interface NodoArrastre {
  id: string;
  tipo: TipoNodo;
  inicioX: number;
  inicioY: number;
  posZ: number | null;
  altura: number | null;
  /** Tamaño en el plano (cm) y zona declarada, para evaluar la colocación. */
  ancho: number;
  profundo: number;
  zonaId: string | null;
  /** Agarre: distancia esquina↔cursor al agarrar (el nodo va "pegado"). */
  offsetX: number;
  offsetY: number;
  /** Posición final en vivo (se escribe en cada movimiento del gesto). */
  actualX: number;
  actualY: number;
}

export interface EstadoArrastre {
  grupo: NodoArrastre[];
  plano: Plane;
  startClientX: number;
  startClientY: number;
  movidoPx: number;
  /** Alt pulsado en el último movimiento: sin snap a vecinos. */
  alt: boolean;
  /** Guías de alineación vigentes (se reescriben en cada movimiento). */
  guias: Guia[];
}
