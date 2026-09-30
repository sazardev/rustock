import { useId } from "react";

/** Control deslizante con etiqueta y valor visible. */
export function DeslizadorPref({
  etiqueta,
  valorTexto,
  valor,
  min,
  max,
  paso,
  onCambiar,
}: {
  etiqueta: string;
  valorTexto: string;
  valor: number;
  min: number;
  max: number;
  paso: number;
  onCambiar: (valor: number) => void;
}) {
  const id = useId();
  return (
    <div className="mapa3d-panel__deslizador">
      <label htmlFor={id} className="mapa3d-panel__etiqueta">
        <span>{etiqueta}</span>
        <output htmlFor={id} className="mapa3d-panel__valor">
          {valorTexto}
        </output>
      </label>
      <input
        id={id}
        type="range"
        className="mapa3d-panel__rango"
        min={min}
        max={max}
        step={paso}
        value={valor}
        onChange={(e) => onCambiar(Number(e.target.value))}
      />
    </div>
  );
}
