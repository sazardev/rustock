import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useMemo, useState } from "react";
import { Controller, useForm, useWatch } from "react-hook-form";
import { useNavigate, useParams, useSearchParams } from "react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import {
  crearUbicacion,
  editarUbicacion,
  listarRacks,
  listarSecciones,
  listarZonas,
  obtenerUbicacion,
} from "../shared/backend";
import { esPaginado, type TipoUbicacion } from "../shared/types";
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

const TIPOS_UBICACION: Array<{ valor: TipoUbicacion; etiqueta: string }> = [
  { valor: "STANDARD", etiqueta: "Standard" },
  { valor: "PICKING", etiqueta: "Picking" },
  { valor: "RESERVA", etiqueta: "Reserva" },
  { valor: "RECEPCION", etiqueta: "Recepción" },
  { valor: "CUARENTENA", etiqueta: "Cuarentena" },
  { valor: "DEVOLUCION", etiqueta: "Devolución" },
  { valor: "DANADO", etiqueta: "Dañado" },
  { valor: "EXPEDICION", etiqueta: "Expedición" },
];

const TIPOS_PADRE = [
  { valor: "zona", etiqueta: "Zona" },
  { valor: "rack", etiqueta: "Rack" },
  { valor: "seccion", etiqueta: "Sección" },
] as const;

const INVALIDAR_ZONAS = ["zonas", "selector"] as const;
const INVALIDAR_RACKS = ["racks", "selector"] as const;
const INVALIDAR_SECCIONES = ["secciones", "selector"] as const;

function crearEsquema(requierePadre: boolean) {
  return z
    .object({
      codigo: z.string().trim().min(1, "El código es obligatorio"),
      nombre: z.string().optional(),
      tipo: z.string().trim().min(1, "El tipo es obligatorio"),
      tipo_padre: z.string(),
      padre_id: z.string(),
      capacidad_maxima: z
        .string()
        .optional()
        .refine((v) => !v || Number(v) >= 0, "La capacidad no puede ser negativa"),
    })
    .superRefine((v, ctx) => {
      if (requierePadre && !v.padre_id) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["padre_id"],
          message: "Seleccione el contenedor padre",
        });
      }
    });
}

type FormValues = z.infer<ReturnType<typeof crearEsquema>>;

