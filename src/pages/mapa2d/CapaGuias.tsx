import type { Guia } from "../mapa/motor";

/** Guías de alineación con los vecinos durante el arrastre (Alt las desactiva). */
export function CapaGuias({ guias, escala }: { guias: Guia[]; escala: number }) {
  return (
    <g
      pointerEvents="none"
      stroke="var(--color-blue-500)"
      strokeWidth={escala}
      strokeDasharray={`${4 * escala} ${3 * escala}`}
    >
      {guias.map((g) =>
        g.eje === "x" ? (
          <line
            key={`${g.eje}-${g.valor}-${g.desde}`}
            x1={g.valor}
            x2={g.valor}
            y1={g.desde}
            y2={g.hasta}
          />
        ) : (
          <line
            key={`${g.eje}-${g.valor}-${g.desde}`}
            x1={g.desde}
            x2={g.hasta}
            y1={g.valor}
            y2={g.valor}
          />
        ),
      )}
    </g>
  );
}
