import { useState } from "react";
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
import {
  ESTADO_SESION_LABEL,
  ESTADO_SESION_TONE,
  formatearFecha,
  mensajeError,
} from "../shared/format";

const ESTADOS: EstadoSesionInventario[] = ["PLANEADA", "EN_CURSO", "CERRADA", "ANULADA"];
const PAGE_SIZE = 20;

export function InventarioPage() {
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
    { key: "numero", header: "Número", code: true, render: (s) => s.numero },
    {
      key: "tipo",
      header: "Tipo",
      render: (s) => (s.tipo === "COMPLETO" ? "Completo" : "Cíclico"),
    },
    { key: "almacen_id", header: "Almacén", render: (s) => <AlmacenRef id={s.almacen_id} /> },
    { key: "alcance", header: "Alcance", render: (s) => s.alcance ?? "—" },
    {
      key: "estado",
      header: "Estado",
      render: (s) => (
        <Badge tone={ESTADO_SESION_TONE[s.estado]}>{ESTADO_SESION_LABEL[s.estado]}</Badge>
      ),
    },
    { key: "fecha_inicio", header: "Inicio", render: (s) => formatearFecha(s.fecha_inicio) },
  ];

  return (
    <>
      <PageHeader
        title="Inventario físico"
        description="Sesiones de conteo y conciliación de existencias."
        actions={
          <ButtonLink variant="primary" icon="agregar" href={PATH.inventarioNuevo}>
            Nueva sesión
          </ButtonLink>
        }
      />

      {query.error ? (
        <ErrorPanel title="No se pudieron cargar las sesiones">
          {mensajeError(query.error)}
        </ErrorPanel>
      ) : null}

      <FilterBar>
        <FilterField>
          <Select
            aria-label="Filtrar por estado"
            value={estado}
            onChange={(e) => {
              setEstado(e.target.value as EstadoSesionInventario | "");
              setPage(1);
            }}
          >
            <option value="">Todos los estados</option>
            {ESTADOS.map((e) => (
              <option key={e} value={e}>
                {ESTADO_SESION_LABEL[e]}
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
          emptyTitle="No hay sesiones de inventario"
          emptyDescription="Cree una sesión de conteo para verificar las existencias de un almacén."
          emptyAction={
            <ButtonLink variant="primary" size="sm" icon="agregar" href={PATH.inventarioNuevo}>
              Crear sesión
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
    </>
  );
}
