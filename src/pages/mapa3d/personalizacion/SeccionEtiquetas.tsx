import { useT } from "../../../shared/i18n";
import { Checkbox } from "../../../shared/ui";
import {
  DISTANCIA_ETIQUETA_MAX_M,
  DISTANCIA_ETIQUETA_MIN_M,
  type PrefsMapa,
} from "../../mapa/personalizacion";
import { DeslizadorPref } from "./DeslizadorPref";
import { SeccionPanel } from "./SeccionPanel";

export function SeccionEtiquetas({
  prefs,
  onCambiar,
}: {
  prefs: PrefsMapa;
  onCambiar: (parcial: Partial<PrefsMapa>) => void;
}) {
  const t = useT().mapa3d.personalizacion.etiquetas;
  return (
    <SeccionPanel titulo={t.titulo}>
      <Checkbox
        label={t.mostrar}
        checked={prefs.etiquetas}
        onChange={(e) => onCambiar({ etiquetas: e.target.checked })}
      />
      <Checkbox
        label={t.codigo}
        checked={prefs.etiquetaCodigo}
        disabled={!prefs.etiquetas}
        onChange={(e) => onCambiar({ etiquetaCodigo: e.target.checked })}
      />
      <Checkbox
        label={t.ocupacion}
        checked={prefs.etiquetaOcupacion}
        disabled={!prefs.etiquetas}
        onChange={(e) => onCambiar({ etiquetaOcupacion: e.target.checked })}
      />
      <Checkbox
        label={t.sku}
        checked={prefs.etiquetaSku}
        disabled={!prefs.etiquetas}
        onChange={(e) => onCambiar({ etiquetaSku: e.target.checked })}
      />
      <Checkbox
        label={t.dimensiones}
        checked={prefs.etiquetaDimensiones}
        disabled={!prefs.etiquetas}
        onChange={(e) => onCambiar({ etiquetaDimensiones: e.target.checked })}
      />
      <DeslizadorPref
        etiqueta={t.distancia}
        valorTexto={t.distanciaValor({ m: prefs.etiquetaDistanciaM })}
        valor={prefs.etiquetaDistanciaM}
        min={DISTANCIA_ETIQUETA_MIN_M}
        max={DISTANCIA_ETIQUETA_MAX_M}
        paso={2}
        onCambiar={(etiquetaDistanciaM) => onCambiar({ etiquetaDistanciaM })}
      />
    </SeccionPanel>
  );
}
