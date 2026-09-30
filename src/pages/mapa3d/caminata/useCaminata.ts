import { useCallback, useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { obtenerConfiguracionEmpresa } from "../../../shared/backend";
import { ALTURA_PERSONA_CM } from "../../mapa/reglas";
import type { ControlsRef } from "../tipos";
import { pedirBloqueo } from "./bloqueoRaton";
import { dispositivoActual } from "./dispositivoActual";
import { crearEntrada, crearTelemetria } from "./tiposCaminata";
import { instalarUtilidadPruebas } from "./utilidadPruebas";

/** Estado de la caminata a nivel de página: activar/salir, la entrada y la
 * telemetría compartidas entre el bucle (Canvas) y el HUD (DOM), y la altura
 * de la persona desde la configuración de empresa. */
export function useCaminata(sensibilidad: number, controlsRef: ControlsRef) {
  const [activa, setActiva] = useState(false);
  const [saliendo, setSaliendo] = useState(false);
  const entrada = useMemo(crearEntrada, []);
  const telemetria = useMemo(crearTelemetria, []);
  const dispositivo = activa ? dispositivoActual() : "escritorio";

  const { data: config } = useQuery({
    queryKey: ["configuracion-empresa"],
    queryFn: obtenerConfiguracionEmpresa,
    retry: false,
    staleTime: 5 * 60_000,
  });
  const alturaPersonaCm =
    config?.altura_persona_cm && config.altura_persona_cm > 0
      ? config.altura_persona_cm
      : ALTURA_PERSONA_CM;

  useEffect(() => instalarUtilidadPruebas(telemetria, entrada), [telemetria, entrada]);

  const alternar = useCallback(() => {
    if (!controlsRef.current) {
      return;
    }
    if (activa) {
      entrada.salir = true;
      return;
    }
    entrada.salir = false;
    setSaliendo(false);
    setActiva(true);
    // El clic del botón (o la tecla) es el gesto que permite capturar el ratón.
    if (dispositivoActual() === "escritorio") {
      pedirBloqueo(document.querySelector(".mapa3d-full__lienzo canvas"));
    }
  }, [activa, controlsRef, entrada]);

  const alEmpezarSalida = useCallback(() => setSaliendo(true), []);
  const alSalir = useCallback(() => {
    setActiva(false);
    setSaliendo(false);
  }, []);

  return {
    activa,
    alternar,
    escena: {
      entrada,
      telemetria,
      alturaPersonaCm,
      sensibilidad: Math.min(3, Math.max(0.2, sensibilidad || 1)),
      conBloqueo: dispositivo === "escritorio",
      onSaliendo: alEmpezarSalida,
      onSalio: alSalir,
    },
    hud: {
      entrada,
      telemetria,
      sensibilidad: Math.min(3, Math.max(0.2, sensibilidad || 1)),
      dispositivo,
      saliendo,
    },
  };
}
