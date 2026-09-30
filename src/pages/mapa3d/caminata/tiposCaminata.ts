import type { ObjetivoMirada } from "./consultaMirada";

/** Eje de movimiento: x a la derecha, y hacia adelante, ambos de -1 a 1. */
export interface EjesMover {
  x: number;
  y: number;
}

export interface TeclasCaminata {
  adelante: boolean;
  atras: boolean;
  izquierda: boolean;
  derecha: boolean;
  correr: boolean;
  agachar: boolean;
}

/** Entrada viva: cada fuente (teclado, joystick, mando, ratón) escribe su
 * parte y el bucle de fotograma lo combina. Es mutable a propósito: nada de
 * esto debe provocar un render de React. */
export interface EntradaCaminata {
  teclas: TeclasCaminata;
  joystick: EjesMover & { correr: boolean };
  mando: EjesMover & { correr: boolean; agachar: boolean };
  /** Giro pendiente (rad), se consume en cada fotograma. */
  mirada: { yaw: number; pitch: number };
  /** Petición de salir (Esc, botón B, soltar el puntero). */
  salir: boolean;
  /** Prueba: acepta giro de ratón sin Pointer Lock (solo DEV). */
  sinBloqueo: boolean;
}

/** Lo que el bucle publica para el HUD y la utilidad de pruebas. */
export interface TelemetriaCaminata {
  activa: boolean;
  /** Posición en el plano (cm). */
  xCm: number;
  zCm: number;
  yaw: number;
  pitch: number;
  alturaOjosCm: number;
  velocidadCms: number;
  agachado: boolean;
  corriendo: boolean;
  bloqueado: boolean;
  objetivo: ObjetivoMirada | null;
}

export function crearEntrada(): EntradaCaminata {
  return {
    teclas: {
      adelante: false,
      atras: false,
      izquierda: false,
      derecha: false,
      correr: false,
      agachar: false,
    },
    joystick: { x: 0, y: 0, correr: false },
    mando: { x: 0, y: 0, correr: false, agachar: false },
    mirada: { yaw: 0, pitch: 0 },
    salir: false,
    sinBloqueo: false,
  };
}

export function crearTelemetria(): TelemetriaCaminata {
  return {
    activa: false,
    xCm: 0,
    zCm: 0,
    yaw: 0,
    pitch: 0,
    alturaOjosCm: 0,
    velocidadCms: 0,
    agachado: false,
    corriendo: false,
    bloqueado: false,
    objetivo: null,
  };
}

/** Lo que la página entrega a la escena para caminar (sin los datos del mapa). */
export interface PropsEscenaCaminata {
  entrada: EntradaCaminata;
  telemetria: TelemetriaCaminata;
  alturaPersonaCm: number;
  /** Multiplicador de sensibilidad de la mirada (1 = base). */
  sensibilidad: number;
  /** Captura el ratón con Pointer Lock (solo escritorio). */
  conBloqueo: boolean;
  onSaliendo: () => void;
  onSalio: () => void;
}
