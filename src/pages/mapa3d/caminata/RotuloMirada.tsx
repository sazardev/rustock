import { useT } from "../../../shared/i18n";
import type { ObjetivoMirada } from "./consultaMirada";

/** Rótulo bajo la mirilla: rack, nivel, bahía y, si hay datos, ocupación. */
export function RotuloMirada({ objetivo }: { objetivo: ObjetivoMirada | null }) {
  const t = useT();
  if (!objetivo) {
    return null;
  }
  const partes = [objetivo.rackCodigo];
  if (objetivo.nivel !== null) {
    partes.push(t.mapa3d.rotuloNivel({ n: objetivo.nivel }));
  }
  if (objetivo.bahia !== null) {
    partes.push(t.mapa3d.rotuloBahia({ n: objetivo.bahia }));
  }
  return (
    <div className="caminata__rotulo" aria-live="polite">
      <span className="caminata__rotulo-linea">{partes.join(" · ")}</span>
      {objetivo.celdaCodigo ? (
        <span className="caminata__rotulo-detalle">
          {objetivo.celdaCodigo}
          {objetivo.ocupacion !== null
            ? ` · ${t.mapa3d.rotuloOcupacion({ pct: Math.round(objetivo.ocupacion * 100) })}`
            : ""}
        </span>
      ) : null}
    </div>
  );
}
