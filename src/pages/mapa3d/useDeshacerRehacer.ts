import { useToast } from "../../shared/ui";
import { useT } from "../../shared/i18n";
import type { SnapshotPos } from "../use-historial-mapa";
import type { MutacionesMapa } from "./useMutacionesMapa";

/** Posición a re-aplicar desde un snapshot del historial. */
const posDeSnapshot = (s: SnapshotPos) => ({
  pos_x: s.pos_x ?? 0,
  pos_y: s.pos_y ?? 0,
  pos_z: s.pos_z,
  altura: s.altura,
  ancho: s.ancho,
  profundidad: s.profundidad,
});

/** Deshacer/rehacer sobre el historial: re-aplica `antes`/`despues` vía backend. */
export function useDeshacerRehacer({ moverMut, hist, desactivarMut }: MutacionesMapa) {
  const t = useT();
  const { toast } = useToast();

  function deshacer() {
    const e = hist.deshacer();
    if (!e) {
      return;
    }
    if (e.kind === "creacion") {
      desactivarMut.mutate({ tipo: e.tipo, nodoId: e.nodoId, codigo: e.codigo });
      toast(`Creación deshecha: ${e.codigo || "elemento"} desactivado.`, "success");
      return;
    }
    if (e.kind === "grupo") {
      for (const m of e.movimientos) {
        moverMut.mutate({ tipo: m.tipo, nodoId: m.nodoId, pos: posDeSnapshot(m.antes) });
      }
      toast(`Cambios deshechos (${e.movimientos.length} nodos).`, "success");
      return;
    }
    moverMut.mutate({ tipo: e.tipo, nodoId: e.nodoId, pos: posDeSnapshot(e.antes) });
    toast(t.mapa3d.cambioDeshecho, "success");
  }

  function rehacer() {
    const e = hist.rehacer();
    if (!e) {
      return;
    }
    if (e.kind === "grupo") {
      for (const m of e.movimientos) {
        moverMut.mutate({ tipo: m.tipo, nodoId: m.nodoId, pos: posDeSnapshot(m.despues) });
      }
      toast(`Cambios rehechos (${e.movimientos.length} nodos).`, "success");
      return;
    }
    if (e.kind !== "mover") {
      return;
    }
    moverMut.mutate({ tipo: e.tipo, nodoId: e.nodoId, pos: posDeSnapshot(e.despues) });
    toast(t.mapa3d.cambioRehecho, "success");
  }

  return { deshacer, rehacer };
}
