import { useLocation } from "react-router";
import { Breadcrumbs } from "../shared/ui";
import type { BreadcrumbsProps } from "../shared/ui";
import { cn } from "../shared/lib/cn";
import { crumbsFromPath } from "./breadcrumbs";
import { useT } from "../shared/i18n";
import { useNavigationHistory } from "./use-navigation-history";

export interface SmartBreadcrumbsProps {
  className?: string;
  /** Desactiva el historial (solo breadcrumb derivado). */
  history?: boolean;
}

/**
 * Breadcrumb inteligente de Rustock:
 *  - Deriva los crumbs de la ruta actual (mapa de rutas + catálogos + acciones).
 *  - Ofrece navegación hacia atrás/adelante sobre el historial real de páginas.
 *
 * Cumple DESIGN §4.5 y §5.5: cada nivel es un enlace salvo el actual, y la
 * navegación nunca se pierde de contexto.
 */
export function SmartBreadcrumbs({ className, history = true }: SmartBreadcrumbsProps) {
  const t = useT();
  const location = useLocation();
  const crumbs = crumbsFromPath(location.pathname, t);
  const nav = useNavigationHistory();

  const items: BreadcrumbsProps["items"] = crumbs.map((crumb) => ({
    label: crumb.label,
    href: crumb.href,
  }));

  return (
    <div className={cn("breadcrumbs__smart", className)}>
      {history ? (
        <div className="breadcrumbs__nav">
          <button
            type="button"
            className="breadcrumbs__history-btn"
            onClick={nav.back}
            disabled={!nav.canGoBack}
            aria-label="Volver a la página anterior"
            title="Página anterior"
          >
            <BreadcrumbIcon dir="prev" />
          </button>
          <button
            type="button"
            className="breadcrumbs__history-btn"
            onClick={nav.forward}
            disabled={!nav.canGoForward}
            aria-label="Avanzar a la siguiente página"
            title="Página siguiente"
          >
            <BreadcrumbIcon dir="next" />
          </button>
        </div>
      ) : null}
      <Breadcrumbs items={items} />
    </div>
  );
}

function BreadcrumbIcon({ dir }: { dir: "prev" | "next" }) {
  const d = dir === "prev" ? "M15 19l-7-7 7-7" : "M9 5l7 7-7 7";
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d={d} />
    </svg>
  );
}
