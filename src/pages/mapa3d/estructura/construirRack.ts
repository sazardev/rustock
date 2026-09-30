/** Geometria de un rack real (pura): montantes en cada esquina de bahia,
 * largueros a la cota de cada nivel, bandejas y celdas de ubicacion. */
import type { CeldaRack } from "../../mapa/celdas/derivarCeldasRack";
import type { InfoCelda } from "../../mapa/celdas/infoCeldas";
import type { MedidasRack } from "../../mapa/celdas/medidasRack";
import { M_POR_UNIDAD } from "../../mapa/unidades";
import { cerrarRack, type Caja, type GrupoCajas } from "./cajas";
import {
  BAHIA_DEFECTO_CM,
  BANDEJA_CM,
  HOLGURA_CELDA_CM,
  POSTE_CM,
  VIGA_ALTO_CM,
  VIGA_FONDO_CM,
} from "./dimensionesRack";

export interface EntradaRack {
  id: string;
  /** Medidas en el plano (cm). */
  ancho: number;
  fondo: number;
  medidas: MedidasRack;
  celdas: CeldaRack[];
}

/** Datos de una celda para el tooltip y el color. */
export interface CeldaMeta {
  rackId: string;
  rackIdx: number;
  ubicacionId: string;
  codigo: string;
  ocupacion: number | null;
  nivel: number;
}

export interface GruposRacks {
  postes: GrupoCajas;
  vigas: GrupoCajas;
  bandejas: GrupoCajas;
  celdas: GrupoCajas;
  /** Paralelo a `celdas.cajas`. */
  metas: CeldaMeta[];
}

const m = (cm: number) => cm * M_POR_UNIDAD;

function caja(cx: number, cy: number, cz: number, sx: number, sy: number, sz: number): Caja {
  return { x: m(cx), y: m(cy), z: m(cz), sx: m(sx), sy: m(sy), sz: m(sz) };
}

/** Numero de bahias: el maximo de celdas por nivel, o por ancho si no hay. */
export function bahiasDe(r: EntradaRack): number {
  const conCeldas = r.celdas.reduce((mx, c) => Math.max(mx, c.nBahias), 0);
  return conCeldas > 0 ? conCeldas : Math.max(1, Math.round(r.ancho / BAHIA_DEFECTO_CM));
}

/** Cotas (cm) sobre las que apoya cada nivel, mas la viga superior. */
export function cotasDeNivel(md: MedidasRack): number[] {
  const cotas = Array.from({ length: md.niveles }, (_, k) => md.altoBase + k * md.altoNivel);
  return [...cotas, md.altura];
}

function montantes(r: EntradaRack, nb: number, destino: Caja[]): void {
  const w = r.ancho / nb;
  const mitad = POSTE_CM / 2;
  for (let i = 0; i <= nb; i++) {
    const cx = Math.min(Math.max(i * w, mitad), r.ancho - mitad);
    for (const cz of [mitad, r.fondo - mitad]) {
      destino.push(caja(cx, r.medidas.altura / 2, cz, POSTE_CM, r.medidas.altura, POSTE_CM));
    }
  }
}

function largueros(r: EntradaRack, destino: Caja[]): void {
  const largo = r.ancho - POSTE_CM;
  for (const cota of cotasDeNivel(r.medidas)) {
    for (const cz of [POSTE_CM / 2, r.fondo - POSTE_CM / 2]) {
      destino.push(
        caja(r.ancho / 2, cota - VIGA_ALTO_CM / 2, cz, largo, VIGA_ALTO_CM, VIGA_FONDO_CM),
      );
    }
  }
}

function bandejas(r: EntradaRack, nb: number, destino: Caja[]): void {
  const w = r.ancho / nb;
  const md = r.medidas;
  for (let k = 0; k < md.niveles; k++) {
    const cota = md.altoBase + k * md.altoNivel;
    for (let i = 0; i < nb; i++) {
      destino.push(
        caja(
          (i + 0.5) * w,
          cota + BANDEJA_CM / 2,
          r.fondo / 2,
          w - POSTE_CM,
          BANDEJA_CM,
          r.fondo - POSTE_CM,
        ),
      );
    }
  }
}

function celdas(
  r: EntradaRack,
  rackIdx: number,
  info: Map<string, InfoCelda>,
  destino: Caja[],
  metas: CeldaMeta[],
): void {
  for (const c of r.celdas) {
    const w = r.ancho / c.nBahias;
    const alto = c.alto - BANDEJA_CM - VIGA_ALTO_CM - HOLGURA_CELDA_CM;
    if (alto <= 0) {
      continue;
    }
    const datos = info.get(c.ubicacionId);
    destino.push(
      caja(
        (c.bahia - 0.5) * w,
        c.zBase + BANDEJA_CM + alto / 2,
        r.fondo / 2,
        w - POSTE_CM - HOLGURA_CELDA_CM,
        alto,
        r.fondo - POSTE_CM - HOLGURA_CELDA_CM,
      ),
    );
    metas.push({
      rackId: r.id,
      rackIdx,
      ubicacionId: c.ubicacionId,
      codigo: datos?.codigo ?? c.ubicacionId,
      ocupacion: datos?.ocupacion ?? null,
      nivel: c.nivel,
    });
  }
}

export function construirGruposRacks(
  racks: EntradaRack[],
  info: Map<string, InfoCelda>,
): GruposRacks {
  const g: GruposRacks = {
    postes: { cajas: [], inicios: [0] },
    vigas: { cajas: [], inicios: [0] },
    bandejas: { cajas: [], inicios: [0] },
    celdas: { cajas: [], inicios: [0] },
    metas: [],
  };
  racks.forEach((r, rackIdx) => {
    const nb = bahiasDe(r);
    montantes(r, nb, g.postes.cajas);
    largueros(r, g.vigas.cajas);
    bandejas(r, nb, g.bandejas.cajas);
    celdas(r, rackIdx, info, g.celdas.cajas, g.metas);
    cerrarRack(g.postes);
    cerrarRack(g.vigas);
    cerrarRack(g.bandejas);
    cerrarRack(g.celdas);
  });
  return g;
}
