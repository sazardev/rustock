import { zodResolver } from "@hookform/resolvers/zod";
import { useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { useNavigate } from "react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { crearSesionInventario, listarAlmacenes } from "../shared/backend";
import { esPaginado } from "../shared/types";
import { invalidarRecurso } from "../shared/invalidar";
import { PATH, sesionInventarioDetalle } from "../app/route-paths";
import { catalogoNuevo } from "../app/route-paths";
import { mensajeError } from "../shared/format";
import { CrearRapido, usePreservarFormulario, useSeleccionCreada } from "../shared/creacion-rapida";
import { useT, type Diccionario } from "../shared/i18n";
import {
  Button,
  ButtonLink,
  Card,
  Checkbox,
  ErrorPanel,
  Field,
  FormActions,
  FormGrid,
  Input,
  PageHeader,
  Select,
} from "../shared/ui";

function ahoraLocal(): string {
  const d = new Date();
  d.setSeconds(0, 0);
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 16);
}

/** El esquema sigue al idioma: sus mensajes se pintan tal cual en el campo. */
function esquemaDe(t: Diccionario) {
  return z.object({
    tipo: z.enum(["COMPLETO", "CICLICO"]),
    almacen_id: z.string().trim().min(1, t.formularios.seleccionaAlmacen),
    alcance: z.string().optional(),
    fecha_inicio: z.string().optional(),
    conteo_ciego: z.boolean(),
    exige_doble_conteo: z.boolean(),
  });
}

type FormValues = z.infer<ReturnType<typeof esquemaDe>>;

const INVALIDAR_ALMACENES = ["almacenes", "selector"] as const;

export function InventarioNuevoPage() {
  const t = useT();
  const esquema = useMemo(() => esquemaDe(t), [t]);
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [error, setError] = useState<string | null>(null);

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
    defaultValues: {
      tipo: "CICLICO",
      almacen_id: "",
      alcance: "",
      fecha_inicio: ahoraLocal(),
      conteo_ciego: false,
      exige_doble_conteo: false,
    },
  });

  // Conserva el borrador al salir a crear un almacén (creación rápida) y lo
  // restaura al volver (crear o cancelar).
  const { descartar } = usePreservarFormulario(
    "/inventario/nuevo",
    () => getValues(),
    (valores) => reset(valores as FormValues),
  );

  useSeleccionCreada(
    "almacen_id",
    (nuevoId) => setValue("almacen_id", nuevoId),
    INVALIDAR_ALMACENES,
  );

  const crearMut = useMutation({
    mutationFn: (v: FormValues) =>
      crearSesionInventario({
        tipo: v.tipo,
        almacen_id: v.almacen_id,
        alcance: v.alcance || null,
        fecha_inicio: v.fecha_inicio ? new Date(v.fecha_inicio).toISOString() : null,
        conteo_ciego: v.conteo_ciego,
        exige_doble_conteo: v.exige_doble_conteo,
      }),
    onSuccess: (sesion) => {
      descartar();
      invalidarRecurso(queryClient, "sesiones-inventario", "sesion-inventario");
      navigate(sesionInventarioDetalle(sesion.id));
    },
    onError: (err) => setError(mensajeError(err)),
  });

  return (
    <>
      <PageHeader title={t.inventarioNuevo.titulo} description={t.inventarioNuevo.descripcion} />

      <form onSubmit={handleSubmit((v) => crearMut.mutate(v))} noValidate>
        <Card title={t.formularios.datosGenerales}>
          <Card.Body>
            {error ? (
              <ErrorPanel title={t.inventarioNuevo.noSePudoCrear} className="mb-4">
                {error}
              </ErrorPanel>
            ) : null}
            <FormGrid columns={2}>
              <Field label="Tipo" htmlFor="tipo" required>
                <Select id="tipo" {...register("tipo")}>
                  <option value="COMPLETO">Completo</option>
                  <option value="CICLICO">Cíclico</option>
                </Select>
              </Field>
              <Field
                label="Almacén"
                htmlFor="almacen_id"
                required
                error={errors.almacen_id?.message}
              >
                <div className="flex items-center gap-2">
                  <div className="flex-1">
                    <Select id="almacen_id" placeholder="Selecciona" {...register("almacen_id")}>
                      {almacenes.map((a) => (
                        <option key={a.id} value={a.id}>
                          {a.codigo} — {a.nombre}
                        </option>
                      ))}
                    </Select>
                  </div>
                  <CrearRapido campo="almacen_id" rutaNueva={catalogoNuevo("almacenes")}>
                    Nuevo almacén
                  </CrearRapido>
                </div>
              </Field>
              <Field label="Alcance" htmlFor="alcance" help={t.inventarioNuevo.alcanceAyuda}>
                <Input id="alcance" {...register("alcance")} />
              </Field>
              <Field
                label={t.sesionInventario.fechaInicio}
                htmlFor="fecha_inicio"
                help={t.inventarioNuevo.fechaInicioAyuda}
              >
                <Input id="fecha_inicio" type="datetime-local" {...register("fecha_inicio")} />
              </Field>
            </FormGrid>

            <div className="mt-4 flex flex-col gap-2">
              <Checkbox
                id="conteo_ciego"
                label={t.inventarioNuevo.conteoCiego}
                {...register("conteo_ciego")}
              />
              <Checkbox
                id="exige_doble_conteo"
                label={t.inventarioNuevo.dobleConteo}
                {...register("exige_doble_conteo")}
              />
            </div>
          </Card.Body>
        </Card>

        <FormActions>
          <Button type="submit" variant="primary" disabled={isSubmitting || crearMut.isPending}>
            {crearMut.isPending ? "Creando…" : t.inventarioNuevo.crear}
          </Button>
          <ButtonLink variant="secondary" href={PATH.inventario}>
            {t.comun.cancelar}
          </ButtonLink>
        </FormActions>
      </form>
    </>
  );
}
