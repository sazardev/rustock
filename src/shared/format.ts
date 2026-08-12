/**
 * Formato y mapas de presentación compartidos entre páginas (fechas, tonos de
 * Badge por tipo/estado). Centralizado para que Movimientos, Dashboard y
 * Alertas se vean consistentes (DESIGN.md).
 */
import type { BadgeTone, IconName } from "./ui";
import type {
  EstadoAlerta,
  EstadoMovimiento,
  EstadoSesionInventario,
  SeveridadAlerta,
  TipoMovimiento,
} from "./types";

export function formatearFecha(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString("es-ES", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function formatearFechaCorta(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("es-ES", { day: "2-digit", month: "short", year: "numeric" });
}

export const TIPO_MOVIMIENTO_LABEL: Record<TipoMovimiento, string> = {
  ENTRADA: "Entrada",
  SALIDA: "Salida",
  TRASLADO: "Traslado",
  AJUSTE: "Ajuste",
  CONSUMO: "Consumo",
};

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

export const ESTADO_MOVIMIENTO_LABEL: Record<EstadoMovimiento, string> = {
  BORRADOR: "Borrador",
  PENDIENTE_APROBACION: "Pendiente de aprobación",
  APROBADO: "Aprobado",
  ANULADO: "Anulado",
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

export const ESTADO_ALERTA_LABEL: Record<EstadoAlerta, string> = {
  ABIERTA: "Abierta",
  RESUELTA: "Resuelta",
  IGNORADA: "Ignorada",
};

export const ESTADO_ALERTA_TONE: Record<EstadoAlerta, BadgeTone> = {
  ABIERTA: "danger",
  RESUELTA: "success",
  IGNORADA: "neutral",
};

export const TIPO_ALERTA_LABEL: Record<string, string> = {
  STOCK_BAJO: "Stock bajo",
  STOCK_EXCEDIDO: "Stock excedido",
  UBICACION_SOBRECAPACIDAD: "Ubicación sobrecapacidad",
  LOTE_POR_VENCER: "Lote por vencer",
  LOTE_VENCIDO: "Lote vencido",
  DIFERENCIA_INVENTARIO: "Diferencia de inventario",
  MOVIMIENTO_PENDIENTE: "Movimiento pendiente",
};

export const ESTADO_SESION_LABEL: Record<EstadoSesionInventario, string> = {
  PLANEADA: "Planeada",
  EN_CURSO: "En curso",
  CERRADA: "Cerrada",
  ANULADA: "Anulada",
};

export const ESTADO_SESION_TONE: Record<EstadoSesionInventario, BadgeTone> = {
  PLANEADA: "neutral",
  EN_CURSO: "info",
  CERRADA: "success",
  ANULADA: "danger",
};

export const TIPO_DIFERENCIA_LABEL: Record<string, string> = {
  conciliado: "Conciliado",
  sobrante: "Sobrante",
  faltante: "Faltante",
};

export const TIPO_DIFERENCIA_TONE: Record<string, BadgeTone> = {
  conciliado: "success",
  sobrante: "info",
  faltante: "danger",
};

export function mensajeError(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}
