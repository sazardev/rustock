import { useT } from "../../../shared/i18n";
import { Button } from "../../../shared/ui";
import type { PrefsMapa } from "../../mapa/personalizacion";
import { SeccionColor } from "./SeccionColor";
import { SeccionEscena } from "./SeccionEscena";
import { SeccionEtiquetas } from "./SeccionEtiquetas";
import { SeccionUnidad } from "./SeccionUnidad";

/** Panel en linea (sin modal) a un lado de la vista 3D: color de los nodos,
 * etiquetas, unidad y escena. Las preferencias se guardan al instante. */
export function PanelPersonalizacion({
  id,
  prefs,
  onCambiar,
  onCerrar,
}: {
  id: string;
  prefs: PrefsMapa;
  onCambiar: (parcial: Partial<PrefsMapa>) => void;
  onCerrar: () => void;
}) {
  const t = useT().mapa3d.personalizacion;
  return (
    <section id={id} className="mapa3d-panel" aria-label={t.titulo}>
      <header className="mapa3d-panel__cabecera">
        <h2 className="mapa3d-panel__titulo">{t.titulo}</h2>
        <Button
          variant="ghost"
          size="icon"
          icon="cerrarPanel"
          aria-label={t.cerrar}
          title={t.cerrar}
          onClick={onCerrar}
        />
      </header>
      <div className="mapa3d-panel__cuerpo">
        <SeccionColor prefs={prefs} onCambiar={onCambiar} />
        <SeccionEtiquetas prefs={prefs} onCambiar={onCambiar} />
        <SeccionUnidad prefs={prefs} onCambiar={onCambiar} />
        <SeccionEscena prefs={prefs} onCambiar={onCambiar} />
      </div>
    </section>
  );
}
