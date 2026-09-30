import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { listarProductos } from "../../../shared/backend";
import { esPaginado } from "../../../shared/types";

const SIN_CATEGORIAS: ReadonlyMap<string, string | null> = new Map();

/** Categoria de cada producto, para colorear por categoria. Comparte la clave
 * de cache de `useStockMapa` (no hay una segunda peticion) y solo se consulta
 * cuando el modo la necesita. */
export function useCategoriasProducto(habilitado: boolean): ReadonlyMap<string, string | null> {
  const { data } = useQuery({
    queryKey: ["mapa-almacen", "stock-productos"],
    queryFn: () => listarProductos({ sort: "sku", page_size: -1 }),
    enabled: habilitado,
  });
  return useMemo(
    () =>
      habilitado && data && esPaginado(data)
        ? new Map(data.data.map((p) => [p.id, p.categoria_id]))
        : SIN_CATEGORIAS,
    [habilitado, data],
  );
}
