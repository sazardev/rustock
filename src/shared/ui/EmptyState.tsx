import type { ReactNode } from "react";
import { cn } from "../lib/cn";
import { Icon, type IconName } from "./Icon";

export interface EmptyStateProps {
  icon?: IconName;
  title: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
  className?: string;
}

export function EmptyState({
  icon = "stock",
  title,
  description,
  action,
  className,
}: EmptyStateProps) {
  return (
    <div className={cn("empty", className)}>
      {icon ? <Icon name={icon} className="empty__icon" size={32} aria-hidden="true" /> : null}
      <p className="empty__title">{title}</p>
      {description ? <p className="empty__desc">{description}</p> : null}
      {action ? <div className="empty__action">{action}</div> : null}
    </div>
  );
}
