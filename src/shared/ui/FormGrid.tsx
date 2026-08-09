import type { HTMLAttributes } from "react";
import { cn } from "../lib/cn";

export interface FormGridProps extends HTMLAttributes<HTMLDivElement> {
  columns?: 1 | 2;
}

export function FormGrid({ columns = 2, className, children, ...rest }: FormGridProps) {
  return (
    <div className={cn("form-grid", columns === 1 && "form-grid--one", className)} {...rest}>
      {children}
    </div>
  );
}

export interface FormActionsProps extends HTMLAttributes<HTMLDivElement> {}

export function FormActions({ className, children, ...rest }: FormActionsProps) {
  return (
    <div className={cn("form-actions", className)} {...rest}>
      {children}
    </div>
  );
}
