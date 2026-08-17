import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router";
import { listarClientes, listarMovimientos, listarProveedores } from "../shared/backend";
import { esPaginado, type EstadoMovimiento, type Movimiento } from "../shared/types";
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
import { ClienteRef, ProveedorRef } from "../shared/refs";
import { movimientoDetalle, PATH } from "../app/route-paths";
import {
  ESTADO_MOVIMIENTO_LABEL,
  ESTADO_MOVIMIENTO_TONE,
  SUB_TIPO_MOVIMIENTO_LABEL,
  TIPO_MOVIMIENTO_LABEL,
  formatearFecha,
  mensajeError,
} from "../shared/format";
import { nombreExportacion } from "../shared/exportar";

export interface ConfigReporteTipo {
  titulo: string;
  descripcion: string;
  /** Filtros base que definen el tipo de reporte (ej. `["tipo:eq:ENTRADA"]`). */
  filtrosBase: string[];
  exportarNombre: string;
  conProveedor?: boolean;
  conCliente?: boolean;
}

export const CONFIG_ENTRADAS: ConfigReporteTipo = {
  titulo: "Entradas del periodo",
  descripcion: "Compras, devoluciones de cliente, ajustes positivos e iniciales con su proveedor.",
  filtrosBase: ["tipo:eq:ENTRADA"],
  exportarNombre: "entradas",
  conProveedor: true,
};

export const CONFIG_SALIDAS: ConfigReporteTipo = {
  titulo: "Salidas del periodo",
  descripcion: "Despachos a cliente, devoluciones a proveedor y traslados de salida.",
  filtrosBase: ["tipo:eq:SALIDA"],
  exportarNombre: "salidas",
  conCliente: true,
};

export const CONFIG_MERMAS_AJUSTES: ConfigReporteTipo = {
  titulo: "Mermas y ajustes",
  descripcion: "Mermas y ajustes de stock (positivos y negativos) con su motivo.",
  filtrosBase: ["sub_tipo:in:MERMA,AJUSTE_POSITIVO,AJUSTE_NEGATIVO"],
  exportarNombre: "mermas-ajustes",
};

const PAGE_SIZE = 20;

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
];

