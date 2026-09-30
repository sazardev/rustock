/** Ediciones de alto nivel del mapa: mover con historial, rotar y crear por dibujo. */
import { useMemo } from "react";
import { useToast } from "../../shared/ui";
import { useT } from "../../shared/i18n";
import { zonaContenedoraDePunto, type RectMapa } from "../mapa-geometria";
import { candidatoDe, evaluarColocacion, useMotorColocacion } from "../mapa/motor";
import { snapshotDe } from "../use-historial-mapa";
import { zonasDe } from "./apoyo-gesto";
import { posicionesBase } from "./geometria-lienzo";
import type { NodoMapa } from "./nodo-tipos";
import type { HerramientaDibujo, OnMoverNodo } from "./tipos";
import type { useAccionesMapa } from "./useAccionesMapa";

type Acciones = ReturnType<typeof useAccionesMapa>;

export function useEdicionMapa(
  almacenId: string | undefined,
  nodos: NodoMapa[],
  acciones: Acciones,
) {
  const t = useT();
  const { toast } = useToast();
  const { aplicarPosicion, crearMut } = acciones;
  const { indice, opciones } = useMotorColocacion(nodos);
  // Posición visible de los nodos sin posición guardada (para el historial).
  const posicionBase = useMemo(() => posicionesBase(nodos), [nodos]);

  /** Guarda un movimiento/redimensionado registrándolo en el historial. */
  const mover: OnMoverNodo = (tipo, nodoId, x, y, pos_z, altura, ancho, profundidad) => {
    const actual = nodos.find((n) => n.id === nodoId);
    const entry = actual
      ? ({
          kind: "mover",
          tipo,
          nodoId,
          antes: snapshotDe(actual, posicionBase.get(actual.id)),
          despues: {
            pos_x: x,
            pos_y: y,
            pos_z,
            altura,
            ancho: ancho ?? actual.ancho,
            profundidad: profundidad ?? actual.profundidad,
          },
        } as const)
      : undefined;
    aplicarPosicion(tipo, nodoId, { pos_x: x, pos_y: y, pos_z, altura, ancho, profundidad }, entry);
  };

  /** Rota 90° el nodo seleccionado alrededor de su centro y guarda si el
   * resultado no choca con nadie (misma matriz que el backend). */
  const rotar = (id: string) => {
    const n = nodos.find((x) => x.id === id);
    if (!n || n.pos_x === null || n.pos_y === null) {
      return;
    }
    const cx = n.pos_x + n.ancho / 2;
    const cy = n.pos_y + n.profundidad / 2;
    const nuevo: RectMapa = {
      x: cx - n.profundidad / 2,
      y: cy - n.ancho / 2,
      ancho: n.profundidad,
      profundo: n.ancho,
    };
    const res = evaluarColocacion(indice, candidatoDe(n, nuevo), opciones);
    if (res.estado === "bloqueado") {
      toast(t.mapa.noCabeGirado({ motivo: res.motivo ?? n.codigo }), "error");
      return;
    }
    if (res.estado === "advertencia" && res.motivo) {
      toast(res.motivo, "default");
    }
    const despues = {
      pos_x: Math.round(nuevo.x),
      pos_y: Math.round(nuevo.y),
      pos_z: n.pos_z,
      altura: n.altura,
      ancho: nuevo.ancho,
      profundidad: nuevo.profundo,
    };
    aplicarPosicion(n.tipo, n.id, despues, {
      kind: "mover",
      tipo: n.tipo,
      nodoId: n.id,
      antes: snapshotDe(n, posicionBase.get(n.id)),
      despues,
    });
  };

  /** Creación por dibujo: resuelve la zona contenedora por punto central
   * para pasillo/rack (el backend la reválida). */
  const crearDesdeDibujo = (tipo: HerramientaDibujo, rect: RectMapa) => {
    if (!almacenId) {
      return;
    }
    let zonaId: string | null = null;
    if (tipo !== "zona") {
      zonaId = zonaContenedoraDePunto(
        rect.x + rect.ancho / 2,
        rect.y + rect.profundo / 2,
        zonasDe(nodos),
      );
      if (!zonaId) {
        toast(t.mapa.dibujaDentroDeZona, "error");
        return;
      }
    }
    crearMut.mutate({
      tipo,
      almacen_id: almacenId,
      zona_id: zonaId,
      x: rect.x,
      y: rect.y,
      ancho: rect.ancho,
      profundidad: rect.profundo,
    });
  };

  return { mover, rotar, crearDesdeDibujo };
}
