/**
 * Estado mutable del stock dibujado: matrices y colores "plenos" (la posicion
 * real y el color de cada caja y bloque) y el LOD por celda. Las matrices
 * VIVAS de los InstancedMesh se reconstruyen COMPACTAS a partir de los plenos:
 * solo las cajas de celdas cercanas y solo los bloques de celdas lejanas,
 * contiguos al inicio del buffer y con `mesh.count` exacto. Asi el LOD reduce
 * de verdad los vertices que procesa la GPU (no hay instancias degeneradas).
 */
import { Color, type InstancedMesh } from "three";
import type { Origen } from "../estructura/useCajasInstanciadas";
import type { DisposicionStock } from "./construirDisposicion";

/** Un bloque lejano se encoge un poco para no tapar los bordes de la celda. */
const HOLGURA_BLOQUE = 0.96;

const BLANCO = new Color();

export interface EstadoStock {
  d: DisposicionStock;
  cajasM: Float32Array;
  bloquesM: Float32Array;
  /** Color RGB de cada caja y de cada bloque (plenos). */
  cajasRgb: Float32Array;
  bloquesRgb: Float32Array;
  /** Centro de cada celda en el mundo (x, y, z). */
  centros: Float32Array;
  /** 1 = cerca (cajas individuales), 0 = lejos (bloque). */
  cerca: Uint8Array;
  escrito: (Origen | undefined)[];
  /** Camara con la que se evaluo el LOD por ultima vez. */
  camara: [number, number, number] | null;
}

export function crearEstado(d: DisposicionStock): EstadoStock {
  return {
    d,
    cajasM: new Float32Array(d.nCajas * 16),
    bloquesM: new Float32Array(d.celdas.length * 16),
    cajasRgb: new Float32Array(d.nCajas * 3),
    bloquesRgb: new Float32Array(d.celdas.length * 3),
    centros: new Float32Array(d.celdas.length * 3),
    cerca: new Uint8Array(d.celdas.length),
    escrito: [],
    camara: null,
  };
}

function componer(
  destino: Float32Array,
  i: number,
  px: number,
  py: number,
  pz: number,
  sx: number,
  sy: number,
  sz: number,
): void {
  const o = i * 16;
  destino.fill(0, o, o + 16);
  destino[o] = sx;
  destino[o + 5] = sy;
  destino[o + 10] = sz;
  destino[o + 12] = px;
  destino[o + 13] = py;
  destino[o + 14] = pz;
  destino[o + 15] = 1;
}

/** Escribe las matrices plenas de todas las celdas de un rack. */
export function escribirRack(e: EstadoStock, rack: number, o: Origen): void {
  const { d } = e;
  for (let k = d.rackInicios[rack]; k < d.rackInicios[rack + 1]; k++) {
    const c = d.celdas[k];
    for (let i = c.cajaIni; i < c.cajaFin; i++) {
      const b = i * 6;
      componer(
        e.cajasM,
        i,
        o[0] + d.cajas[b],
        o[1] + d.cajas[b + 1],
        o[2] + d.cajas[b + 2],
        d.cajas[b + 3],
        d.cajas[b + 4],
        d.cajas[b + 5],
      );
    }
    componer(
      e.bloquesM,
      k,
      o[0] + c.cx,
      o[1] + c.cy - c.sy / 2 + c.bloqueAlto / 2,
      o[2] + c.cz,
      c.sx * HOLGURA_BLOQUE,
      c.bloqueAlto,
      c.sz * HOLGURA_BLOQUE,
    );
    e.centros[k * 3] = o[0] + c.cx;
    e.centros[k * 3 + 1] = o[1] + c.cy;
    e.centros[k * 3 + 2] = o[2] + c.cz;
  }
}

function asegurarColor(malla: InstancedMesh): Float32Array {
  if (!malla.instanceColor) {
    malla.setColorAt(0, BLANCO);
  }
  return malla.instanceColor!.array as Float32Array;
}

/** Reconstruye los buffers vivos compactos segun el LOD actual. Barato
 * (copias de subarreglos); se llama solo cuando cambia algo. */
export function reconstruirVivas(
  e: EstadoStock,
  cajas: InstancedMesh,
  bloques: InstancedMesh,
): void {
  const mc = cajas.instanceMatrix.array as Float32Array;
  const cc = asegurarColor(cajas);
  const mb = bloques.instanceMatrix.array as Float32Array;
  const cb = asegurarColor(bloques);
  let nc = 0;
  let nb = 0;
  e.d.celdas.forEach((c, k) => {
    if (e.cerca[k]) {
      const n = c.cajaFin - c.cajaIni;
      mc.set(e.cajasM.subarray(c.cajaIni * 16, c.cajaFin * 16), nc * 16);
      cc.set(e.cajasRgb.subarray(c.cajaIni * 3, c.cajaFin * 3), nc * 3);
      nc += n;
    } else {
      mb.set(e.bloquesM.subarray(k * 16, k * 16 + 16), nb * 16);
      cb.set(e.bloquesRgb.subarray(k * 3, k * 3 + 3), nb * 3);
      nb++;
    }
  });
  cajas.count = nc;
  bloques.count = nb;
  for (const m of [cajas, bloques]) {
    m.instanceMatrix.needsUpdate = true;
    if (m.instanceColor) {
      m.instanceColor.needsUpdate = true;
    }
  }
}

/** Reevalua el LOD de todas las celdas con histeresis: pasa a cerca por
 * debajo de `radio - histeresis` y a lejos por encima de `radio + histeresis`.
 * Devuelve las celdas que cambiaron. */
export function actualizarLod(
  e: EstadoStock,
  camara: readonly [number, number, number],
  radio: number,
  histeresis: number,
): number[] {
  const cambiadas: number[] = [];
  const entra = (radio - histeresis) ** 2;
  const sale = (radio + histeresis) ** 2;
  for (let k = 0; k < e.d.celdas.length; k++) {
    const dx = e.centros[k * 3] - camara[0];
    const dy = e.centros[k * 3 + 1] - camara[1];
    const dz = e.centros[k * 3 + 2] - camara[2];
    const d2 = dx * dx + dy * dy + dz * dz;
    const antes = e.cerca[k];
    const ahora = antes ? (d2 > sale ? 0 : 1) : d2 < entra ? 1 : 0;
    if (ahora !== antes) {
      e.cerca[k] = ahora;
      cambiadas.push(k);
    }
  }
  e.camara = [camara[0], camara[1], camara[2]];
  return cambiadas;
}
