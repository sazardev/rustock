import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router";
import { Controller, useFieldArray, useForm, useWatch, type Control } from "react-hook-form";
import {
  aprobarMovimiento,
  crearMovimiento,
  crearTraslado,
  editarMovimiento,
  listarClientes,
  listarLotes,
  listarProductos,
  listarProveedores,
  listarUbicaciones,
  puedo,
  sugerirLineasSalida,
} from "../shared/backend";
import {
  esPaginado,
  type LineaMovimiento,
  type Movimiento,
  type NuevaLinea,
  type Producto,
  type SubTipoMovimiento,
  type TipoMovimiento,
  type TrasladoCreado,
} from "../shared/types";
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
  Select,
  Text,
  Textarea,
} from "../shared/ui";
import { catalogoNuevo, movimientoDetalle, movimientoEditar, PATH } from "../app/route-paths";
import { mensajeError } from "../shared/format";
import { invalidarRecurso } from "../shared/invalidar";
import { CrearRapido, usePreservarFormulario, useSeleccionCreada } from "../shared/creacion-rapida";
import { usePreferencias } from "../shared/preferencias";

/**
 * Ofrece "aprobar de inmediato" cuando la política de la empresa no exige
 * aprobación (`requiere_aprobacion = false`) y el usuario puede aprobar
 * (`movimiento:aprobar`, SPEC §4.3/§4.4). El backend sigue validando en la
 * aprobación real; este toggle solo encadena crear + aprobar.
 */
function useOfrecerAprobar() {
  const requiereAprobacion = usePreferencias((s) => s.resueltas?.requiere_aprobacion);
  const puedoAprobar = useQuery({
    queryKey: ["puedo", "movimiento", "aprobar"],
    queryFn: () => puedo("movimiento", "aprobar"),
  });
  return Boolean(requiereAprobacion === false && puedoAprobar.data);
}

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

