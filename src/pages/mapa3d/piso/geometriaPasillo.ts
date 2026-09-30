/** Marcas de piso de un pasillo (puras): posiciones de flechas de sentido y
 * segmentos de la cota de ancho. Todo en metros de escena. */
import type { NodoMapa } from "../../mapa-almacen-datos";
import { alturaNodoCm, baseNodoCm } from "../../mapa/alturas";
import { M_POR_UNIDAD } from "../../mapa/unidades";
import type { PosicionXY } from "../tipos";
import { tamRealDe } from "../utils";

export interface Flecha {
  x: number;
  y: number;
  z: number;
  /** Giro sobre Y (0: apunta a +X; PI/2: apunta a +Z... ver aplicacion). */
  giro: number;
  /** Largo y ancho de la flecha (m). */
  largo: number;
  ancho: number;
}

/** Separacion entre flechas a lo largo del pasillo (m). */
const SEPARACION_M = 2.5;

export function flechasDePasillo(n: NodoMapa, pos: PosicionXY): Flecha[] {
  const tam = tamRealDe(n);
  const ancho = tam.ancho * M_POR_UNIDAD;
  const fondo = tam.profundo * M_POR_UNIDAD;
  const alongX = ancho >= fondo;
  const largoPasillo = alongX ? ancho : fondo;
  const cruz = alongX ? fondo : ancho;
  const largo = Math.min(Math.max(cruz * 0.8, 0.4), 1.4, largoPasillo * 0.6);
  const cantidad = Math.max(1, Math.floor(largoPasillo / SEPARACION_M));
  const y = (baseNodoCm(n) + alturaNodoCm(n)) * M_POR_UNIDAD + 0.004;
  const cx = (pos.x + tam.ancho / 2) * M_POR_UNIDAD;
  const cz = (pos.y + tam.profundo / 2) * M_POR_UNIDAD;
  const flechas: Flecha[] = [];
  for (let i = 0; i < cantidad; i++) {
    const desde = (i + 0.5) * (largoPasillo / cantidad) - largoPasillo / 2;
    flechas.push({
      x: alongX ? cx + desde : cx,
      y,
      z: alongX ? cz : cz + desde,
      giro: alongX ? 0 : -Math.PI / 2,
      largo,
      ancho: largo * 0.55,
    });
  }
  return flechas;
}

/** Cota del ancho libre: linea a traves del lado corto con marcas en los
 * extremos; devuelve pares de vertices (x,y,z) para `lineSegments`. */
export function segmentosCota(n: NodoMapa, pos: PosicionXY): number[] {
  const tam = tamRealDe(n);
  const ancho = tam.ancho * M_POR_UNIDAD;
  const fondo = tam.profundo * M_POR_UNIDAD;
  const alongX = ancho >= fondo;
  const y = (baseNodoCm(n) + alturaNodoCm(n)) * M_POR_UNIDAD + 0.008;
  const x0 = pos.x * M_POR_UNIDAD;
  const z0 = pos.y * M_POR_UNIDAD;
  const marca = 0.12;
  if (alongX) {
    const x = x0 + ancho * 0.12;
    return [
      x,
      y,
      z0,
      x,
      y,
      z0 + fondo,
      x - marca,
      y,
      z0,
      x + marca,
      y,
      z0,
      x - marca,
      y,
      z0 + fondo,
      x + marca,
      y,
      z0 + fondo,
    ];
  }
  const z = z0 + fondo * 0.12;
  return [
    x0,
    y,
    z,
    x0 + ancho,
    y,
    z,
    x0,
    y,
    z - marca,
    x0,
    y,
    z + marca,
    x0 + ancho,
    y,
    z - marca,
    x0 + ancho,
    y,
    z + marca,
  ];
}
