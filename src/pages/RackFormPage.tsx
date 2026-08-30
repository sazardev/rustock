import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useMemo, useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { useNavigate, useParams } from "react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import {
  crearRack,
  editarRack,
  listarPasillos,
  listarZonas,
  moverRack,
  obtenerRack,
} from "../shared/backend";
import { esPaginado } from "../shared/types";
import { invalidarRecurso } from "../shared/invalidar";
import { catalogoDetalle, catalogoLista, catalogoNuevo } from "../app/route-paths";
import { mensajeError } from "../shared/format";
import { PosicionFormCard } from "../shared/posicion-form-card";
import { useT, type Diccionario } from "../shared/i18n";
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
  useToast,
} from "../shared/ui";

/** El esquema sigue al idioma: sus mensajes se pintan tal cual en el campo. */
function esquemaDe(t: Diccionario) {
  return z.object({
    codigo: z.string().trim().min(1, t.formularios.codigoObligatorio),
    nombre: z.string().optional(),
    tipo: z.string().optional(),
    zona_id: z.string().trim().min(1, t.formularios.seleccionaZona),
    pasillo_id: z.string().optional(),
  });
}

type FormValues = z.infer<ReturnType<typeof esquemaDe>>;

const INVALIDAR_ZONAS = ["zonas", "selector"] as const;

export function RackFormPage() {
  const t = useT();
  const esquema = useMemo(() => esquemaDe(t), [t]);
  const { id } = useParams<{ id?: string }>();
  const esEdicion = Boolean(id);
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();
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
    control,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(esquema),
    defaultValues: { codigo: "", nombre: "", tipo: "", zona_id: "", pasillo_id: "" },
  });

  const zonaIdActual = useWatch({ control, name: "zona_id" });
  const pasillosQuery = useQuery({
    queryKey: ["pasillos", "selector", zonaIdActual],
    queryFn: () =>
      listarPasillos({ filters: [`zona_id:eq:${zonaIdActual}`], page_size: 200, sort: "codigo" }),
    enabled: Boolean(zonaIdActual),
  });
  const pasillos =
    pasillosQuery.data && esPaginado(pasillosQuery.data) ? pasillosQuery.data.data : [];

  useEffect(() => {
    const r = rackQuery.data;
    if (r) {
      reset({
        codigo: r.codigo,
        nombre: r.nombre ?? "",
        tipo: r.tipo ?? "",
        zona_id: r.zona_id,
        pasillo_id: r.pasillo_id ?? "",
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
        return editarRack(id as string, {
          nombre: v.nombre || null,
          tipo: v.tipo || null,
          pasillo_id: v.pasillo_id || null,
        });
      }
      return crearRack({
        codigo: v.codigo,
        nombre: v.nombre || null,
        tipo: v.tipo || null,
        zona_id: v.zona_id,
        pasillo_id: v.pasillo_id || null,
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

  const moverMut = useMutation({
    mutationFn: (pos: {
      pos_x: number | null;
      pos_y: number | null;
      pos_z: number | null;
      altura: number | null;
    }) => moverRack(id as string, pos),
    onSuccess: () => {
      invalidarRecurso(queryClient, "racks", "rack");
      toast(t.formularios.posicionGuardada, "success");
    },
    onError: (err) => toast(mensajeError(err), "error"),
  });

  if (esEdicion && rackQuery.isLoading) {
    return <PageHeader title={t.formularios.rack.editar} description={t.comun.cargando} />;
  }

  return (
    <>
      <PageHeader
        title={
          esEdicion
            ? `${t.formularios.rack.editar} — ${rackQuery.data?.codigo ?? ""}`
            : t.formularios.rack.nuevo
        }
        description={
          retornaAFormulario
            ? t.formularios.rack.volverConSeleccion
            : t.formularios.rack.descripcion
        }
      />

      <form onSubmit={handleSubmit((v) => guardarMut.mutate(v))} noValidate>
        <Card title={t.formularios.datosGenerales}>
          <Card.Body>
            {error ? (
              <ErrorPanel title={t.formularios.rack.noSePudoGuardar} className="mb-4">
                {error}
              </ErrorPanel>
            ) : null}
            <FormGrid columns={2}>
              <Field
                label={t.comun.codigo}
                htmlFor="codigo"
                required
                error={errors.codigo?.message}
                help={esEdicion ? t.formularios.codigoInmutable : t.formularios.rack.codigoAyuda}
              >
                <Input id="codigo" code disabled={esEdicion} {...register("codigo")} />
              </Field>
              <Field label={t.comun.nombre} htmlFor="nombre">
                <Input id="nombre" {...register("nombre")} />
              </Field>
              <Field label={t.comun.tipo} htmlFor="tipo">
                <Input id="tipo" placeholder={t.campos.tipoRackEjemplo} {...register("tipo")} />
              </Field>
              <Field
                label={t.campos.zona}
                htmlFor="zona_id"
                required
                error={errors.zona_id?.message}
              >
                <div className="flex items-center gap-2">
                  <div className="flex-1">
                    <Select
                      id="zona_id"
                      placeholder={t.formularios.selecciona}
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
                      {t.formularios.zona.nueva}
                    </CrearRapido>
                  ) : null}
                </div>
              </Field>
              <Field
                label={t.campos.pasillo}
                htmlFor="pasillo_id"
                help={t.formularios.rack.pasilloAyuda}
              >
                <Select
                  id="pasillo_id"
                  placeholder={t.formularios.rack.sinPasillo}
                  disabled={!zonaIdActual}
                  {...register("pasillo_id")}
                >
                  {pasillos.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.codigo} — {p.nombre ?? "sin nombre"}
                    </option>
                  ))}
                </Select>
              </Field>
            </FormGrid>
          </Card.Body>
        </Card>

        <FormActions>
          <Button type="submit" variant="primary" disabled={isSubmitting || guardarMut.isPending}>
            {guardarMut.isPending
              ? "Guardando…"
              : esEdicion
                ? t.formularios.guardarCambios
                : t.formularios.rack.crear}
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
            {t.comun.cancelar}
          </ButtonLink>
        </FormActions>
      </form>

      {esEdicion && rackQuery.data ? (
        <PosicionFormCard
          valores={{
            pos_x: rackQuery.data.pos_x,
            pos_y: rackQuery.data.pos_y,
            pos_z: rackQuery.data.pos_z,
            altura: rackQuery.data.altura,
          }}
          guardando={moverMut.isPending}
          onGuardar={(pos) => moverMut.mutate(pos)}
        />
      ) : null}
    </>
  );
}
