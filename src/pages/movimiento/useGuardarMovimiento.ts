import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router";
import { useT } from "../../shared/i18n";
import { aprobarMovimiento, crearMovimiento, editarMovimiento } from "../../shared/backend";
import type {
  Movimiento,
  NuevaLinea,
  Producto,
  SubTipoMovimiento,
  TipoMovimiento,
} from "../../shared/types";
import { movimientoDetalle } from "../../app/route-paths";
import { mensajeError } from "../../shared/format";
import { invalidarRecurso } from "../../shared/invalidar";
import { REQUIERE_MOTIVO, requiereDestino, requiereOrigen } from "./reglas";
import type { FormValues } from "./tipos";

/** Validación cliente + mutación (crear/editar, y aprobar si se pidió) del formulario genérico. */
export function useGuardarMovimiento({
  tipo,
  movimiento,
  productosPorId,
  aprobarAlCrear,
  descartar,
}: {
  tipo: TipoMovimiento;
  movimiento?: Movimiento;
  productosPorId: Map<string, Producto>;
  aprobarAlCrear: boolean;
  descartar: () => void;
}) {
  const t = useT();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [error, setError] = useState<string | null>(null);
  const esEdicion = Boolean(movimiento);

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
      setError(t.movForm.errores.subTipoRequerido);
      return;
    }
    if (
      REQUIERE_MOTIVO.includes(valores.sub_tipo as SubTipoMovimiento) &&
      valores.motivo.trim().length < 3
    ) {
      setError(t.movForm.errores.motivoRequerido);
      return;
    }
    for (const linea of valores.lineas) {
      const producto = productosPorId.get(linea.producto_id);
      if (!producto) {
        setError(t.movForm.errores.productoEnTodas);
        return;
      }
      if (producto.controla_lote && !linea.lote_id) {
        setError(`El producto ${producto.sku} controla lote: selecciona un lote en su línea.`);
        return;
      }
      if (requiereOrigen(tipo, valores.sub_tipo) && !linea.origen_ubicacion_id) {
        setError(t.movForm.errores.origenEnTodas);
        return;
      }
      if (requiereDestino(tipo, valores.sub_tipo) && !linea.destino_ubicacion_id) {
        setError(t.movForm.errores.destinoEnTodas);
        return;
      }
    }

    guardarMut.mutate(valores);
  }

  return { error, guardarMut, onSubmit };
}
