/**
 * Manual del Cliente — Rustock
 * Fuente de verdad cliente: SPEC + código verificable.
 * Estructura: Parte → Capítulo → Secciones → Bloques.
 * Versión v0.3.0
 */
import type { IconName } from "../../shared/ui";

export type ManualNotaTono = "info" | "warning" | "success";
export type ManualBloque =
  | { tipo: "texto"; texto: string }
  | { tipo: "lista"; items: string[] }
  | { tipo: "pasos"; pasos: string[] }
  | { tipo: "tabla"; cabeceras: string[]; filas: string[][] }
  | { tipo: "enlaces"; items: Array<{ etiqueta: string; href: string }> }
  | { tipo: "nota"; texto: string; tono?: ManualNotaTono };
export interface ManualSeccion {
  titulo: string;
  bloques: ManualBloque[];
}
export interface ManualCapitulo {
  id: string;
  titulo: string;
  icono: IconName;
  resumen: string;
  paraQueSirve?: string;
  cuandoUsarlo?: string;
  terminosClave?: string[];
  relacionados?: string[];
  secciones: ManualSeccion[];
}
export interface ManualParte {
  titulo: string;
  descripcion: string;
  capitulos: ManualCapitulo[];
}
export interface TerminoManual {
  id: string;
  termino: string;
  definicion: string;
}
export function textoManual(cap: ManualCapitulo): string {
  const fragmentos: string[] = [
    cap.titulo,
    cap.resumen,
    cap.paraQueSirve ?? "",
    cap.cuandoUsarlo ?? "",
  ];
  for (const s of cap.secciones)
    for (const b of s.bloques) {
      if (b.tipo === "texto" || b.tipo === "nota") fragmentos.push(b.texto);
      else if (b.tipo === "lista") fragmentos.push(b.items.join(" "));
      else if (b.tipo === "pasos") fragmentos.push(b.pasos.join(" "));
      else if (b.tipo === "tabla") fragmentos.push(b.filas.flat().join(" "));
      else fragmentos.push(b.items.map((i) => i.etiqueta).join(" "));
    }
  return fragmentos.join(" ").toLowerCase();
}
