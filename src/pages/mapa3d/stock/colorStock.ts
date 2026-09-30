/** Color de una fila de stock (producto + lote) segun el modo de color. */
import { Color } from "three";
import type { ModoColor } from "../../mapa/personalizacion";
import type { ItemStockCelda } from "../../mapa/stock/stockPorCelda";
import { colorProducto } from "./colorProducto";
import {
  colorVencimiento,
  crearPaletaVencimiento,
  diasParaVencer,
  type PaletaVencimiento,
} from "./colorVencimiento";

export interface ContextoColorStock {
  modo: ModoColor;
  oscuro: boolean;
  ahora: number;
  paleta: PaletaVencimiento;
  /** Categoria de cada producto (solo se consulta en el modo categoria). */
  categoriaDe: ReadonlyMap<string, string | null>;
}

export function crearContextoColor(
  modo: ModoColor,
  oscuro: boolean,
  categoriaDe: ReadonlyMap<string, string | null>,
): ContextoColorStock {
  return { modo, oscuro, ahora: Date.now(), paleta: crearPaletaVencimiento(), categoriaDe };
}

export function colorItemStock(
  item: ItemStockCelda,
  ctx: ContextoColorStock,
  destino = new Color(),
): Color {
  if (ctx.modo === "vencimiento") {
    return colorVencimiento(diasParaVencer(item.vencimiento, ctx.ahora), ctx.paleta, destino);
  }
  if (ctx.modo === "categoria") {
    const categoria = ctx.categoriaDe.get(item.productoId);
    return categoria
      ? colorProducto(`categoria:${categoria}`, ctx.oscuro, destino)
      : destino.copy(ctx.paleta.sinFecha);
  }
  return colorProducto(item.productoId, ctx.oscuro, destino);
}

/** Fila que representa a la celda en el bloque lejano: en vencimiento la mas
 * urgente (el peor caso manda); en el resto, la de mayor cantidad. */
export function itemRepresentativo(
  items: readonly ItemStockCelda[],
  dominante: number,
  ctx: ContextoColorStock,
): ItemStockCelda {
  if (ctx.modo !== "vencimiento") {
    return items[dominante];
  }
  let mejor = items[dominante];
  let diasMejor = diasParaVencer(mejor.vencimiento, ctx.ahora) ?? Infinity;
  for (const it of items) {
    const d = diasParaVencer(it.vencimiento, ctx.ahora) ?? Infinity;
    if (d < diasMejor) {
      mejor = it;
      diasMejor = d;
    }
  }
  return mejor;
}
