import type { PointerEvent } from "react";
import type { Esquina } from "./tipos";

/** Lado del tirador en píxeles de pantalla; mayor con puntero táctil. */
const LADO_PX = 12;
const LADO_PX_TACTIL = 22;
const esTactil = () => window.matchMedia("(pointer: coarse)").matches;

/** Tirador de redimensionado en una esquina del nodo seleccionado. */
export function Tirador({
  esquina,
  ancho,
  profundo,
  escala,
  onPointerDown,
}: {
  esquina: Esquina;
  ancho: number;
  profundo: number;
  /** Unidades de SVG por píxel: el tirador mide lo mismo con cualquier zoom. */
  escala: number;
  onPointerDown: (e: PointerEvent<SVGRectElement>, esquina: Esquina) => void;
}) {
  const lado = (esTactil() ? LADO_PX_TACTIL : LADO_PX) * escala;
  const x = esquina.includes("w") ? -lado / 2 : ancho - lado / 2;
  const y = esquina.includes("n") ? -lado / 2 : profundo - lado / 2;
  return (
    <rect
      className={`mapa-tirador mapa-tirador--${esquina}`}
      x={x}
      y={y}
      width={lado}
      height={lado}
      rx={2 * escala}
      aria-hidden="true"
      onPointerDown={(e) => onPointerDown(e, esquina)}
    />
  );
}
