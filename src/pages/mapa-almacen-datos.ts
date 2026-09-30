/**
 * Fachada de compatibilidad: la capa de datos del mapa vive ahora en
 * `./mapa2d/` (un módulo por responsabilidad). Se re-exporta aquí para no
 * romper a los importadores existentes (mapa 3D, panel, geometría, historial).
 */
export {
  ALTO_NODO,
  ANCHO_NODO,
  SLUG_POR_TIPO,
  otrosParaChoque,
  posicionPorDefecto,
} from "./mapa2d/nodo-tipos";
export type { NodoMapa, PosicionMapaXY, ResumenNodo, TipoNodo } from "./mapa2d/nodo-tipos";
export {
  COLOR_NODO,
  colorOcupacion,
  colorRellenoNodo,
  resolverColorCss,
} from "./mapa2d/nodo-color";
export { useMapaAlmacenDatos } from "./mapa2d/useMapaAlmacenDatos";
export { useMoverNodoMapa } from "./mapa2d/useMoverNodoMapa";
