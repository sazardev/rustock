import { useEffect, useRef, type RefObject } from "react";

/** `true` mientras hay un boton del puntero pulsado (orbitar o arrastrar).
 * Las mallas instanciadas lo usan para no hacer picking en pleno gesto: ahorra
 * recorrer instancias en cada movimiento y no frena el arrastre. */
export function usePunteroPulsado(): RefObject<boolean> {
  const pulsado = useRef(false);
  useEffect(() => {
    const abajo = () => {
      pulsado.current = true;
    };
    const arriba = () => {
      pulsado.current = false;
    };
    window.addEventListener("pointerdown", abajo, true);
    window.addEventListener("pointerup", arriba, true);
    window.addEventListener("pointercancel", arriba, true);
    return () => {
      window.removeEventListener("pointerdown", abajo, true);
      window.removeEventListener("pointerup", arriba, true);
      window.removeEventListener("pointercancel", arriba, true);
    };
  }, []);
  return pulsado;
}
