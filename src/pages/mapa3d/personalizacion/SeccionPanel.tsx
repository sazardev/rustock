import type { ReactNode } from "react";
import { Icon } from "../../../shared/ui";

/** Seccion plegable del panel (details/summary nativo: teclado y lectores de
 * pantalla sin JavaScript). */
export function SeccionPanel({
  titulo,
  abierta = false,
  children,
}: {
  titulo: string;
  abierta?: boolean;
  children: ReactNode;
}) {
  return (
    <details className="mapa3d-panel__seccion" open={abierta}>
      <summary className="mapa3d-panel__resumen">
        <span>{titulo}</span>
        <Icon name="chevronDown" className="mapa3d-panel__chevron" aria-hidden="true" />
      </summary>
      <div className="mapa3d-panel__contenido">{children}</div>
    </details>
  );
}
