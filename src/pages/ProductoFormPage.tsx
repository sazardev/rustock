import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useMemo, useState } from "react";
import { Controller, useForm, useWatch } from "react-hook-form";
import { useNavigate, useParams, useSearchParams } from "react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import {
  crearProducto,
  editarProducto,
  listarCategorias,
  listarUoms,
  obtenerProducto,
} from "../shared/backend";
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
  Checkbox,
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
    sku: z.string().trim().min(1, t.formularios.producto.skuObligatorio),
    nombre: z.string().trim().min(1, t.formularios.nombreObligatorio),
    descripcion: z.string().optional(),
    categoria_id: z.string().optional(),
    uom_base_id: z.string().trim().min(1, t.formularios.producto.uomObligatoria),
    uom_venta_id: z.string().optional(),
    uom_compra_id: z.string().optional(),
    codigo_barras: z.string().optional(),
    peso_unitario: z.string().optional(),
    volumen_unitario: z.string().optional(),
    stock_minimo: z.string().optional(),
    stock_maximo: z.string().optional(),
    controla_lote: z.boolean(),
    controla_vencimiento: z.boolean(),
    perecedero: z.boolean(),
  });
}

type FormValues = z.infer<ReturnType<typeof esquemaDe>>;

const INVALIDAR_UOMS = ["uoms", "selector"] as const;
const INVALIDAR_CATEGORIAS = ["categorias", "selector"] as const;

const VALORES_INICIALES: FormValues = {
  sku: "",
  nombre: "",
  descripcion: "",
  categoria_id: "",
  uom_base_id: "",
  uom_venta_id: "",
  uom_compra_id: "",
  codigo_barras: "",
  peso_unitario: "",
  volumen_unitario: "",
  stock_minimo: "",
  stock_maximo: "",
  controla_lote: false,
  controla_vencimiento: false,
  perecedero: false,
};

function numeroONull(valor: string | undefined): number | null {
  if (!valor || valor.trim() === "") return null;
  const n = Number(valor);
  return Number.isNaN(n) ? null : n;
}

