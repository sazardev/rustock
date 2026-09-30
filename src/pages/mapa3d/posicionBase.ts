import { useMemo } from "react";
import { type NodoMapa, posicionPorDefecto, type TipoNodo } from "../mapa-almacen-datos";
import type { PosicionXY } from "./tipos";

/** Posición efectiva de cada nodo: la de BD o, sin ella, la rejilla de respaldo. */
export function usePosicionBase(nodos: NodoMapa[]): Map<string, PosicionXY> {
  return useMemo(() => {
    const indicePorTipo: Record<TipoNodo, number> = { zona: 0, pasillo: 0, rack: 0, ubicacion: 0 };
    const mapa = new Map<string, PosicionXY>();
    for (const n of nodos) {
      const indice = indicePorTipo[n.tipo]++;
      if (n.pos_x !== null && n.pos_y !== null) {
        mapa.set(n.id, { x: n.pos_x, y: n.pos_y });
      } else {
        mapa.set(n.id, posicionPorDefecto(indice, n.tipo));
      }
    }
    return mapa;
  }, [nodos]);
}
