import type { EventoAuditoria, MetricasHistorial } from "./audit";

/**
 * Gateway de API de Rustock.
 *
 * Abstrae el backend: cuando la app corre dentro de Tauri usa `invoke` (comandos
 * Rust reales con SQLite); cuando corre en modo web (Vite puro / navegador) usa
 * un store local en `localStorage` con la misma forma de datos. Así la UI
 * funciona idéntica en ambos modos (DESIGN §5: deep-linking también en web).
 */

/** ¿Corremos dentro de Tauri? */
export function isTauri(): boolean {
  return typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;
}

/**
 * Invoca un comando del backend. En Tauri usa el IPC real; en web despacha a
 * los handlers locales. Firma compatible con `@tauri-apps/api/core` invoke.
 */
export async function invoke<T>(command: string, args?: Record<string, unknown>): Promise<T> {
  if (isTauri()) {
    const { invoke: tauriInvoke } = await import("@tauri-apps/api/core");
    return tauriInvoke<T>(command, args);
  }
  return webInvoke<T>(command, args ?? {});
}

/**
 * Registra un evento en el historial local (modo web). Misma estructura que la
 * tabla `auditoria` del backend (SPEC §4.5).
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

/** Clasifica un comando por nivel (espejo del backend). */
function nivelDeComando(comando: string): string {
  const prefijos = [
    "crear_",
    "editar_",
    "eliminar_",
    "aprobar_",
    "anular_",
    "desactivar_",
    "enviar_",
    "registrar_",
    "cerrar_",
    "bootstrap_",
  ];
  return prefijos.some((p) => comando.startsWith(p)) ? "ESCRITURA" : "LECTURA";
}

function metricasDe(eventos: EventoAuditoria[]): MetricasHistorial {
  const total = eventos.length;
  const exitos = eventos.filter((e) => e.exito).length;
  const errores = total - exitos;
  const duraciones = eventos
    .filter((e) => e.duracion_ms !== null)
    .map((e) => e.duracion_ms as number);
  const prom = duraciones.length ? duraciones.reduce((a, b) => a + b, 0) / duraciones.length : null;

  const porComando = new Map<
    string,
    { total: number; exitos: number; errores: number; duracion: number[] }
  >();
  for (const e of eventos) {
    const nombre = e.comando ?? e.accion;
    const cur = porComando.get(nombre) ?? { total: 0, exitos: 0, errores: 0, duracion: [] };
    cur.total += 1;
    if (e.exito) cur.exitos += 1;
    else cur.errores += 1;
    if (e.duracion_ms !== null) cur.duracion.push(e.duracion_ms as number);
    porComando.set(nombre, cur);
  }
  const porDia = new Map<string, number>();
  for (const e of eventos) {
    const dia = e.timestamp.slice(0, 10);
    porDia.set(dia, (porDia.get(dia) ?? 0) + 1);
  }

  return {
    total,
    exitos,
    errores,
    tasa_exito: total ? (exitos / total) * 100 : 0,
    duracion_promedio_ms: prom,
    por_comando: [...porComando.entries()]
      .map(([nombre, v]) => ({
        nombre,
        total: v.total,
        exitos: v.exitos,
        errores: v.errores,
        duracion_promedio_ms: v.duracion.length
          ? v.duracion.reduce((a, b) => a + b, 0) / v.duracion.length
          : null,
      }))
      .toSorted((a, b) => b.total - a.total)
      .slice(0, 20),
    por_dia: [...porDia.entries()]
      .map(([dia, total]) => ({ dia, total }))
      .toSorted((a, b) => b.dia.localeCompare(a.dia))
      .slice(0, 30),
  };
}

const STORAGE_KEY = "rustock.historial";
const MAX_EVENTOS = 500;
let memoria: EventoAuditoria[] = [];

/** Despacho de comandos en modo web (sin backend Rust). */
async function webInvoke<T>(command: string, args: Record<string, unknown>): Promise<T> {
  const inicio = performance.now();
  let exito = true;
  let resultado: unknown;

  try {
    switch (command) {
      case "listar_historial": {
        const eventos = historialLeer();
        const limit = (args.limit as number | undefined) ?? 100;
        resultado = eventos.slice(0, limit);
        break;
      }
      case "metricas_historial": {
        resultado = metricasDe(historialLeer());
        break;
      }
      default:
        // Comando de negocio sin handler web: se registra y responde vacío.
        exito = false;
        resultado = `El comando ${command} requiere la app de escritorio (Tauri).`;
        break;
    }
  } catch (err) {
    exito = false;
    resultado = String(err);
  }

  const duracion = Math.round(performance.now() - inicio);
  if (command !== "metricas_historial") {
    historialRegistrar({
      usuario_id:
        (args.usuario_id as string | undefined) ?? (args.by as string | undefined) ?? "web",
      accion: "invoke",
      entidad: "comando",
      entidad_id: null,
      antes: null,
      despues: null,
      origen: "web",
      comando: command,
      duracion_ms: duracion,
      exito,
      nivel: nivelDeComando(command),
    });
  }

  if (!exito) throw new Error(String(resultado));
  return resultado as T;
}
