import { useEffect, useState } from "react";
import type { ObjetivoMirada } from "./consultaMirada";
import type { TelemetriaCaminata } from "./tiposCaminata";

export interface InstantaneaHud {
  objetivo: ObjetivoMirada | null;
  velocidadMs: number;
  agachado: boolean;
  corriendo: boolean;
  bloqueado: boolean;
}

const VACIA: InstantaneaHud = {
  objetivo: null,
  velocidadMs: 0,
  agachado: false,
  corriendo: false,
  bloqueado: false,
};

const clave = (o: ObjetivoMirada | null) =>
  o ? `${o.rackId}|${o.nivel}|${o.bahia}|${o.ocupacion}` : "";

/** Muestrea la telemetría ~8 veces por segundo; solo re-renderiza si cambia
 * algo visible (la velocidad se redondea al décimo). */
export function useTelemetriaHud(telemetria: TelemetriaCaminata): InstantaneaHud {
  const [snap, setSnap] = useState(VACIA);
  useEffect(() => {
    const id = window.setInterval(() => {
      const velocidadMs = Math.round(telemetria.velocidadCms / 10) / 10;
      setSnap((prev) =>
        prev.velocidadMs === velocidadMs &&
        prev.agachado === telemetria.agachado &&
        prev.corriendo === telemetria.corriendo &&
        prev.bloqueado === telemetria.bloqueado &&
        clave(prev.objetivo) === clave(telemetria.objetivo)
          ? prev
          : {
              objetivo: telemetria.objetivo,
              velocidadMs,
              agachado: telemetria.agachado,
              corriendo: telemetria.corriendo,
              bloqueado: telemetria.bloqueado,
            },
      );
    }, 120);
    return () => window.clearInterval(id);
  }, [telemetria]);
  return snap;
}
