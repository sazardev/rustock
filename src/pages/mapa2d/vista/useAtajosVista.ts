/** Atajos del encuadre con el lienzo enfocado: + / - / 0 y flechas. */
import type { KeyboardEvent } from "react";

const PASO_PAN_PX = 80;
const FACTOR_TECLA = 0.8;

interface Params {
  /** Las flechas mueven el nodo seleccionado (construcción): no desplazan la vista. */
  flechasSonDeNodo: boolean;
  zoomCentrado: (factor: number) => void;
  panPx: (dx: number, dy: number) => void;
  encuadrar: () => void;
}

export function useAtajosVista({ flechasSonDeNodo, zoomCentrado, panPx, encuadrar }: Params) {
  return (e: KeyboardEvent) => {
    if (e.ctrlKey || e.metaKey || e.altKey) {
      return;
    }
    const manejar = (accion: () => void) => {
      e.preventDefault();
      accion();
    };
    switch (e.key) {
      case "+":
      case "=":
        return manejar(() => zoomCentrado(FACTOR_TECLA));
      case "-":
      case "_":
        return manejar(() => zoomCentrado(1 / FACTOR_TECLA));
      case "0":
        return manejar(encuadrar);
    }
    if (flechasSonDeNodo) {
      return;
    }
    switch (e.key) {
      case "ArrowLeft":
        return manejar(() => panPx(-PASO_PAN_PX, 0));
      case "ArrowRight":
        return manejar(() => panPx(PASO_PAN_PX, 0));
      case "ArrowUp":
        return manejar(() => panPx(0, -PASO_PAN_PX));
      case "ArrowDown":
        return manejar(() => panPx(0, PASO_PAN_PX));
    }
  };
}
