import type { InputHTMLAttributes, ReactNode } from "react";
import { cn } from "../lib/cn";

export interface CheckboxProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "type"> {
  label?: ReactNode;
}

export function Checkbox({ label, className, id, ...rest }: CheckboxProps) {
  return (
    <label htmlFor={id} className={cn("checkbox", className)}>
      <input id={id} type="checkbox" className="checkbox__input" {...rest} />
      {label ? <span className="checkbox__label">{label}</span> : null}
    </label>
  );
}
