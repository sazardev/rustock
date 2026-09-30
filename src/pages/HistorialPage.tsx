import { useT } from "../shared/i18n";
import { ErrorPanel, ExportButtons, PageHeader } from "../shared/ui";
import { mensajeError } from "../shared/format";
import { nombreExportacion } from "../shared/exportar";
import { EventosTabla } from "./historial/EventosTabla";
import { FiltrosHistorial } from "./historial/FiltrosHistorial";
import { InsightsCard } from "./historial/InsightsCard";
import { PanelMetricas } from "./historial/PanelMetricas";
import { ResumenKpis } from "./historial/ResumenKpis";
import { useHistorial } from "./historial/useHistorial";

export function HistorialPage() {
  const t = useT();
  const h = useHistorial();

  return (
    <>
      <PageHeader title={t.historial.titulo} />

      {h.error ? (
        <ErrorPanel title={t.historial.noSePudoCargar}>{mensajeError(h.error)}</ErrorPanel>
      ) : null}

      <FiltrosHistorial
        filtros={h.filtros}
        onChange={h.cambiarFiltro}
        usuarios={h.usuarios}
        modulos={h.modulosDisponibles}
        action={
          <ExportButtons
            nombre={nombreExportacion("historial-actividad")}
            filas={h.filasExport}
            disabled={h.loading}
          />
        }
      />

      {h.metricas?.resumen ? <ResumenKpis resumen={h.metricas.resumen} /> : null}

      {h.metricas && h.metricas.insights.length > 0 ? (
        <InsightsCard insights={h.metricas.insights} />
      ) : null}

      <PanelMetricas metricas={h.metricas} />

      <EventosTabla
        eventos={h.eventos}
        meta={h.meta}
        usuarioPorId={h.usuarioPorId}
        loading={h.tablaLoading}
        onPageChange={h.setPage}
      />
    </>
  );
}
