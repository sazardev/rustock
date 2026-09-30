import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router";
import { aprobarMovimiento, crearTraslado, editarMovimiento } from "../../shared/backend";
import type { Movimiento, NuevaLinea, TrasladoCreado } from "../../shared/types";
import { movimientoDetalle } from "../../app/route-paths";
import { mensajeError } from "../../shared/format";
import { invalidarRecurso } from "../../shared/invalidar";
import type { TrasladoValues } from "./tipos";

/** Mutación del traslado: editar, o crear (y aprobar salida/entrada si se pidió). */
export function useGuardarTraslado({
  movimiento,
  aprobarAlCrear,
  descartar,
}: {
  movimiento?: Movimiento;
  aprobarAlCrear: boolean;
  descartar: () => void;
}) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [error, setError] = useState<string | null>(null);
  const esEdicion = Boolean(movimiento);

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

  return { error, setError, guardarMut };
}
