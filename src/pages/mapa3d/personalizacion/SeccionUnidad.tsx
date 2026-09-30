import { useT } from "../../../shared/i18n";
import { UNIDADES_LONGITUD, type PrefsMapa } from "../../mapa/personalizacion";
import { formatearLongitud } from "../../mapa/unidades";
import { ControlSegmentado } from "./ControlSegmentado";
import { SeccionPanel } from "./SeccionPanel";

/** Longitud de muestra (un pasillo estandar de 90 cm) para ver el efecto. */
const MUESTRA_CM = 90;

export function SeccionUnidad({
  prefs,
  onCambiar,
}: {
  prefs: PrefsMapa;
  onCambiar: (parcial: Partial<PrefsMapa>) => void;
}) {
  const t = useT().mapa3d.personalizacion.unidad;
  const nombres = { cm: t.cm, m: t.m, pies: t.pies };
  return (
    <SeccionPanel titulo={t.titulo}>
      <ControlSegmentado
        nombre={t.titulo}
        opciones={UNIDADES_LONGITUD.map((valor) => ({ valor, etiqueta: nombres[valor] }))}
        valor={prefs.unidad}
        onCambiar={(unidad) => onCambiar({ unidad })}
      />
      <p className="mapa3d-panel__ayuda">{formatearLongitud(MUESTRA_CM, prefs.unidad)}</p>
    </SeccionPanel>
  );
}
