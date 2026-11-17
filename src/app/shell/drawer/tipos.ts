import type { NavItem } from "../../nav";

/** Ítem de navegación con el estado que solo le importa al drawer. */
export interface NavFilaView extends NavItem {
  fijado: boolean;
}

/** Grupo ya filtrado y con identificador estable entre idiomas. */
export interface NavGrupoView {
  id: string;
  title: string;
  items: NavFilaView[];
}

/** Normaliza para filtrar sin que importen mayúsculas ni acentos. */
export function normalizar(texto: string): string {
  return texto
    .normalize("NFD")
    .replaceAll(/[\u0300-\u036F]/g, "")
    .toLowerCase();
}
