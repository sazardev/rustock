import { useQuery, useQueryClient } from "@tanstack/react-query";
import { usePuede } from "../shared/session";
import { useT } from "../shared/i18n";
import { useNavigate, useSearchParams } from "react-router";
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
  ESTADO_MOVIMIENTO_TONE,
  TIPO_MOVIMIENTO_ICON,
  TIPO_MOVIMIENTO_TONE,
  formatearFecha,
  mensajeError,
} from "../shared/format";

const TIPOS: TipoMovimiento[] = ["ENTRADA", "SALIDA", "TRASLADO", "AJUSTE", "CONSUMO"];
const ESTADOS: EstadoMovimiento[] = ["BORRADOR", "PENDIENTE_APROBACION", "APROBADO", "ANULADO"];
const PAGE_SIZE = 20;

export function MovimientosPage() {
  const t = useT();
  const puedeCrear = usePuede("movimiento", "crear");
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // Los filtros viven en la URL (DESIGN §6.10): Deep-link, recarga segura y
  // Compartible. `tipo`/`estado`/`page` son la única fuente de verdad.
  const [searchParams, setSearchParams] = useSearchParams();
  const page = Number(searchParams.get("page")) || 1;
  const tipo = (searchParams.get("tipo") as TipoMovimiento | null) ?? "";
  const estado = (searchParams.get("estado") as EstadoMovimiento | null) ?? "";

  function actualizarFiltros(cambios: { tipo?: string; estado?: string; page?: number }) {
    const next = new URLSearchParams(searchParams);
    const setear = (clave: string, valor: string | number | undefined) => {
      if (valor === undefined || valor === "" || valor === 1) next.delete(clave);
      else next.set(clave, String(valor));
    };
    if (cambios.tipo !== undefined) setear("tipo", cambios.tipo);
    if (cambios.estado !== undefined) setear("estado", cambios.estado);
    if (cambios.page !== undefined) setear("page", cambios.page);
    setSearchParams(next);
  }

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
    { key: "numero", header: t.mov.numero, code: true, render: (m) => m.numero },
    {
      key: "tipo",
      header: t.comun.tipo,
      render: (m) => (
        <Badge tone={TIPO_MOVIMIENTO_TONE[m.tipo]} icon={TIPO_MOVIMIENTO_ICON[m.tipo]}>
          {t.dominio.tipoMovimiento[m.tipo]}
        </Badge>
      ),
    },
    {
      key: "sub_tipo",
      header: t.mov.subTipo,
      code: true,
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
      header: t.mov.documento,
      code: true,
      render: (m) => m.documento_referencia ?? "—",
    },
  ];

  return (
    <>
      <PageHeader title={t.mov.titulo} description={t.mov.descripcion} />

      {query.error ? (
        <ErrorPanel title={t.mov.noSePudoCargar}>{mensajeError(query.error)}</ErrorPanel>
      ) : null}

      <FilterBar
        action={
          puedeCrear ? (
            <ButtonLink variant="primary" icon="agregar" href={PATH.movimientosNuevo}>
              {t.mov.nuevo}
            </ButtonLink>
          ) : undefined
        }
      >
        <FilterField>
          <Select
            aria-label={t.mov.filtrarPorTipo}
            value={tipo}
            onChange={(e) => actualizarFiltros({ tipo: e.target.value, page: 1 })}
          >
            <option value="">{t.mov.todosLosTipos}</option>
            {TIPOS.map((valor) => (
              <option key={valor} value={valor}>
                {t.dominio.tipoMovimiento[valor]}
              </option>
            ))}
          </Select>
        </FilterField>
        <FilterField>
          <Select
            aria-label={t.mov.filtrarPorEstado}
            value={estado}
            onChange={(e) => actualizarFiltros({ estado: e.target.value, page: 1 })}
          >
            <option value="">{t.mov.todosLosEstados}</option>
            {ESTADOS.map((e) => (
              <option key={e} value={e}>
                {t.dominio.estadoMovimiento[e]}
              </option>
            ))}
          </Select>
        </FilterField>
      </FilterBar>

      <FavoritosFiltros
        clave="movimientos"
        estadoActual={() => ({ tipo, estado })}
        onAplicar={(estadoGuardado) => {
          actualizarFiltros({
            tipo: (estadoGuardado.tipo as string) || "",
            estado: (estadoGuardado.estado as string) || "",
            page: 1,
          });
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
          emptyTitle={t.mov.sinMovimientos}
          emptyDescription={t.mov.sinMovimientosDesc}
          emptyAction={
            puedeCrear ? (
              <ButtonLink variant="primary" size="sm" icon="agregar" href={PATH.movimientosNuevo}>
                {t.mov.crearPrimero}
              </ButtonLink>
            ) : undefined
          }
        />
        {listado && listado.meta.total > 0 ? (
          <Pagination
            page={listado.meta.page}
            pageCount={listado.meta.total_pages}
            total={listado.meta.total}
            from={(listado.meta.page - 1) * listado.meta.page_size + 1}
            to={Math.min(listado.meta.page * listado.meta.page_size, listado.meta.total)}
            onPageChange={(p) => actualizarFiltros({ page: p })}
          />
        ) : null}
      </Card>

      <Card muted>
        <Card.Body>
          <Text as="p" size="sm" color="muted">
            {t.mov.nota}
          </Text>
        </Card.Body>
      </Card>
    </>
  );
}
