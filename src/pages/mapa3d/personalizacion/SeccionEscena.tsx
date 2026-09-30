import { useT } from "../../../shared/i18n";
import { Checkbox } from "../../../shared/ui";
import {
  NIVELES_CALIDAD,
  TAMANOS_REJILLA_M,
  type NivelCalidad,
  type PrefsMapa,
} from "../../mapa/personalizacion";
import { ControlSegmentado } from "./ControlSegmentado";
import { SeccionPanel } from "./SeccionPanel";

export function SeccionEscena({
  prefs,
  onCambiar,
}: {
  prefs: PrefsMapa;
  onCambiar: (parcial: Partial<PrefsMapa>) => void;
}) {
  const t = useT().mapa3d.personalizacion.escena;
  const calidades: Record<NivelCalidad, string> = {
    bajo: t.calidadBajo,
    medio: t.calidadMedio,
    alto: t.calidadAlto,
  };
  return (
    <SeccionPanel titulo={t.titulo}>
      <Checkbox
        label={t.rejilla}
        checked={prefs.rejilla}
        onChange={(e) => onCambiar({ rejilla: e.target.checked })}
      />
      <div className="mapa3d-panel__campo">
        <span className="mapa3d-panel__etiqueta">{t.tamanoRejilla}</span>
        <ControlSegmentado
          nombre={t.tamanoRejilla}
          opciones={TAMANOS_REJILLA_M.map((valor) => ({
            valor,
            etiqueta: t.tamanoRejillaValor({ m: valor }),
          }))}
          valor={prefs.rejillaM}
          onCambiar={(rejillaM) => onCambiar({ rejillaM })}
        />
      </div>
      <Checkbox
        label={t.sombras}
        checked={prefs.sombras}
        onChange={(e) => onCambiar({ sombras: e.target.checked })}
      />
      <div className="mapa3d-panel__campo">
        <span className="mapa3d-panel__etiqueta">{t.calidad}</span>
        <ControlSegmentado
          nombre={t.calidad}
          opciones={NIVELES_CALIDAD.map((valor) => ({ valor, etiqueta: calidades[valor] }))}
          valor={prefs.calidad}
          onCambiar={(calidad) => onCambiar({ calidad })}
        />
        <p className="mapa3d-panel__ayuda">{t.ayudaCalidad}</p>
      </div>
    </SeccionPanel>
  );
}
