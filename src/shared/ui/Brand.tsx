import { Link as RouterLink } from "react-router";
import { cn } from "../lib/cn";
import { Button } from "./Button";
import { Icon } from "./Icon";
import { LogoMark } from "./LogoMark";

export interface BrandProps {
  name?: string;
  href?: string;
  className?: string;
  /** Tamaño del logo en píxeles (por defecto 32, el alto de la topbar). */
  logoSize?: number;
}

export function Brand({ name = "Rustock", href = "/", className, logoSize = 32 }: BrandProps) {
  return (
    <RouterLink to={href} className={cn("topbar__brand", className)}>
      <span className="topbar__logo" aria-hidden="true">
        <LogoMark size={logoSize} />
      </span>
      <span className="topbar__brand-name">{name}</span>
    </RouterLink>
  );
}

export interface TopbarNavToggleProps {
  onClick?: () => void;
  /** Indica si la navegación/sidebar está expandida (para aria-expanded). */
  expanded?: boolean;
  ariaLabel?: string;
}

export function TopbarNavToggle({
  onClick,
  expanded = false,
  ariaLabel = "Alternar navegación",
}: TopbarNavToggleProps) {
  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      className="topbar__nav-toggle"
      aria-label={ariaLabel}
      aria-expanded={expanded}
      onClick={onClick}
    >
      <Icon name="menu" size={16} aria-hidden="true" />
    </Button>
  );
}
