import { useMemo, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router";
import { Controller, useFieldArray, useForm, useWatch, type Control } from "react-hook-form";
import {
  crearMovimiento,
  crearTraslado,
  listarClientes,
  listarLotes,
  listarProductos,
  listarProveedores,
  listarUbicaciones,
  sugerirLineasSalida,
} from "../shared/backend";
import {
  esPaginado,
  type NuevaLinea,
  type Producto,
  type SubTipoMovimiento,
  type TipoMovimiento,
} from "../shared/types";
import {
  Button,
  ButtonLink,
  Card,
  ErrorPanel,
  Field,
  FormActions,
  FormGrid,
  Input,
  Select,
  Textarea,
} from "../shared/ui";
import { movimientoDetalle, PATH } from "../app/route-paths";
import { mensajeError } from "../shared/format";

export const TIPOS: Array<{ value: TipoMovimiento; label: string }> = [
  { value: "ENTRADA", label: "Entrada" },
  { value: "SALIDA", label: "Salida" },
  { value: "TRASLADO", label: "Traslado" },
  { value: "AJUSTE", label: "Ajuste" },
];

const SUB_TIPOS: Record<string, Array<{ value: SubTipoMovimiento; label: string }>> = {
  ENTRADA: [
    { value: "COMPRA", label: "Recepción de compra" },
    { value: "DEVOLUCION_CLIENTE", label: "Devolución de cliente" },
    { value: "INICIAL", label: "Entrada inicial (apertura)" },
  ],
  SALIDA: [
    { value: "CLIENTE", label: "Despacho a cliente" },
    { value: "DEVOLUCION_PROVEEDOR", label: "Devolución a proveedor" },
    { value: "MERMA", label: "Merma" },
  ],
  AJUSTE: [
    { value: "AJUSTE_POSITIVO", label: "Ajuste positivo (sobrante)" },
    { value: "AJUSTE_NEGATIVO", label: "Ajuste negativo (faltante)" },
  ],
};

const REQUIERE_MOTIVO: SubTipoMovimiento[] = ["AJUSTE_POSITIVO", "AJUSTE_NEGATIVO", "MERMA"];
const REQUIERE_PROVEEDOR: SubTipoMovimiento[] = ["COMPRA", "DEVOLUCION_PROVEEDOR"];
const REQUIERE_CLIENTE: SubTipoMovimiento[] = ["CLIENTE", "DEVOLUCION_CLIENTE"];

function requiereOrigen(tipo: TipoMovimiento, subTipo: SubTipoMovimiento | ""): boolean {
  return tipo === "SALIDA" || (tipo === "AJUSTE" && subTipo === "AJUSTE_NEGATIVO");
}

function requiereDestino(tipo: TipoMovimiento, subTipo: SubTipoMovimiento | ""): boolean {
  return tipo === "ENTRADA" || (tipo === "AJUSTE" && subTipo === "AJUSTE_POSITIVO");
}

interface FormValues {
  sub_tipo: SubTipoMovimiento | "";
  proveedor_id: string;
  cliente_id: string;
  documento_referencia: string;
  fecha_movimiento: string;
  motivo: string;
  notas: string;
  lineas: Array<{
    producto_id: string;
    lote_id: string;
    cantidad: string;
    origen_ubicacion_id: string;
    destino_ubicacion_id: string;
  }>;
}

const LINEA_VACIA: FormValues["lineas"][number] = {
  producto_id: "",
  lote_id: "",
  cantidad: "",
  origen_ubicacion_id: "",
  destino_ubicacion_id: "",
};

function useCatalogosBasicos() {
  const productos = useQuery({
    queryKey: ["productos", "selector-movimiento"],
    queryFn: () => listarProductos({ page_size: 200, sort: "nombre" }),
  });
  const ubicaciones = useQuery({
    queryKey: ["ubicaciones", "selector-movimiento"],
    queryFn: () => listarUbicaciones({ page_size: 200, sort: "codigo" }),
  });
  const proveedores = useQuery({
    queryKey: ["proveedores", "selector-movimiento"],
    queryFn: () => listarProveedores({ page_size: 200, sort: "nombre" }),
  });
  const clientes = useQuery({
    queryKey: ["clientes", "selector-movimiento"],
    queryFn: () => listarClientes({ page_size: 200, sort: "nombre" }),
  });

  return {
    productos: productos.data && esPaginado(productos.data) ? productos.data.data : [],
    ubicaciones: ubicaciones.data && esPaginado(ubicaciones.data) ? ubicaciones.data.data : [],
    proveedores: proveedores.data && esPaginado(proveedores.data) ? proveedores.data.data : [],
    clientes: clientes.data && esPaginado(clientes.data) ? clientes.data.data : [],
  };
}

function LoteSelect({ productoId, ...rest }: { productoId: string } & Record<string, unknown>) {
  const lotesQuery = useQuery({
    queryKey: ["lotes", "por-producto", productoId],
    queryFn: () => listarLotes({ filters: [`producto_id:eq:${productoId}`], page_size: 200 }),
    enabled: Boolean(productoId),
  });
  const lotes = lotesQuery.data && esPaginado(lotesQuery.data) ? lotesQuery.data.data : [];

  return (
    <Select aria-label="Lote" placeholder="Selecciona un lote" {...rest}>
      {lotes.map((l) => (
        <option key={l.id} value={l.id}>
          {l.numero}
          {l.fecha_vencimiento ? ` — vence ${l.fecha_vencimiento.slice(0, 10)}` : ""}
        </option>
      ))}
    </Select>
  );
}

interface LineaFieldsProps {
  control: Control<FormValues>;
  index: number;
  tipo: TipoMovimiento;
  subTipo: SubTipoMovimiento | "";
  productos: Producto[];
  ubicaciones: Array<{ id: string; codigo: string }>;
  onRemove: () => void;
  canRemove: boolean;
}

function LineaFields({
  control,
  index,
  tipo,
  subTipo,
  productos,
  ubicaciones,
  onRemove,
  canRemove,
}: LineaFieldsProps) {
  const productoId = useWatch({ control, name: `lineas.${index}.producto_id` });
  const producto = productos.find((p) => p.id === productoId);

  return (
    <div className="mb-4 rounded-md border border-gray-200 p-4">
      <FormGrid columns={2}>
        <Field label="Producto" required>
          <Controller
            control={control}
            name={`lineas.${index}.producto_id`}
            render={({ field }) => (
              <Select {...field} aria-label="Producto" placeholder="Selecciona un producto">
                {productos.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.sku} — {p.nombre}
                  </option>
                ))}
              </Select>
            )}
          />
        </Field>

        {producto?.controla_lote ? (
          <Field label="Lote" required>
            <Controller
              control={control}
              name={`lineas.${index}.lote_id`}
              render={({ field }) => <LoteSelect productoId={productoId} {...field} />}
            />
          </Field>
        ) : null}

        <Field label="Cantidad" required>
          <Controller
            control={control}
            name={`lineas.${index}.cantidad`}
            render={({ field }) => <Input {...field} type="number" min="0" step="1" number />}
          />
        </Field>

        {requiereOrigen(tipo, subTipo) ? (
          <Field label="Ubicación origen" required>
            <Controller
              control={control}
              name={`lineas.${index}.origen_ubicacion_id`}
              render={({ field }) => (
                <Select {...field} aria-label="Ubicación origen" placeholder="Selecciona origen">
                  {ubicaciones.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.codigo}
                    </option>
                  ))}
                </Select>
              )}
            />
          </Field>
        ) : null}

        {requiereDestino(tipo, subTipo) ? (
          <Field label="Ubicación destino" required>
            <Controller
              control={control}
              name={`lineas.${index}.destino_ubicacion_id`}
              render={({ field }) => (
                <Select {...field} aria-label="Ubicación destino" placeholder="Selecciona destino">
                  {ubicaciones.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.codigo}
                    </option>
                  ))}
                </Select>
              )}
            />
          </Field>
        ) : null}
      </FormGrid>

      {canRemove ? (
        <Button type="button" variant="ghost" size="sm" icon="eliminar" onClick={onRemove}>
          Quitar línea
        </Button>
      ) : null}
    </div>
  );
}

