import { cn } from "../lib/cn";
import { useT } from "../i18n";
import { Button } from "./Button";

export interface PaginationProps {
  page: number;
  pageCount: number;
  total: number;
  from: number;
  to: number;
  onPageChange: (page: number) => void;
  /** Prefetch de una página (STACK §8.4): se invoca al pasar el ratón sobre
   *  los botones Anterior/Siguiente para precargarla. */
  onPrefetch?: (page: number) => void;
  className?: string;
}

export function Pagination({
  page,
  pageCount,
  total,
  from,
  to,
  onPageChange,
  onPrefetch,
  className,
}: PaginationProps) {
  const t = useT();
  return (
    <div className={cn("pagination", className)}>
      <span className="pagination__summary">
        {t.comun.mostrando({ desde: from, hasta: to, total })}
      </span>
      <div className="pagination__controls">
        <Button
          variant="secondary"
          size="sm"
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
          onMouseEnter={onPrefetch && page > 1 ? () => onPrefetch(page - 1) : undefined}
        >
          {t.comun.anterior}
        </Button>
        <span className="pagination__page">
          {t.comun.pagina({ actual: page, total: pageCount })}
        </span>
        <Button
          variant="secondary"
          size="sm"
          disabled={page >= pageCount}
          onClick={() => onPageChange(page + 1)}
          onMouseEnter={onPrefetch && page < pageCount ? () => onPrefetch(page + 1) : undefined}
        >
          {t.comun.siguiente}
        </Button>
      </div>
    </div>
  );
}
