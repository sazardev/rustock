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
  mensajeError,
} from "../shared/format";

/** Columnas del panel, en el idioma activo (SPEC §17). */
function columnasDe(t: Diccionario): Array<TableColumn<Movimiento>> {
  return [
    { key: "numero", header: "Número", code: true, render: (m) => m.numero },
    {
      key: "tipo",
      header: "Tipo",
      render: (m) => (
        <Badge tone={TIPO_MOVIMIENTO_TONE[m.tipo]} icon={TIPO_MOVIMIENTO_ICON[m.tipo]}>
          {t.dominio.tipoMovimiento[m.tipo]}
        </Badge>
      ),
    },
    {
      key: "fecha_movimiento",
      header: "Fecha",
      render: (m) => formatearFecha(m.fecha_movimiento),
    },
    {
      key: "estado",
      header: "Estado",
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
        { label: "SKUs activos", value: resumen.total_skus_activos.toLocaleString(), code: true },
        { label: "Unidades totales", value: resumen.total_unidades.toLocaleString(), code: true },
        {
          label: "Valor del inventario",
          value: resumen.valor_inventario.toLocaleString(undefined, {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          }),
          code: true,
        },
        { label: "Alertas activas", value: resumen.alertas_activas.toLocaleString(), code: true },
        {
          label: "Movimientos de hoy",
          value: `${resumen.movimientos_hoy.toLocaleString()} (E:${resumen.movimientos_hoy_por_tipo.entradas} S:${resumen.movimientos_hoy_por_tipo.salidas} T:${resumen.movimientos_hoy_por_tipo.traslados} A:${resumen.movimientos_hoy_por_tipo.ajustes})`,
          code: true,
        },
        {
          label: "Precisión (última sesión)",
          value:
            resumen.precision_sku_ultima_sesion !== null
              ? `${resumen.precision_sku_ultima_sesion.toFixed(1)}%`
              : "Sin sesiones cerradas",
          code: resumen.precision_sku_ultima_sesion !== null,
        },
        {
          label: "Ocupación de ubicaciones",
          value: `${resumen.ocupacion_pct.toFixed(1)}% (${resumen.ubicaciones_con_stock}/${resumen.ubicaciones_totales})`,
          code: true,
        },
      ]
    : [];

  const kpiGeneralItems = kpis
    ? [
        { label: "Tasa de merma", value: `${kpis.tasa_merma_pct.toFixed(2)}%`, code: true },
        {
          label: "Lotes vencidos sin dar de baja",
          value: kpis.lotes_vencidos_sin_dar_de_baja.toLocaleString(),
          code: true,
        },
        {
          label: "Rotación de stock (30 días)",
          value: kpis.rotacion_stock_30d.toFixed(2),
          code: true,
        },
        {
          label: "Días de cobertura",
          value:
            kpis.dias_cobertura !== null ? kpis.dias_cobertura.toFixed(1) : "Sin salidas recientes",
          code: kpis.dias_cobertura !== null,
        },
        {
          label: "Antigüedad promedio del stock",
          value:
            kpis.antiguedad_stock_dias !== null
              ? `${kpis.antiguedad_stock_dias.toFixed(1)} días`
              : "Sin stock",
          code: kpis.antiguedad_stock_dias !== null,
        },
        {
          label: "Precisión por cantidad (última sesión)",
          value:
            kpis.precision_cantidad_ultima_sesion !== null
              ? `${kpis.precision_cantidad_ultima_sesion.toFixed(1)}%`
              : "Sin sesiones cerradas",
          code: kpis.precision_cantidad_ultima_sesion !== null,
        },
        {
          label: "Exactitud por ubicación (última sesión)",
          value:
            kpis.exactitud_ubicacion_ultima_sesion !== null
              ? `${kpis.exactitud_ubicacion_ultima_sesion.toFixed(1)}%`
              : "Sin sesiones cerradas",
          code: kpis.exactitud_ubicacion_ultima_sesion !== null,
        },
      ]
    : [];

  const error = dashboardQuery.error ?? kpisQuery.error ?? movimientosQuery.error;

  return (
    <>
      <PageHeader title="Dashboard" />

      <FilterBar
        action={
          <ButtonLink variant="primary" icon="agregar" href="/movimientos/nuevo">
            Nuevo movimiento
          </ButtonLink>
        }
      />

      {error ? (
        <ErrorPanel title="No se pudieron cargar los indicadores">{mensajeError(error)}</ErrorPanel>
      ) : null}

      <Card title="Indicadores clave">
        <Card.Body>
          {dashboardQuery.isLoading ? (
            <p className="text-base text-gray-500">Cargando…</p>
          ) : (
            <DetailList items={kpiItems} className="detail-list--stats" />
          )}
        </Card.Body>
      </Card>

      <div className="mt-8 grid grid-cols-1 gap-6 md:grid-cols-2">
        <Card title="Movimientos recientes">
          <Table
            columns={columns}
            rows={movimientos}
            rowKey={(m) => m.id}
            loading={movimientosQuery.isLoading}
            emptyTitle="Sin movimientos todavía"
            emptyDescription="Los últimos movimientos se muestran aquí una vez que exista historial."
          />
        </Card>
        <Card title="Indicadores adicionales">
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
