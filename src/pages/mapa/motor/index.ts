/** Motor de colocacion del mapa: API publica. */
export { crearIndice } from "./indiceEspacial";
export type { IndiceEspacial } from "./indiceEspacial";
export { candidatoDe, cuerposDe } from "./cuerpos";
export { useMotorColocacion } from "./useMotorColocacion";
export { primerCuerpoEnChoque } from "./colisiones";
export { evaluarColocacion } from "./evaluarColocacion";
export { ajustarAVecinos } from "./guias";
export type { Guia } from "./guias";
export { posicionLibreCercana } from "./posicionLibre";
export { rectContiene, rectsSolapan, snap } from "./geometria";
export { zonaContenedoraDePunto } from "./contencion";
export { LIBRE } from "./tipos";
export type {
  Candidato,
  CuerpoMapa,
  EstadoColocacion,
  OpcionesColocacion,
  RectMapa,
  Resultado,
} from "./tipos";
