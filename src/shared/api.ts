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
    return tauriInvoke<T>(command, args);
  }
  return webInvoke<T>(command, args ?? {});
}

/** Despacho de comandos vía el servidor HTTP local (modo navegador). */
async function webInvoke<T>(command: string, args: Record<string, unknown>): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${API_BASE}/${command}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(args),
    });
  } catch {
    throw new Error(
      `No se pudo conectar con el backend local en ${API_BASE}. ¿Está corriendo la app (npm run tauri dev)?`,
    );
  }
  const payload = (await response.json()) as { ok: boolean; data?: unknown; error?: string };
  if (!payload.ok) {
    throw new Error(payload.error ?? "Error desconocido del backend.");
  }
  return payload.data as T;
}
