import { useState, type InputHTMLAttributes, type Ref } from "react";
import { cn } from "../lib/cn";
import { Icon } from "./Icon";
import { useT } from "../i18n";

export interface PasswordInputProps extends InputHTMLAttributes<HTMLInputElement> {
  ref?: Ref<HTMLInputElement>;
}

/**
 * Campo de contraseña con interruptor de visibilidad.
 *
 * Escribir una contraseña a ciegas es la causa más común de un intento de
 * acceso fallido, sobre todo en un teclado táctil del almacén. El ojo no
 * revela nada por sí solo: hay que pulsarlo, y su estado se anuncia a los
 * lectores de pantalla (DESIGN §6.4).
 */
export function PasswordInput({ className, ref, ...rest }: PasswordInputProps) {
  const t = useT();
  const [visible, setVisible] = useState(false);
  return (
    <div className="password">
      <input
        ref={ref}
        type={visible ? "text" : "password"}
        className={cn("field__control", "password__control", className)}
        {...rest}
      />
      <button
        type="button"
        className="password__toggle"
        onClick={() => setVisible((v) => !v)}
        aria-label={visible ? t.auth.ocultarContrasena : t.auth.mostrarContrasena}
        aria-pressed={visible}
        tabIndex={-1}
      >
        <Icon name={visible ? "ocultar" : "ver"} size={16} aria-hidden="true" />
      </button>
    </div>
  );
}
