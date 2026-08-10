import { useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import {
  Badge,
  Card,
  DetailList,
  ErrorPanel,
  PageHeader,
  Table,
  type TableColumn,
} from "../shared/ui";
import type { EventoAuditoria, MetricasHistorial } from "../shared/audit";

function useHistorial() {
  const [eventos, setEventos] = useState<EventoAuditoria[]>([]);
  const [metricas, setMetricas] = useState<MetricasHistorial | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const cargar = () => {
    setLoading(true);
    Promise.all([
      invoke<EventoAuditoria[]>("listar_historial", { limit: 100 }),
      invoke<MetricasHistorial>("metricas_historial"),
    ])
      .then(([h, m]) => {
        setEventos(h);
        setMetricas(m);
        setError(null);
      })
      .catch((e) => setError(String(e)))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    cargar();
  }, []);

  return { eventos, metricas, error, loading, recargar: cargar };
}

function formatearFecha(iso: string): string {
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return iso;
    return d.toLocaleString("es-ES", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  } catch {
    return iso;
  }
}

export function HistorialPage() {
  const { eventos, metricas, error, loading, recargar } = useHistorial();

  const columns: TableColumn<EventoAuditoria>[] = [
    {
      key: "timestamp",
      header: "Fecha y hora",
      code: true,
      render: (e) => formatearFecha(e.timestamp),
    },
    { key: "comando", header: "Comando", code: true, render: (e) => e.comando ?? e.accion },
    {
      key: "nivel",
      header: "Nivel",
      render: (e) => <Badge tone={e.nivel === "ESCRITURA" ? "warning" : "info"}>{e.nivel}</Badge>,
    },
    {
      key: "exito",
      header: "Resultado",
      render: (e) =>
        e.exito ? (
          <Badge tone="success" icon="aprobar">
            Éxito
          </Badge>
        ) : (
          <Badge tone="danger" icon="anular">
            Error
          </Badge>
        ),
    },
    {
      key: "duracion_ms",
      header: "Duración",
      num: true,
      code: true,
      render: (e) => (e.duracion_ms !== null ? `${e.duracion_ms} ms` : "—"),
    },
    { key: "usuario_id", header: "Usuario", code: true, render: (e) => e.usuario_id ?? "—" },
  ];

  const metricItems = metricas
    ? [
        { label: "Total de operaciones", value: metricas.total.toLocaleString(), code: true },
        { label: "Éxitos", value: metricas.exitos.toLocaleString(), code: true },
        { label: "Errores", value: metricas.errores.toLocaleString(), code: true },
        { label: "Tasa de éxito", value: `${metricas.tasa_exito.toFixed(1)}%`, code: true },
        {
          label: "Duración promedio",
          value:
            metricas.duracion_promedio_ms !== null
              ? `${metricas.duracion_promedio_ms.toFixed(0)} ms`
              : "—",
          code: true,
        },
      ]
    : [];

  return (
    <>
      <PageHeader
        title="Historial de actividad"
        description="Registro completo de las operaciones del usuario con hora, fecha y métricas del backend."
        actions={
          <button
            type="button"
            className="btn btn--secondary"
            onClick={recargar}
            disabled={loading}
          >
            Recargar
          </button>
        }
      />

      {error ? <ErrorPanel title="No se pudo cargar el historial">{error}</ErrorPanel> : null}

      <div className="mt-6 grid grid-cols-1 gap-6 md:grid-cols-2">
        <Card title="Métricas del historial">
          <Card.Body>
            {metricas ? (
              <DetailList items={metricItems} />
            ) : (
              <p className="text-base text-gray-500">Cargando…</p>
            )}
          </Card.Body>
        </Card>
        <Card title="Top de comandos">
          <Card.Body>
            {metricas && metricas.por_comando.length > 0 ? (
              <ul className="list-none p-0">
                {metricas.por_comando.slice(0, 8).map((c) => (
                  <li
                    key={c.nombre}
                    className="flex items-center justify-between gap-4 border-b border-gray-100 py-2"
                  >
                    <span className="font-mono text-sm text-gray-600">{c.nombre}</span>
                    <span className="font-mono text-sm text-gray-800">
                      {c.total} ({c.errores} err)
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-base text-gray-500">Sin datos de comandos.</p>
            )}
          </Card.Body>
        </Card>
      </div>

      <div className="mt-6">
        <Card title="Eventos recientes">
          <Table
            columns={columns}
            rows={eventos}
            rowKey={(e) => String(e.id)}
            emptyTitle="Sin actividad registrada"
            emptyDescription="Las operaciones del usuario aparecerán aquí."
          />
        </Card>
      </div>
    </>
  );
}