function SugerenciaFifoFefo({
  control,
  productos,
  onSugerido,
}: {
  control: Control<FormValues>;
  productos: Producto[];
  onSugerido: (lineas: FormValues["lineas"]) => void;
}) {
  const [productoId, setProductoId] = useState("");
  const [cantidad, setCantidad] = useState("");
  const [error, setError] = useState<string | null>(null);
  const subTipo = useWatch({ control, name: "sub_tipo" });

  const sugerirMut = useMutation({
    mutationFn: () =>
      sugerirLineasSalida({
        productoId,
        cantidad: Number(cantidad),
        subTipo: subTipo || "CLIENTE",
      }),
    onSuccess: (sugerencias) => {
      setError(null);
      onSugerido(
        sugerencias.map((s) => ({
          producto_id: productoId,
          lote_id: s.lote_id ?? "",
          cantidad: String(s.cantidad),
          origen_ubicacion_id: s.ubicacion_id,
          destino_ubicacion_id: "",
        })),
      );
    },
    onError: (err) => setError(mensajeError(err)),
  });

  return (
    <Card muted className="mb-4">
      <Card.Body>
        <FormGrid columns={2}>
          <Field label="Producto a despachar">
            <Select
              aria-label="Producto a despachar"
              placeholder="Selecciona un producto"
              value={productoId}
              onChange={(e) => setProductoId(e.target.value)}
            >
              {productos.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.sku} — {p.nombre}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Cantidad total">
            <Input
              type="number"
              min="0"
              step="1"
              number
              value={cantidad}
              onChange={(e) => setCantidad(e.target.value)}
            />
          </Field>
        </FormGrid>
        {error ? (
          <ErrorPanel title="No se pudo sugerir" className="mt-2">
            {error}
          </ErrorPanel>
        ) : null}
        <Button
          type="button"
          variant="secondary"
          size="sm"
          icon="filtrar"
          disabled={!productoId || !cantidad || sugerirMut.isPending}
          onClick={() => sugerirMut.mutate()}
        >
          Sugerir FIFO/FEFO
        </Button>
      </Card.Body>
    </Card>
  );
}

