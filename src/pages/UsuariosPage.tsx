import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router";
import { listarRoles, listarUsuarios, obtenerUsuario } from "../shared/backend";
import { esPaginado, type Rol, type Usuario } from "../shared/types";
import { formatearFecha, mensajeError } from "../shared/format";
import { catalogoDetalle, PATH } from "../app/route-paths";
import { usePuede } from "../shared/session";
import { useT } from "../shared/i18n";
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

const PAGE_SIZE = 20;

export function UsuariosPage() {
  const t = useT();
  const puedeCrear = usePuede("usuario", "crear");
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [estado, setEstado] = useState<"" | "activo" | "inactivo">("");

  function prefetchDetalle(u: Usuario) {
    void queryClient.prefetchQuery({
      queryKey: ["usuario", u.id],
      queryFn: () => obtenerUsuario(u.id),
    });
  }

  const filters: string[] = [];
  if (estado === "activo") filters.push("activo:eq:true");
  if (estado === "inactivo") filters.push("activo:eq:false");

  const query = useQuery({
    queryKey: ["usuarios", { page, estado }],
    queryFn: () =>
      listarUsuarios({
        page,
        page_size: PAGE_SIZE,
        sort: "nombre_usuario",
        filters: filters.length ? filters : undefined,
      }),
  });

  const rolesQuery = useQuery({
    queryKey: ["roles"],
    queryFn: listarRoles,
    staleTime: 5 * 60_000,
  });
  const rolDe = (id: string): Rol | undefined => rolesQuery.data?.find((r) => r.id === id);

  const listado = query.data && esPaginado(query.data) ? query.data : null;
  const filas = listado?.data ?? [];

  const columns: Array<TableColumn<Usuario>> = [
    {
      key: "nombre_usuario",
      header: t.campos.usuario,
      code: true,
      render: (u) => u.nombre_usuario,
    },
    {
      key: "nombre_completo",
      header: t.usuariosPagina.nombreCompleto,
      render: (u) => u.nombre_completo,
    },
    { key: "email", header: t.perfil.email, render: (u) => u.email ?? "—" },
    {
      key: "rol_id",
      header: t.campos.rol,
      render: (u) => {
        const rol = rolDe(u.rol_id);
        return (
          <Text size="sm">
            {rol ? (t.roles[rol.codigo as keyof typeof t.roles] ?? rol.codigo) : "—"}
          </Text>
        );
      },
    },
    {
      key: "activo",
      header: t.comun.estado,
      render: (u) =>
        u.activo ? (
          <Badge tone="success">{t.comun.activo}</Badge>
        ) : (
          <Badge tone="danger">Inactivo</Badge>
        ),
    },
    {
      key: "ultimo_acceso_at",
      header: t.usuariosPagina.ultimoAcceso,
      render: (u) => (u.ultimo_acceso_at ? formatearFecha(u.ultimo_acceso_at) : "—"),
    },
  ];

  return (
    <>
      <PageHeader title={t.campos.usuarios} />

      {query.error ? (
        <ErrorPanel title={t.usuariosPagina.noSePudoCargar}>{mensajeError(query.error)}</ErrorPanel>
      ) : null}

      <FilterBar
        action={
          puedeCrear ? (
            <ButtonLink variant="primary" icon="agregar" href={`${PATH.usuarios}/nuevo`}>
              {t.comun.nuevoUsuario}
            </ButtonLink>
          ) : undefined
        }
      >
        <FilterField>
          <Select
            aria-label={t.usuariosPagina.filtrarPorEstado}
            value={estado}
            onChange={(e) => {
              setEstado(e.target.value as typeof estado);
              setPage(1);
            }}
          >
            <option value="">{t.usuariosPagina.todosLosEstados}</option>
            <option value="activo">Activos</option>
            <option value="inactivo">Inactivos</option>
          </Select>
        </FilterField>
      </FilterBar>

      <Card>
        <Table
          columns={columns}
          rows={filas}
          rowKey={(u) => u.id}
          loading={query.isLoading}
          onRowClick={(u) => navigate(catalogoDetalle("usuarios", u.id))}
          prefetch={prefetchDetalle}
          emptyTitle={t.usuariosPagina.sinUsuarios}
          emptyDescription={t.usuariosPagina.sinUsuariosDesc}
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
            {t.usuariosPagina.avisoDesactivadas}
          </Text>
        </Card.Body>
      </Card>
    </>
  );
}
