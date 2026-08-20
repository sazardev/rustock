import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { useNavigate } from "react-router";
import { z } from "zod";
import { PATH } from "../app/route-paths";
import { Seo } from "../shared/seo";
import * as backend from "../shared/backend";
import { useSession } from "../shared/session";
import { Brand, Button, Card, ErrorPanel, Field, Input, Link, Text } from "../shared/ui";

const esquema = z
  .object({
    nombre_usuario: z.string().trim().min(1, "El usuario es obligatorio"),
    nombre_completo: z.string().trim().min(1, "El nombre completo es obligatorio"),
    password: z.string().min(8, "Mínimo 8 caracteres"),
    confirmar_password: z.string().min(1, "Confirma la contraseña"),
  })
  .refine((v) => v.password === v.confirmar_password, {
    message: "Las contraseñas no coinciden",
    path: ["confirmar_password"],
  });

type FormValues = z.infer<typeof esquema>;

/**
 * Bootstrap del primer ADMIN (SPEC §4.1). `bootstrap_admin` es idempotente:
 * si ya existe un administrador, no hace nada — por eso esta página siempre
 * puede mostrarse sin necesidad de detectar de antemano si es "primera vez"
 * (el propio comando lo decide, y nunca revela si un admin ya existe).
 */
export function BootstrapAdminPage() {
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
      <Seo
        robots="noindex, nofollow"
        title="Configurar administrador — Rustock"
        description="Primer arranque de Rustock: crea el administrador y toma el control de tu almacén."
      />
      <div className="auth-shell">
        <div className="auth-shell__panel">
          <div className="auth-shell__brand">
            <Brand name="Rustock" href={PATH.login} />
          </div>
          <Card title="Configurar el administrador">
            <Card.Body>
              <Text as="p" size="sm" color="muted" className="mb-4">
                Crea el usuario administrador inicial de esta instalación. Si ya existe uno, este
                formulario no hace nada e inicia sesión con las credenciales indicadas.
              </Text>
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
                    {...register("nombre_usuario")}
                  />
                </Field>
                <Field
                  label="Nombre completo"
                  htmlFor="nombre_completo"
                  required
                  error={errors.nombre_completo?.message}
                >
                  <Input id="nombre_completo" {...register("nombre_completo")} />
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
                    autoComplete="new-password"
                    {...register("password")}
                  />
                </Field>
                <Field
                  label="Confirmar contraseña"
                  htmlFor="confirmar_password"
                  required
                  error={errors.confirmar_password?.message}
                >
                  <Input
                    id="confirmar_password"
                    type="password"
                    autoComplete="new-password"
                    {...register("confirmar_password")}
                  />
                </Field>

                {error ? (
                  <ErrorPanel title="No se pudo crear el administrador" className="mt-4">
                    {error}
                  </ErrorPanel>
                ) : null}

                <div className="mt-6">
                  <Button
                    type="submit"
                    variant="primary"
                    disabled={isSubmitting}
                    className="w-full"
                  >
                    {isSubmitting ? "Creando…" : "Crear administrador e ingresar"}
                  </Button>
                </div>
              </form>
            </Card.Body>
          </Card>

          <div className="mt-4 text-center">
            <Text as="p" size="sm" color="muted">
              <Link href={PATH.login}>Volver a iniciar sesión</Link>
            </Text>
          </div>
        </div>
      </div>
    </>
  );
}