export function MovimientoGenericoForm({ tipo }: { tipo: TipoMovimiento }) {
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);
  const { productos, ubicaciones, proveedores, clientes } = useCatalogosBasicos();
  const productosPorId = useMemo(() => new Map(productos.map((p) => [p.id, p])), [productos]);

  const { control, register, handleSubmit, watch } = useForm<FormValues>({
    defaultValues: {
      sub_tipo: "",
      proveedor_id: "",
      cliente_id: "",
      documento_referencia: "",
      fecha_movimiento: "",
      motivo: "",
      notas: "",
      lineas: [LINEA_VACIA],
    },
  });
  const { fields, append, remove, replace } = useFieldArray({ control, name: "lineas" });
  const subTipo = watch("sub_tipo");

  const crearMut = useMutation({
    mutationFn: (nuevo: Parameters<typeof crearMovimiento>[0]) => crearMovimiento(nuevo),
    onSuccess: (movimiento) => navigate(movimientoDetalle(movimiento.id)),
    onError: (err) => setError(mensajeError(err)),
  });

  function onSubmit(valores: FormValues) {
    setError(null);
    if (!valores.sub_tipo) {
      setError("Selecciona un sub-tipo de movimiento.");
      return;
    }
    if (REQUIERE_MOTIVO.includes(valores.sub_tipo) && valores.motivo.trim().length < 3) {
      setError("El motivo es obligatorio (mínimo 3 caracteres) para este tipo de movimiento.");
      return;
    }
    for (const linea of valores.lineas) {
      const producto = productosPorId.get(linea.producto_id);
      if (!producto) {
        setError("Todas las líneas deben tener un producto seleccionado.");
        return;
      }
      if (producto.controla_lote && !linea.lote_id) {
        setError(`El producto ${producto.sku} controla lote: selecciona un lote en su línea.`);
        return;
      }
      if (requiereOrigen(tipo, valores.sub_tipo) && !linea.origen_ubicacion_id) {
        setError("Selecciona la ubicación de origen en cada línea.");
        return;
      }
      if (requiereDestino(tipo, valores.sub_tipo) && !linea.destino_ubicacion_id) {
        setError("Selecciona la ubicación de destino en cada línea.");
        return;
      }
    }

    const lineas: NuevaLinea[] = valores.lineas.map((l) => ({
      producto_id: l.producto_id,
      lote_id: l.lote_id || null,
      cantidad: Number(l.cantidad),
      origen_ubicacion_id: l.origen_ubicacion_id || null,
      destino_ubicacion_id: l.destino_ubicacion_id || null,
    }));

    crearMut.mutate({
      tipo,
      sub_tipo: valores.sub_tipo,
      fecha_movimiento: valores.fecha_movimiento || null,
      motivo: valores.motivo || null,
      proveedor_id: valores.proveedor_id || null,
      cliente_id: valores.cliente_id || null,
      documento_referencia: valores.documento_referencia || null,
      notas: valores.notas || null,
      lineas,
    });
  }

  const subTipoOpciones = SUB_TIPOS[tipo] ?? [];

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate>
      <Card title="Datos del movimiento">
        <Card.Body>
          <FormGrid columns={2}>
            <Field label="Sub-tipo" required>
              <Select {...register("sub_tipo")} aria-label="Sub-tipo" placeholder="Selecciona">
                {subTipoOpciones.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Documento de referencia">
              <Input
                {...register("documento_referencia")}
                placeholder="N.º de OC, guía, factura…"
              />
            </Field>

            {REQUIERE_PROVEEDOR.includes(subTipo as SubTipoMovimiento) ? (
              <Field label="Proveedor">
                <Select
                  {...register("proveedor_id")}
                  aria-label="Proveedor"
                  placeholder="Selecciona"
                >
                  {proveedores.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.nombre}
                    </option>
                  ))}
                </Select>
              </Field>
            ) : null}

            {REQUIERE_CLIENTE.includes(subTipo as SubTipoMovimiento) ? (
              <Field label="Cliente">
                <Select {...register("cliente_id")} aria-label="Cliente" placeholder="Selecciona">
                  {clientes.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.nombre}
                    </option>
                  ))}
                </Select>
              </Field>
            ) : null}

            <Field label="Fecha del movimiento">
              <Input {...register("fecha_movimiento")} type="datetime-local" />
            </Field>

            <Field label="Motivo" required={REQUIERE_MOTIVO.includes(subTipo as SubTipoMovimiento)}>
              <Input {...register("motivo")} placeholder="Motivo de la operación" />
            </Field>
          </FormGrid>
          <Field label="Notas">
            <Textarea {...register("notas")} rows={2} />
          </Field>
        </Card.Body>
      </Card>

      {tipo === "SALIDA" ? (
        <SugerenciaFifoFefo control={control} productos={productos} onSugerido={replace} />
      ) : null}

      <Card title="Líneas">
        <Card.Body>
          {error ? (
            <ErrorPanel title="No se pudo crear el movimiento" className="mb-4">
              {error}
            </ErrorPanel>
          ) : null}
          {fields.map((field, index) => (
            <LineaFields
              key={field.id}
              control={control}
              index={index}
              tipo={tipo}
              subTipo={subTipo}
              productos={productos}
              ubicaciones={ubicaciones}
              onRemove={() => remove(index)}
              canRemove={fields.length > 1}
            />
          ))}
          <Button
            type="button"
            variant="secondary"
            size="sm"
            icon="agregar"
            onClick={() => append(LINEA_VACIA)}
          >
            Agregar línea
          </Button>
        </Card.Body>
      </Card>

      <FormActions>
        <Button type="submit" variant="primary" disabled={crearMut.isPending}>
          {crearMut.isPending ? "Creando…" : "Crear movimiento"}
        </Button>
        <ButtonLink variant="secondary" href={PATH.movimientos}>
          Cancelar
        </ButtonLink>
      </FormActions>
    </form>
  );
}

