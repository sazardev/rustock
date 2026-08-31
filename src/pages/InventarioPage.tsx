import { useState } from "react";
import { usePuede } from "../shared/session";
import { useT } from "../shared/i18n";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router";
import { listarSesionesInventario, obtenerSesionInventario } from "../shared/backend";
import { esPaginado, type EstadoSesionInventario, type SesionInventario } from "../shared/types";
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
  type TableColumn,
} from "../shared/ui";
import { AlmacenRef } from "../shared/refs";
import { PATH, sesionInventarioDetalle } from "../app/route-paths";
import { ESTADO_SESION_TONE, formatearFecha, mensajeError } from "../shared/format";

const ESTADOS: EstadoSesionInventario[] = ["PLANEADA", "EN_CURSO", "CERRADA", "ANULADA"];
const PAGE_SIZE = 20;

export function InventarioPage() {
  const t = useT();
  const puedeCrear = usePuede("inventario", "ejecutar");
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [estado, setEstado] = useState<EstadoSesionInventario | "">("");

  function prefetchDetalle(s: SesionInventario) {
    void queryClient.prefetchQuery({
      queryKey: ["sesion-inventario", s.id],
      queryFn: () => obtenerSesionInventario(s.id),
    });
  }

  const query = useQuery({
    queryKey: ["sesiones-inventario", { page, estado }],
    queryFn: () =>
      listarSesionesInventario({
        page,
        page_size: PAGE_SIZE,
        sort: "-created_at",
        filters: estado ? [`estado:eq:${estado}`] : undefined,
      }),
  });

  const listado = query.data && esPaginado(query.data) ? query.data : null;
  const filas = listado?.data ?? [];

  const columns: Array<TableColumn<SesionInventario>> = [
    { key: "numero", header: t.campos.numero, code: true, render: (s) => s.numero },
    {
      key: "tipo",
      header: t.comun.tipo,
      render: (s) =>
        s.tipo === "COMPLETO" ? t.sesionInventario.completo : t.sesionInventario.ciclico,
    },
    {
      key: "almacen_id",
      header: t.campos.almacen,
      render: (s) => <AlmacenRef id={s.almacen_id} />,
    },
    { key: "alcance", header: t.campos.alcance, render: (s) => s.alcance ?? "—" },
    {
      key: "estado",
      header: t.comun.estado,
      render: (s) => (
        <Badge tone={ESTADO_SESION_TONE[s.estado]}>{t.dominio.estadoSesion[s.estado]}</Badge>
      ),
    },
    {
      key: "fecha_inicio",
      header: t.sesionInventario.fechaInicio,
      render: (s) => formatearFecha(s.fecha_inicio),
    },
  ];

  return (
    <>
      <PageHeader title={t.inventarioPagina.titulo} />

      {query.error ? (
        <ErrorPanel title={t.inventarioPagina.noSePudoCargar}>
          {mensajeError(query.error)}
        </ErrorPanel>
      ) : null}

      <FilterBar
        action={
          puedeCrear ? (
            <ButtonLink variant="primary" icon="agregar" href={PATH.inventarioNuevo}>
              {t.inventarioPagina.nuevaSesion}
            </ButtonLink>
          ) : undefined
        }
      >
        <FilterField>
          <Select
            aria-label={t.inventarioPagina.filtrarPorEstado}
            value={estado}
            onChange={(e) => {
              setEstado(e.target.value as EstadoSesionInventario | "");
              setPage(1);
            }}
          >
            <option value="">{t.inventarioPagina.todosLosEstados}</option>
            {ESTADOS.map((e) => (
              <option key={e} value={e}>
                {t.dominio.estadoSesion[e]}
              </option>
            ))}
          </Select>
        </FilterField>
      </FilterBar>

      <Card>
        <Table
          columns={columns}
          rows={filas}
          rowKey={(s) => s.id}
          loading={query.isLoading}
          onRowClick={(s) => navigate(sesionInventarioDetalle(s.id))}
          prefetch={prefetchDetalle}
          emptyTitle={t.inventarioPagina.sinSesiones}
          emptyDescription={t.inventarioPagina.sinSesionesDesc}
          emptyAction={
            puedeCrear ? (
              <ButtonLink variant="primary" size="sm" icon="agregar" href={PATH.inventarioNuevo}>
                {t.inventarioNuevo.crear}
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
            onPageChange={setPage}
          />
        ) : null}
      </Card>
    </>
  );
}
