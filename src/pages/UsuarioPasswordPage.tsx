import { useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { useNavigate, useParams } from "react-router";
import { z } from "zod";
import { cambiarPasswordAdmin, obtenerUsuario } from "../shared/backend";
import { mensajeError } from "../shared/format";
import { catalogoDetalle } from "../app/route-paths";
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

const esquema = z
  .object({
    password_nueva: z.string().min(8, "La contraseña debe tener al menos 8 caracteres"),
    confirmacion: z.string().min(1, "Confirma la nueva contraseña"),
  })
  .refine((v) => v.password_nueva === v.confirmacion, {
    message: "Las contraseñas no coinciden",
    path: ["confirmacion"],
  });

type FormValues = z.infer<typeof esquema>;

/**
 * Reset de contraseña por el ADMIN (SPEC §4.4: solo ADMIN gestiona usuarios).
 * El usuario puede cambiar su propia contraseña desde Mi perfil.
 */
export function UsuarioPasswordPage() {
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
      toast("Contraseña actualizada", "success");
      navigate(catalogoDetalle("usuarios", id as string));
    },
    onError: (err) => setError(mensajeError(err)),
  });

  if (query.isLoading) {
    return <PageHeader title="Cambiar contraseña" description="Cargando…" />;
  }
  if (!usuario) {
    return (
      <>
        <PageHeader title="Cambiar contraseña" description="Usuario no encontrado." />
        <ErrorPanel title="Usuario no encontrado">
          El usuario ya no existe o no tienes permiso para verlo.
        </ErrorPanel>
      </>
    );
  }

  return (
    <>
      <PageHeader
        title={`Cambiar contraseña — ${usuario.nombre_usuario}`}
        description="Asigna una nueva contraseña. El usuario la podrá cambiar después desde su perfil."
      />

      <form onSubmit={handleSubmit((v) => mutacion.mutate(v))} noValidate className="max-w-xl">
        <Card title="Nueva contraseña">
          <Card.Body>
            {error ? (
              <ErrorPanel title="No se pudo cambiar la contraseña" className="mb-4">
                {error}
              </ErrorPanel>
            ) : null}
            <Field
              label="Contraseña nueva"
              htmlFor="password_nueva"
              required
              error={errors.password_nueva?.message}
            >
              <Input id="password_nueva" type="password" {...register("password_nueva")} />
            </Field>
            <Field
              label="Confirmar contraseña nueva"
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
            {mutacion.isPending ? "Guardando…" : "Guardar contraseña"}
          </Button>
          <ButtonLink variant="secondary" href={catalogoDetalle("usuarios", usuario.id)}>
            Cancelar
          </ButtonLink>
        </FormActions>
      </form>
    </>
  );
}
