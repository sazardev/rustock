import { Button } from "./Button";
import { exportarCSV, exportarJSON } from "../exportar";
import { cn } from "../lib/cn";

export interface ExportButtonsProps {
  /** Nombre base del archivo (sin extensión ni fecha). */
  nombre: string;
  /** Filas planas (objeto por registro) a exportar (SPEC §15.8). */
  filas: Array<Record<string, unknown>>;
  disabled?: boolean;
  className?: string;
}

/**
 * Botones de exportación CSV/JSON de un reporte (SPEC §15.8). Se deshabilitan
 * cuando no hay filas que exportar. El formato y la descarga viven en
 * `src/shared/exportar.ts` — aquí solo se dispara la acción.
 */
export function ExportButtons({ nombre, filas, disabled, className }: ExportButtonsProps) {
  const sinFilas = filas.length === 0;
  return (
    <div className={cn("flex items-center gap-2", className)}>
      <Button
        variant="secondary"
        size="sm"
        icon="exportar"
        disabled={disabled || sinFilas}
        onClick={() => exportarCSV(nombre, filas)}
      >
        Exportar CSV
      </Button>
      <Button
        variant="ghost"
        size="sm"
        icon="exportar"
        disabled={disabled || sinFilas}
        onClick={() => exportarJSON(nombre, filas)}
      >
        JSON
      </Button>
    </div>
  );
}
