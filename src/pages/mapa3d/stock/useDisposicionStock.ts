import { useMemo } from "react";
import type { StockPorCelda } from "../../mapa/stock/stockPorCelda";
import type { GruposRacks } from "../estructura/construirRack";
import { construirDisposicion, DISPOSICION_VACIA } from "./construirDisposicion";

/** Disposicion 3D del stock (memoizada: se recalcula solo si cambian las
 * celdas o el stock). Con `activo` falso no se calcula nada. */
export function useDisposicionStock(
  grupos: GruposRacks,
  stock: StockPorCelda | undefined,
  activo: boolean,
) {
  return useMemo(
    () => (activo && stock ? construirDisposicion(grupos, stock) : DISPOSICION_VACIA),
    [grupos, stock, activo],
  );
}
