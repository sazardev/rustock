import { useRef, type ReactNode } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
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
  /** Prefetch bajo demanda (STACK §8.4): se llama al pasar el ratón sobre una
   *  fila para precargar su detalle antes de navegar. */
  prefetch?: (row: T) => void;
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

/** Umbral a partir del cual la tabla virtualiza sus filas (STACK §4.6): con
 *  pocas filas el DOM plano es más simple; con miles solo se renderizan las
 *  visibles + el overscan, manteniendo scroll y navegación instantáneos. */
const VIRTUALIZE_UMBRAL = 80;
/** Altura estimada por fila (densidad media, DESIGN §3.6/§3.7). */
const ALTURA_FILA = 44;

export function Table<T>({
  columns,
  rows,
  rowKey,
  sort,
  onSortChange,
  onRowClick,
  prefetch,
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
  const scrollRef = useRef<HTMLDivElement>(null);
  const virtualize = rows.length > VIRTUALIZE_UMBRAL && !loading;

  const virtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => ALTURA_FILA,
    overscan: 8,
    enabled: virtualize,
  });
  const itemsVirtuales = virtualize ? virtualizer.getVirtualItems() : null;
  const altoTotal = virtualize ? virtualizer.getTotalSize() : 0;

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
        name="ordenar"
        className={cn(
          "table__sort-icon",
          active && sort?.direction === "asc" && "table__sort-icon--asc",
        )}
        size={14}
        aria-hidden="true"
      />
    );
  }

  function renderFila(row: T) {
    const key = rowKey(row);
    const selected = selectedKeys.includes(key);
    const clickable = Boolean(onRowClick);
    return (
      <tr
        key={key}
        className={cn(selected && "tr--selected")}
        onClick={onRowClick ? () => onRowClick(row) : undefined}
        onKeyDown={
          onRowClick
            ? (e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  onRowClick(row);
                }
              }
            : undefined
        }
        onMouseEnter={prefetch ? () => prefetch(row) : undefined}
        onFocus={prefetch ? () => prefetch(row) : undefined}
        role={clickable ? "button" : undefined}
        tabIndex={clickable ? 0 : undefined}
        aria-label={clickable ? "Abrir detalle" : undefined}
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
  }

  const colSpan = columns.length + (selectable ? 1 : 0) + (actions ? 1 : 0);

  return (
    <div
      ref={scrollRef}
      className={cn("table-wrap", virtualize && "table-wrap--virtual", className)}
    >
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
            {columns.map((column) => {
              const active = sort?.key === column.key;
              if (column.sortable) {
                return (
                  <th
                    key={column.key}
                    scope="col"
                    style={column.width ? { width: column.width } : undefined}
                    className={cn(
                      column.align === "right" && "text-right",
                      column.align === "center" && "text-center",
                      "th--sortable",
                    )}
                    aria-sort={
                      active ? (sort.direction === "asc" ? "ascending" : "descending") : undefined
                    }
                  >
                    <button
                      type="button"
                      className="th__sort-btn"
                      onClick={() => handleSort(column)}
                      aria-label={`Ordenar por ${typeof column.header === "string" ? column.header : column.key}`}
                    >
                      {column.header}
                      {renderSortIcon(column)}
                    </button>
                  </th>
                );
              }
              return (
                <th
                  key={column.key}
                  scope="col"
                  style={column.width ? { width: column.width } : undefined}
                  className={cn(
                    column.align === "right" && "text-right",
                    column.align === "center" && "text-center",
                  )}
                >
                  {column.header}
                </th>
              );
            })}
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
              <td colSpan={colSpan}>
                <div className="p-4">
                  <Skeleton variant="text" className="mb-2" />
                  <Skeleton variant="text" className="mb-2" />
                  <Skeleton variant="text" />
                </div>
              </td>
            </tr>
          ) : rows.length === 0 ? (
            <tr>
              <td colSpan={colSpan}>
                <EmptyState
                  title={emptyTitle}
                  description={emptyDescription}
                  action={emptyAction}
                />
              </td>
            </tr>
          ) : itemsVirtuales ? (
            <>
              {itemsVirtuales.length > 0 && itemsVirtuales[0].start > 0 ? (
                <tr
                  className="table__spacer"
                  style={{ height: itemsVirtuales[0].start }}
                  aria-hidden="true"
                  role="presentation"
                />
              ) : null}
              {itemsVirtuales.map((item) => renderFila(rows[item.index]))}
              {itemsVirtuales.length > 0 ? (
                <tr
                  className="table__spacer"
                  style={{
                    height:
                      altoTotal -
                      (itemsVirtuales[itemsVirtuales.length - 1].start +
                        itemsVirtuales[itemsVirtuales.length - 1].size),
                  }}
                  aria-hidden="true"
                  role="presentation"
                />
              ) : null}
            </>
          ) : (
            rows.map((row) => renderFila(row))
          )}
        </tbody>
      </table>
    </div>
  );
}
