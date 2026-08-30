import { useMemo, useState } from "react";
import { useT } from "../shared/i18n";
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
  ESTADO_MOVIMIENTO_TONE,
  formatearFecha,
  formatearNumero,
  mensajeError,
} from "../shared/format";
import { nombreExportacion } from "../shared/exportar";

export interface ConfigReporteTipo {
  /**
   * Sección del diccionario con el título y la descripción. La configuración
   * es una constante de módulo que consume el router, así que no puede llevar
   * texto ya traducido: guarda la clave y la página la resuelve al pintar.
   */
  textos: "entradas" | "salidas" | "mermas";
  /** Filtros base que definen el tipo de reporte (ej. `["tipo:eq:ENTRADA"]`). */
  filtrosBase: string[];
  exportarNombre: string;
  conProveedor?: boolean;
  conCliente?: boolean;
}

export const CONFIG_ENTRADAS: ConfigReporteTipo = {
  textos: "entradas",
  filtrosBase: ["tipo:eq:ENTRADA"],
  exportarNombre: "entradas",
  conProveedor: true,
};

export const CONFIG_SALIDAS: ConfigReporteTipo = {
  textos: "salidas",
  filtrosBase: ["tipo:eq:SALIDA"],
  exportarNombre: "salidas",
  conCliente: true,
};

export const CONFIG_MERMAS_AJUSTES: ConfigReporteTipo = {
  textos: "mermas",
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
  const t = useT();
  const textos = t.reportes[config.textos];
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
        tipo: t.dominio.tipoMovimiento[m.tipo],
        sub_tipo: t.dominio.subTipoMovimiento[m.sub_tipo],
        estado: t.dominio.estadoMovimiento[m.estado],
        fecha_movimiento: formatearFecha(m.fecha_movimiento),
        documento_referencia: m.documento_referencia ?? "",
        motivo: m.motivo ?? "",
        proveedor_id: m.proveedor_id ?? "",
        cliente_id: m.cliente_id ?? "",
        usuario_id: m.created_by,
      })),
    [t, filasTodo],
  );

  const listado = tablaQuery.data && esPaginado(tablaQuery.data) ? tablaQuery.data : null;
  const filas = listado?.data ?? [];

  const columns: Array<TableColumn<Movimiento>> = [
    { key: "numero", header: t.campos.numero, code: true, render: (m) => m.numero },
    {
      key: "sub_tipo",
      header: t.campos.subTipo,
      render: (m) => t.dominio.subTipoMovimiento[m.sub_tipo],
    },
    {
      key: "estado",
      header: t.comun.estado,
      render: (m) => (
        <Badge tone={ESTADO_MOVIMIENTO_TONE[m.estado]}>
          {t.dominio.estadoMovimiento[m.estado]}
        </Badge>
      ),
    },
    {
      key: "fecha_movimiento",
      header: t.comun.fecha,
      render: (m) => formatearFecha(m.fecha_movimiento),
    },
    {
      key: "documento_referencia",
      header: t.campos.documentoReferencia,
      code: true,
      render: (m) => m.documento_referencia ?? "—",
    },
    ...(config.conProveedor
      ? [
          {
            key: "proveedor_id",
            header: t.campos.proveedor,
            render: (m: Movimiento) =>
              m.proveedor_id ? <ProveedorRef id={m.proveedor_id} /> : "—",
          },
        ]
      : []),
    ...(config.conCliente
      ? [
          {
            key: "cliente_id",
            header: t.campos.cliente,
            render: (m: Movimiento) => (m.cliente_id ? <ClienteRef id={m.cliente_id} /> : "—"),
          },
        ]
      : []),
    { key: "motivo", header: t.campos.motivo, render: (m) => m.motivo ?? "—" },
  ];

  const error = tablaQuery.error ?? resumenQuery.error ?? todoQuery.error;

  return (
    <>
      <PageHeader
        title={textos.titulo}
        description={textos.descripcion}
        actions={
          <ButtonLink variant="secondary" icon="atras" href={PATH.reportes}>
            {t.reportes.volver}
          </ButtonLink>
        }
      />

      {error ? (
        <ErrorPanel title={t.reportes.noSePudoCargar}>{mensajeError(error)}</ErrorPanel>
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
            aria-label={t.reportes.filtrarEstado}
            value={estado}
            onChange={(e) => {
              setEstado(e.target.value as EstadoMovimiento | "");
              resetearPagina();
            }}
          >
            <option value="">{t.reportes.todosEstados}</option>
            {(
              ["BORRADOR", "PENDIENTE_APROBACION", "APROBADO", "ANULADO"] as EstadoMovimiento[]
            ).map((e) => (
              <option key={e} value={e}>
                {t.dominio.estadoMovimiento[e]}
              </option>
            ))}
          </Select>
        </FilterField>
        {config.conProveedor && catProveedores.data ? (
          <FilterField>
            <Select
              aria-label={t.reportes.filtrarProveedor}
              value={proveedorId}
              onChange={(e) => {
                setProveedorId(e.target.value);
                resetearPagina();
              }}
            >
              <option value="">{t.reportes.todosProveedores}</option>
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
              aria-label={t.reportes.filtrarCliente}
              value={clienteId}
              onChange={(e) => {
                setClienteId(e.target.value);
                resetearPagina();
              }}
            >
              <option value="">{t.reportes.todosClientes}</option>
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
            aria-label={t.reportes.desde}
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
            aria-label={t.reportes.hasta}
            value={hasta}
            onChange={(e) => {
              setHasta(e.target.value);
              resetearPagina();
            }}
          />
        </FilterField>
      </FilterBar>

      <div className="mt-6">
        <Card title={t.reportes.totalesPorSubTipo}>
          <Card.Body>
            {resumenQuery.isLoading ? (
              <p className="text-base text-gray-500">{t.comun.cargando}</p>
            ) : totales.length > 0 ? (
              <DetailList
                items={totales.map((fila) => ({
                  label:
                    t.dominio.subTipoMovimiento[
                      fila.key as keyof typeof t.dominio.subTipoMovimiento
                    ] ?? fila.key,
                  value: formatearNumero(fila.count),
                  code: true,
                }))}
              />
            ) : (
              <p className="text-base text-gray-500">{t.reportes.sinRegistrosPunto}</p>
            )}
          </Card.Body>
        </Card>
      </div>

      <div className="mt-6">
        <Card title={textos.titulo}>
          <Table
            columns={columns}
            rows={filas}
            rowKey={(m) => m.id}
            loading={tablaQuery.isLoading}
            onRowClick={(m) => navigate(movimientoDetalle(m.id))}
            emptyTitle={t.reportes.sinRegistrosCriterios}
            emptyDescription={t.reportes.ajusteFiltros}
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
