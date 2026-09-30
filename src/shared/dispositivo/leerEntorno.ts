import { CLAVE_DISPOSITIVO, type SenalesDispositivo } from "./detectar";

function leerForzado(): string | null {
  const deUrl = new URLSearchParams(window.location.search).get(CLAVE_DISPOSITIVO);
  if (deUrl) {
    return deUrl;
  }
  try {
    return window.localStorage.getItem(CLAVE_DISPOSITIVO);
  } catch {
    // Almacenamiento bloqueado (modo privado, política de WebView): se ignora.
    return null;
  }
}

/** Única función que toca `window` para decidir el dispositivo. */
export function leerSenales(): SenalesDispositivo {
  return {
    agente: window.navigator.userAgent,
    forzado: leerForzado(),
    punteroGrueso: window.matchMedia("(pointer: coarse)").matches,
    sinPuntero: window.matchMedia("(pointer: none)").matches,
    sinHover: window.matchMedia("(hover: none)").matches,
  };
}
