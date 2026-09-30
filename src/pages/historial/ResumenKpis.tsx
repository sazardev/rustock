import type { MetricasActividad } from "../../shared/audit";
import { formatearNumero } from "../../shared/format";
import { useT } from "../../shared/i18n";
import { KpiCard } from "./KpiCard";
import { formatoDuracion } from "./formato";

export function ResumenKpis({ resumen }: { resumen: MetricasActividad["resumen"] }) {
  const t = useT();
  return (
    <div className="mt-6 grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-6">
      <KpiCard titulo="Eventos" valor={formatearNumero(resumen.total_eventos)} />
      <KpiCard
        titulo="Vistas"
        valor={formatearNumero(resumen.total_vistas)}
        detalle={t.historial.paginasVisitadas}
      />
      <KpiCard
        titulo="Operaciones"
        valor={formatearNumero(resumen.total_operaciones)}
        detalle={`${resumen.escrituras} escrituras · ${resumen.lecturas} lecturas`}
      />
      <KpiCard
        titulo={t.historial.tasaExito}
        valor={`${resumen.tasa_exito.toFixed(1)}%`}
        detalle={`${resumen.errores} errores`}
      />
      <KpiCard
        titulo={t.historial.usuariosActivos}
        valor={formatearNumero(resumen.usuarios_activos)}
      />
      <KpiCard
        titulo={t.historial.duracionMedia}
        valor={formatoDuracion(resumen.duracion_vista_promedio_ms)}
        detalle="por vista"
      />
    </div>
  );
}
