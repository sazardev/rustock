import {
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type InputHTMLAttributes,
  type KeyboardEvent as ReactKeyboardEvent,
  type Ref,
} from "react";
import { createPortal } from "react-dom";
import { cn } from "../lib/cn";
import { Icon } from "./Icon";
import { useAnclaje, useCierreExterior } from "./anclaje";
import { useT } from "../i18n";

export interface TimePickerProps extends InputHTMLAttributes<HTMLInputElement> {
  /** Paso de la columna de minutos. Por defecto 5. */
  pasoMinutos?: number;
  ref?: Ref<HTMLInputElement>;
}

/** Escribe el valor saltándose el rastreador de React y notifica el cambio. */
function asignarValorNativo(elemento: HTMLInputElement, valor: string): void {
  const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set;
  if (setter) {
    setter.call(elemento, valor);
  } else {
    elemento.value = valor;
  }
  elemento.dispatchEvent(new Event("input", { bubbles: true }));
  elemento.dispatchEvent(new Event("change", { bubbles: true }));
}

function dosDigitos(n: number): string {
  return String(n).padStart(2, "0");
}

function partir(valor: string): { hora: number | null; minuto: number | null } {
  const m = /^(\d{1,2}):(\d{2})/.exec(valor);
  if (!m) return { hora: null, minuto: null };
  return { hora: Number(m[1]), minuto: Number(m[2]) };
}

export interface ColumnasHoraProps {
  /** Hora actual (0–23) o null si no hay valor. */
  hora: number | null;
  /** Minuto actual (0–59) o null si no hay valor. */
  minuto: number | null;
  pasoMinutos?: number;
  /** Se llama con la hora completa cada vez que se toca una columna. */
  onElegir: (hora: number, minuto: number) => void;
  /** Desplaza cada columna hasta su valor actual al montarse. */
  autoDesplazar?: boolean;
}

/**
 * Las dos columnas de hora y minuto, sin panel propio. `TimePicker` las
 * envuelve en un panel flotante; `DatePicker` las incrusta en línea dentro
 * del calendario cuando el campo es `datetime-local` — un panel flotante
 * nunca abre otro panel flotante dentro (DESIGN §6.4.1).
 */
