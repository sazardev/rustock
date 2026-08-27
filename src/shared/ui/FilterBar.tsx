import { useLayoutEffect, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { cn } from "../lib/cn";
import { Icon } from "./Icon";

export interface FilterBarProps {
  /** Opcional: páginas sin filtros/búsqueda pueden usar FilterBar solo para
   * acoplar su botón "Nuevo…" a la barra superior (ver `action`). */
  children?: ReactNode;
  action?: ReactNode;
  className?: string;
}

/**
 * Encuentra `#toolbar-slot` (renderizado por AppShell justo bajo la barra
 * superior) después del montaje. El toolbar se porta ahí para quedar
 * acoplado visualmente a la topbar (pegado, mismo ancho, sticky) en vez de
 * vivir dentro del flujo de contenido centrado de la página — patrón tipo
 * Google Docs, donde la barra de herramientas es una extensión de la barra
 * de menú, no parte del documento.
 */
function useToolbarSlot(): HTMLElement | null {
  const [slot, setSlot] = useState<HTMLElement | null>(null);
  useLayoutEffect(() => {
    setSlot(document.getElementById("toolbar-slot"));
  }, []);
  return slot;
}

export function FilterBar({ children, action, className }: FilterBarProps) {
  const slot = useToolbarSlot();
  const bar = (
    <div className={cn("filter-bar", className)}>
      {children}
      {action ? <div className="filter-bar__action">{action}</div> : null}
    </div>
  );
  return slot ? createPortal(bar, slot) : null;
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
