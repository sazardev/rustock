import { formatearNumero } from "../../shared/format";

/** Fila ya normalizada para las barras horizontales. */
export interface BarraDato {
  etiqueta: string;
  valor: number;
}

/** Gráfica de barras horizontales (módulos, usuarios, procesos, rutas). */
export function BarrasHorizontales({ filas }: { filas: BarraDato[] }) {
  if (filas.length === 0) {
    return <p className="text-base text-gray-500">Sin datos en el periodo.</p>;
  }
  const max = Math.max(1, ...filas.map((f) => f.valor));
  return (
    <div>
      {filas.map((fila, i) => {
        const pct = max > 0 ? Math.max(2, (fila.valor / max) * 100) : 0;
        return (
          <div key={`${fila.etiqueta}-${i}`} className="chart-row">
            <span className="chart-row__label" title={fila.etiqueta}>
              {fila.etiqueta}
            </span>
            <div className="chart-row__track">
              <div className="chart-row__fill" style={{ width: `${pct}%` }} />
            </div>
            <span className="font-mono text-xs text-gray-600">{formatearNumero(fila.valor)}</span>
          </div>
        );
      })}
    </div>
  );
}
