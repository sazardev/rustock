import { useT } from "../../../shared/i18n";
import { BotonBarra } from "./BotonBarra";
import { GrupoBarra } from "./GrupoBarra";

export function GrupoModo(p: {
  caminando: boolean;
  onCaminar: () => void;
  pantallaCompleta: boolean;
  onPantallaCompleta: () => void;
  panelAbierto: boolean;
  onPanel: () => void;
  /** Id del panel de personalizacion (para `aria-controls`). */
  idPanel: string;
}) {
  const t = useT();
  return (
    <GrupoBarra nombre={t.mapa3d.grupoModo}>
      <BotonBarra
        icono="caminar"
        etiqueta={t.mapa3d.caminar}
        activo={p.caminando}
        conTexto
        onClick={p.onCaminar}
      />
      <BotonBarra
        icono={p.pantallaCompleta ? "salirPantallaCompleta" : "pantallaCompleta"}
        etiqueta={p.pantallaCompleta ? t.mapa3d.salirPantallaCompleta : t.mapa3d.pantallaCompleta}
        onClick={p.onPantallaCompleta}
      />
      <BotonBarra
        icono="personalizar"
        etiqueta={t.mapa3d.personalizar}
        activo={p.panelAbierto}
        controla={p.idPanel}
        conTexto
        onClick={p.onPanel}
      />
    </GrupoBarra>
  );
}
