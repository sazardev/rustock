import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router";
import {
  listarAlmacenes,
  listarCategorias,
  listarLotes,
  listarProductos,
  listarRacks,
  listarSaldos,
  listarSecciones,
  listarUbicaciones,
  listarZonas,
} from "../shared/backend";
import {
  esPaginado,
  type Rack,
  type Saldo,
  type Seccion,
  type Ubicacion,
  type Zona,
} from "../shared/types";
import {
  Badge,
  ButtonLink,
  Card,
  DetailList,
  ErrorPanel,
  ExportButtons,
  FilterBar,
  FilterField,
  Input,
  PageHeader,
  Select,
  Table,
  type TableColumn,
} from "../shared/ui";
import { LoteRef, ProductoRef, UbicacionRef } from "../shared/refs";
import { catalogoDetalle, PATH } from "../app/route-paths";
import { mensajeError } from "../shared/format";
import { nombreExportacion } from "../shared/exportar";

interface FilaProducto {
  producto_id: string;
  unidades: number;
  ubicaciones: number;
  lotes: number;
}

/** Resuelve el almacén de una ubicación caminando el árbol (SPEC §3.13). */
function almacenDeUbicacion(
  u: Ubicacion,
  secciones: Map<string, Seccion>,
  racks: Map<string, Rack>,
  zonas: Map<string, Zona>,
): string | null {
  if (u.seccion_id) {
    const seccion = secciones.get(u.seccion_id);
    const rack = seccion ? racks.get(seccion.rack_id) : undefined;
    const zona = rack ? zonas.get(rack.zona_id) : undefined;
    return zona?.almacen_id ?? null;
  }
  if (u.rack_id) {
    const rack = racks.get(u.rack_id);
    const zona = rack ? zonas.get(rack.zona_id) : undefined;
    return zona?.almacen_id ?? null;
  }
  if (u.zona_id) {
    return zonas.get(u.zona_id)?.almacen_id ?? null;
  }
  return null;
}

