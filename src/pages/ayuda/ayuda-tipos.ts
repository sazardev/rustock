/**
 * Tipos y helpers de la sección Ayuda de Rustock.
 *
 * El contenido vive en `ayuda-contenido.<idioma>.ts`, uno por lengua: la
 * documentación se escribe y se revisa como prosa, y partirla en claves de
 * diccionario la volvería ilegible para quien la mantiene.
 *
 * Este archivo documenta los módulos TAL COMO funcionan en la aplicación hoy
 * (rutas reales del router, acciones y textos de los formularios, estados y
 * comportamientos que implementa el backend). Se mantiene a mano; cuando un
 * módulo cambie, hay que actualizar aquí la sección correspondiente.
 *
 * Estructura: grupos (espejo del sidebar) -> módulos -> secciones -> bloques.
 */
import type { IconName } from "../../shared/ui";

export type AyudaNotaTono = "info" | "warning" | "success";

export type AyudaBloque =
  | { tipo: "texto"; texto: string }
  | { tipo: "lista"; items: string[] }
  | { tipo: "pasos"; pasos: string[] }
  | { tipo: "tabla"; cabeceras: string[]; filas: string[][] }
  | { tipo: "enlaces"; items: Array<{ etiqueta: string; href: string }> }
  | { tipo: "nota"; texto: string; tono?: AyudaNotaTono };

export interface AyudaSeccion {
  titulo: string;
  bloques: AyudaBloque[];
}

export interface AyudaModulo {
  id: string;
  titulo: string;
  icono: IconName;
  /** Descripción corta para el índice de Ayuda. */
  resumen: string;
  /** Para qué sirve el módulo en la operación (contexto de negocio). */
  paraQueSirve?: string;
  /** En qué escenarios del día a día conviene usar este módulo. */
  cuandoUsarlo?: string;
  /** Slugs del glosario que la guía usa (se enlazan en la página del módulo). */
  terminosClave?: string[];
  /** Ids de otras guías (módulos y procesos) relacionadas con esta. */
  relacionados?: string[];
  secciones: AyudaSeccion[];
}

export interface AyudaGrupo {
  titulo: string;
  modulos: AyudaModulo[];
}

export interface TerminoGlosario {
  /** Slug estable usado como ancla (/ayuda/glosario#<id>) y para backlinks. */
  id: string;
  termino: string;
  definicion: string;
}

/** Helper de búsqueda: concatena título, resumen y textos de las secciones. */
export function textoModulo(modulo: AyudaModulo): string {
  const bloques = modulo.secciones.flatMap((s) => s.bloques);
  const fragmentos: string[] = [modulo.titulo, modulo.resumen, modulo.paraQueSirve ?? ""];
  for (const b of bloques) {
    if (b.tipo === "texto" || b.tipo === "nota") fragmentos.push(b.texto);
    else if (b.tipo === "lista") fragmentos.push(b.items.join(" "));
    else if (b.tipo === "pasos") fragmentos.push(b.pasos.join(" "));
    else if (b.tipo === "tabla") fragmentos.push(b.filas.flat().join(" "));
    else fragmentos.push(b.items.map((i) => i.etiqueta).join(" "));
  }
  return fragmentos.join(" ").toLowerCase();
}
