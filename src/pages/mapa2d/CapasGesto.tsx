import { LADO_MINIMO } from "../mapa/reglas";
import type { RectMapa, Resultado } from "../mapa/motor";
import type { NodoMapa } from "./nodo-tipos";
import { colorColocacion } from "./trazo";

/** Obstáculos marcados en rojo durante un gesto. */
export function Obstaculos({ nodos }: { nodos: NodoMapa[] }) {
  return nodos.map((o) => (
    <rect
      key={`obstaculo-${o.id}`}
      x={o.pos_x as number}
      y={o.pos_y as number}
      width={o.ancho}
      height={o.profundidad}
      rx={8}
      fill="var(--color-danger-500)"
      fillOpacity={0.12}
      stroke="var(--color-danger-500)"
      strokeOpacity={0.55}
      strokeDasharray="6 4"
      pointerEvents="none"
    />
  ));
}

/** Fantasma verde con la posición válida más cercana. */
export function Sugerencia({
  posicion,
  candidato,
}: {
  posicion: { x: number; y: number };
  candidato: RectMapa;
}) {
  return (
    <rect
      x={posicion.x}
      y={posicion.y}
      width={candidato.ancho}
      height={candidato.profundo}
      rx={8}
      fill="var(--color-success-500)"
      fillOpacity={0.18}
      stroke="var(--color-success-500)"
      strokeWidth={2}
      strokeDasharray="8 5"
      pointerEvents="none"
    />
  );
}

const FONDO_ESTADO = {
  libre: "var(--color-success-bg)",
  advertencia: "var(--color-warning-bg)",
  bloqueado: "var(--color-danger-bg)",
} as const;

/** Vista previa del rectángulo que se está dibujando, con sus medidas. */
export function VistaPreviaDibujo({
  dibujo,
  resultado,
}: {
  dibujo: RectMapa;
  resultado: Resultado;
}) {
  return (
    <g pointerEvents="none">
      <rect
        className="mapa-dibujo-preview"
        x={dibujo.x}
        y={dibujo.y}
        width={dibujo.ancho}
        height={dibujo.profundo}
        rx={8}
        fill={FONDO_ESTADO[resultado.estado]}
        stroke={colorColocacion(resultado.estado)}
      />
      {dibujo.ancho >= LADO_MINIMO && dibujo.profundo >= LADO_MINIMO ? (
        <text x={dibujo.x + 6} y={dibujo.y - 6} fontSize={12} fill="var(--color-gray-600)">
          {Math.round(dibujo.ancho)} × {Math.round(dibujo.profundo)}
        </text>
      ) : null}
    </g>
  );
}
