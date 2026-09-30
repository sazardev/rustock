/** Holgura de pasillo entre racks enfrentados: advertencia, nunca bloqueo. */
import { HOLGURA_PASILLO_CM } from "../reglas";
import { formatearLongitud, type UnidadLongitud } from "../unidades";
import type { IndiceEspacial } from "./indiceEspacial";
import { LIBRE, type Candidato, type CuerpoMapa, type Resultado } from "./tipos";

/** Separacion entre dos rects que se miran de frente (proyecciones que se
 * cruzan en el otro eje); null si no se enfrentan. 0 = tocandose. */
function separacionEnfrentada(a: Candidato["rect"], b: CuerpoMapa): number | null {
  const cruzanY = a.y < b.y + b.profundo && b.y < a.y + a.profundo;
  const cruzanX = a.x < b.x + b.ancho && b.x < a.x + a.ancho;
  const gapX = Math.max(b.x - (a.x + a.ancho), a.x - (b.x + b.ancho));
  const gapY = Math.max(b.y - (a.y + a.profundo), a.y - (b.y + b.profundo));
  if (cruzanY && gapX >= 0) {
    return gapX;
  }
  if (cruzanX && gapY >= 0) {
    return gapY;
  }
  return null;
}

export function evaluarHolgura(
  indice: IndiceEspacial,
  c: Candidato,
  ignorar?: ReadonlySet<string>,
  holguraCm: number = HOLGURA_PASILLO_CM,
  unidad: UnidadLongitud = "cm",
): Resultado {
  if (c.tipo !== "rack") {
    return LIBRE;
  }
  let peor: { gap: number; otro: CuerpoMapa } | null = null;
  for (const o of indice.consultar(c.rect, holguraCm)) {
    if (o.tipo !== "rack" || o.id === c.id || ignorar?.has(o.id)) {
      continue;
    }
    const gap = separacionEnfrentada(c.rect, o);
    if (gap !== null && gap > 0 && gap < holguraCm && (!peor || gap < peor.gap)) {
      peor = { gap, otro: o };
    }
  }
  if (!peor) {
    return LIBRE;
  }
  return {
    estado: "advertencia",
    motivo: `pasillo de ${formatearLongitud(peor.gap, unidad)}, mínimo ${formatearLongitud(holguraCm, unidad)}`,
    conflictoId: peor.otro.id,
  };
}
