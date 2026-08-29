/**
 * Anclaje de paneles flotantes de control de formulario (DESIGN §6.4.1).
 *
 * Rustock no tiene popovers de navegación ni modales: la única superposición
 * permitida en un formulario es el panel de un control — la lista de un
 * `Select`, el calendario de un `DatePicker`, las horas de un `TimePicker` —
 * que pertenece al control que lo abrió, no bloquea la página y no muta datos
 * por sí mismo.
 *
 * Este hook resuelve lo único difícil de esos paneles: dónde ponerlos. Calcula
 * una posición fija a partir del rectángulo del disparador, la voltea hacia
 * arriba cuando no hay aire debajo, y la recalcula mientras la página se
 * desplaza o cambia de tamaño para que el panel nunca se despegue del control.
 */
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";

export interface PosicionPanel {
  left: number;
  top: number;
  /** Ancho del disparador: los paneles de lista lo usan como ancho mínimo. */
  minWidth: number;
  /** Alto disponible hasta el borde de la ventana en la dirección elegida. */
  maxHeight: number;
}

export interface AnclajeOpciones {
  /** Alto estimado del panel; decide si se abre hacia abajo o hacia arriba. */
  altoEstimado?: number;
  /** Separación entre el disparador y el panel. */
  separacion?: number;
}

const MARGEN_VENTANA = 8;

/**
 * Devuelve la posición del panel y una función para recalcularla. `null`
 * mientras el panel está cerrado (no se mide lo que no se muestra).
 */
export function useAnclaje(
  abierto: boolean,
  disparadorRef: React.RefObject<HTMLElement | null>,
  { altoEstimado = 280, separacion = 4 }: AnclajeOpciones = {},
): PosicionPanel | null {
  const [posicion, setPosicion] = useState<PosicionPanel | null>(null);

  const medir = useCallback(() => {
    const disparador = disparadorRef.current;
    if (!disparador) return;
    const r = disparador.getBoundingClientRect();
    const aireAbajo = window.innerHeight - r.bottom - MARGEN_VENTANA;
    const aireArriba = r.top - MARGEN_VENTANA;
    // Se abre hacia abajo salvo que no quepa y arriba haya más sitio.
    const haciaArriba = aireAbajo < altoEstimado && aireArriba > aireAbajo;
    const maxHeight = Math.max(120, haciaArriba ? aireArriba : aireAbajo);
    const top = haciaArriba
      ? Math.max(MARGEN_VENTANA, r.top - separacion - Math.min(altoEstimado, maxHeight))
      : r.bottom + separacion;
    // Nunca se sale por la derecha: si el panel es más ancho que el control,
    // se alinea al borde de la ventana en lugar de desbordarla.
    const left = Math.min(r.left, window.innerWidth - r.width - MARGEN_VENTANA);
    setPosicion({
      left: Math.max(MARGEN_VENTANA, left),
      top,
      minWidth: r.width,
      maxHeight,
    });
  }, [disparadorRef, altoEstimado, separacion]);

  useLayoutEffect(() => {
    if (!abierto) return;
    // Sincronización con un sistema externo (la geometría real del DOM): la
    // posición no se puede derivar en render porque hay que medir el
    // disparador ya montado. Se hace en `useLayoutEffect` para que el panel
    // nunca llegue a pintarse en una posición equivocada.
    // Al cerrar no se limpia: la medida anterior queda como estaba y se
    // recalcula antes del siguiente pintado, así reabrir no parpadea.
    // eslint-disable-next-line react/set-state-in-effect
    medir();
  }, [abierto, medir]);

  useEffect(() => {
    if (!abierto) return;
    // `capture` para enterarse también del scroll del lienzo de contenido,
    // que no burbujea hasta la ventana.
    window.addEventListener("scroll", medir, true);
    window.addEventListener("resize", medir);
    return () => {
      window.removeEventListener("scroll", medir, true);
      window.removeEventListener("resize", medir);
    };
  }, [abierto, medir]);

  return posicion;
}

/**
 * Cierra el panel al pulsar fuera de él o del disparador, y al presionar
 * Escape. El foco vuelve siempre al disparador: quien abrió el panel con el
 * teclado no queda huérfano al cerrarlo (WCAG 2.4.3).
 */
export function useCierreExterior(
  abierto: boolean,
  cerrar: (devolverFoco: boolean) => void,
  ...refs: React.RefObject<HTMLElement | null>[]
): void {
  // El array de refs cambia de identidad en cada render (aunque los objetos
  // ref sean estables); se guarda en una caja para no re-suscribir los
  // listeners del documento en cada render.
  const refsRef = useRef(refs);
  useEffect(() => {
    refsRef.current = refs;
  });

  useEffect(() => {
    if (!abierto) return;

    function alPulsar(evento: PointerEvent) {
      const destino = evento.target as Node | null;
      if (!destino) return;
      const dentro = refsRef.current.some((r) => r.current?.contains(destino));
      if (!dentro) cerrar(false);
    }

    function alTeclear(evento: KeyboardEvent) {
      if (evento.key === "Escape") {
        evento.stopPropagation();
        cerrar(true);
      }
    }

    document.addEventListener("pointerdown", alPulsar, true);
    document.addEventListener("keydown", alTeclear, true);
    return () => {
      document.removeEventListener("pointerdown", alPulsar, true);
      document.removeEventListener("keydown", alTeclear, true);
    };
  }, [abierto, cerrar]);
}
