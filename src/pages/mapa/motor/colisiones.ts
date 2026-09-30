/** Choques entre pares de tipos prohibidos (matriz de reglas-mapa.json). */
import { solapeProhibido } from "../reglas";
import { rectsSolapan } from "./geometria";
import type { IndiceEspacial } from "./indiceEspacial";
import type { Candidato, CuerpoMapa } from "./tipos";

/** Primer cuerpo con el que el candidato no puede solaparse, o null. */
export function primerCuerpoEnChoque(
  indice: IndiceEspacial,
  c: Candidato,
  ignorar?: ReadonlySet<string>,
): CuerpoMapa | null {
  for (const o of indice.consultar(c.rect)) {
    if (o.id === c.id || ignorar?.has(o.id)) {
      continue;
    }
    if (solapeProhibido(c.tipo, o.tipo) && rectsSolapan(c.rect, o)) {
      return o;
    }
  }
  return null;
}
