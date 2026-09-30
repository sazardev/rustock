/**
 * Disposicion del stock en 3D (pura): para cada celda con stock, las cajas de
 * producto (individuales) y un bloque resumen, en coordenadas LOCALES del rack
 * (metros de escena). Reutiliza `llenadoCelda` (empaquetado en cm) y solo
 * convierte de celda-relativo a rack-local.
 */
import type { GruposRacks } from "../estructura/construirRack";
import { llenadoCelda, TOPE_CAJAS_POR_CELDA } from "../../mapa/stock/capacidadCelda";
import type { ItemStockCelda, StockPorCelda } from "../../mapa/stock/stockPorCelda";
import { M_POR_UNIDAD } from "../../mapa/unidades";

/** Tope global de cajas individuales en toda la escena. */
export const TOPE_INSTANCIAS = 20000;
/** Las cajas se encogen un poco para que se distingan entre si. */
const HOLGURA = 0.96;
const ALTO_MIN_BLOQUE = 0.04;

export interface CeldaStock {
  ubicacionId: string;
  codigo: string;
  rackIdx: number;
  items: ItemStockCelda[];
  /** Rango de cajas `[cajaIni, cajaFin)` de esta celda. */
  cajaIni: number;
  cajaFin: number;
  /** Centro y tamano de la celda (m, locales del rack). */
  cx: number;
  cy: number;
  cz: number;
  sx: number;
  sy: number;
  sz: number;
  /** Altura del bloque resumen (m) y item dominante (indice en `items`). */
  bloqueAlto: number;
  dominante: number;
}

export interface DisposicionStock {
  celdas: CeldaStock[];
  /** Celdas del rack `r`: `rackInicios[r] .. rackInicios[r + 1]`. */
  rackInicios: number[];
  /** Por caja: centro (x, y, z) y tamano (sx, sy, sz) en metros locales. */
  cajas: Float32Array;
  /** Por caja: indice del item (en `items` de su celda) y de su celda. */
  cajaItem: Uint16Array;
  cajaCelda: Uint32Array;
  nCajas: number;
  ubicaciones: ReadonlySet<string>;
}

export const DISPOSICION_VACIA: DisposicionStock = {
  celdas: [],
  rackInicios: [0],
  cajas: new Float32Array(0),
  cajaItem: new Uint16Array(0),
  cajaCelda: new Uint32Array(0),
  nCajas: 0,
  ubicaciones: new Set(),
};

function llenar(grupos: GruposRacks, stock: StockPorCelda, tope: number) {
  return grupos.metas.map((meta, i) => {
    const items = stock.get(meta.ubicacionId);
    if (!items?.length) {
      return null;
    }
    const c = grupos.celdas.cajas[i];
    const rect = {
      ancho: c.sx / M_POR_UNIDAD,
      fondo: c.sz / M_POR_UNIDAD,
      alto: c.sy / M_POR_UNIDAD,
    };
    // `productoId` del empaquetado es el indice del item: asi cada caja sabe
    // de que fila (producto + lote) viene.
    const entradas = items.map((it, k) => ({
      productoId: String(k),
      cantidad: it.cantidad,
      dimensiones: it.dimensiones,
    }));
    return { meta, caja: c, items, lleno: llenadoCelda(rect, entradas, tope) };
  });
}

export function construirDisposicion(grupos: GruposRacks, stock: StockPorCelda): DisposicionStock {
  if (stock.size === 0 || grupos.metas.length === 0) {
    return DISPOSICION_VACIA;
  }
  let tope = TOPE_CAJAS_POR_CELDA;
  let llenas = llenar(grupos, stock, tope);
  for (let vuelta = 0; vuelta < 3; vuelta++) {
    const total = llenas.reduce((s, l) => s + (l?.lleno.cajasAPintar.length ?? 0), 0);
    if (total <= TOPE_INSTANCIAS) {
      break;
    }
    tope = Math.max(2, Math.floor((tope * TOPE_INSTANCIAS) / total));
    llenas = llenar(grupos, stock, tope);
  }

  const celdas: CeldaStock[] = [];
  const cajasTmp: number[] = [];
  const itemTmp: number[] = [];
  const celdaTmp: number[] = [];
  const rackInicios: number[] = [0];
  let rackActual = 0;
  for (const l of llenas) {
    if (!l) {
      continue;
    }
    const { meta, caja: c, items, lleno } = l;
    while (rackActual < meta.rackIdx) {
      rackInicios.push(celdas.length);
      rackActual++;
    }
    const minX = c.x - c.sx / 2;
    const minY = c.y - c.sy / 2;
    const minZ = c.z - c.sz / 2;
    const cajaIni = itemTmp.length;
    for (const b of lleno.cajasAPintar) {
      cajasTmp.push(
        minX + (b.x + b.largo / 2) * M_POR_UNIDAD,
        minY + (b.z + b.alto / 2) * M_POR_UNIDAD,
        minZ + (b.y + b.ancho / 2) * M_POR_UNIDAD,
        b.largo * M_POR_UNIDAD * HOLGURA,
        b.alto * M_POR_UNIDAD * HOLGURA,
        b.ancho * M_POR_UNIDAD * HOLGURA,
      );
      itemTmp.push(Number(b.productoId));
      celdaTmp.push(celdas.length);
    }
    const dominante = items.reduce((mx, it, k) => (it.cantidad > items[mx].cantidad ? k : mx), 0);
    celdas.push({
      ubicacionId: meta.ubicacionId,
      codigo: meta.codigo,
      rackIdx: meta.rackIdx,
      items,
      cajaIni,
      cajaFin: itemTmp.length,
      cx: c.x,
      cy: c.y,
      cz: c.z,
      sx: c.sx,
      sy: c.sy,
      sz: c.sz,
      bloqueAlto: Math.max(ALTO_MIN_BLOQUE, Math.min(c.sy, lleno.llenado * c.sy)),
      dominante,
    });
  }
  while (rackActual < grupos.celdas.inicios.length - 1) {
    rackInicios.push(celdas.length);
    rackActual++;
  }
  return {
    celdas,
    rackInicios,
    cajas: Float32Array.from(cajasTmp),
    cajaItem: Uint16Array.from(itemTmp),
    cajaCelda: Uint32Array.from(celdaTmp),
    nCajas: itemTmp.length,
    ubicaciones: new Set(celdas.map((c) => c.ubicacionId)),
  };
}
