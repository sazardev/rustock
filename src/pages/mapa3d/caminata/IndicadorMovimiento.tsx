import { useT } from "../../../shared/i18n";
import type { InstantaneaHud } from "./useTelemetriaHud";

/** Velocidad en m/s y estado (caminando, corriendo, agachado). */
export function IndicadorMovimiento({ snap }: { snap: InstantaneaHud }) {
  const t = useT();
  let estado = t.mapa3d.estadoCaminando;
  if (snap.agachado) {
    estado = t.mapa3d.estadoAgachado;
  } else if (snap.corriendo) {
    estado = t.mapa3d.estadoCorriendo;
  }
  return (
    <div className="caminata__indicador" aria-live="off">
      <span className="caminata__indicador-valor">{snap.velocidadMs.toFixed(1)} m/s</span>
      <span className="caminata__indicador-estado">{estado}</span>
    </div>
  );
}
