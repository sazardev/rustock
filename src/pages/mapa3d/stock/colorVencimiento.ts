/** Color de un lote segun los dias que faltan para vencer: rojo (vencido o a
 * punto), ambar (proximo) y verde (holgado). Todos salen de tokens; aqui solo
 * se interpola entre ellos. Pura salvo por `resolverColorCss` al crear la
 * paleta. */
import { Color } from "three";
import { resolverColorCss } from "../../mapa-almacen-datos";

const MS_DIA = 86_400_000;
/** Dias hasta los que el lote se considera en riesgo (rojo -> ambar). */
export const DIAS_RIESGO = 30;
/** Dias desde los que el lote esta holgado (verde pleno). */
export const DIAS_HOLGADO = 90;

export interface PaletaVencimiento {
  peligro: Color;
  aviso: Color;
  bien: Color;
  sinFecha: Color;
}

export function crearPaletaVencimiento(): PaletaVencimiento {
  return {
    peligro: new Color(resolverColorCss("--color-danger-500")),
    aviso: new Color(resolverColorCss("--color-warning-500")),
    bien: new Color(resolverColorCss("--color-success-500")),
    sinFecha: new Color(resolverColorCss("--color-gray-400")),
  };
}

/** Dias (enteros, negativos si ya vencio) hasta la fecha ISO; null si no hay. */
export function diasParaVencer(vencimiento: string | undefined, ahora: number): number | null {
  if (!vencimiento) {
    return null;
  }
  const t = Date.parse(vencimiento);
  return Number.isNaN(t) ? null : Math.floor((t - ahora) / MS_DIA);
}

export function colorVencimiento(
  dias: number | null,
  paleta: PaletaVencimiento,
  destino = new Color(),
): Color {
  if (dias === null) {
    return destino.copy(paleta.sinFecha);
  }
  if (dias <= 0) {
    return destino.copy(paleta.peligro);
  }
  if (dias < DIAS_RIESGO) {
    return destino.copy(paleta.peligro).lerp(paleta.aviso, dias / DIAS_RIESGO);
  }
  if (dias < DIAS_HOLGADO) {
    return destino
      .copy(paleta.aviso)
      .lerp(paleta.bien, (dias - DIAS_RIESGO) / (DIAS_HOLGADO - DIAS_RIESGO));
  }
  return destino.copy(paleta.bien);
}
