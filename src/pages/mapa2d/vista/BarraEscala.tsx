import { formatearLongitud, type UnidadLongitud } from "../../mapa/unidades";
import { escalaGrafica } from "./escala-grafica";

const OBJETIVO_PX = 100;

/** Barra de escala gráfica en unidades reales, adaptada al zoom. */
export function BarraEscala({ escala, unidad }: { escala: number; unidad: UnidadLongitud }) {
  const { cm, px } = escalaGrafica(escala, unidad, OBJETIVO_PX);
  return (
    <div className="mapa-escala" aria-hidden="true">
      <span className="mapa-escala__valor">{formatearLongitud(cm, unidad)}</span>
      <span className="mapa-escala__barra" style={{ width: `${px}px` }} data-escala-cm={cm} />
    </div>
  );
}
