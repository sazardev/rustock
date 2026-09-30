/** Gamepad API: stick izquierdo mueve, derecho mira, gatillo o stick pulsado
 * corre, A/Cruz agacha y B/Círculo sale. Se consulta en cada fotograma. */
import { VELOCIDAD_MIRAR_MANDO, ZONA_MUERTA } from "./constantesCaminata";
import type { EntradaCaminata } from "./tiposCaminata";

/** Botones del mapeo estándar. */
const BOTON_A = 0;
const BOTON_B = 1;
const GATILLO_IZQ = 6;
const GATILLO_DER = 7;
const STICK_IZQ = 10;

function sinZonaMuerta(v: number): number {
  const a = Math.abs(v);
  if (a < ZONA_MUERTA) {
    return 0;
  }
  return Math.sign(v) * ((a - ZONA_MUERTA) / (1 - ZONA_MUERTA));
}

/** Vuelca el primer mando conectado en la entrada. `dt` convierte el stick
 * derecho (velocidad angular) en giro pendiente. */
export function leerMando(entrada: EntradaCaminata, dt: number): void {
  const mando = navigator.getGamepads?.().find((g) => g?.connected);
  if (!mando) {
    entrada.mando.x = 0;
    entrada.mando.y = 0;
    entrada.mando.correr = false;
    entrada.mando.agachar = false;
    return;
  }
  const eje = (i: number) => sinZonaMuerta(mando.axes[i] ?? 0);
  const pulsado = (i: number) => mando.buttons[i]?.pressed ?? false;
  entrada.mando.x = eje(0);
  entrada.mando.y = -eje(1);
  entrada.mando.correr = pulsado(GATILLO_IZQ) || pulsado(GATILLO_DER) || pulsado(STICK_IZQ);
  entrada.mando.agachar = pulsado(BOTON_A);
  entrada.mirada.yaw -= eje(2) * VELOCIDAD_MIRAR_MANDO * dt;
  entrada.mirada.pitch -= eje(3) * VELOCIDAD_MIRAR_MANDO * dt;
  if (pulsado(BOTON_B)) {
    entrada.salir = true;
  }
}
