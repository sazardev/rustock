/**
 * Tema de la UI (DESIGN §3.1): aplica las variables CSS del tema activo al
 * root del documento, sobrescribiendo los defaults de `tokens.css` en runtime.
 *
 * Los valores vienen del backend (`obtener_tema_*`): la paleta y el modo los
 * elige el usuario (o el ADMIN globalmente) y Rust genera el mapa completo de
 * tokens por modo. Este store es solo el "pincel": no contiene paletas ni
 * lógica de color.
 */
import { create } from "zustand";
import * as backend from "./backend";
import type { TemaActivo } from "./types";

interface TemaState {
  /** Tema actualmente aplicado (null = defaults de tokens.css). */
  tema: TemaActivo | null;
  /** Aplica el mapa de variables al root (para el tema ya resuelto). */
  aplicar: (tema: TemaActivo) => void;
  /** Vista previa: obtiene (paleta, modo) del backend y la aplica sin persistir. */
  previsualizar: (temaId: string, modoOscuro: boolean) => Promise<void>;
  /** Tema resuelto de la sesión activa (preferencia personal o global). */
  refrescarActivo: () => Promise<TemaActivo | null>;
  /** Tema global de la empresa (sin sesión: login, landing). */
  refrescarGlobal: () => Promise<TemaActivo | null>;
  /** Vuelve a los defaults de tokens.css (limpia las variables inline). */
  limpiar: () => void;
}

function escribirVariables(tema: TemaActivo): void {
  const root = document.documentElement;
  for (const [token, valor] of Object.entries(tema.variables)) {
    root.style.setProperty(token, valor);
  }
  root.dataset.tema = tema.id;
  root.dataset.modo = tema.modo.toLowerCase();
}

export const useTema = create<TemaState>((set) => ({
  tema: null,
  aplicar: (tema) => {
    escribirVariables(tema);
    set({ tema });
  },
  async previsualizar(temaId, modoOscuro) {
    try {
      const tema = await backend.obtenerTema(temaId, modoOscuro);
      escribirVariables(tema);
      set({ tema });
    } catch {
      // Backend caído o tema inválido: se mantiene el tema actual.
    }
  },
  async refrescarActivo() {
    try {
      const tema = await backend.obtenerTemaActivo();
      escribirVariables(tema);
      set({ tema });
      return tema;
    } catch {
      return null;
    }
  },
  async refrescarGlobal() {
    try {
      const tema = await backend.obtenerTemaGlobal();
      escribirVariables(tema);
      set({ tema });
      return tema;
    } catch {
      return null;
    }
  },
  limpiar() {
    const root = document.documentElement;
    const aplicadas = useTema.getState().tema;
    if (aplicadas) {
      for (const token of Object.keys(aplicadas.variables)) {
        root.style.removeProperty(token);
      }
    }
    delete root.dataset.tema;
    delete root.dataset.modo;
    set({ tema: null });
  },
}));

/** Lee el tema actual sin suscribirse (para módulos fuera de componentes). */
export function temaActual(): TemaActivo | null {
  return useTema.getState().tema;
}
