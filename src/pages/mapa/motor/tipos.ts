/** Tipos del motor de colocacion (puro, sin React ni DOM). */
import type { TipoNodo } from "../tipos-nodo";
import type { UnidadLongitud } from "../unidades";

/** Rectangulo en el plano (cm). */
export interface RectMapa {
  x: number;
  y: number;
  ancho: number;
  profundo: number;
}

/** Nodo posicionado del mapa tal como lo ve el motor. */
export interface CuerpoMapa extends RectMapa {
  id: string;
  codigo: string;
  tipo: TipoNodo;
  /** Zona a la que pertenece (null para zonas o si no consta). */
  zonaId: string | null;
}

export type EstadoColocacion = "libre" | "advertencia" | "bloqueado";

export interface Resultado {
  estado: EstadoColocacion;
  /** Explicacion legible en espanol; null cuando esta libre. */
  motivo: string | null;
  /** Nodo con el que choca o al que se acerca demasiado, si aplica. */
  conflictoId: string | null;
}

export const LIBRE: Resultado = { estado: "libre", motivo: null, conflictoId: null };

/** Lo que se quiere colocar. */
export interface Candidato {
  id: string;
  tipo: TipoNodo;
  rect: RectMapa;
  /** Zona declarada; sin ella se resuelve por el centro del rect. */
  zonaId?: string | null;
}

export interface OpcionesColocacion {
  /** Ids que no cuentan como vecinos (p. ej. el resto de un grupo arrastrado). */
  ignorar?: ReadonlySet<string>;
  holguraCm?: number;
  unidad?: UnidadLongitud;
}
