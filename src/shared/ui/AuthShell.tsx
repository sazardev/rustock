import type { ReactNode } from "react";
import { Link as RouterLink } from "react-router";
import { LogoMark } from "./LogoMark";

export interface AuthShellProps {
  /** Título de la pantalla — es el `h1` de la página. */
  titulo: string;
  /** Una línea explicando qué se hace aquí. */
  descripcion: ReactNode;
  /** Destino de la marca (normalmente el landing). */
  marcaHref: string;
  children: ReactNode;
  /** Enlace de salida al pie: la otra ruta de autenticación. */
  pie?: ReactNode;
}

/**
 * Lienzo de las pantallas de acceso (login y alta del administrador).
 *
 * Sin tarjeta y sin caja: una columna estrecha centrada sobre el lienzo
 * blanco, con la misma calma tipográfica del resto del sistema y del landing.
 * Lo único que se ve es lo que hay que hacer — marca, título, campos, acción
 * — porque en esta pantalla no existe ninguna otra tarea (DESIGN §7).
 */
export function AuthShell({ titulo, descripcion, marcaHref, children, pie }: AuthShellProps) {
  return (
    <div className="auth">
      <main className="auth__panel">
        <RouterLink to={marcaHref} className="auth__marca">
          <LogoMark size={32} />
          <span className="auth__marca-nombre">Rustock</span>
        </RouterLink>

        <div className="auth__intro">
          <h1 className="auth__titulo">{titulo}</h1>
          <p className="auth__descripcion">{descripcion}</p>
        </div>

        {children}

        {pie ? <p className="auth__pie">{pie}</p> : null}
      </main>
    </div>
  );
}
