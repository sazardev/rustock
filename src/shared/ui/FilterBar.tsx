import type { ReactNode } from "react";
import { cn } from "../lib/cn";
import { Icon } from "./Icon";

export interface FilterBarProps {
  children: ReactNode;
  action?: ReactNode;
  className?: string;
}

export function FilterBar({ children, action, className }: FilterBarProps) {
  return (
    <div className={cn("filter-bar", className)}>
      {children}
      {action ? <div className="filter-bar__action">{action}</div> : null}
    </div>
  );
}

export interface FilterFieldProps {
  children: ReactNode;
  grow?: boolean;
  className?: string;
}

export function FilterField({ children, grow, className }: FilterFieldProps) {
  return (
    <div className={cn("filter-bar__field", grow && "filter-bar__field--grow", className)}>
      {children}
    </div>
  );
}

export interface FilterChipProps {
  label: ReactNode;
  onRemove?: () => void;
  className?: string;
}

export function FilterChip({ label, onRemove, className }: FilterChipProps) {
  return (
    <span className={cn("badge badge--info", className)}>
      {label}
      {onRemove ? (
        <button
          type="button"
          className="badge__remove"
          onClick={onRemove}
          aria-label={`Quitar filtro ${String(label)}`}
        >
          <Icon name="cerrar" size={12} aria-hidden="true" />
        </button>
      ) : null}
    </span>
  );
}

export interface FilterChipsProps {
  children: ReactNode;
  className?: string;
}

export function FilterChips({ children, className }: FilterChipsProps) {
  return <div className={cn("filter-badges", className)}>{children}</div>;
}
