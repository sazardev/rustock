/**
 * Estado global del command palette (DESIGN §6.10, §8.2): abierto/cerrado y
 * el texto de consulta. La lógica de resultados (filtrado, datos en vivo,
 * selección) vive en `CommandPalette`; aquí solo se gestiona la apertura
 * desde cualquier parte de la app (atajo de teclado, trigger de la topbar).
 */
import { create } from "zustand";

interface PaletteState {
  abierto: boolean;
  consulta: string;
  abrir: () => void;
  cerrar: () => void;
  alternar: () => void;
  setConsulta: (consulta: string) => void;
}

export const usePalette = create<PaletteState>((set) => ({
  abierto: false,
  consulta: "",
  abrir: () => set({ abierto: true, consulta: "" }),
  cerrar: () => set({ abierto: false, consulta: "" }),
  alternar: () => set((s) => ({ abierto: !s.abierto, consulta: "" })),
  setConsulta: (consulta) => set({ consulta }),
}));
