import { useEffect } from "react";
import type { Color } from "three";
import type { ModoColor } from "../../mapa/personalizacion";
import { colorItemStock, crearContextoColor, itemRepresentativo } from "./colorStock";
import type { EstadoStock } from "./estadoStock";

/** Color de las cajas y de los bloques (fila representativa de la celda) en
 * los arreglos plenos del estado, segun el modo de color. Se repinta al
 * cambiar datos, modo, categorias o modo claro/oscuro; `refrescar` vuelca el
 * resultado a los buffers vivos. */
export function useColoresStock(
  estado: EstadoStock,
  oscuro: boolean,
  modo: ModoColor,
  categoriaDe: ReadonlyMap<string, string | null>,
  refrescar: () => void,
) {
  useEffect(() => {
    const d = estado.d;
    const ctx = crearContextoColor(modo, oscuro, categoriaDe);
    const cache = new Map<unknown, Color>();
    const de = (item: (typeof d.celdas)[number]["items"][number]): Color => {
      let c = cache.get(item);
      if (!c) {
        c = colorItemStock(item, ctx);
        cache.set(item, c);
      }
      return c;
    };
    for (let i = 0; i < d.nCajas; i++) {
      const celda = d.celdas[d.cajaCelda[i]];
      de(celda.items[d.cajaItem[i]]).toArray(estado.cajasRgb, i * 3);
    }
    d.celdas.forEach((celda, k) => {
      de(itemRepresentativo(celda.items, celda.dominante, ctx)).toArray(estado.bloquesRgb, k * 3);
    });
    refrescar();
  }, [estado, oscuro, modo, categoriaDe, refrescar]);
}
