import type { RectMapa, Resultado } from "../mapa/motor";
import { colorColocacion } from "./trazo";

/** Motivo del semáforo de colocación como texto junto al nodo en edición.
 * `escala` = unidades de SVG por píxel, para que el texto mida lo mismo en
 * pantalla con cualquier zoom. */
export function EtiquetaMotivo({
  rect,
  resultado,
  escala,
}: {
  rect: RectMapa;
  resultado: Resultado;
  escala: number;
}) {
  if (!resultado.motivo) {
    return null;
  }
  return (
    <text
      x={rect.x}
      y={rect.y - 8 * escala}
      fontSize={13 * escala}
      fontWeight={600}
      fill={colorColocacion(resultado.estado)}
      stroke="var(--color-gray-50)"
      strokeWidth={3 * escala}
      paintOrder="stroke"
      pointerEvents="none"
    >
      {resultado.motivo}
    </text>
  );
}
