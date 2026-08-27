import type { ReactNode } from "react";
import { cn } from "../lib/cn";

export interface PageHeaderProps {
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  className?: string;
}

/**
 * El breadcrumb de la barra superior ya identifica la página — el título y
 * la descripción visuales son redundantes y solo restan espacio vertical.
 * El h1 se conserva oculto (`sr-only`) para lectores de pantalla; `actions`
 * sigue siendo el único contenido visible de este bloque.
 */
export function PageHeader({ title, actions, className }: PageHeaderProps) {
  return (
    <header className={cn("page-header", "page-enter", className)}>
      <h1 className="sr-only">{title}</h1>
      {actions ? <div className="page-header__actions">{actions}</div> : null}
    </header>
  );
}
