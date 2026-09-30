import type { EventoAuditoria } from "../../shared/audit";
import { formatearFecha } from "../../shared/format";
import { useT } from "../../shared/i18n";
import type { Usuario } from "../../shared/types";
import { Badge, Card, Pagination, Table, type TableColumn } from "../../shared/ui";
import { formatoDuracion } from "./formato";

interface EventosTablaProps {
  eventos: EventoAuditoria[];
  meta: { page: number; page_size: number; total: number; total_pages: number } | null;
  usuarioPorId: Map<string, Usuario>;
  loading: boolean;
  onPageChange: (page: number) => void;
}

export function EventosTabla({
  eventos,
  meta,
  usuarioPorId,
  loading,
  onPageChange,
}: EventosTablaProps) {
  const t = useT();
  const nombreUsuario = (id: string | null) =>
    id ? (usuarioPorId.get(id)?.nombre_usuario ?? id) : "—";

  const columns: Array<TableColumn<EventoAuditoria>> = [
    {
      key: "timestamp",
      header: t.campos.fechaHora,
      render: (e) => formatearFecha(e.timestamp),
    },
    {
      key: "tipo_evento",
      header: t.comun.tipo,
      render: (e) =>
        e.tipo_evento === "VISTA" ? (
          <Badge tone="info" icon="historial">
            {t.comun.vista}
          </Badge>
        ) : (
          <Badge tone="warning" icon="movements">
            {t.comun.comando}
          </Badge>
        ),
    },
    {
      key: "usuario_id",
      header: t.campos.usuario,
      render: (e) => nombreUsuario(e.usuario_id),
    },
    {
      key: "modulo",
      header: t.campos.modulo,
      render: (e) => e.modulo ?? "—",
    },
    {
      key: "accion",
      header: t.campos.accionRuta,
      code: true,
      render: (e) => (e.tipo_evento === "VISTA" ? (e.ruta ?? e.entidad) : (e.comando ?? e.accion)),
    },
    {
      key: "proceso",
      header: t.campos.proceso,
      render: (e) => e.proceso ?? "—",
    },
    {
      key: "nivel",
      header: t.campos.nivel,
      render: (e) => <Badge tone={e.nivel === "ESCRITURA" ? "warning" : "info"}>{e.nivel}</Badge>,
    },
    {
      key: "exito",
      header: t.campos.resultado,
      render: (e) =>
        e.exito ? (
          <Badge tone="success" icon="aprobar">
            {t.comun.exito}
          </Badge>
        ) : (
          <Badge tone="danger" icon="anular">
            {t.comun.error}
          </Badge>
        ),
    },
    {
      key: "procedencia",
      header: t.historial.procedencia,
      render: (e) => (
        // La ventana de escritorio no tiene IP: el proceso y la persona están
        // en la misma máquina, y decir «—» es más honesto que inventarse una.
        <span className="text-sm" title={e.agente ?? undefined}>
          {e.origen === "escritorio" ? t.historial.escritorio : (e.ip ?? "—")}
        </span>
      ),
    },
    {
      key: "duracion",
      header: t.campos.duracion,
      num: true,
      code: true,
      render: (e) =>
        e.tipo_evento === "VISTA"
          ? formatoDuracion(e.duracion_vista_ms)
          : e.duracion_ms !== null && e.duracion_ms !== undefined
            ? `${e.duracion_ms} ms`
            : "—",
    },
  ];

  return (
    <div className="mt-6">
      <Card title={t.historial.registroEventos}>
        <Table
          columns={columns}
          rows={eventos}
          rowKey={(e) => String(e.id)}
          loading={loading}
          emptyTitle={t.historial.sinActividad}
          emptyDescription={t.historial.sinActividadDesc}
        />
        {meta && meta.total > 0 ? (
          <Pagination
            page={meta.page}
            pageCount={meta.total_pages}
            total={meta.total}
            from={(meta.page - 1) * meta.page_size + 1}
            to={Math.min(meta.page * meta.page_size, meta.total)}
            onPageChange={onPageChange}
          />
        ) : null}
      </Card>
    </div>
  );
}
