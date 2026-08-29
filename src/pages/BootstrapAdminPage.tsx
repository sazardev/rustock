import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { useNavigate } from "react-router";
import { z } from "zod";
import { PATH } from "../app/route-paths";
import { Seo } from "../shared/seo";
import * as backend from "../shared/backend";
import { useSession } from "../shared/session";
import { useT } from "../shared/i18n";
import { AuthShell, Button, ErrorPanel, Field, Input, Link, PasswordInput } from "../shared/ui";

/** El esquema recibe el diccionario para que los errores salgan traducidos. */
function esquemaDe(t: ReturnType<typeof useT>) {
  return z
    .object({
      nombre_usuario: z.string().trim().min(1, t.auth.errores.usuarioObligatorio),
      nombre_completo: z.string().trim().min(1, t.auth.errores.nombreObligatorio),
      password: z.string().min(8, t.auth.errores.minimoOcho),
      confirmar_password: z.string().min(1, t.auth.errores.confirmaContrasena),
    })
    .refine((v) => v.password === v.confirmar_password, {
      message: t.auth.errores.noCoinciden,
      path: ["confirmar_password"],
    });
}

type FormValues = z.infer<ReturnType<typeof esquemaDe>>;

/**
 * Bootstrap del primer ADMIN (SPEC §4.1). `bootstrap_admin` es idempotente:
 * si ya existe un administrador, no hace nada — por eso esta página siempre
 * puede mostrarse sin necesidad de detectar de antemano si es "primera vez"
 * (el propio comando lo decide, y nunca revela si un admin ya existe).
 */
export function BootstrapAdminPage() {
  const t = useT();
  const navigate = useNavigate();
  const iniciarSesion = useSession((s) => s.iniciarSesion);
  const [error, setError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(esquemaDe(t)) });

  async function onSubmit(valores: FormValues) {
    setError(null);
    try {
      await backend.bootstrapAdmin(
        valores.nombre_usuario,
        valores.nombre_completo,
        valores.password,
      );
      await iniciarSesion(valores.nombre_usuario, valores.password);
      navigate(PATH.dashboard, { replace: true });
    } catch (err) {
      setError(String(err));
    }
  }

  return (
    <>
      <Seo robots="noindex, nofollow" title={t.seo.adminTitulo} description={t.seo.adminDesc} />
      <AuthShell
        marcaHref={PATH.landing}
        titulo={t.auth.crearAdmin}
        descripcion={t.auth.crearAdminDesc}
        pie={<Link href={PATH.login}>{t.auth.volverAIniciar}</Link>}
      >
        <form onSubmit={handleSubmit(onSubmit)} className="form-stack" noValidate>
          <Field
            label={t.auth.usuario}
            htmlFor="nombre_usuario"
            required
            error={errors.nombre_usuario?.message}
          >
            <Input
              id="nombre_usuario"
              autoComplete="username"
              autoFocus
              {...register("nombre_usuario")}
            />
          </Field>

          <Field
            label={t.auth.nombreCompleto}
            htmlFor="nombre_completo"
            required
            error={errors.nombre_completo?.message}
          >
            <Input id="nombre_completo" autoComplete="name" {...register("nombre_completo")} />
          </Field>

          <Field
            label={t.auth.contrasena}
            htmlFor="password"
            required
            help={t.auth.minimoOchoCaracteres}
            error={errors.password?.message}
          >
            <PasswordInput id="password" autoComplete="new-password" {...register("password")} />
          </Field>

          <Field
            label={t.auth.confirmarContrasena}
            htmlFor="confirmar_password"
            required
            error={errors.confirmar_password?.message}
          >
            <PasswordInput
              id="confirmar_password"
              autoComplete="new-password"
              {...register("confirmar_password")}
            />
          </Field>

          {error ? <ErrorPanel title={t.auth.noSePudoCrearAdmin}>{error}</ErrorPanel> : null}

          <Button
            type="submit"
            variant="primary"
            size="lg"
            disabled={isSubmitting}
            className="w-full"
          >
            {isSubmitting ? t.auth.creando : t.auth.crearAdminAccion}
          </Button>
        </form>
      </AuthShell>
    </>
  );
}
