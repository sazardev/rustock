import { useT } from "../../../shared/i18n";
import { Icon } from "../../../shared/ui";

interface Props {
  onAcercar: () => void;
  onAlejar: () => void;
  onEncuadrar: () => void;
  capasAbierto: boolean;
  onAlternarCapas: () => void;
  ayudaAbierta: boolean;
  onAlternarAyuda: () => void;
  idPanelCapas: string;
  idPanelAyuda: string;
}

/** Controles de vista: zoom, encuadre, capas y ayuda, en una sola fila. */
export function BarraVista(p: Props) {
  const t = useT();
  return (
    <div className="mapa-vista" role="toolbar" aria-label={t.lienzo2D.barraVista}>
      <button
        type="button"
        className="mapa-herramienta mapa-herramienta--icono"
        onClick={p.onAlejar}
        aria-label={t.lienzo2D.alejar}
        title={t.lienzo2D.alejar}
      >
        <span aria-hidden="true">−</span>
      </button>
      <button
        type="button"
        className="mapa-herramienta mapa-herramienta--icono"
        onClick={p.onAcercar}
        aria-label={t.lienzo2D.acercar}
        title={t.lienzo2D.acercar}
      >
        <span aria-hidden="true">+</span>
      </button>
      <button
        type="button"
        className="mapa-herramienta"
        onClick={p.onEncuadrar}
        title={t.lienzo2D.encuadrarTitulo}
      >
        <Icon name="encuadrar" size={16} />
        <span>{t.lienzo2D.encuadrar}</span>
      </button>
      <span className="mapa-toolbar__sep" aria-hidden="true" />
      <button
        type="button"
        className={`mapa-herramienta${p.capasAbierto ? " mapa-herramienta--activa" : ""}`}
        onClick={p.onAlternarCapas}
        aria-expanded={p.capasAbierto}
        aria-controls={p.idPanelCapas}
      >
        <Icon name="lote" size={16} />
        <span>{t.lienzo2D.capas}</span>
      </button>
      <button
        type="button"
        className={`mapa-herramienta${p.ayudaAbierta ? " mapa-herramienta--activa" : ""}`}
        onClick={p.onAlternarAyuda}
        aria-expanded={p.ayudaAbierta}
        aria-controls={p.idPanelAyuda}
      >
        <Icon name="ayuda" size={16} />
        <span>{t.lienzo2D.ayuda}</span>
      </button>
    </div>
  );
}
