import { useQuery } from "@tanstack/react-query";
import { useT } from "../shared/i18n";
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
import { TIPO_MOVIMIENTO_TONE, formatearFecha, mensajeError } from "../shared/format";

export function ReporteKardexPage() {
  const t = useT();
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
    { key: "numero", header: t.reportes.kardex.movimiento, code: true, render: (l) => l.numero },
    {
      key: "tipo",
      header: t.comun.tipo,
      render: (l) => (
        <Badge tone={TIPO_MOVIMIENTO_TONE[l.tipo]}>{t.dominio.tipoMovimiento[l.tipo]}</Badge>
      ),
    },
    {
      key: "fecha_movimiento",
      header: t.comun.fecha,
      render: (l) => formatearFecha(l.fecha_movimiento),
    },
    {
      key: "entrada",
      header: t.reportes.kardex.entrada,
      num: true,
      render: (l) => (l.entrada > 0 ? l.entrada.toLocaleString() : "—"),
    },
    {
      key: "salida",
      header: t.reportes.kardex.salida,
      num: true,
      render: (l) => (l.salida > 0 ? l.salida.toLocaleString() : "—"),
    },
    {
      key: "saldo_acumulado",
      header: t.reportes.kardex.saldoAcumulado,
      num: true,
      render: (l) => l.saldo_acumulado.toLocaleString(),
    },
  ];

  return (
    <>
      <PageHeader
        title={t.reportes.kardex.titulo}
        description={t.reportes.kardex.descripcion}
        actions={
          <ButtonLink variant="secondary" icon="atras" href={PATH.reportes}>
            {t.reportes.volver}
          </ButtonLink>
        }
      />

      {productosQuery.error ? (
        <ErrorPanel title={t.reportes.kardex.noSePudoCatalogo}>
          {mensajeError(productosQuery.error)}
        </ErrorPanel>
      ) : null}
      {kardexQuery.error ? (
        <ErrorPanel title={t.reportes.kardex.noSePudoCargar}>
          {mensajeError(kardexQuery.error)}
        </ErrorPanel>
      ) : null}

      <Card
        title={t.reportes.kardex.seleccionarProducto}
        actions={
          <Select
            aria-label={t.campos.producto}
            placeholder={t.reportes.kardex.seleccionaUnProducto}
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
            emptyTitle={t.reportes.kardex.sinMovimientos}
            emptyDescription={t.reportes.kardex.sinMovimientosDesc}
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