export function ColumnasHora({
  hora,
  minuto,
  pasoMinutos = 5,
  onElegir,
  autoDesplazar = true,
}: ColumnasHoraProps) {
  const t = useT();
  const horaActivaRef = useRef<HTMLButtonElement | null>(null);
  const minutoActivoRef = useRef<HTMLButtonElement | null>(null);

  // Cada columna se desplaza hasta su valor actual: el usuario ve dónde está,
  // no el principio de una lista de 24 elementos.
  useEffect(() => {
    if (!autoDesplazar) return;
    horaActivaRef.current?.scrollIntoView({ block: "center" });
    minutoActivoRef.current?.scrollIntoView({ block: "center" });
  }, [autoDesplazar]);

  const horas = Array.from({ length: 24 }, (_, i) => i);
  const minutos = Array.from({ length: Math.ceil(60 / pasoMinutos) }, (_, i) => i * pasoMinutos);
  // Un valor fuera del paso (p. ej. 14:37 importado) no se pierde: su minuto
  // exacto se añade a la columna para poder verlo y conservarlo.
  const minutosVisibles =
    minuto !== null && !minutos.includes(minuto)
      ? [...minutos, minuto].toSorted((a, b) => a - b)
      : minutos;

  return (
    <div className="reloj__columnas">
      <div className="reloj__columna" role="listbox" aria-label={t.campos.hora}>
        {horas.map((h) => {
          const activa = h === hora;
          return (
            <button
              key={h}
              ref={activa ? horaActivaRef : undefined}
              type="button"
              role="option"
              aria-selected={activa}
              className={cn("reloj__celda", activa && "reloj__celda--elegida")}
              onClick={() => onElegir(h, minuto ?? 0)}
            >
              {dosDigitos(h)}
            </button>
          );
        })}
      </div>
      <div className="reloj__columna" role="listbox" aria-label={t.campos.minuto}>
        {minutosVisibles.map((m) => {
          const activo = m === minuto;
          return (
            <button
              key={m}
              ref={activo ? minutoActivoRef : undefined}
              type="button"
              role="option"
              aria-selected={activo}
              className={cn("reloj__celda", activo && "reloj__celda--elegida")}
              onClick={() => onElegir(hora ?? 0, m)}
            >
              {dosDigitos(m)}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/**
 * Selector de hora propio de Rustock (DESIGN §6.4.1).
 *
 * Dos columnas —horas y minutos— en lugar del control de hora del navegador,
 * que en escritorio es un campo con flechas diminutas y en móvil una rueda
 * del sistema operativo. Aquí un movimiento se fecha con dos toques, y el
 * resultado se ve igual en cualquier plataforma.
 *
 * El `<input type="time">` nativo se conserva oculto como fuente de verdad
 * (formato `HH:MM`, registro de react-hook-form, envío nativo).
 */
export function TimePicker({
  pasoMinutos = 5,
  className,
  id,
  disabled,
  required,
  ref,
  ...rest
}: TimePickerProps) {
  const t = useT();
  const idAuto = useId();
  const idTrigger = id ?? `${idAuto}-trigger`;
  const idPanel = `${idAuto}-panel`;

  const nativoRef = useRef<HTMLInputElement | null>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const panelRef = useRef<HTMLDivElement | null>(null);

  const [abierto, setAbierto] = useState(false);
  const [valor, setValor] = useState("");

  // Sin lista de dependencias a propósito: la fuente de verdad es el DOM del
  // input oculto, que puede cambiar por causas externas (reset/setValue de
  // react-hook-form). El `setValor` está guardado, así que no encadena renders.
  // eslint-disable-next-line react-hooks/exhaustive-deps, react/set-state-in-effect
  useLayoutEffect(() => {
    const actual = nativoRef.current?.value ?? "";
    setValor((previo) => (previo === actual ? previo : actual));
  });

  const { hora, minuto } = partir(valor);

  const posicion = useAnclaje(abierto, triggerRef, { altoEstimado: 260 });

  const cerrar = useCallback((devolverFoco: boolean) => {
    setAbierto(false);
    if (devolverFoco) triggerRef.current?.focus();
  }, []);

  useCierreExterior(abierto, cerrar, triggerRef, panelRef);

  function escribir(h: number, m: number) {
    const elemento = nativoRef.current;
    if (elemento) asignarValorNativo(elemento, `${dosDigitos(h)}:${dosDigitos(m)}`);
  }

  function alTeclear(evento: ReactKeyboardEvent<HTMLButtonElement>) {
    if (!abierto && ["ArrowDown", "Enter", " "].includes(evento.key)) {
      evento.preventDefault();
      if (!disabled) setAbierto(true);
    }
  }

  const visible =
    hora !== null && minuto !== null ? `${dosDigitos(hora)}:${dosDigitos(minuto)}` : "";

  return (
    <div className="timepicker">
      <input
        ref={(nodo) => {
          nativoRef.current = nodo;
          if (typeof ref === "function") ref(nodo);
          else if (ref) (ref as { current: HTMLInputElement | null }).current = nodo;
        }}
        type="time"
        id={`${idAuto}-nativo`}
        className="timepicker__nativo"
        tabIndex={-1}
        aria-hidden="true"
        disabled={disabled}
        {...rest}
      />

      <button
        ref={triggerRef}
        type="button"
        id={idTrigger}
        role="combobox"
        className={cn(
          "field__control",
          "timepicker__trigger",
          !visible && "timepicker__trigger--vacio",
          className,
        )}
        disabled={disabled}
        aria-required={required ? true : undefined}
        aria-haspopup="dialog"
        aria-expanded={abierto}
        aria-controls={abierto ? idPanel : undefined}
        aria-invalid={rest["aria-invalid"]}
        aria-describedby={rest["aria-describedby"]}
        onClick={() => (abierto ? cerrar(false) : setAbierto(true))}
        onKeyDown={alTeclear}
      >
        <span className="timepicker__valor">{visible || t.ui.elegirHora}</span>
        <Icon name="historial" className="timepicker__icono" size={16} aria-hidden="true" />
      </button>

      {abierto && posicion
        ? createPortal(
            <div
              ref={panelRef}
              id={idPanel}
              role="dialog"
              aria-label={t.ui.elegirHora}
              className="panel-flotante reloj"
              style={{ left: posicion.left, top: posicion.top }}
            >
              <ColumnasHora
                hora={hora}
                minuto={minuto}
                pasoMinutos={pasoMinutos}
                onElegir={escribir}
              />
              <div className="reloj__pie">
                <button
                  type="button"
                  className="calendario__accion"
                  onClick={() => {
                    const elemento = nativoRef.current;
                    if (elemento) asignarValorNativo(elemento, "");
                    cerrar(true);
                  }}
                >
                  {t.comun.limpiar}
                </button>
                <button
                  type="button"
                  className="calendario__accion calendario__accion--principal"
                  onClick={() => cerrar(true)}
                >
                  {t.comun.listo}
                </button>
              </div>
            </div>,
            document.body,
          )
        : null}
    </div>
  );
}
