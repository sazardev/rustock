import {
  useCallback,
  useId,
  useLayoutEffect,
  useMemo,
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
import { ColumnasHora } from "./TimePicker";
import { useT } from "../i18n";

export interface DatePickerProps extends InputHTMLAttributes<HTMLInputElement> {
  /** `date` muestra solo calendario; `datetime-local` añade la hora. */
  type?: "date" | "datetime-local";
  ref?: Ref<HTMLInputElement>;
}

const DIAS = ["L", "M", "X", "J", "V", "S", "D"];
const MESES = [
  "enero",
  "febrero",
  "marzo",
  "abril",
  "mayo",
  "junio",
  "julio",
  "agosto",
  "septiembre",
  "octubre",
  "noviembre",
  "diciembre",
];

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

/** `2026-08-29` a partir de una fecha local, sin pasar por UTC. */
function aIsoFecha(fecha: Date): string {
  return `${fecha.getFullYear()}-${dosDigitos(fecha.getMonth() + 1)}-${dosDigitos(fecha.getDate())}`;
}

/** Divide el valor del input en su parte de fecha y su parte de hora. */
function partir(valor: string): { fecha: string; hora: string } {
  const [fecha = "", hora = ""] = valor.split("T");
  return { fecha, hora };
}

function desdeIso(iso: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!m) return null;
  const fecha = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  return Number.isNaN(fecha.getTime()) ? null : fecha;
}

/** Rejilla de 6 semanas que empieza en lunes, con los bordes del mes vecino. */
function construirMes(ancla: Date): Date[] {
  const primero = new Date(ancla.getFullYear(), ancla.getMonth(), 1);
  // getDay() da 0 para domingo; se reordena a lunes = 0.
  const desplazamiento = (primero.getDay() + 6) % 7;
  const inicio = new Date(primero);
  inicio.setDate(primero.getDate() - desplazamiento);
  return Array.from({ length: 42 }, (_, i) => {
    const dia = new Date(inicio);
    dia.setDate(inicio.getDate() + i);
    return dia;
  });
}

function formatearVisible(valor: string, conHora: boolean): string {
  const { fecha, hora } = partir(valor);
  const d = desdeIso(fecha);
  if (!d) return "";
  const texto = `${d.getDate()} de ${MESES[d.getMonth()]} de ${d.getFullYear()}`;
  return conHora && hora ? `${texto}, ${hora.slice(0, 5)}` : texto;
}

/**
 * Calendario propio de Rustock (DESIGN §6.4.1).
 *
 * El selector de fecha del navegador es distinto en cada plataforma —otra
 * tipografía, otros colores, otro idioma— y en escritorio se abre como una
 * ventana del sistema imposible de vestir. Este componente lo sustituye por
 * un calendario construido con los tokens del sistema, idéntico en Linux,
 * Windows, macOS, Android y iOS.
 *
 * El `<input type="date">` nativo se conserva oculto como fuente de verdad:
 * mantiene el formato ISO que espera el backend, el registro de
 * `react-hook-form` y el envío nativo del formulario.
 */
