import type { ReactNode } from "react";
import { cn } from "../lib/cn";
import { Icon } from "./Icon";

export interface ErrorPanelProps {
  title?: ReactNode;
  children: ReactNode;
  action?: ReactNode;
  className?: string;
}

export function ErrorPanel({ title, children, action, className }: ErrorPanelProps) {
  return (
    <div className={cn("error-panel", className)} role="alert">
      <Icon name="alerta" className="error-panel__icon" aria-hidden="true" />
      <div className="error-panel__content">
        {title ? <p className="error-panel__title">{title}</p> : null}
        <div className="error-panel__message">{children}</div>
        {action ? <div className="error-panel__action">{action}</div> : null}
      </div>
    </div>
  );
}
