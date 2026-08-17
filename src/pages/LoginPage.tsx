import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { Link as RouterLink, useNavigate } from "react-router";
import { z } from "zod";
import { PATH } from "../app/route-paths";
import { useSession } from "../shared/session";
import { Button, Card, ErrorPanel, Field, Input, Link, LogoMark, Text } from "../shared/ui";

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
    <div className="auth-shell">
      <div className="auth-shell__panel">
        <div className="auth-shell__brand">
          <RouterLink to={PATH.login} className="auth-shell__brand-link">
            <LogoMark size={72} />
            <span className="auth-shell__brand-name">Rustock</span>
          </RouterLink>
        </div>
        <Card title="Iniciar sesión">
          <Card.Body>
            <form onSubmit={handleSubmit(onSubmit)} noValidate>
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
              <Field
                label="Contraseña"
                htmlFor="password"
                required
                error={errors.password?.message}
              >
                <Input
                  id="password"
                  type="password"
                  autoComplete="current-password"
                  {...register("password")}
                />
              </Field>

              {error ? (
                <ErrorPanel title="No se pudo iniciar sesión" className="mt-4">
                  {error}
                </ErrorPanel>
              ) : null}

              <div className="mt-6">
                <Button type="submit" variant="primary" disabled={isSubmitting} className="w-full">
                  {isSubmitting ? "Ingresando…" : "Ingresar"}
                </Button>
              </div>
            </form>
          </Card.Body>
        </Card>

        <div className="mt-4 text-center">
          <Text as="p" size="sm" color="muted">
            ¿Primera vez usando Rustock?{" "}
            <Link href={PATH.configurarAdministrador}>Configurar el administrador</Link>
          </Text>
        </div>
      </div>
    </div>
  );
}