const INVALIDAR_PRODUCTOS = ["productos", "selector-movimiento"] as const;
const INVALIDAR_UBICACIONES = ["ubicaciones", "selector-movimiento"] as const;
const INVALIDAR_PROVEEDORES = ["proveedores", "selector-movimiento"] as const;
const INVALIDAR_CLIENTES = ["clientes", "selector-movimiento"] as const;
// Prefijo: invalida los lotes de cualquier producto (["lotes","por-producto",...]).
const INVALIDAR_LOTES = ["lotes", "por-producto"] as const;

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
          <div className="flex items-center gap-2">
            <div className="flex-1">
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
            </div>
            <CrearRapido campo="producto_id" rutaNueva={catalogoNuevo("productos")}>
              Nuevo producto
            </CrearRapido>
          </div>
        </Field>

        {producto?.controla_lote ? (
          <Field label="Lote" required>
            <div className="flex items-center gap-2">
              <div className="flex-1">
                <Controller
                  control={control}
                  name={`lineas.${index}.lote_id`}
                  render={({ field }) => <LoteSelect productoId={productoId} {...field} />}
                />
              </div>
              <CrearRapido campo="lote_id" rutaNueva={catalogoNuevo("lotes")}>
                Nuevo lote
              </CrearRapido>
            </div>
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
            <div className="flex items-center gap-2">
              <div className="flex-1">
                <Controller
                  control={control}
                  name={`lineas.${index}.origen_ubicacion_id`}
                  render={({ field }) => (
                    <Select
                      {...field}
                      aria-label="Ubicación origen"
                      placeholder="Selecciona origen"
                    >
                      {ubicaciones.map((u) => (
                        <option key={u.id} value={u.id}>
                          {u.codigo}
                        </option>
                      ))}
                    </Select>
                  )}
                />
              </div>
              <CrearRapido campo="origen_ubicacion_id" rutaNueva={catalogoNuevo("ubicaciones")}>
                Nueva ubicación
              </CrearRapido>
            </div>
          </Field>
        ) : null}

        {requiereDestino(tipo, subTipo) ? (
          <Field label="Ubicación destino" required>
            <div className="flex items-center gap-2">
              <div className="flex-1">
                <Controller
                  control={control}
                  name={`lineas.${index}.destino_ubicacion_id`}
                  render={({ field }) => (
                    <Select
                      {...field}
                      aria-label="Ubicación destino"
                      placeholder="Selecciona destino"
                    >
                      {ubicaciones.map((u) => (
                        <option key={u.id} value={u.id}>
                          {u.codigo}
                        </option>
                      ))}
                    </Select>
                  )}
                />
              </div>
              <CrearRapido campo="destino_ubicacion_id" rutaNueva={catalogoNuevo("ubicaciones")}>
                Nueva ubicación
              </CrearRapido>
            </div>
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

export function MovimientoGenericoForm({
  tipo,
  movimiento,
  movimientoInicial,
  lineasIniciales = [],
}: {
  tipo: TipoMovimiento;
  /** En modo edición (SPEC §6.2): el movimiento ya existe en BORRADOR o
   *  PENDIENTE_APROBACION y se actualizan sus campos operativos y líneas. */
  movimiento?: Movimiento;
  /** En modo duplicar: se precargan los datos de un movimiento origen para
   *  crear uno nuevo (sin pasar por edición). */
  movimientoInicial?: Movimiento;
  lineasIniciales?: LineaMovimiento[];
}) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [error, setError] = useState<string | null>(null);
  const { productos, ubicaciones, proveedores, clientes } = useCatalogosBasicos();
  const productosPorId = useMemo(() => new Map(productos.map((p) => [p.id, p])), [productos]);
  const esEdicion = Boolean(movimiento);
  const ofrecerAprobar = useOfrecerAprobar();
  const [aprobarAlCrear, setAprobarAlCrear] = useState(false);

  const origen = movimiento ?? movimientoInicial;
  const { control, register, handleSubmit, watch, setValue, getValues, reset } =
    useForm<FormValues>({
      defaultValues: origen
        ? {
            sub_tipo: origen.sub_tipo,
            proveedor_id: origen.proveedor_id ?? "",
            cliente_id: origen.cliente_id ?? "",
            documento_referencia: origen.documento_referencia ?? "",
            fecha_movimiento: (origen.fecha_movimiento || "").slice(0, 16),
            motivo: origen.motivo ?? "",
            notas: origen.notas ?? "",
            lineas: lineasIniciales.length
              ? lineasIniciales.map((l) => ({
                  producto_id: l.producto_id,
                  lote_id: l.lote_id ?? "",
                  cantidad: String(l.cantidad),
                  origen_ubicacion_id: l.origen_ubicacion_id ?? "",
                  destino_ubicacion_id: l.destino_ubicacion_id ?? "",
                }))
              : [LINEA_VACIA],
          }
        : {
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

  // Conserva el borrador al salir a crear un catálogo dependiente (creación
  // rápida) y lo restaura al volver (crear o cancelar). En edición no aplica.
  const { descartar } = usePreservarFormulario(
    "/movimientos/nuevo",
    () => getValues(),
    (valores) => reset(valores as FormValues),
    !esEdicion,
  );

  // Creación rápida: al volver de /productos/nuevo, /lotes/nuevo,
  // /ubicaciones/nuevo, /proveedores/nuevo o /clientes/nuevo, el registro
  // recién creado queda seleccionado (en la primera línea para las de líneas).
  useSeleccionCreada(
    "producto_id",
    (nuevoId) => setValue("lineas.0.producto_id", nuevoId),
    INVALIDAR_PRODUCTOS,
    !esEdicion,
  );
  useSeleccionCreada(
    "lote_id",
    (nuevoId) => setValue("lineas.0.lote_id", nuevoId),
    INVALIDAR_LOTES,
    !esEdicion,
  );
  useSeleccionCreada(
    "origen_ubicacion_id",
    (nuevoId) => setValue("lineas.0.origen_ubicacion_id", nuevoId),
    INVALIDAR_UBICACIONES,
    !esEdicion,
  );
  useSeleccionCreada(
    "destino_ubicacion_id",
    (nuevoId) => setValue("lineas.0.destino_ubicacion_id", nuevoId),
    INVALIDAR_UBICACIONES,
    !esEdicion,
  );
  useSeleccionCreada(
    "proveedor_id",
    (nuevoId) => setValue("proveedor_id", nuevoId),
    INVALIDAR_PROVEEDORES,
    !esEdicion,
  );
  useSeleccionCreada(
    "cliente_id",
    (nuevoId) => setValue("cliente_id", nuevoId),
    INVALIDAR_CLIENTES,
    !esEdicion,
  );

  const guardarMut = useMutation({
    mutationFn: async (valores: FormValues) => {
      const lineas: NuevaLinea[] = valores.lineas.map((l) => ({
        producto_id: l.producto_id,
        lote_id: l.lote_id || null,
        cantidad: Number(l.cantidad),
        origen_ubicacion_id: l.origen_ubicacion_id || null,
        destino_ubicacion_id: l.destino_ubicacion_id || null,
      }));
      if (movimiento) {
        return editarMovimiento(movimiento.id, {
          fecha_movimiento: valores.fecha_movimiento || null,
          motivo: valores.motivo || null,
          proveedor_id: valores.proveedor_id || null,
          cliente_id: valores.cliente_id || null,
          documento_referencia: valores.documento_referencia || null,
          notas: valores.notas || null,
          lineas,
        });
      }
      const creado = await crearMovimiento({
        tipo,
        sub_tipo: valores.sub_tipo as SubTipoMovimiento,
        fecha_movimiento: valores.fecha_movimiento || null,
        motivo: valores.motivo || null,
        proveedor_id: valores.proveedor_id || null,
        cliente_id: valores.cliente_id || null,
        documento_referencia: valores.documento_referencia || null,
        notas: valores.notas || null,
        lineas,
      });
      if (aprobarAlCrear) {
        return aprobarMovimiento(creado.id);
      }
      return creado;
    },
    onSuccess: (movResultado) => {
      if (!esEdicion) descartar();
      invalidarRecurso(queryClient, "movimientos");
      void queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      navigate(movimientoDetalle(movResultado.id));
    },
    onError: (err) => setError(mensajeError(err)),
  });

  function onSubmit(valores: FormValues) {
    setError(null);
    if (!esEdicion && !valores.sub_tipo) {
      setError("Selecciona un sub-tipo de movimiento.");
      return;
    }
    if (
      REQUIERE_MOTIVO.includes(valores.sub_tipo as SubTipoMovimiento) &&
      valores.motivo.trim().length < 3
    ) {
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

    guardarMut.mutate(valores);
  }

  const subTipoOpciones = SUB_TIPOS[tipo] ?? [];

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate>
      <Card title="Datos del movimiento">
        <Card.Body>
          <FormGrid columns={2}>
            <Field label="Sub-tipo" required>
              <Select
                {...register("sub_tipo")}
                aria-label="Sub-tipo"
                placeholder="Selecciona"
                disabled={esEdicion}
              >
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
                <div className="flex items-center gap-2">
                  <div className="flex-1">
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
                  </div>
                  {!esEdicion ? (
                    <CrearRapido campo="proveedor_id" rutaNueva={catalogoNuevo("proveedores")}>
                      Nuevo proveedor
                    </CrearRapido>
                  ) : null}
                </div>
              </Field>
            ) : null}

            {REQUIERE_CLIENTE.includes(subTipo as SubTipoMovimiento) ? (
              <Field label="Cliente">
                <div className="flex items-center gap-2">
                  <div className="flex-1">
                    <Select
                      {...register("cliente_id")}
                      aria-label="Cliente"
                      placeholder="Selecciona"
                    >
                      {clientes.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.nombre}
                        </option>
                      ))}
                    </Select>
                  </div>
                  {!esEdicion ? (
                    <CrearRapido campo="cliente_id" rutaNueva={catalogoNuevo("clientes")}>
                      Nuevo cliente
                    </CrearRapido>
                  ) : null}
                </div>
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
            <ErrorPanel
              title={
                esEdicion ? "No se pudo guardar el movimiento" : "No se pudo crear el movimiento"
              }
              className="mb-4"
            >
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

      {ofrecerAprobar ? (
        <div className="mb-4">
          <Checkbox
            id="aprobar-al-crear"
            label={esEdicion ? "Aprobar de inmediato al guardar" : "Crear y aprobar de inmediato"}
            checked={aprobarAlCrear}
            onChange={(e) => setAprobarAlCrear(e.target.checked)}
          />
          <Text size="xs" color="muted" as="p">
            La política de la empresa no exige aprobación: el movimiento se aprobará al guardar.
          </Text>
        </div>
      ) : null}

      <FormActions>
        <Button type="submit" variant="primary" disabled={guardarMut.isPending}>
          {guardarMut.isPending ? "Guardando…" : esEdicion ? "Guardar cambios" : "Crear movimiento"}
        </Button>
        <ButtonLink
          variant="secondary"
          href={esEdicion ? movimientoEditar(movimiento!.id) : PATH.movimientos}
        >
          Cancelar
        </ButtonLink>
      </FormActions>
    </form>
  );
}

interface TrasladoValues {
  producto_id: string;
  lote_id: string;
  cantidad: string;
  origen_ubicacion_id: string;
  destino_ubicacion_id: string;
  documento_referencia: string;
  notas: string;
}

export function TrasladoForm({
  movimiento,
  movimientoInicial,
  linea,
  lineaInicial,
}: {
  /** En modo edición: el TRASLADO ya existe y se actualizan sus campos. */
  movimiento?: Movimiento;
  /** En modo duplicar: se precargan los datos de un traslado origen. */
  movimientoInicial?: Movimiento;
  linea?: LineaMovimiento;
  lineaInicial?: LineaMovimiento;
}) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [error, setError] = useState<string | null>(null);
  const { productos, ubicaciones } = useCatalogosBasicos();
  const productosPorId = useMemo(() => new Map(productos.map((p) => [p.id, p])), [productos]);
  const esEdicion = Boolean(movimiento);
  const ofrecerAprobar = useOfrecerAprobar();
  const [aprobarAlCrear, setAprobarAlCrear] = useState(false);

  const origenMov = movimiento ?? movimientoInicial;
  const origenLinea = linea ?? lineaInicial;
  const { control, register, handleSubmit, setValue, getValues, reset } = useForm<TrasladoValues>({
    defaultValues: {
      producto_id: origenLinea?.producto_id ?? "",
      lote_id: origenLinea?.lote_id ?? "",
      cantidad: origenLinea ? String(origenLinea.cantidad) : "",
      origen_ubicacion_id: origenLinea?.origen_ubicacion_id ?? "",
      destino_ubicacion_id: origenLinea?.destino_ubicacion_id ?? "",
      documento_referencia: origenMov?.documento_referencia ?? "",
      notas: origenMov?.notas ?? "",
    },
  });
  const productoId = useWatch({ control, name: "producto_id" });
  const producto = productosPorId.get(productoId);

  // Conserva el borrador al salir a crear un catálogo dependiente (creación
  // rápida) y lo restaura al volver (crear o cancelar). En edición no aplica.
  const { descartar } = usePreservarFormulario(
    "/movimientos/nuevo",
    () => getValues(),
    (valores) => reset(valores as TrasladoValues),
    !esEdicion,
  );

  // Creación rápida: al volver de /productos/nuevo, /lotes/nuevo o
  // /ubicaciones/nuevo, el registro recién creado queda seleccionado.
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
    "origen_ubicacion_id",
    (nuevoId) => setValue("origen_ubicacion_id", nuevoId),
    INVALIDAR_UBICACIONES,
    !esEdicion,
  );
  useSeleccionCreada(
    "destino_ubicacion_id",
    (nuevoId) => setValue("destino_ubicacion_id", nuevoId),
    INVALIDAR_UBICACIONES,
    !esEdicion,
  );
  useSeleccionCreada(
    "origen_ubicacion_id",
    (nuevoId) => setValue("origen_ubicacion_id", nuevoId),
    INVALIDAR_UBICACIONES,
    !esEdicion,
  );
  useSeleccionCreada(
    "destino_ubicacion_id",
    (nuevoId) => setValue("destino_ubicacion_id", nuevoId),
    INVALIDAR_UBICACIONES,
    !esEdicion,
  );

  const guardarMut = useMutation({
    mutationFn: async (valores: TrasladoValues): Promise<Movimiento | TrasladoCreado> => {
      const lineas: NuevaLinea[] = [
        {
          producto_id: valores.producto_id,
          lote_id: valores.lote_id || null,
          cantidad: Number(valores.cantidad),
          origen_ubicacion_id: valores.origen_ubicacion_id || null,
          destino_ubicacion_id: valores.destino_ubicacion_id || null,
        },
      ];
      if (movimiento) {
        return editarMovimiento(movimiento.id, {
          documento_referencia: valores.documento_referencia || null,
          notas: valores.notas || null,
          lineas,
        });
      }
      const creado = await crearTraslado({
        producto_id: valores.producto_id,
        lote_id: valores.lote_id || null,
        cantidad: Number(valores.cantidad),
        origen_ubicacion_id: valores.origen_ubicacion_id,
        destino_ubicacion_id: valores.destino_ubicacion_id,
        documento_referencia: valores.documento_referencia || null,
        notas: valores.notas || null,
      });
      if (aprobarAlCrear) {
        await aprobarMovimiento(creado.salida.id);
        if (creado.entrada) {
          await aprobarMovimiento(creado.entrada.id);
        }
      }
      return creado;
    },
    onSuccess: (resultado) => {
      if (!esEdicion) descartar();
      invalidarRecurso(queryClient, "movimientos");
      void queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      const id = "id" in resultado ? resultado.id : resultado.salida.id;
      navigate(movimientoDetalle(id));
    },
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
        guardarMut.mutate(valores);
      })}
      noValidate
    >
      <Card title="Traslado">
        <Card.Body>
          {error ? (
            <ErrorPanel
              title={esEdicion ? "No se pudo guardar el traslado" : "No se pudo crear el traslado"}
              className="mb-4"
            >
              {error}
            </ErrorPanel>
          ) : null}
          <FormGrid columns={2}>
            <Field label="Producto" required>
              <div className="flex items-center gap-2">
                <div className="flex-1">
                  <Select
                    {...register("producto_id")}
                    aria-label="Producto"
                    placeholder="Selecciona"
                  >
                    {productos.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.sku} — {p.nombre}
                      </option>
                    ))}
                  </Select>
                </div>
                {!esEdicion ? (
                  <CrearRapido campo="producto_id" rutaNueva={catalogoNuevo("productos")}>
                    Nuevo producto
                  </CrearRapido>
                ) : null}
              </div>
            </Field>
            {producto?.controla_lote ? (
              <Field label="Lote" required>
                <div className="flex items-center gap-2">
                  <div className="flex-1">
                    <LoteSelect productoId={productoId} {...register("lote_id")} />
                  </div>
                  {!esEdicion ? (
                    <CrearRapido campo="lote_id" rutaNueva={catalogoNuevo("lotes")}>
                      Nuevo lote
                    </CrearRapido>
                  ) : null}
                </div>
              </Field>
            ) : null}
            <Field label="Cantidad" required>
              <Input {...register("cantidad")} type="number" min="0" step="1" number />
            </Field>
            <Field label="Documento de referencia">
              <Input {...register("documento_referencia")} />
            </Field>
            <Field label="Ubicación origen" required>
              <div className="flex items-center gap-2">
                <div className="flex-1">
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
                </div>
                {!esEdicion ? (
                  <CrearRapido campo="origen_ubicacion_id" rutaNueva={catalogoNuevo("ubicaciones")}>
                    Nueva ubicación
                  </CrearRapido>
                ) : null}
              </div>
            </Field>
            <Field label="Ubicación destino" required>
              <div className="flex items-center gap-2">
                <div className="flex-1">
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
                </div>
                {!esEdicion ? (
                  <CrearRapido
                    campo="destino_ubicacion_id"
                    rutaNueva={catalogoNuevo("ubicaciones")}
                  >
                    Nueva ubicación
                  </CrearRapido>
                ) : null}
              </div>
            </Field>
          </FormGrid>
          <Field label="Notas">
            <Textarea {...register("notas")} rows={2} />
          </Field>
        </Card.Body>
      </Card>
      {ofrecerAprobar ? (
        <div className="mb-4">
          <Checkbox
            id="aprobar-traslado"
            label={esEdicion ? "Aprobar de inmediato al guardar" : "Crear y aprobar de inmediato"}
            checked={aprobarAlCrear}
            onChange={(e) => setAprobarAlCrear(e.target.checked)}
          />
          <Text size="xs" color="muted" as="p">
            La política de la empresa no exige aprobación: el traslado se aprobará al guardar.
          </Text>
        </div>
      ) : null}
      <FormActions>
        <Button type="submit" variant="primary" disabled={guardarMut.isPending}>
          {guardarMut.isPending ? "Guardando…" : esEdicion ? "Guardar cambios" : "Crear traslado"}
        </Button>
        <ButtonLink
          variant="secondary"
          href={esEdicion ? movimientoEditar(movimiento!.id) : PATH.movimientos}
        >
          Cancelar
        </ButtonLink>
      </FormActions>
    </form>
  );
}
