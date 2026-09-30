import { useEffect, useRef } from "react";
import { M_POR_UNIDAD } from "../mapa/unidades";
import type { ControlsRef, PosicionXY } from "./tipos";

/** Centra la cámara sobre el nodo de `?resaltar=<id>` una sola vez. */
export function useCentrarResaltado(
  resaltarId: string | null | undefined,
  posicionBase: Map<string, PosicionXY>,
  controlsRef: ControlsRef,
) {
  const centradoHecho = useRef(false);
  useEffect(() => {
    if (!resaltarId || centradoHecho.current) {
      return;
    }
    const pos = posicionBase.get(resaltarId);
    if (!pos || !controlsRef.current) {
      return;
    }
    centradoHecho.current = true;
    controlsRef.current.target.set(pos.x * M_POR_UNIDAD, 0, pos.y * M_POR_UNIDAD);
    controlsRef.current.update();
  }, [resaltarId, posicionBase, controlsRef]);
}
