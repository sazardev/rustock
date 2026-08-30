/**
 * Formato y mapas de presentación compartidos entre páginas (fechas, tonos de
 * Badge por tipo/estado). Centralizado para que Movimientos, Dashboard y
 * Alertas se vean consistentes (DESIGN.md).
 *
 * El formato de fechas respeta la zona horaria y el formato elegidos en las
 * preferencias de la sesión (SPEC §14.4) y el idioma activo (§17): el nombre
 * del mes y el orden de la hora cambian con él. Si no hay preferencias
 * cargadas, cae al formato por defecto del diseño (DD MMM YYYY).
 */
import type { BadgeTone, IconName } from "./ui";
import { preferenciasActuales } from "./preferencias";
import { ErrorRustock } from "./api";
import { localeDe, traducir } from "./i18n";
import type {
  EstadoAlerta,
  EstadoMovimiento,
  EstadoSesionInventario,
  SeveridadAlerta,
  TipoMovimiento,
} from "./types";

const ZONA_DEFECTO = "America/Lima";
const FORMATO_DEFECTO = "DD_MMM_YYYY";

interface OpcionesFecha {
  timeZone: string;
  formato: string;
}

function opcionesFecha(): OpcionesFecha {
  const prefs = preferenciasActuales();
  return {
    timeZone: prefs?.zona_horaria || ZONA_DEFECTO,
    formato: prefs?.formato_fecha || FORMATO_DEFECTO,
  };
}

function construirFecha(d: Date, opciones: OpcionesFecha, conHora: boolean): string {
  const base: Intl.DateTimeFormatOptions = { timeZone: opciones.timeZone };
  let fecha: string;
  switch (opciones.formato) {
    case "YYYY_MM_DD":
      // en-CA produce el formato ISO yyyy-MM-dd de forma nativa.
      fecha = new Intl.DateTimeFormat("en-CA", {
        ...base,
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      }).format(d);
      break;
    case "DD_MM_YYYY":
      fecha = new Intl.DateTimeFormat(localeDe(), {
        ...base,
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      }).format(d);
      break;
    default:
      fecha = new Intl.DateTimeFormat(localeDe(), {
        ...base,
        day: "2-digit",
        month: "short",
        year: "numeric",
      }).format(d);
  }
  if (!conHora) return fecha;
  const hora = new Intl.DateTimeFormat(localeDe(), {
    ...base,
    hour: "2-digit",
    minute: "2-digit",
  }).format(d);
  return `${fecha} ${hora}`;
}

export function formatearFecha(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return construirFecha(d, opcionesFecha(), true);
}

/**
 * Número con los separadores del idioma activo.
 *
 * `toLocaleString()` sin argumentos usa el idioma del *navegador*, no el que
 * la persona eligió en Rustock: con la app en castellano y Chrome en inglés
 * salía «13,500» donde toca «13.500».
 */
export function formatearNumero(valor: number): string {
  return valor.toLocaleString(localeDe());
}

export function formatearFechaCorta(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return construirFecha(d, opcionesFecha(), false);
}

export const TIPO_MOVIMIENTO_TONE: Record<TipoMovimiento, BadgeTone> = {
  ENTRADA: "success",
  SALIDA: "danger",
  TRASLADO: "info",
  AJUSTE: "warning",
  CONSUMO: "neutral",
};

export const TIPO_MOVIMIENTO_ICON: Record<TipoMovimiento, IconName> = {
  ENTRADA: "entrada",
  SALIDA: "salida",
  TRASLADO: "traslado",
  AJUSTE: "ajuste",
  CONSUMO: "salida",
};

export const ESTADO_MOVIMIENTO_TONE: Record<EstadoMovimiento, BadgeTone> = {
  BORRADOR: "neutral",
  PENDIENTE_APROBACION: "warning",
  APROBADO: "success",
  ANULADO: "danger",
};

export const SEVERIDAD_ALERTA_TONE: Record<SeveridadAlerta, BadgeTone> = {
  INFO: "info",
  MEDIA: "warning",
  ALTA: "danger",
};

export const ESTADO_ALERTA_TONE: Record<EstadoAlerta, BadgeTone> = {
  ABIERTA: "danger",
  RESUELTA: "success",
  IGNORADA: "neutral",
};

export const ESTADO_SESION_TONE: Record<EstadoSesionInventario, BadgeTone> = {
  PLANEADA: "neutral",
  EN_CURSO: "info",
  CERRADA: "success",
  ANULADA: "danger",
};

export const TIPO_DIFERENCIA_TONE: Record<string, BadgeTone> = {
  conciliado: "success",
  sobrante: "info",
  faltante: "danger",
};

/**
 * Redacta el error en el idioma activo (SPEC §17.3).
 *
 * El backend devuelve un código y sus datos, no una frase: aquí se compone.
 * Si aparece un código que el diccionario todavía no conoce se usa el mensaje
 * que viene de Rust — está en castellano, pero un mensaje en el idioma
 * equivocado sigue siendo mejor que una pantalla que no dice nada.
 */
export function mensajeError(err: unknown): string {
  const t = traducir();
  if (err instanceof ErrorRustock && err.codigo) {
    const redactar = (t.errores as Record<string, unknown>)[err.codigo];
    if (typeof redactar === "function") {
      try {
        return (redactar as (datos: Record<string, unknown>) => string)(err.datos);
      } catch {
        // Datos incompletos para esa plantilla: se cae al mensaje del backend.
      }
    }
    return err.message;
  }
  if (err instanceof Error) return err.message;
  return String(err);
}
