import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useMemo, useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { useNavigate, useParams, useSearchParams } from "react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { crearLote, editarLote, listarProductos, obtenerLote } from "../shared/backend";
import { esPaginado } from "../shared/types";
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
  Textarea,
} from "../shared/ui";

/** El esquema sigue al idioma: sus mensajes se pintan tal cual en el campo. */
function esquemaDe(t: Diccionario) {
  return z.object({
    numero: z.string().trim().min(1, t.formularios.lote.numeroObligatorio),
    producto_id: z.string().trim().min(1, t.formularios.lote.productoObligatorio),
    fecha_fabricacion: z.string().optional(),
    fecha_vencimiento: z.string().optional(),
    origen: z.string().optional(),
    notas: z.string().optional(),
  });
}

type FormValues = z.infer<ReturnType<typeof esquemaDe>>;

const INVALIDAR_PRODUCTOS = ["productos", "selector"] as const;

export function LoteFormPage() {
  const t = useT();
  const esquema = useMemo(() => esquemaDe(t), [t]);
  const { id } = useParams<{ id?: string }>();
  const esEdicion = Boolean(id);
  const [searchParams] = useSearchParams();
  const duplicarDe = searchParams.get("duplicarDe");
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [error, setError] = useState<string | null>(null);
  const { volver, campo } = usePeticionCreacion();
  const retornaAFormulario = !esEdicion && Boolean(volver && campo);
  // Producto creado en el flujo de creación rápida: se conserva en el selector
  // aunque no controle lote (el lote ya lo referencia).
  const [productoRapidoId, setProductoRapidoId] = useState<string | null>(null);

  const loteQuery = useQuery({
    queryKey: ["lote", id],
    queryFn: () => obtenerLote(id as string),
    enabled: esEdicion,
  });
  const origenQuery = useQuery({
    queryKey: ["lote", duplicarDe],
    queryFn: () => obtenerLote(duplicarDe as string),
    enabled: Boolean(duplicarDe && !esEdicion),
  });

  const productosQuery = useQuery({
    queryKey: ["productos", "selector"],
    queryFn: () => listarProductos({ page_size: 200, sort: "sku" }),
  });
  const productos =
    productosQuery.data && esPaginado(productosQuery.data) ? productosQuery.data.data : [];
  // Solo los productos que controlan lote admiten lotes (SPEC §3.12); en
  // Edición se conserva el producto del lote aunque ya no controle lote, y en
  // creación rápida se conserva el producto recién creado aunque no controle lote.
  const seleccionables = productos.filter(
    (p) =>
      p.controla_lote ||
      (esEdicion && p.id === loteQuery.data?.producto_id) ||
      p.id === productoRapidoId,
  );

  const {
    control,
    register,
    handleSubmit,
    reset,
    setValue,
    getValues,
    setError: setFieldError,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(esquema),
    defaultValues: {
      numero: "",
      producto_id: "",
      fecha_fabricacion: "",
      fecha_vencimiento: "",
      origen: "",
      notas: "",
    },
  });

  // Conserva el borrador al salir a crear un producto (creación rápida) y lo
  // restaura al volver; el producto restaurado se conserva en el selector
  // aunque no controle lote (el lote ya lo referencia).
  const { descartar } = usePreservarFormulario(
    "/lotes/nuevo",
    () => getValues(),
    (valores) => {
      const lote = valores as FormValues;
      reset(lote);
      if (lote.producto_id) setProductoRapidoId(lote.producto_id);
    },
    !esEdicion,
  );

  useSeleccionCreada(
    "producto_id",
    (nuevoId) => {
      setValue("producto_id", nuevoId);
      setProductoRapidoId(nuevoId);
    },
    INVALIDAR_PRODUCTOS,
    !esEdicion,
  );

  const productoIdVigente = useWatch({ control, name: "producto_id" });
  const productoSeleccionado = productos.find((p) => p.id === productoIdVigente);

  useEffect(() => {
    const l = loteQuery.data;
    if (l) {
      reset({
        numero: l.numero,
        producto_id: l.producto_id,
        fecha_fabricacion: l.fecha_fabricacion ?? "",
        fecha_vencimiento: l.fecha_vencimiento ?? "",
        origen: l.origen ?? "",
        notas: l.notas ?? "",
      });
    }
  }, [loteQuery.data, reset]);

  // Duplicar: precarga los datos del lote origen pero deja el número vacío
  // (es único por producto) para definir uno nuevo al guardar.
  useEffect(() => {
    const l = origenQuery.data;
    if (l) {
      reset({
        numero: "",
        producto_id: l.producto_id,
        fecha_fabricacion: l.fecha_fabricacion ?? "",
        fecha_vencimiento: l.fecha_vencimiento ?? "",
        origen: l.origen ?? "",
        notas: l.notas ?? "",
      });
      setProductoRapidoId(l.producto_id);
    }
  }, [origenQuery.data, reset]);

  const onSubmit = (v: FormValues) => {
    // SPEC §3.12: si el producto controla vencimiento, la fecha es obligatoria.
    if (productoSeleccionado?.controla_vencimiento && !v.fecha_vencimiento) {
      setFieldError("fecha_vencimiento", {
        type: "custom",
        message: t.formularios.lote.vencimientoObligatorio,
      });
      return;
    }
    guardarMut.mutate(v);
  };

  const guardarMut = useMutation({
    mutationFn: (v: FormValues) => {
      const datos = {
        fecha_fabricacion: v.fecha_fabricacion || null,
        fecha_vencimiento: v.fecha_vencimiento || null,
        origen: v.origen || null,
        notas: v.notas || null,
      };
      if (esEdicion) {
        return editarLote(id as string, datos);
      }
      return crearLote({ numero: v.numero, producto_id: v.producto_id, ...datos });
    },
    onSuccess: (lote) => {
      descartar();
      invalidarRecurso(queryClient, "lotes", "lote");
      if (volver && campo && !esEdicion) {
        navigate(urlConSeleccion(volver, campo, lote.id));
      } else {
        navigate(catalogoDetalle("lotes", lote.id));
      }
    },
    onError: (err) => setError(mensajeError(err)),
  });

  if (esEdicion && loteQuery.isLoading) {
    return <PageHeader title={t.formularios.lote.editar} description={t.comun.cargando} />;
  }

  return (
    <>
      <PageHeader
        title={
          esEdicion
            ? `${t.formularios.lote.editar} — ${loteQuery.data?.numero ?? ""}`
            : duplicarDe
              ? t.formularios.lote.duplicar
              : t.formularios.lote.nuevo
        }
        description={
          retornaAFormulario
            ? t.formularios.lote.volverConSeleccion
            : duplicarDe
              ? t.formularios.lote.duplicarDesc
              : t.formularios.lote.descripcion
        }
      />

      <form onSubmit={handleSubmit(onSubmit)} noValidate>
        <Card title={t.formularios.datosGenerales}>
          <Card.Body>
            {error ? (
              <ErrorPanel title={t.formularios.lote.noSePudoGuardar} className="mb-4">
                {error}
              </ErrorPanel>
            ) : null}
            <FormGrid columns={2}>
              <Field
                label={t.campos.numero}
                htmlFor="numero"
                required
                error={errors.numero?.message}
                help={esEdicion ? t.formularios.lote.numeroInmutable : undefined}
              >
                <Input id="numero" code disabled={esEdicion} {...register("numero")} />
              </Field>
              <Field
                label={t.campos.producto}
                htmlFor="producto_id"
                required
                error={errors.producto_id?.message}
                help={esEdicion ? t.formularios.lote.productoInmutable : undefined}
              >
                <div className="flex items-center gap-2">
                  <div className="flex-1">
                    <Select
                      id="producto_id"
                      placeholder={t.formularios.selecciona}
                      disabled={esEdicion}
                      {...register("producto_id")}
                    >
                      {seleccionables.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.sku} — {p.nombre}
                        </option>
                      ))}
                    </Select>
                  </div>
                  {!esEdicion ? (
                    <CrearRapido campo="producto_id" rutaNueva={catalogoNuevo("productos")}>
                      {t.comun.nuevoProducto}
                    </CrearRapido>
                  ) : null}
                </div>
              </Field>
              <Field label={t.formularios.lote.fechaFabricacion} htmlFor="fecha_fabricacion">
                <Input id="fecha_fabricacion" type="date" {...register("fecha_fabricacion")} />
              </Field>
              <Field
                label={t.formularios.lote.fechaVencimiento}
                htmlFor="fecha_vencimiento"
                error={errors.fecha_vencimiento?.message}
                help={
                  productoSeleccionado?.controla_vencimiento
                    ? t.formularios.lote.vencimientoAyuda
                    : undefined
                }
              >
                <Input id="fecha_vencimiento" type="date" {...register("fecha_vencimiento")} />
              </Field>
              <Field label={t.campos.origen} htmlFor="origen">
                <Input id="origen" {...register("origen")} />
              </Field>
            </FormGrid>
            <Field label={t.comun.notas} htmlFor="notas">
              <Textarea id="notas" rows={3} {...register("notas")} />
            </Field>
          </Card.Body>
        </Card>

        <FormActions>
          <Button type="submit" variant="primary" disabled={isSubmitting || guardarMut.isPending}>
            {guardarMut.isPending
              ? "Guardando…"
              : esEdicion
                ? t.formularios.guardarCambios
                : t.formularios.lote.crear}
          </Button>
          <ButtonLink
            variant="secondary"
            href={
              retornaAFormulario
                ? urlConRegreso(volver as string)
                : esEdicion
                  ? catalogoDetalle("lotes", id as string)
                  : catalogoLista("lotes")
            }
          >
            {t.comun.cancelar}
          </ButtonLink>
        </FormActions>
      </form>
    </>
  );
}
