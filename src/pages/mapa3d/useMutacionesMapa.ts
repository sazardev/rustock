import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  crearEnMapa,
  desactivarPasillo,
  desactivarRack,
  desactivarZona,
  type NodoCreado,
} from "../../shared/backend";
import { useToast } from "../../shared/ui";
import { mensajeError } from "../../shared/format";
import { useT } from "../../shared/i18n";
import { type TipoNodo, useMoverNodoMapa } from "../mapa-almacen-datos";
import { useHistorialMapa } from "../use-historial-mapa";

/** Mutaciones del editor (mover, duplicar, desactivar) más el historial. */
export function useMutacionesMapa(setSeleccionadoId: (id: string | null) => void) {
  const t = useT();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const moverMut = useMoverNodoMapa();
  const hist = useHistorialMapa();

  const crearMut = useMutation({
    mutationFn: crearEnMapa,
    onSuccess: (creado: NodoCreado) => {
      queryClient.invalidateQueries({ queryKey: ["mapa-almacen"] });
      setSeleccionadoId(creado.id);
      hist.registrar({
        kind: "creacion",
        tipo: creado.tipo,
        nodoId: creado.id,
        codigo: creado.codigo,
      });
      toast(`Duplicado como ${creado.codigo}.`, "success");
    },
    onError: (err) => toast(mensajeError(err), "error"),
  });

  const desactivarMut = useMutation({
    mutationFn: async ({ tipo, nodoId }: { tipo: TipoNodo; nodoId: string; codigo?: string }) => {
      if (tipo === "zona") {
        await desactivarZona(nodoId);
      } else if (tipo === "pasillo") {
        await desactivarPasillo(nodoId);
      } else {
        await desactivarRack(nodoId);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["mapa-almacen"] });
      setSeleccionadoId(null);
      toast(t.mapa3d.elementoDesactivado, "success");
    },
    onError: (err) => toast(mensajeError(err), "error"),
  });

  return { moverMut, hist, crearMut, desactivarMut };
}

export type MutacionesMapa = ReturnType<typeof useMutacionesMapa>;
