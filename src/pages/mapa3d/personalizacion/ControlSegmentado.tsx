import { useId } from "react";

export interface OpcionSegmentada<T extends string | number> {
  valor: T;
  etiqueta: string;
}

/** Grupo de opciones excluyentes (radios nativos con aspecto segmentado):
 * flechas para moverse, Tab para entrar y salir. */
export function ControlSegmentado<T extends string | number>({
  nombre,
  opciones,
  valor,
  onCambiar,
}: {
  nombre: string;
  opciones: readonly OpcionSegmentada<T>[];
  valor: T;
  onCambiar: (valor: T) => void;
}) {
  const grupo = useId();
  return (
    <div role="radiogroup" aria-label={nombre} className="mapa3d-panel__segmentos">
      {opciones.map((o) => (
        <label key={String(o.valor)} className="mapa3d-panel__segmento">
          <input
            type="radio"
            name={grupo}
            className="mapa3d-panel__segmento-input"
            checked={o.valor === valor}
            onChange={() => onCambiar(o.valor)}
          />
          <span className="mapa3d-panel__segmento-texto">{o.etiqueta}</span>
        </label>
      ))}
    </div>
  );
}
