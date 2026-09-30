/** Cuánto del interior de un rack se dibuja según el zoom (píxeles de pantalla). */

/** 0 nada, 1 rejilla de bahías, 2 niveles coloreados, 3 con rótulos. */
export type DetalleInterior = 0 | 1 | 2 | 3;

export function detalleInterior(
  anchoPx: number,
  profundoPx: number,
  bahias: number,
  niveles: number,
): DetalleInterior {
  if (anchoPx < 40 || profundoPx < 24 || bahias < 1) {
    return 0;
  }
  const celdaAncho = anchoPx / bahias;
  const celdaAlto = profundoPx / Math.max(niveles, 1);
  if (celdaAlto >= 14 && celdaAncho >= 30) {
    return 3;
  }
  if (celdaAlto >= 7 && celdaAncho >= 8) {
    return 2;
  }
  return celdaAncho >= 6 ? 1 : 0;
}
