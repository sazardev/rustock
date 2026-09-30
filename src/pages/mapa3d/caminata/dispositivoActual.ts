import { DISPOSITIVOS, type Dispositivo } from "../../../shared/dispositivo/detectar";

/** Dispositivo que `shared/dispositivo` dejó en `<html data-dispositivo>`. */
export function dispositivoActual(): Dispositivo {
  const valor = document.documentElement.dataset.dispositivo;
  return DISPOSITIVOS.find((d) => d === valor) ?? "escritorio";
}
