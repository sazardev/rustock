import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router";
import { listarRoles, listarUsuarios, obtenerUsuario } from "../shared/backend";
import { esPaginado, type Rol, type Usuario } from "../shared/types";
import { formatearFecha, mensajeError } from "../shared/format";
import { catalogoDetalle, PATH } from "../app/route-paths";
import { useSession } from "../shared/session";
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

const ROL_LABEL: Record<string, string> = {
  ADMIN: "Administrador",
  GERENTE: "Gerente",
  ENCARGADO_ALMACEN: "Encargado de almacén",
  OPERADOR: "Operador",
  LECTOR: "Lector",
};

export function UsuariosPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const usuarioActual = useSession((s) => s.usuario);
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

  // Solo el ADMIN gestiona usuarios (SPEC §4.4); el resto solo ve el listado.
  const rolCodigo = rolDe(usuarioActual?.rol_id ?? "")?.codigo;
  const esAdmin = rolCodigo === "ADMIN";

  const listado = query.data && esPaginado(query.data) ? query.data : null;
  const filas = listado?.data ?? [];

  const columns: Array<TableColumn<Usuario>> = [
    { key: "nombre_usuario", header: "Usuario", code: true, render: (u) => u.nombre_usuario },
    { key: "nombre_completo", header: "Nombre completo", render: (u) => u.nombre_completo },
    { key: "email", header: "Email", render: (u) => u.email ?? "—" },
    {
      key: "rol_id",
      header: "Rol",
      render: (u) => {
        const rol = rolDe(u.rol_id);
        return <Text size="sm">{rol ? (ROL_LABEL[rol.codigo] ?? rol.codigo) : "—"}</Text>;
      },
    },
    {
      key: "activo",
      header: "Estado",
      render: (u) =>
        u.activo ? <Badge tone="success">Activo</Badge> : <Badge tone="danger">Inactivo</Badge>,
    },
    {
      key: "ultimo_acceso_at",
      header: "Último acceso",
      render: (u) => (u.ultimo_acceso_at ? formatearFecha(u.ultimo_acceso_at) : "—"),
    },
  ];

  return (
    <>
      <PageHeader title="Usuarios" />

      {query.error ? (
        <ErrorPanel title="No se pudieron cargar los usuarios">
          {mensajeError(query.error)}
        </ErrorPanel>
      ) : null}

      <FilterBar
        action={
          esAdmin ? (
            <ButtonLink variant="primary" icon="agregar" href={`${PATH.usuarios}/nuevo`}>
              Nuevo usuario
            </ButtonLink>
          ) : undefined
        }
      >
        <FilterField>
          <Select
            aria-label="Filtrar por estado"
            value={estado}
            onChange={(e) => {
              setEstado(e.target.value as typeof estado);
              setPage(1);
            }}
          >
            <option value="">Todos los estados</option>
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
          emptyTitle="No hay usuarios todavía"
          emptyDescription="Crea la primera cuenta para que otra persona pueda operar."
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
            Las cuentas desactivadas no pueden iniciar sesión; su historial se conserva.
          </Text>
        </Card.Body>
      </Card>
    </>
  );
}
