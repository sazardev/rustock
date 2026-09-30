import {
  evaluarColocacion,
  type IndiceEspacial,
  type OpcionesColocacion,
  type Resultado,
} from "../mapa/motor";
import type { MovimientoGrupo } from "../use-historial-mapa";
import type { EstadoArrastre } from "./tipos";

/** Semáforo de cada miembro del grupo en su posición actual. El resto del
 * grupo no cuenta como obstáculo (se mueve junto). */
export function evaluarGrupo(
  est: EstadoArrastre,
  indice: IndiceEspacial,
  opciones: OpcionesColocacion,
): Map<string, Resultado> {
  const ignorar = new Set(est.grupo.map((g) => g.id));
  return new Map(
    est.grupo.map((g) => [
      g.id,
      evaluarColocacion(
        indice,
        {
          id: g.id,
          tipo: g.tipo,
          zonaId: g.zonaId,
          rect: { x: g.actualX, y: g.actualY, ancho: g.ancho, profundo: g.profundo },
        },
        { ...opciones, ignorar },
      ),
    ]),
  );
}

export type ResultadoSoltar =
  | { motivo: string; ids: Set<string> }
  | { movimientos: MovimientoGrupo[]; advertencia: string | null };

/** Semáforo en cliente para todo el grupo (mismas reglas que el backend): si
 * cualquiera quedaría bloqueado, nadie se mueve y no se guarda nada; una
 * advertencia (pasillo estrecho) sí se guarda y se comunica. */
export function resolverSoltar(
  est: EstadoArrastre,
  indice: IndiceEspacial,
  opciones: OpcionesColocacion,
): ResultadoSoltar {
  const resultados = evaluarGrupo(est, indice, opciones);
  let advertencia: string | null = null;
  for (const r of resultados.values()) {
    if (r.estado === "bloqueado") {
      return {
        motivo: r.motivo ?? "colocación no válida",
        ids: new Set(est.grupo.map((g) => g.id)),
      };
    }
    advertencia ??= r.motivo;
  }
  const movimientos: MovimientoGrupo[] = est.grupo.map((g) => ({
    tipo: g.tipo,
    nodoId: g.id,
    antes: {
      pos_x: g.inicioX,
      pos_y: g.inicioY,
      pos_z: g.posZ,
      altura: g.altura,
      ancho: g.ancho,
      profundidad: g.profundo,
    },
    despues: {
      pos_x: Math.round(g.actualX),
      pos_y: Math.round(g.actualY),
      pos_z: g.posZ,
      altura: g.altura,
      ancho: g.ancho,
      profundidad: g.profundo,
    },
  }));
  return { movimientos, advertencia };
}
