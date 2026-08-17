import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { useNavigate, useParams } from "react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { crearRack, editarRack, listarZonas, obtenerRack } from "../shared/backend";
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
} from "../shared/ui";

const esquema = z.object({
  codigo: z.string().trim().min(1, "El código es obligatorio"),
  nombre: z.string().optional(),
  tipo: z.string().optional(),
  zona_id: z.string().trim().min(1, "Selecciona una zona"),
});

type FormValues = z.infer<typeof esquema>;

const INVALIDAR_ZONAS = ["zonas", "selector"] as const;

export function RackFormPage() {
  const { id } = useParams<{ id?: string }>();
  const esEdicion = Boolean(id);
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [error, setError] = useState<string | null>(null);
  const { volver, campo } = usePeticionCreacion();
  const retornaAFormulario = !esEdicion && Boolean(volver && campo);

  const rackQuery = useQuery({
    queryKey: ["rack", id],
    queryFn: () => obtenerRack(id as string),
    enabled: esEdicion,
  });

  const zonasQuery = useQuery({
    queryKey: ["zonas", "selector"],
    queryFn: () => listarZonas({ page_size: 200, sort: "codigo" }),
  });
  const zonas = zonasQuery.data && esPaginado(zonasQuery.data) ? zonasQuery.data.data : [];

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    getValues,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(esquema),
    defaultValues: { codigo: "", nombre: "", tipo: "", zona_id: "" },
  });

  useEffect(() => {
    const r = rackQuery.data;
    if (r) {
      reset({
        codigo: r.codigo,
        nombre: r.nombre ?? "",
        tipo: r.tipo ?? "",
        zona_id: r.zona_id,
      });
    }
  }, [rackQuery.data, reset]);

  // Conserva el borrador al salir a crear una zona (creación rápida) y lo
  // restaura al volver (crear o cancelar). En edición no aplica.
  const { descartar } = usePreservarFormulario(
    "/racks/nuevo",
    () => getValues(),
    (valores) => reset(valores as FormValues),
    !esEdicion,
  );

  useSeleccionCreada(
    "zona_id",
    (nuevoId) => setValue("zona_id", nuevoId),
    INVALIDAR_ZONAS,
    !esEdicion,
  );

  const guardarMut = useMutation({
    mutationFn: (v: FormValues) => {
      if (esEdicion) {
        return editarRack(id as string, { nombre: v.nombre || null, tipo: v.tipo || null });
      }
      return crearRack({
        codigo: v.codigo,
        nombre: v.nombre || null,
        tipo: v.tipo || null,
        zona_id: v.zona_id,
      });
    },
    onSuccess: (rack) => {
      if (!esEdicion) descartar();
      invalidarRecurso(queryClient, "racks", "rack");
      if (volver && campo && !esEdicion) {
        navigate(urlConSeleccion(volver, campo, rack.id));
      } else {
        navigate(catalogoDetalle("racks", rack.id));
      }
    },
    onError: (err) => setError(mensajeError(err)),
  });

  if (esEdicion && rackQuery.isLoading) {
    return <PageHeader title="Editar rack" description="Cargando…" />;
  }

  return (
    <>
      <PageHeader
        title={esEdicion ? `Editar rack — ${rackQuery.data?.codigo ?? ""}` : "Nuevo rack"}
        description={
          retornaAFormulario
            ? "Crea el rack y vuelve al formulario anterior con él seleccionado."
            : "Un rack es una estructura de almacenamiento dentro de una zona (estantería, pallet, nevera…)."
        }
      />

      <form onSubmit={handleSubmit((v) => guardarMut.mutate(v))} noValidate>
        <Card title="Datos generales">
          <Card.Body>
            {error ? (
              <ErrorPanel title="No se pudo guardar el rack" className="mb-4">
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
                    : "Único dentro del almacén (ej. RACK-A1)."
                }
              >
                <Input id="codigo" code disabled={esEdicion} {...register("codigo")} />
              </Field>
              <Field label="Nombre" htmlFor="nombre">
                <Input id="nombre" {...register("nombre")} />
              </Field>
              <Field label="Tipo" htmlFor="tipo">
                <Input id="tipo" placeholder="Estantería, pallet, nevera…" {...register("tipo")} />
              </Field>
              <Field label="Zona" htmlFor="zona_id" required error={errors.zona_id?.message}>
                <div className="flex items-center gap-2">
                  <div className="flex-1">
                    <Select
                      id="zona_id"
                      placeholder="Selecciona"
                      disabled={esEdicion}
                      {...register("zona_id")}
                    >
                      {zonas.map((z) => (
                        <option key={z.id} value={z.id}>
                          {z.codigo} — {z.nombre}
                        </option>
                      ))}
                    </Select>
                  </div>
                  {!esEdicion ? (
                    <CrearRapido campo="zona_id" rutaNueva={catalogoNuevo("zonas")}>
                      Nueva zona
                    </CrearRapido>
                  ) : null}
                </div>
              </Field>
            </FormGrid>
          </Card.Body>
        </Card>

        <FormActions>
          <Button type="submit" variant="primary" disabled={isSubmitting || guardarMut.isPending}>
            {guardarMut.isPending ? "Guardando…" : esEdicion ? "Guardar cambios" : "Crear rack"}
          </Button>
          <ButtonLink
            variant="secondary"
            href={
              retornaAFormulario
                ? urlConRegreso(volver as string)
                : esEdicion
                  ? catalogoDetalle("racks", id as string)
                  : catalogoLista("racks")
            }
          >
            Cancelar
          </ButtonLink>
        </FormActions>
      </form>
    </>
  );
}
