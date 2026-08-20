import { cloneElement, isValidElement, useId, type ReactNode } from "react";
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
  const autoId = useId();
  const errorId = `${autoId}-error`;
  const helpId = `${autoId}-help`;

  // Propaga aria-invalid / aria-describedby al control hijo para WCAG 3.3.1/4.1.3.
  let childWithA11y = children;
  if (isValidElement(children) && (error || help)) {
    const extra: Record<string, unknown> = {};
    if (error) {
      extra["aria-invalid"] = true;
      extra["aria-describedby"] = errorId;
    } else if (help) {
      extra["aria-describedby"] = helpId;
    }
    // Para Field con htmlFor el control ya tiene id; aria-describedby es aditivo.
    childWithA11y = cloneElement(children as React.ReactElement<any>, extra);
  }

  return (
    <div className={cn("field", error ? "field--error" : undefined, className)}>
      {label ? (
        <label
          htmlFor={htmlFor}
          className={cn("field__label", required && "field__label--required")}
          aria-required={required ? true : undefined}
        >
          {label}
        </label>
      ) : null}
      {childWithA11y}
      {error ? (
        <p id={errorId} className="field__error" role="alert">
          <Icon name="alerta" className="field__error-icon" aria-hidden="true" />
          {error}
        </p>
      ) : help ? (
        <p id={helpId} className="field__help">
          {help}
        </p>
      ) : null}
    </div>
  );
}