export function DatePicker({
  type = "date",
  className,
  id,
  disabled,
  required,
  ref,
  ...rest
}: DatePickerProps) {
  const t = useT();
  const idAuto = useId();
  const idTrigger = id ?? `${idAuto}-trigger`;
  const idPanel = `${idAuto}-panel`;
  const conHora = type === "datetime-local";

  const nativoRef = useRef<HTMLInputElement | null>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const panelRef = useRef<HTMLDivElement | null>(null);

  const [abierto, setAbierto] = useState(false);
  const [valor, setValor] = useState("");
  const [mesAncla, setMesAncla] = useState(() => new Date());

  // El input oculto manda: tras cada render se refleja su valor, de modo que
  // un `reset()` o un `setValue()` externos se ven sin sincronización manual.
  // Sin lista de dependencias a propósito: la fuente de verdad es el DOM del
  // input oculto, que puede cambiar por causas externas (reset/setValue de
  // react-hook-form). El `setValor` está guardado, así que no encadena renders.
  // eslint-disable-next-line react-hooks/exhaustive-deps, react/set-state-in-effect
  useLayoutEffect(() => {
    const actual = nativoRef.current?.value ?? "";
    setValor((previo) => (previo === actual ? previo : actual));
  });

  const { fecha: fechaIso, hora } = partir(valor);
  const seleccionada = desdeIso(fechaIso);
  const horaNumero = hora ? Number(hora.slice(0, 2)) : null;
  const minutoNumero = hora ? Number(hora.slice(3, 5)) : null;

  const dias = useMemo(() => construirMes(mesAncla), [mesAncla]);
  const hoyIso = aIsoFecha(new Date());

  const posicion = useAnclaje(abierto, triggerRef, { altoEstimado: conHora ? 380 : 330 });

  const cerrar = useCallback((devolverFoco: boolean) => {
    setAbierto(false);
    if (devolverFoco) triggerRef.current?.focus();
  }, []);

  useCierreExterior(abierto, cerrar, triggerRef, panelRef);

  function abrir() {
    if (disabled) return;
    setMesAncla(seleccionada ?? new Date());
    setAbierto(true);
  }

  function escribir(nuevoValor: string) {
    const elemento = nativoRef.current;
    if (elemento) asignarValorNativo(elemento, nuevoValor);
  }

  function elegirDia(dia: Date) {
    const iso = aIsoFecha(dia);
    if (conHora) {
      escribir(`${iso}T${hora || "09:00"}`);
    } else {
      escribir(iso);
      cerrar(true);
    }
  }

  function cambiarHora(nuevaHora: string) {
    escribir(`${fechaIso || hoyIso}T${nuevaHora}`);
  }

  function limpiar() {
    escribir("");
    cerrar(true);
  }

  function alTeclear(evento: ReactKeyboardEvent<HTMLButtonElement>) {
    if (!abierto && ["ArrowDown", "Enter", " "].includes(evento.key)) {
      evento.preventDefault();
      abrir();
    }
  }

  function moverMes(delta: number) {
    setMesAncla((previo) => new Date(previo.getFullYear(), previo.getMonth() + delta, 1));
  }

  const visible = formatearVisible(valor, conHora);

  return (
    <div className="datepicker">
      <input
        ref={(nodo) => {
          nativoRef.current = nodo;
          if (typeof ref === "function") ref(nodo);
          else if (ref) (ref as { current: HTMLInputElement | null }).current = nodo;
        }}
        type={type}
        id={`${idAuto}-nativo`}
        className="datepicker__nativo"
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
          "datepicker__trigger",
          !visible && "datepicker__trigger--vacio",
          className,
        )}
        disabled={disabled}
        aria-required={required ? true : undefined}
        aria-haspopup="dialog"
        aria-expanded={abierto}
        aria-controls={abierto ? idPanel : undefined}
        aria-invalid={rest["aria-invalid"]}
        aria-describedby={rest["aria-describedby"]}
        onClick={() => (abierto ? cerrar(false) : abrir())}
        onKeyDown={alTeclear}
      >
        <span className="datepicker__valor">
          {visible || (conHora ? t.ui.elegirFechaYHora : t.ui.elegirFecha)}
        </span>
        <Icon name="calendario" className="datepicker__icono" size={16} aria-hidden="true" />
      </button>

      {abierto && posicion
        ? createPortal(
            <div
              ref={panelRef}
              id={idPanel}
              role="dialog"
              aria-label={conHora ? t.ui.elegirFechaYHora : t.ui.elegirFecha}
              className="panel-flotante calendario"
              style={{ left: posicion.left, top: posicion.top }}
            >
              <div className="calendario__barra">
                <button
                  type="button"
                  className="calendario__nav"
                  onClick={() => moverMes(-1)}
                  aria-label={t.ui.mesAnterior}
                >
                  <Icon name="atras" size={16} aria-hidden="true" />
                </button>
                <span className="calendario__mes" aria-live="polite">
                  {MESES[mesAncla.getMonth()]} {mesAncla.getFullYear()}
                </span>
                <button
                  type="button"
                  className="calendario__nav calendario__nav--siguiente"
                  onClick={() => moverMes(1)}
                  aria-label={t.ui.mesSiguiente}
                >
                  <Icon name="atras" size={16} aria-hidden="true" />
                </button>
              </div>

              <div className="calendario__semana" aria-hidden="true">
                {DIAS.map((dia, i) => (
                  <span key={i} className="calendario__dia-nombre">
                    {dia}
                  </span>
                ))}
              </div>

              <div className="calendario__rejilla" role="grid">
                {dias.map((dia) => {
                  const iso = aIsoFecha(dia);
                  const fuera = dia.getMonth() !== mesAncla.getMonth();
                  return (
                    <button
                      key={iso}
                      type="button"
                      role="gridcell"
                      aria-selected={iso === fechaIso}
                      aria-current={iso === hoyIso ? "date" : undefined}
                      className={cn(
                        "calendario__dia",
                        fuera && "calendario__dia--fuera",
                        iso === hoyIso && "calendario__dia--hoy",
                        iso === fechaIso && "calendario__dia--elegido",
                      )}
                      onClick={() => elegirDia(dia)}
                    >
                      {dia.getDate()}
                    </button>
                  );
                })}
              </div>

              {conHora ? (
                <div className="calendario__hora">
                  <span className="calendario__hora-label">Hora</span>
                  <ColumnasHora
                    hora={horaNumero}
                    minuto={minutoNumero}
                    onElegir={(h, m) => cambiarHora(`${dosDigitos(h)}:${dosDigitos(m)}`)}
                    autoDesplazar={false}
                  />
                </div>
              ) : null}

              <div className="calendario__pie">
                <button type="button" className="calendario__accion" onClick={limpiar}>
                  Limpiar
                </button>
                <button
                  type="button"
                  className="calendario__accion calendario__accion--principal"
                  onClick={() => elegirDia(new Date())}
                >
                  Hoy
                </button>
              </div>
            </div>,
            document.body,
          )
        : null}
    </div>
  );
}
