import { useToast } from "../../shared/ui";
import { useT } from "../../shared/i18n";
import { type NodoMapa, otrosParaChoque, type TipoNodo } from "../mapa-almacen-datos";
import { posicionLibreCercana } from "../mapa-geometria";
import {
  candidatoDe,
  evaluarColocacion,
  type IndiceEspacial,
  type OpcionesColocacion,
} from "../mapa/motor";
import { snapshotDe, type MovimientoGrupo, type SnapshotPos } from "../use-historial-mapa";
import type { MovimientosMapa } from "./useMovimientosMapa";
import type { MutacionesMapa } from "./useMutacionesMapa";
import type { PosicionXY } from "./tipos";

/** Transformaciones del teclado sobre la selección: nudge, rotar y duplicar. */
export function useTransformacionesMapa({
  almacenId,
  nodos,
  seleccionado,
  seleccionadoId,
  grupoIds,
  posicionBase,
  indice,
  opcionesColocacion,
  crearMut,
  mov,
}: {
  almacenId: string | undefined;
  nodos: NodoMapa[];
  seleccionado: NodoMapa | null;
  seleccionadoId: string | null;
  grupoIds: string[];
  /** Posición automática de los nodos que aún no tienen una guardada. */
  posicionBase: Map<string, PosicionXY>;
  indice: IndiceEspacial;
  opcionesColocacion: OpcionesColocacion;
  crearMut: MutacionesMapa["crearMut"];
  mov: MovimientosMapa;
}) {
  const t = useT();
  const { toast } = useToast();

  /** Nudge de un solo nodo vía la misma ruta de historial. */
  const nudgearSingle = (d: SnapshotPos, tipo: TipoNodo, nodoId: string) => {
    mov.aplicarConHistorial(
      tipo,
      nodoId,
      { pos_x: d.pos_x ?? 0, pos_y: d.pos_y ?? 0, pos_z: d.pos_z, altura: d.altura },
      d,
    );
  };

  /** Nudge grupal: flechas mueven TODA la selección; si cualquiera chocaría,
   * nadie se mueve. */
  const nudgear = (dx: number, dy: number) => {
    const miembros =
      grupoIds.length > 1
        ? nodos.filter((n) => grupoIds.includes(n.id))
        : nodos.filter((n) => n.id === seleccionadoId);
    if (miembros.length === 0) {
      return;
    }
    const movimientos: MovimientoGrupo[] = [];
    let advertencia: string | null = null;
    for (const m of miembros) {
      // Un nodo auto-ubicado (sin posición guardada) parte de su posición base:
      // la primera flecha lo fija donde se ve, igual que arrastrarlo.
      const base = posicionBase.get(m.id);
      const x0 = m.pos_x ?? base?.x;
      const y0 = m.pos_y ?? base?.y;
      if (x0 === undefined || y0 === undefined) {
        continue;
      }
      const nx = x0 + dx;
      const ny = y0 + dy;
      const res = evaluarColocacion(
        indice,
        candidatoDe(m, { x: nx, y: ny, ancho: m.ancho, profundo: m.profundidad }),
        { ...opcionesColocacion, ignorar: new Set(miembros.map((x) => x.id)) },
      );
      if (res.estado === "bloqueado") {
        mov.alBloquear(res.motivo ?? m.codigo);
        return;
      }
      advertencia ??= res.motivo;
      movimientos.push({
        tipo: m.tipo,
        nodoId: m.id,
        antes: snapshotDe(m, base),
        despues: {
          pos_x: nx,
          pos_y: ny,
          pos_z: m.pos_z,
          altura: m.altura,
          ancho: m.ancho,
          profundidad: m.profundidad,
        },
      });
    }
    if (movimientos.length === 0) {
      return;
    }
    if (advertencia) {
      mov.alAdvertir(advertencia);
    }
    if (movimientos.length === 1) {
      nudgearSingle(movimientos[0].despues, movimientos[0].tipo, movimientos[0].nodoId);
      return;
    }
    mov.moverGrupoDesdeEscena(movimientos);
  };

  /** Rotar 90° el seleccionado alrededor de su centro (tecla R). */
  const rotarSeleccionado = () => {
    if (!seleccionado || seleccionado.pos_x === null || seleccionado.pos_y === null) {
      return;
    }
    const cx = seleccionado.pos_x + seleccionado.ancho / 2;
    const cy = seleccionado.pos_y + seleccionado.profundidad / 2;
    const nx = cx - seleccionado.profundidad / 2;
    const ny = cy - seleccionado.ancho / 2;
    const res = evaluarColocacion(
      indice,
      candidatoDe(seleccionado, {
        x: nx,
        y: ny,
        ancho: seleccionado.profundidad,
        profundo: seleccionado.ancho,
      }),
      opcionesColocacion,
    );
    if (res.estado === "bloqueado") {
      mov.alBloquear(res.motivo ?? seleccionado.codigo);
      return;
    }
    if (res.motivo) {
      mov.alAdvertir(res.motivo);
    }
    const rotado = {
      pos_x: Math.round(nx),
      pos_y: Math.round(ny),
      pos_z: seleccionado.pos_z,
      altura: seleccionado.altura,
      ancho: seleccionado.profundidad,
      profundidad: seleccionado.ancho,
    };
    mov.aplicarConHistorial(seleccionado.tipo, seleccionado.id, rotado, { ...rotado });
  };

  /** Duplicar (estilo Blender Shift+D): copia el elemento en un hueco libre
   * junto al original; la copia queda seleccionada y en el historial. */
  const duplicarSeleccionado = () => {
    if (!seleccionado || seleccionado.pos_x === null || seleccionado.pos_y === null) {
      return;
    }
    if (seleccionado.tipo === "ubicacion") {
      toast(t.mapa3d.ubicacionesDesdeCatalogo, "error");
      return;
    }
    const destino = posicionLibreCercana(
      seleccionado.tipo,
      seleccionado.ancho,
      seleccionado.profundidad,
      { x: seleccionado.pos_x + seleccionado.ancho + 20, y: seleccionado.pos_y },
      otrosParaChoque(nodos),
    ) ?? { x: seleccionado.pos_x, y: seleccionado.pos_y + seleccionado.profundidad + 20 };
    // La copia hereda la zona del original (donde sea que quepa el hueco).
    const zonaId = seleccionado.tipo === "zona" ? undefined : (seleccionado.zona_id ?? undefined);
    crearMut.mutate({
      tipo: seleccionado.tipo,
      almacen_id: almacenId ?? "",
      zona_id: zonaId,
      x: Math.round(destino.x),
      y: Math.round(destino.y),
      ancho: seleccionado.ancho,
      profundidad: seleccionado.profundidad,
    });
  };

  return { nudgear, rotarSeleccionado, duplicarSeleccionado };
}
