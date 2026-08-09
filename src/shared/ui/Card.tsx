import type { HTMLAttributes, ReactNode } from "react";
import { cn } from "../lib/cn";

export interface CardProps extends Omit<HTMLAttributes<HTMLDivElement>, "title"> {
  title?: ReactNode;
  actions?: ReactNode;
  muted?: boolean;
  flush?: boolean;
  children: ReactNode;
}

export function Card({ title, actions, muted, flush, className, children, ...rest }: CardProps) {
  return (
    <section className={cn("card", muted && "card--muted", className)} {...rest}>
      {title || actions ? (
        <header className="card__header">
          {title ? <h3 className="card__title">{title}</h3> : null}
          {actions ? <div className="card__actions">{actions}</div> : null}
        </header>
      ) : null}
      <div className={cn("card__body", flush && "card__body--flush")}>{children}</div>
    </section>
  );
}
