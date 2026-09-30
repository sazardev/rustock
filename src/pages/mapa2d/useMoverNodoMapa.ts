/** Mutación de guardado de posición/tamaño de un nodo (compartida 2D/3D). */
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { moverPasillo, moverRack, moverUbicacion, moverZona } from "../../shared/backend";
import { useToast } from "../../shared/ui";
import { mensajeError } from "../../shared/format";
import type { PosicionMapaXY, TipoNodo } from "./nodo-tipos";

export function useMoverNodoMapa() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({
      tipo,
      nodoId,
      pos,
    }: {
      tipo: TipoNodo;
      nodoId: string;
      pos: PosicionMapaXY;
    }): Promise<void> => {
      if (tipo === "zona") {
        await moverZona(nodoId, pos);
      } else if (tipo === "pasillo") {
        await moverPasillo(nodoId, pos);
      } else if (tipo === "rack") {
        await moverRack(nodoId, pos);
      } else {
        await moverUbicacion(nodoId, pos);
      }
    },
    onError: (err) => toast(mensajeError(err), "error"),
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["mapa-almacen"] });
    },
  });
}
