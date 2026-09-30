import type { ReactNode } from "react";

/** Grupo logico de la barra: los grupos contiguos se separan con una linea. */
export function GrupoBarra({ nombre, children }: { nombre: string; children: ReactNode }) {
  return (
    <div role="group" aria-label={nombre} className="mapa3d-barra__grupo">
      {children}
    </div>
  );
}
