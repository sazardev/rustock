/** Pinza y pan con dos dedos (Pointer Events multitáctil) sobre el lienzo. */
import { useRef, type PointerEvent } from "react";

interface Punto {
  x: number;
  y: number;
}

interface Params {
  /** Se llama al formarse la pinza: el gesto de un dedo en curso se descarta. */
  alIniciar: () => void;
  alMover: (factor: number, previo: Punto, actual: Punto) => void;
}

const medio = (a: Punto, b: Punto): Punto => ({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 });
const distancia = (a: Punto, b: Punto) => Math.hypot(a.x - b.x, a.y - b.y) || 1;

export function usePinzaLienzo({ alIniciar, alMover }: Params) {
  const punteros = useRef(new Map<number, Punto>());
  const previo = useRef<{ medio: Punto; dist: number } | null>(null);

  const medir = () => {
    const [a, b] = [...punteros.current.values()];
    return { medio: medio(a, b), dist: distancia(a, b) };
  };

  /** Captura: corre antes que los gestos de nodos y fondo. */
  const onPointerDownCapture = (e: PointerEvent) => {
    if (e.pointerType !== "touch") {
      return;
    }
    punteros.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (punteros.current.size === 2) {
      alIniciar();
      previo.current = medir();
    }
  };

  const onPointerMove = (e: PointerEvent) => {
    const p = punteros.current.get(e.pointerId);
    if (!p) {
      return;
    }
    p.x = e.clientX;
    p.y = e.clientY;
    if (punteros.current.size !== 2 || !previo.current) {
      return;
    }
    const ahora = medir();
    alMover(previo.current.dist / ahora.dist, previo.current.medio, ahora.medio);
    previo.current = ahora;
  };

  const soltar = (e: PointerEvent) => {
    punteros.current.delete(e.pointerId);
    previo.current = null;
    if (punteros.current.size === 2) {
      previo.current = medir();
    }
  };

  return {
    pinzaActiva: () => punteros.current.size >= 2,
    onPointerDownCapture,
    onPointerMove,
    soltar,
  };
}
