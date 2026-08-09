import type { ReactNode } from "react";
import { cn } from "../lib/cn";
import { Icon } from "./Icon";
import { EmptyState } from "./EmptyState";
import { Skeleton } from "./Skeleton";

export type SortDirection = "asc" | "desc";
export type CellAlign = "left" | "right" | "center";

export interface TableColumn<T> {
  key: string;
  header: ReactNode;
  align?: CellAlign;
  code?: boolean;
  num?: boolean;
  sortable?: boolean;
  width?: string;
  render: (row: T) => ReactNode;
}

export interface TableSort {
  key: string;
  direction: SortDirection;
}

export interface TableProps<T> {
  columns: TableColumn<T>[];
  rows: T[];
  rowKey: (row: T) => string;
  sort?: TableSort | null;
  onSortChange?: (sort: TableSort) => void;
  onRowClick?: (row: T) => void;
  selectable?: boolean;
  selectedKeys?: string[];
  onToggleRow?: (key: string) => void;
  onToggleAll?: (checked: boolean) => void;
  actions?: (row: T) => ReactNode;
  emptyTitle?: ReactNode;
  emptyDescription?: ReactNode;
  emptyAction?: ReactNode;
  loading?: boolean;
  className?: string;
}

export function Table<T>({
  columns,
  rows,
  rowKey,
  sort,
  onSortChange,
  onRowClick,
  selectable,
  selectedKeys = [],
  onToggleRow,
  onToggleAll,
  actions,
  emptyTitle = "No hay registros todavía",
  emptyDescription,
  emptyAction,
  loading = false,
  className,
}: TableProps<T>) {
  const allSelected = rows.length > 0 && rows.every((row) => selectedKeys.includes(rowKey(row)));

  function handleSort(column: TableColumn<T>) {
    if (!column.sortable || !onSortChange) {
      return;
    }
    const direction: SortDirection =
      sort?.key === column.key && sort.direction === "asc" ? "desc" : "asc";
    onSortChange({ key: column.key, direction });
  }

  function renderSortIcon(column: TableColumn<T>) {
    if (!column.sortable) {
      return null;
    }
    const active = sort?.key === column.key;
    return (
      <Icon
        name={active ? "ordenar" : "ordenar"}
        className={cn(
          "table__sort-icon",
          active && sort?.direction === "asc" && "table__sort-icon--asc",
        )}
        size={14}
        aria-hidden="true"
      />
    );
  }

  return (
    <div className={cn("table-wrap", className)}>
      <table className={cn("table", onRowClick && "table--clickable")}>
        <thead>
          <tr>
            {selectable ? (
              <th scope="col" className="table__select">
                <input
                  type="checkbox"
                  className="checkbox__input"
                  checked={allSelected}
                  onChange={(event) => onToggleAll?.(event.target.checked)}
                  aria-label="Seleccionar todos"
                />
              </th>
            ) : null}
            {columns.map((column) => (
              <th
                key={column.key}
                scope="col"
                style={column.width ? { width: column.width } : undefined}
                className={cn(
                  column.align === "right" && "text-right",
                  column.align === "center" && "text-center",
                  column.sortable && "th--sortable",
                )}
                onClick={column.sortable ? () => handleSort(column) : undefined}
              >
                {column.header}
                {renderSortIcon(column)}
              </th>
            ))}
            {actions ? (
              <th scope="col" className="cell--actions">
                <span className="sr-only">Acciones</span>
              </th>
            ) : null}
          </tr>
        </thead>
        <tbody>
          {loading ? (
            <tr>
              <td colSpan={columns.length + (selectable ? 1 : 0) + (actions ? 1 : 0)}>
                <div className="p-4">
                  <Skeleton variant="text" className="mb-2" />
                  <Skeleton variant="text" className="mb-2" />
                  <Skeleton variant="text" />
                </div>
              </td>
            </tr>
          ) : rows.length === 0 ? (
            <tr>
              <td colSpan={columns.length + (selectable ? 1 : 0) + (actions ? 1 : 0)}>
                <EmptyState
                  title={emptyTitle}
                  description={emptyDescription}
                  action={emptyAction}
                />
              </td>
            </tr>
          ) : (
            rows.map((row) => {
              const key = rowKey(row);
              const selected = selectedKeys.includes(key);
              return (
                <tr
                  key={key}
                  className={cn(selected && "tr--selected")}
                  onClick={onRowClick ? () => onRowClick(row) : undefined}
                >
                  {selectable ? (
                    <td className="table__select">
                      <input
                        type="checkbox"
                        className="checkbox__input"
                        checked={selected}
                        onChange={() => onToggleRow?.(key)}
                        aria-label="Seleccionar fila"
                      />
                    </td>
                  ) : null}
                  {columns.map((column) => (
                    <td
                      key={column.key}
                      className={cn(
                        column.align === "right" && "text-right",
                        column.align === "center" && "text-center",
                        column.code && "cell--code",
                        column.num && "cell--num",
                      )}
                    >
                      {column.render(row)}
                    </td>
                  ))}
                  {actions ? <td className="cell--actions">{actions(row)}</td> : null}
                </tr>
              );
            })
          )}
        </tbody>
      </table>
    </div>
  );
}
