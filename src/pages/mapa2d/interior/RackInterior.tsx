import { memo } from "react";
import { useT } from "../../../shared/i18n";
import type { CeldaRack } from "../../mapa/celdas/derivarCeldasRack";
import type { InfoCelda } from "../../mapa/celdas/infoCeldas";
import { colorOcupacion } from "../nodo-color";
import type { DetalleInterior } from "./detalle-interior";

interface Props {
  celdas: CeldaRack[];
  info: Map<string, InfoCelda>;
  ancho: number;
  profundo: number;
  niveles: number;
  detalle: DetalleInterior;
  /** Unidades de SVG por píxel (solo cambia de valor al cambiar de detalle
   * visible: el memo evita redibujar cientos de celdas al desplazar). */
  escala: number;
}

/** Estructura interior del rack vista en planta: columnas = bahías, franjas
 * = niveles (arriba el más alto), coloreadas por la ocupación de cada celda. */
export const RackInterior = memo(function RackInterior(p: Props) {
  const t = useT();
  if (p.detalle === 0 || p.celdas.length === 0) {
    return null;
  }
  const filas = Math.max(p.niveles, ...p.celdas.map((c) => c.nivel));
  const altoFila = p.profundo / filas;
  const maxBahias = Math.max(...p.celdas.map((c) => c.nBahias));
  if (p.detalle === 1) {
    return (
      <g pointerEvents="none" stroke="var(--border-color-strong)" strokeWidth={1}>
        {Array.from({ length: maxBahias - 1 }, (_, i) => {
          const x = ((i + 1) * p.ancho) / maxBahias;
          return (
            <line key={x} x1={x} x2={x} y1={0} y2={p.profundo} vectorEffect="non-scaling-stroke" />
          );
        })}
      </g>
    );
  }
  return (
    <g>
      {p.celdas.map((c) => {
        const x = ((c.bahia - 1) * p.ancho) / c.nBahias;
        const w = p.ancho / c.nBahias;
        const y = (filas - c.nivel) * altoFila;
        const i = p.info.get(c.ubicacionId);
        const pct = i && i.ocupacion !== null ? Math.round(i.ocupacion * 100) : null;
        const anchoPx = w / p.escala;
        const rotulo =
          p.detalle === 3 ? (anchoPx >= 64 && i ? i.codigo : `N${c.nivel}·${c.bahia}`) : null;
        return (
          <g key={c.ubicacionId} className="mapa-celda">
            <title>
              {t.lienzo2D.celdaTooltip({
                codigo: i?.codigo ?? "",
                nivel: c.nivel,
                bahia: c.bahia,
                pct,
                cantidad: i?.cantidad ?? 0,
              })}
            </title>
            <rect
              x={x}
              y={y}
              width={w}
              height={altoFila}
              fill={`var(${colorOcupacion(i?.ocupacion ?? null)})`}
              fillOpacity={0.8}
              stroke="var(--border-color-strong)"
              strokeWidth={1}
              vectorEffect="non-scaling-stroke"
            />
            {rotulo ? (
              <text
                x={x + w / 2}
                y={y + altoFila / 2}
                fontSize={Math.min(10 * p.escala, altoFila * 0.5)}
                textAnchor="middle"
                dominantBaseline="central"
                fill="var(--color-gray-800)"
                pointerEvents="none"
              >
                {rotulo}
              </text>
            ) : null}
          </g>
        );
      })}
    </g>
  );
});
