/**
 * Idioma de la interfaz (SPEC §17).
 *
 * Rustock habla castellano e inglés. La elección se guarda en dos sitios y por
 * razones distintas:
 *
 * - **En el equipo** (`localStorage`), para poder pintar el primer frame en el
 *   idioma correcto: la preferencia del usuario vive en el backend y llega por
 *   red, así que sin copia local la pantalla de acceso saldría siempre en
 *   castellano y cambiaría de golpe al iniciar sesión.
 * - **En el perfil** (backend), para que la persona encuentre su idioma en
 *   cualquier equipo del almacén.
 *
 * Los diccionarios son objetos tipados, no un archivo de datos: `es` es la
 * fuente de verdad y TypeScript exige que `en` tenga exactamente las mismas
 * claves y las mismas firmas. Una traducción que falte no compila, que es
 * justo lo contrario de lo que pasa con los `.json` de traducción al uso.
 */
import { create } from "zustand";

export type Idioma = "es" | "en";

/** Idiomas disponibles, con su nombre en su propia lengua. */
export const IDIOMAS: { codigo: Idioma; nombre: string; etiquetaHtml: string }[] = [
  { codigo: "es", nombre: "Español", etiquetaHtml: "es" },
  { codigo: "en", nombre: "English", etiquetaHtml: "en" },
];

const CLAVE = "rustock.idioma";

/** Idioma por defecto: el del navegador si lo hablamos, si no castellano. */
function idiomaDelNavegador(): Idioma {
  if (typeof navigator === "undefined") return "es";
  return navigator.languages?.some((l) => l.toLowerCase().startsWith("en")) ? "en" : "es";
}

function leerGuardado(): Idioma | null {
  try {
    const v = window.localStorage.getItem(CLAVE);
    return v === "es" || v === "en" ? v : null;
  } catch {
    return null;
  }
}

interface IdiomaState {
  idioma: Idioma;
  /** Cambia el idioma y lo recuerda en este equipo. */
  cambiar: (idioma: Idioma) => void;
  /** Aplica el idioma que llega del perfil, sin sobrescribir una elección
   *  explícita hecha en este equipo. */
  adoptarDelPerfil: (idioma: Idioma | null | undefined) => void;
}

/** Refleja el idioma en el documento: lectores de pantalla, corrector y
 *  separación silábica del navegador dependen de `<html lang>`. */
function aplicarAlDocumento(idioma: Idioma): void {
  if (typeof document !== "undefined") {
    document.documentElement.lang = idioma;
  }
}

const inicial = leerGuardado() ?? idiomaDelNavegador();
aplicarAlDocumento(inicial);

export const useIdioma = create<IdiomaState>((set, get) => ({
  idioma: inicial,
  cambiar(idioma) {
    if (get().idioma === idioma) return;
    try {
      window.localStorage.setItem(CLAVE, idioma);
    } catch {
      // Sin almacenamiento el idioma dura esta visita.
    }
    aplicarAlDocumento(idioma);
    set({ idioma });
  },
  adoptarDelPerfil(idioma) {
    if (!idioma) return;
    // Una elección explícita en este equipo manda sobre la del perfil: quien
    // acaba de cambiar el idioma no espera que la siguiente carga lo revierta.
    if (leerGuardado()) return;
    aplicarAlDocumento(idioma);
    set({ idioma });
  },
}));

/** Idioma actual fuera de React (formateo de fechas, exportaciones). */
export function idiomaActual(): Idioma {
  return useIdioma.getState().idioma;
}

/** Etiqueta BCP-47 para `Intl`. */
export function localeDe(idioma: Idioma = idiomaActual()): string {
  return idioma === "en" ? "en-US" : "es-ES";
}
