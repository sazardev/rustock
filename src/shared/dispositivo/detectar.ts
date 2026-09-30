export type Dispositivo = "tv" | "tactil" | "escritorio";

export const DISPOSITIVOS: readonly Dispositivo[] = ["tv", "tactil", "escritorio"];

/** Clave de localStorage y parámetro de URL con que se fuerza un dispositivo
 * (útil para probar la interfaz de TV desde un navegador de escritorio). */
export const CLAVE_DISPOSITIVO = "dispositivo";

// Android TV, Fire TV, Google TV, Tizen, webOS, Chromecast y navegadores de
// televisores inteligentes declaran su naturaleza en el agente de usuario.
const AGENTE_TV =
  /\b(Android TV|GoogleTV|AFT[A-Z]*|BRAVIA|SMART-TV|SmartTV|Tizen|Web0S|webOS|CrKey|HbbTV|NetCast|VIDAA)\b/i;

export interface SenalesDispositivo {
  agente: string;
  forzado: string | null;
  punteroGrueso: boolean;
  sinPuntero: boolean;
  sinHover: boolean;
}

function esDispositivo(valor: string | null): valor is Dispositivo {
  return DISPOSITIVOS.includes(valor as Dispositivo);
}

/** Decide el tipo de dispositivo a partir de señales ya leídas del entorno.
 * Es pura: no toca `window`, así que se puede razonar (y probar) sin DOM. */
export function clasificarDispositivo(senales: SenalesDispositivo): Dispositivo {
  if (esDispositivo(senales.forzado)) {
    return senales.forzado;
  }
  if (AGENTE_TV.test(senales.agente)) {
    return "tv";
  }
  // Un control remoto no es un puntero: los televisores que no se anuncian
  // en el agente suelen reportar `pointer: none` junto a `hover: none`.
  if (senales.sinPuntero && senales.sinHover) {
    return "tv";
  }
  return senales.punteroGrueso ? "tactil" : "escritorio";
}
