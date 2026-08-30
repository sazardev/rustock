import { useQuery } from "@tanstack/react-query";
import { useT, type Diccionario } from "../shared/i18n";
import { obtenerDashboard, obtenerKpisGenerales, listarMovimientos } from "../shared/backend";
import { esPaginado, type Movimiento } from "../shared/types";
import {
  Badge,
  ButtonLink,
  Card,
  DetailList,
  ErrorPanel,
  FilterBar,
  PageHeader,
  Table,
  type TableColumn,
} from "../shared/ui";
import {
  ESTADO_MOVIMIENTO_TONE,
  TIPO_MOVIMIENTO_ICON,
  TIPO_MOVIMIENTO_TONE,
  formatearFecha,
  formatearNumero,
  mensajeError,
} from "../shared/format";

/** Columnas del panel, en el idioma activo (SPEC §17). */
function columnasDe(t: Diccionario): Array<TableColumn<Movimiento>> {
  return [
    { key: "numero", header: t.campos.numero, code: true, render: (m) => m.numero },
    {
      key: "tipo",
      header: t.comun.tipo,
      render: (m) => (
        <Badge tone={TIPO_MOVIMIENTO_TONE[m.tipo]} icon={TIPO_MOVIMIENTO_ICON[m.tipo]}>
          {t.dominio.tipoMovimiento[m.tipo]}
        </Badge>
      ),
    },
    {
      key: "fecha_movimiento",
      header: t.comun.fecha,
      render: (m) => formatearFecha(m.fecha_movimiento),
    },
    {
      key: "estado",
      header: t.comun.estado,
      render: (m) => (
        <Badge tone={ESTADO_MOVIMIENTO_TONE[m.estado]}>
          {t.dominio.estadoMovimiento[m.estado]}
        </Badge>
      ),
    },
  ];
}

export function DashboardPage() {
  const t = useT();
  const columns = columnasDe(t);
  const dashboardQuery = useQuery({
    queryKey: ["dashboard"],
    queryFn: obtenerDashboard,
  });
  const kpisQuery = useQuery({
    queryKey: ["kpis-generales"],
    queryFn: obtenerKpisGenerales,
  });
  const movimientosQuery = useQuery({
    queryKey: ["movimientos", "recientes"],
    queryFn: () => listarMovimientos({ page_size: 5, sort: "-fecha_movimiento" }),
  });

  const resumen = dashboardQuery.data;
  const kpis = kpisQuery.data;
  const movimientosListado = movimientosQuery.data;
  const movimientos =
    movimientosListado && esPaginado(movimientosListado) ? movimientosListado.data : [];

  const kpiItems = resumen
    ? [
        {
          label: t.dashboard.skusActivos,
          value: formatearNumero(resumen.total_skus_activos),
          code: true,
        },
        {
          label: t.dashboard.unidadesTotales,
          value: formatearNumero(resumen.total_unidades),
          code: true,
        },
        {
          label: t.dashboard.valorInventario,
          value: resumen.valor_inventario.toLocaleString(undefined, {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          }),
          code: true,
        },
        {
          label: t.dashboard.alertasActivas,
          value: formatearNumero(resumen.alertas_activas),
          code: true,
        },
        {
          label: t.dashboard.movimientosHoy,
          value: `${formatearNumero(resumen.movimientos_hoy)} (E:${resumen.movimientos_hoy_por_tipo.entradas} S:${resumen.movimientos_hoy_por_tipo.salidas} T:${resumen.movimientos_hoy_por_tipo.traslados} A:${resumen.movimientos_hoy_por_tipo.ajustes})`,
          code: true,
        },
        {
          label: t.dashboard.precisionUltima,
          value:
            resumen.precision_sku_ultima_sesion !== null
              ? `${resumen.precision_sku_ultima_sesion.toFixed(1)}%`
              : t.dashboard.sinSesionesCerradas,
          code: resumen.precision_sku_ultima_sesion !== null,
        },
        {
          label: t.dashboard.ocupacion,
          value: `${resumen.ocupacion_pct.toFixed(1)}% (${resumen.ubicaciones_con_stock}/${resumen.ubicaciones_totales})`,
          code: true,
        },
      ]
    : [];

  const kpiGeneralItems = kpis
    ? [
        { label: t.dashboard.tasaMerma, value: `${kpis.tasa_merma_pct.toFixed(2)}%`, code: true },
        {
          label: t.dashboard.lotesVencidos,
          value: formatearNumero(kpis.lotes_vencidos_sin_dar_de_baja),
          code: true,
        },
        {
          label: t.dashboard.rotacion,
          value: kpis.rotacion_stock_30d.toFixed(2),
          code: true,
        },
        {
          label: t.dashboard.diasCobertura,
          value:
            kpis.dias_cobertura !== null ? kpis.dias_cobertura.toFixed(1) : t.dashboard.sinSalidas,
          code: kpis.dias_cobertura !== null,
        },
        {
          label: t.dashboard.antiguedad,
          value:
            kpis.antiguedad_stock_dias !== null
              ? t.dashboard.dias({ total: kpis.antiguedad_stock_dias.toFixed(1) })
              : t.dashboard.sinStock,
          code: kpis.antiguedad_stock_dias !== null,
        },
        {
          label: t.dashboard.precisionCantidad,
          value:
            kpis.precision_cantidad_ultima_sesion !== null
              ? `${kpis.precision_cantidad_ultima_sesion.toFixed(1)}%`
              : t.dashboard.sinSesionesCerradas,
          code: kpis.precision_cantidad_ultima_sesion !== null,
        },
        {
          label: t.dashboard.exactitudUbicacion,
          value:
            kpis.exactitud_ubicacion_ultima_sesion !== null
              ? `${kpis.exactitud_ubicacion_ultima_sesion.toFixed(1)}%`
              : t.dashboard.sinSesionesCerradas,
          code: kpis.exactitud_ubicacion_ultima_sesion !== null,
        },
      ]
    : [];

  const error = dashboardQuery.error ?? kpisQuery.error ?? movimientosQuery.error;

  return (
    <>
      <PageHeader title={t.nav.dashboard} />

      <FilterBar
        action={
          <ButtonLink variant="primary" icon="agregar" href="/movimientos/nuevo">
            {t.dashboard.nuevoMovimiento}
          </ButtonLink>
        }
      />

      {error ? (
        <ErrorPanel title={t.dashboard.noSePudoCargar}>{mensajeError(error)}</ErrorPanel>
      ) : null}

      <Card title={t.dashboard.indicadoresClave}>
        <Card.Body>
          {dashboardQuery.isLoading ? (
            <p className="text-base text-gray-500">Cargando…</p>
          ) : (
            <DetailList items={kpiItems} className="detail-list--stats" />
          )}
        </Card.Body>
      </Card>

      <div className="mt-8 grid grid-cols-1 gap-6 md:grid-cols-2">
        <Card title={t.dashboard.movimientosRecientes}>
          <Table
            columns={columns}
            rows={movimientos}
            rowKey={(m) => m.id}
            loading={movimientosQuery.isLoading}
            emptyTitle={t.dashboard.sinMovimientos}
            emptyDescription={t.dashboard.sinMovimientosDesc}
          />
        </Card>
        <Card title={t.dashboard.indicadoresAdicionales}>
          <Card.Body>
            {kpisQuery.isLoading ? (
              <p className="text-base text-gray-500">Cargando…</p>
            ) : (
              <DetailList items={kpiGeneralItems} />
            )}
          </Card.Body>
        </Card>
      </div>
    </>
  );
}
