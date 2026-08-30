// oxlint-disable eslint/max-lines
/**
 * Customer Manual content, in English.
 *
 * TRADUCCIÓN EN CURSO. El manual son 52 capítulos de prosa larga; se traduce
 * por partes. Mientras una parte no esté, se sirve la castellana: es visible y
 * está documentado aquí, no es un silencio.
 */
import { MANUAL_GLOSARIO_ES, MANUAL_PARTES_ES } from "./manual-contenido.es";
import type { ManualParte, TerminoManual } from "./manual-tipos";

export const MANUAL_PARTES_EN: ManualParte[] = MANUAL_PARTES_ES;
export const MANUAL_GLOSARIO_EN: TerminoManual[] = MANUAL_GLOSARIO_ES;
