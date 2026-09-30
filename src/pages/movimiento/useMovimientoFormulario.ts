import { useFieldArray, useForm } from "react-hook-form";
import type { LineaMovimiento, Movimiento } from "../../shared/types";
import { usePreservarFormulario, useSeleccionCreada } from "../../shared/creacion-rapida";
import {
  INVALIDAR_CLIENTES,
  INVALIDAR_LOTES,
  INVALIDAR_PRODUCTOS,
  INVALIDAR_PROVEEDORES,
  INVALIDAR_UBICACIONES,
} from "./reglas";
import { LINEA_VACIA, type FormValues } from "./tipos";

function valoresIniciales(
  origen?: Movimiento,
  lineasIniciales: LineaMovimiento[] = [],
): FormValues {
  if (!origen) {
    return {
      sub_tipo: "",
      proveedor_id: "",
      cliente_id: "",
      documento_referencia: "",
      fecha_movimiento: "",
      motivo: "",
      notas: "",
      lineas: [LINEA_VACIA],
    };
  }
  return {
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
  };
}

/** Estado del formulario genérico: valores, líneas, borrador y creación rápida. */
export function useMovimientoFormulario({
  origen,
  lineasIniciales,
  esEdicion,
}: {
  origen?: Movimiento;
  lineasIniciales?: LineaMovimiento[];
  esEdicion: boolean;
}) {
  const { control, register, handleSubmit, watch, setValue, getValues, reset } =
    useForm<FormValues>({ defaultValues: valoresIniciales(origen, lineasIniciales) });
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
  const activa = !esEdicion;
  useSeleccionCreada(
    "producto_id",
    (id) => setValue("lineas.0.producto_id", id),
    INVALIDAR_PRODUCTOS,
    activa,
  );
  useSeleccionCreada("lote_id", (id) => setValue("lineas.0.lote_id", id), INVALIDAR_LOTES, activa);
  useSeleccionCreada(
    "origen_ubicacion_id",
    (id) => setValue("lineas.0.origen_ubicacion_id", id),
    INVALIDAR_UBICACIONES,
    activa,
  );
  useSeleccionCreada(
    "destino_ubicacion_id",
    (id) => setValue("lineas.0.destino_ubicacion_id", id),
    INVALIDAR_UBICACIONES,
    activa,
  );
  useSeleccionCreada(
    "proveedor_id",
    (id) => setValue("proveedor_id", id),
    INVALIDAR_PROVEEDORES,
    activa,
  );
  useSeleccionCreada("cliente_id", (id) => setValue("cliente_id", id), INVALIDAR_CLIENTES, activa);

  return {
    control,
    register,
    handleSubmit,
    fields,
    append,
    remove,
    replace,
    subTipo,
    descartar,
  };
}
