import { useT } from "../../../shared/i18n";
import { BotonBarra } from "./BotonBarra";
import { GrupoBarra } from "./GrupoBarra";

export function GrupoOpciones(p: {
  etiquetas: boolean;
  onEtiquetas: () => void;
  rejilla: boolean;
  onRejilla: () => void;
  sombras: boolean;
  onSombras: () => void;
  alambre: boolean;
  onAlambre: () => void;
  autoRotar: boolean;
  onAutoRotar: () => void;
}) {
  const t = useT();
  return (
    <GrupoBarra nombre={t.mapa3d.grupoOpciones}>
      <BotonBarra
        icono="etiqueta"
        etiqueta={t.mapa3d.etiquetas}
        activo={p.etiquetas}
        onClick={p.onEtiquetas}
      />
      <BotonBarra
        icono="cuadricula"
        etiqueta={t.mapa3d.cuadricula}
        activo={p.rejilla}
        onClick={p.onRejilla}
      />
      <BotonBarra
        icono="sombras"
        etiqueta={t.mapa3d.sombras}
        activo={p.sombras}
        onClick={p.onSombras}
      />
      <BotonBarra
        icono="alambre"
        etiqueta={t.mapa3d.alambre}
        activo={p.alambre}
        onClick={p.onAlambre}
      />
      <BotonBarra
        icono="rotar"
        etiqueta={t.mapa3d.autoRotar}
        activo={p.autoRotar}
        onClick={p.onAutoRotar}
      />
    </GrupoBarra>
  );
}
