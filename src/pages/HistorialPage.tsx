import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { listarHistorial, listarUsuarios, metricasActividad } from "../shared/backend";
import type { EventoAuditoria } from "../shared/audit";
import { esPaginado } from "../shared/types";
import { useT } from "../shared/i18n";
import {
  Badge,
  Card,
  ErrorPanel,
  ExportButtons,
  FilterBar,
  FilterField,
  Input,
  PageHeader,
  Pagination,
  Select,
  Table,
  type TableColumn,
  type IconName,
  Icon,
} from "../shared/ui";
import { formatearFecha, mensajeError } from "../shared/format";
import { nombreExportacion } from "../shared/exportar";

const PAGE_SIZE = 50;
const TIPOS_EVENTO = ["VISTA", "COMANDO"];
const DIAS_SEMANA = ["", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado", "domingo"];
const DIAS_SEMANA_INICIAL = ["", "L", "M", "X", "J", "V", "S", "D"];

/** Icono canónico de cada insight que devuelve el backend (con fallback). */
const INSIGHT_ICON: Record<string, IconName> = {
  info: "alerta",
  calendario: "calendario",
  dashboard: "dashboard",
  historial: "historial",
  usuario: "usuario",
  proceso: "movements",
  aprobar: "aprobar",
  anular: "anular",
};

function formatoDuracion(ms: number | null): string {
  if (ms === null || ms === undefined) return "—";
  const s = Math.round(ms / 1000);
  if (s >= 60) return `${Math.floor(s / 60)}m ${s % 60}s`;
  return `${s}s`;
}

function iconoInsight(icono: string): IconName {
  return INSIGHT_ICON[icono] ?? "historial";
}

/** Tarjeta compacta de KPI para el resumen del centro de actividad. */
function KpiCard({ titulo, valor, detalle }: { titulo: string; valor: string; detalle?: string }) {
  return (
    <Card>
      <Card.Body>
        <p className="text-xs uppercase tracking-wide text-gray-500">{titulo}</p>
        <p className="mt-1 font-mono text-xl font-semibold text-gray-800">{valor}</p>
        {detalle ? <p className="mt-1 text-xs text-gray-500">{detalle}</p> : null}
      </Card.Body>
    </Card>
  );
}

/** Fila ya normalizada para las barras horizontales. */
interface BarraDato {
  etiqueta: string;
  valor: number;
}

/** Gráfica de barras horizontales (módulos, usuarios, procesos, rutas). */
function BarrasHorizontales({ filas, max }: { filas: BarraDato[]; max: number }) {
  if (filas.length === 0) {
    return <p className="text-base text-gray-500">Sin datos en el periodo.</p>;
  }
  return (
    <div>
      {filas.map((fila, i) => {
        const pct = max > 0 ? Math.max(2, (fila.valor / max) * 100) : 0;
        return (
          <div key={`${fila.etiqueta}-${i}`} className="chart-row">
            <span className="chart-row__label" title={fila.etiqueta}>
              {fila.etiqueta}
            </span>
            <div className="chart-row__track">
              <div className="chart-row__fill" style={{ width: `${pct}%` }} />
            </div>
            <span className="font-mono text-xs text-gray-600">{fila.valor.toLocaleString()}</span>
          </div>
        );
      })}
    </div>
  );
}

export function HistorialPage() {
  const t = useT();
  // Filtros de periodo (métricas) + filtros de la tabla de eventos.
  const [desde, setDesde] = useState("");
  const [hasta, setHasta] = useState("");
  const [usuarioId, setUsuarioId] = useState("");
  const [tipoEvento, setTipoEvento] = useState("");
  const [modulo, setModulo] = useState("");
  const [resultado, setResultado] = useState("");
  const [comando, setComando] = useState("");
  const [page, setPage] = useState(1);

  const usuariosQuery = useQuery({
    queryKey: ["usuarios", "historial"],
    queryFn: () => listarUsuarios({ page_size: -1, sort: "nombre_usuario" }),
  });
  const usuarios =
    usuariosQuery.data && esPaginado(usuariosQuery.data) ? usuariosQuery.data.data : [];
  const usuarioPorId = useMemo(() => {
    const listado =
      usuariosQuery.data && esPaginado(usuariosQuery.data) ? usuariosQuery.data.data : [];
    return new Map(listado.map((u) => [u.id, u]));
  }, [usuariosQuery.data]);

  const metricasQuery = useQuery({
    queryKey: ["metricas-actividad", { desde, hasta, usuarioId }],
    queryFn: () =>
      metricasActividad({
        desde: desde ? `${desde}T00:00:00` : undefined,
        hasta: hasta ? `${hasta}T23:59:59` : undefined,
        usuario_id: usuarioId || undefined,
      }),
  });
  const metricas = metricasQuery.data;

  const tablaQuery = useQuery({
    queryKey: [
      "historial",
      { desde, hasta, usuarioId, tipoEvento, modulo, resultado, comando, page },
    ],
    queryFn: () =>
      listarHistorial({
        desde: desde ? `${desde}T00:00:00` : undefined,
        hasta: hasta ? `${hasta}T23:59:59` : undefined,
        usuario_id: usuarioId || undefined,
        tipo_evento: tipoEvento || undefined,
        modulo: modulo || undefined,
        exito: resultado === "" ? undefined : resultado === "EXITO",
        comando: comando.trim() || undefined,
        page,
        page_size: PAGE_SIZE,
      }),
  });
  const listado = tablaQuery.data && esPaginado(tablaQuery.data) ? tablaQuery.data : null;
  const eventos = listado?.data ?? [];

  // Lista de módulos disponibles para el filtro (de las métricas o la tabla).
  const modulosDisponibles = useMemo(() => {
    const deMetricas = (metricas?.por_modulo ?? []).map((m) => m.modulo);
    const deTabla = (listado?.data ?? []).map((e) => e.modulo ?? "").filter(Boolean);
    const modulos = [...new Set([...deMetricas, ...deTabla])].toSorted((a, b) =>
      a.localeCompare(b),
    );
    return modulos;
  }, [metricas?.por_modulo, listado?.data]);

  const filasExport = useMemo(() => {
    const filas = listado?.data ?? [];
    return filas.map((e) => ({
      fecha: formatearFecha(e.timestamp),
      tipo: e.tipo_evento,
      usuario: e.usuario_id ? (usuarioPorId.get(e.usuario_id)?.nombre_usuario ?? e.usuario_id) : "",
      modulo: e.modulo ?? "",
      accion: e.comando ?? e.accion,
      entidad: e.entidad,
      ruta: e.ruta ?? "",
      proceso: e.proceso ?? "",
      nivel: e.nivel,
      resultado: e.exito ? "Éxito" : "Error",
      duracion_ms: e.duracion_ms ?? e.duracion_vista_ms ?? "",
      tenant: e.tenant ?? "",
    }));
  }, [listado?.data, usuarioPorId]);

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
      render: (e) =>
        e.usuario_id ? (usuarioPorId.get(e.usuario_id)?.nombre_usuario ?? e.usuario_id) : "—",
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

  const error = metricasQuery.error ?? tablaQuery.error;
  const loading = metricasQuery.isLoading || tablaQuery.isLoading;

  const resumen = metricas?.resumen;
  const maxModulo = Math.max(
    1,
    ...(metricas?.por_modulo.map((m) => m.vistas + m.operaciones) ?? []),
  );
  const maxUsuario = Math.max(
    1,
    ...(metricas?.por_usuario.map((u) => u.vistas + u.operaciones) ?? []),
  );
  const maxProceso = Math.max(1, ...(metricas?.por_proceso.map((p) => p.total) ?? []));
  const maxRuta = Math.max(1, ...(metricas?.top_rutas.map((r) => r.vistas) ?? []));
  const maxDia = Math.max(1, ...(metricas?.por_dia.map((d) => d.vistas + d.operaciones) ?? []));
  const maxHora = Math.max(1, ...(metricas?.por_hora.map((h) => h.vistas + h.operaciones) ?? []));
  const maxDiaSemana = Math.max(
    1,
    ...(metricas?.por_dia_semana.map((d) => d.vistas + d.operaciones) ?? []),
  );

  return (
    <>
      <PageHeader title={t.historial.titulo} />

      {error ? (
        <ErrorPanel title={t.historial.noSePudoCargar}>{mensajeError(error)}</ErrorPanel>
      ) : null}

      <FilterBar
        action={
          <ExportButtons
            nombre={nombreExportacion("historial-actividad")}
            filas={filasExport}
            disabled={loading}
          />
        }
      >
        <FilterField>
          <Input
            type="date"
            aria-label={t.reportes.desde}
            value={desde}
            onChange={(e) => {
              setDesde(e.target.value);
              setPage(1);
            }}
          />
        </FilterField>
        <FilterField>
          <Input
            type="date"
            aria-label={t.reportes.hasta}
            value={hasta}
            onChange={(e) => {
              setHasta(e.target.value);
              setPage(1);
            }}
          />
        </FilterField>
        <FilterField>
          <Select
            aria-label={t.historial.filtrarUsuario}
            value={usuarioId}
            onChange={(e) => {
              setUsuarioId(e.target.value);
              setPage(1);
            }}
          >
            <option value="">Todos los usuarios</option>
            {usuarios.map((u) => (
              <option key={u.id} value={u.id}>
                {u.nombre_usuario}
              </option>
            ))}
          </Select>
        </FilterField>
        <FilterField>
          <Select
            aria-label={t.historial.filtrarEvento}
            value={tipoEvento}
            onChange={(e) => {
              setTipoEvento(e.target.value);
              setPage(1);
            }}
          >
            <option value="">{t.reportes.todosTipos}</option>
            {TIPOS_EVENTO.map((evento) => (
              <option key={evento} value={evento}>
                {evento === "VISTA" ? t.historial.vistasDePagina : t.historial.comandosBackend}
              </option>
            ))}
          </Select>
        </FilterField>
        <FilterField>
          <Select
            aria-label={t.historial.filtrarModulo}
            value={modulo}
            onChange={(e) => {
              setModulo(e.target.value);
              setPage(1);
            }}
          >
            <option value="">Todos los módulos</option>
            {modulosDisponibles.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </Select>
        </FilterField>
        <FilterField>
          <Select
            aria-label={t.historial.filtrarResultado}
            value={resultado}
            onChange={(e) => {
              setResultado(e.target.value);
              setPage(1);
            }}
          >
            <option value="">Todos los resultados</option>
            <option value="EXITO">Solo éxito</option>
            <option value="ERROR">Solo errores</option>
          </Select>
        </FilterField>
        <FilterField grow>
          <Input
            type="search"
            aria-label={t.historial.buscarComando}
            placeholder={t.reportes.auditoria.comandoEjemplo}
            value={comando}
            onChange={(e) => {
              setComando(e.target.value);
              setPage(1);
            }}
          />
        </FilterField>
      </FilterBar>

      {resumen ? (
        <div className="mt-6 grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-6">
          <KpiCard titulo="Eventos" valor={resumen.total_eventos.toLocaleString()} />
          <KpiCard
            titulo="Vistas"
            valor={resumen.total_vistas.toLocaleString()}
            detalle={t.historial.paginasVisitadas}
          />
          <KpiCard
            titulo="Operaciones"
            valor={resumen.total_operaciones.toLocaleString()}
            detalle={`${resumen.escrituras} escrituras · ${resumen.lecturas} lecturas`}
          />
          <KpiCard
            titulo={t.historial.tasaExito}
            valor={`${resumen.tasa_exito.toFixed(1)}%`}
            detalle={`${resumen.errores} errores`}
          />
          <KpiCard
            titulo={t.historial.usuariosActivos}
            valor={resumen.usuarios_activos.toLocaleString()}
          />
          <KpiCard
            titulo={t.historial.duracionMedia}
            valor={formatoDuracion(resumen.duracion_vista_promedio_ms)}
            detalle="por vista"
          />
        </div>
      ) : null}

      {metricas && metricas.insights.length > 0 ? (
        <div className="mt-6">
          <Card title={t.historial.perspectiva}>
            <Card.Body>
              <ul className="list-none p-0">
                {metricas.insights.map((insight) => (
                  <li
                    key={insight.titulo}
                    className="flex items-start gap-3 border-b border-gray-100 py-3 last:border-b-0"
                  >
                    <span className="mt-0.5 flex size-6 items-center justify-center rounded-full bg-blue-50 text-blue-700">
                      <Icon name={iconoInsight(insight.icono)} size={14} aria-hidden="true" />
                    </span>
                    <div>
                      <p className="text-sm font-semibold text-gray-800">{insight.titulo}</p>
                      <p className="text-sm text-gray-500">{insight.detalle}</p>
                    </div>
                  </li>
                ))}
              </ul>
            </Card.Body>
          </Card>
        </div>
      ) : null}

      <div className="mt-6 grid grid-cols-1 gap-6 md:grid-cols-2">
        <Card title={t.historial.vistasPorModulo}>
          <Card.Body>
            <BarrasHorizontales
              filas={(metricas?.por_modulo ?? []).map((m) => ({
                etiqueta: m.modulo,
                valor: m.vistas + m.operaciones,
              }))}
              max={maxModulo}
            />
          </Card.Body>
        </Card>
        <Card title={t.historial.actividadPorDia}>
          <Card.Body>
            {metricas && metricas.por_dia.length > 0 ? (
              <div
                className="chart"
                role="img"
                aria-label={`Eventos por día: ${metricas.por_dia.map((d) => `${d.dia}: ${d.vistas + d.operaciones}`).join(", ")}`}
              >
                {metricas.por_dia.map((d) => {
                  const n = d.vistas + d.operaciones;
                  return (
                    <div key={d.dia} className="chart__col" title={`${d.dia}: ${n} eventos`}>
                      <span className="chart__label">{d.dia.slice(8)}</span>
                      <div
                        className="chart__bar"
                        style={{ height: `${maxDia > 0 ? Math.max(2, (n / maxDia) * 100) : 0}%` }}
                        role="presentation"
                        aria-hidden="true"
                      />
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-base text-gray-500">Sin eventos en el periodo.</p>
            )}
          </Card.Body>
        </Card>
        <Card title={t.historial.actividadPorHora}>
          <Card.Body>
            {metricas && metricas.por_hora.length > 0 ? (
              <div
                className="chart"
                role="img"
                aria-label={`Eventos por hora: ${metricas.por_hora.map((h) => `${String(h.hora).padStart(2, "0")}:00 ${h.vistas + h.operaciones}`).join(", ")}`}
              >
                {metricas.por_hora.map((h) => {
                  const n = h.vistas + h.operaciones;
                  return (
                    <div
                      key={h.hora}
                      className="chart__col"
                      title={`${String(h.hora).padStart(2, "0")}:00 — ${n} eventos`}
                    >
                      {h.hora % 4 === 0 ? (
                        <span className="chart__label">{h.hora}</span>
                      ) : (
                        <span className="chart__label" aria-hidden="true" />
                      )}
                      <div
                        className="chart__bar"
                        style={{ height: `${maxHora > 0 ? Math.max(2, (n / maxHora) * 100) : 0}%` }}
                        role="presentation"
                        aria-hidden="true"
                      />
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-base text-gray-500">Sin eventos en el periodo.</p>
            )}
          </Card.Body>
        </Card>
        <Card title={t.historial.actividadPorDiaSemana}>
          <Card.Body>
            {metricas && metricas.por_dia_semana.length > 0 ? (
              <div
                className="chart"
                role="img"
                aria-label={`Eventos por día de la semana: ${metricas.por_dia_semana.map((d) => `${DIAS_SEMANA[d.dia_semana] ?? d.dia_semana}: ${d.vistas + d.operaciones}`).join(", ")}`}
              >
                {metricas.por_dia_semana.map((d) => {
                  const n = d.vistas + d.operaciones;
                  return (
                    <div
                      key={d.dia_semana}
                      className="chart__col"
                      title={`${DIAS_SEMANA[d.dia_semana] ?? d.dia_semana}: ${n} eventos`}
                    >
                      <span className="chart__label">
                        {DIAS_SEMANA_INICIAL[d.dia_semana] ?? d.dia_semana}
                      </span>
                      <div
                        className="chart__bar"
                        style={{
                          height: `${maxDiaSemana > 0 ? Math.max(2, (n / maxDiaSemana) * 100) : 0}%`,
                        }}
                        role="presentation"
                        aria-hidden="true"
                      />
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-base text-gray-500">Sin eventos en el periodo.</p>
            )}
          </Card.Body>
        </Card>
        <Card title={t.historial.usuariosMasActivos}>
          <Card.Body>
            <BarrasHorizontales
              filas={(metricas?.por_usuario ?? []).map((u) => ({
                etiqueta: u.usuario_id ?? t.historial.sinSesion,
                valor: u.vistas + u.operaciones,
              }))}
              max={maxUsuario}
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
              max={maxProceso}
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
              max={maxRuta}
            />
          </Card.Body>
        </Card>
      </div>

      <div className="mt-6">
        <Card title={t.historial.registroEventos}>
          <Table
            columns={columns}
            rows={eventos}
            rowKey={(e) => String(e.id)}
            loading={tablaQuery.isLoading}
            emptyTitle={t.historial.sinActividad}
            emptyDescription={t.historial.sinActividadDesc}
          />
          {listado && listado.meta.total > 0 ? (
            <Pagination
              page={listado.meta.page}
              pageCount={listado.meta.total_pages}
              total={listado.meta.total}
              from={(listado.meta.page - 1) * listado.meta.page_size + 1}
              to={Math.min(listado.meta.page * listado.meta.page_size, listado.meta.total)}
              onPageChange={setPage}
            />
          ) : null}
        </Card>
      </div>
    </>
  );
}
