import type { AnchorHTMLAttributes, ReactNode } from "react";
import { cn } from "../lib/cn";
import { Icon, type IconName } from "./Icon";
import type { ButtonSize, ButtonVariant } from "./Button";

export interface ButtonLinkProps extends AnchorHTMLAttributes<HTMLAnchorElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  icon?: IconName;
  children: ReactNode;
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
  className,
  children,
  ...rest
}: ButtonLinkProps) {
  return (
    <a className={cn("btn", VARIANT_CLASS[variant], SIZE_CLASS[size], className)} {...rest}>
      {icon ? <Icon name={icon} className="btn__icon" aria-hidden="true" /> : null}
      {children}
    </a>
  );
}
