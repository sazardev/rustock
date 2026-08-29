/**
 * Escáner de mano global (SPEC §14.3.1).
 *
 * Un lector de código de barras USB o Bluetooth se comporta como un teclado:
 * "teclea" el código y pulsa Enter. No hay driver que instalar ni API que
 * abrir — lo que hay que hacer es **distinguir esa ráfaga de una persona
 * escribiendo**, y eso lo delata el tiempo entre teclas:
 *
 * - Un lector emite entre 5 y 20 ms por carácter, con una regularidad de
 *   máquina.
 * - Una persona, incluso rápida, tarda 100-200 ms y con ritmo irregular.
 *
 * Con el umbral en 40 ms los dos casos no se solapan en la práctica.
 *
 * **Dónde se escucha:** en todo el documento, en cualquier pantalla. Así
 * escanear funciona sin ir antes a ninguna página concreta — que es como se
 * trabaja con una caja en las manos.
 *
 * **Dónde NO se interviene:** cuando el foco está en un campo de texto. Ahí el
 * lector escribe en el campo, que es justo lo que la persona quiere si acaba
 * de hacer clic en él. Esto además garantiza que nunca se robe una pulsación a
 * alguien que está escribiendo de verdad.
 */
import { create } from "zustand";

/** Máximo entre teclas para considerar la ráfaga de una máquina. */
const UMBRAL_MS = 40;
/** Longitud mínima creíble de un código. Descarta pulsaciones sueltas. */
const LARGO_MINIMO = 3;
/** Sin teclas durante este tiempo, la ráfaga se descarta. */
const EXPIRA_MS = 200;

/**
 * ¿Esta ráfaga la produjo una máquina?
 *
 * Función pura y aislada a propósito: es la decisión más delicada del módulo
 * —un falso positivo se comería lo que alguien está escribiendo— y así se
 * puede verificar con datos reales sin montar un navegador
 * (`scripts/verificar-escaner.mjs`).
 *
 * Se exigen dos cosas a la vez, porque cada una por separado se equivoca:
 * longitud creíble (una pulsación suelta no es un código) y ritmo de máquina
 * (media de intervalos por debajo del umbral).
 */
export function esRafagaDeMaquina(intervalos: number[], largo: number): boolean {
  if (largo < LARGO_MINIMO) return false;
  if (intervalos.length === 0) return false;
  const media = intervalos.reduce((a, b) => a + b, 0) / intervalos.length;
  return media <= UMBRAL_MS;
}

/** Manejador que una pantalla instala para quedarse con los escaneos. */
export type ManejadorEscaneo = (codigo: string) => void;

interface EscanerState {
  /** Manejadores instalados; manda el último, que es la pantalla visible. */
  pila: { id: number; manejar: ManejadorEscaneo }[];
  /** Último código leído por el lector de mano, para diagnóstico en la UI. */
  ultimo: string | null;
  /** ¿Se ha detectado alguna vez un lector de mano en esta sesión? */
  detectado: boolean;
}

export const useEscanerGlobal = create<EscanerState>(() => ({
  pila: [],
  ultimo: null,
  detectado: false,
}));

let siguienteId = 1;

/**
 * Instala un manejador de escaneos para la pantalla actual y lo retira al
 * salir. Manda el último instalado: si hay una pantalla de captura abierta,
 * los códigos van a ella y no a la acción por defecto.
 */
export function registrarManejador(manejar: ManejadorEscaneo): () => void {
  const id = siguienteId++;
  useEscanerGlobal.setState((s) => ({ pila: [...s.pila, { id, manejar }] }));
  return () => {
    useEscanerGlobal.setState((s) => ({ pila: s.pila.filter((m) => m.id !== id) }));
  };
}

/** ¿El foco está en algo donde la persona podría estar escribiendo? */
function focoEditable(): boolean {
  const activo = document.activeElement as HTMLElement | null;
  if (!activo) return false;
  if (activo.isContentEditable) return true;
  const etiqueta = activo.tagName;
  if (etiqueta === "TEXTAREA") return true;
  if (etiqueta === "SELECT") return true;
  if (etiqueta !== "INPUT") return false;
  const tipo = (activo as HTMLInputElement).type;
  // Los controles que no reciben texto (casillas, botones) no cuentan: ahí sí
  // hay que capturar la ráfaga.
  return !["checkbox", "radio", "button", "submit", "reset", "file", "range"].includes(tipo);
}

interface Rafaga {
  texto: string;
  primera: number;
  ultima: number;
  intervalos: number[];
}

/**
 * Arranca la escucha global. Devuelve la función para detenerla.
 *
 * Se llama una sola vez desde el layout de la aplicación: el estado vive en el
 * módulo, no en un componente, para que no se reinicie en cada render.
 */
export function escucharEscanerDeMano(alLeer: ManejadorEscaneo): () => void {
  let rafaga: Rafaga | null = null;
  let expiracion: number | undefined;

  function limpiar() {
    rafaga = null;
    if (expiracion) window.clearTimeout(expiracion);
  }

  function programarExpiracion() {
    if (expiracion) window.clearTimeout(expiracion);
    expiracion = window.setTimeout(limpiar, EXPIRA_MS);
  }

  function alPulsar(evento: KeyboardEvent) {
    // Un atajo con modificador nunca es un escaneo.
    if (evento.ctrlKey || evento.metaKey || evento.altKey) {
      limpiar();
      return;
    }
    // El foco manda: si alguien escribe en un campo, el lector escribe ahí.
    if (focoEditable()) {
      limpiar();
      return;
    }

    const ahora = performance.now();

    if (evento.key === "Enter") {
      const actual = rafaga;
      limpiar();
      if (!actual) return;
      if (!esRafagaDeMaquina(actual.intervalos, actual.texto.length)) return;

      evento.preventDefault();
      useEscanerGlobal.setState({ ultimo: actual.texto, detectado: true });
      alLeer(actual.texto);
      return;
    }

    // Solo caracteres imprimibles sueltos forman parte de un código.
    if (evento.key.length !== 1) {
      limpiar();
      return;
    }

    if (rafaga === null) {
      rafaga = { texto: evento.key, primera: ahora, ultima: ahora, intervalos: [] };
    } else {
      const intervalo = ahora - rafaga.ultima;
      if (intervalo > UMBRAL_MS) {
        // Demasiado lento: se descarta lo anterior y empieza de nuevo por si
        // esto era el principio de una ráfaga real.
        rafaga = { texto: evento.key, primera: ahora, ultima: ahora, intervalos: [] };
      } else {
        rafaga.texto += evento.key;
        rafaga.intervalos.push(intervalo);
        rafaga.ultima = ahora;
      }
    }
    // Las teclas de la ráfaga no llegan a la página: sin esto, un código
    // escaneado sobre una tabla dispararía sus atajos de teclado uno a uno.
    if (rafaga.texto.length >= 2) {
      evento.preventDefault();
    }
    programarExpiracion();
  }

  document.addEventListener("keydown", alPulsar, true);
  return () => {
    document.removeEventListener("keydown", alPulsar, true);
    limpiar();
  };
}

/** Entrega el código al manejador de la pantalla activa, si hay alguno. */
export function entregarADeLaPantalla(codigo: string): boolean {
  const { pila } = useEscanerGlobal.getState();
  const ultimo = pila.at(-1);
  if (!ultimo) return false;
  ultimo.manejar(codigo);
  return true;
}
