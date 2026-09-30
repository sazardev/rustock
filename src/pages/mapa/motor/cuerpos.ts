/** Convierte listas del mapa en cuerpos del motor. Los nodos sin posicion
 * guardada no existen para el motor (igual que para el backend). */
import type { TipoNodo } from "../tipos-nodo";
import type { Candidato, CuerpoMapa, RectMapa } from "./tipos";

interface NodoLike {
  id: string;
  codigo: string;
  tipo: TipoNodo;
  ancho: number;
  profundidad: number;
  pos_x: number | null;
  pos_y: number | null;
  zona_id?: string | null;
}

export function cuerposDe(nodos: readonly NodoLike[]): CuerpoMapa[] {
  const cuerpos: CuerpoMapa[] = [];
  for (const n of nodos) {
    if (n.pos_x === null || n.pos_y === null) {
      continue;
    }
    cuerpos.push({
      id: n.id,
      codigo: n.codigo,
      tipo: n.tipo,
      x: n.pos_x,
      y: n.pos_y,
      ancho: n.ancho,
      profundo: n.profundidad,
      zonaId: n.zona_id ?? null,
    });
  }
  return cuerpos;
}

/** Candidato para evaluar un nodo existente en un rect propuesto. */
export function candidatoDe(
  n: { id: string; tipo: TipoNodo; zona_id?: string | null },
  rect: RectMapa,
): Candidato {
  return { id: n.id, tipo: n.tipo, rect, zonaId: n.zona_id ?? null };
}
