/** Dónde y hacia dónde aparece el caminante al entrar (puro). */
import type { NodoMapa } from "../../mapa-almacen-datos";
import type { PosicionXY } from "../tipos";
import { tamRealDe } from "../utils";
import type { Punto } from "./colisionesCaminata";

export interface Aparicion extends Punto {
  yaw: number;
}

/** Giro que mira hacia (fx, fz): el frente de la cámara con yaw 0 es -Z. */
export const yawHacia = (fx: number, fz: number): number => Math.atan2(-fx, -fz);

interface RectCentro {
  cx: number;
  cz: number;
  ancho: number;
  profundo: number;
}

function rectDe(n: NodoMapa, p: PosicionXY): RectCentro {
  const tam = tamRealDe(n);
  return {
    cx: p.x + tam.ancho / 2,
    cz: p.y + tam.profundo / 2,
    ancho: tam.ancho,
    profundo: tam.profundo,
  };
}

/** Elige el punto de aparición: pasillo seleccionado; si no, el pasillo más
 * cercano a la cámara; sin pasillos, la entrada de la primera zona. */
export function calcularAparicion(
  nodos: readonly NodoMapa[],
  posicionBase: ReadonlyMap<string, PosicionXY>,
  seleccionId: string | null,
  camara: Punto,
): Aparicion {
  const pasillos = nodos.filter((n) => n.tipo === "pasillo" && posicionBase.has(n.id));
  const elegido =
    pasillos.find((n) => n.id === seleccionId) ??
    pasillos.toSorted((a, b) => distancia(a, b, posicionBase, camara))[0];
  if (elegido) {
    const r = rectDe(elegido, posicionBase.get(elegido.id)!);
    const alLargoDeX = r.ancho >= r.profundo;
    // Mira hacia el lado más lejano del centro de la cámara: recorre el pasillo entero.
    if (alLargoDeX) {
      return { x: r.cx, z: r.cz, yaw: yawHacia(camara.x <= r.cx ? 1 : -1, 0) };
    }
    return { x: r.cx, z: r.cz, yaw: yawHacia(0, camara.z <= r.cz ? 1 : -1) };
  }
  const zona = nodos.find((n) => n.tipo === "zona" && posicionBase.has(n.id));
  if (zona) {
    const r = rectDe(zona, posicionBase.get(zona.id)!);
    return { x: r.cx, z: r.cz + r.profundo / 2 - 60, yaw: yawHacia(0, -1) };
  }
  return { x: camara.x, z: camara.z, yaw: 0 };
}

function distancia(
  a: NodoMapa,
  b: NodoMapa,
  pos: ReadonlyMap<string, PosicionXY>,
  c: Punto,
): number {
  const d = (n: NodoMapa) => {
    const r = rectDe(n, pos.get(n.id)!);
    return Math.hypot(r.cx - c.x, r.cz - c.z);
  };
  return d(a) - d(b);
}
