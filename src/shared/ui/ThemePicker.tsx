/**
 * ThemePicker — selector de paleta y de modo claro/oscuro (DESIGN §3.1).
 *
 * Componentes de presentación pura: los datos (lista de paletas con sus
 * muestras de acento) llegan del backend (`listar_temas`) y la aplicación
 * en vivo la maneja quien los consume (`useTema.previsualizar`). El botón de
 * paleta y las muestras usan solo tokens de radio/sombra/paleta; los colores
 * de las muestras son datos (inline style), como las gráficas de reportes.
 */
import type { ReactNode } from "react";
import type { ResumenTema } from "../types";

export interface PaletaPickerProps {
  /** Paletas predefinidas (del backend). */
  temas: ResumenTema[];
  /** Paleta seleccionada (null = heredar de la empresa). */
  seleccionado: string | null;
  /** Al elegir una paleta. */
  onSeleccionar: (id: string) => void;
  /** Opción "heredar de la empresa" (solo en preferencias personales). */
  heredar?: boolean;
  onHeredar?: () => void;
  /** Label accesible del grupo. */
  ariaLabel?: string;
}

export function PaletaPicker({
  temas,
  seleccionado,
  onSeleccionar,
  heredar = false,
  onHeredar,
  ariaLabel = "Paleta de colores",
}: PaletaPickerProps) {
  return (
    <div className="theme-picker" role="radiogroup" aria-label={ariaLabel}>
      {heredar ? (
        <button
          type="button"
          role="radio"
          aria-checked={seleccionado === null}
          className={`theme-picker__paleta ${seleccionado === null ? "is-selected" : ""}`}
          onClick={onHeredar}
        >
          <span className="theme-picker__muestras" aria-hidden="true">
            <span className="theme-picker__muestra theme-picker__muestra--heredar" />
            <span className="theme-picker__muestra theme-picker__muestra--heredar" />
          </span>
          <span className="theme-picker__nombre">Heredar de la empresa</span>
        </button>
      ) : null}
      {temas.map((t) => (
        <button
          key={t.id}
          type="button"
          role="radio"
          aria-checked={seleccionado === t.id}
          className={`theme-picker__paleta ${seleccionado === t.id ? "is-selected" : ""}`}
          onClick={() => onSeleccionar(t.id)}
        >
          <span className="theme-picker__muestras" aria-hidden="true">
            <span className="theme-picker__muestra" style={{ backgroundColor: t.color_claro }} />
            <span className="theme-picker__muestra" style={{ backgroundColor: t.color_oscuro }} />
          </span>
          <span className="theme-picker__nombre">{t.nombre}</span>
        </button>
      ))}
    </div>
  );
}

export interface ModoPickerProps {
  /** Modo seleccionado (null = heredar de la empresa). */
  seleccionado: "CLARO" | "OSCURO" | null;
  onSeleccionar: (modo: "CLARO" | "OSCURO") => void;
  /** Opción "heredar de la empresa". */
  heredar?: boolean;
  onHeredar?: () => void;
  /** Etiqueta accesible del grupo. */
  ariaLabel?: string;
}

function ModoBoton({
  activo,
  onClick,
  muestraClase,
  children,
}: {
  activo: boolean;
  onClick: () => void;
  muestraClase: string;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={activo}
      className={`modo-picker__boton ${activo ? "is-selected" : ""}`}
      onClick={onClick}
    >
      <span className={`modo-picker__muestra ${muestraClase}`} aria-hidden="true" />
      <span>{children}</span>
    </button>
  );
}

export function ModoPicker({
  seleccionado,
  onSeleccionar,
  heredar = false,
  onHeredar,
  ariaLabel = "Modo de color",
}: ModoPickerProps) {
  return (
    <div className="modo-picker" role="radiogroup" aria-label={ariaLabel}>
      {heredar ? (
        <ModoBoton
          activo={seleccionado === null}
          onClick={() => onHeredar?.()}
          muestraClase="modo-picker__muestra--heredar"
        >
          Heredar
        </ModoBoton>
      ) : null}
      <ModoBoton
        activo={seleccionado === "CLARO"}
        onClick={() => onSeleccionar("CLARO")}
        muestraClase="modo-picker__muestra--claro"
      >
        Claro
      </ModoBoton>
      <ModoBoton
        activo={seleccionado === "OSCURO"}
        onClick={() => onSeleccionar("OSCURO")}
        muestraClase="modo-picker__muestra--oscuro"
      >
        Oscuro
      </ModoBoton>
    </div>
  );
}
