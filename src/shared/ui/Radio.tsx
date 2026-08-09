import type { InputHTMLAttributes, ReactNode } from "react";
import { cn } from "../lib/cn";

export interface RadioProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "type"> {
  label?: ReactNode;
}

export function Radio({ label, className, id, ...rest }: RadioProps) {
  return (
    <label htmlFor={id} className={cn("radio", className)}>
      <input id={id} type="radio" className="radio__input" {...rest} />
      {label ? <span className="radio__label">{label}</span> : null}
    </label>
  );
}
