/** Qué rack, nivel y celda hay bajo la mirilla (puro). Un rayo contra la caja
 * de cada rack; el punto de impacto decide nivel y bahía. */
import type { NodoMapa } from "../../mapa-almacen-datos";
import type { CeldaRack } from "../../mapa/celdas/derivarCeldasRack";
import type { InfoCelda } from "../../mapa/celdas/infoCeldas";
import { medidasRack } from "../../mapa/celdas/medidasRack";
import type { PosicionXY } from "../tipos";
import { tamRealDe } from "../utils";

export interface RackConsulta {
  id: string;
  codigo: string;
  x: number;
  y: number;
  ancho: number;
  profundo: number;
  altura: number;
  celdas: readonly CeldaRack[];
}

export interface ObjetivoMirada {
  rackId: string;
  rackCodigo: string;
  nivel: number | null;
  bahia: number | null;
  celdaCodigo: string | null;
  /** 0-1, o null si no hay datos de capacidad. */
  ocupacion: number | null;
  distanciaCm: number;
}

export function racksParaConsulta(
  nodos: readonly NodoMapa[],
  posicionBase: ReadonlyMap<string, PosicionXY>,
  celdasPorRack: ReadonlyMap<string, CeldaRack[]>,
): RackConsulta[] {
  const racks: RackConsulta[] = [];
  for (const n of nodos) {
    const p = posicionBase.get(n.id);
    if (n.tipo !== "rack" || !p) {
      continue;
    }
    const tam = tamRealDe(n);
    racks.push({
      id: n.id,
      codigo: n.codigo,
      x: p.x,
      y: p.y,
      ancho: tam.ancho,
      profundo: tam.profundo,
      altura: medidasRack(n).altura,
      celdas: celdasPorRack.get(n.id) ?? [],
    });
  }
  return racks;
}

export interface Rayo {
  /** Origen (cm): x y z, con y vertical. */
  ox: number;
  oy: number;
  oz: number;
  /** Dirección unitaria. */
  dx: number;
  dy: number;
  dz: number;
}

/** Distancia (cm) a la que el rayo entra en la caja del rack, o null. */
function entradaEnCaja(r: Rayo, k: RackConsulta, alcance: number): number | null {
  const min = [k.x, 0, k.y];
  const max = [k.x + k.ancho, k.altura, k.y + k.profundo];
  const o = [r.ox, r.oy, r.oz];
  const d = [r.dx, r.dy, r.dz];
  let t0 = 0;
  let t1 = alcance;
  for (let i = 0; i < 3; i++) {
    if (Math.abs(d[i]) < 1e-9) {
      if (o[i] < min[i] || o[i] > max[i]) {
        return null;
      }
      continue;
    }
    const a = (min[i] - o[i]) / d[i];
    const b = (max[i] - o[i]) / d[i];
    t0 = Math.max(t0, Math.min(a, b));
    t1 = Math.min(t1, Math.max(a, b));
    if (t0 > t1) {
      return null;
    }
  }
  return t0;
}

function celdaEn(k: RackConsulta, hx: number, hy: number): CeldaRack | null {
  let nivelElegido: number | null = null;
  let mejor = Infinity;
  for (const c of k.celdas) {
    const dist = hy < c.zBase ? c.zBase - hy : hy > c.zBase + c.alto ? hy - c.zBase - c.alto : 0;
    if (dist < mejor) {
      mejor = dist;
      nivelElegido = c.nivel;
    }
  }
  if (nivelElegido === null) {
    return null;
  }
  const delNivel = k.celdas.filter((c) => c.nivel === nivelElegido);
  const bahia = Math.min(
    delNivel.length,
    Math.max(1, Math.floor(((hx - k.x) / k.ancho) * delNivel.length) + 1),
  );
  return delNivel.find((c) => c.bahia === bahia) ?? delNivel[0] ?? null;
}

/** El objetivo más cercano dentro del alcance, o null si no se mira un rack. */
export function consultarMirada(
  rayo: Rayo,
  racks: readonly RackConsulta[],
  info: ReadonlyMap<string, InfoCelda>,
  alcance: number,
): ObjetivoMirada | null {
  let mejor: { k: RackConsulta; t: number } | null = null;
  for (const k of racks) {
    const t = entradaEnCaja(rayo, k, alcance);
    if (t !== null && (!mejor || t < mejor.t)) {
      mejor = { k, t };
    }
  }
  if (!mejor) {
    return null;
  }
  const hx = rayo.ox + rayo.dx * mejor.t;
  const hy = rayo.oy + rayo.dy * mejor.t;
  const celda = celdaEn(mejor.k, hx, hy);
  const datos = celda ? info.get(celda.ubicacionId) : undefined;
  return {
    rackId: mejor.k.id,
    rackCodigo: mejor.k.codigo,
    nivel: celda?.nivel ?? null,
    bahia: celda?.bahia ?? null,
    celdaCodigo: datos?.codigo ?? null,
    ocupacion: datos?.ocupacion ?? null,
    distanciaCm: mejor.t,
  };
}
