import { useEffect } from "react";
import type { NodoMapa } from "../mapa-almacen-datos";

/** Con un nodo seleccionado, Esc lo deselecciona. Las flechas NO se manejan
 * aquí: `useAtajosEditor` las convierte en nudge con historial y semáforo de
 * choques. Tener las dos rutas movía el nodo dos veces por pulsación, y una de
 * ellas sin poder deshacerse. */
export function useAtajosSeleccion({
  seleccionado,
  deseleccionar,
}: {
  seleccionado: NodoMapa | null;
  deseleccionar: () => void;
}) {
  useEffect(() => {
    if (!seleccionado) {
      return;
    }
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        deseleccionar();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [seleccionado, deseleccionar]);
}
