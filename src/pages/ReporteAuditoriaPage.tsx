import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { listarHistorial, listarUsuarios } from "../shared/backend";
import type { EventoAuditoria } from "../shared/audit";
import { esPaginado } from "../shared/types";
import {
  Badge,
  ButtonLink,
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
} from "../shared/ui";
import { useT } from "../shared/i18n";
import { PATH } from "../app/route-paths";
import { formatearFecha, mensajeError } from "../shared/format";
import { nombreExportacion } from "../shared/exportar";

const PAGE_SIZE = 100;
const NIVELES = ["LECTURA", "ESCRITURA"];
const TIPOS_EVENTO = ["COMANDO", "VISTA"];

export function ReporteAuditoriaPage() {
  const t = useT();
  const [usuarioId, setUsuarioId] = useState("");
  const [nivel, setNivel] = useState("");
  const [tipoEvento, setTipoEvento] = useState("");
  const [desde, setDesde] = useState("");
  const [hasta, setHasta] = useState("");
  const [comando, setComando] = useState("");
  const [entidad, setEntidad] = useState("");
  const [page, setPage] = useState(1);

  const usuariosQuery = useQuery({
    queryKey: ["usuarios", "reporte-auditoria"],
    queryFn: () => listarUsuarios({ page_size: -1, sort: "nombre_usuario" }),
  });
  const usuarios =
    usuariosQuery.data && esPaginado(usuariosQuery.data) ? usuariosQuery.data.data : [];
  const usuarioPorId = useMemo(() => {
    const listado =
      usuariosQuery.data && esPaginado(usuariosQuery.data) ? usuariosQuery.data.data : [];
    return new Map(listado.map((u) => [u.id, u]));
  }, [usuariosQuery.data]);

  const query = useQuery({
    queryKey: ["reporte-auditoria", { usuarioId, nivel, tipoEvento, desde, hasta, comando, page }],
    queryFn: () =>
      listarHistorial({
        usuario_id: usuarioId || undefined,
        nivel: nivel || undefined,
        tipo_evento: tipoEvento || undefined,
        comando: comando.trim() || undefined,
        desde: desde ? `${desde}T00:00:00` : undefined,
        hasta: hasta ? `${hasta}T23:59:59` : undefined,
        page,
        page_size: PAGE_SIZE,
      }),
  });

  const listado = query.data && esPaginado(query.data) ? query.data : null;
  const eventos = useMemo(() => {
    const base = listado?.data ?? [];
    const en = entidad.trim().toLowerCase();
    if (!en) return base;
    return base.filter((e) => e.entidad.toLowerCase().includes(en));
  }, [listado?.data, entidad]);

  const filasExport = useMemo(
    () =>
      eventos.map((e) => ({
        fecha: formatearFecha(e.timestamp),
        tipo: e.tipo_evento,
        usuario: e.usuario_id
          ? (usuarioPorId.get(e.usuario_id)?.nombre_usuario ?? e.usuario_id)
          : "",
        comando: e.comando ?? e.accion,
        entidad: e.entidad,
        entidad_id: e.entidad_id ?? "",
        modulo: e.modulo ?? "",
        ruta: e.ruta ?? "",
        proceso: e.proceso ?? "",
        tenant: e.tenant ?? "",
        nivel: e.nivel,
        resultado: e.exito ? "Éxito" : "Error",
        duracion_ms: e.duracion_ms ?? "",
      })),
    [eventos, usuarioPorId],
  );

  const columns: Array<TableColumn<EventoAuditoria>> = [
    {
      key: "timestamp",
      header: t.reportes.auditoria.fechaHora,
      render: (e) => formatearFecha(e.timestamp),
    },
    {
      key: "usuario_id",
      header: t.reportes.usuarios.usuario,
      render: (e) =>
        e.usuario_id ? (usuarioPorId.get(e.usuario_id)?.nombre_usuario ?? e.usuario_id) : "—",
    },
    {
      key: "tipo_evento",
      header: t.comun.tipo,
      render: (e) =>
        e.tipo_evento === "VISTA" ? (
          <Badge tone="info" icon="historial">
            Vista
          </Badge>
        ) : (
          <Badge tone="warning" icon="movements">
            Comando
          </Badge>
        ),
    },
    {
      key: "accion",
      header: t.reportes.auditoria.comandoAccion,
      code: true,
      render: (e) => (e.tipo_evento === "VISTA" ? (e.ruta ?? e.accion) : (e.comando ?? e.accion)),
    },
    {
      key: "modulo",
      header: t.reportes.columnas.modulo,
      render: (e) => e.modulo ?? "—",
    },
    {
      key: "entidad",
      header: t.reportes.columnas.entidad,
      code: true,
      render: (e) => (e.entidad_id ? `${e.entidad} / ${e.entidad_id.slice(0, 8)}` : e.entidad),
    },
    {
      key: "proceso",
      header: t.reportes.columnas.proceso,
      render: (e) => e.proceso ?? "—",
    },
    {
      key: "nivel",
      header: "Nivel",
      render: (e) => <Badge tone={e.nivel === "ESCRITURA" ? "warning" : "info"}>{e.nivel}</Badge>,
    },
    {
      key: "exito",
      header: t.reportes.columnas.resultado,
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
      header: t.reportes.columnas.duracion,
      num: true,
      code: true,
      render: (e) => (e.duracion_ms !== null ? `${e.duracion_ms} ms` : "—"),
    },
    {
      key: "tenant",
      header: t.reportes.columnas.tenant,
      render: (e) => e.tenant ?? "—",
    },
  ];

  return (
    <>
      <PageHeader
        title={t.reportes.auditoria.titulo}
        actions={
          <ButtonLink variant="secondary" icon="atras" href={PATH.reportes}>
            {t.reportes.volver}
          </ButtonLink>
        }
      />

      {query.error ? (
        <ErrorPanel title={t.reportes.auditoria.noSePudoCargar}>
          {mensajeError(query.error)}
        </ErrorPanel>
      ) : null}

      <FilterBar
        action={
          <ExportButtons
            nombre={nombreExportacion("auditoria")}
            filas={filasExport}
            disabled={query.isLoading}
          />
        }
      >
        <FilterField>
          <Select
            aria-label={t.reportes.filtrarUsuario}
            value={usuarioId}
            onChange={(e) => {
              setUsuarioId(e.target.value);
              setPage(1);
            }}
          >
            <option value="">{t.reportes.todosUsuarios}</option>
            {usuarios.map((u) => (
              <option key={u.id} value={u.id}>
                {u.nombre_usuario}
              </option>
            ))}
          </Select>
        </FilterField>
        <FilterField>
          <Select
            aria-label={t.reportes.filtrarEvento}
            value={tipoEvento}
            onChange={(e) => {
              setTipoEvento(e.target.value);
              setPage(1);
            }}
          >
            <option value="">{t.reportes.todosTipos}</option>
            {TIPOS_EVENTO.map((evento) => (
              <option key={evento} value={evento}>
                {evento === "VISTA"
                  ? t.reportes.auditoria.vistasDePagina
                  : t.reportes.auditoria.comandosBackend}
              </option>
            ))}
          </Select>
        </FilterField>
        <FilterField>
          <Select
            aria-label={t.reportes.filtrarNivel}
            value={nivel}
            onChange={(e) => {
              setNivel(e.target.value);
              setPage(1);
            }}
          >
            <option value="">{t.reportes.todosNiveles}</option>
            {NIVELES.map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </Select>
        </FilterField>
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
          <Input
            type="search"
            aria-label={t.reportes.auditoria.buscarComando}
            placeholder={t.reportes.auditoria.comandoEjemplo}
            value={comando}
            onChange={(e) => {
              setComando(e.target.value);
              setPage(1);
            }}
          />
        </FilterField>
        <FilterField grow>
          <Input
            type="search"
            aria-label={t.reportes.filtrarEntidad}
            placeholder={t.reportes.auditoria.entidadEjemplo}
            value={entidad}
            onChange={(e) => setEntidad(e.target.value)}
          />
        </FilterField>
      </FilterBar>

      <div className="mt-6">
        <Card title={t.reportes.auditoria.eventos}>
          <Table
            columns={columns}
            rows={eventos}
            rowKey={(e) => String(e.id)}
            loading={query.isLoading}
            emptyTitle={t.reportes.auditoria.sinEventos}
            emptyDescription={t.reportes.auditoria.sinEventosDesc}
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
