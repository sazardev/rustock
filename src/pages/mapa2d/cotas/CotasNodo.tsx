import { formatearLongitud, type UnidadLongitud } from "../../mapa/unidades";
import type { RectMapa } from "../../mapa/motor";
import { TextoCota } from "./TextoCota";

/** Medidas "ancho × fondo" en unidades reales, bajo el nodo y alineadas a su
 * borde derecho: el centro y los lados quedan libres para las distancias a
 * los vecinos y el motivo de colocación. */
export function CotasNodo({
  rect,
  escala,
  unidad,
}: {
  rect: RectMapa;
  escala: number;
  unidad: UnidadLongitud;
}) {
  return (
    <TextoCota
      escala={escala}
      color="var(--color-gray-800)"
      x={rect.x + rect.ancho}
      y={rect.y + rect.profundo + 15 * escala}
      textAnchor="end"
    >
      {`${formatearLongitud(rect.ancho, unidad)} × ${formatearLongitud(rect.profundo, unidad)}`}
    </TextoCota>
  );
}
