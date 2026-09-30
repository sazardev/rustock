/** Guias de alineacion: snap de bordes y centros a los de los vecinos. */
import type { IndiceEspacial } from "./indiceEspacial";
import type { RectMapa } from "./tipos";

/** Distancia (cm) a la que un borde/centro se pega al de un vecino. */
const UMBRAL_SNAP = 8;
/** Radio (cm) en el que se buscan vecinos con los que alinear. */
const RADIO_VECINOS = 300;

/** Linea de alineacion: `eje` "x" es vertical (x = valor) y "y" horizontal;
 * `desde`/`hasta` acotan el segmento en el otro eje. */
export interface Guia {
  eje: "x" | "y";
  valor: number;
  desde: number;
  hasta: number;
}

interface Ajuste {
  x: number;
  y: number;
  guias: Guia[];
}

type Trio = [number, number, number];

const trioX = (r: RectMapa): Trio => [r.x, r.x + r.ancho / 2, r.x + r.ancho];
const trioY = (r: RectMapa): Trio => [r.y, r.y + r.profundo / 2, r.y + r.profundo];

/** Menor desplazamiento que alinea algun valor propio con alguno ajeno. */
function mejorDelta(propios: Trio, ajenos: Trio): number | null {
  let mejor: number | null = null;
  for (const p of propios) {
    for (const a of ajenos) {
      const d = a - p;
      if (Math.abs(d) <= UMBRAL_SNAP && (mejor === null || Math.abs(d) < Math.abs(mejor))) {
        mejor = d;
      }
    }
  }
  return mejor;
}

/** Pega el rect a bordes/centros de vecinos y devuelve las guias resultantes.
 * Sin coincidencias devuelve la posicion intacta y ninguna guia. */
export function ajustarAVecinos(
  indice: IndiceEspacial,
  rect: RectMapa,
  idPropio: string,
  ignorar?: ReadonlySet<string>,
): Ajuste {
  const vecinos = indice
    .consultar(rect, RADIO_VECINOS)
    .filter((o) => o.id !== idPropio && !ignorar?.has(o.id));
  let dx: number | null = null;
  let dy: number | null = null;
  for (const o of vecinos) {
    const ex = mejorDelta(trioX(rect), trioX(o));
    const ey = mejorDelta(trioY(rect), trioY(o));
    if (ex !== null && (dx === null || Math.abs(ex) < Math.abs(dx))) {
      dx = ex;
    }
    if (ey !== null && (dy === null || Math.abs(ey) < Math.abs(dy))) {
      dy = ey;
    }
  }
  const final: RectMapa = { ...rect, x: rect.x + (dx ?? 0), y: rect.y + (dy ?? 0) };
  const guias: Guia[] = [];
  const anadir = (g: Guia) => {
    if (!guias.some((x) => x.eje === g.eje && x.valor === g.valor && x.desde === g.desde)) {
      guias.push(g);
    }
  };
  for (const o of vecinos) {
    for (const v of trioX(final)) {
      if (trioX(o).some((a) => Math.abs(a - v) < 0.5) && dx !== null) {
        anadir({
          eje: "x",
          valor: v,
          desde: Math.min(final.y, o.y),
          hasta: Math.max(final.y + final.profundo, o.y + o.profundo),
        });
      }
    }
    for (const v of trioY(final)) {
      if (trioY(o).some((a) => Math.abs(a - v) < 0.5) && dy !== null) {
        anadir({
          eje: "y",
          valor: v,
          desde: Math.min(final.x, o.x),
          hasta: Math.max(final.x + final.ancho, o.x + o.ancho),
        });
      }
    }
  }
  return { x: final.x, y: final.y, guias };
}
