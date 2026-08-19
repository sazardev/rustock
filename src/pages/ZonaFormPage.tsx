import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { useNavigate, useParams } from "react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { crearZona, editarZona, listarAlmacenes, moverZona, obtenerZona } from "../shared/backend";
import { esPaginado } from "../shared/types";
import { invalidarRecurso } from "../shared/invalidar";
import { catalogoDetalle, catalogoLista, catalogoNuevo } from "../app/route-paths";
import { mensajeError } from "../shared/format";
import { PosicionFormCard } from "../shared/posicion-form-card";
import {
  CrearRapido,
  usePeticionCreacion,
  usePreservarFormulario,
  useSeleccionCreada,
  urlConRegreso,
  urlConSeleccion,
} from "../shared/creacion-rapida";
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
  Textarea,
  useToast,
} from "../shared/ui";

const esquema = z.object({
  codigo: z.string().trim().min(1, "El código es obligatorio"),
  nombre: z.string().trim().min(1, "El nombre es obligatorio"),
  descripcion: z.string().optional(),
  almacen_id: z.string().trim().min(1, "Selecciona un almacén"),
});

type FormValues = z.infer<typeof esquema>;

const INVALIDAR_ALMACENES = ["almacenes", "selector"] as const;

export function ZonaFormPage() {
  const { id } = useParams<{ id?: string }>();
  const esEdicion = Boolean(id);
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();
  const { volver, campo } = usePeticionCreacion();
  const retornaAFormulario = !esEdicion && Boolean(volver && campo);

  const zonaQuery = useQuery({
    queryKey: ["zona", id],
    queryFn: () => obtenerZona(id as string),
    enabled: esEdicion,
  });

  const almacenesQuery = useQuery({
    queryKey: ["almacenes", "selector"],
    queryFn: () => listarAlmacenes({ page_size: 200, sort: "codigo" }),
  });
  const almacenes =
    almacenesQuery.data && esPaginado(almacenesQuery.data) ? almacenesQuery.data.data : [];

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    getValues,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(esquema),
    defaultValues: { codigo: "", nombre: "", descripcion: "", almacen_id: "" },
  });

  useEffect(() => {
    const z = zonaQuery.data;
    if (z) {
      reset({
        codigo: z.codigo,
        nombre: z.nombre,
        descripcion: z.descripcion ?? "",
        almacen_id: z.almacen_id,
      });
    }
  }, [zonaQuery.data, reset]);

  // Conserva el borrador al salir a crear un almacén (creación rápida) y lo
  // restaura al volver (crear o cancelar). En edición no aplica.
  const { descartar } = usePreservarFormulario(
    "/zonas/nuevo",
    () => getValues(),
    (valores) => reset(valores as FormValues),
    !esEdicion,
  );

  useSeleccionCreada(
    "almacen_id",
    (nuevoId) => setValue("almacen_id", nuevoId),
    INVALIDAR_ALMACENES,
    !esEdicion,
  );

  const guardarMut = useMutation({
    mutationFn: (v: FormValues) => {
      if (esEdicion) {
        return editarZona(id as string, { nombre: v.nombre, descripcion: v.descripcion || null });
      }
      return crearZona({
        codigo: v.codigo,
        nombre: v.nombre,
        descripcion: v.descripcion || null,
        almacen_id: v.almacen_id,
      });
    },
    onSuccess: (zona) => {
      if (!esEdicion) descartar();
      invalidarRecurso(queryClient, "zonas", "zona");
      if (volver && campo && !esEdicion) {
        navigate(urlConSeleccion(volver, campo, zona.id));
      } else {
        navigate(catalogoDetalle("zonas", zona.id));
      }
    },
    onError: (err) => setError(mensajeError(err)),
  });

  const moverMut = useMutation({
    mutationFn: (pos: {
      pos_x: number | null;
      pos_y: number | null;
      pos_z: number | null;
      altura: number | null;
    }) => moverZona(id as string, pos),
    onSuccess: () => {
      invalidarRecurso(queryClient, "zonas", "zona");
      toast("Posición guardada.", "success");
    },
    onError: (err) => toast(mensajeError(err), "error"),
  });

  if (esEdicion && zonaQuery.isLoading) {
    return <PageHeader title="Editar zona" description="Cargando…" />;
  }

  return (
    <>
      <PageHeader
        title={esEdicion ? `Editar zona — ${zonaQuery.data?.codigo ?? ""}` : "Nueva zona"}
        description={
          retornaAFormulario
            ? "Crea la zona y vuelve al formulario anterior con ella seleccionada."
            : "Una zona es una división lógica o física del almacén (ej. Frío, Picking, Recepción)."
        }
      />

      <form onSubmit={handleSubmit((v) => guardarMut.mutate(v))} noValidate>
        <Card title="Datos generales">
          <Card.Body>
            {error ? (
              <ErrorPanel title="No se pudo guardar la zona" className="mb-4">
                {error}
              </ErrorPanel>
            ) : null}
            <FormGrid columns={2}>
              <Field
                label="Código"
                htmlFor="codigo"
                required
                error={errors.codigo?.message}
                help={
                  esEdicion
                    ? "El código no se puede modificar."
                    : "Único dentro del almacén (ej. Z-01)."
                }
              >
                <Input id="codigo" code disabled={esEdicion} {...register("codigo")} />
              </Field>
              <Field label="Nombre" htmlFor="nombre" required error={errors.nombre?.message}>
                <Input id="nombre" {...register("nombre")} />
              </Field>
              <Field
                label="Almacén"
                htmlFor="almacen_id"
                required
                error={errors.almacen_id?.message}
              >
                <div className="flex items-center gap-2">
                  <div className="flex-1">
                    <Select
                      id="almacen_id"
                      placeholder="Selecciona"
                      disabled={esEdicion}
                      {...register("almacen_id")}
                    >
                      {almacenes.map((a) => (
                        <option key={a.id} value={a.id}>
                          {a.codigo} — {a.nombre}
                        </option>
                      ))}
                    </Select>
                  </div>
                  {!esEdicion ? (
                    <CrearRapido campo="almacen_id" rutaNueva={catalogoNuevo("almacenes")}>
                      Nuevo almacén
                    </CrearRapido>
                  ) : null}
                </div>
              </Field>
            </FormGrid>
            <Field label="Descripción" htmlFor="descripcion">
              <Textarea id="descripcion" rows={3} {...register("descripcion")} />
            </Field>
          </Card.Body>
        </Card>

        <FormActions>
          <Button type="submit" variant="primary" disabled={isSubmitting || guardarMut.isPending}>
            {guardarMut.isPending ? "Guardando…" : esEdicion ? "Guardar cambios" : "Crear zona"}
          </Button>
          <ButtonLink
            variant="secondary"
            href={
              retornaAFormulario
                ? urlConRegreso(volver as string)
                : esEdicion
                  ? catalogoDetalle("zonas", id as string)
                  : catalogoLista("zonas")
            }
          >
            Cancelar
          </ButtonLink>
        </FormActions>
      </form>

      {esEdicion && zonaQuery.data ? (
        <PosicionFormCard
          valores={{
            pos_x: zonaQuery.data.pos_x,
            pos_y: zonaQuery.data.pos_y,
            pos_z: zonaQuery.data.pos_z,
            altura: zonaQuery.data.altura,
          }}
          guardando={moverMut.isPending}
          onGuardar={(pos) => moverMut.mutate(pos)}
        />
      ) : null}
    </>
  );
}
