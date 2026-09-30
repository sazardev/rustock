/** Estado de capas del 2D, persistido por navegador. */
import { useCallback, useEffect, useState } from "react";
import type { TipoNodo } from "../nodo-tipos";
import {
  CAPAS_DEFECTO,
  CLAVE_CAPAS,
  normalizarCapas,
  type CapasMapa,
  type EtiquetaNodo,
} from "./capas";

function leer(): CapasMapa {
  try {
    const crudo = window.localStorage.getItem(CLAVE_CAPAS);
    return crudo ? normalizarCapas(JSON.parse(crudo)) : CAPAS_DEFECTO;
  } catch {
    return CAPAS_DEFECTO;
  }
}

export function useCapasMapa() {
  const [capas, setCapas] = useState<CapasMapa>(leer);

  useEffect(() => {
    try {
      window.localStorage.setItem(CLAVE_CAPAS, JSON.stringify(capas));
    } catch {
      // Almacenamiento lleno o bloqueado: la preferencia vive solo en la sesión.
    }
  }, [capas]);

  const alternarVisible = useCallback((tipo: TipoNodo) => {
    setCapas((c) => ({ ...c, visible: { ...c.visible, [tipo]: !c.visible[tipo] } }));
  }, []);
  const alternarBloqueo = useCallback((tipo: TipoNodo) => {
    setCapas((c) => ({ ...c, bloqueado: { ...c.bloqueado, [tipo]: !c.bloqueado[tipo] } }));
  }, []);
  const fijarEtiqueta = useCallback((etiqueta: EtiquetaNodo) => {
    setCapas((c) => ({ ...c, etiqueta }));
  }, []);

  return { capas, alternarVisible, alternarBloqueo, fijarEtiqueta };
}
