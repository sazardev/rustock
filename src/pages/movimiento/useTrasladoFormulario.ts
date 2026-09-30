import { useForm, useWatch } from "react-hook-form";
import type { LineaMovimiento, Movimiento } from "../../shared/types";
import { usePreservarFormulario, useSeleccionCreada } from "../../shared/creacion-rapida";
import { INVALIDAR_LOTES, INVALIDAR_PRODUCTOS, INVALIDAR_UBICACIONES } from "./reglas";
import type { TrasladoValues } from "./tipos";

/** Estado del formulario de traslado: valores, borrador y creación rápida. */
export function useTrasladoFormulario({
  origenMov,
  origenLinea,
  esEdicion,
}: {
  origenMov?: Movimiento;
  origenLinea?: LineaMovimiento;
  esEdicion: boolean;
}) {
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
  const activa = !esEdicion;
  useSeleccionCreada(
    "producto_id",
    (id) => setValue("producto_id", id),
    INVALIDAR_PRODUCTOS,
    activa,
  );
  useSeleccionCreada("lote_id", (id) => setValue("lote_id", id), INVALIDAR_LOTES, activa);
  useSeleccionCreada(
    "origen_ubicacion_id",
    (id) => setValue("origen_ubicacion_id", id),
    INVALIDAR_UBICACIONES,
    activa,
  );
  useSeleccionCreada(
    "destino_ubicacion_id",
    (id) => setValue("destino_ubicacion_id", id),
    INVALIDAR_UBICACIONES,
    activa,
  );

  return { register, handleSubmit, productoId, descartar };
}
