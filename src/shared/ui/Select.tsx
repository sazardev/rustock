import {
  useCallback,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
  type Ref,
  type SelectHTMLAttributes,
} from "react";
import { createPortal } from "react-dom";
import { cn } from "../lib/cn";
import { Icon } from "./Icon";
import { useAnclaje, useCierreExterior } from "./anclaje";

export interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

export interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  options?: SelectOption[];
  placeholder?: string;
  code?: boolean;
  ref?: Ref<HTMLSelectElement>;
}

interface EstadoSelect {
  valor: string;
  opciones: SelectOption[];
}

const ALTO_OPCION = 32;
const ALTO_MAXIMO_LISTA = 288;

/** Escribe el valor saltándose el rastreador de React y notifica el cambio. */
function asignarValorNativo(elemento: HTMLSelectElement, valor: string): void {
  const setter = Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, "value")?.set;
  if (setter) {
    setter.call(elemento, valor);
  } else {
    elemento.value = valor;
  }
  elemento.dispatchEvent(new Event("change", { bubbles: true }));
}

/** Lee la lista real de opciones del `<select>` oculto (venga de `options` o de `children`). */
function leerOpciones(elemento: HTMLSelectElement): SelectOption[] {
  return [...elemento.options].map((opcion) => ({
    value: opcion.value,
    label: opcion.textContent ?? opcion.value,
    disabled: opcion.disabled,
  }));
}

function mismasOpciones(a: SelectOption[], b: SelectOption[]): boolean {
  if (a.length !== b.length) return false;
  return a.every((x, i) => x.value === b[i].value && x.label === b[i].label);
}

/**
 * Lista de selección propia de Rustock (DESIGN §6.4.1).
 *
 * El menú desplegable del sistema operativo es el único fragmento de la
 * interfaz que Rustock no podía vestir: tipografía, colores y densidad los
 * decidía el navegador. Este componente lo sustituye por una lista propia,
 * construida con los mismos tokens que el resto del sistema.
 *
 * El `<select>` nativo **no desaparece**: queda oculto como fuente de verdad
 * del valor y de la lista de opciones. Eso mantiene intacto el registro de
 * `react-hook-form` (`{...register()}`, `reset()`, `setValue()`), el envío
 * nativo del formulario y el autocompletado del navegador — la lista visible
 * es una capa de presentación sobre un control real, no un reemplazo.
 */
