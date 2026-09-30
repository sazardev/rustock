/**
 * Empaquetado simple por rejilla de cajas dentro de una celda de rack. Pura,
 * sin three.js: devuelve coordenadas en cm relativas a la esquina minima de la
 * celda (x a lo ancho, y a lo fondo, z hacia arriba).
 */
import type { CeldaRack } from "../celdas/derivarCeldasRack";
import type { DimensionesProducto } from "./dimensionesProducto";

export type RectCelda = Pick<CeldaRack, "ancho" | "fondo" | "alto">;

export const TOPE_CAJAS_POR_CELDA = 400;

export interface CajaPintar {
  productoId: string;
  x: number;
  y: number;
  z: number;
  largo: number;
  ancho: number;
  alto: number;
}

export interface EntradaLlenado {
  productoId: string;
  cantidad: number;
  dimensiones: DimensionesProducto;
}

export interface LlenadoProducto {
  productoId: string;
  cantidad: number;
  /** Cajas pintadas (cada una representa `escalaResumen` unidades). */
  pintadas: number;
  /** Unidades que caben en el espacio que le toco en la celda. */
  capacidad: number;
  /** false si la cantidad excede lo que cabe (la celda queda llena). */
  cabe: boolean;
}

export interface LlenadoCelda {
  cajasAPintar: CajaPintar[];
  porProducto: LlenadoProducto[];
  /** Unidades totales por caja pintada (>= 1; > 1 cuando se activa el LOD). */
  escalaResumen: number;
  /** Fraccion 0..1 del volumen de la celda ocupada por las unidades. */
  llenado: number;
}

interface Caja3 {
  l: number;
  a: number;
  h: number;
}

function cabeEn(c: Caja3, r: RectCelda): boolean {
  return c.l <= r.ancho && c.a <= r.fondo && c.h <= r.alto;
}

/**
 * Orientacion natural (largo en X); si no cabe se prueba girada 90 grados y,
 * si tampoco, se reduce proporcionalmente hasta caber (escala <= 1).
 */
export function ajustarCaja(d: DimensionesProducto, r: RectCelda): Caja3 {
  const natural: Caja3 = { l: d.largo, a: d.ancho, h: d.alto };
  if (cabeEn(natural, r)) return natural;
  const girada: Caja3 = { l: d.ancho, a: d.largo, h: d.alto };
  if (cabeEn(girada, r)) return girada;
  const k = Math.min(1, r.ancho / natural.l, r.fondo / natural.a, r.alto / natural.h);
  return { l: natural.l * k, a: natural.a * k, h: natural.h * k };
}

/** Unidades que caben apiladas en toda la celda (nx*ny*nz, minimo 1). */
export function capacidadCelda(r: RectCelda, d: DimensionesProducto): number {
  const c = ajustarCaja(d, r);
  const eps = 1e-9;
  const nx = Math.max(1, Math.floor(r.ancho / c.l + eps));
  const ny = Math.max(1, Math.floor(r.fondo / c.a + eps));
  const nz = Math.max(1, Math.floor(r.alto / c.h + eps));
  return nx * ny * nz;
}

/**
 * Reparte los productos en franjas a lo ancho de la celda (mayor cantidad
 * primero): cada producto ocupa las columnas que necesita y apila hacia el
 * fondo y hacia arriba. Con mas unidades que `tope`, cada caja pintada
 * representa `escalaResumen` unidades.
 */
export function llenadoCelda(
  r: RectCelda,
  items: EntradaLlenado[],
  tope: number = TOPE_CAJAS_POR_CELDA,
): LlenadoCelda {
  const eps = 1e-9;
  // Unidades que realmente caben (una celda llena no dispara el LOD).
  const colocable = items.reduce(
    (s, i) => s + Math.min(Math.max(0, i.cantidad), capacidadCelda(r, i.dimensiones)),
    0,
  );
  const factor = colocable > tope ? tope / colocable : 1;
  const cajasAPintar: CajaPintar[] = [];
  const porProducto: LlenadoProducto[] = [];
  let xLibre = 0;
  let volumen = 0;

  for (const item of items) {
    if (item.cantidad <= 0) continue;
    const c = ajustarCaja(item.dimensiones, r);
    const ny = Math.max(1, Math.floor(r.fondo / c.a + eps));
    const nz = Math.max(1, Math.floor(r.alto / c.h + eps));
    const columnasLibres = Math.floor((r.ancho - xLibre) / c.l + eps);
    const capacidad = Math.max(0, columnasLibres) * ny * nz;
    const unidades = Math.min(item.cantidad, capacidad);
    const objetivo = unidades > 0 ? Math.max(1, Math.round(unidades * factor)) : 0;
    const pintadas = Math.min(objetivo, capacidad, Math.max(0, tope - cajasAPintar.length));
    // Con LOD las cajas pintadas se reparten para conservar la forma del bloque.
    const colocadas = factor < 1 ? pintadas : Math.min(unidades, pintadas);
    for (let i = 0; i < colocadas; i++) {
      const columna = Math.floor(i / (ny * nz));
      const resto = i % (ny * nz);
      cajasAPintar.push({
        productoId: item.productoId,
        x: xLibre + columna * c.l,
        y: Math.floor(resto / nz) * c.a,
        z: (resto % nz) * c.h,
        largo: c.l,
        ancho: c.a,
        alto: c.h,
      });
    }
    const columnasUsadas = Math.ceil(colocadas / (ny * nz));
    xLibre += columnasUsadas * c.l;
    volumen += unidades * c.l * c.a * c.h;
    porProducto.push({
      productoId: item.productoId,
      cantidad: item.cantidad,
      pintadas: colocadas,
      capacidad,
      cabe: item.cantidad <= capacidad,
    });
  }

  const unidadesPintadas = porProducto.reduce((s, p) => s + Math.min(p.cantidad, p.capacidad), 0);
  const escalaResumen =
    cajasAPintar.length > 0 ? Math.max(1, unidadesPintadas / cajasAPintar.length) : 1;
  const volumenCelda = r.ancho * r.fondo * r.alto;
  return {
    cajasAPintar,
    porProducto,
    escalaResumen,
    llenado: volumenCelda > 0 ? Math.min(1, volumen / volumenCelda) : 0,
  };
}
