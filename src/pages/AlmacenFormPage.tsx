import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { useNavigate, useParams } from "react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { crearAlmacen, editarAlmacen, obtenerAlmacen } from "../shared/backend";
import { invalidarRecurso } from "../shared/invalidar";
import { catalogoDetalle, catalogoLista } from "../app/route-paths";
import { mensajeError } from "../shared/format";
import { usePeticionCreacion, urlConRegreso, urlConSeleccion } from "../shared/creacion-rapida";
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
  Textarea,
} from "../shared/ui";

/** El esquema sigue al idioma: sus mensajes se pintan tal cual en el campo. */
function esquemaDe(t: Diccionario) {
  return z.object({
    codigo: z.string().trim().min(1, t.formularios.codigoObligatorio),
    nombre: z.string().trim().min(1, t.formularios.nombreObligatorio),
    descripcion: z.string().optional(),
    direccion: z.string().optional(),
  });
}

type FormValues = z.infer<ReturnType<typeof esquemaDe>>;

export function AlmacenFormPage() {
  const t = useT();
  const esquema = useMemo(() => esquemaDe(t), [t]);
  const { id } = useParams<{ id?: string }>();
  const esEdicion = Boolean(id);
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [error, setError] = useState<string | null>(null);
  const { volver, campo } = usePeticionCreacion();
  const retornaAFormulario = !esEdicion && Boolean(volver && campo);

  const almacenQuery = useQuery({
    queryKey: ["almacen", id],
    queryFn: () => obtenerAlmacen(id as string),
    enabled: esEdicion,
  });

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(esquema),
    defaultValues: { codigo: "", nombre: "", descripcion: "", direccion: "" },
  });

  useEffect(() => {
    if (almacenQuery.data) {
      reset({
        codigo: almacenQuery.data.codigo,
        nombre: almacenQuery.data.nombre,
        descripcion: almacenQuery.data.descripcion ?? "",
        direccion: almacenQuery.data.direccion ?? "",
      });
    }
  }, [almacenQuery.data, reset]);

  const guardarMut = useMutation({
    mutationFn: (valores: FormValues) =>
      esEdicion
        ? editarAlmacen(id as string, {
            nombre: valores.nombre,
            descripcion: valores.descripcion || null,
            direccion: valores.direccion || null,
          })
        : crearAlmacen({
            codigo: valores.codigo,
            nombre: valores.nombre,
            descripcion: valores.descripcion || null,
            direccion: valores.direccion || null,
          }),
    onSuccess: (almacen) => {
      invalidarRecurso(queryClient, "almacenes", "almacen");
      if (volver && campo && !esEdicion) {
        navigate(urlConSeleccion(volver, campo, almacen.id));
      } else {
        navigate(catalogoDetalle("almacenes", almacen.id));
      }
    },
    onError: (err) => setError(mensajeError(err)),
  });

  if (esEdicion && almacenQuery.isLoading) {
    return <PageHeader title={t.formularios.almacen.editar} description="Cargando…" />;
  }

  return (
    <>
      <PageHeader
        title={
          esEdicion
            ? `${t.formularios.almacen.editar} — ${almacenQuery.data?.codigo ?? ""}`
            : t.formularios.almacen.nuevo
        }
        description={
          retornaAFormulario
            ? t.formularios.almacen.volverConSeleccion
            : t.formularios.almacen.descripcion
        }
      />

      <form onSubmit={handleSubmit((v) => guardarMut.mutate(v))} noValidate>
        <Card title={t.formularios.datosGenerales}>
          <Card.Body>
            {error ? (
              <ErrorPanel title={t.formularios.almacen.noSePudoGuardar} className="mb-4">
                {error}
              </ErrorPanel>
            ) : null}
            <FormGrid columns={2}>
              <Field
                label="Código"
                htmlFor="codigo"
                required
                error={errors.codigo?.message}
                help={esEdicion ? t.formularios.codigoInmutable : undefined}
              >
                <Input id="codigo" code disabled={esEdicion} {...register("codigo")} />
              </Field>
              <Field
                label={t.comun.nombre}
                htmlFor="nombre"
                required
                error={errors.nombre?.message}
              >
                <Input id="nombre" {...register("nombre")} />
              </Field>
              <Field label="Dirección" htmlFor="direccion">
                <Input id="direccion" {...register("direccion")} />
              </Field>
            </FormGrid>
            <Field label={t.comun.descripcion} htmlFor="descripcion">
              <Textarea id="descripcion" rows={3} {...register("descripcion")} />
            </Field>
          </Card.Body>
        </Card>

        <FormActions>
          <Button type="submit" variant="primary" disabled={isSubmitting || guardarMut.isPending}>
            {guardarMut.isPending
              ? "Guardando…"
              : esEdicion
                ? t.formularios.guardarCambios
                : t.formularios.almacen.crear}
          </Button>
          <ButtonLink
            variant="secondary"
            href={
              retornaAFormulario
                ? urlConRegreso(volver as string)
                : esEdicion
                  ? catalogoDetalle("almacenes", id as string)
                  : catalogoLista("almacenes")
            }
          >
            {t.comun.cancelar}
          </ButtonLink>
        </FormActions>
      </form>
    </>
  );
}
