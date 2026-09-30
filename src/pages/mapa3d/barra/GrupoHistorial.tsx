import { useT } from "../../../shared/i18n";
import { BotonBarra } from "./BotonBarra";
import { GrupoBarra } from "./GrupoBarra";

export function GrupoHistorial(p: {
  puedeDeshacer: boolean;
  puedeRehacer: boolean;
  moviendo: boolean;
  onDeshacer: () => void;
  onRehacer: () => void;
}) {
  const t = useT();
  return (
    <GrupoBarra nombre={t.mapa3d.grupoHistorial}>
      <BotonBarra
        icono="deshacer"
        etiqueta={t.comun.deshacer}
        disabled={!p.puedeDeshacer || p.moviendo}
        onClick={p.onDeshacer}
      />
      <BotonBarra
        icono="rehacer"
        etiqueta={t.comun.rehacer}
        disabled={!p.puedeRehacer || p.moviendo}
        onClick={p.onRehacer}
      />
    </GrupoBarra>
  );
}
