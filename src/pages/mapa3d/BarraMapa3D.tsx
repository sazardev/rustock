import { ButtonLink } from "../../shared/ui";
import { useT } from "../../shared/i18n";
import { almacenMapa } from "../../app/route-paths";
import type { TipoNodo } from "../mapa-almacen-datos";
import type { PrefsMapa } from "../mapa/personalizacion";
import { GrupoCapas } from "./barra/GrupoCapas";
import { GrupoHistorial } from "./barra/GrupoHistorial";
import { GrupoModo } from "./barra/GrupoModo";
import { GrupoOpciones } from "./barra/GrupoOpciones";
import { GrupoVista } from "./barra/GrupoVista";
import type { VistaCamara } from "./tipos";

export interface PropsBarraMapa3D {
  almacenId: string;
  codigoAlmacen: string | undefined;
  puedeDeshacer: boolean;
  puedeRehacer: boolean;
  moviendo: boolean;
  onDeshacer: () => void;
  onRehacer: () => void;
  onEncuadrar: () => void;
  onResetear: () => void;
  onVista: (vista: VistaCamara) => void;
  prefs: PrefsMapa;
  onCambiarPref: (parcial: Partial<PrefsMapa>) => void;
  caminando: boolean;
  onCaminar: () => void;
  alambre: boolean;
  onAlternarAlambre: () => void;
  tiposVisibles: Record<TipoNodo, boolean>;
  onAlternarTipo: (tipo: TipoNodo) => void;
  pantallaCompleta: boolean;
  onPantallaCompleta: () => void;
  panelAbierto: boolean;
  onAlternarPanel: () => void;
  idPanel: string;
}

/** Barra superior flotante del editor: volver, titulo y herramientas en
 * grupos (historial, vista, capas, opciones, modo). */
export function BarraMapa3D(p: PropsBarraMapa3D) {
  const t = useT();
  const { prefs, onCambiarPref } = p;
  return (
    <div className="mapa3d-full__barra">
      <div className="mapa3d-full__grupo">
        <ButtonLink variant="secondary" size="sm" icon="atras" href={almacenMapa(p.almacenId)}>
          {t.mapa3d.mapa2D}
        </ButtonLink>
        <span className="mapa3d-full__titulo">
          {t.mapa3d.mapa3D}
          {p.codigoAlmacen ? ` — ${p.codigoAlmacen}` : ""}
        </span>
      </div>
      <div
        role="toolbar"
        aria-label={t.mapa3d.barraAria}
        className="mapa3d-full__grupo mapa3d-barra"
      >
        <GrupoHistorial
          puedeDeshacer={p.puedeDeshacer}
          puedeRehacer={p.puedeRehacer}
          moviendo={p.moviendo}
          onDeshacer={p.onDeshacer}
          onRehacer={p.onRehacer}
        />
        <GrupoVista onEncuadrar={p.onEncuadrar} onResetear={p.onResetear} onVista={p.onVista} />
        <GrupoCapas
          tiposVisibles={p.tiposVisibles}
          onAlternarTipo={p.onAlternarTipo}
          stock={prefs.stock}
          onAlternarStock={() => onCambiarPref({ stock: !prefs.stock })}
        />
        <GrupoOpciones
          etiquetas={prefs.etiquetas}
          onEtiquetas={() => onCambiarPref({ etiquetas: !prefs.etiquetas })}
          rejilla={prefs.rejilla}
          onRejilla={() => onCambiarPref({ rejilla: !prefs.rejilla })}
          sombras={prefs.sombras}
          onSombras={() => onCambiarPref({ sombras: !prefs.sombras })}
          alambre={p.alambre}
          onAlambre={p.onAlternarAlambre}
          autoRotar={prefs.autoRotar}
          onAutoRotar={() => onCambiarPref({ autoRotar: !prefs.autoRotar })}
        />
        <GrupoModo
          caminando={p.caminando}
          onCaminar={p.onCaminar}
          pantallaCompleta={p.pantallaCompleta}
          onPantallaCompleta={p.onPantallaCompleta}
          panelAbierto={p.panelAbierto}
          onPanel={p.onAlternarPanel}
          idPanel={p.idPanel}
        />
      </div>
    </div>
  );
}
