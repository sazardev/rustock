/** Color estable de un producto: el tono sale de un hash del id (mismo
 * producto, mismo tono en cada sesion) y la saturacion/luminosidad se ajustan
 * al modo del tema para que contraste con el piso y las bandejas. */
import { Color } from "three";

function hash(texto: string): number {
  let h = 2166136261;
  for (let i = 0; i < texto.length; i++) {
    h = Math.imul(h ^ texto.charCodeAt(i), 16777619);
  }
  return h >>> 0;
}

export function colorProducto(id: string, oscuro: boolean, destino = new Color()): Color {
  const tono = (hash(id) % 360) / 360;
  return destino.setHSL(tono, oscuro ? 0.5 : 0.58, oscuro ? 0.6 : 0.5);
}
