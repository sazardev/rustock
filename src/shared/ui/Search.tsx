import type { InputHTMLAttributes } from "react";
import { cn } from "../lib/cn";
import { Icon } from "./Icon";

export interface SearchProps extends InputHTMLAttributes<HTMLInputElement> {
  className?: string;
}

export function Search({ className, ...rest }: SearchProps) {
  return (
    <div className={cn("search", className)}>
      <Icon name="buscar" size={16} className="icon" aria-hidden="true" />
      <input type="search" className="field__control" {...rest} />
    </div>
  );
}
