import type { ButtonHTMLAttributes, ReactNode } from "react";
import { cn } from "../lib/cn";
import { Icon, type IconName } from "./Icon";

export type ButtonVariant = "primary" | "secondary" | "danger" | "ghost" | "link";
export type ButtonSize = "sm" | "md" | "lg" | "icon";

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  icon?: IconName;
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

export function Button({
  variant = "primary",
  size = "md",
  icon,
  className,
  children,
  type = "button",
  ...rest
}: ButtonProps) {
  return (
    <button
      type={type}
      className={cn("btn", VARIANT_CLASS[variant], SIZE_CLASS[size], className)}
      {...rest}
    >
      {icon ? <Icon name={icon} className="btn__icon" aria-hidden="true" /> : null}
      {children}
    </button>
  );
}
