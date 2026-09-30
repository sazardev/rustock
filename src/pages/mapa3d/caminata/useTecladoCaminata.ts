import { useEffect } from "react";
import { esCampoDeTexto } from "../utils";
import type { EntradaCaminata, TeclasCaminata } from "./tiposCaminata";

const TECLA_A_ACCION: Record<string, keyof TeclasCaminata> = {
  KeyW: "adelante",
  ArrowUp: "adelante",
  KeyS: "atras",
  ArrowDown: "atras",
  KeyA: "izquierda",
  ArrowLeft: "izquierda",
  KeyD: "derecha",
  ArrowRight: "derecha",
  KeyC: "agachar",
  ControlLeft: "agachar",
  ControlRight: "agachar",
  ShiftLeft: "correr",
  ShiftRight: "correr",
};

/** WASD y flechas mueven, Shift corre, C o Ctrl agacha, Esc sale. Solo anota
 * el estado de las teclas: el movimiento lo hace el bucle de fotograma. */
export function useTecladoCaminata(entrada: EntradaCaminata) {
  useEffect(() => {
    const poner = (ev: KeyboardEvent, valor: boolean) => {
      if (valor && esCampoDeTexto(ev.target)) {
        return;
      }
      if (valor && ev.code === "Escape") {
        entrada.salir = true;
        return;
      }
      const accion = TECLA_A_ACCION[ev.code];
      if (!accion) {
        return;
      }
      entrada.teclas[accion] = valor;
      // Shift suelto fuera de la ventana no debe dejar la carrera pegada.
      entrada.teclas.correr = ev.shiftKey;
      if (ev.ctrlKey || accion !== "agachar") {
        ev.preventDefault();
      }
    };
    const abajo = (ev: KeyboardEvent) => poner(ev, true);
    const arriba = (ev: KeyboardEvent) => poner(ev, false);
    const soltarTodo = () => {
      for (const k of Object.keys(entrada.teclas) as (keyof TeclasCaminata)[]) {
        entrada.teclas[k] = false;
      }
    };
    window.addEventListener("keydown", abajo);
    window.addEventListener("keyup", arriba);
    window.addEventListener("blur", soltarTodo);
    return () => {
      window.removeEventListener("keydown", abajo);
      window.removeEventListener("keyup", arriba);
      window.removeEventListener("blur", soltarTodo);
      soltarTodo();
    };
  }, [entrada]);
}
