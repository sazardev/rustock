import { useRef, type PointerEvent } from "react";
import { useT } from "../../../shared/i18n";
import type { EntradaCaminata } from "./tiposCaminata";

/** Radio útil del joystick (px) y umbral de empuje a partir del cual corres. */
const RADIO_PX = 48;
const UMBRAL_CORRER = 0.93;

/** Joystick virtual izquierdo: mueve; empujarlo a fondo corre. */
export function JoystickVirtual({ entrada }: { entrada: EntradaCaminata }) {
  const t = useT();
  const base = useRef<HTMLDivElement>(null);
  const palanca = useRef<HTMLDivElement>(null);
  const activo = useRef<number | null>(null);

  const mover = (ev: PointerEvent) => {
    const caja = base.current?.getBoundingClientRect();
    if (!caja || activo.current !== ev.pointerId) {
      return;
    }
    let dx = (ev.clientX - (caja.left + caja.width / 2)) / RADIO_PX;
    let dy = (ev.clientY - (caja.top + caja.height / 2)) / RADIO_PX;
    const largo = Math.hypot(dx, dy);
    if (largo > 1) {
      dx /= largo;
      dy /= largo;
    }
    entrada.joystick.x = dx;
    entrada.joystick.y = -dy;
    entrada.joystick.correr = Math.min(largo, 1) >= UMBRAL_CORRER;
    if (palanca.current) {
      palanca.current.style.transform = `translate(${dx * RADIO_PX}px, ${dy * RADIO_PX}px)`;
    }
  };
  const soltar = (ev: PointerEvent) => {
    if (activo.current !== ev.pointerId) {
      return;
    }
    activo.current = null;
    entrada.joystick.x = 0;
    entrada.joystick.y = 0;
    entrada.joystick.correr = false;
    if (palanca.current) {
      palanca.current.style.transform = "";
    }
  };

  return (
    <div
      ref={base}
      className="caminata__joystick"
      role="group"
      aria-label={t.mapa3d.joystickMover}
      onPointerDown={(ev) => {
        activo.current = ev.pointerId;
        ev.currentTarget.setPointerCapture(ev.pointerId);
        mover(ev);
      }}
      onPointerMove={mover}
      onPointerUp={soltar}
      onPointerCancel={soltar}
    >
      <div ref={palanca} className="caminata__joystick-palanca" />
    </div>
  );
}
