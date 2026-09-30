import type { MetricasActividad } from "../../shared/audit";
import { useT } from "../../shared/i18n";
import { Card } from "../../shared/ui";
import { BarrasHorizontales } from "./BarrasHorizontales";
import { ColumnasActividad } from "./ColumnasActividad";
import { DIAS_SEMANA, DIAS_SEMANA_INICIAL } from "./formato";

const nombreDia = (d: number) => DIAS_SEMANA[d] ?? d;

/** Gráficas del periodo: módulos, días, horas, usuarios, procesos y rutas. */
export function PanelMetricas({ metricas }: { metricas: MetricasActividad | undefined }) {
  const t = useT();
  const porDia = metricas?.por_dia ?? [];
  const porHora = metricas?.por_hora ?? [];
  const porDiaSemana = metricas?.por_dia_semana ?? [];

  return (
    <>
      <div className="mt-6 grid grid-cols-1 gap-6 md:grid-cols-2">
        <Card title={t.historial.vistasPorModulo}>
          <Card.Body>
            <BarrasHorizontales
              filas={(metricas?.por_modulo ?? []).map((m) => ({
                etiqueta: m.modulo,
                valor: m.vistas + m.operaciones,
              }))}
            />
          </Card.Body>
        </Card>
        <Card title={t.historial.actividadPorDia}>
          <Card.Body>
            <ColumnasActividad
              ariaLabel={`Eventos por día: ${porDia.map((d) => `${d.dia}: ${d.vistas + d.operaciones}`).join(", ")}`}
              columnas={porDia.map((d) => {
                const n = d.vistas + d.operaciones;
                return {
                  key: d.dia,
                  titulo: `${d.dia}: ${n} eventos`,
                  etiqueta: d.dia.slice(8),
                  n,
                };
              })}
            />
          </Card.Body>
        </Card>
        <Card title={t.historial.actividadPorHora}>
          <Card.Body>
            <ColumnasActividad
              ariaLabel={`Eventos por hora: ${porHora.map((h) => `${String(h.hora).padStart(2, "0")}:00 ${h.vistas + h.operaciones}`).join(", ")}`}
              columnas={porHora.map((h) => {
                const n = h.vistas + h.operaciones;
                return {
                  key: h.hora,
                  titulo: `${String(h.hora).padStart(2, "0")}:00 — ${n} eventos`,
                  etiqueta: h.hora % 4 === 0 ? h.hora : null,
                  n,
                };
              })}
            />
          </Card.Body>
        </Card>
        <Card title={t.historial.actividadPorDiaSemana}>
          <Card.Body>
            <ColumnasActividad
              ariaLabel={`Eventos por día de la semana: ${porDiaSemana.map((d) => `${nombreDia(d.dia_semana)}: ${d.vistas + d.operaciones}`).join(", ")}`}
              columnas={porDiaSemana.map((d) => {
                const n = d.vistas + d.operaciones;
                return {
                  key: d.dia_semana,
                  titulo: `${nombreDia(d.dia_semana)}: ${n} eventos`,
                  etiqueta: DIAS_SEMANA_INICIAL[d.dia_semana] ?? d.dia_semana,
                  n,
                };
              })}
            />
          </Card.Body>
        </Card>
        <Card title={t.historial.usuariosMasActivos}>
          <Card.Body>
            <BarrasHorizontales
              filas={(metricas?.por_usuario ?? []).map((u) => ({
                etiqueta: u.usuario_id ?? t.historial.sinSesion,
                valor: u.vistas + u.operaciones,
              }))}
            />
          </Card.Body>
        </Card>
        <Card title={t.historial.procesosNegocio}>
          <Card.Body>
            <BarrasHorizontales
              filas={(metricas?.por_proceso ?? []).map((p) => ({
                etiqueta: p.proceso,
                valor: p.total,
              }))}
            />
          </Card.Body>
        </Card>
      </div>

      <div className="mt-6">
        <Card title={t.historial.rutasMasVisitadas}>
          <Card.Body>
            <BarrasHorizontales
              filas={(metricas?.top_rutas ?? []).map((r) => ({
                etiqueta: r.ruta,
                valor: r.vistas,
              }))}
            />
          </Card.Body>
        </Card>
      </div>
    </>
  );
}
