import { useT } from "../i18n";
/**
 * LogoMark — caja de almacén, la marca de Rustock.
 * SVG plano (sin gradientes), sin fondo y con recorte ajustado a la caja,
 * coherente con el sistema de diseño. Los colores provienen de los tokens
 * del tema activo (DESIGN §3.1): el logo se tiñe con la paleta y el modo
 * que elija el usuario/la empresa, igual que el resto de la interfaz.
 */
export interface LogoMarkProps {
  /** Tamaño en píxeles del icono cuadrado (por defecto 32, el alto de la topbar). */
  size?: number;
  /** Clases CSS adicionales (p. ej. para escalar dentro del layout). */
  className?: string;
}

export function LogoMark({ size = 32, className }: LogoMarkProps) {
  const t = useT();
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="12 15 40 40"
      width={size}
      height={size}
      role="img"
      aria-label={t.ui.logoAlt}
      className={className}
    >
      {/* Caja isométrica: tapa, lateral y frontal (tonos del acento activo) */}
      <path d="M14 26 L32 17 L50 26 L32 35 Z" fill="var(--color-blue-400)" />
      <path d="M50 26 L50 44 L32 53 L32 35 Z" fill="var(--color-blue-700)" />
      <path d="M14 26 L14 44 L32 53 L32 35 Z" fill="var(--color-blue-500)" />
      {/* Cinta de embalaje */}
      <path d="M25 24 L30 26.7 L30 48 L25 45.3 Z" fill="var(--color-ink-200)" />
      {/* Mancha de óxido: la caja a medio oxidar */}
      <path d="M44 30 q4 1 3 6 q-1 4 -6 3 q-3 -1 -2 -5 q1 -3 5 -4 Z" fill="var(--color-blue-300)" />
      {/* Luz en la tapa */}
      <path d="M20 27.5 L32 22.2 L38 25 L26 30.3 Z" fill="var(--color-blue-200)" opacity="0.9" />
    </svg>
  );
}
