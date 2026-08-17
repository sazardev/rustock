import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate, useParams } from "react-router";
import { desactivarUsuario, obtenerUsuario, reactivarUsuario } from "../shared/backend";
import { useSession } from "../shared/session";
import { mensajeError } from "../shared/format";
import { catalogoDetalle, catalogoLista } from "../app/route-paths";
import { Button, ButtonLink, Card, ErrorPanel, PageHeader, useToast } from "../shared/ui";

/**
 * Página de confirmación de desactivación/reactivación de un usuario
 * (DESIGN §7.5, SPEC §14.5: borrado lógico — nunca se elimina la cuenta).
 */
export function UsuarioEliminarPage() {
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
      toast(usuario?.activo ? "Usuario desactivado" : "Usuario reactivado", "success");
      navigate(catalogoLista("usuarios"));
    },
    onError: (err) => setError(mensajeError(err)),
  });

  if (query.isLoading) {
    return <PageHeader title="Usuario" description="Cargando…" />;
  }
  if (!usuario) {
    return (
      <>
        <PageHeader title="Usuario" description="No se encontró la cuenta." />
        <ErrorPanel title="Usuario no encontrado">
          El usuario ya no existe o no tienes permiso para verlo.
        </ErrorPanel>
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
          desactivar
            ? "La cuenta dejará de poder iniciar sesión; su historial se conserva."
            : "La cuenta volverá a poder iniciar sesión."
        }
      />

      <Card title="Datos de la cuenta">
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
            <ErrorPanel title="No se pudo completar la operación" className="mt-4">
              {error}
            </ErrorPanel>
          ) : null}
        </Card.Body>
      </Card>

      <div className="mt-6 flex items-center gap-3">
        {esMiCuenta && desactivar ? (
          <Button type="button" variant="danger" disabled>
            No puedes desactivar tu propia cuenta
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
                ? "Desactivar usuario"
                : "Reactivar usuario"}
          </Button>
        )}
        <ButtonLink variant="secondary" href={catalogoDetalle("usuarios", usuario.id)}>
          Cancelar
        </ButtonLink>
      </div>
    </>
  );
}
