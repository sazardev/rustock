/** Utilidad de verificación: `window.rustock3dCaminata()` devuelve el estado
 * del caminante. Solo existe en desarrollo o con VITE_SINTETICO=1. */
import { SINTETICO_PERMITIDO } from "../sintetico";
import type { EscenarioColision } from "./colisionesCaminata";
import type { EntradaCaminata, TelemetriaCaminata } from "./tiposCaminata";

const grados = (r: number) => (r * 180) / Math.PI;

interface UtilidadCaminata {
  (): {
    activa: boolean;
    x: number;
    y: number;
    z: number;
    yaw: number;
    pitch: number;
    alturaOjosCm: number;
    velocidad: number;
  };
  /** Obstáculos y límites que usa la colisión (cm), para verificar contra ellos. */
  escenario: () => { cuerpos: readonly unknown[]; limites: unknown } | null;
  /** Acepta giro de ratón sin Pointer Lock (para pruebas headless). */
  sinBloqueo: (valor: boolean) => void;
}

let escenarioActual: EscenarioColision | null = null;

/** El controlador publica aquí el escenario vigente (solo para pruebas). */
export function publicarEscenario(e: EscenarioColision | null): void {
  escenarioActual = SINTETICO_PERMITIDO ? e : null;
}

/** Instala la utilidad; devuelve la función que la retira. x/z son el plano
 * (cm), y la altura de los ojos (cm); yaw/pitch en grados. */
export function instalarUtilidadPruebas(
  telemetria: TelemetriaCaminata,
  entrada: EntradaCaminata,
): () => void {
  if (!SINTETICO_PERMITIDO) {
    return () => undefined;
  }
  const util: UtilidadCaminata = Object.assign(
    () => ({
      activa: telemetria.activa,
      x: telemetria.xCm,
      y: telemetria.alturaOjosCm,
      z: telemetria.zCm,
      yaw: grados(telemetria.yaw),
      pitch: grados(telemetria.pitch),
      alturaOjosCm: telemetria.alturaOjosCm,
      velocidad: telemetria.velocidadCms,
    }),
    {
      escenario: () =>
        escenarioActual
          ? { cuerpos: escenarioActual.indice.cuerpos, limites: escenarioActual.limites }
          : null,
      sinBloqueo: (valor: boolean) => {
        entrada.sinBloqueo = valor;
      },
    },
  );
  const w = window as unknown as { rustock3dCaminata?: UtilidadCaminata };
  w.rustock3dCaminata = util;
  return () => {
    delete w.rustock3dCaminata;
  };
}
