import type { ReactNode } from "react";
import { cn } from "../lib/cn";

export interface TopbarProps {
  brand?: ReactNode;
  breadcrumbs?: ReactNode;
  search?: ReactNode;
  alerts?: ReactNode;
  user?: ReactNode;
  navToggle?: ReactNode;
  className?: string;
}

export function Topbar({
  brand,
  breadcrumbs,
  search,
  alerts,
  user,
  navToggle,
  className,
}: TopbarProps) {
  return (
    <div className={cn("topbar", className)}>
      {navToggle}
      {brand}
      {breadcrumbs ? <div className="topbar__breadcrumbs">{breadcrumbs}</div> : null}
      {search ? <div className="topbar__search">{search}</div> : null}
      {alerts}
      {user}
    </div>
  );
}
