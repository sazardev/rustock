/**
 * Stock por celda para el mapa 3D: saldos + productos + lotes (react-query,
 * mismas claves de cache que `useMapaAlmacenDatos`) agrupados por ubicacion.
 */
import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { listarLotes, listarProductos, listarSaldos } from "../../../shared/backend";
import { esPaginado, type Lote, type Producto } from "../../../shared/types";
import { stockPorCelda } from "./stockPorCelda";

const SIN_DATOS: never[] = [];

export function useStockMapa(habilitado = true) {
  const saldosQ = useQuery({
    queryKey: ["mapa-almacen", "saldos"],
    queryFn: () => listarSaldos(),
    enabled: habilitado,
  });
  const productosQ = useQuery({
    queryKey: ["mapa-almacen", "stock-productos"],
    queryFn: () => listarProductos({ sort: "sku", page_size: -1 }),
    enabled: habilitado,
  });
  const lotesQ = useQuery({
    queryKey: ["mapa-almacen", "stock-lotes"],
    queryFn: () => listarLotes({ sort: "numero", page_size: -1 }),
    enabled: habilitado,
  });

  const productos: Producto[] =
    productosQ.data && esPaginado(productosQ.data) ? productosQ.data.data : SIN_DATOS;
  const lotes: Lote[] = lotesQ.data && esPaginado(lotesQ.data) ? lotesQ.data.data : SIN_DATOS;

  const stock = useMemo(
    () =>
      stockPorCelda(
        saldosQ.data ?? SIN_DATOS,
        new Map(productos.map((p) => [p.id, p])),
        new Map(lotes.map((l) => [l.id, l])),
      ),
    [saldosQ.data, productos, lotes],
  );

  return {
    stock,
    cargando: saldosQ.isLoading || productosQ.isLoading || lotesQ.isLoading,
    error: saldosQ.error ?? productosQ.error ?? lotesQ.error ?? null,
  };
}
