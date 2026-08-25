/**
 * Historial de Deshacer/Rehacer del mapa (2D y 3D): pila de cambios de
 * posición/tamaño confirmados por el backend. La entrada se registra SOLO
 * cuando el backend acepta (el llamador la pasa a `registrar` en su
 * `onSuccess`), así un rechazo por colisión nunca ensucia la pila.
 *
 * `deshacer()` devuelve la entrada a re-aplicar (con `antes`); `rehacer()`
 * la que vuelve a aplicarse (con `despues`). Las creaciones se deshacen
 * desactivando el elemento: no tienen rehacer (re-crear cambiaría el código).
 */
import { useState } from "react";
import type { NodoMapa } from "./mapa-almacen-datos";

export interface SnapshotPos {
  pos_x: number | null;
  pos_y: number | null;
  pos_z: number | null;
  altura: number | null;
  ancho: number;
  profundidad: number;
}

export interface MovimientoGrupo {
  tipo: NodoMapa["tipo"];
  nodoId: string;
  antes: SnapshotPos;
  despues: SnapshotPos;
}

/** Un movimiento dentro de una entrada grupal (selección múltiple). */
export type EntradaHistorial =
  | {
      kind: "mover";
      tipo: NodoMapa["tipo"];
      nodoId: string;
      antes: SnapshotPos;
      despues: SnapshotPos;
    }
  | {
      kind: "creacion";
      tipo: NodoMapa["tipo"];
      nodoId: string;
      codigo: string;
    }
  | {
      kind: "grupo";
      /** Todos los nodos movidos juntos se deshacen/rehacen como una unidad. */
      movimientos: MovimientoGrupo[];
    };

export const HISTORIAL_MAX = 50;

/** Estado completo de posición/tamaño de un nodo. */
export const snapshotDe = (n: NodoMapa): SnapshotPos => ({
  pos_x: n.pos_x,
  pos_y: n.pos_y,
  pos_z: n.pos_z,
  altura: n.altura,
  ancho: n.ancho,
  profundidad: n.profundidad,
});

export function useHistorialMapa() {
  const [historial, setHistorial] = useState<EntradaHistorial[]>([]);
  const [pilaRehacer, setPilaRehacer] = useState<EntradaHistorial[]>([]);

  /** Registra un cambio ya confirmado y anula la pila de rehacer. */
  const registrar = (e: EntradaHistorial) => {
    setHistorial((h) => [...h.slice(-(HISTORIAL_MAX - 1)), e]);
    setPilaRehacer([]);
  };

  /** Saca la última entrada para deshacerla. Los movimientos pasan a la pila
   * de rehacer; las creaciones la vacían (no tienen rehacer). */
  const deshacer = (): EntradaHistorial | null => {
    if (historial.length === 0) return null;
    const salida = historial[historial.length - 1];
    setHistorial((h) => h.slice(0, -1));
    if (salida.kind === "mover") {
      setPilaRehacer((p) => [...p, salida]);
    } else {
      setPilaRehacer([]);
    }
    return salida;
  };

  /** Saca la última entrada deshecha (siempre un movimiento) para re-aplicar. */
  const rehacer = (): EntradaHistorial | null => {
    if (pilaRehacer.length === 0) return null;
    const salida = pilaRehacer[pilaRehacer.length - 1];
    setPilaRehacer((p) => p.slice(0, -1));
    setHistorial((h) => [...h, salida]);
    return salida;
  };

  /** Si la aplicación de un deshacer falla (p. ej. sin permiso de
   * desactivar), la entrada vuelve a la pila para no perderla. */
  const reponer = (e: EntradaHistorial) => {
    setHistorial((h) => [...h, e]);
  };

  return {
    historial,
    pilaRehacer,
    registrar,
    deshacer,
    rehacer,
    reponer,
    puedeDeshacer: historial.length > 0,
    puedeRehacer: pilaRehacer.length > 0,
  };
}
