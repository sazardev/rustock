import { create } from "zustand";
import * as backend from "./backend";
import { olvidarSesion } from "./api";
import type { Usuario } from "./types";

interface SessionState {
  usuario: Usuario | null;
  cargando: boolean;
  iniciarSesion: (nombreUsuario: string, password: string) => Promise<Usuario>;
  cerrarSesion: () => Promise<void>;
  refrescar: () => Promise<void>;
}

/**
 * Sesión activa del frontend (SPEC §4.1). No guarda ni deriva ningún dato de
 * negocio: solo refleja lo que el backend ya sabe (`quien_soy`). Ningún
 * comando de negocio vuelve a aceptar un id de usuario del cliente — todos
 * lo resuelven de la sesión Tauri, esto es solo el espejo para la UI.
 */
export const useSession = create<SessionState>((set) => ({
  usuario: null,
  cargando: true,
  async iniciarSesion(nombreUsuario, password) {
    const usuario = await backend.login(nombreUsuario, password);
    set({ usuario, cargando: false });
    return usuario;
  },
  async cerrarSesion() {
    await backend.logout();
    // El token deja de ser válido en el backend: olvidarlo aquí evita que la
    // siguiente petición lo presente y reciba un "no autenticado" confuso.
    olvidarSesion();
    set({ usuario: null });
  },
  async refrescar() {
    try {
      const usuario = await backend.quienSoy();
      set({ usuario, cargando: false });
    } catch {
      set({ usuario: null, cargando: false });
    }
  },
}));
