/** Contencion en zona: pasillos, racks y ubicaciones de piso deben quedar
 * completos dentro de su zona. */
import { requiereZona } from "../reglas";
import { rectContiene } from "./geometria";
import type { IndiceEspacial } from "./indiceEspacial";
import { LIBRE, type Candidato, type CuerpoMapa, type Resultado } from "./tipos";

interface ZonaLike {
  id: string;
  ancho: number;
  profundidad: number;
  pos_x: number | null;
  pos_y: number | null;
}

/** Zona de menor area que contiene el punto (la mas especifica si hay
 * anidadas), o null si no cae en ninguna zona posicionada. */
export function zonaContenedoraDePunto(px: number, py: number, zonas: ZonaLike[]): string | null {
  let mejor: { id: string; area: number } | null = null;
  for (const z of zonas) {
    if (z.pos_x === null || z.pos_y === null) {
      continue;
    }
    if (px < z.pos_x || py < z.pos_y) {
      continue;
    }
    if (px > z.pos_x + z.ancho || py > z.pos_y + z.profundidad) {
      continue;
    }
    const area = z.ancho * z.profundidad;
    if (!mejor || area < mejor.area) {
      mejor = { id: z.id, area };
    }
  }
  return mejor?.id ?? null;
}

function zonaEnPunto(indice: IndiceEspacial, px: number, py: number): CuerpoMapa | null {
  const zonas = indice
    .consultar({ x: px, y: py, ancho: 0, profundo: 0 })
    .filter((c) => c.tipo === "zona");
  const id = zonaContenedoraDePunto(
    px,
    py,
    zonas.map((z) => ({
      id: z.id,
      ancho: z.ancho,
      profundidad: z.profundo,
      pos_x: z.x,
      pos_y: z.y,
    })),
  );
  return id ? (indice.porId(id) ?? null) : null;
}

/** Bloqueado si el candidato no cabe dentro de su zona; libre si no aplica. */
export function evaluarContencion(indice: IndiceEspacial, c: Candidato): Resultado {
  if (!requiereZona(c.tipo)) {
    return LIBRE;
  }
  let zona: CuerpoMapa | null = null;
  if (c.zonaId) {
    zona = indice.porId(c.zonaId) ?? null;
    if (!zona) {
      return LIBRE; // zona aun sin posicion: no hay limite que comprobar
    }
  } else {
    zona = zonaEnPunto(indice, c.rect.x + c.rect.ancho / 2, c.rect.y + c.rect.profundo / 2);
    if (!zona) {
      return { estado: "bloqueado", motivo: "debe quedar dentro de una zona", conflictoId: null };
    }
  }
  if (rectContiene(zona, c.rect)) {
    return LIBRE;
  }
  return {
    estado: "bloqueado",
    motivo: `queda fuera de la zona ${zona.codigo}`,
    conflictoId: zona.id,
  };
}
