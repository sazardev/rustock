/**
 * Reglas del mapa: UNICA fuente en TS. Lee `src-tauri/reglas-mapa.json`, el
 * mismo archivo que consume el backend en Rust, para que no exista una
 * segunda copia que pueda derivar.
 */
import reglas from "../../../src-tauri/reglas-mapa.json";
import type { TipoNodo } from "./tipos-nodo";

/** Paso de la rejilla de ajuste magnetico (cm). */
export const PASO_REJILLA: number = reglas.paso_rejilla;
/** Lado minimo aceptado por el backend para tipos redimensionables (cm). */
export const LADO_MINIMO: number = reglas.lado_minimo;
/** Holgura minima de pasillo entre racks enfrentados (cm). */
export const HOLGURA_PASILLO_CM: number = reglas.holgura_pasillo_cm_defecto;
/** Altura de una persona por defecto (cm). */
export const ALTURA_PERSONA_CM: number = reglas.altura_persona_cm_defecto;
/** Medidas por defecto de un rack cuando la BD no las trae. */
export const RACK_DEFECTO = {
  niveles: reglas.rack.niveles_defecto,
  altoNivel: reglas.rack.alto_nivel_cm_defecto,
  altoBase: reglas.rack.alto_base_cm_defecto,
} as const;

// El contrato declara los pares una sola vez; aqui se hacen simetricos por si
// alguna vez se escribe uno solo de los dos sentidos.
const PARES = new Set<string>(
  reglas.pares_prohibidos.flatMap(([a, b]) => [`${a}|${b}`, `${b}|${a}`]),
);
const CONTENIDOS = new Set<string>(reglas.contencion_en_zona);

/** Dos tipos no pueden solaparse. Zona vs hijos: la contencion esta permitida. */
export function solapeProhibido(a: TipoNodo, b: TipoNodo): boolean {
  return PARES.has(`${a}|${b}`);
}

/** El tipo debe quedar completo dentro de su zona. */
export function requiereZona(tipo: TipoNodo): boolean {
  return CONTENIDOS.has(tipo);
}