export function UbicacionFormPage() {
  const { id } = useParams<{ id?: string }>();
  const esEdicion = Boolean(id);
  const [searchParams] = useSearchParams();
  const duplicarDe = searchParams.get("duplicarDe");
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [error, setError] = useState<string | null>(null);
  const { volver, campo } = usePeticionCreacion();
  const retornaAFormulario = !esEdicion && Boolean(volver && campo);

  const ubicacionQuery = useQuery({
    queryKey: ["ubicacion", id],
    queryFn: () => obtenerUbicacion(id as string),
    enabled: esEdicion,
  });
  const origenQuery = useQuery({
    queryKey: ["ubicacion", duplicarDe],
    queryFn: () => obtenerUbicacion(duplicarDe as string),
    enabled: Boolean(duplicarDe && !esEdicion),
  });

  const zonasQuery = useQuery({
    queryKey: ["zonas", "selector"],
    queryFn: () => listarZonas({ page_size: 200, sort: "codigo" }),
    enabled: !esEdicion,
  });
  const racksQuery = useQuery({
    queryKey: ["racks", "selector"],
    queryFn: () => listarRacks({ page_size: 200, sort: "codigo" }),
    enabled: !esEdicion,
  });
  const seccionesQuery = useQuery({
    queryKey: ["secciones", "selector"],
    queryFn: () => listarSecciones({ page_size: 200, sort: "codigo" }),
    enabled: !esEdicion,
  });

  const esquema = useMemo(() => crearEsquema(!esEdicion), [esEdicion]);

  const {
    control,
    register,
    handleSubmit,
    reset,
    setValue,
    getValues,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(esquema),
    defaultValues: {
      codigo: "",
      nombre: "",
      tipo: "STANDARD",
      tipo_padre: "zona",
      padre_id: "",
      capacidad_maxima: "",
    },
  });

  const tipoPadreVigente = useWatch({ control, name: "tipo_padre" });

  // Conserva el borrador al salir a crear el contenedor (zona/rack/sección)
  // por creación rápida y lo restaura al volver (crear o cancelar).
  usePreservarFormulario(
    "/ubicaciones/nuevo",
    () => getValues(),
    (valores) => reset(valores as FormValues),
    !esEdicion,
  );

  // Creación rápida del contenedor: el contenedor creado queda seleccionado
  // y su tipo se fija en "Ubicado en" (zona, rack o sección).
  useSeleccionCreada(
    "zona_id",
    (nuevoId) => {
      setValue("tipo_padre", "zona");
      setValue("padre_id", nuevoId);
    },
    INVALIDAR_ZONAS,
    !esEdicion,
  );
  useSeleccionCreada(
    "rack_id",
    (nuevoId) => {
      setValue("tipo_padre", "rack");
      setValue("padre_id", nuevoId);
    },
    INVALIDAR_RACKS,
    !esEdicion,
  );
  useSeleccionCreada(
    "seccion_id",
    (nuevoId) => {
      setValue("tipo_padre", "seccion");
      setValue("padre_id", nuevoId);
    },
    INVALIDAR_SECCIONES,
    !esEdicion,
  );

  const opcionesPadre =
    tipoPadreVigente === "zona"
      ? (zonasQuery.data && esPaginado(zonasQuery.data) ? zonasQuery.data.data : []).map((r) => ({
          id: r.id,
          etiqueta: r.codigo,
        }))
      : tipoPadreVigente === "rack"
        ? (racksQuery.data && esPaginado(racksQuery.data) ? racksQuery.data.data : []).map((r) => ({
            id: r.id,
            etiqueta: r.codigo,
          }))
        : (seccionesQuery.data && esPaginado(seccionesQuery.data)
            ? seccionesQuery.data.data
            : []
          ).map((r) => ({ id: r.id, etiqueta: r.codigo }));

  // El contenedor que se crea rápido depende del tipo seleccionado.
  const contenedorRuta =
    tipoPadreVigente === "zona"
      ? catalogoNuevo("zonas")
      : tipoPadreVigente === "rack"
        ? catalogoNuevo("racks")
        : catalogoNuevo("secciones");
  const contenedorCampo =
    tipoPadreVigente === "zona"
      ? "zona_id"
      : tipoPadreVigente === "rack"
        ? "rack_id"
        : "seccion_id";
  const contenedorEtiqueta =
    tipoPadreVigente === "zona"
      ? "Nueva zona"
      : tipoPadreVigente === "rack"
        ? "Nuevo rack"
        : "Nueva sección";

  useEffect(() => {
    const u = ubicacionQuery.data;
    if (u) {
      reset({
        codigo: u.codigo,
        nombre: u.nombre ?? "",
        tipo: u.tipo,
        tipo_padre: "zona",
        padre_id: "",
        capacidad_maxima: u.capacidad_maxima?.toString() ?? "",
      });
    }
  }, [ubicacionQuery.data, reset]);

  // Duplicar: precarga los datos de la ubicación origen (con su contenedor
  // padre) pero deja el código vacío para definir uno nuevo y único.
  useEffect(() => {
    const u = origenQuery.data;
    if (u) {
      const tipoPadre = u.seccion_id ? "seccion" : u.rack_id ? "rack" : "zona";
      const padreId = u.seccion_id ?? u.rack_id ?? u.zona_id ?? "";
      reset({
        codigo: "",
        nombre: u.nombre ?? "",
        tipo: u.tipo,
        tipo_padre: tipoPadre,
        padre_id: padreId,
        capacidad_maxima: u.capacidad_maxima?.toString() ?? "",
      });
    }
  }, [origenQuery.data, reset]);

  const guardarMut = useMutation({
    mutationFn: (v: FormValues) => {
      const capacidad = v.capacidad_maxima?.trim() ? Number(v.capacidad_maxima) : null;
      if (esEdicion) {
        return editarUbicacion(id as string, {
          nombre: v.nombre || null,
          tipo: v.tipo as TipoUbicacion,
          capacidad_maxima: capacidad,
        });
      }
      return crearUbicacion({
        codigo: v.codigo,
        nombre: v.nombre || null,
        tipo: v.tipo as TipoUbicacion,
        capacidad_maxima: capacidad,
        zona_id: v.tipo_padre === "zona" ? v.padre_id : null,
        rack_id: v.tipo_padre === "rack" ? v.padre_id : null,
        seccion_id: v.tipo_padre === "seccion" ? v.padre_id : null,
      });
    },
    onSuccess: (ubicacion) => {
      invalidarRecurso(queryClient, "ubicaciones", "ubicacion");
      if (volver && campo && !esEdicion) {
        navigate(urlConSeleccion(volver, campo, ubicacion.id));
      } else {
        navigate(catalogoDetalle("ubicaciones", ubicacion.id));
      }
    },
    onError: (err) => setError(mensajeError(err)),
  });

  if (esEdicion && ubicacionQuery.isLoading) {
    return <PageHeader title="Editar ubicación" description="Cargando…" />;
  }

  return (
    <>
      <PageHeader
        title={
          esEdicion
            ? `Editar ubicación — ${ubicacionQuery.data?.codigo ?? ""}`
            : duplicarDe
              ? "Duplicar ubicación"
              : "Nueva ubicación"
        }
        description={
          retornaAFormulario
            ? "Crea la ubicación y vuelve al formulario anterior con ella seleccionada."
            : "La ubicación es el punto direccionable donde vive el stock. Cuelga de exactamente una zona, rack o sección."
        }
      />

      <form onSubmit={handleSubmit((v) => guardarMut.mutate(v))} noValidate>
        <Card title="Datos generales">
          <Card.Body>
            {error ? (
              <ErrorPanel title="No se pudo guardar la ubicación" className="mb-4">
                {error}
              </ErrorPanel>
            ) : null}
            <FormGrid columns={2}>
              <Field
                label="Código"
                htmlFor="codigo"
                required
                error={errors.codigo?.message}
                help={esEdicion ? "El código no se puede modificar." : "Ej.: RACK-A1-N2-P3"}
              >
                <Input id="codigo" code disabled={esEdicion} {...register("codigo")} />
              </Field>
              <Field label="Nombre" htmlFor="nombre">
                <Input id="nombre" {...register("nombre")} />
              </Field>
              <Field label="Tipo" htmlFor="tipo" required error={errors.tipo?.message}>
                <Select id="tipo" {...register("tipo")}>
                  {TIPOS_UBICACION.map((t) => (
                    <option key={t.valor} value={t.valor}>
                      {t.etiqueta}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field
                label="Capacidad máxima"
                htmlFor="capacidad_maxima"
                error={errors.capacidad_maxima?.message}
              >
                <Input
                  id="capacidad_maxima"
                  type="number"
                  min="0"
                  step="1"
                  number
                  {...register("capacidad_maxima")}
                />
              </Field>
              {!esEdicion ? (
                <>
                  <Field label="Contenedor padre" htmlFor="tipo_padre">
                    <Select
                      id="tipo_padre"
                      {...register("tipo_padre", {
                        onChange: () => setValue("padre_id", ""),
                      })}
                    >
                      {TIPOS_PADRE.map((t) => (
                        <option key={t.valor} value={t.valor}>
                          {t.etiqueta}
                        </option>
                      ))}
                    </Select>
                  </Field>
                  <Field
                    label="Ubicado en"
                    htmlFor="padre_id"
                    required
                    error={errors.padre_id?.message}
                  >
                    <div className="flex items-center gap-2">
                      <div className="flex-1">
                        <Controller
                          control={control}
                          name="padre_id"
                          render={({ field }) => (
                            <Select id="padre_id" placeholder="Selecciona" {...field}>
                              {opcionesPadre.map((o) => (
                                <option key={o.id} value={o.id}>
                                  {o.etiqueta}
                                </option>
                              ))}
                            </Select>
                          )}
                        />
                      </div>
                      <CrearRapido campo={contenedorCampo} rutaNueva={contenedorRuta}>
                        {contenedorEtiqueta}
                      </CrearRapido>
                    </div>
                  </Field>
                </>
              ) : null}
            </FormGrid>
          </Card.Body>
        </Card>

        <FormActions>
          <Button type="submit" variant="primary" disabled={isSubmitting || guardarMut.isPending}>
            {guardarMut.isPending
              ? "Guardando…"
              : esEdicion
                ? "Guardar cambios"
                : "Crear ubicación"}
          </Button>
          <ButtonLink
            variant="secondary"
            href={
              retornaAFormulario
                ? urlConRegreso(volver as string)
                : esEdicion
                  ? catalogoDetalle("ubicaciones", id as string)
                  : catalogoLista("ubicaciones")
            }
          >
            Cancelar
          </ButtonLink>
        </FormActions>
      </form>
    </>
  );
}
