import { useT } from "../../../shared/i18n";
import { Link } from "../../../shared/ui";
import { catalogoDetalle } from "../../../app/route-paths";
import { formatearLongitud, type UnidadLongitud } from "../../mapa/unidades";
import { colorOcupacion } from "../nodo-color";
import { TextoCota } from "../cotas/TextoCota";
import type { CeldaAlzado, Alzado } from "./geometria-alzado";

function textoOcupacion(c: CeldaAlzado): string {
  if (c.ocupacion !== null) {
    return `${Math.round(c.ocupacion * 100)}%`;
  }
  return c.cantidad > 0 ? `${c.cantidad} u.` : "—";
}

/** Vista frontal a escala de un rack: niveles, bahías y celdas por ocupación.
 * Cada celda es un enlace a su ubicación (DESIGN §5.5). */
export function AlzadoRack({ alzado, unidad }: { alzado: Alzado; unidad: UnidadLongitud }) {
  const t = useT();
  const f = alzado.fuente;
  const { ancho, altura, medidas } = alzado;
  const grosor = f * 0.22;
  return (
    <svg
      className="alzado"
      viewBox={`${-f * 0.6} ${-f * 1.2} ${ancho + f * 6.6} ${altura + f * 4.8}`}
      role="group"
      aria-label={t.lienzo2D.alzadoAria}
    >
      <rect
        x={0}
        y={altura - medidas.altoBase}
        width={ancho}
        height={medidas.altoBase}
        fill="var(--color-gray-200)"
      />
      {alzado.celdas.map((c) => {
        const mostrarTexto = c.ancho >= f * 4.2 && c.alto >= f * 2.4;
        const solo = c.ancho >= f * 2.4 && c.alto >= f * 1.4;
        const pct = textoOcupacion(c);
        const aria = t.lienzo2D.celdaTooltip({
          codigo: c.codigo,
          nivel: c.nivel,
          bahia: c.bahia,
          pct: c.ocupacion === null ? null : Math.round(c.ocupacion * 100),
          cantidad: c.cantidad,
        });
        return (
          <Link
            key={c.ubicacionId}
            href={catalogoDetalle("ubicaciones", c.ubicacionId)}
            className="alzado__celda"
            ariaLabel={aria}
          >
            <title>{aria}</title>
            <rect
              x={c.x + grosor / 2}
              y={c.y + grosor / 2}
              width={Math.max(c.ancho - grosor, 0)}
              height={Math.max(c.alto - grosor, 0)}
              rx={f * 0.15}
              fill={`var(${colorOcupacion(c.ocupacion)})`}
              fillOpacity={0.85}
            />
            {mostrarTexto ? (
              <>
                <text
                  x={c.x + c.ancho / 2}
                  y={c.y + c.alto / 2 - f * 0.25}
                  fontSize={f * 0.85}
                  textAnchor="middle"
                  dominantBaseline="central"
                  fill="var(--color-gray-900)"
                >
                  {c.codigo}
                </text>
                <text
                  x={c.x + c.ancho / 2}
                  y={c.y + c.alto / 2 + f * 0.75}
                  fontSize={f * 0.85}
                  fontWeight={700}
                  textAnchor="middle"
                  dominantBaseline="central"
                  fill="var(--color-gray-900)"
                >
                  {pct}
                </text>
              </>
            ) : solo ? (
              <text
                x={c.x + c.ancho / 2}
                y={c.y + c.alto / 2}
                fontSize={f * 0.85}
                fontWeight={700}
                textAnchor="middle"
                dominantBaseline="central"
                fill="var(--color-gray-900)"
              >
                {pct}
              </text>
            ) : null}
          </Link>
        );
      })}
      <g
        stroke="var(--color-gray-600)"
        strokeWidth={grosor}
        strokeLinecap="square"
        pointerEvents="none"
      >
        {alzado.vigas.map((y) => (
          <line key={y} x1={0} x2={ancho} y1={y} y2={y} />
        ))}
        <line x1={0} x2={ancho} y1={0} y2={0} />
        <line x1={0} x2={0} y1={0} y2={altura} />
        <line x1={ancho} x2={ancho} y1={0} y2={altura} />
        <line x1={-f * 0.4} x2={ancho + f * 0.4} y1={altura} y2={altura} />
      </g>
      <g pointerEvents="none" stroke="var(--color-gray-700)" strokeWidth={f * 0.06} fill="none">
        <path
          d={`M 0 ${altura + f * 1.2} H ${ancho} M 0 ${altura + f * 0.9} V ${altura + f * 1.5} M ${ancho} ${altura + f * 0.9} V ${altura + f * 1.5}`}
        />
        <path
          d={`M ${ancho + f * 1.2} 0 V ${altura} M ${ancho + f * 0.9} 0 H ${ancho + f * 1.5} M ${ancho + f * 0.9} ${altura} H ${ancho + f * 1.5}`}
        />
        <TextoCota escala={f / 11} color="var(--color-gray-700)" x={ancho / 2} y={altura + f * 2.6}>
          {formatearLongitud(ancho, unidad)}
        </TextoCota>
        <TextoCota
          escala={f / 11}
          color="var(--color-gray-700)"
          x={ancho + f * 1.9}
          y={altura / 2}
          textAnchor="start"
          dominantBaseline="middle"
        >
          {formatearLongitud(altura, unidad)}
        </TextoCota>
      </g>
    </svg>
  );
}
