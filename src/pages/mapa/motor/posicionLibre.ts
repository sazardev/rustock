/** Posicion libre mas cercana: busqueda en anillos Chebyshev sobre la rejilla. */
import { PASO_REJILLA } from "../reglas";
import type { TipoNodo } from "../tipos-nodo";
import { evaluarColocacion } from "./evaluarColocacion";
import type { IndiceEspacial } from "./indiceEspacial";

const RADIO_ANILLOS = 18;

interface Forma {
  id: string;
  tipo: TipoNodo;
  ancho: number;
  profundo: number;
  zonaId?: string | null;
}

interface Punto {
  x: number;
  y: number;
}

/** El origen si ya cabe (o null con `soloSiChoca`), o la primera posicion no
 * bloqueada en anillos crecientes. Considera choques Y contencion en zona. */
export function posicionLibreCercana(
  indice: IndiceEspacial,
  forma: Forma,
  origen: Punto,
  opciones: { soloSiChoca?: boolean; ignorar?: ReadonlySet<string> } = {},
): Punto | null {
  const { soloSiChoca = true, ignorar } = opciones;
  const cabe = (x: number, y: number) =>
    evaluarColocacion(
      indice,
      {
        id: forma.id,
        tipo: forma.tipo,
        zonaId: forma.zonaId,
        rect: { x, y, ancho: forma.ancho, profundo: forma.profundo },
      },
      { ignorar },
    ).estado !== "bloqueado";
  if (cabe(origen.x, origen.y)) {
    return soloSiChoca ? null : { x: origen.x, y: origen.y };
  }
  for (let radio = 1; radio <= RADIO_ANILLOS; radio++) {
    for (let dx = -radio; dx <= radio; dx++) {
      for (let dy = -radio; dy <= radio; dy++) {
        if (Math.max(Math.abs(dx), Math.abs(dy)) !== radio) {
          continue; // solo el anillo
        }
        const x = origen.x + dx * PASO_REJILLA;
        const y = origen.y + dy * PASO_REJILLA;
        if (cabe(x, y)) {
          return { x, y };
        }
      }
    }
  }
  return null;
}
