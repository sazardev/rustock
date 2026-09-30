/**
 * Datos sinteticos SOLO para medir rendimiento del 3D: `?sintetico=N` fabrica
 * N racks (4 niveles x 3 bahias) con ocupaciones aleatorias, sin backend.
 * Activo en desarrollo o con `VITE_SINTETICO=1` al compilar una medicion; en
 * el build normal el resto del modulo queda eliminado.
 */
import type { NodoMapa, ResumenNodo } from "../mapa-almacen-datos";
import {
  derivarCeldasRack,
  type CeldaRack,
  type SeccionConNivel,
  type UbicacionDeRack,
} from "../mapa/celdas/derivarCeldasRack";
import type { InfoCelda } from "../mapa/celdas/infoCeldas";
import type { StockPorCelda } from "../mapa/stock/stockPorCelda";
import { stockSintetico } from "./sinteticoStock";

export const SINTETICO_PERMITIDO: boolean =
  import.meta.env.DEV || import.meta.env.VITE_SINTETICO === "1";

export interface DatosSinteticos {
  nodos: NodoMapa[];
  celdasPorRack: Map<string, CeldaRack[]>;
  infoCeldas: Map<string, InfoCelda>;
  resumenPorNodo: Map<string, ResumenNodo>;
  stock: StockPorCelda;
}

/** Cantidad pedida en `?sintetico=N`, o 0 si no aplica. */
export function cantidadSintetica(valor: string | null): number {
  if (!SINTETICO_PERMITIDO || !valor) {
    return 0;
  }
  const n = Number.parseInt(valor, 10);
  return Number.isFinite(n) && n > 0 ? Math.min(n, 2000) : 0;
}

/** PRNG determinista (mulberry32): mismas ocupaciones en cada medicion. */
function semilla(s: number): () => number {
  let a = s;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const ANCHO_RACK = 330;
const FONDO_RACK = 100;
const PASO_X = 380;
const PASO_Y = 300;
const MARGEN = 200;

function nodoBase(id: string, tipo: NodoMapa["tipo"]): NodoMapa {
  return {
    id,
    tipo,
    codigo: id.toUpperCase(),
    nombre: null,
    zona_id: null,
    pos_x: 0,
    pos_y: 0,
    pos_z: null,
    altura: null,
    ancho: 100,
    profundidad: 100,
    ocupacion: null,
  };
}

export function datosSinteticos(cantidad: number): DatosSinteticos {
  const azar = semilla(7);
  const columnas = Math.max(1, Math.ceil(Math.sqrt(cantidad * 2)));
  const filas = Math.ceil(cantidad / columnas);
  const nodos: NodoMapa[] = [
    {
      ...nodoBase("z-sint", "zona"),
      ancho: columnas * PASO_X + MARGEN,
      profundidad: filas * PASO_Y + MARGEN,
      pos_x: 0,
      pos_y: 0,
    },
  ];
  for (let f = 0; f < filas; f++) {
    nodos.push({
      ...nodoBase(`p-sint-${f}`, "pasillo"),
      zona_id: "z-sint",
      pos_x: MARGEN / 2,
      pos_y: MARGEN / 2 + f * PASO_Y + FONDO_RACK + 20,
      ancho: columnas * PASO_X,
      profundidad: 160,
    });
  }
  const celdasPorRack = new Map<string, CeldaRack[]>();
  const infoCeldas = new Map<string, InfoCelda>();
  const resumenPorNodo = new Map<string, ResumenNodo>();
  const idsUbicacion: string[] = [];
  for (let i = 0; i < cantidad; i++) {
    const id = `r-sint-${i}`;
    const nodo: NodoMapa = {
      ...nodoBase(id, "rack"),
      zona_id: "z-sint",
      pos_x: MARGEN / 2 + (i % columnas) * PASO_X,
      pos_y: MARGEN / 2 + Math.floor(i / columnas) * PASO_Y,
      ancho: ANCHO_RACK,
      profundidad: FONDO_RACK,
      niveles: 4,
      alto_nivel: 80,
      alto_base: 15,
      ocupacion: azar(),
    };
    nodos.push(nodo);
    const secciones: SeccionConNivel[] = [1, 2, 3, 4].map((n) => ({
      id: `${id}-s${n}`,
      nivel: String(n),
    }));
    const ubicaciones: UbicacionDeRack[] = secciones.flatMap((s) =>
      [1, 2, 3].map((b) => ({
        id: `${s.id}-u${b}`,
        codigo: `${id}-${s.nivel}-${b}`,
        seccion_id: s.id,
      })),
    );
    for (const u of ubicaciones) {
      idsUbicacion.push(u.id);
      const ocupacion = azar() < 0.15 ? null : azar() * 1.05;
      infoCeldas.set(u.id, { codigo: u.codigo.toUpperCase(), ocupacion, cantidad: 0 });
    }
    celdasPorRack.set(
      id,
      derivarCeldasRack(
        {
          x: nodo.pos_x ?? 0,
          y: nodo.pos_y ?? 0,
          ancho: ANCHO_RACK,
          profundidad: FONDO_RACK,
          niveles: 4,
          alto_nivel: 80,
          alto_base: 15,
        },
        ubicaciones,
        secciones,
      ),
    );
  }
  return {
    nodos,
    celdasPorRack,
    infoCeldas,
    resumenPorNodo,
    stock: stockSintetico(idsUbicacion, azar),
  };
}
