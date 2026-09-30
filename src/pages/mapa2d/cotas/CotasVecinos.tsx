import { formatearLongitud, type UnidadLongitud } from "../../mapa/unidades";
import type { Distancia } from "./distancias-vecinos";
import { TextoCota } from "./TextoCota";

const COLOR = "var(--color-blue-600)";

/** Distancia en unidades reales a los vecinos más cercanos durante el arrastre. */
export function CotasVecinos({
  distancias,
  escala,
  unidad,
}: {
  distancias: Distancia[];
  escala: number;
  unidad: UnidadLongitud;
}) {
  const tick = 4 * escala;
  return (
    <g pointerEvents="none" stroke={COLOR} strokeWidth={escala} fill="none">
      {distancias.map((d) => {
        const horizontal = d.lado === "izq" || d.lado === "der";
        const mx = (d.x1 + d.x2) / 2;
        const my = (d.y1 + d.y2) / 2;
        return (
          <g key={d.lado}>
            <path
              d={
                horizontal
                  ? `M ${d.x1} ${d.y1} H ${d.x2} M ${d.x1} ${d.y1 - tick} V ${d.y1 + tick} M ${d.x2} ${d.y2 - tick} V ${d.y2 + tick}`
                  : `M ${d.x1} ${d.y1} V ${d.y2} M ${d.x1 - tick} ${d.y1} H ${d.x1 + tick} M ${d.x2 - tick} ${d.y2} H ${d.x2 + tick}`
              }
            />
            <TextoCota
              escala={escala}
              color={COLOR}
              x={horizontal ? mx : mx - 6 * escala}
              y={horizontal ? my - 5 * escala : my}
              textAnchor={horizontal ? "middle" : "end"}
              dominantBaseline={horizontal ? undefined : "middle"}
            >
              {formatearLongitud(d.gap, unidad)}
            </TextoCota>
          </g>
        );
      })}
    </g>
  );
}
