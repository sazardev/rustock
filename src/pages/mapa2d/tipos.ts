/** Tipos y constantes del lienzo 2D del mapa de almacén. */
import type { IndiceEspacial, OpcionesColocacion, RectMapa } from "../mapa/motor";
import type { NodoMapa, TipoNodo } from "./nodo-tipos";

export const UMBRAL_CLIC_PX = 4;

export type Herramienta = "seleccionar" | "zona" | "pasillo" | "rack";
export type HerramientaDibujo = Exclude<Herramienta, "seleccionar">;
export type Esquina = "nw" | "ne" | "sw" | "se";
export const ESQUINAS: Esquina[] = ["nw", "ne", "sw", "se"];

export interface ViewBox {
  x: number;
  y: number;
  w: number;
  h: number;
}

/** Guarda un movimiento/redimensionado hacia el backend. */
export type OnMoverNodo = (
  tipo: TipoNodo,
  id: string,
  x: number,
  y: number,
  pos_z: number | null,
  altura: number | null,
  ancho?: number,
  profundidad?: number,
) => void;

/** Campos comunes a todo gesto con puntero. */
interface GestoBase {
  pointerId: number;
  startClientX: number;
  startClientY: number;
  movidoPx: number;
}

/** pos_z/altura se reenvían sin cambios al guardar: el drag 2D solo mueve
 * x/y (antes se perdían, quedando en `null` en cada arrastre). */
interface GestoNodoBase extends GestoBase {
  nodoId: string;
  tipo: TipoNodo;
  posZ: number | null;
  altura: number | null;
  inicio: RectMapa;
  alt: boolean;
  /** Capa bloqueada: el gesto solo puede terminar en clic (seleccionar). */
  fijo: boolean;
}

export type SesionArrastre =
  | (GestoBase & { kind: "pan"; startX: number; startY: number })
  | (GestoNodoBase & { kind: "nodo" })
  | (GestoNodoBase & { kind: "resize"; esquina: Esquina })
  | (GestoBase & { kind: "dibujo"; x0: number; y0: number; alt: boolean });

/** Entradas del hook de gestos del lienzo. */
export interface ParamsGestos {
  nodos: NodoMapa[];
  nodoPorId: Map<string, NodoMapa>;
  posicionBase: Map<string, { x: number; y: number }>;
  construir: boolean;
  herramienta: Herramienta;
  rejilla: boolean;
  seleccionId: string | null;
  viewBox: ViewBox;
  setViewBox: (fn: (v: ViewBox) => ViewBox) => void;
  escala: () => number;
  aSvg: (clientX: number, clientY: number) => { x: number; y: number };
  onSeleccionar: (id: string | null) => void;
  /** Capa bloqueada para un tipo de nodo. */
  bloqueado: (tipo: TipoNodo) => boolean;
  onMover: OnMoverNodo;
  onCrear: (tipo: HerramientaDibujo, rect: RectMapa) => void;
  avisar: (mensaje: string) => void;
  /** Aviso no bloqueante (colocación con advertencia). */
  advertir: (mensaje: string) => void;
  indice: IndiceEspacial;
  opciones: OpcionesColocacion;
}
