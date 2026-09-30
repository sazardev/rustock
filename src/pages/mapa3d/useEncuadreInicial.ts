import { useEffect, useRef } from "react";
import type { ControlsRef } from "./tipos";

/** Encuadra todo el almacen UNA vez al abrir el 3D (sin `?resaltar`, que
 * centra en su nodo). Espera a que OrbitControls exista. */
export function useEncuadreInicial(
  controlsRef: ControlsRef,
  encuadrar: () => void,
  activo: boolean,
) {
  const hecho = useRef(false);
  useEffect(() => {
    if (!activo || hecho.current || !controlsRef.current) {
      return;
    }
    hecho.current = true;
    encuadrar();
  });
}
