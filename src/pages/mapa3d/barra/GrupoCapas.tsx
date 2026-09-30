import { useT } from "../../../shared/i18n";
import type { TipoNodo } from "../../mapa-almacen-datos";
import type { IconName } from "../../../shared/ui";
import { ETIQUETA_TIPO, TODOS_TIPOS } from "../constantes";
import { BotonBarra } from "./BotonBarra";
import { GrupoBarra } from "./GrupoBarra";

const ICONO_TIPO: Record<TipoNodo, IconName> = {
  zona: "zona",
  pasillo: "pasillo",
  rack: "rack",
  ubicacion: "ubicacion",
};

export function GrupoCapas(p: {
  tiposVisibles: Record<TipoNodo, boolean>;
  onAlternarTipo: (tipo: TipoNodo) => void;
  stock: boolean;
  onAlternarStock: () => void;
}) {
  const t = useT();
  return (
    <GrupoBarra nombre={t.mapa3d.grupoCapas}>
      {TODOS_TIPOS.map((tipo) => (
        <BotonBarra
          key={tipo}
          icono={ICONO_TIPO[tipo]}
          etiqueta={t.mapa3d[ETIQUETA_TIPO[tipo]]}
          activo={p.tiposVisibles[tipo]}
          onClick={() => p.onAlternarTipo(tipo)}
        />
      ))}
      <BotonBarra
        icono="producto"
        etiqueta={t.mapa3d.stockProductos}
        activo={p.stock}
        onClick={p.onAlternarStock}
      />
    </GrupoBarra>
  );
}
