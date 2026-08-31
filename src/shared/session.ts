import { create } from "zustand";
import * as backend from "./backend";
import { olvidarSesion } from "./api";
import type { Usuario } from "./types";

interface SessionState {
  usuario: Usuario | null;
  /**
   * Permisos del usuario, como `"recurso:accion"`. `null` mientras no se
   * sepan todavía — que no es lo mismo que «ninguno»: la interfaz no debe
   * esconder cosas solo porque la respuesta aún no ha llegado.
   */
  permisos: string[] | null;
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
  permisos: null,
  cargando: true,
  async iniciarSesion(nombreUsuario, password) {
    const usuario = await backend.login(nombreUsuario, password);
    set({ usuario, cargando: false, permisos: await permisosDe() });
    return usuario;
  },
  async cerrarSesion() {
    await backend.logout();
    // El token deja de ser válido en el backend: olvidarlo aquí evita que la
    // siguiente petición lo presente y reciba un "no autenticado" confuso.
    olvidarSesion();
    set({ usuario: null, permisos: null });
  },
  async refrescar() {
    try {
      const usuario = await backend.quienSoy();
      set({ usuario, cargando: false, permisos: await permisosDe() });
    } catch {
      set({ usuario: null, permisos: null, cargando: false });
    }
  },
}));

/**
 * Permisos del backend, o `null` si no se pudieron pedir.
 *
 * Un fallo aquí no puede dejar a nadie sin poder trabajar: `null` significa
 * «no se sabe», y la interfaz entonces lo muestra todo y deja que el backend
 * —que es quien manda— rechace lo que no toque.
 */
async function permisosDe(): Promise<string[] | null> {
  try {
    return await backend.misPermisos();
  } catch {
    return null;
  }
}

/**
 * ¿Puede el usuario hacer `recurso:accion`?
 *
 * **Esto no es un control de seguridad**, es cortesía visual: sirve para no
 * ofrecer un botón cuya respuesta va a ser «no autorizado». Quien decide de
 * verdad es el backend, que vuelve a comprobarlo en cada operación y registra
 * el intento denegado (SPEC §14.3). Por eso, mientras los permisos no se
 * conocen, devuelve `true`: es preferible enseñar de más y que el backend
 * niegue, a esconder trabajo a alguien por un fallo de red.
 */
export function usePuede(recurso: string, accion: string): boolean {
  return puedeCon(
    useSession((s) => s.permisos),
    recurso,
    accion,
  );
}

/**
 * Igual que `usePuede`, fuera de un componente.
 *
 * Dos casos devuelven `true` sin mirar la lista, y por la misma razón: no se
 * esconde nada por no saber. `permisos` a `null` es «aún no ha llegado la
 * respuesta»; un `recurso` vacío es «quien pregunta no supo qué recurso es»
 * —un catálogo sin entrada en el mapa, por ejemplo—. En ambos, mostrar de más
 * y dejar que el backend rechace es preferible a esconderle trabajo a alguien
 * que sí podía hacerlo.
 */
export function puedeCon(permisos: string[] | null, recurso: string, accion: string): boolean {
  if (permisos === null || recurso === "") return true;
  return permisos.includes(`${recurso}:${accion}`);
}
