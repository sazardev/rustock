import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useMemo, useState } from "react";
import { Controller, useForm, useWatch } from "react-hook-form";
import { useNavigate, useParams } from "react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import {
  crearCaja,
  editarCaja,
  listarLotes,
  listarProductos,
  listarUbicaciones,
  obtenerCaja,
} from "../shared/backend";
import { esPaginado, type Producto } from "../shared/types";
import { invalidarRecurso } from "../shared/invalidar";
import { catalogoDetalle, catalogoLista, catalogoNuevo } from "../app/route-paths";
import { mensajeError } from "../shared/format";
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
} from "../shared/ui";

/** El esquema sigue al idioma: sus mensajes se pintan tal cual en el campo. */
function esquemaDe(t: Diccionario) {
  return z.object({
    codigo: z.string().trim().min(1, t.formularios.codigoObligatorio),
    nombre: z.string().optional(),
    ubicacion_id: z.string().trim().min(1, t.formularios.seleccionaUbicacion),
    producto_id: z.string().optional(),
    lote_id: z.string().optional(),
    etiqueta: z.string().optional(),
  });
}

type FormValues = z.infer<ReturnType<typeof esquemaDe>>;

const INVALIDAR_PRODUCTOS = ["productos", "selector-caja"] as const;
const INVALIDAR_UBICACIONES = ["ubicaciones", "selector-caja"] as const;
const INVALIDAR_LOTES = ["lotes", "por-producto"] as const;

