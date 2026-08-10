import { Link as RouterLink } from "react-router";
import { cn } from "../lib/cn";
import { Button } from "./Button";
import { Icon } from "./Icon";

export interface BrandProps {
  name?: string;
  href?: string;
  className?: string;
}

export function Brand({ name = "Rustock", href = "/", className }: BrandProps) {
  return (
    <RouterLink to={href} className={cn("topbar__brand", className)}>
      <span className="topbar__logo" aria-hidden="true" />
      <span>{name}</span>
    </RouterLink>
  );
}

export interface TopbarNavToggleProps {
  onClick?: () => void;
  ariaLabel?: string;
}

export function TopbarNavToggle({ onClick, ariaLabel = "Abrir navegación" }: TopbarNavToggleProps) {
  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      className="topbar__nav-toggle"
      aria-label={ariaLabel}
      aria-expanded="false"
      onClick={onClick}
    >
      <Icon name="menu" size={16} aria-hidden="true" />
    </Button>
  );
}

export interface TopbarSidebarToggleProps {
  collapsed?: boolean;
  onClick?: () => void;
  ariaLabel?: string;
}

export function TopbarSidebarToggle({
  collapsed = false,
  onClick,
  ariaLabel,
}: TopbarSidebarToggleProps) {
  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      className="topbar__sidebar-toggle"
      aria-label={ariaLabel ?? (collapsed ? "Expandir barra lateral" : "Contraer barra lateral")}
      aria-pressed={collapsed}
      onClick={onClick}
    >
      <Icon
        name={collapsed ? "panelIzquierdo" : "panelIzquierdoCerrar"}
        size={16}
        aria-hidden="true"
      />
    </Button>
  );
}
