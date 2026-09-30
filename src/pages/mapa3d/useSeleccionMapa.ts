import { useCallback, useState } from "react";

/** Selección del editor: un nodo activo + grupo (Shift+clic) que se mueve junto. */
export function useSeleccionMapa(inicialId: string | null) {
  const [seleccionadoId, setSeleccionadoId] = useState<string | null>(inicialId);
  const [grupoIds, setGrupoIds] = useState<string[]>([]);

  const alternarGrupo = useCallback((id: string) => {
    setGrupoIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }, []);

  /** Clic simple: selección de un nodo (reinicia el grupo) — estable para
   * efectos que lo consumen. */
  const alClicSimple = useCallback((id: string) => {
    setSeleccionadoId(id);
    setGrupoIds([id]);
  }, []);

  const alSeleccionar = useCallback((id: string | null) => {
    setSeleccionadoId(id);
    if (id === null) {
      setGrupoIds([]);
    }
  }, []);

  return {
    seleccionadoId,
    setSeleccionadoId,
    grupoIds,
    alternarGrupo,
    alClicSimple,
    alSeleccionar,
  };
}