export function CajaFormPage() {
  const t = useT();
  const esquema = useMemo(() => esquemaDe(t), [t]);
  const { id } = useParams<{ id?: string }>();
  const esEdicion = Boolean(id);
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [error, setError] = useState<string | null>(null);
  const { volver, campo } = usePeticionCreacion();
  const retornaAFormulario = !esEdicion && Boolean(volver && campo);

  const cajaQuery = useQuery({
    queryKey: ["caja", id],
    queryFn: () => obtenerCaja(id as string),
    enabled: esEdicion,
  });

  const productosQuery = useQuery({
    queryKey: ["productos", "selector-caja"],
    queryFn: () => listarProductos({ page_size: 200, sort: "nombre" }),
  });
  const productos =
    productosQuery.data && esPaginado(productosQuery.data) ? productosQuery.data.data : [];
  const productosPorId = useMemo(() => {
    const data = productosQuery.data;
    const lista = data && esPaginado(data) ? data.data : [];
    return new Map(lista.map((p) => [p.id, p]));
  }, [productosQuery.data]);

  const ubicacionesQuery = useQuery({
    queryKey: ["ubicaciones", "selector-caja"],
    queryFn: () => listarUbicaciones({ page_size: 200, sort: "codigo" }),
  });
  const ubicaciones =
    ubicacionesQuery.data && esPaginado(ubicacionesQuery.data) ? ubicacionesQuery.data.data : [];

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
      ubicacion_id: "",
      producto_id: "",
      lote_id: "",
      etiqueta: "",
    },
  });

  const productoIdVigente = useWatch({ control, name: "producto_id" });
  const productoVigente = productoIdVigente ? productosPorId.get(productoIdVigente) : undefined;

  const lotesQuery = useQuery({
    queryKey: ["lotes", "por-producto", productoIdVigente],
    queryFn: () =>
      listarLotes({ filters: [`producto_id:eq:${productoIdVigente}`], page_size: 200 }),
    enabled: Boolean(productoIdVigente),
  });
  const lotes = lotesQuery.data && esPaginado(lotesQuery.data) ? lotesQuery.data.data : [];

  useEffect(() => {
    const c = cajaQuery.data;
    if (c) {
      reset({
        codigo: c.codigo,
        nombre: c.nombre ?? "",
        ubicacion_id: c.ubicacion_id,
        producto_id: c.producto_id ?? "",
        lote_id: c.lote_id ?? "",
        etiqueta: c.etiqueta ?? "",
      });
    }
  }, [cajaQuery.data, reset]);

  // Conserva el borrador al salir a crear un catálogo dependiente (creación
  // rápida) y lo restaura al volver. En edición no aplica.
  const { descartar } = usePreservarFormulario(
    "/cajas/nuevo",
    () => getValues(),
    (valores) => reset(valores as FormValues),
    !esEdicion,
  );

  useSeleccionCreada(
    "producto_id",
    (nuevoId) => setValue("producto_id", nuevoId),
    INVALIDAR_PRODUCTOS,
    !esEdicion,
  );
  useSeleccionCreada(
    "lote_id",
    (nuevoId) => setValue("lote_id", nuevoId),
    INVALIDAR_LOTES,
    !esEdicion,
  );
  useSeleccionCreada(
    "ubicacion_id",
    (nuevoId) => setValue("ubicacion_id", nuevoId),
    INVALIDAR_UBICACIONES,
    !esEdicion,
  );

  const guardarMut = useMutation({
    mutationFn: (v: FormValues) => {
      if (esEdicion) {
        return editarCaja(id as string, { nombre: v.nombre || null, etiqueta: v.etiqueta || null });
      }
      return crearCaja({
        codigo: v.codigo,
        nombre: v.nombre || null,
        ubicacion_id: v.ubicacion_id,
        producto_id: v.producto_id || null,
        lote_id: v.lote_id || null,
        etiqueta: v.etiqueta || null,
      });
    },
    onSuccess: (caja) => {
      if (!esEdicion) descartar();
      invalidarRecurso(queryClient, "cajas", "caja");
      if (volver && campo && !esEdicion) {
        navigate(urlConSeleccion(volver, campo, caja.id));
      } else {
        navigate(catalogoDetalle("cajas", caja.id));
      }
    },
    onError: (err) => setError(mensajeError(err)),
  });

  if (esEdicion && cajaQuery.isLoading) {
    return <PageHeader title={t.formularios.caja.editar} description={t.comun.cargando} />;
  }

  function onSubmit(v: FormValues) {
    setError(null);
    if (v.producto_id) {
      const producto: Producto | undefined = productosPorId.get(v.producto_id);
      if (producto?.controla_lote && !v.lote_id) {
        setError(`El producto ${producto.sku} controla lote: selecciona un lote.`);
        return;
      }
    }
    guardarMut.mutate(v);
  }

  return (
    <>
      <PageHeader
        title={
          esEdicion
            ? `${t.formularios.caja.editar} — ${cajaQuery.data?.codigo ?? ""}`
            : t.formularios.caja.nueva
        }
        description={
          retornaAFormulario
            ? t.formularios.caja.volverConSeleccion
            : t.formularios.caja.descripcion
        }
      />

      <form onSubmit={handleSubmit(onSubmit)} noValidate>
        <Card title={t.formularios.datosGenerales}>
          <Card.Body>
            {error ? (
              <ErrorPanel title={t.formularios.caja.noSePudoGuardar} className="mb-4">
                {error}
              </ErrorPanel>
            ) : null}
            <FormGrid columns={2}>
              <Field
                label={t.comun.codigo}
                htmlFor="codigo"
                required
                error={errors.codigo?.message}
                help={esEdicion ? t.formularios.codigoInmutable : t.formularios.caja.codigoAyuda}
              >
                <Input id="codigo" code disabled={esEdicion} {...register("codigo")} />
              </Field>
              <Field label={t.comun.nombre} htmlFor="nombre">
                <Input id="nombre" {...register("nombre")} />
              </Field>
              <Field label={t.campos.etiqueta} htmlFor="etiqueta">
                <Input
                  id="etiqueta"
                  placeholder={t.formularios.caja.marcadorCodigo}
                  {...register("etiqueta")}
                />
              </Field>
              <Field
                label={t.campos.ubicacion}
                htmlFor="ubicacion_id"
                required
                error={errors.ubicacion_id?.message}
              >
                <div className="flex items-center gap-2">
                  <div className="flex-1">
                    <Select
                      id="ubicacion_id"
                      placeholder={t.formularios.selecciona}
                      disabled={esEdicion}
                      {...register("ubicacion_id")}
                    >
                      {ubicaciones.map((u) => (
                        <option key={u.id} value={u.id}>
                          {u.codigo}
                        </option>
                      ))}
                    </Select>
                  </div>
                  {!esEdicion ? (
                    <CrearRapido campo="ubicacion_id" rutaNueva={catalogoNuevo("ubicaciones")}>
                      {t.comun.nuevaUbicacion}
                    </CrearRapido>
                  ) : null}
                </div>
              </Field>
              <Field
                label={t.campos.productoOpcional}
                htmlFor="producto_id"
                error={errors.producto_id?.message}
                help={t.formularios.caja.productoAyuda}
              >
                <div className="flex items-center gap-2">
                  <div className="flex-1">
                    <Controller
                      control={control}
                      name="producto_id"
                      render={({ field }) => (
                        <Select
                          id="producto_id"
                          placeholder={t.formularios.caja.sinRestriccionProducto}
                          disabled={esEdicion}
                          {...field}
                        >
                          <option value="">Sin restricción</option>
                          {productos.map((p) => (
                            <option key={p.id} value={p.id}>
                              {p.sku} — {p.nombre}
                            </option>
                          ))}
                        </Select>
                      )}
                    />
                  </div>
                  {!esEdicion ? (
                    <CrearRapido campo="producto_id" rutaNueva={catalogoNuevo("productos")}>
                      {t.comun.nuevoProducto}
                    </CrearRapido>
                  ) : null}
                </div>
              </Field>
              {productoVigente?.controla_lote ? (
                <Field
                  label={t.campos.lote}
                  htmlFor="lote_id"
                  required
                  error={errors.lote_id?.message}
                  help={t.formularios.caja.loteAyuda}
                >
                  <div className="flex items-center gap-2">
                    <div className="flex-1">
                      <Controller
                        control={control}
                        name="lote_id"
                        render={({ field }) => (
                          <Select
                            id="lote_id"
                            placeholder={t.formularios.selecciona}
                            disabled={esEdicion}
                            {...field}
                          >
                            <option value="">Sin lote</option>
                            {lotes.map((l) => (
                              <option key={l.id} value={l.id}>
                                {l.numero}
                                {l.fecha_vencimiento
                                  ? ` — vence ${l.fecha_vencimiento.slice(0, 10)}`
                                  : ""}
                              </option>
                            ))}
                          </Select>
                        )}
                      />
                    </div>
                    {!esEdicion ? (
                      <CrearRapido campo="lote_id" rutaNueva={catalogoNuevo("lotes")}>
                        {t.comun.nuevoLote}
                      </CrearRapido>
                    ) : null}
                  </div>
                </Field>
              ) : null}
            </FormGrid>
          </Card.Body>
        </Card>

        <FormActions>
          <Button type="submit" variant="primary" disabled={isSubmitting || guardarMut.isPending}>
            {guardarMut.isPending
              ? "Guardando…"
              : esEdicion
                ? t.formularios.guardarCambios
                : t.formularios.caja.crear}
          </Button>
          <ButtonLink
            variant="secondary"
            href={
              retornaAFormulario
                ? urlConRegreso(volver as string)
                : esEdicion
                  ? catalogoDetalle("cajas", id as string)
                  : catalogoLista("cajas")
            }
          >
            {t.comun.cancelar}
          </ButtonLink>
        </FormActions>
      </form>
    </>
  );
}
