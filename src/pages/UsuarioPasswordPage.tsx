import { useMemo, useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { useNavigate, useParams } from "react-router";
import { z } from "zod";
import { cambiarPasswordAdmin, obtenerUsuario } from "../shared/backend";
import { mensajeError } from "../shared/format";
import { catalogoDetalle } from "../app/route-paths";
import { useT, type Diccionario } from "../shared/i18n";
import {
  Button,
  ButtonLink,
  Card,
  ErrorPanel,
  Field,
  FormActions,
  Input,
  PageHeader,
  useToast,
} from "../shared/ui";

/** El esquema sigue al idioma: sus mensajes se pintan tal cual en el campo. */
function esquemaDe(t: Diccionario) {
  return z
    .object({
      password_nueva: z.string().min(8, t.perfil.minimoOcho),
      confirmacion: z.string().min(1, t.perfil.confirmaNueva),
    })
    .refine((v) => v.password_nueva === v.confirmacion, {
      message: t.perfil.noCoinciden,
      path: ["confirmacion"],
    });
}

type FormValues = z.infer<ReturnType<typeof esquemaDe>>;

/**
 * Reset de contraseña por el ADMIN (SPEC §4.4: solo ADMIN gestiona usuarios).
 * El usuario puede cambiar su propia contraseña desde Mi perfil.
 */
export function UsuarioPasswordPage() {
  const t = useT();
  const esquema = useMemo(() => esquemaDe(t), [t]);
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [error, setError] = useState<string | null>(null);

  const query = useQuery({
    queryKey: ["usuario", id],
    queryFn: () => obtenerUsuario(id as string),
    enabled: Boolean(id),
  });
  const usuario = query.data ?? null;

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(esquema),
    defaultValues: { password_nueva: "", confirmacion: "" },
  });

  const mutacion = useMutation({
    mutationFn: (v: FormValues) => cambiarPasswordAdmin(id as string, v.password_nueva),
    onSuccess: () => {
      toast(t.passwordUsuario.actualizada, "success");
      navigate(catalogoDetalle("usuarios", id as string));
    },
    onError: (err) => setError(mensajeError(err)),
  });

  if (query.isLoading) {
    return <PageHeader title={t.passwordUsuario.titulo} description={t.comun.cargando} />;
  }
  if (!usuario) {
    return (
      <>
        <PageHeader
          title={t.passwordUsuario.titulo}
          description={t.passwordUsuario.noEncontradoDesc}
        />
        <ErrorPanel title={t.passwordUsuario.noEncontrado}>{t.comun.usuarioSinPermiso}</ErrorPanel>
      </>
    );
  }

  return (
    <>
      <PageHeader
        title={`Cambiar contraseña — ${usuario.nombre_usuario}`}
        description={t.passwordUsuario.descripcion}
      />

      <form onSubmit={handleSubmit((v) => mutacion.mutate(v))} noValidate className="max-w-xl">
        <Card title={t.passwordUsuario.nueva}>
          <Card.Body>
            {error ? (
              <ErrorPanel title={t.passwordUsuario.noSePudoCambiar} className="mb-4">
                {error}
              </ErrorPanel>
            ) : null}
            <Field
              label={t.passwordUsuario.nueva}
              htmlFor="password_nueva"
              required
              error={errors.password_nueva?.message}
            >
              <Input id="password_nueva" type="password" {...register("password_nueva")} />
            </Field>
            <Field
              label={t.passwordUsuario.confirmar}
              htmlFor="confirmacion"
              required
              error={errors.confirmacion?.message}
            >
              <Input id="confirmacion" type="password" {...register("confirmacion")} />
            </Field>
          </Card.Body>
        </Card>

        <FormActions>
          <Button type="submit" variant="primary" disabled={isSubmitting || mutacion.isPending}>
            {mutacion.isPending ? "Guardando…" : t.passwordUsuario.guardar}
          </Button>
          <ButtonLink variant="secondary" href={catalogoDetalle("usuarios", usuario.id)}>
            {t.comun.cancelar}
          </ButtonLink>
        </FormActions>
      </form>
    </>
  );
}
