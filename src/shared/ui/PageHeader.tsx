import type { ReactNode } from "react";
import { cn } from "../lib/cn";

export interface PageHeaderProps {
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  className?: string;
}

/**
 * Bloque de título de la página, al estilo de un documento: el nombre de la
 * ruta vive en el lienzo — no solo en el breadcrumb de la barra superior —
 * porque es el ancla de lectura y el punto de referencia al volver de una
 * ruta hija. La descripción explica en una línea qué administra la página;
 * las acciones se alinean a la derecha sin competir con el título.
 */
export function PageHeader({ title, description, actions, className }: PageHeaderProps) {
  return (
    <header className={cn("page-header", className)}>
      <div className="page-header__texto">
        <h1 className="page-header__title">{title}</h1>
        {description ? <p className="page-header__desc">{description}</p> : null}
      </div>
      {actions ? <div className="page-header__actions">{actions}</div> : null}
    </header>
  );
}