export function TrasladoForm() {
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);
  const { productos, ubicaciones } = useCatalogosBasicos();
  const productosPorId = useMemo(() => new Map(productos.map((p) => [p.id, p])), [productos]);

  const { control, register, handleSubmit } = useForm({
    defaultValues: {
      producto_id: "",
      lote_id: "",
      cantidad: "",
      origen_ubicacion_id: "",
      destino_ubicacion_id: "",
      documento_referencia: "",
      notas: "",
    },
  });
  const productoId = useWatch({ control, name: "producto_id" });
  const producto = productosPorId.get(productoId);

  const crearMut = useMutation({
    mutationFn: crearTraslado,
    onSuccess: (resultado) => navigate(movimientoDetalle(resultado.salida.id)),
    onError: (err) => setError(mensajeError(err)),
  });

  return (
    <form
      onSubmit={handleSubmit((valores) => {
        setError(null);
        if (producto?.controla_lote && !valores.lote_id) {
          setError(`El producto ${producto.sku} controla lote: selecciona un lote.`);
          return;
        }
        if (valores.origen_ubicacion_id === valores.destino_ubicacion_id) {
          setError("El origen y el destino no pueden ser la misma ubicación.");
          return;
        }
        crearMut.mutate({
          producto_id: valores.producto_id,
          lote_id: valores.lote_id || null,
          cantidad: Number(valores.cantidad),
          origen_ubicacion_id: valores.origen_ubicacion_id,
          destino_ubicacion_id: valores.destino_ubicacion_id,
          documento_referencia: valores.documento_referencia || null,
          notas: valores.notas || null,
        });
      })}
      noValidate
    >
      <Card title="Traslado">
        <Card.Body>
          {error ? (
            <ErrorPanel title="No se pudo crear el traslado" className="mb-4">
              {error}
            </ErrorPanel>
          ) : null}
          <FormGrid columns={2}>
            <Field label="Producto" required>
              <Select {...register("producto_id")} aria-label="Producto" placeholder="Selecciona">
                {productos.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.sku} — {p.nombre}
                  </option>
                ))}
              </Select>
            </Field>
            {producto?.controla_lote ? (
              <Field label="Lote" required>
                <LoteSelect productoId={productoId} {...register("lote_id")} />
              </Field>
            ) : null}
            <Field label="Cantidad" required>
              <Input {...register("cantidad")} type="number" min="0" step="1" number />
            </Field>
            <Field label="Documento de referencia">
              <Input {...register("documento_referencia")} />
            </Field>
            <Field label="Ubicación origen" required>
              <Select
                {...register("origen_ubicacion_id")}
                aria-label="Ubicación origen"
                placeholder="Selecciona"
              >
                {ubicaciones.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.codigo}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Ubicación destino" required>
              <Select
                {...register("destino_ubicacion_id")}
                aria-label="Ubicación destino"
                placeholder="Selecciona"
              >
                {ubicaciones.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.codigo}
                  </option>
                ))}
              </Select>
            </Field>
          </FormGrid>
          <Field label="Notas">
            <Textarea {...register("notas")} rows={2} />
          </Field>
        </Card.Body>
      </Card>
      <FormActions>
        <Button type="submit" variant="primary" disabled={crearMut.isPending}>
          {crearMut.isPending ? "Creando…" : "Crear traslado"}
        </Button>
        <ButtonLink variant="secondary" href={PATH.movimientos}>
          Cancelar
        </ButtonLink>
      </FormActions>
    </form>
  );
}
