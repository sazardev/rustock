import type { Vector3 } from "three";
import type { NodoMapa } from "../mapa-almacen-datos";
import { ajustarAVecinos, snap, type IndiceEspacial } from "../mapa/motor";
import { M_POR_UNIDAD } from "../mapa/unidades";
import type { EstadoArrastre, NodoArrastre, PosicionXY } from "./tipos";
import { tamRealDe } from "./utils";

/** Nuevas posiciones del grupo para el punto del plano bajo el cursor. Cada
 * nodo conserva su punto de agarre (delta común del gesto) con snap RELATIVO
 * a su posición de partida: soltar donde estaba cae EXACTO aunque no esté
 * alineado a la rejilla. Un nodo solo (sin Alt) además se pega a bordes y
 * centros de sus vecinos y deja sus guías en `est.guias`. Escribe
 * `actualX/actualY` en cada miembro. */
export function calcularOverrides(
  est: EstadoArrastre,
  punto: Vector3,
  mostrarGrilla: boolean,
  indice: IndiceEspacial,
): Record<string, PosicionXY> {
  const overrides: Record<string, PosicionXY> = {};
  est.guias = [];
  for (const g of est.grupo) {
    let ax = punto.x / M_POR_UNIDAD + g.offsetX;
    let ay = punto.z / M_POR_UNIDAD + g.offsetY;
    if (mostrarGrilla) {
      ax = g.inicioX + snap(ax - g.inicioX);
      ay = g.inicioY + snap(ay - g.inicioY);
    }
    if (est.grupo.length === 1 && !est.alt) {
      const aj = ajustarAVecinos(
        indice,
        { x: ax, y: ay, ancho: g.ancho, profundo: g.profundo },
        g.id,
      );
      ax = aj.x;
      ay = aj.y;
      est.guias = aj.guias;
    }
    g.actualX = ax;
    g.actualY = ay;
    overrides[g.id] = { x: ax, y: ay };
  }
  return overrides;
}

/** Miembros del gesto: si el nodo pertenece a la selección múltiple, arrastra
 * a todo el grupo con el mismo delta; `hit0` es el punto de agarre. */
export function construirGrupo(
  n: NodoMapa,
  nodos: NodoMapa[],
  grupoIds: string[],
  hit0: Vector3,
  posicionDe: (id: string) => PosicionXY,
): NodoArrastre[] {
  const miembros = grupoIds.includes(n.id) && grupoIds.length > 0 ? grupoIds : [n.id];
  return miembros.map((id) => {
    const m = nodos.find((x) => x.id === id) ?? n;
    const p = posicionDe(id);
    const tam = tamRealDe(m);
    return {
      id,
      tipo: m.tipo,
      inicioX: p.x,
      inicioY: p.y,
      posZ: m.pos_z,
      altura: m.altura,
      ancho: tam.ancho,
      profundo: tam.profundo,
      zonaId: m.zona_id,
      offsetX: p.x - hit0.x / M_POR_UNIDAD,
      offsetY: p.y - hit0.z / M_POR_UNIDAD,
      actualX: p.x,
      actualY: p.y,
    };
  });
}
