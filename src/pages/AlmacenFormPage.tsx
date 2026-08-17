import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { useNavigate, useParams } from "react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { crearAlmacen, editarAlmacen, obtenerAlmacen } from "../shared/backend";
import { invalidarRecurso } from "../shared/invalidar";
import { catalogoDetalle, catalogoLista } from "../app/route-paths";
import { mensajeError } from "../shared/format";
import { usePeticionCreacion, urlConRegreso, urlConSeleccion } from "../shared/creacion-rapida";
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

const esquema = z.object({
  codigo: z.string().trim().min(1, "El código es obligatorio"),
  nombre: z.string().trim().min(1, "El nombre es obligatorio"),
  descripcion: z.string().optional(),
  direccion: z.string().optional(),
});

type FormValues = z.infer<typeof esquema>;

export function AlmacenFormPage() {
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
    return <PageHeader title="Editar almacén" description="Cargando…" />;
  }

  return (
    <>
      <PageHeader
        title={esEdicion ? `Editar almacén — ${almacenQuery.data?.codigo ?? ""}` : "Nuevo almacén"}
        description={
          retornaAFormulario
            ? "Crea el almacén y vuelve al formulario anterior con él seleccionado."
            : "Un almacén es la raíz del árbol físico: toda la operación pertenece a exactamente un almacén."
        }
      />

      <form onSubmit={handleSubmit((v) => guardarMut.mutate(v))} noValidate>
        <Card title="Datos generales">
          <Card.Body>
            {error ? (
              <ErrorPanel title="No se pudo guardar el almacén" className="mb-4">
                {error}
              </ErrorPanel>
            ) : null}
            <FormGrid columns={2}>
              <Field
                label="Código"
                htmlFor="codigo"
                required
                error={errors.codigo?.message}
                help={esEdicion ? "El código no se puede modificar." : undefined}
              >
                <Input id="codigo" code disabled={esEdicion} {...register("codigo")} />
              </Field>
              <Field label="Nombre" htmlFor="nombre" required error={errors.nombre?.message}>
                <Input id="nombre" {...register("nombre")} />
              </Field>
              <Field label="Dirección" htmlFor="direccion">
                <Input id="direccion" {...register("direccion")} />
              </Field>
            </FormGrid>
            <Field label="Descripción" htmlFor="descripcion">
              <Textarea id="descripcion" rows={3} {...register("descripcion")} />
            </Field>
          </Card.Body>
        </Card>

        <FormActions>
          <Button type="submit" variant="primary" disabled={isSubmitting || guardarMut.isPending}>
            {guardarMut.isPending ? "Guardando…" : esEdicion ? "Guardar cambios" : "Crear almacén"}
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
            Cancelar
          </ButtonLink>
        </FormActions>
      </form>
    </>
  );
}
