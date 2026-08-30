/**
 * Punto de entrada de la Ayuda: elige el contenido del idioma activo.
 *
 * La documentación no vive en el diccionario de interfaz. Una guía es prosa
 * larga —párrafos, tablas, pasos numerados— y trocearla en claves la volvería
 * imposible de escribir y de revisar. Cada lengua tiene su archivo completo, y
 * el tipo compartido garantiza que las dos tengan la misma forma.
 */
import type { Idioma } from "../../shared/i18n";
import { AYUDA_GRUPOS_ES, GLOSARIO_ES } from "./ayuda-contenido.es";
import { AYUDA_GRUPOS_EN, GLOSARIO_EN } from "./ayuda-contenido.en";
import type { AyudaGrupo, TerminoGlosario } from "./ayuda-tipos";

export function ayudaGrupos(idioma: Idioma): AyudaGrupo[] {
  return idioma === "en" ? AYUDA_GRUPOS_EN : AYUDA_GRUPOS_ES;
}

export function glosario(idioma: Idioma): TerminoGlosario[] {
  return idioma === "en" ? GLOSARIO_EN : GLOSARIO_ES;
}

/**
 * Ids de las guías, para construir rutas. Son idénticos en las dos lenguas
 * —son identificadores, no texto— así que basta con leerlos de una.
 */
export function idsDeGuias(): string[] {
  return AYUDA_GRUPOS_ES.flatMap((g) => g.modulos).map((m) => m.id);
}

export * from "./ayuda-tipos";
