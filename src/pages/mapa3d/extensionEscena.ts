import type { NodoMapa } from "../mapa-almacen-datos";
import { M_POR_UNIDAD } from "../mapa/unidades";
import type { PosicionXY } from "./tipos";

/** Centro (plano XZ, metros) y radio que abarcan todos los nodos: dimensiona
 * el frustum de la luz con sombra. */
export function extensionEscena(
  nodos: NodoMapa[],
  posicionBase: Map<string, PosicionXY>,
): { centro: [number, number]; radio: number } {
  let x0 = Infinity;
  let z0 = Infinity;
  let x1 = -Infinity;
  let z1 = -Infinity;
  for (const n of nodos) {
    const p = posicionBase.get(n.id);
    if (!p) {
      continue;
    }
    x0 = Math.min(x0, p.x);
    z0 = Math.min(z0, p.y);
    x1 = Math.max(x1, p.x + n.ancho);
    z1 = Math.max(z1, p.y + n.profundidad);
  }
  if (!Number.isFinite(x0)) {
    return { centro: [0, 0], radio: 10 };
  }
  const radio = Math.max(x1 - x0, z1 - z0) * M_POR_UNIDAD * 0.75 + 2;
  return { centro: [((x0 + x1) / 2) * M_POR_UNIDAD, ((z0 + z1) / 2) * M_POR_UNIDAD], radio };
}
