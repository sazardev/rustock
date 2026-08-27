import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router";
import {
  listarClientes,
  listarMovimientos,
  listarProveedores,
  listarUbicaciones,
  listarUsuarios,
} from "../shared/backend";
import {
  esPaginado,
  type EstadoMovimiento,
  type Movimiento,
  type SubTipoMovimiento,
  type TipoMovimiento,
} from "../shared/types";
import {
  Badge,
  ButtonLink,
  Card,
  DetailList,
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
import { movimientoDetalle, PATH } from "../app/route-paths";
import {
  ESTADO_MOVIMIENTO_LABEL,
  ESTADO_MOVIMIENTO_TONE,
  SUB_TIPO_MOVIMIENTO_LABEL,
  TIPO_MOVIMIENTO_ICON,
  TIPO_MOVIMIENTO_LABEL,
  TIPO_MOVIMIENTO_TONE,
  formatearFecha,
  mensajeError,
} from "../shared/format";
import { nombreExportacion } from "../shared/exportar";

const TIPOS: TipoMovimiento[] = ["ENTRADA", "SALIDA", "TRASLADO", "AJUSTE", "CONSUMO"];
const ESTADOS: EstadoMovimiento[] = ["BORRADOR", "PENDIENTE_APROBACION", "APROBADO", "ANULADO"];
const SUB_TIPOS: SubTipoMovimiento[] = [
  "COMPRA",
  "DEVOLUCION_CLIENTE",
  "AJUSTE_POSITIVO",
  "INICIAL",
  "TRASLADO_ENTRADA",
  "CLIENTE",
  "DEVOLUCION_PROVEEDOR",
  "MERMA",
  "AJUSTE_NEGATIVO",
  "TRASLADO_SALIDA",
];
const PAGE_SIZE = 20;
/** Días visibles en la gráfica "movimientos por día". */
const DIAS_CHART = 30;

const CAMPOS_EXPORT = [
  "numero",
  "tipo",
  "sub_tipo",
  "estado",
  "fecha_movimiento",
  "documento_referencia",
  "motivo",
  "proveedor_id",
  "cliente_id",
  "created_by",
  "origen_ubicacion_id",
  "destino_ubicacion_id",
];

function etiquetaDia(iso: string): string {
  const d = new Date(`${iso}T00:00:00`);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("es-ES", { day: "2-digit", month: "short" });
}

export function ReporteMovimientosPage() {
  const navigate = useNavigate();
  const [page, setPage] = useState(1);
  const [tipo, setTipo] = useState<TipoMovimiento | "">("");
  const [estado, setEstado] = useState<EstadoMovimiento | "">("");
  const [subTipo, setSubTipo] = useState<SubTipoMovimiento | "">("");
  const [usuarioId, setUsuarioId] = useState("");
  const [proveedorId, setProveedorId] = useState("");
  const [clienteId, setClienteId] = useState("");
  const [ubicacionOrigen, setUbicacionOrigen] = useState("");
  const [ubicacionDestino, setUbicacionDestino] = useState("");
  const [desde, setDesde] = useState("");
  const [hasta, setHasta] = useState("");

  const filtros = useMemo(() => {
    const f: string[] = [];
    if (tipo) f.push(`tipo:eq:${tipo}`);
    if (estado) f.push(`estado:eq:${estado}`);
    if (subTipo) f.push(`sub_tipo:eq:${subTipo}`);
    if (usuarioId) f.push(`created_by:eq:${usuarioId}`);
    if (proveedorId) f.push(`proveedor_id:eq:${proveedorId}`);
    if (clienteId) f.push(`cliente_id:eq:${clienteId}`);
    if (ubicacionOrigen) f.push(`origen_ubicacion_id:eq:${ubicacionOrigen}`);
    if (ubicacionDestino) f.push(`destino_ubicacion_id:eq:${ubicacionDestino}`);
    if (desde) f.push(`fecha_movimiento:gte:${desde}T00:00:00`);
    if (hasta) f.push(`fecha_movimiento:lte:${hasta}T23:59:59`);
    return f.length ? f : undefined;
  }, [
    tipo,
    estado,
    subTipo,
    usuarioId,
    proveedorId,
    clienteId,
    ubicacionOrigen,
    ubicacionDestino,
    desde,
    hasta,
  ]);

  const resetearPagina = () => setPage(1);

  const catUsuarios = useQuery({
    queryKey: ["usuarios", "reporte-movimientos"],
    queryFn: () => listarUsuarios({ page_size: -1, sort: "nombre_usuario" }),
  });
  const catProveedores = useQuery({
    queryKey: ["proveedores", "reporte-movimientos"],
    queryFn: () => listarProveedores({ page_size: -1, sort: "nombre" }),
  });
  const catClientes = useQuery({
    queryKey: ["clientes", "reporte-movimientos"],
    queryFn: () => listarClientes({ page_size: -1, sort: "nombre" }),
  });
  const catUbicaciones = useQuery({
    queryKey: ["ubicaciones", "reporte-movimientos"],
    queryFn: () => listarUbicaciones({ page_size: -1, sort: "codigo" }),
  });

  const usuarioPorId = useMemo(() => {
    const l = catUsuarios.data && esPaginado(catUsuarios.data) ? catUsuarios.data.data : [];
    return new Map(l.map((u) => [u.id, u]));
  }, [catUsuarios.data]);
  const proveedorPorId = useMemo(() => {
    const l =
      catProveedores.data && esPaginado(catProveedores.data) ? catProveedores.data.data : [];
    return new Map(l.map((p) => [p.id, p]));
  }, [catProveedores.data]);
  const clientePorId = useMemo(() => {
    const l = catClientes.data && esPaginado(catClientes.data) ? catClientes.data.data : [];
    return new Map(l.map((c) => [c.id, c]));
  }, [catClientes.data]);
  const ubicacionPorId = useMemo(() => {
    const l =
      catUbicaciones.data && esPaginado(catUbicaciones.data) ? catUbicaciones.data.data : [];
    return new Map(l.map((u) => [u.id, u]));
  }, [catUbicaciones.data]);

  const resumenQuery = useQuery({
    queryKey: ["reporte-movimientos-resumen", filtros],
    queryFn: () => listarMovimientos({ group_by: "tipo", filters: filtros }),
  });

  const tablaQuery = useQuery({
    queryKey: ["reporte-movimientos", { page, filtros }],
    queryFn: () =>
      listarMovimientos({
        page,
        page_size: PAGE_SIZE,
        sort: "-fecha_movimiento",
        filters: filtros,
      }),
  });

  // Todo el conjunto filtrado (con proyección ligera): alimenta la gráfica por
  // día y la exportación (SPEC §15.8).
  const todoQuery = useQuery({
    queryKey: ["reporte-movimientos-todo", filtros],
    queryFn: () => listarMovimientos({ page_size: -1, fields: CAMPOS_EXPORT, filters: filtros }),
  });

  const grupos = resumenQuery.data && "groups" in resumenQuery.data ? resumenQuery.data.groups : [];
  const conteoPorTipo = (t: TipoMovimiento): number => {
    const grupo = grupos.find((g) => g.key === t);
    return grupo ? (typeof grupo.count === "number" ? grupo.count : 0) : 0;
  };

  // Todo el conjunto (proyección ligera): `fields` no cambia el formato
  // paginado de la respuesta, así que se extrae con esPaginado.
  const filasTodo = useMemo(
    () => (todoQuery.data && esPaginado(todoQuery.data) ? todoQuery.data.data : []),
    [todoQuery.data],
  );

  const porDia = useMemo(() => {
    const mapa = new Map<string, number>();
    for (const m of filasTodo) {
      const dia = m.fecha_movimiento.slice(0, 10);
      mapa.set(dia, (mapa.get(dia) ?? 0) + 1);
    }
    return [...mapa.entries()].toSorted((a, b) => a[0].localeCompare(b[0])).slice(-DIAS_CHART);
  }, [filasTodo]);
  const maxDia = porDia.reduce((acc, [, n]) => Math.max(acc, n), 0);

  const filasExport = useMemo(
    () =>
      filasTodo.map((m) => ({
        numero: m.numero,
        tipo: TIPO_MOVIMIENTO_LABEL[m.tipo],
        sub_tipo: SUB_TIPO_MOVIMIENTO_LABEL[m.sub_tipo],
        estado: ESTADO_MOVIMIENTO_LABEL[m.estado],
        fecha_movimiento: formatearFecha(m.fecha_movimiento),
        documento_referencia: m.documento_referencia ?? "",
        motivo: m.motivo ?? "",
        proveedor: m.proveedor_id
          ? (proveedorPorId.get(m.proveedor_id)?.nombre ?? m.proveedor_id)
          : "",
        cliente: m.cliente_id ? (clientePorId.get(m.cliente_id)?.nombre ?? m.cliente_id) : "",
        usuario: usuarioPorId.get(m.created_by)?.nombre_usuario ?? m.created_by,
        ubicacion_origen: m.origen_ubicacion_id
          ? (ubicacionPorId.get(m.origen_ubicacion_id)?.codigo ?? m.origen_ubicacion_id)
          : "",
        ubicacion_destino: m.destino_ubicacion_id
          ? (ubicacionPorId.get(m.destino_ubicacion_id)?.codigo ?? m.destino_ubicacion_id)
          : "",
      })),
    [filasTodo, proveedorPorId, clientePorId, usuarioPorId, ubicacionPorId],
  );

  const listado = tablaQuery.data && esPaginado(tablaQuery.data) ? tablaQuery.data : null;
  const filas = listado?.data ?? [];

  const columns: Array<TableColumn<Movimiento>> = [
    { key: "numero", header: "Número", code: true, render: (m) => m.numero },
    {
      key: "tipo",
      header: "Tipo",
      render: (m) => (
        <Badge tone={TIPO_MOVIMIENTO_TONE[m.tipo]} icon={TIPO_MOVIMIENTO_ICON[m.tipo]}>
          {TIPO_MOVIMIENTO_LABEL[m.tipo]}
        </Badge>
      ),
    },
    {
      key: "sub_tipo",
      header: "Sub-tipo",
      render: (m) => SUB_TIPO_MOVIMIENTO_LABEL[m.sub_tipo],
    },
    {
      key: "estado",
      header: "Estado",
      render: (m) => (
        <Badge tone={ESTADO_MOVIMIENTO_TONE[m.estado]}>{ESTADO_MOVIMIENTO_LABEL[m.estado]}</Badge>
      ),
    },
    { key: "fecha_movimiento", header: "Fecha", render: (m) => formatearFecha(m.fecha_movimiento) },
    {
      key: "documento_referencia",
      header: "Documento",
      code: true,
      render: (m) => m.documento_referencia ?? "—",
    },
    {
      key: "created_by",
      header: "Usuario",
      render: (m) => usuarioPorId.get(m.created_by)?.nombre_usuario ?? m.created_by,
    },
    { key: "motivo", header: "Motivo", render: (m) => m.motivo ?? "—" },
  ];

  const error =
    tablaQuery.error ??
    resumenQuery.error ??
    todoQuery.error ??
    catUsuarios.error ??
    catProveedores.error ??
    catClientes.error ??
    catUbicaciones.error;

  return (
    <>
      <PageHeader
        title="Movimientos por periodo"
        actions={
          <ButtonLink variant="secondary" icon="atras" href={PATH.reportes}>
            Volver a reportes
          </ButtonLink>
        }
      />

      {error ? (
        <ErrorPanel title="No se pudieron cargar los movimientos">{mensajeError(error)}</ErrorPanel>
      ) : null}

      <FilterBar
        action={
          <ExportButtons
            nombre={nombreExportacion("movimientos")}
            filas={filasExport}
            disabled={todoQuery.isLoading}
          />
        }
      >
        <FilterField>
          <Select
            aria-label="Filtrar por tipo"
            value={tipo}
            onChange={(e) => {
              setTipo(e.target.value as TipoMovimiento | "");
              resetearPagina();
            }}
          >
            <option value="">Todos los tipos</option>
            {TIPOS.map((t) => (
              <option key={t} value={t}>
                {TIPO_MOVIMIENTO_LABEL[t]}
              </option>
            ))}
          </Select>
        </FilterField>
        <FilterField>
          <Select
            aria-label="Filtrar por sub-tipo"
            value={subTipo}
            onChange={(e) => {
              setSubTipo(e.target.value as SubTipoMovimiento | "");
              resetearPagina();
            }}
          >
            <option value="">Todos los sub-tipos</option>
            {SUB_TIPOS.map((s) => (
              <option key={s} value={s}>
                {SUB_TIPO_MOVIMIENTO_LABEL[s]}
              </option>
            ))}
          </Select>
        </FilterField>
        <FilterField>
          <Select
            aria-label="Filtrar por estado"
            value={estado}
            onChange={(e) => {
              setEstado(e.target.value as EstadoMovimiento | "");
              resetearPagina();
            }}
          >
            <option value="">Todos los estados</option>
            {ESTADOS.map((e) => (
              <option key={e} value={e}>
                {ESTADO_MOVIMIENTO_LABEL[e]}
              </option>
            ))}
          </Select>
        </FilterField>
        <FilterField>
          <Select
            aria-label="Filtrar por usuario"
            value={usuarioId}
            onChange={(e) => {
              setUsuarioId(e.target.value);
              resetearPagina();
            }}
          >
            <option value="">Todos los usuarios</option>
            {usuarioPorId.size > 0
              ? [...usuarioPorId.values()].map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.nombre_usuario}
                  </option>
                ))
              : null}
          </Select>
        </FilterField>
        <FilterField>
          <Select
            aria-label="Filtrar por proveedor"
            value={proveedorId}
            onChange={(e) => {
              setProveedorId(e.target.value);
              resetearPagina();
            }}
          >
            <option value="">Todos los proveedores</option>
            {proveedorPorId.size > 0
              ? [...proveedorPorId.values()].map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.nombre}
                  </option>
                ))
              : null}
          </Select>
        </FilterField>
        <FilterField>
          <Select
            aria-label="Filtrar por cliente"
            value={clienteId}
            onChange={(e) => {
              setClienteId(e.target.value);
              resetearPagina();
            }}
          >
            <option value="">Todos los clientes</option>
            {clientePorId.size > 0
              ? [...clientePorId.values()].map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nombre}
                  </option>
                ))
              : null}
          </Select>
        </FilterField>
        <FilterField>
          <Select
            aria-label="Ubicación origen"
            value={ubicacionOrigen}
            onChange={(e) => {
              setUbicacionOrigen(e.target.value);
              resetearPagina();
            }}
          >
            <option value="">Cualquier origen</option>
            {ubicacionPorId.size > 0
              ? [...ubicacionPorId.values()].map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.codigo}
                  </option>
                ))
              : null}
          </Select>
        </FilterField>
        <FilterField>
          <Select
            aria-label="Ubicación destino"
            value={ubicacionDestino}
            onChange={(e) => {
              setUbicacionDestino(e.target.value);
              resetearPagina();
            }}
          >
            <option value="">Cualquier destino</option>
            {ubicacionPorId.size > 0
              ? [...ubicacionPorId.values()].map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.codigo}
                  </option>
                ))
              : null}
          </Select>
        </FilterField>
        <FilterField>
          <Input
            type="date"
            aria-label="Desde"
            value={desde}
            onChange={(e) => {
              setDesde(e.target.value);
              resetearPagina();
            }}
          />
        </FilterField>
        <FilterField>
          <Input
            type="date"
            aria-label="Hasta"
            value={hasta}
            onChange={(e) => {
              setHasta(e.target.value);
              resetearPagina();
            }}
          />
        </FilterField>
      </FilterBar>

      <div className="mt-6 grid grid-cols-1 gap-6 md:grid-cols-2">
        <Card title="Totales por tipo">
          <Card.Body>
            {resumenQuery.isLoading ? (
              <p className="text-base text-gray-500">Cargando…</p>
            ) : (
              <DetailList
                items={TIPOS.map((t) => ({
                  label: TIPO_MOVIMIENTO_LABEL[t],
                  value: conteoPorTipo(t).toLocaleString(),
                  code: true,
                }))}
              />
            )}
          </Card.Body>
        </Card>
        <Card title={`Movimientos por día (últimos ${DIAS_CHART} días)`}>
          <Card.Body>
            {todoQuery.isLoading ? (
              <p className="text-base text-gray-500">Cargando…</p>
            ) : porDia.length > 0 ? (
              <div className="chart" role="img" aria-label="Movimientos por día">
                {porDia.map(([dia, n]) => (
                  <div
                    key={dia}
                    className="chart__col"
                    title={`${dia}: ${n} movimiento${n === 1 ? "" : "s"}`}
                  >
                    <span className="chart__label">{etiquetaDia(dia)}</span>
                    <div
                      className="chart__bar"
                      style={{ height: `${maxDia > 0 ? Math.max(2, (n / maxDia) * 100) : 0}%` }}
                    />
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-base text-gray-500">Sin movimientos en el periodo.</p>
            )}
          </Card.Body>
        </Card>
      </div>

      <div className="mt-6">
        <Card title="Movimientos">
          <Table
            columns={columns}
            rows={filas}
            rowKey={(m) => m.id}
            loading={tablaQuery.isLoading}
            onRowClick={(m) => navigate(movimientoDetalle(m.id))}
            emptyTitle="Sin movimientos para los criterios"
            emptyDescription="Ajuste los filtros o registre movimientos nuevos."
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
