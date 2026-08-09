import { cn } from "../lib/cn";
import { Button } from "./Button";

export interface PaginationProps {
  page: number;
  pageCount: number;
  total: number;
  from: number;
  to: number;
  onPageChange: (page: number) => void;
  className?: string;
}

export function Pagination({
  page,
  pageCount,
  total,
  from,
  to,
  onPageChange,
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
        >
          Siguiente
        </Button>
      </div>
    </div>
  );
}