export function ReporteMovimientosTipoPage({ config }: { config: ConfigReporteTipo }) {
  const navigate = useNavigate();
  const [page, setPage] = useState(1);
  const [estado, setEstado] = useState<EstadoMovimiento | "">("");
  const [proveedorId, setProveedorId] = useState("");
  const [clienteId, setClienteId] = useState("");
  const [desde, setDesde] = useState("");
  const [hasta, setHasta] = useState("");

  const filtros = useMemo(() => {
    const f = [...config.filtrosBase];
    if (estado) f.push(`estado:eq:${estado}`);
    if (proveedorId) f.push(`proveedor_id:eq:${proveedorId}`);
    if (clienteId) f.push(`cliente_id:eq:${clienteId}`);
    if (desde) f.push(`fecha_movimiento:gte:${desde}T00:00:00`);
    if (hasta) f.push(`fecha_movimiento:lte:${hasta}T23:59:59`);
    return f;
  }, [config, estado, proveedorId, clienteId, desde, hasta]);

  const resetearPagina = () => setPage(1);

  const catProveedores = useQuery({
    queryKey: ["proveedores", config.exportarNombre],
    queryFn: () => listarProveedores({ page_size: -1, sort: "nombre" }),
    enabled: Boolean(config.conProveedor),
  });
  const catClientes = useQuery({
    queryKey: ["clientes", config.exportarNombre],
    queryFn: () => listarClientes({ page_size: -1, sort: "nombre" }),
    enabled: Boolean(config.conCliente),
  });

  const resumenQuery = useQuery({
    queryKey: ["reporte-tipo-resumen", config.exportarNombre, filtros],
    queryFn: () => listarMovimientos({ group_by: "sub_tipo", filters: filtros }),
  });

  const tablaQuery = useQuery({
    queryKey: ["reporte-tipo", config.exportarNombre, { page, filtros }],
    queryFn: () =>
      listarMovimientos({
        page,
        page_size: PAGE_SIZE,
        sort: "-fecha_movimiento",
        filters: filtros,
      }),
  });

  const todoQuery = useQuery({
    queryKey: ["reporte-tipo-todo", config.exportarNombre, filtros],
    queryFn: () => listarMovimientos({ page_size: -1, fields: CAMPOS_EXPORT, filters: filtros }),
  });

  const totales = useMemo(() => {
    const grupos =
      resumenQuery.data && "groups" in resumenQuery.data ? resumenQuery.data.groups : [];
    const validos = grupos.filter((g) => typeof g.count === "number");
    return validos.map((g) => ({
      key: String(g.key),
      count: g.count as number,
    }));
  }, [resumenQuery.data]);

  const filasTodo = useMemo(
    () => (todoQuery.data && esPaginado(todoQuery.data) ? todoQuery.data.data : []),
    [todoQuery.data],
  );

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
        proveedor_id: m.proveedor_id ?? "",
        cliente_id: m.cliente_id ?? "",
        usuario_id: m.created_by,
      })),
    [filasTodo],
  );

  const listado = tablaQuery.data && esPaginado(tablaQuery.data) ? tablaQuery.data : null;
  const filas = listado?.data ?? [];

  const columns: Array<TableColumn<Movimiento>> = [
    { key: "numero", header: "Número", code: true, render: (m) => m.numero },
    { key: "sub_tipo", header: "Sub-tipo", render: (m) => SUB_TIPO_MOVIMIENTO_LABEL[m.sub_tipo] },
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
    ...(config.conProveedor
      ? [
          {
            key: "proveedor_id",
            header: "Proveedor",
            render: (m: Movimiento) =>
              m.proveedor_id ? <ProveedorRef id={m.proveedor_id} /> : "—",
          },
        ]
      : []),
    ...(config.conCliente
      ? [
          {
            key: "cliente_id",
            header: "Cliente",
            render: (m: Movimiento) => (m.cliente_id ? <ClienteRef id={m.cliente_id} /> : "—"),
          },
        ]
      : []),
    { key: "motivo", header: "Motivo", render: (m) => m.motivo ?? "—" },
  ];

  const error = tablaQuery.error ?? resumenQuery.error ?? todoQuery.error;

  return (
    <>
      <PageHeader
        title={config.titulo}
        description={config.descripcion}
        actions={
          <ButtonLink variant="secondary" icon="atras" href={PATH.reportes}>
            Volver a reportes
          </ButtonLink>
        }
      />

      {error ? (
        <ErrorPanel title="No se pudo cargar el reporte">{mensajeError(error)}</ErrorPanel>
      ) : null}

      <FilterBar
        action={
          <ExportButtons
            nombre={nombreExportacion(config.exportarNombre)}
            filas={filasExport}
            disabled={todoQuery.isLoading}
          />
        }
      >
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
            {(
              ["BORRADOR", "PENDIENTE_APROBACION", "APROBADO", "ANULADO"] as EstadoMovimiento[]
            ).map((e) => (
              <option key={e} value={e}>
                {ESTADO_MOVIMIENTO_LABEL[e]}
              </option>
            ))}
          </Select>
        </FilterField>
        {config.conProveedor && catProveedores.data ? (
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
              {esPaginado(catProveedores.data) &&
                catProveedores.data.data.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.nombre}
                  </option>
                ))}
            </Select>
          </FilterField>
        ) : null}
        {config.conCliente && catClientes.data ? (
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
              {esPaginado(catClientes.data) &&
                catClientes.data.data.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nombre}
                  </option>
                ))}
            </Select>
          </FilterField>
        ) : null}
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

      <div className="mt-6">
        <Card title="Totales por sub-tipo">
          <Card.Body>
            {resumenQuery.isLoading ? (
              <p className="text-base text-gray-500">Cargando…</p>
            ) : totales.length > 0 ? (
              <DetailList
                items={totales.map((t) => ({
                  label:
                    SUB_TIPO_MOVIMIENTO_LABEL[t.key as keyof typeof SUB_TIPO_MOVIMIENTO_LABEL] ??
                    t.key,
                  value: t.count.toLocaleString(),
                  code: true,
                }))}
              />
            ) : (
              <p className="text-base text-gray-500">Sin registros para los criterios.</p>
            )}
          </Card.Body>
        </Card>
      </div>

      <div className="mt-6">
        <Card title={config.titulo}>
          <Table
            columns={columns}
            rows={filas}
            rowKey={(m) => m.id}
            loading={tablaQuery.isLoading}
            onRowClick={(m) => navigate(movimientoDetalle(m.id))}
            emptyTitle="Sin registros para los criterios"
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
