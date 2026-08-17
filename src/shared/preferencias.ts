/**
 * Preferencias de la sesión activa (SPEC §14.4, §17.1): las guarda el backend
 * en `preferencias_usuario` con fallbacks de `configuracion_empresa`. Este
 * store es el espejo de UI: aplica el tamaño de fuente al root, ordena el
 * sidebar y parametriza el formato de fechas (ver `format.ts`).
 *
 * No duplica datos de negocio: solo preferencias de presentación, tal como
 * el backend las resuelve (`obtener_preferencias_usuario`).
 */
import { create } from "zustand";
import * as backend from "./backend";
import { useTema } from "./tema";
import type { EditarPreferenciasUsuario, PreferenciasResueltas } from "./types";

/** Escalas de fuente aplicadas al `font-size` del root (todo el CSS usa rem). */
export const TAMANIO_FUENTE_PX: Record<string, string> = {
  PEQUENA: "87.5%", // 14px
  MEDIA: "100%", // 16px (defecto del diseño)
  GRANDE: "112.5%", // 18px
};

interface PreferenciasState {
  cargando: boolean;
  resueltas: PreferenciasResueltas | null;
  refrescar: () => Promise<void>;
  guardar: (cambios: EditarPreferenciasUsuario) => Promise<PreferenciasResueltas>;
}

function aplicarFuente(tamano: string | undefined): void {
  const escala = TAMANIO_FUENTE_PX[tamano ?? "MEDIA"] ?? TAMANIO_FUENTE_PX.MEDIA;
  document.documentElement.style.fontSize = escala;
}

export const usePreferencias = create<PreferenciasState>((set) => ({
  cargando: false,
  resueltas: null,
  async refrescar() {
    try {
      const resueltas = await backend.obtenerPreferenciasUsuario();
      aplicarFuente(resueltas.tamano_fuente);
      set({ resueltas, cargando: false });
      // El tema activo se resuelve aparte (mismo backend, mismas prefs).
      void useTema.getState().refrescarActivo();
    } catch {
      // Sin sesión o backend caído: se mantiene el estado por defecto.
      aplicarFuente("MEDIA");
      set({ resueltas: null, cargando: false });
    }
  },
  async guardar(cambios) {
    const resueltas = await backend.guardarPreferenciasUsuario(cambios);
    aplicarFuente(resueltas.tamano_fuente);
    set({ resueltas });
    void useTema.getState().refrescarActivo();
    return resueltas;
  },
}));

/**
 * Lee el estado actual sin suscribirse (para módulos fuera de componentes,
 * como `format.ts`). Devuelve null si aún no se cargaron preferencias.
 */
export function preferenciasActuales(): PreferenciasResueltas | null {
  return usePreferencias.getState().resueltas;
}

export function reiniciarFuente(): void {
  aplicarFuente("MEDIA");
}
