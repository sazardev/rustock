import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router";
import { listarMovimientos, obtenerMovimiento } from "../shared/backend";
import {
  esPaginado,
  type EstadoMovimiento,
  type Movimiento,
  type TipoMovimiento,
} from "../shared/types";
import {
  Badge,
  ButtonLink,
  Card,
  ErrorPanel,
  FilterBar,
  FilterField,
  PageHeader,
  Pagination,
  Select,
  Table,
  Text,
  type TableColumn,
} from "../shared/ui";
import { movimientoDetalle, PATH } from "../app/route-paths";
import { FavoritosFiltros } from "../shared/favoritos";
import {
  ESTADO_MOVIMIENTO_LABEL,
  ESTADO_MOVIMIENTO_TONE,
  TIPO_MOVIMIENTO_ICON,
  TIPO_MOVIMIENTO_LABEL,
  TIPO_MOVIMIENTO_TONE,
  formatearFecha,
  mensajeError,
} from "../shared/format";

const TIPOS: TipoMovimiento[] = ["ENTRADA", "SALIDA", "TRASLADO", "AJUSTE", "CONSUMO"];
const ESTADOS: EstadoMovimiento[] = ["BORRADOR", "PENDIENTE_APROBACION", "APROBADO", "ANULADO"];
const PAGE_SIZE = 20;

export function MovimientosPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [tipo, setTipo] = useState<TipoMovimiento | "">("");
  const [estado, setEstado] = useState<EstadoMovimiento | "">("");

  const filters: string[] = [];
  if (tipo) filters.push(`tipo:eq:${tipo}`);
  if (estado) filters.push(`estado:eq:${estado}`);

  const query = useQuery({
    queryKey: ["movimientos", { page, tipo, estado }],
    queryFn: () =>
      listarMovimientos({
        page,
        page_size: PAGE_SIZE,
        sort: "-fecha_movimiento",
        filters: filters.length ? filters : undefined,
      }),
  });

  const listado = query.data && esPaginado(query.data) ? query.data : null;
  const filas = listado?.data ?? [];

  // Prefetch bajo demanda (STACK §8.4): precargar el detalle del movimiento
  // al pasar el ratón sobre la fila.
  function prefetchDetalle(m: Movimiento) {
    void queryClient.prefetchQuery({
      queryKey: ["movimiento", m.id],
      queryFn: () => obtenerMovimiento(m.id),
    });
  }

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
    { key: "sub_tipo", header: "Sub-tipo", code: true, render: (m) => m.sub_tipo },
    {
      key: "estado",
      header: "Estado",
      render: (m) => (
        <Badge tone={ESTADO_MOVIMIENTO_TONE[m.estado]}>{ESTADO_MOVIMIENTO_LABEL[m.estado]}</Badge>
      ),
    },
    {
      key: "fecha_movimiento",
      header: "Fecha",
      render: (m) => formatearFecha(m.fecha_movimiento),
    },
    {
      key: "documento_referencia",
      header: "Documento",
      code: true,
      render: (m) => m.documento_referencia ?? "—",
    },
  ];

  return (
    <>
      <PageHeader
        title="Movimientos"
        description="Entradas, salidas, traslados y ajustes de inventario."
        actions={
          <ButtonLink variant="primary" icon="agregar" href={PATH.movimientosNuevo}>
            Nuevo movimiento
          </ButtonLink>
        }
      />

      {query.error ? (
        <ErrorPanel title="No se pudieron cargar los movimientos">
          {mensajeError(query.error)}
        </ErrorPanel>
      ) : null}

      <FilterBar>
        <FilterField>
          <Select
            aria-label="Filtrar por tipo"
            value={tipo}
            onChange={(e) => {
              setTipo(e.target.value as TipoMovimiento | "");
              setPage(1);
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
            aria-label="Filtrar por estado"
            value={estado}
            onChange={(e) => {
              setEstado(e.target.value as EstadoMovimiento | "");
              setPage(1);
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
      </FilterBar>

      <FavoritosFiltros
        clave="movimientos"
        estadoActual={() => ({ tipo, estado })}
        onAplicar={(estadoGuardado) => {
          setTipo((estadoGuardado.tipo as TipoMovimiento) || "");
          setEstado((estadoGuardado.estado as EstadoMovimiento) || "");
          setPage(1);
        }}
      />

      <Card>
        <Table
          columns={columns}
          rows={filas}
          rowKey={(m) => m.id}
          loading={query.isLoading}
          onRowClick={(m) => navigate(movimientoDetalle(m.id))}
          prefetch={prefetchDetalle}
          emptyTitle="No hay movimientos todavía"
          emptyDescription="Registre el primer movimiento para comenzar a operar."
          emptyAction={
            <ButtonLink variant="primary" size="sm" icon="agregar" href={PATH.movimientosNuevo}>
              Crear movimiento
            </ButtonLink>
          }
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

      <Card muted>
        <Card.Body>
          <Text as="p" size="sm" color="muted">
            Los movimientos se aprueban en su página de detalle. Cada anulación genera un movimiento
            inverso.
          </Text>
        </Card.Body>
      </Card>
    </>
  );
}
