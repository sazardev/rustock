import { clasificarDispositivo, type Dispositivo } from "./detectar";
import { leerSenales } from "./leerEntorno";
import { activarNavegacionEspacial } from "./navegacionEspacial";

let desactivarNavegacion: (() => void) | null = null;

function aplicar(dispositivo: Dispositivo): void {
  document.documentElement.dataset.dispositivo = dispositivo;
  if (dispositivo === "tv" && !desactivarNavegacion) {
    desactivarNavegacion = activarNavegacionEspacial();
  } else if (dispositivo !== "tv" && desactivarNavegacion) {
    desactivarNavegacion();
    desactivarNavegacion = null;
  }
}

/** Marca `<html data-dispositivo>` para que el CSS escale la interfaz (ver
 * `styles/tv.css`) y activa el D-pad en TV. Se llama antes de montar React
 * para que el primer pintado ya salga con la escala correcta. */
export function iniciarDispositivo(): void {
  aplicar(clasificarDispositivo(leerSenales()));
  // Un televisor puede conectar ratón o teclado después de arrancar.
  for (const consulta of ["(pointer: coarse)", "(pointer: none)", "(hover: none)"]) {
    window.matchMedia(consulta).addEventListener("change", () => {
      aplicar(clasificarDispositivo(leerSenales()));
    });
  }
}
