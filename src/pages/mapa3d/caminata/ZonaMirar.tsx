import { useRef } from "react";
import { useT } from "../../../shared/i18n";
import { FACTOR_MIRAR_TACTIL, RAD_POR_PIXEL } from "./constantesCaminata";
import type { EntradaCaminata } from "./tiposCaminata";

/** Mitad derecha de la pantalla: arrastrar con el dedo gira la mirada. */
export function ZonaMirar({
  entrada,
  sensibilidad,
}: {
  entrada: EntradaCaminata;
  sensibilidad: number;
}) {
  const t = useT();
  const ultimo = useRef<{ id: number; x: number; y: number } | null>(null);
  return (
    <div
      className="caminata__zona-mirar"
      role="group"
      aria-label={t.mapa3d.zonaMirar}
      onPointerDown={(ev) => {
        ultimo.current = { id: ev.pointerId, x: ev.clientX, y: ev.clientY };
        ev.currentTarget.setPointerCapture(ev.pointerId);
      }}
      onPointerMove={(ev) => {
        const u = ultimo.current;
        if (!u || u.id !== ev.pointerId) {
          return;
        }
        const k = RAD_POR_PIXEL * FACTOR_MIRAR_TACTIL * sensibilidad;
        entrada.mirada.yaw -= (ev.clientX - u.x) * k;
        entrada.mirada.pitch -= (ev.clientY - u.y) * k;
        u.x = ev.clientX;
        u.y = ev.clientY;
      }}
      onPointerUp={() => (ultimo.current = null)}
      onPointerCancel={() => (ultimo.current = null)}
    />
  );
}
