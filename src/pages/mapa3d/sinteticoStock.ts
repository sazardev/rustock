/**
 * Stock sintetico SOLO para medir rendimiento del 3D (ver `sintetico.ts`):
 * un catalogo de productos de tamanos variados (del frasco a la caja grande) y
 * cantidades que van de unas pocas unidades a cientos por celda.
 */
import type { StockPorCelda } from "../mapa/stock/stockPorCelda";

const PRODUCTOS = 48;

interface ProductoSintetico {
  id: string;
  sku: string;
  nombre: string;
  largo: number;
  ancho: number;
  alto: number;
}

function catalogo(azar: () => number): ProductoSintetico[] {
  return Array.from({ length: PRODUCTOS }, (_, i) => ({
    id: `prod-sint-${i}`,
    sku: `SKU-${String(i + 1).padStart(4, "0")}`,
    nombre: `Producto sintetico ${i + 1}`,
    largo: 8 + Math.round(azar() * 40),
    ancho: 8 + Math.round(azar() * 30),
    alto: 6 + Math.round(azar() * 24),
  }));
}

/** ~75% de las celdas con 1-3 productos; algunos sin medidas medidas. */
export function stockSintetico(ubicaciones: string[], azar: () => number): StockPorCelda {
  const productos = catalogo(azar);
  const stock: StockPorCelda = new Map();
  for (const ubicacionId of ubicaciones) {
    if (azar() < 0.25) {
      continue;
    }
    const n = 1 + Math.floor(azar() * 3);
    stock.set(
      ubicacionId,
      Array.from({ length: n }, () => {
        const p = productos[Math.floor(azar() * productos.length)];
        return {
          productoId: p.id,
          sku: p.sku,
          nombre: p.nombre,
          cantidad: 4 + Math.floor(azar() * azar() * 300),
          loteCodigo: `L-${Math.floor(azar() * 900) + 100}`,
          vencimiento: azar() < 0.4 ? "2027-03-15" : undefined,
          dimensiones: {
            largo: p.largo,
            ancho: p.ancho,
            alto: p.alto,
            origen: azar() < 0.8 ? ("medido" as const) : ("estimado" as const),
          },
        };
      }),
    );
  }
  return stock;
}
