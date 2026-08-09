import type { HTMLAttributes, ReactNode } from "react";
import { cn } from "../lib/cn";

export interface CardProps extends Omit<HTMLAttributes<HTMLDivElement>, "title"> {
  title?: ReactNode;
  actions?: ReactNode;
  muted?: boolean;
  flush?: boolean;
  children: ReactNode;
}

export interface CardHeaderProps extends Omit<HTMLAttributes<HTMLDivElement>, "title"> {
  title?: ReactNode;
  actions?: ReactNode;
}

export interface CardBodyProps extends HTMLAttributes<HTMLDivElement> {
  flush?: boolean;
}

function CardHeader({ title, actions, className, children, ...rest }: CardHeaderProps) {
  return (
    <header className={cn("card__header", className)} {...rest}>
      {title ? <h3 className="card__title">{title}</h3> : null}
      {children}
      {actions ? <div className="card__actions">{actions}</div> : null}
    </header>
  );
}

function CardBody({ flush, className, children, ...rest }: CardBodyProps) {
  return (
    <div className={cn("card__body", flush && "card__body--flush", className)} {...rest}>
      {children}
    </div>
  );
}

export function Card({ title, actions, muted, flush, className, children, ...rest }: CardProps) {
  return (
    <section className={cn("card", muted && "card--muted", className)} {...rest}>
      {title || actions ? <CardHeader title={title} actions={actions} /> : null}
      {flush ? <CardBody flush>{children}</CardBody> : <CardBody>{children}</CardBody>}
    </section>
  );
}

Card.Header = CardHeader;
Card.Body = CardBody;
