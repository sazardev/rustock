import type { IconName } from "../../shared/ui";

export const PAGE_SIZE = 50;
export const TIPOS_EVENTO = ["VISTA", "COMANDO"];
export const DIAS_SEMANA = [
  "",
  "lunes",
  "martes",
  "miércoles",
  "jueves",
  "viernes",
  "sábado",
  "domingo",
];
export const DIAS_SEMANA_INICIAL = ["", "L", "M", "X", "J", "V", "S", "D"];

/** Icono canónico de cada insight que devuelve el backend (con fallback). */
const INSIGHT_ICON: Record<string, IconName> = {
  info: "alerta",
  calendario: "calendario",
  dashboard: "dashboard",
  historial: "historial",
  usuario: "usuario",
  proceso: "movements",
  aprobar: "aprobar",
  anular: "anular",
};

export function formatoDuracion(ms: number | null): string {
  if (ms === null || ms === undefined) return "—";
  const s = Math.round(ms / 1000);
  if (s >= 60) return `${Math.floor(s / 60)}m ${s % 60}s`;
  return `${s}s`;
}

export function iconoInsight(icono: string): IconName {
  return INSIGHT_ICON[icono] ?? "historial";
}

/** Alto porcentual (mínimo 2) de una barra respecto al máximo de la serie. */
export function alturaBarra(n: number, max: number): number {
  return max > 0 ? Math.max(2, (n / max) * 100) : 0;
}
