import type { ReactNode } from "react";
import { Link as RouterLink } from "react-router";
import { cn } from "../lib/cn";
import { Icon, type IconName } from "./Icon";
import type { ButtonSize, ButtonVariant } from "./Button";

export interface ButtonLinkProps {
  variant?: ButtonVariant;
  size?: ButtonSize;
  icon?: IconName;
  href: string;
  className?: string;
  /** Texto descriptivo para enlaces solo-icono (accesibilidad, DESIGN §10). */
  ariaLabel?: string;
  children?: ReactNode;
}

const VARIANT_CLASS: Record<ButtonVariant, string> = {
  primary: "btn--primary",
  secondary: "btn--secondary",
  danger: "btn--danger",
  ghost: "btn--ghost",
  link: "btn--link",
};

const SIZE_CLASS: Record<ButtonSize, string> = {
  sm: "btn--sm",
  md: "",
  lg: "btn--lg",
  icon: "btn--icon",
};

export function ButtonLink({
  variant = "primary",
  size = "md",
  icon,
  href,
  className,
  ariaLabel,
  children,
}: ButtonLinkProps) {
  return (
    <RouterLink
      to={href}
      aria-label={ariaLabel}
      className={cn("btn", VARIANT_CLASS[variant], SIZE_CLASS[size], className)}
    >
      {icon ? <Icon name={icon} className="btn__icon" aria-hidden="true" /> : null}
      {children}
    </RouterLink>
  );
}
