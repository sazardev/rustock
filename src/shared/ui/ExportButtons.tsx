import { useState } from "react";
import { Button } from "./Button";
import { useToast } from "./Toast";
import { exportarCSV, exportarJSON, exportarXLSX } from "../exportar";
import { mensajeError } from "../format";
import { cn } from "../lib/cn";
import { useT } from "../i18n";

export interface ExportButtonsProps {
  /** Nombre base del archivo (sin extensión ni fecha). */
  nombre: string;
  /** Filas planas (objeto por registro) a exportar (SPEC §15.8). */
  filas: Array<Record<string, unknown>>;
  disabled?: boolean;
  className?: string;
}

/**
 * Botones de exportación CSV/XLSX/JSON de un reporte (SPEC §15.8). Se
 * deshabilitan cuando no hay filas que exportar. El formato y la descarga
 * viven en `src/shared/exportar.ts` — aquí solo se dispara la acción. XLSX
 * es asíncrono (genera el .xlsx real en el navegador), por eso tiene su
 * propio estado de carga.
 */
export function ExportButtons({ nombre, filas, disabled, className }: ExportButtonsProps) {
  const t = useT();
  const { toast } = useToast();
  const [generandoXlsx, setGenerandoXlsx] = useState(false);
  const sinFilas = filas.length === 0;

  async function manejarXlsx() {
    setGenerandoXlsx(true);
    try {
      await exportarXLSX(nombre, filas);
    } catch (err) {
      toast(`No se pudo generar el XLSX: ${mensajeError(err)}`, "error");
    } finally {
      setGenerandoXlsx(false);
    }
  }

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <Button
        variant="secondary"
        size="sm"
        icon="exportar"
        disabled={disabled || sinFilas}
        onClick={() => exportarCSV(nombre, filas)}
      >
        {t.comun.exportarCsv}
      </Button>
      <Button
        variant="secondary"
        size="sm"
        icon="exportar"
        disabled={disabled || sinFilas || generandoXlsx}
        onClick={() => void manejarXlsx()}
      >
        {generandoXlsx ? "Generando…" : "XLSX"}
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
