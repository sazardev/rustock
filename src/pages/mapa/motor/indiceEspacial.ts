/** Indice espacial por rejilla hash: consultar un rect toca solo las celdas
 * que cubre, no todos los nodos (clave para el arrastre a 60 fps). */
import type { CuerpoMapa, RectMapa } from "./tipos";

/** Lado de celda del hash (cm): del orden de un rack grande. */
const LADO_CELDA = 200;
const DESPLAZAMIENTO = 1 << 15;

export interface IndiceEspacial {
  cuerpos: readonly CuerpoMapa[];
  porId: (id: string) => CuerpoMapa | undefined;
  /** Cuerpos cuya caja (ampliada `margen` cm) puede tocar el rect. Sin duplicados. */
  consultar: (rect: RectMapa, margen?: number) => CuerpoMapa[];
}

const clave = (cx: number, cy: number) => (cx + DESPLAZAMIENTO) * 65536 + (cy + DESPLAZAMIENTO);
const celdaDe = (v: number) => Math.floor(v / LADO_CELDA);

export function crearIndice(cuerpos: readonly CuerpoMapa[]): IndiceEspacial {
  const celdas = new Map<number, CuerpoMapa[]>();
  const ids = new Map<string, CuerpoMapa>();
  for (const c of cuerpos) {
    ids.set(c.id, c);
    for (let cx = celdaDe(c.x); cx <= celdaDe(c.x + c.ancho); cx++) {
      for (let cy = celdaDe(c.y); cy <= celdaDe(c.y + c.profundo); cy++) {
        const k = clave(cx, cy);
        const lista = celdas.get(k);
        if (lista) {
          lista.push(c);
        } else {
          celdas.set(k, [c]);
        }
      }
    }
  }
  const consultar = (rect: RectMapa, margen = 0): CuerpoMapa[] => {
    const vistos = new Set<CuerpoMapa>();
    const x1 = celdaDe(rect.x + rect.ancho + margen);
    const y1 = celdaDe(rect.y + rect.profundo + margen);
    for (let cx = celdaDe(rect.x - margen); cx <= x1; cx++) {
      for (let cy = celdaDe(rect.y - margen); cy <= y1; cy++) {
        for (const c of celdas.get(clave(cx, cy)) ?? []) {
          vistos.add(c);
        }
      }
    }
    return [...vistos];
  };
  return { cuerpos, porId: (id) => ids.get(id), consultar };
}
