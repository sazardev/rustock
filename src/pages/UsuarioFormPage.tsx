import { useEffect, useMemo, useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { useNavigate, useParams } from "react-router";
import { z } from "zod";
import { crearUsuario, editarUsuario, listarRoles, obtenerUsuario } from "../shared/backend";
import { invalidarRecurso } from "../shared/invalidar";
import { catalogoDetalle, catalogoLista } from "../app/route-paths";
import { mensajeError } from "../shared/format";
import { useT, type Diccionario } from "../shared/i18n";
import {
  Button,
  ButtonLink,
  Card,
  ErrorPanel,
  Field,
  FormActions,
  FormGrid,
  Input,
  PageHeader,
  Select,
} from "../shared/ui";

/** El esquema sigue al idioma: sus mensajes se pintan tal cual en el campo. */
function esquemaDe(t: Diccionario) {
  return z.object({
    nombre_usuario: z
      .string()
      .trim()
      .min(1, t.formularios.usuario.usuarioObligatorio)
      .regex(/^[a-z0-9_.-]+$/i, t.formularios.usuario.usuarioFormato),
    nombre_completo: z.string().trim().min(1, t.formularios.usuario.nombreCompletoObligatorio),
    email: z.string().email(t.formularios.usuario.emailInvalido).optional().or(z.literal("")),
    password: z.string().min(8, "Mínimo 8 caracteres").optional().or(z.literal("")),
    rol_id: z.string().min(1, t.formularios.seleccionaRol),
  });
}

type FormValues = z.infer<ReturnType<typeof esquemaDe>>;

export function UsuarioFormPage() {
  const t = useT();
  const esquema = useMemo(() => esquemaDe(t), [t]);
  const { id } = useParams<{ id?: string }>();
  const esEdicion = Boolean(id);
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [error, setError] = useState<string | null>(null);

  const entidadQuery = useQuery({
    queryKey: ["usuario", id],
    queryFn: () => obtenerUsuario(id as string),
    enabled: esEdicion,
  });
  const rolesQuery = useQuery({
    queryKey: ["roles"],
    queryFn: listarRoles,
    staleTime: 5 * 60_000,
  });

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(esquema),
    defaultValues: {
      nombre_usuario: "",
      nombre_completo: "",
      email: "",
      password: "",
      rol_id: "",
    },
  });

  useEffect(() => {
    const u = entidadQuery.data;
    if (u) {
      reset({
        nombre_usuario: u.nombre_usuario,
        nombre_completo: u.nombre_completo,
        email: u.email ?? "",
        password: "",
        rol_id: u.rol_id,
      });
    }
  }, [entidadQuery.data, reset]);

  const guardarMut = useMutation({
    mutationFn: (v: FormValues) => {
      if (esEdicion) {
        return editarUsuario(id as string, {
          nombre_completo: v.nombre_completo,
          email: v.email || null,
          rol_id: v.rol_id,
        });
      }
      return crearUsuario({
        nombre_usuario: v.nombre_usuario,
        nombre_completo: v.nombre_completo,
        email: v.email || null,
        // onSubmit ya valida que exista al crear; el default es seguro.
        password: v.password ?? "",
        rol_id: v.rol_id,
      });
    },
    onSuccess: (r) => {
      invalidarRecurso(queryClient, "usuarios", "usuario");
      navigate(catalogoDetalle("usuarios", r.id));
    },
    onError: (err) => setError(mensajeError(err)),
  });

  if (esEdicion && entidadQuery.isLoading) {
    return <PageHeader title={t.formularios.usuario.editar} description="Cargando…" />;
  }

  function onSubmit(v: FormValues) {
    if (!esEdicion && !v.password) {
      setError(t.formularios.usuario.passwordObligatoria);
      return;
    }
    guardarMut.mutate(v);
  }

  return (
    <>
      <PageHeader
        title={
          esEdicion
            ? `${t.formularios.usuario.editar} — ${entidadQuery.data?.nombre_usuario ?? ""}`
            : t.formularios.usuario.nuevo
        }
        description={t.formularios.usuario.descripcion}
      />

      <form onSubmit={handleSubmit(onSubmit)} noValidate>
        <Card title={t.formularios.usuario.datos}>
          <Card.Body>
            {error ? (
              <ErrorPanel title={t.formularios.usuario.noSePudoGuardar} className="mb-4">
                {error}
              </ErrorPanel>
            ) : null}
            <FormGrid columns={2}>
              <Field
                label="Usuario"
                htmlFor="nombre_usuario"
                required
                error={errors.nombre_usuario?.message}
                help={esEdicion ? t.formularios.usuario.usuarioInmutable : undefined}
              >
                <Input
                  id="nombre_usuario"
                  code
                  disabled={esEdicion}
                  {...register("nombre_usuario")}
                />
              </Field>
              <Field
                label={t.formularios.usuario.nombreCompleto}
                htmlFor="nombre_completo"
                required
                error={errors.nombre_completo?.message}
              >
                <Input id="nombre_completo" {...register("nombre_completo")} />
              </Field>
              <Field label="Email" htmlFor="email" error={errors.email?.message}>
                <Input id="email" type="email" {...register("email")} />
              </Field>
              <Field
                label="Rol"
                htmlFor="rol_id"
                required
                error={errors.rol_id?.message}
                help={t.formularios.usuario.rolAyuda}
              >
                <Select
                  id="rol_id"
                  placeholder={t.formularios.seleccionaRol}
                  options={
                    rolesQuery.data?.map((r) => ({
                      value: r.id,
                      label: t.roles[r.codigo as keyof typeof t.roles] ?? r.codigo,
                    })) ?? []
                  }
                  {...register("rol_id")}
                />
              </Field>
              {!esEdicion ? (
                <Field
                  label="Contraseña"
                  htmlFor="password"
                  required
                  error={errors.password?.message}
                  help={t.formularios.usuario.passwordAyuda}
                >
                  <Input id="password" type="password" {...register("password")} />
                </Field>
              ) : null}
            </FormGrid>
          </Card.Body>
        </Card>

        <FormActions>
          <Button type="submit" variant="primary" disabled={isSubmitting || guardarMut.isPending}>
            {guardarMut.isPending
              ? "Guardando…"
              : esEdicion
                ? t.formularios.guardarCambios
                : t.formularios.usuario.crear}
          </Button>
          <ButtonLink
            variant="secondary"
            href={esEdicion ? catalogoDetalle("usuarios", id as string) : catalogoLista("usuarios")}
          >
            {t.comun.cancelar}
          </ButtonLink>
        </FormActions>
      </form>
    </>
  );
}
