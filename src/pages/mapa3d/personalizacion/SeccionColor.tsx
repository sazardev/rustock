import { useT } from "../../../shared/i18n";
import { MODOS_COLOR, type ModoColor, type PrefsMapa } from "../../mapa/personalizacion";
import { ControlSegmentado } from "./ControlSegmentado";
import { LeyendaColor } from "./LeyendaColor";
import { SeccionPanel } from "./SeccionPanel";

export function SeccionColor({
  prefs,
  onCambiar,
}: {
  prefs: PrefsMapa;
  onCambiar: (parcial: Partial<PrefsMapa>) => void;
}) {
  const t = useT().mapa3d.personalizacion.color;
  const etiquetas: Record<ModoColor, string> = {
    tipo: t.tipo,
    ocupacion: t.ocupacion,
    vencimiento: t.vencimiento,
    producto: t.producto,
    categoria: t.categoria,
  };
  const ayudas: Record<ModoColor, string> = {
    tipo: t.ayudaTipo,
    ocupacion: t.ayudaOcupacion,
    vencimiento: t.ayudaVencimiento,
    producto: t.ayudaProducto,
    categoria: t.ayudaCategoria,
  };
  return (
    <SeccionPanel titulo={t.titulo} abierta>
      <ControlSegmentado
        nombre={t.titulo}
        opciones={MODOS_COLOR.map((valor) => ({ valor, etiqueta: etiquetas[valor] }))}
        valor={prefs.colorModo}
        onCambiar={(colorModo) => onCambiar({ colorModo })}
      />
      <p className="mapa3d-panel__ayuda">{ayudas[prefs.colorModo]}</p>
      <LeyendaColor modo={prefs.colorModo} />
    </SeccionPanel>
  );
}
