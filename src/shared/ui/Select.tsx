import type { SelectHTMLAttributes } from "react";
import { cn } from "../lib/cn";
import { Icon } from "./Icon";

export interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

export interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  options?: SelectOption[];
  placeholder?: string;
  code?: boolean;
}

export function Select({ options, placeholder, code, className, children, ...rest }: SelectProps) {
  return (
    <div className="select">
      <select className={cn("field__control", code && "field__control--code", className)} {...rest}>
        {placeholder ? (
          <option value="" disabled>
            {placeholder}
          </option>
        ) : null}
        {options
          ? options.map((option) => (
              <option key={option.value} value={option.value} disabled={option.disabled}>
                {option.label}
              </option>
            ))
          : children}
      </select>
      <Icon name="chevronDown" className="select__arrow" size={16} aria-hidden="true" />
    </div>
  );
}
