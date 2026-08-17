import { cn } from "../lib/cn";
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
  return (
    <div className={cn("pagination", className)}>
      <span className="pagination__summary">
        Mostrando {from}-{to} de {total}
      </span>
      <div className="pagination__controls">
        <Button
          variant="secondary"
          size="sm"
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
          onMouseEnter={onPrefetch && page > 1 ? () => onPrefetch(page - 1) : undefined}
        >
          Anterior
        </Button>
        <span className="pagination__page">
          Página {page} de {pageCount}
        </span>
        <Button
          variant="secondary"
          size="sm"
          disabled={page >= pageCount}
          onClick={() => onPageChange(page + 1)}
          onMouseEnter={onPrefetch && page < pageCount ? () => onPrefetch(page + 1) : undefined}
        >
          Siguiente
        </Button>
      </div>
    </div>
  );
}
