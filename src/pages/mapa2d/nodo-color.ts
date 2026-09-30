/** Colores de los nodos del mapa (solo nombres de tokens CSS). */
import type { NodoMapa, TipoNodo } from "./nodo-tipos";

/** Devuelve el nombre de la variable CSS (sin `var()`) — el llamador decide
 * cómo consumirla: el SVG del mapa 2D la usa directamente como `var(--x)`
 * (hereda el tema activo del DOM); el mapa 3D no puede — WebGL/three.js no
 * resuelve custom properties de CSS — así que usa `resolverColorCss` abajo
 * para obtener el valor real calculado antes de pasarlo a un material. */
export function colorOcupacion(ocupacion: number | null): string {
  if (ocupacion === null) {
    return "--color-gray-100";
  }
  if (ocupacion <= 0) {
    return "--color-gray-100";
  }
  if (ocupacion < 0.7) {
    return "--color-success-500";
  }
  if (ocupacion < 1) {
    return "--color-warning-500";
  }
  return "--color-danger-500";
}

/** Color de categoría por tipo (DESIGN §3.1, solo tokens): las zonas son la
 * plataforma neutra, los pasillos el canal de tránsito (ámbar suave: se
 * distingue del piso y de la zona) y los racks la estructura cálida de
 * almacenamiento. Las ubicaciones no lo usan: su color comunica ocupación
 * (verde/ámbar/rojo), que es estado, no categoría. */
export const COLOR_NODO: Record<TipoNodo, string> = {
  zona: "--color-gray-100",
  pasillo: "--color-warning-bg",
  rack: "--color-blue-100",
  ubicacion: "--color-gray-100",
};

/** Relleno efectivo de un nodo: ocupación para ubicaciones, categoría para
 * el resto. Compartido por el mapa 2D y el 3D para que se vean igual. */
export function colorRellenoNodo(n: Pick<NodoMapa, "tipo" | "ocupacion">): string {
  return n.tipo === "ubicacion" ? colorOcupacion(n.ocupacion) : COLOR_NODO[n.tipo];
}

/** Relleno del nodo según el modo de color compartido con el 3D: "ocupacion"
 * pinta por ocupación a los nodos que la tienen; el resto de modos necesita
 * datos de producto que el plano no carga y cae al color por tipo. */
export function colorRellenoSegunModo(
  n: Pick<NodoMapa, "tipo" | "ocupacion">,
  modo: string,
): string {
  return modo === "ocupacion" && n.ocupacion !== null
    ? colorOcupacion(n.ocupacion)
    : colorRellenoNodo(n);
}

/** Resuelve una variable CSS (ej. `--color-success-500`) a su valor real
 * calculado en el DOM (hex/rgb) — necesario para el mapa 3D, ya que los
 * materiales de three.js no entienden `var(--x)`. */
export function resolverColorCss(variable: string): string {
  if (typeof document === "undefined") {
    // Fallback SSR: token real en CSS es --color-gray-400 (#AAA096), cercano a #9a9a9a.
    return "var(--color-gray-400)";
  }
  const valor = getComputedStyle(document.documentElement).getPropertyValue(variable).trim();
  // Fallback si el token no existe (p. ej. SSR inicial): usa el gris del tema.
  return valor || "var(--color-gray-400)";
}
