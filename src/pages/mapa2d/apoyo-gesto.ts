/** Apoyo visual durante un gesto: los obstáculos (nodos con par prohibido
 * para lo que arrastro) se marcan en rojo y, si el candidato actual queda
 * bloqueado, se SUGIERE la posición válida más cercana con un fantasma verde. */
import { LADO_MINIMO, solapeProhibido } from "../mapa/reglas";
import {
  candidatoDe,
  evaluarColocacion,
  posicionLibreCercana,
  type IndiceEspacial,
  type OpcionesColocacion,
  type RectMapa,
  type Resultado,
} from "../mapa/motor";
import { type NodoMapa, type TipoNodo } from "./nodo-tipos";
import type { Herramienta, SesionArrastre } from "./tipos";

export function zonasDe(nodos: NodoMapa[]) {
  return nodos.filter((n): n is NodoMapa & { tipo: "zona" } => n.tipo === "zona");
}

interface EntradaApoyo {
  nodos: NodoMapa[];
  nodoPorId: Map<string, NodoMapa>;
  sesion: SesionArrastre | null;
  herramienta: Herramienta;
  dibujo: RectMapa | null;
  rectDe: (n: NodoMapa) => RectMapa;
  indice: IndiceEspacial;
  opciones: OpcionesColocacion;
}

export interface ApoyoGesto {
  obstaculos: NodoMapa[];
  candidato: RectMapa | null;
  sugerencia: { x: number; y: number } | null;
}

export function calcularApoyoGesto(e: EntradaApoyo): ApoyoGesto {
  const { nodos, sesion, herramienta, dibujo } = e;
  const enNodo = sesion?.kind === "nodo" || sesion?.kind === "resize";
  let tipoGesto: TipoNodo | null = null;
  if (enNodo) {
    tipoGesto = sesion.tipo;
  } else if (sesion?.kind === "dibujo" && herramienta !== "seleccionar") {
    tipoGesto = herramienta;
  }
  if (!tipoGesto) {
    return { obstaculos: [], candidato: null, sugerencia: null };
  }
  let idGesto: string | null = null;
  if (enNodo) {
    idGesto = sesion.nodoId;
  } else if (sesion?.kind === "dibujo") {
    idGesto = "__dibujo__";
  }
  const obstaculos = nodos.filter(
    (n) =>
      n.id !== idGesto &&
      solapeProhibido(tipoGesto, n.tipo) &&
      n.pos_x !== null &&
      n.pos_y !== null,
  );
  let candidato: RectMapa | null = null;
  if (sesion?.kind === "dibujo") {
    candidato = dibujo;
  } else if (idGesto && idGesto !== "__dibujo__") {
    const n = e.nodoPorId.get(idGesto);
    candidato = n ? e.rectDe(n) : null;
  }
  const nodoGesto = idGesto ? e.nodoPorId.get(idGesto) : undefined;
  const sugerencia =
    candidato && candidato.ancho >= LADO_MINIMO && candidato.profundo >= LADO_MINIMO
      ? posicionLibreCercana(
          e.indice,
          {
            id: idGesto ?? "__gesto__",
            tipo: tipoGesto,
            ancho: candidato.ancho,
            profundo: candidato.profundo,
            zonaId: nodoGesto?.zona_id,
          },
          { x: candidato.x, y: candidato.y },
        )
      : null;
  return { obstaculos, candidato, sugerencia };
}

/** Semáforo del trazo en curso (zona contenedora resuelta por su centro). */
export function evaluarDibujo(
  dibujo: RectMapa | null,
  herramienta: Herramienta,
  indice: IndiceEspacial,
  opciones: OpcionesColocacion,
): Resultado | null {
  if (!dibujo || herramienta === "seleccionar") {
    return null;
  }
  return evaluarColocacion(
    indice,
    candidatoDe({ id: "__dibujo__", tipo: herramienta }, dibujo),
    opciones,
  );
}
