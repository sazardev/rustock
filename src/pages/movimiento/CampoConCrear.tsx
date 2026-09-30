import type { ReactNode } from "react";

/** Control a la izquierda y, opcionalmente, el acceso de creación rápida a la derecha. */
export function CampoConCrear({ children, crear }: { children: ReactNode; crear?: ReactNode }) {
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1">{children}</div>
      {crear}
    </div>
  );
}
