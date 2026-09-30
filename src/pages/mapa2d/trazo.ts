/** Estilo de trazo y etiquetas de un nodo del lienzo. */
import type { EstadoColocacion } from "../mapa/motor";
import type { TipoNodo } from "./nodo-tipos";

// DESIGN §7: Zona/Rack/Sección comparten ícono (LayoutGrid), aquí mapeado a "zona".
export const ICONO_NODO: Record<TipoNodo, "zona" | "ubicacion"> = {
  zona: "zona",
  pasillo: "zona",
  rack: "zona",
  ubicacion: "ubicacion",
};

export const ETIQUETA_TIPO: Record<TipoNodo, string> = {
  zona: "Zona",
  pasillo: "Pasillo",
  rack: "Rack",
  ubicacion: "Ubicación",
};

const TRAZO_COLOCACION = {
  libre: "var(--color-success-500)",
  advertencia: "var(--color-warning-500)",
  bloqueado: "var(--color-danger-500)",
} as const;

/** Relleno de un nodo en edición cuando la colocación no es libre. */
export const RELLENO_COLOCACION = {
  advertencia: "var(--color-warning-bg)",
  bloqueado: "var(--color-danger-bg)",
} as const;

/** Trazo del nodo: resaltado por deep-link o selección gana; luego el
 * semáforo de colocación (verde/ámbar/rojo); resto borde estándar. */
export function trazoNodo(
  resaltado: boolean,
  seleccionado: boolean,
  estado: EstadoColocacion | null,
): string {
  if (resaltado || seleccionado) {
    return "var(--color-blue-500)";
  }
  if (estado) {
    return TRAZO_COLOCACION[estado];
  }
  return "var(--border-color-strong)";
}

export function grosorNodo(destacado: boolean, estado: EstadoColocacion | null): number {
  if (destacado) {
    return 2.5;
  }
  return estado ? 2 : 1;
}

/** Color de trazo/texto del semáforo, para capas auxiliares del lienzo. */
export const colorColocacion = (estado: EstadoColocacion): string => TRAZO_COLOCACION[estado];
