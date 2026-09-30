import { ButtonLink, Icon } from "../../shared/ui";
import { useT } from "../../shared/i18n";
import { almacenMapaAsistente } from "../../app/route-paths";
import { herramientasDe } from "./herramientas";
import type { Herramienta } from "./tipos";

interface Props {
  almacenId: string;
  herramienta: Herramienta;
  onHerramienta: (h: Herramienta) => void;
  rejilla: boolean;
  onAlternarRejilla: () => void;
  puedeRotar: boolean;
  onRotar: () => void;
  hayZonas: boolean;
}

/** Barra del modo construcción: herramientas, rejilla, rotar y ayuda. */
export function BarraHerramientas(props: Props) {
  const t = useT();
  const herramientas = herramientasDe(t);
  const ayuda = herramientas.find((h) => h.id === props.herramienta)?.ayuda ?? "";
  return (
    <div className="mapa-toolbar" role="toolbar" aria-label={t.mapa.herramientas}>
      {herramientas.map((h) => (
        <button
          key={h.id}
          type="button"
          className={`mapa-herramienta${props.herramienta === h.id ? " mapa-herramienta--activa" : ""}`}
          onClick={() => props.onHerramienta(h.id)}
          aria-pressed={props.herramienta === h.id}
        >
          <Icon name={h.icono} size={16} />
          <span>{h.etiqueta}</span>
        </button>
      ))}
      <span className="mapa-toolbar__sep" aria-hidden="true" />
      <button
        type="button"
        className={`mapa-herramienta${props.rejilla ? " mapa-herramienta--activa" : ""}`}
        onClick={props.onAlternarRejilla}
        aria-pressed={props.rejilla}
      >
        <Icon name="cuadricula" size={16} />
        <span>{t.mapa.rejilla}</span>
      </button>
      <button
        type="button"
        className="mapa-herramienta"
        disabled={!props.puedeRotar}
        onClick={props.onRotar}
      >
        <Icon name="rotar" size={16} />
        <span>{t.mapa.rotar}</span>
      </button>
      {props.hayZonas ? null : (
        <ButtonLink variant="secondary" icon="agregar" href={almacenMapaAsistente(props.almacenId)}>
          {t.mapa.generarLayout}
        </ButtonLink>
      )}
      <span className="mapa-toolbar__ayuda">{ayuda}</span>
    </div>
  );
}
