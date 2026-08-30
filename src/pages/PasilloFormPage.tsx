import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { useNavigate, useParams } from "react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import {
  crearPasillo,
  editarPasillo,
  listarZonas,
  moverPasillo,
  obtenerPasillo,
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
    zona_id: z.string().trim().min(1, t.formularios.seleccionaZona),
  });
}

type FormValues = z.infer<ReturnType<typeof esquemaDe>>;

const INVALIDAR_ZONAS = ["zonas", "selector"] as const;

export function PasilloFormPage() {
  const t = useT();
  const esquema = useMemo(() => esquemaDe(t), [t]);
  const { id } = useParams<{ id?: string }>();
  const esEdicion = Boolean(id);
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [error, setError] = useState<string | null>(null);
  const { volver, campo } = usePeticionCreacion();
  const retornaAFormulario = !esEdicion && Boolean(volver && campo);

  const pasilloQuery = useQuery({
    queryKey: ["pasillo", id],
    queryFn: () => obtenerPasillo(id as string),
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
    defaultValues: { codigo: "", nombre: "", zona_id: "" },
  });

  useEffect(() => {
    const p = pasilloQuery.data;
    if (p) {
      reset({ codigo: p.codigo, nombre: p.nombre ?? "", zona_id: p.zona_id });
    }
  }, [pasilloQuery.data, reset]);

  const { descartar } = usePreservarFormulario(
    "/pasillos/nuevo",
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
        return editarPasillo(id as string, { nombre: v.nombre || null });
      }
      return crearPasillo({ codigo: v.codigo, nombre: v.nombre || null, zona_id: v.zona_id });
    },
    onSuccess: (pasillo) => {
      if (!esEdicion) descartar();
      invalidarRecurso(queryClient, "pasillos", "pasillo");
      if (volver && campo && !esEdicion) {
        navigate(urlConSeleccion(volver, campo, pasillo.id));
      } else {
        navigate(catalogoDetalle("pasillos", pasillo.id));
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
    }) => moverPasillo(id as string, pos),
    onSuccess: () => {
      invalidarRecurso(queryClient, "pasillos", "pasillo");
      toast(t.formularios.posicionGuardada, "success");
    },
    onError: (err) => toast(mensajeError(err), "error"),
  });

  if (esEdicion && pasilloQuery.isLoading) {
    return <PageHeader title={t.formularios.pasillo.editar} description={t.comun.cargando} />;
  }

  return (
    <>
      <PageHeader
        title={
          esEdicion
            ? `${t.formularios.pasillo.editar} — ${pasilloQuery.data?.codigo ?? ""}`
            : t.formularios.pasillo.nuevo
        }
        description={
          retornaAFormulario
            ? t.formularios.pasillo.volverConSeleccion
            : t.formularios.pasillo.descripcion
        }
      />

      <form onSubmit={handleSubmit((v) => guardarMut.mutate(v))} noValidate>
        <Card title={t.formularios.datosGenerales}>
          <Card.Body>
            {error ? (
              <ErrorPanel title={t.formularios.pasillo.noSePudoGuardar} className="mb-4">
                {error}
              </ErrorPanel>
            ) : null}
            <FormGrid columns={2}>
              <Field
                label={t.comun.codigo}
                htmlFor="codigo"
                required
                error={errors.codigo?.message}
                help={esEdicion ? t.formularios.codigoInmutable : t.formularios.pasillo.codigoAyuda}
              >
                <Input id="codigo" code disabled={esEdicion} {...register("codigo")} />
              </Field>
              <Field label={t.comun.nombre} htmlFor="nombre">
                <Input id="nombre" {...register("nombre")} />
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
            </FormGrid>
          </Card.Body>
        </Card>

        <FormActions>
          <Button type="submit" variant="primary" disabled={isSubmitting || guardarMut.isPending}>
            {guardarMut.isPending
              ? "Guardando…"
              : esEdicion
                ? t.formularios.guardarCambios
                : t.formularios.pasillo.crear}
          </Button>
          <ButtonLink
            variant="secondary"
            href={
              retornaAFormulario
                ? urlConRegreso(volver as string)
                : esEdicion
                  ? catalogoDetalle("pasillos", id as string)
                  : catalogoLista("pasillos")
            }
          >
            {t.comun.cancelar}
          </ButtonLink>
        </FormActions>
      </form>

      {esEdicion && pasilloQuery.data ? (
        <PosicionFormCard
          valores={{
            pos_x: pasilloQuery.data.pos_x,
            pos_y: pasilloQuery.data.pos_y,
            pos_z: pasilloQuery.data.pos_z,
            altura: pasilloQuery.data.altura,
          }}
          guardando={moverMut.isPending}
          onGuardar={(pos) => moverMut.mutate(pos)}
        />
      ) : null}
    </>
  );
}
