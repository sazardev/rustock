import type { EventoAuditoria } from "./audit";

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

const API_BASE = "http://127.0.0.1:1421/api";

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

/**
 * Registra un evento en el historial local de navegación del SPA (no es el
 * historial de auditoría del backend, SPEC §4.5 — ese vive en `auditoria` y
 * se consulta vía `listar_historial`/`metricas_historial`). Este historial
 * local solo anota qué páginas visitó el usuario dentro de la app, algo que
 * el backend no modela porque navegar no es una acción de negocio.
 */
export function historialRegistrar(
  entrada: Omit<EventoAuditoria, "id" | "timestamp"> & { timestamp?: string },
): void {
  const eventos = historialLeer();
  const evento: EventoAuditoria = {
    id: Date.now() + Math.floor(Math.random() * 1000),
    timestamp: entrada.timestamp ?? new Date().toISOString(),
    ...entrada,
  };
  eventos.unshift(evento);
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(eventos.slice(0, MAX_EVENTOS)));
  } catch {
    // almacenamiento no disponible: el historial vive solo en memoria
    memoria = eventos;
  }
}

export function historialLeer(): EventoAuditoria[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as EventoAuditoria[]) : memoria;
  } catch {
    return memoria;
  }
}

const STORAGE_KEY = "rustock.historial";
const MAX_EVENTOS = 500;
let memoria: EventoAuditoria[] = [];
