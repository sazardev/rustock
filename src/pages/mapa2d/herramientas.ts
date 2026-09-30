/** Catálogo de herramientas del modo construcción, en el idioma activo. */
import type { Icon } from "../../shared/ui";
import type { Diccionario } from "../../shared/i18n";
import type { Herramienta } from "./tipos";

export interface DefHerramienta {
  id: Herramienta;
  etiqueta: string;
  icono: Parameters<typeof Icon>[0]["name"];
  ayuda: string;
}

export function herramientasDe(t: Diccionario): DefHerramienta[] {
  return [
    {
      id: "seleccionar",
      etiqueta: t.mapa.seleccionar,
      icono: "ver",
      ayuda: t.mapa.arrastrarRedimensionar,
    },
    { id: "zona", etiqueta: t.mapa.zona, icono: "zona", ayuda: t.mapa.dibujaZonaNueva },
    { id: "pasillo", etiqueta: t.mapa.pasillo, icono: "ordenar", ayuda: t.mapa.dibujaPasillo },
    { id: "rack", etiqueta: t.mapa.rack, icono: "producto", ayuda: t.mapa.dibujaRack },
  ];
}
