import type { MouseEventHandler, ReactNode } from "react";
import { Link as RouterLink } from "react-router";
import { cn } from "../lib/cn";

export interface LinkProps {
  href: string;
  className?: string;
  children: ReactNode;
  ariaLabel?: string;
  onClick?: MouseEventHandler<HTMLAnchorElement>;
}

export function Link({ href, className, children, ariaLabel, onClick }: LinkProps) {
  return (
    <RouterLink
      to={href}
      className={cn("link", className)}
      aria-label={ariaLabel}
      onClick={onClick}
    >
      {children}
    </RouterLink>
  );
}
