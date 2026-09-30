import { alturaBarra } from "./formato";

export interface ColumnaDato {
  key: string | number;
  /** Texto del tooltip de la columna. */
  titulo: string;
  /** Etiqueta bajo la barra; null la deja vacía y oculta a lectores. */
  etiqueta: string | number | null;
  n: number;
}

interface ColumnasActividadProps {
  columnas: ColumnaDato[];
  ariaLabel: string;
  vacio?: string;
}

/** Gráfica de columnas verticales (actividad por día / hora / día de la semana). */
export function ColumnasActividad({
  columnas,
  ariaLabel,
  vacio = "Sin eventos en el periodo.",
}: ColumnasActividadProps) {
  if (columnas.length === 0) return <p className="text-base text-gray-500">{vacio}</p>;
  const max = Math.max(1, ...columnas.map((c) => c.n));
  return (
    <div className="chart" role="img" aria-label={ariaLabel}>
      {columnas.map((c) => (
        <div key={c.key} className="chart__col" title={c.titulo}>
          {c.etiqueta === null ? (
            <span className="chart__label" aria-hidden="true" />
          ) : (
            <span className="chart__label">{c.etiqueta}</span>
          )}
          <div
            className="chart__bar"
            style={{ height: `${alturaBarra(c.n, max)}%` }}
            role="presentation"
            aria-hidden="true"
          />
        </div>
      ))}
    </div>
  );
}
