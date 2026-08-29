/**
 * Punto de entrada de la internacionalización (SPEC §17).
 *
 * Uso en un componente:
 *
 *     const t = useT();
 *     <Button>{t.comun.guardar}</Button>
 *     <p>{t.comun.mostrando({ desde: 1, hasta: 20, total: 93 })}</p>
 *
 * No hay claves en texto ni analizador de rutas: se accede al diccionario como
 * a un objeto, así el editor autocompleta y una clave inventada no compila.
 */
import { useIdioma, type Idioma } from "./idioma";
import { es, type Diccionario } from "./es";
import { en } from "./en";

const DICCIONARIOS: Record<Idioma, Diccionario> = { es, en };

/** Diccionario del idioma activo. Re-renderiza al cambiar de idioma. */
export function useT(): Diccionario {
  const idioma = useIdioma((s) => s.idioma);
  return DICCIONARIOS[idioma];
}

/** Diccionario fuera de React (formateo, exportaciones, mensajes de error). */
export function traducir(idioma?: Idioma): Diccionario {
  return DICCIONARIOS[idioma ?? useIdioma.getState().idioma];
}

export { useIdioma, IDIOMAS, idiomaActual, localeDe } from "./idioma";
export type { Idioma } from "./idioma";
export type { Diccionario } from "./es";
