import { useMemo } from "react";
import { useT } from "../shared/i18n";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router";
import { listarSesionesInventario, precisionSesion } from "../shared/backend";
import { esPaginado, type PrecisionSesion, type SesionInventario } from "../shared/types";
import {
  Badge,
  ButtonLink,
  Card,
  DetailList,
  ErrorPanel,
  ExportButtons,
  PageHeader,
  Table,
  type TableColumn,
} from "../shared/ui";
import { PATH, sesionInventarioDetalle } from "../app/route-paths";
import { formatearFechaCorta, mensajeError } from "../shared/format";
import { nombreExportacion } from "../shared/exportar";

interface FilaPrecision {
  sesion: SesionInventario;
  precision: PrecisionSesion;
}

export function ReportePrecisionPage() {
  const t = useT();
  const navigate = useNavigate();

  const query = useQuery({
    queryKey: ["reporte-precision"],
    queryFn: async (): Promise<FilaPrecision[]> => {
      const listado = await listarSesionesInventario({
        filters: ["estado:eq:CERRADA"],
        page_size: -1,
        sort: "-created_at",
      });
      const sesiones = esPaginado(listado) ? listado.data : [];
      const precisiones = await Promise.all(sesiones.map((s) => precisionSesion(s.id)));
      return sesiones.map((s, i) => ({ sesion: s, precision: precisiones[i] }));
    },
  });

  const filas = query.data ?? [];

  const promedio = (selector: (f: FilaPrecision) => number): number => {
    if (filas.length === 0) return 0;
    return filas.reduce((acc, f) => acc + selector(f), 0) / filas.length;
  };

  const filasExport = useMemo(() => {
    const filas = query.data ?? [];
    return filas.map((f) => ({
      sesion: f.sesion.numero,
      tipo: t.dominio.tipoSesion[f.sesion.tipo],
      cerrada: formatearFechaCorta(f.sesion.closed_at ?? f.sesion.fecha_fin),
      precision_sku_pct: f.precision.precision_sku.toFixed(1),
      skus_exactos: f.precision.skus_exactos,
      skus_contados: f.precision.skus_contados,
      precision_cantidad_pct: f.precision.precision_cantidad.toFixed(1),
      unidades_correctas: f.precision.unidades_correctas,
      unidades_contadas: f.precision.unidades_contadas,
      exactitud_ubicacion_pct: f.precision.exactitud_ubicacion.toFixed(1),
      ubicaciones_exactas: f.precision.ubicaciones_exactas,
      ubicaciones_contadas: f.precision.ubicaciones_contadas,
    }));
  }, [query.data, t.dominio.tipoSesion]);

  const columns: Array<TableColumn<FilaPrecision>> = [
    {
      key: "numero",
      header: t.reportes.columnas.sesion,
      code: true,
      render: (f) => f.sesion.numero,
    },
    {
      key: "tipo",
      header: t.comun.tipo,
      render: (f) => <Badge tone="info">{t.dominio.tipoSesion[f.sesion.tipo]}</Badge>,
    },
    {
      key: "fecha_fin",
      header: t.reportes.precision.cerradaEl,
      render: (f) => formatearFechaCorta(f.sesion.closed_at ?? f.sesion.fecha_fin),
    },
    {
      key: "precision_sku",
      header: t.reportes.precision.precisionSku,
      num: true,
      render: (f) =>
        `${f.precision.precision_sku.toFixed(1)}% (${f.precision.skus_exactos}/${f.precision.skus_contados})`,
    },
    {
      key: "precision_cantidad",
      header: t.reportes.precision.precisionCantidad,
      num: true,
      render: (f) =>
        `${f.precision.precision_cantidad.toFixed(1)}% (${f.precision.unidades_correctas}/${f.precision.unidades_contadas})`,
    },
    {
      key: "exactitud_ubicacion",
      header: t.reportes.precision.exactitudUbicacion,
      num: true,
      render: (f) =>
        `${f.precision.exactitud_ubicacion.toFixed(1)}% (${f.precision.ubicaciones_exactas}/${f.precision.ubicaciones_contadas})`,
    },
  ];

  return (
    <>
      <PageHeader
        title={t.reportes.precision.titulo}
        description={t.reportes.precision.descripcion}
        actions={
          <ButtonLink variant="secondary" icon="atras" href={PATH.reportes}>
            {t.reportes.volver}
          </ButtonLink>
        }
      />

      {query.error ? (
        <ErrorPanel title={t.reportes.precision.noSePudoCalcular}>
          {mensajeError(query.error)}
        </ErrorPanel>
      ) : null}

      <div className="mt-6 grid grid-cols-1 gap-6 md:grid-cols-3">
        <Card title={t.reportes.precision.promedioSku}>
          <Card.Body>
            <DetailList
              items={[
                {
                  label: t.reportes.precision.precisionPromedio,
                  value: `${promedio((f) => f.precision.precision_sku).toFixed(1)}%`,
                  code: true,
                },
              ]}
            />
          </Card.Body>
        </Card>
        <Card title={t.reportes.precision.promedioCantidad}>
          <Card.Body>
            <DetailList
              items={[
                {
                  label: t.reportes.precision.precisionPromedio,
                  value: `${promedio((f) => f.precision.precision_cantidad).toFixed(1)}%`,
                  code: true,
                },
              ]}
            />
          </Card.Body>
        </Card>
        <Card title={t.reportes.precision.promedioUbicacion}>
          <Card.Body>
            <DetailList
              items={[
                {
                  label: t.reportes.precision.exactitudPromedio,
                  value: `${promedio((f) => f.precision.exactitud_ubicacion).toFixed(1)}%`,
                  code: true,
                },
              ]}
            />
          </Card.Body>
        </Card>
      </div>

      <div className="mt-6">
        <Card
          title={t.reportes.precision.evolucion}
          actions={
            <ExportButtons
              nombre={nombreExportacion("precision-inventario")}
              filas={filasExport}
              disabled={query.isLoading}
            />
          }
        >
          {query.isLoading ? (
            <Card.Body>
              <p className="text-base text-gray-500">{t.comun.cargando}</p>
            </Card.Body>
          ) : filas.length > 0 ? (
            <Card.Body>
              {filas.map((f) => (
                <div key={f.sesion.id} className="chart-row" title={f.sesion.numero}>
                  <span className="chart-row__label">{f.sesion.numero}</span>
                  <div className="chart-row__track">
                    <div
                      className="chart-row__fill"
                      style={{ width: `${Math.min(100, Math.max(0, f.precision.precision_sku))}%` }}
                    />
                  </div>
                  <span className="chart-row__value">{f.precision.precision_sku.toFixed(1)}%</span>
                </div>
              ))}
            </Card.Body>
          ) : (
            <Card.Body>
              <p className="text-base text-gray-500">Sin sesiones cerradas para graficar.</p>
            </Card.Body>
          )}
        </Card>
      </div>

      <div className="mt-6">
        <Card title={t.reportes.precision.sesionesCerradas}>
          <Table
            columns={columns}
            rows={filas}
            rowKey={(f) => f.sesion.id}
            loading={query.isLoading}
            onRowClick={(f) => navigate(sesionInventarioDetalle(f.sesion.id))}
            emptyTitle={t.reportes.precision.sinSesiones}
            emptyDescription={t.reportes.precision.sinSesionesDesc}
          />
        </Card>
      </div>
    </>
  );
}
