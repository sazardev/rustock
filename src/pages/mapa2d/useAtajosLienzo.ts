/** Atajos de teclado del lienzo en modo construcción. */
import { useEffect } from "react";
import { LADO_MINIMO, PASO_REJILLA } from "../mapa-geometria";
import type { NodoMapa } from "./nodo-tipos";
import type { OnMoverNodo } from "./tipos";

const TAGS_DE_CAMPO = ["INPUT", "TEXTAREA", "SELECT"];
const FLECHAS = ["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"];

function enCampo(target: EventTarget | null): boolean {
  return target instanceof HTMLElement && TAGS_DE_CAMPO.includes(target.tagName);
}

/** Esc deselecciona y aborta un gesto en curso. */
export function useEscapeLienzo(
  cancelarGesto: () => void,
  onSeleccionar: (id: string | null) => void,
) {
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== "Escape" || !(e.target instanceof HTMLElement) || enCampo(e.target)) {
        return;
      }
      cancelarGesto();
      onSeleccionar(null);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [cancelarGesto, onSeleccionar]);
}

/** Flechas mueven el nodo seleccionado; Shift+flechas lo redimensionan
 * (accesibilidad de los tiradores). */
export function useFlechasNodo(
  construir: boolean,
  seleccionId: string | null,
  nodoPorId: Map<string, NodoMapa>,
  onMover: OnMoverNodo,
) {
  useEffect(() => {
    if (!construir || !seleccionId) {
      return;
    }
    const onKeyDown = (e: KeyboardEvent) => {
      if (!FLECHAS.includes(e.key) || enCampo(e.target)) {
        return;
      }
      const n = nodoPorId.get(seleccionId);
      if (!n || n.pos_x === null || n.pos_y === null) {
        return;
      }
      e.preventDefault();
      const dx = (e.key === "ArrowLeft" ? -1 : e.key === "ArrowRight" ? 1 : 0) * PASO_REJILLA;
      const dy = (e.key === "ArrowUp" ? -1 : e.key === "ArrowDown" ? 1 : 0) * PASO_REJILLA;
      if (e.shiftKey) {
        onMover(
          n.tipo,
          n.id,
          n.pos_x,
          n.pos_y,
          n.pos_z,
          n.altura,
          Math.max(LADO_MINIMO, Math.round(n.ancho + dx)),
          Math.max(LADO_MINIMO, Math.round(n.profundidad + dy)),
        );
      } else {
        onMover(
          n.tipo,
          n.id,
          Math.round(n.pos_x + dx),
          Math.round(n.pos_y + dy),
          n.pos_z,
          n.altura,
          n.ancho,
          n.profundidad,
        );
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [construir, seleccionId, nodoPorId, onMover]);
}
