import { Button } from "../../../shared/ui";
import type { IconName } from "../../../shared/ui";
import { cn } from "../../../shared/lib/cn";

export interface PropsBotonBarra {
  icono: IconName;
  /** Nombre accesible y tooltip; tambien es el texto cuando hay sitio. */
  etiqueta: string;
  onClick: () => void;
  /** Interruptor: estado pulsado (`aria-pressed`). Omitir en acciones. */
  activo?: boolean;
  disabled?: boolean;
  /** El texto se muestra solo en barras anchas (siempre hay icono + tooltip). */
  conTexto?: boolean;
  /** Controla un panel: expone `aria-expanded`/`aria-controls`. */
  controla?: string;
}

/** Boton de la barra del mapa 3D. En anchos pequenos queda solo el icono; el
 * nombre accesible y el tooltip no dependen del texto visible. */
export function BotonBarra(p: PropsBotonBarra) {
  return (
    <Button
      variant={p.activo ? "secondary" : "ghost"}
      size="sm"
      icon={p.icono}
      className={cn("mapa3d-barra__boton", p.conTexto && "mapa3d-barra__boton--texto")}
      aria-label={p.etiqueta}
      title={p.etiqueta}
      aria-pressed={p.controla ? undefined : p.activo}
      aria-expanded={p.controla ? p.activo : undefined}
      aria-controls={p.controla}
      disabled={p.disabled}
      onClick={p.onClick}
    >
      <span className="mapa3d-barra__texto">{p.etiqueta}</span>
    </Button>
  );
}