export function ProductoFormPage() {
  const t = useT();
  const esquema = useMemo(() => esquemaDe(t), [t]);
  const { id } = useParams<{ id?: string }>();
  const esEdicion = Boolean(id);
  const [searchParams] = useSearchParams();
  const duplicarDe = searchParams.get("duplicarDe");
  const codigoEscaneado = esEdicion ? null : searchParams.get("codigo");
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [error, setError] = useState<string | null>(null);
  const { volver, campo } = usePeticionCreacion();
  const retornaAFormulario = !esEdicion && Boolean(volver && campo);

  const productoQuery = useQuery({
    queryKey: ["producto", id],
    queryFn: () => obtenerProducto(id as string),
    enabled: esEdicion,
  });
  const origenQuery = useQuery({
    queryKey: ["producto", duplicarDe],
    queryFn: () => obtenerProducto(duplicarDe as string),
    enabled: Boolean(duplicarDe && !esEdicion),
  });
  const categoriasQuery = useQuery({
    queryKey: ["categorias", "selector"],
    queryFn: () => listarCategorias({ page_size: 200, sort: "nombre" }),
  });
  const uomsQuery = useQuery({
    queryKey: ["uoms", "selector"],
    queryFn: () => listarUoms({ page_size: 200, sort: "codigo" }),
  });
  const categorias =
    categoriasQuery.data && esPaginado(categoriasQuery.data) ? categoriasQuery.data.data : [];
  const uoms = uomsQuery.data && esPaginado(uomsQuery.data) ? uomsQuery.data.data : [];

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
    // `?codigo=` llega del escáner cuando se leyó un código que no existe en el
    // catálogo (SPEC §14.3): se precarga el campo para no obligar a teclear a
    // mano lo que la máquina acaba de leer. El alta sigue haciéndola una
    // persona en este formulario — el escaneo nunca crea nada por sí solo.
    defaultValues: codigoEscaneado
      ? { ...VALORES_INICIALES, codigo_barras: codigoEscaneado }
      : VALORES_INICIALES,
  });

  // Conserva el borrador al salir a crear UOM/categoría (creación rápida) y
  // lo restaura al volver (crear o cancelar). Los registros creados se
  // aplican después, por si el borrador ya traía una selección.
  const { descartar } = usePreservarFormulario(
    "/productos/nuevo",
    () => getValues(),
    (valores) => reset(valores as FormValues),
    !esEdicion,
  );

  // Creación rápida: aplica los registros creados en /uoms/nuevo y
  // /categorias/nuevo cuando se vuelve con la selección en la URL.
  useSeleccionCreada(
    "categoria_id",
    (nuevoId) => setValue("categoria_id", nuevoId),
    INVALIDAR_CATEGORIAS,
    !esEdicion,
  );
  useSeleccionCreada(
    "uom_base_id",
    (nuevoId) => setValue("uom_base_id", nuevoId),
    INVALIDAR_UOMS,
    !esEdicion,
  );
  useSeleccionCreada(
    "uom_venta_id",
    (nuevoId) => setValue("uom_venta_id", nuevoId),
    INVALIDAR_UOMS,
    !esEdicion,
  );
  useSeleccionCreada(
    "uom_compra_id",
    (nuevoId) => setValue("uom_compra_id", nuevoId),
    INVALIDAR_UOMS,
    !esEdicion,
  );

  const controlaVencimiento = useWatch({ control, name: "controla_vencimiento" });

  useEffect(() => {
    if (controlaVencimiento) {
      setValue("controla_lote", true);
    }
  }, [controlaVencimiento, setValue]);

  useEffect(() => {
    const p = productoQuery.data;
    if (p) {
      reset({
        sku: p.sku,
        nombre: p.nombre,
        descripcion: p.descripcion ?? "",
        categoria_id: p.categoria_id ?? "",
        uom_base_id: p.uom_base_id,
        uom_venta_id: p.uom_venta_id ?? "",
        uom_compra_id: p.uom_compra_id ?? "",
        codigo_barras: p.codigo_barras ?? "",
        peso_unitario: p.peso_unitario?.toString() ?? "",
        volumen_unitario: p.volumen_unitario?.toString() ?? "",
        stock_minimo: p.stock_minimo?.toString() ?? "",
        stock_maximo: p.stock_maximo?.toString() ?? "",
        controla_lote: p.controla_lote,
        controla_vencimiento: p.controla_vencimiento,
        perecedero: p.perecedero,
      });
    }
  }, [productoQuery.data, reset]);

  // Duplicar: precarga los datos del producto origen, pero deja el SKU vacío
  // (debe ser único) para que se defina uno nuevo al guardar como creación.
  useEffect(() => {
    const p = origenQuery.data;
    if (p) {
      reset({
        sku: "",
        nombre: p.nombre,
        descripcion: p.descripcion ?? "",
        categoria_id: p.categoria_id ?? "",
        uom_base_id: p.uom_base_id,
        uom_venta_id: p.uom_venta_id ?? "",
        uom_compra_id: p.uom_compra_id ?? "",
        codigo_barras: p.codigo_barras ?? "",
        peso_unitario: p.peso_unitario?.toString() ?? "",
        volumen_unitario: p.volumen_unitario?.toString() ?? "",
        stock_minimo: p.stock_minimo?.toString() ?? "",
        stock_maximo: p.stock_maximo?.toString() ?? "",
        controla_lote: p.controla_lote,
        controla_vencimiento: p.controla_vencimiento,
        perecedero: p.perecedero,
      });
    }
  }, [origenQuery.data, reset]);

  const guardarMut = useMutation({
    mutationFn: (v: FormValues) =>
      esEdicion
        ? editarProducto(id as string, {
            nombre: v.nombre,
            descripcion: v.descripcion || null,
            categoria_id: v.categoria_id || null,
            uom_venta_id: v.uom_venta_id || null,
            uom_compra_id: v.uom_compra_id || null,
            codigo_barras: v.codigo_barras || null,
            peso_unitario: numeroONull(v.peso_unitario),
            volumen_unitario: numeroONull(v.volumen_unitario),
            stock_minimo: numeroONull(v.stock_minimo),
            stock_maximo: numeroONull(v.stock_maximo),
            controla_lote: v.controla_lote,
            controla_vencimiento: v.controla_vencimiento,
            perecedero: v.perecedero,
          })
        : crearProducto({
            sku: v.sku,
            nombre: v.nombre,
            descripcion: v.descripcion || null,
            categoria_id: v.categoria_id || null,
            uom_base_id: v.uom_base_id,
            uom_venta_id: v.uom_venta_id || null,
            uom_compra_id: v.uom_compra_id || null,
            codigo_barras: v.codigo_barras || null,
            peso_unitario: numeroONull(v.peso_unitario),
            volumen_unitario: numeroONull(v.volumen_unitario),
            stock_minimo: numeroONull(v.stock_minimo),
            stock_maximo: numeroONull(v.stock_maximo),
            controla_lote: v.controla_lote,
            controla_vencimiento: v.controla_vencimiento,
            perecedero: v.perecedero,
          }),
    onSuccess: (producto) => {
      descartar();
      invalidarRecurso(queryClient, "productos", "producto");
      if (volver && campo && !esEdicion) {
        navigate(urlConSeleccion(volver, campo, producto.id));
      } else {
        navigate(catalogoDetalle("productos", producto.id));
      }
    },
    onError: (err) => setError(mensajeError(err)),
  });

  if (esEdicion && productoQuery.isLoading) {
    return <PageHeader title={t.formularios.producto.editar} description={t.comun.cargando} />;
  }

  return (
    <>
      <PageHeader
        title={
          esEdicion
            ? `${t.formularios.producto.editar} — ${productoQuery.data?.sku ?? ""}`
            : duplicarDe
              ? `Duplicar producto — ${origenQuery.data?.sku ?? ""}`
              : t.formularios.producto.nuevo
        }
        description={
          retornaAFormulario
            ? t.formularios.producto.volverConSeleccion
            : duplicarDe
              ? t.formularios.producto.duplicarDesc
              : t.formularios.producto.descripcion
        }
      />

      <form onSubmit={handleSubmit((v) => guardarMut.mutate(v))} noValidate>
        <Card title={t.formularios.datosGenerales}>
          <Card.Body>
            {error ? (
              <ErrorPanel title={t.formularios.producto.noSePudoGuardar} className="mb-4">
                {error}
              </ErrorPanel>
            ) : null}
            <FormGrid columns={2}>
              <Field label={t.campos.sku} htmlFor="sku" required error={errors.sku?.message}>
                <Input id="sku" code disabled={esEdicion} {...register("sku")} />
              </Field>
              <Field
                label={t.comun.nombre}
                htmlFor="nombre"
                required
                error={errors.nombre?.message}
              >
                <Input id="nombre" {...register("nombre")} />
              </Field>
              <Field label={t.campos.categoria} htmlFor="categoria_id">
                <div className="flex items-center gap-2">
                  <div className="flex-1">
                    <Select
                      id="categoria_id"
                      placeholder={t.formularios.producto.sinCategoria}
                      {...register("categoria_id")}
                    >
                      {categorias.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.nombre}
                        </option>
                      ))}
                    </Select>
                  </div>
                  {!esEdicion ? (
                    <CrearRapido campo="categoria_id" rutaNueva={catalogoNuevo("categorias")}>
                      {t.comun.nuevaCategoria}
                    </CrearRapido>
                  ) : null}
                </div>
              </Field>
              <Field
                label={t.campos.uomBase}
                htmlFor="uom_base_id"
                required
                error={errors.uom_base_id?.message}
                help={esEdicion ? t.formularios.producto.uomInmutable : undefined}
              >
                <div className="flex items-center gap-2">
                  <div className="flex-1">
                    <Controller
                      control={control}
                      name="uom_base_id"
                      render={({ field }) => (
                        <Select
                          id="uom_base_id"
                          placeholder={t.formularios.selecciona}
                          disabled={esEdicion}
                          {...field}
                        >
                          {uoms.map((u) => (
                            <option key={u.id} value={u.id}>
                              {u.codigo} — {u.nombre}
                            </option>
                          ))}
                        </Select>
                      )}
                    />
                  </div>
                  {!esEdicion ? (
                    <CrearRapido campo="uom_base_id" rutaNueva={catalogoNuevo("uoms")}>
                      {t.comun.nuevaUom}
                    </CrearRapido>
                  ) : null}
                </div>
              </Field>
              <Field label={t.formularios.producto.uomVenta} htmlFor="uom_venta_id">
                <div className="flex items-center gap-2">
                  <div className="flex-1">
                    <Select
                      id="uom_venta_id"
                      placeholder={t.formularios.producto.igualQueLaBase}
                      {...register("uom_venta_id")}
                    >
                      {uoms.map((u) => (
                        <option key={u.id} value={u.id}>
                          {u.codigo} — {u.nombre}
                        </option>
                      ))}
                    </Select>
                  </div>
                  {!esEdicion ? (
                    <CrearRapido campo="uom_venta_id" rutaNueva={catalogoNuevo("uoms")}>
                      {t.comun.nuevaUom}
                    </CrearRapido>
                  ) : null}
                </div>
              </Field>
              <Field label={t.formularios.producto.uomCompra} htmlFor="uom_compra_id">
                <div className="flex items-center gap-2">
                  <div className="flex-1">
                    <Select
                      id="uom_compra_id"
                      placeholder={t.formularios.producto.igualQueLaBase}
                      {...register("uom_compra_id")}
                    >
                      {uoms.map((u) => (
                        <option key={u.id} value={u.id}>
                          {u.codigo} — {u.nombre}
                        </option>
                      ))}
                    </Select>
                  </div>
                  {!esEdicion ? (
                    <CrearRapido campo="uom_compra_id" rutaNueva={catalogoNuevo("uoms")}>
                      {t.comun.nuevaUom}
                    </CrearRapido>
                  ) : null}
                </div>
              </Field>
              <Field
                label={t.formularios.producto.codigoBarras}
                htmlFor="codigo_barras"
                help={codigoEscaneado ? t.formularios.producto.codigoBarrasPrecargado : undefined}
              >
                <Input id="codigo_barras" code {...register("codigo_barras")} />
              </Field>
              <Field label={t.formularios.producto.pesoUnitario} htmlFor="peso_unitario">
                <Input
                  id="peso_unitario"
                  type="number"
                  step="any"
                  min="0"
                  number
                  {...register("peso_unitario")}
                />
              </Field>
              <Field label={t.formularios.producto.volumenUnitario} htmlFor="volumen_unitario">
                <Input
                  id="volumen_unitario"
                  type="number"
                  step="any"
                  min="0"
                  number
                  {...register("volumen_unitario")}
                />
              </Field>
              <Field label={t.formularios.producto.stockMinimo} htmlFor="stock_minimo">
                <Input
                  id="stock_minimo"
                  type="number"
                  min="0"
                  step="1"
                  number
                  {...register("stock_minimo")}
                />
              </Field>
              <Field label={t.formularios.producto.stockMaximo} htmlFor="stock_maximo">
                <Input
                  id="stock_maximo"
                  type="number"
                  min="0"
                  step="1"
                  number
                  {...register("stock_maximo")}
                />
              </Field>
            </FormGrid>

            <div className="mt-4 flex flex-col gap-2">
              <Checkbox
                id="controla_lote"
                label={t.formularios.producto.controlaLote}
                disabled={controlaVencimiento}
                {...register("controla_lote")}
              />
              <Checkbox
                id="controla_vencimiento"
                label={t.formularios.producto.controlaVencimiento}
                {...register("controla_vencimiento")}
              />
              <Checkbox
                id="perecedero"
                label={t.formularios.producto.perecedero}
                {...register("perecedero")}
              />
            </div>
          </Card.Body>
        </Card>

        <FormActions>
          <Button type="submit" variant="primary" disabled={isSubmitting || guardarMut.isPending}>
            {guardarMut.isPending
              ? "Guardando…"
              : esEdicion
                ? t.formularios.guardarCambios
                : t.formularios.producto.crear}
          </Button>
          <ButtonLink
            variant="secondary"
            href={
              retornaAFormulario
                ? urlConRegreso(volver as string)
                : esEdicion
                  ? catalogoDetalle("productos", id as string)
                  : catalogoLista("productos")
            }
          >
            {t.comun.cancelar}
          </ButtonLink>
        </FormActions>
      </form>
    </>
  );
}
