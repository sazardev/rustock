/** Transición suave entre dos encuadres; sin animación si se pide menos movimiento. */
import type { ViewBox } from "../tipos";

const DURACION_MS = 240;

export function prefiereMenosMovimiento(): boolean {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

const suavizar = (t: number) => 1 - (1 - t) ** 3;

/** Devuelve la función que cancela la animación en curso. */
export function animarVista(
  desde: ViewBox,
  hasta: ViewBox,
  aplicar: (v: ViewBox) => void,
): () => void {
  if (prefiereMenosMovimiento()) {
    aplicar(hasta);
    return () => undefined;
  }
  let cuadro = 0;
  const inicio = performance.now();
  const paso = (ahora: number) => {
    const t = Math.min(1, (ahora - inicio) / DURACION_MS);
    const e = suavizar(t);
    aplicar({
      x: desde.x + (hasta.x - desde.x) * e,
      y: desde.y + (hasta.y - desde.y) * e,
      w: desde.w + (hasta.w - desde.w) * e,
      h: desde.h + (hasta.h - desde.h) * e,
    });
    if (t < 1) {
      cuadro = requestAnimationFrame(paso);
    }
  };
  cuadro = requestAnimationFrame(paso);
  return () => cancelAnimationFrame(cuadro);
}
