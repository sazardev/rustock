import type { AnchorHTMLAttributes, ReactNode } from "react";
import { cn } from "../lib/cn";

export interface LinkProps extends AnchorHTMLAttributes<HTMLAnchorElement> {
  children: ReactNode;
}

export function Link({ className, children, ...rest }: LinkProps) {
  return (
    <a className={cn("link", className)} {...rest}>
      {children}
    </a>
  );
}
