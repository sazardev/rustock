import { useEffect } from "react";
import { pedirBloqueo, soltarBloqueo } from "./bloqueoRaton";
import { RAD_POR_PIXEL } from "./constantesCaminata";
import type { EntradaCaminata } from "./tiposCaminata";

/** Mirada con el ratón vía Pointer Lock: un clic en el lienzo captura; al
 * soltarlo (Esc del navegador) se sale de la caminata. `sensibilidad` es un
 * multiplicador de las preferencias (1 = base). */
export function useMiradaRaton(
  lienzo: HTMLElement,
  entrada: EntradaCaminata,
  sensibilidad: number,
  habilitado: boolean,
) {
  useEffect(() => {
    if (!habilitado) {
      return;
    }
    let estuvoBloqueado = document.pointerLockElement === lienzo;
    const alClic = () => pedirBloqueo(lienzo);
    const alMover = (ev: MouseEvent) => {
      if (document.pointerLockElement !== lienzo && !entrada.sinBloqueo) {
        return;
      }
      entrada.mirada.yaw -= ev.movementX * RAD_POR_PIXEL * sensibilidad;
      entrada.mirada.pitch -= ev.movementY * RAD_POR_PIXEL * sensibilidad;
    };
    const alCambiar = () => {
      const ahora = document.pointerLockElement === lienzo;
      if (estuvoBloqueado && !ahora) {
        entrada.salir = true;
      }
      estuvoBloqueado = ahora;
    };
    lienzo.addEventListener("click", alClic);
    document.addEventListener("mousemove", alMover);
    document.addEventListener("pointerlockchange", alCambiar);
    return () => {
      lienzo.removeEventListener("click", alClic);
      document.removeEventListener("mousemove", alMover);
      document.removeEventListener("pointerlockchange", alCambiar);
      soltarBloqueo();
    };
  }, [lienzo, entrada, sensibilidad, habilitado]);
}
