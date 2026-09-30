/** Agrupa saldos por ubicacion (celda) con los datos del producto. Pura. */
import type { Lote, Producto, Saldo } from "../../../shared/types";
import { dimensionesProducto, type DimensionesProducto } from "./dimensionesProducto";

export interface ItemStockCelda {
  productoId: string;
  sku: string;
  nombre: string;
  cantidad: number;
  loteCodigo?: string;
  vencimiento?: string;
  dimensiones: DimensionesProducto;
}

export type StockPorCelda = Map<string, ItemStockCelda[]>;

export function stockPorCelda(
  saldos: readonly Saldo[],
  productos: ReadonlyMap<string, Producto>,
  lotes: ReadonlyMap<string, Lote>,
): StockPorCelda {
  const porCelda = new Map<string, Map<string, ItemStockCelda>>();
  for (const s of saldos) {
    if (!(s.cantidad > 0)) continue;
    const producto = productos.get(s.producto_id);
    if (!producto) continue;
    const lote = s.lote_id ? lotes.get(s.lote_id) : undefined;
    const clave = `${s.producto_id}|${s.lote_id ?? ""}`;
    const celda = porCelda.get(s.ubicacion_id) ?? new Map<string, ItemStockCelda>();
    const previo = celda.get(clave);
    if (previo) {
      previo.cantidad += s.cantidad;
    } else {
      celda.set(clave, {
        productoId: producto.id,
        sku: producto.sku,
        nombre: producto.nombre,
        cantidad: s.cantidad,
        loteCodigo: lote?.numero,
        vencimiento: lote?.fecha_vencimiento ?? undefined,
        dimensiones: dimensionesProducto(producto),
      });
    }
    porCelda.set(s.ubicacion_id, celda);
  }
  const resultado: StockPorCelda = new Map();
  for (const [ubicacionId, items] of porCelda) {
    resultado.set(
      ubicacionId,
      [...items.values()].toSorted((a, b) => b.cantidad - a.cantidad || a.sku.localeCompare(b.sku)),
    );
  }
  return resultado;
}
