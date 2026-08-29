import type { InputHTMLAttributes, Ref } from "react";
import { cn } from "../lib/cn";
import { DatePicker } from "./DatePicker";
import { TimePicker } from "./TimePicker";

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  code?: boolean;
  number?: boolean;
  ref?: Ref<HTMLInputElement>;
}

/**
 * Campo de texto del sistema.
 *
 * Los tipos que el navegador dibuja con su propio control —fecha y hora— se
 * desvían a los selectores propios de Rustock (`DatePicker`, `TimePicker`).
 * El desvío vive aquí, y no en cada página, por dos razones: las páginas
 * siguen escribiendo `<Input type="date" {...register("fecha")} />` sin saber
 * nada del calendario, y ninguna pantalla puede olvidarse de usarlo y acabar
 * mostrando el control del sistema operativo (DESIGN §6.4.1).
 */
export function Input({ code, number, className, type, ...rest }: InputProps) {
  if (type === "date" || type === "datetime-local") {
    return (
      <DatePicker
        type={type === "date" ? "date" : "datetime-local"}
        className={className}
        {...rest}
      />
    );
  }
  if (type === "time") {
    return <TimePicker className={className} {...rest} />;
  }
  return (
    <input
      type={type}
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
