import { useT } from "../../../shared/i18n";
import type { VistaCamara } from "../tipos";
import { BotonBarra } from "./BotonBarra";
import { GrupoBarra } from "./GrupoBarra";

export function GrupoVista(p: {
  onEncuadrar: () => void;
  onResetear: () => void;
  onVista: (vista: VistaCamara) => void;
}) {
  const t = useT();
  return (
    <GrupoBarra nombre={t.mapa3d.grupoVista}>
      <BotonBarra icono="encuadrar" etiqueta={t.comun.encuadrarTodo} onClick={p.onEncuadrar} />
      <BotonBarra icono="refrescar" etiqueta={t.comun.resetearVista} onClick={p.onResetear} />
      <BotonBarra
        icono="vistaIso"
        etiqueta={t.mapa3d.vistaIsometrica}
        conTexto
        onClick={() => p.onVista("iso")}
      />
      <BotonBarra
        icono="vistaPlanta"
        etiqueta={t.mapa3d.vistaPlanta}
        conTexto
        onClick={() => p.onVista("planta")}
      />
      <BotonBarra
        icono="vistaFrente"
        etiqueta={t.mapa3d.vistaFrente}
        conTexto
        onClick={() => p.onVista("frente")}
      />
    </GrupoBarra>
  );
}
