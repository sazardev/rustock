/**
 * Celdas de un rack derivadas de sus ubicaciones (pura). El backend aplica la
 * MISMA regla en Rust; si cambia una, cambia la otra:
 *  - nivel  = primer numero de `seccion.nivel` ("1", "2", "N1"); sin seccion
 *             o sin numero legible => 1.
 *  - bahia  = posicion (desde 1) al ordenar por `codigo` (orden de texto
 *             simple, desempate por id) dentro de (rack, nivel).
 *  - ancho de celda = ancho del rack / numero de bahias del nivel.
 */
import { medidasRack, type MedidasRack } from "./medidasRack";

export interface UbicacionDeRack {
  id: string;
  codigo: string;
  seccion_id: string | null;
}

export interface SeccionConNivel {
  id: string;
  nivel: string | null;
}

export interface GeometriaRack {
  x: number;
  y: number;
  ancho: number;
  profundidad: number;
  niveles?: number | null;
  alto_nivel?: number | null;
  alto_base?: number | null;
  altura?: number | null;
}

export interface CeldaRack {
  ubicacionId: string;
  nivel: number;
  bahia: number;
  nBahias: number;
  /** Rectangulo en el plano (cm) y franja vertical (cm). */
  x: number;
  y: number;
  ancho: number;
  fondo: number;
  zBase: number;
  alto: number;
}

/** Numero de nivel de una seccion; 1 si no hay seccion o numero legible. */
export function nivelDeSeccion(nivel: string | null | undefined): number {
  const m = nivel ? /\d+/.exec(nivel) : null;
  return m ? Number.parseInt(m[0], 10) : 1;
}

function comparar(a: UbicacionDeRack, b: UbicacionDeRack): number {
  if (a.codigo !== b.codigo) {
    return a.codigo < b.codigo ? -1 : 1;
  }
  return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
}

function celda(
  u: UbicacionDeRack,
  nivel: number,
  bahia: number,
  nBahias: number,
  rack: GeometriaRack,
  m: MedidasRack,
): CeldaRack {
  const ancho = rack.ancho / nBahias;
  return {
    ubicacionId: u.id,
    nivel,
    bahia,
    nBahias,
    x: rack.x + (bahia - 1) * ancho,
    y: rack.y,
    ancho,
    fondo: rack.profundidad,
    zBase: m.altoBase + (Math.max(nivel, 1) - 1) * m.altoNivel,
    alto: m.altoNivel,
  };
}

export function derivarCeldasRack(
  rack: GeometriaRack,
  ubicaciones: UbicacionDeRack[],
  secciones: SeccionConNivel[],
): CeldaRack[] {
  const m = medidasRack(rack);
  const nivelPorSeccion = new Map(secciones.map((s) => [s.id, nivelDeSeccion(s.nivel)]));
  const porNivel = new Map<number, UbicacionDeRack[]>();
  for (const u of ubicaciones) {
    const nivel = u.seccion_id ? (nivelPorSeccion.get(u.seccion_id) ?? 1) : 1;
    porNivel.set(nivel, [...(porNivel.get(nivel) ?? []), u]);
  }
  const celdas: CeldaRack[] = [];
  for (const [nivel, lista] of porNivel) {
    lista
      .toSorted(comparar)
      .forEach((u, i) => celdas.push(celda(u, nivel, i + 1, lista.length, rack, m)));
  }
  return celdas.toSorted((a, b) => a.nivel - b.nivel || a.bahia - b.bahia);
}
