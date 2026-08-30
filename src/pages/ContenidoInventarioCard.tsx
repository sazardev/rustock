/**
 * Tarjeta "Contenido": qué productos/lotes/cantidades hay realmente en una
 * Zona/Pasillo/Rack/Ubicación — resuelto 100% en el cliente sobre los
 * endpoints ya existentes (`saldos` es la tabla canónica ubicación×producto×
 * lote→cantidad, SPEC §5.2), mismo patrón de "traer todo y unir" que ya usa
 * `ReporteStockPage.tsx`. Sin cambios de backend.
 */
import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { listarRacks, listarSaldos, listarSecciones, listarUbicaciones } from "../shared/backend";
import { esPaginado, type Pasillo, type Rack, type Ubicacion, type Zona } from "../shared/types";
import { Card, Table, type TableColumn, Text } from "../shared/ui";
import { LoteRef, ProductoRef, UbicacionRef } from "../shared/refs";
import { useT } from "../shared/i18n";
import { formatearNumero } from "../shared/format";

type TipoContenido = "zona" | "pasillo" | "rack" | "ubicacion";

type Props =
  | { tipo: "zona"; row: Zona }
  | { tipo: "pasillo"; row: Pasillo }
  | { tipo: "rack"; row: Rack }
  | { tipo: "ubicacion"; row: Ubicacion };

interface FilaContenido {
  ubicacion_id: string;
  producto_id: string;
  lote_id: string | null;
  cantidad: number;
}

const SIN_DATOS: never[] = [];

export function ContenidoInventarioCard({ tipo, row }: Props) {
  const t = useT();
  // Descendientes según el tipo (mismo patrón OR de filtros usado en
  // ArbolAlmacen.tsx/AlmacenMapaPage.tsx para resolver el árbol físico).
  const racksQ = useQuery({
    queryKey: ["contenido", "racks", tipo, row.id],
    queryFn: () => {
      const filtro = tipo === "zona" ? `zona_id:eq:${row.id}` : `pasillo_id:eq:${row.id}`;
      return listarRacks({ filters: [filtro], page_size: -1 });
    },
    enabled: tipo === "zona" || tipo === "pasillo",
  });
  const racks = racksQ.data && esPaginado(racksQ.data) ? racksQ.data.data : SIN_DATOS;
  const rackIds = tipo === "rack" ? [row.id] : racks.map((r) => r.id);

  const seccionesQ = useQuery({
    queryKey: ["contenido", "secciones", rackIds],
    queryFn: () => listarSecciones({ filters: [`rack_id:in:${rackIds.join(",")}`], page_size: -1 }),
    enabled: (tipo === "zona" || tipo === "pasillo" || tipo === "rack") && rackIds.length > 0,
  });
  const secciones =
    seccionesQ.data && esPaginado(seccionesQ.data) ? seccionesQ.data.data : SIN_DATOS;
  const seccionIds = secciones.map((s) => s.id);

  const ubicacionesQ = useQuery({
    queryKey: ["contenido", "ubicaciones", tipo, row.id, rackIds, seccionIds],
    queryFn: () => {
      const filtros = [
        rackIds.length ? `rack_id:in:${rackIds.join(",")}` : "",
        seccionIds.length ? `seccion_id:in:${seccionIds.join(",")}` : "",
        tipo === "zona" ? `zona_id:eq:${row.id}` : "",
      ].filter(Boolean);
      return listarUbicaciones({ filters: filtros, filter_logic: "OR", page_size: -1 });
    },
    enabled:
      tipo !== "ubicacion" && (rackIds.length > 0 || seccionIds.length > 0 || tipo === "zona"),
  });
  const ubicacionIds = useMemo(
    () =>
      tipo === "ubicacion"
        ? [row.id]
        : ubicacionesQ.data && esPaginado(ubicacionesQ.data)
          ? ubicacionesQ.data.data.map((u) => u.id)
          : SIN_DATOS,
    [tipo, row.id, ubicacionesQ.data],
  );

  const saldosQ = useQuery({
    queryKey: ["contenido", "saldos"],
    queryFn: () => listarSaldos(),
    enabled: ubicacionIds.length > 0,
  });

  const filas: FilaContenido[] = useMemo(() => {
    const idsDescendientes = new Set(ubicacionIds);
    return (saldosQ.data ?? [])
      .filter((s) => s.cantidad > 0 && idsDescendientes.has(s.ubicacion_id))
      .map((s) => ({
        ubicacion_id: s.ubicacion_id,
        producto_id: s.producto_id,
        lote_id: s.lote_id,
        cantidad: s.cantidad,
      }));
  }, [saldosQ.data, ubicacionIds]);

  const cargando =
    racksQ.isLoading || seccionesQ.isLoading || ubicacionesQ.isLoading || saldosQ.isLoading;

  const columnas: TableColumn<FilaContenido>[] = [
    {
      key: "producto",
      header: t.campos.producto,
      render: (f) => <ProductoRef id={f.producto_id} />,
    },
    {
      key: "lote",
      header: t.campos.lote,
      render: (f) => (f.lote_id ? <LoteRef id={f.lote_id} /> : "—"),
    },
    ...(tipo === "ubicacion"
      ? []
      : [
          {
            key: "ubicacion",
            header: t.campos.ubicacion,
            render: (f: FilaContenido) => <UbicacionRef id={f.ubicacion_id} />,
          } satisfies TableColumn<FilaContenido>,
        ]),
    {
      key: "cantidad",
      header: t.comun.cantidad,
      num: true,
      render: (f) => formatearNumero(f.cantidad),
    },
  ];

  return (
    <Card title={t.campos.contenido} className="mt-6">
      <Card.Body>
        {cargando ? (
          <Text as="p" size="sm" color="muted">
            Cargando…
          </Text>
        ) : (
          <Table
            columns={columnas}
            rows={filas}
            rowKey={(f) => `${f.ubicacion_id}-${f.producto_id}-${f.lote_id ?? "sin-lote"}`}
            emptyTitle={t.mapa3d.sinStockAqui}
          />
        )}
      </Card.Body>
    </Card>
  );
}

export type { TipoContenido };
