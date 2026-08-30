import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate, useParams } from "react-router";
import { desactivarUsuario, obtenerUsuario, reactivarUsuario } from "../shared/backend";
import { useSession } from "../shared/session";
import { mensajeError } from "../shared/format";
import { catalogoDetalle, catalogoLista } from "../app/route-paths";
import { Button, ButtonLink, Card, ErrorPanel, PageHeader, useToast } from "../shared/ui";
import { useT } from "../shared/i18n";

/**
 * Página de confirmación de desactivación/reactivación de un usuario
 * (DESIGN §7.5, SPEC §14.5: borrado lógico — nunca se elimina la cuenta).
 */
export function UsuarioEliminarPage() {
  const t = useT();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [error, setError] = useState<string | null>(null);
  const usuarioActual = useSession((s) => s.usuario);

  const query = useQuery({
    queryKey: ["usuario", id],
    queryFn: () => obtenerUsuario(id as string),
    enabled: Boolean(id),
  });
  const usuario = query.data ?? null;
  const esMiCuenta = usuarioActual?.id === id;

  const mutacion = useMutation({
    mutationFn: async () => {
      if (usuario?.activo) {
        await desactivarUsuario(id as string);
      } else {
        await reactivarUsuario(id as string);
      }
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["usuarios"] });
      toast(
        usuario?.activo ? t.usuariosPagina.desactivado : t.usuariosPagina.reactivado,
        "success",
      );
      navigate(catalogoLista("usuarios"));
    },
    onError: (err) => setError(mensajeError(err)),
  });

  if (query.isLoading) {
    return <PageHeader title={t.campos.usuario} description={t.comun.cargando} />;
  }
  if (!usuario) {
    return (
      <>
        <PageHeader title={t.campos.usuario} description={t.usuariosPagina.noEncontradoDesc} />
        <ErrorPanel title={t.usuariosPagina.noEncontrado}>{t.comun.usuarioSinPermiso}</ErrorPanel>
      </>
    );
  }

  const desactivar = usuario.activo;

  return (
    <>
      <PageHeader
        title={
          desactivar
            ? `Desactivar usuario — ${usuario.nombre_usuario}`
            : `Reactivar usuario — ${usuario.nombre_usuario}`
        }
        description={
          desactivar ? t.usuariosPagina.avisoDesactivar : t.usuariosPagina.avisoReactivar
        }
      />

      <Card title={t.usuariosPagina.datosCuenta}>
        <Card.Body>
          <p className="text-sm text-gray-700">
            <strong className="font-mono text-sm">{usuario.nombre_usuario}</strong> —{" "}
            {usuario.nombre_completo}
            {usuario.email ? ` — ${usuario.email}` : ""}
          </p>
          <ul className="mt-3 list-disc pl-5 text-sm text-gray-600">
            {desactivar ? (
              <>
                <li>La cuenta no podrá autenticarse hasta que se reactive.</li>
                <li>Los movimientos y registros que ya hizo no se modifican.</li>
                {esMiCuenta ? <li>Es tu propia cuenta: no se puede desactivar.</li> : null}
              </>
            ) : (
              <li>La cuenta recupera el acceso inmediatamente.</li>
            )}
          </ul>
          {error ? (
            <ErrorPanel title={t.usuariosPagina.noSePudoOperacion} className="mt-4">
              {error}
            </ErrorPanel>
          ) : null}
        </Card.Body>
      </Card>

      <div className="mt-6 flex items-center gap-3">
        {esMiCuenta && desactivar ? (
          <Button type="button" variant="danger" disabled>
            {t.comun.noPuedesDesactivarte}
          </Button>
        ) : (
          <Button
            type="button"
            variant={desactivar ? "danger" : "primary"}
            disabled={mutacion.isPending}
            onClick={() => mutacion.mutate()}
          >
            {mutacion.isPending
              ? "Procesando…"
              : desactivar
                ? t.usuariosPagina.desactivar
                : t.usuariosPagina.reactivar}
          </Button>
        )}
        <ButtonLink variant="secondary" href={catalogoDetalle("usuarios", usuario.id)}>
          {t.comun.cancelar}
        </ButtonLink>
      </div>
    </>
  );
}
