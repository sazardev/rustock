import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { useNavigate, useParams } from "react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { crearSeccion, editarSeccion, listarRacks, obtenerSeccion } from "../shared/backend";
import { esPaginado } from "../shared/types";
import { invalidarRecurso } from "../shared/invalidar";
import { catalogoDetalle, catalogoLista, catalogoNuevo } from "../app/route-paths";
import { mensajeError } from "../shared/format";
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
} from "../shared/ui";

const esquema = z.object({
  codigo: z.string().trim().min(1, "El código es obligatorio"),
  nombre: z.string().optional(),
  nivel: z.string().optional(),
  descripcion: z.string().optional(),
  rack_id: z.string().trim().min(1, "Selecciona un rack"),
});

type FormValues = z.infer<typeof esquema>;

const INVALIDAR_RACKS = ["racks", "selector"] as const;

export function SeccionFormPage() {
  const { id } = useParams<{ id?: string }>();
  const esEdicion = Boolean(id);
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [error, setError] = useState<string | null>(null);
  const { volver, campo } = usePeticionCreacion();
  const retornaAFormulario = !esEdicion && Boolean(volver && campo);

  const seccionQuery = useQuery({
    queryKey: ["seccion", id],
    queryFn: () => obtenerSeccion(id as string),
    enabled: esEdicion,
  });

  const racksQuery = useQuery({
    queryKey: ["racks", "selector"],
    queryFn: () => listarRacks({ page_size: 200, sort: "codigo" }),
  });
  const racks = racksQuery.data && esPaginado(racksQuery.data) ? racksQuery.data.data : [];

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    getValues,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(esquema),
    defaultValues: { codigo: "", nombre: "", nivel: "", descripcion: "", rack_id: "" },
  });

  useEffect(() => {
    const s = seccionQuery.data;
    if (s) {
      reset({
        codigo: s.codigo,
        nombre: s.nombre ?? "",
        nivel: s.nivel ?? "",
        descripcion: s.descripcion ?? "",
        rack_id: s.rack_id,
      });
    }
  }, [seccionQuery.data, reset]);

  // Conserva el borrador al salir a crear un rack (creación rápida) y lo
  // restaura al volver (crear o cancelar). En edición no aplica.
  const { descartar } = usePreservarFormulario(
    "/secciones/nuevo",
    () => getValues(),
    (valores) => reset(valores as FormValues),
    !esEdicion,
  );

  useSeleccionCreada(
    "rack_id",
    (nuevoId) => setValue("rack_id", nuevoId),
    INVALIDAR_RACKS,
    !esEdicion,
  );

  const guardarMut = useMutation({
    mutationFn: (v: FormValues) => {
      if (esEdicion) {
        return editarSeccion(id as string, {
          nombre: v.nombre || null,
          nivel: v.nivel || null,
          descripcion: v.descripcion || null,
        });
      }
      return crearSeccion({
        codigo: v.codigo,
        nombre: v.nombre || null,
        nivel: v.nivel || null,
        descripcion: v.descripcion || null,
        rack_id: v.rack_id,
      });
    },
    onSuccess: (seccion) => {
      if (!esEdicion) descartar();
      invalidarRecurso(queryClient, "secciones", "seccion");
      if (volver && campo && !esEdicion) {
        navigate(urlConSeleccion(volver, campo, seccion.id));
      } else {
        navigate(catalogoDetalle("secciones", seccion.id));
      }
    },
    onError: (err) => setError(mensajeError(err)),
  });

  if (esEdicion && seccionQuery.isLoading) {
    return <PageHeader title="Editar sección" description="Cargando…" />;
  }

  return (
    <>
      <PageHeader
        title={esEdicion ? `Editar sección — ${seccionQuery.data?.codigo ?? ""}` : "Nueva sección"}
        description={
          retornaAFormulario
            ? "Crea la sección y vuelve al formulario anterior con ella seleccionada."
            : "Una sección es una subdivisión de un rack (niveles, pasillos, bahías)."
        }
      />

      <form onSubmit={handleSubmit((v) => guardarMut.mutate(v))} noValidate>
        <Card title="Datos generales">
          <Card.Body>
            {error ? (
              <ErrorPanel title="No se pudo guardar la sección" className="mb-4">
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
                    : "Único dentro del almacén (ej. RACK-A1-N2)."
                }
              >
                <Input id="codigo" code disabled={esEdicion} {...register("codigo")} />
              </Field>
              <Field label="Nombre" htmlFor="nombre">
                <Input id="nombre" {...register("nombre")} />
              </Field>
              <Field label="Nivel" htmlFor="nivel">
                <Input id="nivel" placeholder="Nivel A, B, C…" {...register("nivel")} />
              </Field>
              <Field label="Rack" htmlFor="rack_id" required error={errors.rack_id?.message}>
                <div className="flex items-center gap-2">
                  <div className="flex-1">
                    <Select
                      id="rack_id"
                      placeholder="Selecciona"
                      disabled={esEdicion}
                      {...register("rack_id")}
                    >
                      {racks.map((r) => (
                        <option key={r.id} value={r.id}>
                          {r.codigo}
                          {r.nombre ? ` — ${r.nombre}` : ""}
                        </option>
                      ))}
                    </Select>
                  </div>
                  {!esEdicion ? (
                    <CrearRapido campo="rack_id" rutaNueva={catalogoNuevo("racks")}>
                      Nuevo rack
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
            {guardarMut.isPending ? "Guardando…" : esEdicion ? "Guardar cambios" : "Crear sección"}
          </Button>
          <ButtonLink
            variant="secondary"
            href={
              retornaAFormulario
                ? urlConRegreso(volver as string)
                : esEdicion
                  ? catalogoDetalle("secciones", id as string)
                  : catalogoLista("secciones")
            }
          >
            Cancelar
          </ButtonLink>
        </FormActions>
      </form>
    </>
  );
}
