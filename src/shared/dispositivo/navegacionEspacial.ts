/** Navegación con D-pad para televisores: las flechas mueven el foco al
 * elemento enfocable más cercano en esa dirección, igual que un mando remoto
 * espera. Sin esto, en una TV solo funciona Tab, que no existe en el mando. */

type Direccion = "arriba" | "abajo" | "izquierda" | "derecha";

const DIRECCION_DE_TECLA: Record<string, Direccion> = {
  ArrowUp: "arriba",
  ArrowDown: "abajo",
  ArrowLeft: "izquierda",
  ArrowRight: "derecha",
};

const ENFOCABLES = [
  "a[href]",
  "button:not([disabled])",
  "input:not([disabled]):not([type=hidden])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  "[tabindex]:not([tabindex='-1'])",
].join(",");

// Controles que ya interpretan las flechas por su cuenta: no se les disputa.
const CONTROLES_CON_FLECHAS =
  "input:not([type=checkbox]):not([type=radio]):not([type=button]):not([type=submit]),textarea,select,[contenteditable=true],[role=listbox],[role=combobox],[role=grid],[role=menu],[role=slider],[data-sin-navegacion-espacial]";

// Penaliza el desvío lateral: un elemento alineado gana a uno más cercano
// pero en diagonal, que es lo que el ojo espera al recorrer una rejilla.
const PESO_DESVIO = 2;

interface Candidato {
  elemento: HTMLElement;
  caja: DOMRect;
}

function esVisible(caja: DOMRect, elemento: HTMLElement): boolean {
  return (
    caja.width > 0 &&
    caja.height > 0 &&
    window.getComputedStyle(elemento).visibility !== "hidden" &&
    elemento.closest("[inert],[aria-hidden=true]") === null
  );
}

function centro(caja: DOMRect): { x: number; y: number } {
  return { x: caja.left + caja.width / 2, y: caja.top + caja.height / 2 };
}

function puntuar(origen: DOMRect, destino: DOMRect, direccion: Direccion): number | null {
  const a = centro(origen);
  const b = centro(destino);
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const vertical = direccion === "arriba" || direccion === "abajo";
  const avance = vertical ? dy : dx;
  const desvio = vertical ? Math.abs(dx) : Math.abs(dy);
  const sentido = direccion === "abajo" || direccion === "derecha" ? 1 : -1;
  if (avance * sentido <= 0) {
    return null;
  }
  return Math.abs(avance) + desvio * PESO_DESVIO;
}

// Zonas del shell. El foco se queda en la suya mientras haya algo en esa
// dirección y solo cruza a otra zona cuando la actual se agota: así `abajo`
// desde un botón de la página recorre la página en vez de saltar al menú.
const REGIONES = ".app-shell__sidebar,.app-shell__topbar,#contenido";

// El enlace de salto es para teclado: con D-pad sería un destino invisible.
const EXCLUIDOS = ".skip-link";

function candidatosVisibles(actual: HTMLElement): Candidato[] {
  const resultado: Candidato[] = [];
  for (const elemento of document.querySelectorAll<HTMLElement>(ENFOCABLES)) {
    if (elemento === actual || elemento.matches(EXCLUIDOS)) {
      continue;
    }
    const caja = elemento.getBoundingClientRect();
    if (esVisible(caja, elemento)) {
      resultado.push({ elemento, caja });
    }
  }
  return resultado;
}

function mejorDe(
  candidatos: Candidato[],
  origen: DOMRect,
  direccion: Direccion,
): HTMLElement | null {
  let mejor: HTMLElement | null = null;
  let mejorPuntaje = Number.POSITIVE_INFINITY;
  for (const { elemento, caja } of candidatos) {
    const puntaje = puntuar(origen, caja, direccion);
    if (puntaje !== null && puntaje < mejorPuntaje) {
      mejor = elemento;
      mejorPuntaje = puntaje;
    }
  }
  return mejor;
}

function masCercano(actual: HTMLElement, direccion: Direccion): HTMLElement | null {
  const origen = actual.getBoundingClientRect();
  const candidatos = candidatosVisibles(actual);
  const region = actual.closest(REGIONES);
  const propios = region
    ? candidatos.filter(({ elemento }) => elemento.closest(REGIONES) === region)
    : candidatos;
  return mejorDe(propios, origen, direccion) ?? mejorDe(candidatos, origen, direccion);
}

function direccionDe(evento: KeyboardEvent): Direccion | null {
  const conModificador = evento.altKey || evento.ctrlKey || evento.metaKey || evento.shiftKey;
  if (evento.defaultPrevented || conModificador) {
    return null;
  }
  return DIRECCION_DE_TECLA[evento.key] ?? null;
}

function seReservaLasFlechas(elemento: HTMLElement): boolean {
  return (
    elemento.matches(CONTROLES_CON_FLECHAS) || elemento.closest(CONTROLES_CON_FLECHAS) !== null
  );
}

function moverDesde(actual: HTMLElement, direccion: Direccion, evento: KeyboardEvent): void {
  const destino = masCercano(actual, direccion);
  if (!destino) {
    return;
  }
  evento.preventDefault();
  destino.focus({ preventScroll: true });
  destino.scrollIntoView({ block: "nearest", inline: "nearest" });
}

/** Sin foco previo la primera flecha aterriza en el primer elemento útil del
 * contenido. Cada selector se prefija por separado: prefijar la lista entera
 * solo acotaría el primero, porque la coma corta el selector. */
function enfocarPrimero(evento: KeyboardEvent): void {
  const enContenido = ENFOCABLES.split(",")
    .map((selector) => `#contenido ${selector}`)
    .join(",");
  const primero = [...document.querySelectorAll<HTMLElement>(enContenido)].find((elemento) =>
    esVisible(elemento.getBoundingClientRect(), elemento),
  );
  if (!primero) {
    return;
  }
  evento.preventDefault();
  primero.focus();
}

function alPulsar(evento: KeyboardEvent): void {
  const direccion = direccionDe(evento);
  if (!direccion) {
    return;
  }
  const actual = document.activeElement;
  if (!(actual instanceof HTMLElement) || actual === document.body) {
    enfocarPrimero(evento);
  } else if (!seReservaLasFlechas(actual)) {
    moverDesde(actual, direccion, evento);
  }
}

/** Activa la navegación espacial; devuelve la función que la desactiva. */
export function activarNavegacionEspacial(): () => void {
  document.addEventListener("keydown", alPulsar);
  return () => document.removeEventListener("keydown", alPulsar);
}
