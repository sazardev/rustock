/** Cinemática del caminante (pura): velocidad con aceleración y giro limitado. */
import {
  ACELERACION_CMS2,
  FACTOR_VELOCIDAD_AGACHADO,
  FRENADO_CMS2,
  LIMITE_CABECEO,
  VELOCIDAD_CAMINAR_CMS,
  VELOCIDAD_CORRER_CMS,
} from "./constantesCaminata";
import type { Punto } from "./colisionesCaminata";
import type { EjesMover, EntradaCaminata } from "./tiposCaminata";

export interface IntencionMovimiento extends EjesMover {
  correr: boolean;
  agachar: boolean;
}

/** Combina teclado, joystick táctil y mando en una sola intención. */
export function intencionDe(e: EntradaCaminata): IntencionMovimiento {
  const t = e.teclas;
  const tx = Number(t.derecha) - Number(t.izquierda);
  const ty = Number(t.adelante) - Number(t.atras);
  const x = tx + e.joystick.x + e.mando.x;
  const y = ty + e.joystick.y + e.mando.y;
  const largo = Math.hypot(x, y);
  const k = largo > 1 ? 1 / largo : 1;
  return {
    x: x * k,
    y: y * k,
    correr: t.correr || e.joystick.correr || e.mando.correr,
    agachar: t.agachar || e.mando.agachar,
  };
}

/** Velocidad objetivo en el plano (cm/s) según la intención y el giro. */
export function velocidadObjetivo(i: IntencionMovimiento, yaw: number): Punto {
  const tope =
    (i.correr ? VELOCIDAD_CORRER_CMS : VELOCIDAD_CAMINAR_CMS) *
    (i.agachar ? FACTOR_VELOCIDAD_AGACHADO : 1);
  const s = Math.sin(yaw);
  const c = Math.cos(yaw);
  // Adelante = (-sin, -cos); derecha = (cos, -sin).
  return { x: (-s * i.y + c * i.x) * tope, z: (-c * i.y - s * i.x) * tope };
}

/** Acerca `v` (se modifica) a `objetivo` sin pasar de la aceleración/frenado. */
export function acercarVelocidad(v: Punto, objetivo: Punto, dt: number): void {
  const dx = objetivo.x - v.x;
  const dz = objetivo.z - v.z;
  const falta = Math.hypot(dx, dz);
  if (falta < 1e-9) {
    return;
  }
  const frenando = Math.hypot(objetivo.x, objetivo.z) < 1e-6;
  const paso = (frenando ? FRENADO_CMS2 : ACELERACION_CMS2) * dt;
  if (falta <= paso) {
    v.x = objetivo.x;
    v.z = objetivo.z;
    return;
  }
  v.x += (dx / falta) * paso;
  v.z += (dz / falta) * paso;
}

export const limitarCabeceo = (pitch: number): number =>
  Math.min(Math.max(pitch, -LIMITE_CABECEO), LIMITE_CABECEO);
