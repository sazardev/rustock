import type { ReactNode } from "react";
import { cn } from "../lib/cn";
import { Icon } from "./Icon";

export interface FieldProps {
  label?: ReactNode;
  htmlFor?: string;
  required?: boolean;
  help?: ReactNode;
  error?: ReactNode;
  className?: string;
  children: ReactNode;
}

export function Field({ label, htmlFor, required, help, error, className, children }: FieldProps) {
  return (
    <div className={cn("field", error ? "field--error" : undefined, className)}>
      {label ? (
        <label
          htmlFor={htmlFor}
          className={cn("field__label", required && "field__label--required")}
        >
          {label}
        </label>
      ) : null}
      {children}
      {error ? (
        <p className="field__error" role="alert">
          <Icon name="alerta" className="field__error-icon" aria-hidden="true" />
          {error}
        </p>
      ) : help ? (
        <p className="field__help">{help}</p>
      ) : null}
    </div>
  );
}
