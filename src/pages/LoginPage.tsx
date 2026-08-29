import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { useNavigate } from "react-router";
import { z } from "zod";
import { PATH } from "../app/route-paths";
import { Seo } from "../shared/seo";
import { useSession } from "../shared/session";
import { AuthShell, Button, ErrorPanel, Field, Input, Link, PasswordInput } from "../shared/ui";

const esquema = z.object({
  nombre_usuario: z.string().trim().min(1, "El usuario es obligatorio"),
  password: z.string().min(1, "La contraseña es obligatoria"),
});

type FormValues = z.infer<typeof esquema>;

export function LoginPage() {
  const navigate = useNavigate();
  const iniciarSesion = useSession((s) => s.iniciarSesion);
  const [error, setError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(esquema) });

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
      <Seo
        robots="noindex, nofollow"
        title="Iniciar sesión — Rustock"
        description="Accede a tu almacén Rustock. WMS self-hosted: stock, lotes y trazabilidad en tu infraestructura."
      />
      <AuthShell
        marcaHref={PATH.landing}
        titulo="Iniciar sesión"
        descripcion="Accede con tu usuario de esta instalación de Rustock."
        pie={
          <>
            ¿Primera vez usando Rustock?{" "}
            <Link href={PATH.configurarAdministrador}>Configurar el administrador</Link>
          </>
        }
      >
        <form onSubmit={handleSubmit(onSubmit)} className="form-stack" noValidate>
          <Field
            label="Usuario"
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

          <Field label="Contraseña" htmlFor="password" required error={errors.password?.message}>
            <PasswordInput
              id="password"
              autoComplete="current-password"
              {...register("password")}
            />
          </Field>

          {error ? <ErrorPanel title="No se pudo iniciar sesión">{error}</ErrorPanel> : null}

          <Button
            type="submit"
            variant="primary"
            size="lg"
            disabled={isSubmitting}
            className="w-full"
          >
            {isSubmitting ? "Ingresando…" : "Ingresar"}
          </Button>
        </form>
      </AuthShell>
    </>
  );
}
