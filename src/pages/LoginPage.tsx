import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { useNavigate } from "react-router";
import { z } from "zod";
import { PATH } from "../app/route-paths";
import { Seo } from "../shared/seo";
import { useSession } from "../shared/session";
import { useT } from "../shared/i18n";
import { AuthShell, Button, ErrorPanel, Field, Input, Link, PasswordInput } from "../shared/ui";

/** El esquema recibe el diccionario para que los errores salgan traducidos. */
function esquemaDe(t: ReturnType<typeof useT>) {
  return z.object({
    nombre_usuario: z.string().trim().min(1, t.auth.errores.usuarioObligatorio),
    password: z.string().min(1, t.auth.errores.contrasenaObligatoria),
  });
}

type FormValues = z.infer<ReturnType<typeof esquemaDe>>;

export function LoginPage() {
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
      await iniciarSesion(valores.nombre_usuario, valores.password);
      navigate(PATH.dashboard, { replace: true });
    } catch (err) {
      setError(String(err));
    }
  }

  return (
    <>
      <Seo robots="noindex, nofollow" title={t.seo.loginTitulo} description={t.seo.loginDesc} />
      <AuthShell
        marcaHref={PATH.landing}
        titulo={t.auth.iniciarSesion}
        descripcion={t.auth.iniciarSesionDesc}
        pie={
          <>
            {t.auth.primeraVez}{" "}
            <Link href={PATH.configurarAdministrador}>{t.auth.configurarAdmin}</Link>
          </>
        }
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
            label={t.auth.contrasena}
            htmlFor="password"
            required
            error={errors.password?.message}
          >
            <PasswordInput
              id="password"
              autoComplete="current-password"
              {...register("password")}
            />
          </Field>

          {error ? <ErrorPanel title={t.auth.noSePudoIniciar}>{error}</ErrorPanel> : null}

          <Button
            type="submit"
            variant="primary"
            size="lg"
            disabled={isSubmitting}
            className="w-full"
          >
            {isSubmitting ? t.auth.ingresando : t.auth.ingresar}
          </Button>
        </form>
      </AuthShell>
    </>
  );
}
