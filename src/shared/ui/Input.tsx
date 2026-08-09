import type { InputHTMLAttributes } from "react";
import { cn } from "../lib/cn";

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  code?: boolean;
  number?: boolean;
}

export function Input({ code, number, className, ...rest }: InputProps) {
  return (
    <input
      className={cn(
        "field__control",
        code && "field__control--code",
        number && "field__control--number",
        className,
      )}
      {...rest}
    />
  );
}
