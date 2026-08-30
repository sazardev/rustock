import { useQuery } from "@tanstack/react-query";
import { useParams } from "react-router";
import { listarHistorial, listarRoles, obtenerUsuario } from "../shared/backend";
import { useSession } from "../shared/session";
import { esPaginado, type Rol } from "../shared/types";
import { formatearFecha, mensajeError } from "../shared/format";
import { catalogoLista, PATH } from "../app/route-paths";
import {
  Badge,
  ButtonLink,
  Card,
  DetailList,
  ErrorPanel,
  PageHeader,
  Table,
  type TableColumn,
} from "../shared/ui";
import type { EventoAuditoria } from "../shared/audit";
import { useT } from "../shared/i18n";

const ROL_LABEL: Record<string, string> = {
  ADMIN: "Administrador",
  GERENTE: "Gerente",
  ENCARGADO_ALMACEN: "Encargado de almacén",
  OPERADOR: "Operador",
  LECTOR: "Lector",
};

export function UsuarioDetallePage() {
  const t = useT();
  const { id } = useParams<{ id: string }>();
  const usuarioActual = useSession((s) => s.usuario);

  const query = useQuery({
    queryKey: ["usuario", id],
    queryFn: () => obtenerUsuario(id as string),
    enabled: Boolean(id),
  });
  const rolesQuery = useQuery({
    queryKey: ["roles"],
    queryFn: listarRoles,
    staleTime: 5 * 60_000,
  });
  const rolDe = (rolId: string): Rol | undefined => rolesQuery.data?.find((r) => r.id === rolId);

  const historialQuery = useQuery({
    queryKey: ["historial", id],
    queryFn: () => listarHistorial({ usuario_id: id, page_size: 20 }),
    enabled: Boolean(id),
  });

  const usuario = query.data ?? null;
  const rolCodigo = rolDe(usuarioActual?.rol_id ?? "")?.codigo;
  const esAdmin = rolCodigo === "ADMIN";
  const esMiCuenta = usuarioActual?.id === id;

  if (query.isLoading) {
    return <PageHeader title="Usuario" description="Cargando…" />;
  }
  if (!usuario) {
    return (
      <>
        <PageHeader title="Usuario" description={t.usuarioDetalle.noEncontradoDesc} />
        <ErrorPanel title={t.usuarioDetalle.noEncontrado}>
          <ButtonLink variant="link" href={catalogoLista("usuarios")}>
            Volver al listado de usuarios
          </ButtonLink>
        </ErrorPanel>
      </>
    );
  }

  const rol = rolDe(usuario.rol_id);

  const columnasHistorial: Array<TableColumn<EventoAuditoria>> = [
    {
      key: "timestamp",
      header: "Fecha",
      render: (e) => formatearFecha(e.timestamp),
    },
    { key: "comando", header: "Comando", code: true, render: (e) => e.comando ?? "—" },
    {
      key: "entidad",
      header: "Entidad",
      code: true,
      render: (e) => `${e.entidad}${e.entidad_id ? ` (${e.entidad_id.slice(0, 8)})` : ""}`,
    },
    {
      key: "exito",
      header: "Resultado",
      render: (e) =>
        e.exito ? <Badge tone="success">OK</Badge> : <Badge tone="danger">Error</Badge>,
    },
  ];

  return (
    <>
      <PageHeader
        title={usuario.nombre_usuario}
        description={usuario.nombre_completo}
        actions={
          esAdmin ? (
            <>
              <ButtonLink variant="secondary" href={`${PATH.usuarios}/${usuario.id}/password`}>
                Cambiar contraseña
              </ButtonLink>
              <ButtonLink variant="secondary" href={`${PATH.usuarios}/${usuario.id}/editar`}>
                Editar
              </ButtonLink>
              {usuario.activo ? (
                <ButtonLink variant="danger" href={`${PATH.usuarios}/${usuario.id}/eliminar`}>
                  Desactivar
                </ButtonLink>
              ) : (
                <ButtonLink variant="primary" href={`${PATH.usuarios}/${usuario.id}/eliminar`}>
                  Reactivar
                </ButtonLink>
              )}
            </>
          ) : undefined
        }
      />

      <Card title={t.usuarioDetalle.datosGenerales}>
        <Card.Body>
          <DetailList
            items={[
              { label: "Usuario", value: usuario.nombre_usuario },
              { label: t.usuarioDetalle.nombreCompleto, value: usuario.nombre_completo },
              { label: "Email", value: usuario.email ?? "—" },
              {
                label: "Rol",
                value: rol ? (ROL_LABEL[rol.codigo] ?? rol.codigo) : "—",
              },
              {
                label: t.usuarioDetalle.ultimoAcceso,
                value: usuario.ultimo_acceso_at ? formatearFecha(usuario.ultimo_acceso_at) : "—",
              },
            ]}
          />
          <div className="mt-2">
            {usuario.activo ? (
              <Badge tone="success">Activo</Badge>
            ) : (
              <Badge tone="danger">Inactivo</Badge>
            )}
            {esMiCuenta ? (
              <Badge tone="info" className="ml-2">
                Tu cuenta
              </Badge>
            ) : null}
          </div>
        </Card.Body>
      </Card>

      <Card title={t.usuarioDetalle.actividadReciente} className="mt-6">
        {historialQuery.error ? (
          <Card.Body>
            <ErrorPanel title={t.usuarioDetalle.noSePudoActividad}>
              {mensajeError(historialQuery.error)}
            </ErrorPanel>
          </Card.Body>
        ) : (
          <Table
            columns={columnasHistorial}
            rows={
              historialQuery.data && esPaginado(historialQuery.data) ? historialQuery.data.data : []
            }
            rowKey={(e) => String(e.id)}
            loading={historialQuery.isLoading}
            emptyTitle={t.usuarioDetalle.sinActividad}
            emptyDescription={t.usuarioDetalle.sinActividadDesc}
          />
        )}
      </Card>
    </>
  );
}