export function ReporteStockPage() {
  const navigate = useNavigate();
  const [q, setQ] = useState("");
  const [categoriaId, setCategoriaId] = useState("");
  const [almacenId, setAlmacenId] = useState("");

  const saldosQuery = useQuery({
    queryKey: ["saldos", "reporte-stock"],
    queryFn: () => listarSaldos(),
  });
  const productosQuery = useQuery({
    queryKey: ["productos", "reporte-stock"],
    queryFn: () => listarProductos({ page_size: -1, sort: "sku" }),
  });
  const categoriasQuery = useQuery({
    queryKey: ["categorias", "reporte-stock"],
    queryFn: () => listarCategorias({ page_size: -1, sort: "nombre" }),
  });
  const ubicacionesQuery = useQuery({
    queryKey: ["ubicaciones", "reporte-stock"],
    queryFn: () => listarUbicaciones({ page_size: -1, sort: "codigo" }),
  });
  const zonasQuery = useQuery({
    queryKey: ["zonas", "reporte-stock"],
    queryFn: () => listarZonas({ page_size: -1, sort: "codigo" }),
  });
  const racksQuery = useQuery({
    queryKey: ["racks", "reporte-stock"],
    queryFn: () => listarRacks({ page_size: -1, sort: "codigo" }),
  });
  const seccionesQuery = useQuery({
    queryKey: ["secciones", "reporte-stock"],
    queryFn: () => listarSecciones({ page_size: -1, sort: "codigo" }),
  });
  const almacenesQuery = useQuery({
    queryKey: ["almacenes", "reporte-stock"],
    queryFn: () => listarAlmacenes({ page_size: -1, sort: "codigo" }),
  });
  const lotesQuery = useQuery({
    queryKey: ["lotes", "reporte-stock"],
    queryFn: () => listarLotes({ page_size: -1, sort: "numero" }),
  });

  const productoPorId = useMemo(() => {
    const l =
      productosQuery.data && esPaginado(productosQuery.data) ? productosQuery.data.data : [];
    return new Map(l.map((p) => [p.id, p]));
  }, [productosQuery.data]);
  const categoriaPorId = useMemo(() => {
    const l =
      categoriasQuery.data && esPaginado(categoriasQuery.data) ? categoriasQuery.data.data : [];
    return new Map(l.map((c) => [c.id, c]));
  }, [categoriasQuery.data]);
  const almacenPorId = useMemo(() => {
    const l =
      almacenesQuery.data && esPaginado(almacenesQuery.data) ? almacenesQuery.data.data : [];
    return new Map(l.map((a) => [a.id, a]));
  }, [almacenesQuery.data]);
  const ubicacionPorId = useMemo(() => {
    const l =
      ubicacionesQuery.data && esPaginado(ubicacionesQuery.data) ? ubicacionesQuery.data.data : [];
    return new Map(l.map((u) => [u.id, u]));
  }, [ubicacionesQuery.data]);
  const lotePorId = useMemo(() => {
    const l = lotesQuery.data && esPaginado(lotesQuery.data) ? lotesQuery.data.data : [];
    return new Map(l.map((lo) => [lo.id, lo]));
  }, [lotesQuery.data]);

  const almacenPorUbicacion = useMemo(() => {
    const secciones = new Map(
      (seccionesQuery.data && esPaginado(seccionesQuery.data) ? seccionesQuery.data.data : []).map(
        (s) => [s.id, s],
      ),
    );
    const racks = new Map(
      (racksQuery.data && esPaginado(racksQuery.data) ? racksQuery.data.data : []).map((r) => [
        r.id,
        r,
      ]),
    );
    const zonas = new Map(
      (zonasQuery.data && esPaginado(zonasQuery.data) ? zonasQuery.data.data : []).map((z) => [
        z.id,
        z,
      ]),
    );
    const mapa = new Map<string, string>();
    for (const u of ubicacionPorId.values()) {
      const almacen = almacenDeUbicacion(u, secciones, racks, zonas);
      if (almacen) mapa.set(u.id, almacen);
    }
    return mapa;
  }, [ubicacionPorId, seccionesQuery.data, racksQuery.data, zonasQuery.data]);

  const filtrados = useMemo<Saldo[]>(() => {
    const todos = saldosQuery.data ?? [];
    const ql = q.trim().toLowerCase();
    return todos.filter((s) => {
      const p = productoPorId.get(s.producto_id);
      if (categoriaId && p?.categoria_id !== categoriaId) return false;
      if (almacenId && almacenPorUbicacion.get(s.ubicacion_id) !== almacenId) return false;
      if (ql) {
        const texto = `${p?.sku ?? ""} ${p?.nombre ?? ""}`.toLowerCase();
        if (!texto.includes(ql)) return false;
      }
      return true;
    });
  }, [q, categoriaId, almacenId, saldosQuery.data, productoPorId, almacenPorUbicacion]);

  const porProducto = useMemo<FilaProducto[]>(() => {
    const mapa = new Map<string, FilaProducto>();
    for (const s of filtrados) {
      let fila = mapa.get(s.producto_id);
      if (!fila) {
        fila = { producto_id: s.producto_id, unidades: 0, ubicaciones: 0, lotes: 0 };
        mapa.set(s.producto_id, fila);
      }
      fila.unidades += s.cantidad;
      if (s.lote_id) fila.lotes += 1;
    }
    const ubicaciones = new Map<string, Set<string>>();
    for (const s of filtrados) {
      const set = ubicaciones.get(s.producto_id) ?? new Set<string>();
      set.add(s.ubicacion_id);
      ubicaciones.set(s.producto_id, set);
    }
    for (const fila of mapa.values()) {
      fila.ubicaciones = ubicaciones.get(fila.producto_id)?.size ?? 0;
    }
    return [...mapa.values()];
  }, [filtrados]);

  const totalUnidades = filtrados.reduce((acc, s) => acc + s.cantidad, 0);
  const productosConStock = porProducto.length;
  const ubicacionesConStock = new Set(filtrados.map((s) => s.ubicacion_id)).size;

  const filasExport = useMemo(
    () =>
      filtrados.map((s) => {
        const p = productoPorId.get(s.producto_id);
        return {
          sku: p?.sku ?? s.producto_id,
          producto: p?.nombre ?? "",
          categoria: p?.categoria_id ? (categoriaPorId.get(p.categoria_id)?.nombre ?? "") : "",
          ubicacion: ubicacionPorId.get(s.ubicacion_id)?.codigo ?? s.ubicacion_id,
          almacen: almacenPorId.get(almacenPorUbicacion.get(s.ubicacion_id) ?? "")?.codigo ?? "",
          lote: s.lote_id ? (lotePorId.get(s.lote_id)?.numero ?? s.lote_id) : "",
          cantidad: s.cantidad,
          actualizado: s.updated_at.slice(0, 10),
        };
      }),
    [
      filtrados,
      productoPorId,
      categoriaPorId,
      ubicacionPorId,
      almacenPorId,
      almacenPorUbicacion,
      lotePorId,
    ],
  );

  const columnasProducto: Array<TableColumn<FilaProducto>> = [
    {
      key: "producto_id",
      header: "SKU",
      code: true,
      render: (f) => <ProductoRef id={f.producto_id} />,
    },
    {
      key: "nombre",
      header: "Producto",
      render: (f) => productoPorId.get(f.producto_id)?.nombre ?? "—",
    },
    { key: "ubicaciones", header: "Ubicaciones", num: true, render: (f) => f.ubicaciones },
    { key: "lotes", header: "Lotes", num: true, render: (f) => f.lotes },
    { key: "unidades", header: "Unidades", num: true, render: (f) => f.unidades.toLocaleString() },
    {
      key: "minimo",
      header: "Mínimo",
      num: true,
      render: (f) => productoPorId.get(f.producto_id)?.stock_minimo?.toLocaleString() ?? "—",
    },
    {
      key: "maximo",
      header: "Máximo",
      num: true,
      render: (f) => productoPorId.get(f.producto_id)?.stock_maximo?.toLocaleString() ?? "—",
    },
    {
      key: "estado_stock",
      header: "Estado",
      render: (f) => {
        const p = productoPorId.get(f.producto_id);
        const minimo = p?.stock_minimo;
        if (minimo !== null && minimo !== undefined && minimo > 0 && f.unidades <= minimo) {
          return (
            <Badge tone="danger" icon="alerta">
              Stock bajo
            </Badge>
          );
        }
        return "—";
      },
    },
  ];

  const columnasDetalle: Array<TableColumn<Saldo>> = [
    { key: "producto_id", header: "Producto", render: (s) => <ProductoRef id={s.producto_id} /> },
    {
      key: "ubicacion_id",
      header: "Ubicación",
      render: (s) => <UbicacionRef id={s.ubicacion_id} />,
    },
    {
      key: "almacen",
      header: "Almacén",
      render: (s) => {
        const almacen = almacenPorUbicacion.get(s.ubicacion_id);
        return almacen ? (almacenPorId.get(almacen)?.codigo ?? "—") : "—";
      },
    },
    {
      key: "lote_id",
      header: "Lote",
      render: (s) => (s.lote_id ? <LoteRef id={s.lote_id} /> : "—"),
    },
    { key: "cantidad", header: "Cantidad", num: true, render: (s) => s.cantidad.toLocaleString() },
    {
      key: "updated_at",
      header: "Actualizado",
      render: (s) => new Date(s.updated_at).toLocaleDateString(),
    },
  ];

  const error = saldosQuery.error ?? productosQuery.error;

  return (
    <>
      <PageHeader
        title="Stock actual"
        description="Existencias registradas por producto, ubicación y lote, con mínimos y máximos."
        actions={
          <ButtonLink variant="secondary" icon="atras" href={PATH.reportes}>
            Volver a reportes
          </ButtonLink>
        }
      />

      {error ? (
        <ErrorPanel title="No se pudo cargar el stock">{mensajeError(error)}</ErrorPanel>
      ) : null}

      <div className="mt-6 grid grid-cols-1 gap-6 md:grid-cols-3">
        <Card title="Productos con stock">
          <Card.Body>
            <DetailList
              items={[
                { label: "Productos", value: productosConStock.toLocaleString(), code: true },
                { label: "Unidades totales", value: totalUnidades.toLocaleString(), code: true },
              ]}
            />
          </Card.Body>
        </Card>
        <Card title="Ubicaciones con stock">
          <Card.Body>
            <DetailList
              items={[
                { label: "Ubicaciones", value: ubicacionesConStock.toLocaleString(), code: true },
                { label: "Filas de stock", value: filtrados.length.toLocaleString(), code: true },
              ]}
            />
          </Card.Body>
        </Card>
        <Card title="Saldo derivado">
          <Card.Body>
            <p className="text-sm text-gray-500">
              El saldo se calcula exclusivamente desde movimientos aprobados. Toda alteración de
              stock pasa por un movimiento.
            </p>
          </Card.Body>
        </Card>
      </div>

      <div className="mt-6">
        <FilterBar
          action={
            <ExportButtons
              nombre={nombreExportacion("stock-actual")}
              filas={filasExport}
              disabled={saldosQuery.isLoading}
            />
          }
        >
          <FilterField grow>
            <Input
              type="search"
              aria-label="Buscar producto"
              placeholder="Buscar por SKU o nombre de producto"
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
          </FilterField>
          <FilterField>
            <Select
              aria-label="Filtrar por categoría"
              value={categoriaId}
              onChange={(e) => setCategoriaId(e.target.value)}
            >
              <option value="">Todas las categorías</option>
              {categoriaPorId.size > 0
                ? [...categoriaPorId.values()].map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.nombre}
                    </option>
                  ))
                : null}
            </Select>
          </FilterField>
          <FilterField>
            <Select
              aria-label="Filtrar por almacén"
              value={almacenId}
              onChange={(e) => setAlmacenId(e.target.value)}
            >
              <option value="">Todos los almacenes</option>
              {almacenPorId.size > 0
                ? [...almacenPorId.values()].map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.codigo}
                    </option>
                  ))
                : null}
            </Select>
          </FilterField>
        </FilterBar>
      </div>

      <div className="mt-6">
        <Card title="Stock por producto">
          <Table
            columns={columnasProducto}
            rows={porProducto}
            rowKey={(f) => f.producto_id}
            loading={saldosQuery.isLoading || productosQuery.isLoading}
            onRowClick={(f) => navigate(catalogoDetalle("productos", f.producto_id))}
            emptyTitle="Sin stock registrado"
            emptyDescription="No hay existencias para los criterios actuales."
          />
        </Card>
      </div>

      <div className="mt-6">
        <Card title="Detalle por ubicación y lote">
          <Table
            columns={columnasDetalle}
            rows={filtrados}
            rowKey={(s) => `${s.ubicacion_id}-${s.producto_id}-${s.lote_id ?? ""}`}
            loading={saldosQuery.isLoading}
            onRowClick={(s) => navigate(catalogoDetalle("ubicaciones", s.ubicacion_id))}
            emptyTitle="Sin detalle de stock"
            emptyDescription="No hay filas de stock para los criterios actuales."
          />
        </Card>
      </div>
    </>
  );
}
