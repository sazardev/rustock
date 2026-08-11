import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useState } from "react";
import { Controller, useForm, useWatch } from "react-hook-form";
import { useNavigate, useParams } from "react-router";
import { useMutation, useQuery } from "@tanstack/react-query";
import { z } from "zod";
import {
  crearProducto,
  editarProducto,
  listarCategorias,
  listarUoms,
  obtenerProducto,
} from "../shared/backend";
import { esPaginado } from "../shared/types";
import { catalogoDetalle, catalogoLista } from "../app/route-paths";
import { mensajeError } from "../shared/format";
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

const esquema = z.object({
  sku: z.string().trim().min(1, "El SKU es obligatorio"),
  nombre: z.string().trim().min(1, "El nombre es obligatorio"),
  descripcion: z.string().optional(),
  categoria_id: z.string().optional(),
  uom_base_id: z.string().trim().min(1, "La unidad de medida base es obligatoria"),
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

type FormValues = z.infer<typeof esquema>;

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
  const { id } = useParams<{ id?: string }>();
  const esEdicion = Boolean(id);
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);

  const productoQuery = useQuery({
    queryKey: ["producto", id],
    queryFn: () => obtenerProducto(id as string),
    enabled: esEdicion,
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
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(esquema),
    defaultValues: VALORES_INICIALES,
  });

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
    onSuccess: (producto) => navigate(catalogoDetalle("productos", producto.id)),
    onError: (err) => setError(mensajeError(err)),
  });

  if (esEdicion && productoQuery.isLoading) {
    return <PageHeader title="Editar producto" description="Cargando…" />;
  }

  return (
    <>
      <PageHeader
        title={esEdicion ? `Editar producto — ${productoQuery.data?.sku ?? ""}` : "Nuevo producto"}
        description="El SKU y la unidad de medida base son inmutables una vez creado el producto."
      />

      <form onSubmit={handleSubmit((v) => guardarMut.mutate(v))} noValidate>
        <Card title="Datos generales">
          <Card.Body>
            {error ? (
              <ErrorPanel title="No se pudo guardar el producto" className="mb-4">
                {error}
              </ErrorPanel>
            ) : null}
            <FormGrid columns={2}>
              <Field label="SKU" htmlFor="sku" required error={errors.sku?.message}>
                <Input id="sku" code disabled={esEdicion} {...register("sku")} />
              </Field>
              <Field label="Nombre" htmlFor="nombre" required error={errors.nombre?.message}>
                <Input id="nombre" {...register("nombre")} />
              </Field>
              <Field label="Categoría" htmlFor="categoria_id">
                <Select id="categoria_id" placeholder="Sin categoría" {...register("categoria_id")}>
                  {categorias.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.nombre}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field
                label="UOM base"
                htmlFor="uom_base_id"
                required
                error={errors.uom_base_id?.message}
                help={esEdicion ? "La unidad de medida base no se puede modificar." : undefined}
              >
                <Controller
                  control={control}
                  name="uom_base_id"
                  render={({ field }) => (
                    <Select
                      id="uom_base_id"
                      placeholder="Selecciona"
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
              </Field>
              <Field label="UOM de venta" htmlFor="uom_venta_id">
                <Select
                  id="uom_venta_id"
                  placeholder="Igual que la base"
                  {...register("uom_venta_id")}
                >
                  {uoms.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.codigo} — {u.nombre}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="UOM de compra" htmlFor="uom_compra_id">
                <Select
                  id="uom_compra_id"
                  placeholder="Igual que la base"
                  {...register("uom_compra_id")}
                >
                  {uoms.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.codigo} — {u.nombre}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Código de barras" htmlFor="codigo_barras">
                <Input id="codigo_barras" code {...register("codigo_barras")} />
              </Field>
              <Field label="Peso unitario (kg)" htmlFor="peso_unitario">
                <Input
                  id="peso_unitario"
                  type="number"
                  step="any"
                  min="0"
                  number
                  {...register("peso_unitario")}
                />
              </Field>
              <Field label="Volumen unitario (m³)" htmlFor="volumen_unitario">
                <Input
                  id="volumen_unitario"
                  type="number"
                  step="any"
                  min="0"
                  number
                  {...register("volumen_unitario")}
                />
              </Field>
              <Field label="Stock mínimo" htmlFor="stock_minimo">
                <Input
                  id="stock_minimo"
                  type="number"
                  min="0"
                  step="1"
                  number
                  {...register("stock_minimo")}
                />
              </Field>
              <Field label="Stock máximo" htmlFor="stock_maximo">
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
                label="Controla lote (todo movimiento exige lote)"
                disabled={controlaVencimiento}
                {...register("controla_lote")}
              />
              <Checkbox
                id="controla_vencimiento"
                label="Controla vencimiento (implica controlar lote)"
                {...register("controla_vencimiento")}
              />
              <Checkbox
                id="perecedero"
                label="Perecedero (aplica FEFO en salidas)"
                {...register("perecedero")}
              />
            </div>
          </Card.Body>
        </Card>

        <FormActions>
          <Button type="submit" variant="primary" disabled={isSubmitting || guardarMut.isPending}>
            {guardarMut.isPending ? "Guardando…" : esEdicion ? "Guardar cambios" : "Crear producto"}
          </Button>
          <ButtonLink
            variant="secondary"
            href={
              esEdicion ? catalogoDetalle("productos", id as string) : catalogoLista("productos")
            }
          >
            Cancelar
          </ButtonLink>
        </FormActions>
      </form>
    </>
  );
}
