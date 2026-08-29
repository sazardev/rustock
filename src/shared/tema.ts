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

/** Copia local del último tema resuelto, para pintarlo antes del primer frame. */
const CLAVE_CACHE = "rustock.tema";

/**
 * Aplica el mapa de variables al root.
 *
 * Mientras se aplica se suspenden **todas** las transiciones del documento. Sin
 * eso, cada elemento con `transition` anima desde el valor por defecto de
 * `tokens.css` (tema claro) hasta el del tema real: en modo oscuro se ve cómo
 * los campos y las tarjetas pasan de blanco a oscuro en cada carga. El cambio
 * de tema no es una interacción del usuario, así que no debe animarse.
 */
function escribirVariables(tema: TemaActivo): void {
  const root = document.documentElement;
  root.dataset.temaAplicando = "";
  for (const [token, valor] of Object.entries(tema.variables)) {
    root.style.setProperty(token, valor);
  }
  root.dataset.tema = tema.id;
  root.dataset.modo = tema.modo.toLowerCase();
  // Forzar el recálculo antes de volver a permitir transiciones: si no, el
  // navegador agrupa ambos cambios y la supresión no llega a tener efecto.
  void root.offsetHeight;
  requestAnimationFrame(() => {
    delete root.dataset.temaAplicando;
  });
  try {
    window.localStorage.setItem(CLAVE_CACHE, JSON.stringify(tema));
  } catch {
    // Sin almacenamiento el tema se pedirá al backend en cada carga.
  }
}

/**
 * Pinta el último tema conocido **antes del primer frame**.
 *
 * El tema lo decide el backend, así que llega por red: entre que la página
 * pinta y que responde el servidor, la interfaz se vería con los colores por
 * defecto de `tokens.css`. En modo oscuro eso es un destello blanco a pantalla
 * completa en cada carga. Con la copia local se pinta ya correcto y, cuando
 * llega la respuesta, casi siempre es idéntica y no se nota nada.
 *
 * Se llama desde `main.tsx` antes de montar React.
 */
export function aplicarTemaCacheado(): void {
  try {
    const crudo = window.localStorage.getItem(CLAVE_CACHE);
    if (!crudo) return;
    const tema = JSON.parse(crudo) as TemaActivo;
    if (!tema?.variables) return;
    const root = document.documentElement;
    for (const [token, valor] of Object.entries(tema.variables)) {
      root.style.setProperty(token, valor);
    }
    root.dataset.tema = tema.id;
    root.dataset.modo = tema.modo.toLowerCase();
    useTema.setState({ tema });
  } catch {
    // Copia corrupta o almacenamiento no disponible: se pinta con los
    // defaults y el backend corrige en cuanto responda.
  }
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
    try {
      window.localStorage.removeItem(CLAVE_CACHE);
    } catch {
      // Sin almacenamiento no hay copia que limpiar.
    }
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
