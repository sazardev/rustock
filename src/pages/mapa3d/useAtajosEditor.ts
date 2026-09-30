import { useEffect, useRef } from "react";
import { PASO_REJILLA } from "../mapa-geometria";
import { esCampoDeTexto } from "./utils";

/** Acciones que invocan los atajos; se leen por ref para no re-suscribir. */
export interface AccionesAtajos {
  deshacer: () => void;
  rehacer: () => void;
  nudgear: (dx: number, dy: number) => void;
  rotar: () => void;
  duplicar: () => void;
  enfocar: (id: string) => void;
  alternarCaminar: () => void;
  alternarAlambre: () => void;
  /** Caminando, las teclas son del caminante (`caminata/`): aquí no se hace nada. */
  caminando: boolean;
}

/** Atajos estilo editor 3D: Ctrl+Z/Y historial; flechas nudge; R rotar;
 * F enfocar; Shift+D duplicar; Z alambre; C entra a caminar. */
export function useAtajosEditor(acciones: AccionesAtajos, seleccionadoId: string | null) {
  const ref = useRef(acciones);
  ref.current = acciones;

  useEffect(() => {
    const onKeyDown = (ev: KeyboardEvent) => {
      if (esCampoDeTexto(ev.target)) {
        return;
      }
      const a = ref.current;
      const k = ev.key.toLowerCase();
      if (a.caminando) {
        return;
      }
      if (ev.ctrlKey || ev.metaKey) {
        atajoHistorial(ev, k, a);
        return;
      }
      if (ev.shiftKey && k === "d") {
        ev.preventDefault();
        a.duplicar();
        return;
      }
      if (ev.shiftKey) {
        return;
      }
      atajoSimple(ev, k, a, seleccionadoId);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [seleccionadoId]);
}

function atajoHistorial(ev: KeyboardEvent, k: string, a: AccionesAtajos) {
  if (ev.altKey) {
    return;
  }
  if (k === "z") {
    ev.preventDefault();
    if (ev.shiftKey) {
      a.rehacer();
    } else {
      a.deshacer();
    }
  } else if (k === "y") {
    ev.preventDefault();
    a.rehacer();
  }
}

const NUDGE_POR_TECLA: Record<string, [number, number]> = {
  arrowleft: [-PASO_REJILLA, 0],
  arrowright: [PASO_REJILLA, 0],
  arrowup: [0, -PASO_REJILLA],
  arrowdown: [0, PASO_REJILLA],
};

function atajoSimple(
  ev: KeyboardEvent,
  k: string,
  a: AccionesAtajos,
  seleccionadoId: string | null,
) {
  const nudge = NUDGE_POR_TECLA[k];
  if (nudge) {
    ev.preventDefault();
    a.nudgear(nudge[0], nudge[1]);
  } else if (k === "r") {
    ev.preventDefault();
    a.rotar();
  } else if (k === "f") {
    ev.preventDefault();
    if (seleccionadoId) {
      a.enfocar(seleccionadoId);
    }
  } else if (k === "z") {
    ev.preventDefault();
    a.alternarAlambre();
  } else if (k === "c") {
    ev.preventDefault();
    if (!ev.repeat) {
      a.alternarCaminar();
    }
  }
}
