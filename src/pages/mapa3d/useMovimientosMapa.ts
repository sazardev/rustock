import { useToast } from "../../shared/ui";
import { mensajeError } from "../../shared/format";
import type { PosicionValores } from "../../shared/posicion-form-card";
import type { NodoMapa, TipoNodo } from "../mapa-almacen-datos";
import { snapshotDe, type MovimientoGrupo, type SnapshotPos } from "../use-historial-mapa";
import type { MutacionesMapa } from "./useMutacionesMapa";
import type { PosicionXY } from "./tipos";

interface PosEscritura {
  pos_x: number;
  pos_y: number;
  pos_z: number | null;
  altura: number | null;
  ancho?: number;
  profundidad?: number;
}

/** Guardado de posiciones con registro en el historial (panel, arrastre 3D,
 * grupo y transformaciones). */
export function useMovimientosMapa(
  nodos: NodoMapa[],
  seleccionado: NodoMapa | null,
  { moverMut, hist }: MutacionesMapa,
  /** Posición visible de los nodos sin posición guardada (snapshot "antes"). */
  posicionBase: Map<string, PosicionXY>,
) {
  const { toast } = useToast();

  /** Aplica una transformación (mover/rotar/nudge) registrando historial. */
  const aplicarConHistorial = (
    tipo: TipoNodo,
    nodoId: string,
    pos: PosEscritura,
    despues: SnapshotPos,
  ) => {
    const actual = nodos.find((n) => n.id === nodoId);
    moverMut.mutate(
      { tipo, nodoId, pos },
      {
        onSuccess: actual
          ? () =>
              hist.registrar({
                kind: "mover",
                tipo,
                nodoId,
                antes: snapshotDe(actual, posicionBase.get(actual.id)),
                despues,
              })
          : undefined,
      },
    );
  };

  const guardarPosicionSeleccionado = (pos: PosicionValores) => {
    if (!seleccionado || pos.pos_x === null || pos.pos_y === null) {
      return;
    }
    const entry = {
      kind: "mover" as const,
      tipo: seleccionado.tipo,
      nodoId: seleccionado.id,
      antes: snapshotDe(seleccionado, posicionBase.get(seleccionado.id)),
      despues: {
        pos_x: pos.pos_x,
        pos_y: pos.pos_y,
        pos_z: pos.pos_z,
        altura: pos.altura,
        ancho: pos.ancho ?? seleccionado.ancho,
        profundidad: pos.profundidad ?? seleccionado.profundidad,
      },
    };
    moverMut.mutate(
      {
        tipo: seleccionado.tipo,
        nodoId: seleccionado.id,
        pos: {
          pos_x: pos.pos_x,
          pos_y: pos.pos_y,
          pos_z: pos.pos_z,
          altura: pos.altura,
          ancho: pos.ancho ?? null,
          profundidad: pos.profundidad ?? null,
        },
      },
      { onSuccess: () => hist.registrar(entry) },
    );
  };

  /** El arrastre 3D confirma: registra el historial cuando el backend acepta. */
  const moverDesdeEscena = (
    tipo: TipoNodo,
    id: string,
    x: number,
    y: number,
    posZ: number | null,
    altura: number | null,
  ) => {
    const actual = nodos.find((n) => n.id === id);
    const entry = actual
      ? {
          kind: "mover" as const,
          tipo,
          nodoId: id,
          antes: snapshotDe(actual, posicionBase.get(actual.id)),
          despues: {
            pos_x: x,
            pos_y: y,
            pos_z: posZ,
            altura,
            ancho: actual.ancho,
            profundidad: actual.profundidad,
          },
        }
      : undefined;
    moverMut.mutate(
      { tipo, nodoId: id, pos: { pos_x: x, pos_y: y, pos_z: posZ, altura } },
      { onSuccess: entry ? () => hist.registrar(entry) : undefined },
    );
  };

  const alBloquear = (motivo: string) => {
    toast(`Movimiento bloqueado: ${motivo}.`, "error");
  };

  /** Colocación permitida pero con advertencia (p. ej. pasillo estrecho). */
  const alAdvertir = (motivo: string) => {
    toast(`Advertencia: ${motivo}.`, "default");
  };

  /** Guarda el movimiento grupal y lo registra como UNA entrada de historial. */
  const moverGrupoDesdeEscena = (movimientos: MovimientoGrupo[]) => {
    Promise.all(
      movimientos.map((m) =>
        moverMut
          .mutateAsync({
            tipo: m.tipo,
            nodoId: m.nodoId,
            pos: {
              pos_x: m.despues.pos_x ?? 0,
              pos_y: m.despues.pos_y ?? 0,
              pos_z: m.despues.pos_z,
              altura: m.despues.altura,
            },
          })
          .then(() => undefined),
      ),
    )
      .then(() => hist.registrar({ kind: "grupo", movimientos }))
      .catch((error) => toast(mensajeError(error), "error"));
  };

  return {
    aplicarConHistorial,
    guardarPosicionSeleccionado,
    moverDesdeEscena,
    alBloquear,
    alAdvertir,
    moverGrupoDesdeEscena,
  };
}

export type MovimientosMapa = ReturnType<typeof useMovimientosMapa>;
