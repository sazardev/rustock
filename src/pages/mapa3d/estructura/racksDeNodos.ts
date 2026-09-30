import type { NodoMapa } from "../../mapa-almacen-datos";
import type { CeldaRack } from "../../mapa/celdas/derivarCeldasRack";
import { medidasRack } from "../../mapa/celdas/medidasRack";
import { tamRealDe } from "../utils";
import type { EntradaRack } from "./construirRack";

/** Racks visibles como entradas de geometria (medidas reales + celdas). */
export function racksDeNodos(
  nodos: NodoMapa[],
  celdasPorRack: Map<string, CeldaRack[]>,
): { racks: NodoMapa[]; entradas: EntradaRack[] } {
  const racks = nodos.filter((n) => n.tipo === "rack");
  const entradas = racks.map((n) => {
    const tam = tamRealDe(n);
    return {
      id: n.id,
      ancho: tam.ancho,
      fondo: tam.profundo,
      medidas: medidasRack(n),
      celdas: celdasPorRack.get(n.id) ?? [],
    };
  });
  return { racks, entradas };
}
