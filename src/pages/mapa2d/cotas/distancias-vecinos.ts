/** Distancia (cm) del nodo en edición a sus vecinos más cercanos por lado. */
import type { CuerpoMapa, IndiceEspacial, RectMapa } from "../../mapa/motor";

export type Lado = "izq" | "der" | "arr" | "aba";

export interface Distancia {
  lado: Lado;
  gap: number;
  /** Segmento que mide la separación, en coordenadas del plano. */
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

/** Radio de búsqueda: más allá de esto la distancia no ayuda a alinear. */
const RADIO_CM = 300;
const MIN_GAP = 0.5;

const solapa = (a0: number, a1: number, b0: number, b1: number) =>
  Math.min(a1, b1) - Math.max(a0, b0);

/** Mejor (menor) separación horizontal/vertical entre `r` y un cuerpo que lo mira. */
function evaluar(r: RectMapa, o: RectMapa): Distancia | null {
  const ovY = solapa(r.y, r.y + r.profundo, o.y, o.y + o.profundo);
  const ovX = solapa(r.x, r.x + r.ancho, o.x, o.x + o.ancho);
  if (ovY > 0) {
    const yMed = Math.max(r.y, o.y) + ovY / 2;
    if (o.x >= r.x + r.ancho) {
      const x1 = r.x + r.ancho;
      return { lado: "der", gap: o.x - x1, x1, y1: yMed, x2: o.x, y2: yMed };
    }
    if (o.x + o.ancho <= r.x) {
      const x2 = o.x + o.ancho;
      return { lado: "izq", gap: r.x - x2, x1: x2, y1: yMed, x2: r.x, y2: yMed };
    }
  }
  if (ovX > 0) {
    const xMed = Math.max(r.x, o.x) + ovX / 2;
    if (o.y >= r.y + r.profundo) {
      const y1 = r.y + r.profundo;
      return { lado: "aba", gap: o.y - y1, x1: xMed, y1, x2: xMed, y2: o.y };
    }
    if (o.y + o.profundo <= r.y) {
      const y2 = o.y + o.profundo;
      return { lado: "arr", gap: r.y - y2, x1: xMed, y1: y2, x2: xMed, y2: r.y };
    }
  }
  return null;
}

/** Distancia a la pared interior de la zona que contiene el rect, por lado. */
function paredes(r: RectMapa, z: CuerpoMapa): Distancia[] {
  const yMed = r.y + r.profundo / 2;
  const xMed = r.x + r.ancho / 2;
  const izq = r.x - z.x;
  const der = z.x + z.ancho - (r.x + r.ancho);
  const arr = r.y - z.y;
  const aba = z.y + z.profundo - (r.y + r.profundo);
  return [
    { lado: "izq", gap: izq, x1: z.x, y1: yMed, x2: r.x, y2: yMed },
    { lado: "der", gap: der, x1: r.x + r.ancho, y1: yMed, x2: z.x + z.ancho, y2: yMed },
    { lado: "arr", gap: arr, x1: xMed, y1: z.y, x2: xMed, y2: r.y },
    { lado: "aba", gap: aba, x1: xMed, y1: r.y + r.profundo, x2: xMed, y2: z.y + z.profundo },
  ];
}

export function distanciasAVecinos(
  indice: IndiceEspacial,
  rect: RectMapa,
  idPropio: string,
  zonaId: string | null,
): Distancia[] {
  const mejor = new Map<Lado, Distancia>();
  const ofrecer = (d: Distancia) => {
    if (d.gap < MIN_GAP || d.gap > RADIO_CM) {
      return;
    }
    const actual = mejor.get(d.lado);
    if (!actual || d.gap < actual.gap) {
      mejor.set(d.lado, d);
    }
  };
  for (const o of indice.consultar(rect, RADIO_CM)) {
    if (o.id === idPropio || o.tipo === "zona") {
      continue;
    }
    const d = evaluar(rect, o);
    if (d) {
      ofrecer(d);
    }
  }
  const zona = zonaId ? indice.porId(zonaId) : undefined;
  if (zona) {
    paredes(rect, zona).forEach(ofrecer);
  }
  return [...mejor.values()];
}
