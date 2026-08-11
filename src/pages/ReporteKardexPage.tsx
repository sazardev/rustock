import { useQuery } from "@tanstack/react-query";
import { useNavigate, useParams } from "react-router";
import { kardexProducto, listarProductos } from "../shared/backend";
import { esPaginado, type KardexLinea } from "../shared/types";
import {
  Badge,
  ButtonLink,
  Card,
  ErrorPanel,
  PageHeader,
  Select,
  Table,
  type TableColumn,
} from "../shared/ui";
import { PATH, reporteKardexProducto } from "../app/route-paths";
import {
  TIPO_MOVIMIENTO_LABEL,
  TIPO_MOVIMIENTO_TONE,
  formatearFecha,
  mensajeError,
} from "../shared/format";

export function ReporteKardexPage() {
  const { productoId } = useParams<{ productoId?: string }>();
  const navigate = useNavigate();

  const productosQuery = useQuery({
    queryKey: ["productos", "selector-kardex"],
    queryFn: () => listarProductos({ page_size: 200, sort: "nombre" }),
  });
  const productos =
    productosQuery.data && esPaginado(productosQuery.data) ? productosQuery.data.data : [];

  const kardexQuery = useQuery({
    queryKey: ["kardex", productoId],
    queryFn: () => kardexProducto(productoId as string),
    enabled: Boolean(productoId),
  });

  const columns: Array<TableColumn<KardexLinea>> = [
    { key: "numero", header: "Movimiento", code: true, render: (l) => l.numero },
    {
      key: "tipo",
      header: "Tipo",
      render: (l) => (
        <Badge tone={TIPO_MOVIMIENTO_TONE[l.tipo]}>{TIPO_MOVIMIENTO_LABEL[l.tipo]}</Badge>
      ),
    },
    {
      key: "fecha_movimiento",
      header: "Fecha",
      render: (l) => formatearFecha(l.fecha_movimiento),
    },
    {
      key: "entrada",
      header: "Entrada",
      num: true,
      render: (l) => (l.entrada > 0 ? l.entrada.toLocaleString() : "—"),
    },
    {
      key: "salida",
      header: "Salida",
      num: true,
      render: (l) => (l.salida > 0 ? l.salida.toLocaleString() : "—"),
    },
    {
      key: "saldo_acumulado",
      header: "Saldo acumulado",
      num: true,
      render: (l) => l.saldo_acumulado.toLocaleString(),
    },
  ];

  return (
    <>
      <PageHeader
        title="Kardex de producto"
        description="Tarjeta de stock: movimientos y saldo acumulado por producto."
        actions={
          <ButtonLink variant="secondary" icon="atras" href={PATH.reportes}>
            Volver a reportes
          </ButtonLink>
        }
      />

      {productosQuery.error ? (
        <ErrorPanel title="No se pudo cargar el catálogo de productos">
          {mensajeError(productosQuery.error)}
        </ErrorPanel>
      ) : null}
      {kardexQuery.error ? (
        <ErrorPanel title="No se pudo cargar el kardex">
          {mensajeError(kardexQuery.error)}
        </ErrorPanel>
      ) : null}

      <Card
        title="Seleccionar producto"
        actions={
          <Select
            aria-label="Producto"
            placeholder="Selecciona un producto"
            value={productoId ?? ""}
            onChange={(e) => {
              const id = e.target.value;
              if (id) navigate(reporteKardexProducto(id));
            }}
          >
            {productos.map((p) => (
              <option key={p.id} value={p.id}>
                {p.sku} — {p.nombre}
              </option>
            ))}
          </Select>
        }
      >
        {productoId ? (
          <Table
            columns={columns}
            rows={kardexQuery.data ?? []}
            rowKey={(l) => l.movimiento_id}
            loading={kardexQuery.isLoading}
            emptyTitle="Sin movimientos para este producto"
            emptyDescription="El kardex se completa a medida que se aprueban movimientos."
          />
        ) : (
          <p className="text-base text-gray-500">
            Selecciona un producto para ver su historial de movimientos y saldo acumulado.
          </p>
        )}
      </Card>
    </>
  );
}
