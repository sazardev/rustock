import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { useNavigate, useParams } from "react-router";
import { useMutation, useQuery } from "@tanstack/react-query";
import { z } from "zod";
import { crearAlmacen, editarAlmacen, obtenerAlmacen } from "../shared/backend";
import { catalogoDetalle, catalogoLista } from "../app/route-paths";
import { mensajeError } from "../shared/format";
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
  const [error, setError] = useState<string | null>(null);

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
    onSuccess: (almacen) => navigate(catalogoDetalle("almacenes", almacen.id)),
    onError: (err) => setError(mensajeError(err)),
  });

  if (esEdicion && almacenQuery.isLoading) {
    return <PageHeader title="Editar almacén" description="Cargando…" />;
  }

  return (
    <>
      <PageHeader
        title={esEdicion ? `Editar almacén — ${almacenQuery.data?.codigo ?? ""}` : "Nuevo almacén"}
        description="Un almacén es la raíz del árbol físico: toda la operación pertenece a exactamente un almacén."
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
              esEdicion ? catalogoDetalle("almacenes", id as string) : catalogoLista("almacenes")
            }
          >
            Cancelar
          </ButtonLink>
        </FormActions>
      </form>
    </>
  );
}
