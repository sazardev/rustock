import type { Dispositivo } from "../../../shared/dispositivo/detectar";
import type { NodoMapa } from "../../mapa-almacen-datos";
import type { PosicionXY } from "../tipos";
import { CabeceraCaminata } from "./CabeceraCaminata";
import { FundidoCaminata } from "./FundidoCaminata";
import { IndicadorMovimiento } from "./IndicadorMovimiento";
import { JoystickVirtual } from "./JoystickVirtual";
import { Minimapa } from "./Minimapa";
import { RotuloMirada } from "./RotuloMirada";
import type { EntradaCaminata, TelemetriaCaminata } from "./tiposCaminata";
import { useTelemetriaHud } from "./useTelemetriaHud";
import { ZonaMirar } from "./ZonaMirar";

export interface PropsHudCaminata {
  nodos: NodoMapa[];
  posicionBase: Map<string, PosicionXY>;
  entrada: EntradaCaminata;
  telemetria: TelemetriaCaminata;
  sensibilidad: number;
  /** Tipo de dispositivo (`data-dispositivo`): el táctil muestra joysticks. */
  dispositivo: Dispositivo;
  /** Se está volviendo a la cámara previa. */
  saliendo: boolean;
  onSalir: () => void;
}

/** HUD en línea sobre el lienzo: cabecera (salir + teclas) y minimapa en la
 * esquina, mirilla, rótulo de lo que se mira, indicador de velocidad y
 * controles táctiles. Nada captura el puntero salvo el botón de salir, el
 * joystick y la zona de mirar. */
export function HudCaminata(p: PropsHudCaminata) {
  const snap = useTelemetriaHud(p.telemetria);
  return (
    <div className="caminata">
      <FundidoCaminata saliendo={p.saliendo} />
      <div className="caminata__mirilla" aria-hidden="true" />
      <div className="caminata__esquina">
        <CabeceraCaminata
          teclas={p.dispositivo === "escritorio"}
          bloqueado={snap.bloqueado}
          onSalir={p.onSalir}
        />
        <Minimapa nodos={p.nodos} posicionBase={p.posicionBase} telemetria={p.telemetria} />
      </div>
      <RotuloMirada objetivo={snap.objetivo} />
      <IndicadorMovimiento snap={snap} />
      {p.dispositivo === "tactil" ? (
        <>
          <ZonaMirar entrada={p.entrada} sensibilidad={p.sensibilidad} />
          <JoystickVirtual entrada={p.entrada} />
        </>
      ) : null}
    </div>
  );
}
