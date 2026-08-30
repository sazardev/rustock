/**
 * Gateway de API de Rustock.
 *
 * Abstrae el backend: cuando la app corre dentro de Tauri usa `invoke` (IPC
 * nativo); cuando corre en un navegador normal (sin puente Tauri) usa el
 * servidor HTTP local que el mismo binario Rust expone en
 * `http://127.0.0.1:1421` (ver `src-tauri/src/server.rs`). En ambos casos es
 * la misma lógica de negocio real — nunca un mock en el frontend (STACK.md:
 * "lógica de negocio en Rust, frontend solo muestra").
 */

/** ¿Corremos dentro de Tauri? */
export function isTauri(): boolean {
  return typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;
}

/**
 * Base del API HTTP local. Por defecto `127.0.0.1:1421` (el puerto del
 * backend Rust, configurable con `RUSTOCK_HTTP_PORT`); en modo navegador se
 * puede sobrescribir con `VITE_RUSTOCK_API` (lo define `scripts/web.mjs`
 * cuando se usa un puerto alternativo).
 */
const API_BASE =
  (import.meta.env.VITE_RUSTOCK_API as string | undefined) ?? "http://127.0.0.1:1421/api";

/** Base del API HTTP local (exportada para el beacon del tracking, Hito 25). */
export { API_BASE };

/**
 * Invoca un comando del backend. En Tauri usa el IPC real; en un navegador
 * normal llama al servidor HTTP local del mismo backend. Firma compatible
 * con `@tauri-apps/api/core` invoke.
 */
export async function invoke<T>(command: string, args?: Record<string, unknown>): Promise<T> {
  if (isTauri()) {
    const { invoke: tauriInvoke } = await import("@tauri-apps/api/core");
    try {
      return await tauriInvoke<T>(command, args);
    } catch (crudo) {
      // Tauri entrega el error ya deserializado: se normaliza para que la
      // interfaz reciba la misma forma que por HTTP.
      throw comoErrorRustock(crudo);
    }
  }
  return webInvoke<T>(command, args ?? {});
}

/**
 * Token de la sesión del navegador (SPEC §4.1).
 *
 * En modo navegador pueden estar conectadas varias personas a la vez desde
 * equipos distintos, así que la sesión no puede vivir en el proceso del
 * backend: cada cliente presenta su token en cada petición y el servidor
 * resuelve con él a quién atribuir la acción.
 *
 * Se guarda en `sessionStorage` y no en `localStorage` a propósito: la sesión
 * dura lo que dura la pestaña. Cerrarla cierra la sesión, que es lo que espera
 * quien trabaja en un equipo compartido del almacén.
 */
const CLAVE_SESION = "rustock.sesion";
const CABECERA_SESION = "x-rustock-sesion";

function leerToken(): string | null {
  try {
    return window.sessionStorage.getItem(CLAVE_SESION);
  } catch {
    // Almacenamiento no disponible (modo privado estricto): la sesión vive
    // solo en memoria durante esta carga de página.
    return tokenEnMemoria;
  }
}

let tokenEnMemoria: string | null = null;

function guardarToken(token: string | null): void {
  tokenEnMemoria = token;
  try {
    if (token === null) window.sessionStorage.removeItem(CLAVE_SESION);
    else window.sessionStorage.setItem(CLAVE_SESION, token);
  } catch {
    // Se conserva en memoria; ver `leerToken`.
  }
}

/** Olvida la sesión local. La llama `logout` tras cerrarla en el backend. */
export function olvidarSesion(): void {
  guardarToken(null);
}

/**
 * Error del backend con su código y sus datos (SPEC §17.3).
 *
 * El backend no redacta mensajes: devuelve qué falló y con qué valores, y la
 * interfaz compone la frase en el idioma activo. `message` conserva el texto
 * en castellano como respaldo, por si aparece un código que el diccionario
 * todavía no conoce — es preferible un mensaje en el idioma equivocado a una
 * pantalla que no dice nada.
 */
export class ErrorRustock extends Error {
  readonly codigo: string | undefined;
  readonly datos: Record<string, unknown>;

  constructor(mensaje: string, codigo?: string, datos?: Record<string, unknown>) {
    super(mensaje);
    this.name = "ErrorRustock";
    this.codigo = codigo;
    this.datos = datos ?? {};
  }
}

/** Forma del error que serializa Rust (ver `error.rs`). */
interface ErrorSerializado {
  codigo?: string;
  datos?: Record<string, unknown>;
  mensaje?: string;
}

/** Normaliza lo que llega por IPC o por HTTP a un `ErrorRustock`. */
export function comoErrorRustock(crudo: unknown): ErrorRustock {
  if (crudo instanceof ErrorRustock) return crudo;
  if (typeof crudo === "string") return new ErrorRustock(crudo);
  if (crudo && typeof crudo === "object") {
    const e = crudo as ErrorSerializado;
    if (e.codigo || e.mensaje) {
      return new ErrorRustock(e.mensaje ?? e.codigo ?? "Error desconocido", e.codigo, e.datos);
    }
  }
  return new ErrorRustock(String(crudo));
}

/** Despacho de comandos vía el servidor HTTP local (modo navegador). */
async function webInvoke<T>(command: string, args: Record<string, unknown>): Promise<T> {
  const token = leerToken();
  let response: Response;
  try {
    response = await fetch(`${API_BASE}/${command}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { [CABECERA_SESION]: token } : {}),
      },
      body: JSON.stringify(args),
    });
  } catch {
    throw new Error(
      `No se pudo conectar con el backend local en ${API_BASE}. ¿Está corriendo la app (npm run tauri dev)?`,
    );
  }
  const payload = (await response.json()) as {
    ok: boolean;
    data?: unknown;
    error?: string;
    codigo?: string;
    datos?: Record<string, unknown>;
    sesion?: string;
  };
  // El backend emite el token al abrir sesión; a partir de ahí lo presenta
  // este cliente en cada petición.
  if (payload.sesion) {
    guardarToken(payload.sesion);
  }
  if (!payload.ok) {
    throw new ErrorRustock(
      payload.error ?? "Error desconocido del backend.",
      payload.codigo,
      payload.datos,
    );
  }
  return payload.data as T;
}
