/** Tipos y constantes base de los nodos del mapa (compartidos por 2D y 3D). */

import type { TipoNodo } from "../mapa/tipos-nodo";

export type { TipoNodo };

export interface NodoMapa {
  id: string;
  tipo: TipoNodo;
  codigo: string;
  nombre: string | null;
  /** Zona contenedora (pasillos, racks y ubicaciones de piso; null para
   * zonas): permite duplicar y validar la contención sin consultas extra. */
  zona_id: string | null;
  pos_x: number | null;
  pos_y: number | null;
  pos_z: number | null;
  altura: number | null;
  /** Tamaño real del rectángulo en el plano (BD). Para zonas/pasillos/racks
   * llega de la entidad; para ubicaciones es el tamaño fijo del bin. */
  ancho: number;
  profundidad: number;
  /** 0-1, o `null` si no aplica (zonas/pasillos/racks no tienen ocupación propia). */
  ocupacion: number | null;
  /** Solo racks: niveles, alto por nivel y alto de la base (cm). Opcionales
   * hasta que el backend los entregue; se completan con reglas-mapa.json. */
  niveles?: number | null;
  alto_nivel?: number | null;
  alto_base?: number | null;
}

export interface ResumenNodo {
  productosDistintos: number;
  unidadesTotales: number;
}

export interface PosicionMapaXY {
  pos_x: number;
  pos_y: number;
  pos_z: number | null;
  altura: number | null;
  /** Tamaño candidato (modo construcción); ausente = mantener. */
  ancho?: number | null;
  profundidad?: number | null;
}

export const ANCHO_NODO: Record<TipoNodo, number> = {
  zona: 150,
  pasillo: 130,
  rack: 110,
  ubicacion: 70,
};
export const ALTO_NODO: Record<TipoNodo, number> = {
  zona: 70,
  pasillo: 56,
  rack: 56,
  ubicacion: 48,
};
const FILA_BASE_POR_TIPO: Record<TipoNodo, number> = {
  zona: 0,
  pasillo: 150,
  rack: 300,
  ubicacion: 520,
};

export const SLUG_POR_TIPO: Record<TipoNodo, string> = {
  zona: "zonas",
  pasillo: "pasillos",
  rack: "racks",
  ubicacion: "ubicaciones",
};

/** Rejilla determinística para nodos sin posición asignada todavía. */
export function posicionPorDefecto(indice: number, tipo: TipoNodo): { x: number; y: number } {
  const columnas = 6;
  const espacioX = 170;
  const espacioY = 130;
  return {
    x: 40 + (indice % columnas) * espacioX,
    y: FILA_BASE_POR_TIPO[tipo] + Math.floor(indice / columnas) * espacioY,
  };
}

/** Convierte los nodos al formato que esperan las fachadas de
 * mapa-geometria.ts. Compartido por 2D y 3D. */
export function otrosParaChoque(nodos: NodoMapa[]) {
  return nodos.map((n) => ({
    id: n.id,
    codigo: n.codigo,
    tipo: n.tipo,
    ancho: n.ancho,
    profundidad: n.profundidad,
    pos_x: n.pos_x,
    pos_y: n.pos_y,
    zona_id: n.zona_id,
  }));
}
