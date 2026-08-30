/**
 * Tarjeta t.mapa3d.dondeEsta: en qué ubicaciones/almacenes tiene stock un producto,
 * con link directo al mapa (resaltando la ubicación). Cierra el círculo con
 * `ContenidoInventarioCard` (que va del mapa hacia el contenido) — esta va
 * del producto hacia el mapa.
 */
import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  listarLotes,
  listarRacks,
  listarSaldos,
  listarSecciones,
  listarUbicaciones,
  listarZonas,
} from "../shared/backend";
import {
  esPaginado,
  type Producto,
  type Rack,
  type Seccion,
  type Ubicacion,
  type Zona,
} from "../shared/types";
import { Card, Link, Table, type TableColumn, Text } from "../shared/ui";
import { AlmacenRef, LoteRef, UbicacionRef } from "../shared/refs";
import { almacenMapa } from "../app/route-paths";
import { useT } from "../shared/i18n";

/** Resuelve el almacén de una ubicación caminando el árbol (SPEC §3.13) —
 * mismo criterio que `ReporteStockPage.tsx:almacenDeUbicacion`. */
function almacenIdDeUbicacion(
  u: Ubicacion,
  secciones: Map<string, Seccion>,
  racks: Map<string, Rack>,
  zonas: Map<string, Zona>,
): string | null {
  let zona: Zona | undefined;
  if (u.seccion_id) {
    const seccion = secciones.get(u.seccion_id);
    const rack = seccion ? racks.get(seccion.rack_id) : undefined;
    zona = rack ? zonas.get(rack.zona_id) : undefined;
  } else if (u.rack_id) {
    const rack = racks.get(u.rack_id);
    zona = rack ? zonas.get(rack.zona_id) : undefined;
  } else if (u.zona_id) {
    zona = zonas.get(u.zona_id);
  }
  return zona?.almacen_id ?? null;
}

interface FilaUbicacion {
  ubicacion_id: string;
  almacen_id: string | null;
  lote_id: string | null;
  cantidad: number;
}

export function ProductoUbicacionesCard({ row }: { row: Producto }) {
  const t = useT();
  const saldosQ = useQuery({
    queryKey: ["producto-ubicaciones", "saldos", row.id],
    queryFn: () => listarSaldos(undefined, row.id),
  });
  const ubicacionesQ = useQuery({
    queryKey: ["producto-ubicaciones", "ubicaciones"],
    queryFn: () => listarUbicaciones({ page_size: -1, sort: "codigo" }),
  });
  const seccionesQ = useQuery({
    queryKey: ["producto-ubicaciones", "secciones"],
    queryFn: () => listarSecciones({ page_size: -1, sort: "codigo" }),
  });
  const racksQ = useQuery({
    queryKey: ["producto-ubicaciones", "racks"],
    queryFn: () => listarRacks({ page_size: -1, sort: "codigo" }),
  });
  const zonasQ = useQuery({
    queryKey: ["producto-ubicaciones", "zonas"],
    queryFn: () => listarZonas({ page_size: -1, sort: "codigo" }),
  });
  const lotesQ = useQuery({
    queryKey: ["producto-ubicaciones", "lotes"],
    queryFn: () => listarLotes({ page_size: -1 }),
  });

  const ubicacionPorId = useMemo(() => {
    const l = ubicacionesQ.data && esPaginado(ubicacionesQ.data) ? ubicacionesQ.data.data : [];
    return new Map(l.map((u) => [u.id, u]));
  }, [ubicacionesQ.data]);

  const almacenIdPorUbicacion = useMemo(() => {
    const secciones = new Map(
      (seccionesQ.data && esPaginado(seccionesQ.data) ? seccionesQ.data.data : []).map((s) => [
        s.id,
        s,
      ]),
    );
    const racks = new Map(
      (racksQ.data && esPaginado(racksQ.data) ? racksQ.data.data : []).map((r) => [r.id, r]),
    );
    const zonas = new Map(
      (zonasQ.data && esPaginado(zonasQ.data) ? zonasQ.data.data : []).map((z) => [z.id, z]),
    );
    const mapa = new Map<string, string>();
    for (const u of ubicacionPorId.values()) {
      const almacenId = almacenIdDeUbicacion(u, secciones, racks, zonas);
      if (almacenId) mapa.set(u.id, almacenId);
    }
    return mapa;
  }, [ubicacionPorId, seccionesQ.data, racksQ.data, zonasQ.data]);

  const filas: FilaUbicacion[] = useMemo(
    () =>
      (saldosQ.data ?? [])
        .filter((s) => s.cantidad > 0)
        .map((s) => ({
          ubicacion_id: s.ubicacion_id,
          almacen_id: almacenIdPorUbicacion.get(s.ubicacion_id) ?? null,
          lote_id: s.lote_id,
          cantidad: s.cantidad,
        })),
    [saldosQ.data, almacenIdPorUbicacion],
  );

  const cargando =
    saldosQ.isLoading ||
    ubicacionesQ.isLoading ||
    seccionesQ.isLoading ||
    racksQ.isLoading ||
    zonasQ.isLoading ||
    lotesQ.isLoading;

  const columnas: TableColumn<FilaUbicacion>[] = [
    {
      key: "ubicacion",
      header: "Ubicación",
      render: (f) => <UbicacionRef id={f.ubicacion_id} />,
    },
    {
      key: "almacen",
      header: "Almacén",
      render: (f) => (f.almacen_id ? <AlmacenRef id={f.almacen_id} /> : "—"),
    },
    {
      key: "lote",
      header: "Lote",
      render: (f) => (f.lote_id ? <LoteRef id={f.lote_id} /> : "—"),
    },
    {
      key: "cantidad",
      header: "Cantidad",
      num: true,
      render: (f) => f.cantidad.toLocaleString(),
    },
    {
      key: "mapa",
      header: "",
      render: (f) =>
        f.almacen_id ? (
          <Link href={almacenMapa(f.almacen_id, f.ubicacion_id)}>Ver en el mapa →</Link>
        ) : null,
    },
  ];

  return (
    <Card title={t.mapa3d.dondeEsta} className="mt-6">
      <Card.Body>
        {cargando ? (
          <Text as="p" size="sm" color="muted">
            Cargando…
          </Text>
        ) : (
          <Table
            columns={columnas}
            rows={filas}
            rowKey={(f) => `${f.ubicacion_id}-${f.lote_id ?? "sin-lote"}`}
            emptyTitle={t.mapa3d.sinStockEnUbicaciones}
          />
        )}
      </Card.Body>
    </Card>
  );
}
