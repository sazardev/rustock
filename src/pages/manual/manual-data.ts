/**
 * Punto de entrada del Manual: elige el contenido del idioma activo.
 *
 * Mismo criterio que la Ayuda: el manual es prosa larga, así que cada lengua
 * tiene su archivo completo y el tipo compartido obliga a que coincidan.
 */
import type { Idioma } from "../../shared/i18n";
import { MANUAL_GLOSARIO_ES, MANUAL_PARTES_ES } from "./manual-contenido.es";
import { MANUAL_GLOSARIO_EN, MANUAL_PARTES_EN } from "./manual-contenido.en";
import type { ManualParte, TerminoManual } from "./manual-tipos";

export function manualPartes(idioma: Idioma): ManualParte[] {
  return idioma === "en" ? MANUAL_PARTES_EN : MANUAL_PARTES_ES;
}

export function manualGlosario(idioma: Idioma): TerminoManual[] {
  return idioma === "en" ? MANUAL_GLOSARIO_EN : MANUAL_GLOSARIO_ES;
}

/** Ids de los capítulos, para construir rutas (idénticos en las dos lenguas). */
export function idsDeCapitulos(): string[] {
  return MANUAL_PARTES_ES.flatMap((p) => p.capitulos).map((c) => c.id);
}

export * from "./manual-tipos";
