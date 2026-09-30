/**
 * Capa de datos compartida entre el mapa 2D y el 3D: misma cadena de fetch
 * (zonas -> pasillos -> racks -> secciones -> ubicaciones -> saldos), mismo
 * cálculo de `nodos` — así ambos mapas muestran exactamente lo mismo.
 */
import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  listarPasillos,
  listarRacks,
  listarSaldos,
  listarSecciones,
  listarUbicaciones,
  listarZonas,
} from "../../shared/backend";
import { esPaginado } from "../../shared/types";
import { agruparCeldas } from "../mapa/celdas/agruparCeldas";
import { construirInfoCeldas } from "../mapa/celdas/infoCeldas";
import { construirNodos } from "./construir-nodos";
import type { NodoMapa, ResumenNodo } from "./nodo-tipos";
import { calcularResumenNodos } from "./resumen-nodos";

/** Referencia estable para no invalidar `useMemo` cuando aún no hay datos. */
const SIN_DATOS: never[] = [];

export function useMapaAlmacenDatos(almacenId: string | undefined) {
  const zonasQ = useQuery({
    queryKey: ["mapa-almacen", "zonas", almacenId],
    queryFn: () =>
      listarZonas({
        filters: [`almacen_id:eq:${almacenId}`, "activo:eq:true"],
        sort: "codigo",
        page_size: -1,
      }),
    enabled: !!almacenId,
  });
  const zonas = zonasQ.data && esPaginado(zonasQ.data) ? zonasQ.data.data : SIN_DATOS;
  const zonaIds = zonas.map((z) => z.id);

  const pasillosQ = useQuery({
    queryKey: ["mapa-almacen", "pasillos", almacenId, zonaIds],
    queryFn: () =>
      listarPasillos({
        filters: [`zona_id:in:${zonaIds.join(",")}`, "activo:eq:true"],
        sort: "codigo",
        page_size: -1,
      }),
    enabled: zonaIds.length > 0,
  });
  const pasillos = pasillosQ.data && esPaginado(pasillosQ.data) ? pasillosQ.data.data : SIN_DATOS;

  const racksQ = useQuery({
    queryKey: ["mapa-almacen", "racks", almacenId, zonaIds],
    queryFn: () =>
      listarRacks({
        filters: [`zona_id:in:${zonaIds.join(",")}`, "activo:eq:true"],
        sort: "codigo",
        page_size: -1,
      }),
    enabled: zonaIds.length > 0,
  });
  const racks = racksQ.data && esPaginado(racksQ.data) ? racksQ.data.data : SIN_DATOS;
  const rackIds = racks.map((r) => r.id);

  const seccionesQ = useQuery({
    queryKey: ["mapa-almacen", "secciones", almacenId, rackIds],
    queryFn: () =>
      listarSecciones({
        filters: [`rack_id:in:${rackIds.join(",")}`],
        sort: "codigo",
        page_size: -1,
      }),
    enabled: rackIds.length > 0,
  });
  const secciones =
    seccionesQ.data && esPaginado(seccionesQ.data) ? seccionesQ.data.data : SIN_DATOS;
  const seccionIds = secciones.map((s) => s.id);

  const ubicacionesQ = useQuery({
    queryKey: ["mapa-almacen", "ubicaciones", almacenId, seccionIds, rackIds, zonaIds],
    queryFn: () => {
      const filtros = [
        seccionIds.length > 0 ? `seccion_id:in:${seccionIds.join(",")}` : "",
        rackIds.length > 0 ? `rack_id:in:${rackIds.join(",")}` : "",
        zonaIds.length > 0 ? `zona_id:in:${zonaIds.join(",")}` : "",
      ].filter(Boolean);
      // El OR resuelve el árbol simplificado (exactamente un padre); el filtro
      // de activos va en cliente: el motor no mezcla grupos AND dentro del OR.
      return listarUbicaciones({
        filters: filtros,
        filter_logic: "OR",
        sort: "codigo",
        page_size: -1,
      });
    },
    enabled: seccionIds.length > 0 || rackIds.length > 0 || zonaIds.length > 0,
  });
  const ubicaciones = useMemo(
    () =>
      (ubicacionesQ.data && esPaginado(ubicacionesQ.data)
        ? ubicacionesQ.data.data
        : SIN_DATOS
      ).filter((u) => u.activo),
    [ubicacionesQ.data],
  );
  const ubicacionIds = ubicaciones.map((u) => u.id);

  const saldosQ = useQuery({
    queryKey: ["mapa-almacen", "saldos"],
    queryFn: () => listarSaldos(),
    enabled: ubicacionIds.length > 0,
  });
  const cantidadPorUbicacion = useMemo(() => {
    const mapa = new Map<string, number>();
    for (const s of saldosQ.data ?? []) {
      mapa.set(s.ubicacion_id, (mapa.get(s.ubicacion_id) ?? 0) + s.cantidad);
    }
    return mapa;
  }, [saldosQ.data]);

  const nodos: NodoMapa[] = useMemo(
    () => construirNodos(zonas, pasillos, racks, ubicaciones, cantidadPorUbicacion, secciones),
    [zonas, pasillos, racks, ubicaciones, cantidadPorUbicacion, secciones],
  );

  const { celdasPorRack, rackPorUbicacion } = useMemo(
    () => agruparCeldas(racks, secciones, ubicaciones),
    [racks, secciones, ubicaciones],
  );

  const infoCeldas = useMemo(
    () => construirInfoCeldas(ubicaciones, cantidadPorUbicacion),
    [ubicaciones, cantidadPorUbicacion],
  );

  /** Las celdas de un rack ya no son nodos: un deep link a una de ellas
   * (?resaltar=<ubicación>) resalta el rack que la contiene. */
  const resolverResaltado = (id: string | null): string | null =>
    id ? (rackPorUbicacion.get(id) ?? id) : null;

  const resumenPorNodo: Map<string, ResumenNodo> = useMemo(
    () =>
      calcularResumenNodos(
        zonas,
        pasillos,
        racks,
        secciones,
        ubicaciones,
        saldosQ.data ?? [],
        cantidadPorUbicacion,
      ),
    [zonas, pasillos, racks, secciones, ubicaciones, saldosQ.data, cantidadPorUbicacion],
  );

  const cargando =
    zonasQ.isLoading ||
    pasillosQ.isLoading ||
    racksQ.isLoading ||
    seccionesQ.isLoading ||
    ubicacionesQ.isLoading;

  return { nodos, cargando, resumenPorNodo, celdasPorRack, infoCeldas, resolverResaltado };
}
