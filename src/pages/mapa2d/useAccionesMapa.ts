/** Mutaciones del mapa (crear, mover, desactivar) con historial deshacer/rehacer. */
import { useEffect, useRef } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  crearEnMapa,
  desactivarPasillo,
  desactivarRack,
  desactivarZona,
} from "../../shared/backend";
import { mensajeError } from "../../shared/format";
import { useT } from "../../shared/i18n";
import { useToast } from "../../shared/ui";
import type { TipoNodo } from "./nodo-tipos";
import { useMoverNodoMapa } from "./useMoverNodoMapa";
import { useHistorialMapa, type EntradaHistorial, type SnapshotPos } from "../use-historial-mapa";

interface Posicion {
  pos_x: number;
  pos_y: number;
  pos_z: number | null;
  altura: number | null;
  ancho?: number;
  profundidad?: number;
}

function aPosicion(s: SnapshotPos): Posicion {
  return {
    pos_x: s.pos_x ?? 0,
    pos_y: s.pos_y ?? 0,
    pos_z: s.pos_z,
    altura: s.altura,
    ancho: s.ancho,
    profundidad: s.profundidad,
  };
}

/** Ctrl/Cmd+Z deshace, Ctrl/Cmd+Shift+Z o Ctrl+Y rehace (fuera de campos). */
function useAtajosHistorial(deshacer: () => void, rehacer: () => void) {
  const deshacerRef = useRef(deshacer);
  deshacerRef.current = deshacer;
  const rehacerRef = useRef(rehacer);
  rehacerRef.current = rehacer;
  useEffect(() => {
    const onKeyDown = (ev: KeyboardEvent) => {
      if (!(ev.ctrlKey || ev.metaKey) || ev.altKey) {
        return;
      }
      const k = ev.key.toLowerCase();
      if (k !== "z" && k !== "y") {
        return;
      }
      const el = ev.target as HTMLElement | null;
      if (el && ["INPUT", "TEXTAREA", "SELECT"].includes(el.tagName)) {
        return;
      }
      ev.preventDefault();
      if (k === "z" && !ev.shiftKey) {
        deshacerRef.current();
      } else {
        rehacerRef.current();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);
}

export function useAccionesMapa(setSeleccionId: (id: string) => void) {
  const t = useT();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const moverMut = useMoverNodoMapa();
  const hist = useHistorialMapa();

  const crearMut = useMutation({
    mutationFn: crearEnMapa,
    onSuccess: (creado) => {
      queryClient.invalidateQueries({ queryKey: ["mapa-almacen"] });
      setSeleccionId(creado.id);
      hist.registrar({
        kind: "creacion",
        tipo: creado.tipo,
        nodoId: creado.id,
        codigo: creado.codigo,
      });
      toast(t.mapa.creado({ codigo: creado.codigo }), "success");
    },
    onError: (err) => toast(mensajeError(err), "error"),
  });

  /** Aplica posición/tamaño vía mover_*; con `entry` lo registra en el
   * historial solo cuando el backend confirma (un rechazo no ensucia la
   * pila de deshacer). */
  function aplicarPosicion(
    tipo: TipoNodo,
    nodoId: string,
    pos: Posicion,
    entry?: EntradaHistorial,
  ) {
    moverMut.mutate(
      { tipo, nodoId, pos },
      { onSuccess: entry ? () => hist.registrar(entry) : undefined },
    );
  }

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
    onSuccess: (_d, vars) => {
      queryClient.invalidateQueries({ queryKey: ["mapa-almacen"] });
      toast(t.mapa.creacionDeshecha({ codigo: vars.codigo || t.mapa.elemento }), "success");
    },
    onError: (err) => toast(mensajeError(err), "error"),
  });

  function deshacer() {
    const e = hist.deshacer();
    if (!e || desactivarMut.isPending) {
      return;
    }
    if (e.kind === "mover" && e.antes) {
      aplicarPosicion(e.tipo, e.nodoId, aPosicion(e.antes));
      toast(t.mapa.cambioDeshecho, "success");
      return;
    }
    if (e.kind !== "creacion") {
      return; // el 2D no genera entradas grupales
    }
    desactivarMut.mutate({ tipo: e.tipo, nodoId: e.nodoId, codigo: e.codigo });
  }

  function rehacer() {
    const e = hist.rehacer();
    if (!e || e.kind !== "mover" || !e.despues) {
      return;
    }
    aplicarPosicion(e.tipo, e.nodoId, aPosicion(e.despues));
    toast(t.mapa.cambioRehecho, "success");
  }

  useAtajosHistorial(deshacer, rehacer);

  return {
    crearMut,
    aplicarPosicion,
    deshacer,
    rehacer,
    puedeDeshacer: hist.puedeDeshacer && !moverMut.isPending && !desactivarMut.isPending,
    puedeRehacer: hist.puedeRehacer && !moverMut.isPending,
  };
}
