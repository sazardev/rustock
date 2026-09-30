import { useT } from "../../../shared/i18n";
import { Checkbox } from "../../../shared/ui";
import { ETIQUETAS_NODO, TIPOS_CAPA, type CapasMapa, type EtiquetaNodo } from "../capas/capas";
import type { TipoNodo } from "../nodo-tipos";

interface Props {
  id: string;
  capas: CapasMapa;
  onVisible: (tipo: TipoNodo) => void;
  onBloqueo: (tipo: TipoNodo) => void;
  onEtiqueta: (e: EtiquetaNodo) => void;
}

/** Panel inline de capas: mostrar/ocultar y bloquear por tipo, y contenido de etiquetas. */
export function PanelCapas({ id, capas, onVisible, onBloqueo, onEtiqueta }: Props) {
  const t = useT();
  return (
    <section id={id} className="mapa-panel" aria-label={t.lienzo2D.capas}>
      <div className="mapa-panel__grupo">
        <h3 className="mapa-panel__titulo">{t.lienzo2D.capasPorTipo}</h3>
        <ul className="mapa-capas">
          {TIPOS_CAPA.map((tipo) => (
            <li key={tipo} className="mapa-capas__fila">
              <span className="mapa-capas__nombre">{t.lienzo2D.tipos[tipo]}</span>
              <Checkbox
                checked={capas.visible[tipo]}
                onChange={() => onVisible(tipo)}
                label={t.lienzo2D.visible}
              />
              <Checkbox
                checked={capas.bloqueado[tipo]}
                onChange={() => onBloqueo(tipo)}
                label={t.lienzo2D.bloqueada}
              />
            </li>
          ))}
        </ul>
      </div>
      <div className="mapa-panel__grupo">
        <h3 className="mapa-panel__titulo" id={`${id}-etiquetas`}>
          {t.lienzo2D.etiquetas}
        </h3>
        <div className="mapa-segmentos" role="group" aria-labelledby={`${id}-etiquetas`}>
          {ETIQUETAS_NODO.map((e) => (
            <button
              key={e}
              type="button"
              className={`mapa-herramienta${capas.etiqueta === e ? " mapa-herramienta--activa" : ""}`}
              aria-pressed={capas.etiqueta === e}
              onClick={() => onEtiqueta(e)}
            >
              {t.lienzo2D.etiqueta[e]}
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}