export function Select({
  options,
  placeholder,
  code,
  className,
  children,
  id,
  disabled,
  required,
  ref,
  ...rest
}: SelectProps) {
  const idAuto = useId();
  const idTrigger = id ?? `${idAuto}-trigger`;
  const idLista = `${idAuto}-lista`;

  const nativoRef = useRef<HTMLSelectElement | null>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const listaRef = useRef<HTMLDivElement | null>(null);

  const [abierto, setAbierto] = useState(false);
  const [indiceActivo, setIndiceActivo] = useState(0);
  const [estado, setEstado] = useState<EstadoSelect>({ valor: "", opciones: [] });
  const busqueda = useRef({ texto: "", momento: 0 });

  // El `<select>` oculto es la fuente de verdad: tras cada render se refleja
  // su valor y su lista de opciones. Así un `reset()` de react-hook-form o un
  // cambio de las opciones (que llegan de una consulta) se ven de inmediato,
  // sin duplicar estado ni sincronizarlo a mano.
  // Sin lista de dependencias a propósito: la fuente de verdad es el DOM del
  // `<select>` oculto, que puede cambiar por causas externas a este componente
  // (reset/setValue de react-hook-form, nuevas opciones de una consulta). El
  // `setEstado` está guardado por comparación, así que no encadena renders.
  // eslint-disable-next-line react-hooks/exhaustive-deps, react/set-state-in-effect
  useLayoutEffect(() => {
    const elemento = nativoRef.current;
    if (!elemento) return;
    const valor = elemento.value;
    const opciones = leerOpciones(elemento);
    setEstado((previo) =>
      previo.valor === valor && mismasOpciones(previo.opciones, opciones)
        ? previo
        : { valor, opciones },
    );
  });

  const seleccionables = estado.opciones.filter((o) => !o.disabled);
  const opcionActual = estado.opciones.find((o) => o.value === estado.valor);
  // Si hay una opción que coincide con el valor, se muestra su etiqueta —
  // también cuando el valor es cadena vacía. Un `<option value="">Todos los
  // tipos</option>` declarado por la página es una elección con nombre, no la
  // ausencia de elección: el disparador debe leerse igual que la lista.
  // El texto de `placeholder` solo aparece cuando no hay ninguna opción que
  // corresponda al valor actual (lista aún vacía, o valor huérfano).
  const etiquetaVisible = opcionActual ? opcionActual.label : (placeholder ?? "");
  // Gris de marcador solo para el hueco vacío que sintetiza este componente a
  // partir de la prop `placeholder`; una opción real de la página se pinta
  // como cualquier otro valor.
  const esPlaceholder = Boolean(placeholder) && estado.valor === "";

  const posicion = useAnclaje(abierto, triggerRef, {
    altoEstimado: Math.min(ALTO_MAXIMO_LISTA, Math.max(seleccionables.length, 1) * ALTO_OPCION + 8),
  });

  const cerrar = useCallback((devolverFoco: boolean) => {
    setAbierto(false);
    if (devolverFoco) triggerRef.current?.focus();
  }, []);

  useCierreExterior(abierto, cerrar, triggerRef, listaRef);

  function abrir() {
    if (disabled) return;
    const actual = seleccionables.findIndex((o) => o.value === estado.valor);
    setIndiceActivo(actual >= 0 ? actual : 0);
    setAbierto(true);
  }

  function elegir(valor: string) {
    const elemento = nativoRef.current;
    if (elemento) asignarValorNativo(elemento, valor);
    cerrar(true);
  }

  function mover(delta: number) {
    setIndiceActivo((previo) => {
      if (seleccionables.length === 0) return 0;
      const siguiente = previo + delta;
      if (siguiente < 0) return 0;
      if (siguiente > seleccionables.length - 1) return seleccionables.length - 1;
      return siguiente;
    });
  }

  /** Salto por escritura: teclear "pro" lleva a la primera opción que empieza así. */
  function porEscritura(tecla: string) {
    const ahora = Date.now();
    const texto = (ahora - busqueda.current.momento < 700 ? busqueda.current.texto : "") + tecla;
    busqueda.current = { texto, momento: ahora };
    const indice = seleccionables.findIndex((o) =>
      o.label.toLocaleLowerCase("es").startsWith(texto.toLocaleLowerCase("es")),
    );
    if (indice >= 0) setIndiceActivo(indice);
  }

  function alTeclear(evento: ReactKeyboardEvent<HTMLButtonElement>) {
    if (disabled) return;
    if (!abierto) {
      if (["ArrowDown", "ArrowUp", "Enter", " "].includes(evento.key)) {
        evento.preventDefault();
        abrir();
      }
      return;
    }
    switch (evento.key) {
      case "ArrowDown":
        evento.preventDefault();
        mover(1);
        break;
      case "ArrowUp":
        evento.preventDefault();
        mover(-1);
        break;
      case "Home":
        evento.preventDefault();
        setIndiceActivo(0);
        break;
      case "End":
        evento.preventDefault();
        setIndiceActivo(Math.max(0, seleccionables.length - 1));
        break;
      case "Enter":
      case " ":
        evento.preventDefault();
        if (seleccionables[indiceActivo]) elegir(seleccionables[indiceActivo].value);
        break;
      case "Tab":
        cerrar(false);
        break;
      default:
        if (evento.key.length === 1) porEscritura(evento.key);
    }
  }

  return (
    <div className="select">
      {/* Control real: conserva name/value/ref del formulario y el envío nativo. */}
      <select
        ref={(nodo) => {
          nativoRef.current = nodo;
          if (typeof ref === "function") ref(nodo);
          else if (ref) (ref as { current: HTMLSelectElement | null }).current = nodo;
        }}
        id={`${idAuto}-nativo`}
        className="select__nativo"
        tabIndex={-1}
        aria-hidden="true"
        disabled={disabled}
        {...rest}
      >
        {placeholder ? <option value="">{placeholder}</option> : null}
        {options
          ? options.map((option) => (
              <option key={option.value} value={option.value} disabled={option.disabled}>
                {option.label}
              </option>
            ))
          : children}
      </select>

      <button
        ref={triggerRef}
        type="button"
        id={idTrigger}
        role="combobox"
        className={cn(
          "field__control",
          "select__trigger",
          code && "field__control--code",
          esPlaceholder && "select__trigger--placeholder",
          className,
        )}
        disabled={disabled}
        aria-required={required ? true : undefined}
        aria-haspopup="listbox"
        aria-expanded={abierto}
        aria-controls={abierto ? idLista : undefined}
        aria-activedescendant={
          abierto && seleccionables[indiceActivo]
            ? `${idAuto}-op-${seleccionables[indiceActivo].value}`
            : undefined
        }
        aria-invalid={rest["aria-invalid"]}
        aria-describedby={rest["aria-describedby"]}
        onClick={() => (abierto ? cerrar(false) : abrir())}
        onKeyDown={alTeclear}
      >
        <span className="select__valor">{etiquetaVisible}</span>
        <Icon
          name="chevronDown"
          className={cn("select__arrow", abierto && "select__arrow--abierto")}
          size={16}
          aria-hidden="true"
        />
      </button>

      {abierto && posicion
        ? createPortal(
            <div
              ref={listaRef}
              id={idLista}
              role="listbox"
              aria-labelledby={idTrigger}
              className="panel-flotante select__lista"
              style={{
                left: posicion.left,
                top: posicion.top,
                minWidth: posicion.minWidth,
                maxHeight: Math.min(posicion.maxHeight, ALTO_MAXIMO_LISTA),
              }}
            >
              {seleccionables.length === 0 ? (
                <p className="select__vacio">Sin opciones disponibles</p>
              ) : (
                seleccionables.map((opcion, indice) => {
                  const elegida = opcion.value === estado.valor;
                  return (
                    <button
                      key={opcion.value}
                      type="button"
                      tabIndex={-1}
                      id={`${idAuto}-op-${opcion.value}`}
                      role="option"
                      aria-selected={elegida}
                      className={cn(
                        "select__opcion",
                        indice === indiceActivo && "select__opcion--activa",
                        elegida && "select__opcion--elegida",
                      )}
                      onPointerEnter={() => setIndiceActivo(indice)}
                      onClick={() => elegir(opcion.value)}
                    >
                      <span className="select__opcion-texto">{opcion.label}</span>
                      {elegida ? (
                        <Icon
                          name="aprobar"
                          size={14}
                          className="select__opcion-marca"
                          aria-hidden="true"
                        />
                      ) : null}
                    </button>
                  );
                })
              )}
            </div>,
            document.body,
          )
        : null}
    </div>
  );
}
