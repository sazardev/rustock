import { useT } from "../../shared/i18n";
import { HOLGURA_PASILLO_CM } from "../mapa/reglas";
import { formatearLongitud, type UnidadLongitud } from "../mapa/unidades";
import { TextoCota } from "./cotas/TextoCota";

/** El ancho útil de un pasillo es su lado corto. */
export const anchoPasillo = (ancho: number, profundo: number) => Math.min(ancho, profundo);
export const pasilloEstrecho = (ancho: number, profundo: number) =>
  anchoPasillo(ancho, profundo) < HOLGURA_PASILLO_CM;

const TAM_FLECHA_PX = 6;
/** Ancho medio aproximado de un carácter de la cota (px). */
const PX_POR_CARACTER = 6.5;

interface Props {
  ancho: number;
  profundo: number;
  escala: number;
  unidad: UnidadLongitud;
}

/** Sentido de tránsito (flechas en ambos extremos de la línea central) y cota
 * del ancho; en ámbar si no llega a la holgura mínima. */
export function PasilloDecor({ ancho, profundo, escala, unidad }: Props) {
  const t = useT();
  const horizontal = ancho >= profundo;
  const largo = horizontal ? ancho : profundo;
  const corto = horizontal ? profundo : ancho;
  const largoPx = largo / escala;
  if (largoPx < 60 || corto / escala < 8) {
    return null;
  }
  const estrecho = pasilloEstrecho(ancho, profundo);
  const color = estrecho ? "var(--color-warning-600)" : "var(--color-gray-600)";
  // Punto en coordenadas del nodo a partir de (along el largo, across el ancho).
  const pt = (s: number, o: number) => (horizontal ? { x: s, y: o } : { x: o, y: s });
  const linea = (s0: number, s1: number, o: number) =>
    `M ${pt(s0, o).x} ${pt(s0, o).y} L ${pt(s1, o).x} ${pt(s1, o).y}`;
  const mitad = corto / 2;
  const centro = largo / 2;
  const margen = Math.min(10 * escala, largo * 0.05);
  const a = TAM_FLECHA_PX * escala;
  const punta = (s: number, dir: 1 | -1) => {
    const [p1, tip, p2] = [
      pt(s - dir * a, mitad - a * 0.6),
      pt(s, mitad),
      pt(s - dir * a, mitad + a * 0.6),
    ];
    return `M ${p1.x} ${p1.y} L ${tip.x} ${tip.y} L ${p2.x} ${p2.y}`;
  };

  const completa = estrecho
    ? t.lienzo2D.pasilloEstrecho({
        ancho: formatearLongitud(corto, unidad),
        minimo: formatearLongitud(HOLGURA_PASILLO_CM, unidad),
      })
    : formatearLongitud(corto, unidad);
  // Se elige la versión más informativa que cabe con sus flechas a cada lado.
  const espacioPx = horizontal ? largoPx : corto / escala;
  const cabe = (texto: string) =>
    espacioPx >= texto.length * PX_POR_CARACTER + (horizontal ? 50 : 12);
  const texto = [completa, formatearLongitud(corto, unidad)].find(cabe) ?? null;
  const hueco = (horizontal ? (texto?.length ?? 0) * PX_POR_CARACTER * 0.5 + 6 : 12) * escala;
  const tick = 3 * escala;
  const c0 = pt(centro, 0);
  const c1 = pt(centro, corto);
  return (
    <g pointerEvents="none" stroke={color} strokeWidth={1} fill="none">
      <path d={linea(centro - hueco, margen, mitad)} vectorEffect="non-scaling-stroke" />
      <path d={linea(centro + hueco, largo - margen, mitad)} vectorEffect="non-scaling-stroke" />
      <path d={punta(margen, -1)} vectorEffect="non-scaling-stroke" />
      <path d={punta(largo - margen, 1)} vectorEffect="non-scaling-stroke" />
      {texto && corto / escala >= 16 ? (
        <>
          <path
            d={`M ${c0.x} ${c0.y} L ${c1.x} ${c1.y}`}
            strokeDasharray={`${3 * escala} ${2 * escala}`}
            vectorEffect="non-scaling-stroke"
          />
          <path
            d={
              horizontal
                ? `M ${c0.x - tick} ${c0.y} h ${2 * tick} M ${c1.x - tick} ${c1.y} h ${2 * tick}`
                : `M ${c0.x} ${c0.y - tick} v ${2 * tick} M ${c1.x} ${c1.y - tick} v ${2 * tick}`
            }
            vectorEffect="non-scaling-stroke"
          />
          <TextoCota
            escala={escala}
            color={estrecho ? "var(--color-warning-text)" : "var(--color-gray-700)"}
            x={pt(centro, mitad).x}
            y={pt(centro, mitad).y}
            dominantBaseline="central"
          >
            {texto}
          </TextoCota>
        </>
      ) : null}
    </g>
  );
}
