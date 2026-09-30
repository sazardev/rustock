/** Unifica las entidades del árbol físico en una lista plana de `NodoMapa`. */
import type { Pasillo, Rack, Seccion, Ubicacion, Zona } from "../../shared/types";
import { rackDeUbicacion } from "../mapa/celdas/agruparCeldas";
import { ALTO_NODO, ANCHO_NODO, type NodoMapa, type TipoNodo } from "./nodo-tipos";

/** Tamaño real desde BD con fallback a las constantes históricas si el
 * valor llegara inválido (defensivo; la migración lo rellena siempre). */
function tam(v: { ancho: number; profundidad: number }, tipo: TipoNodo) {
  return {
    ancho: typeof v?.ancho === "number" && v.ancho > 0 ? v.ancho : ANCHO_NODO[tipo],
    profundidad:
      typeof v?.profundidad === "number" && v.profundidad > 0 ? v.profundidad : ALTO_NODO[tipo],
  };
}

/** Ocupación de cada rack: unidades / capacidad sumadas sobre sus celdas que
 * declaran capacidad (null si ninguna la declara). */
function ocupacionPorRack(
  ubicaciones: Ubicacion[],
  rackDeSeccion: Map<string, string>,
  cantidadPorUbicacion: Map<string, number>,
): Map<string, number> {
  const acumulado = new Map<string, { cantidad: number; capacidad: number }>();
  for (const u of ubicaciones) {
    const rackId = rackDeUbicacion(u, rackDeSeccion);
    if (!rackId || !u.capacidad_maxima) {
      continue;
    }
    const a = acumulado.get(rackId) ?? { cantidad: 0, capacidad: 0 };
    a.cantidad += cantidadPorUbicacion.get(u.id) ?? 0;
    a.capacidad += u.capacidad_maxima;
    acumulado.set(rackId, a);
  }
  return new Map([...acumulado].map(([id, a]) => [id, a.cantidad / a.capacidad]));
}

/** Solo las ubicaciones de piso son nodos: las de un rack (por rack_id o por
 * sección) son celdas derivadas dentro del rack, no rectángulos sueltos. */
export function construirNodos(
  zonas: Zona[],
  pasillos: Pasillo[],
  racks: Rack[],
  ubicaciones: Ubicacion[],
  cantidadPorUbicacion: Map<string, number>,
  secciones: Seccion[] = [],
): NodoMapa[] {
  const rackDeSeccion = new Map(secciones.map((s) => [s.id, s.rack_id]));
  const ocupacionRack = ocupacionPorRack(ubicaciones, rackDeSeccion, cantidadPorUbicacion);
  const deZona: NodoMapa[] = zonas.map((z) => ({
    id: z.id,
    tipo: "zona",
    codigo: z.codigo,
    nombre: z.nombre,
    pos_x: z.pos_x,
    pos_y: z.pos_y,
    pos_z: z.pos_z,
    altura: z.altura,
    zona_id: null,
    ...tam(z, "zona"),
    ocupacion: null,
  }));
  const dePasillo: NodoMapa[] = pasillos.map((p) => ({
    id: p.id,
    tipo: "pasillo",
    codigo: p.codigo,
    nombre: p.nombre,
    pos_x: p.pos_x,
    pos_y: p.pos_y,
    pos_z: p.pos_z,
    altura: p.altura,
    zona_id: p.zona_id,
    ...tam(p, "pasillo"),
    ocupacion: null,
  }));
  const deRack: NodoMapa[] = racks.map((r) => ({
    id: r.id,
    tipo: "rack",
    codigo: r.codigo,
    nombre: r.nombre,
    pos_x: r.pos_x,
    pos_y: r.pos_y,
    pos_z: r.pos_z,
    altura: r.altura,
    zona_id: r.zona_id,
    ...tam(r, "rack"),
    ocupacion: ocupacionRack.get(r.id) ?? null,
    niveles: r.niveles ?? null,
    alto_nivel: r.alto_nivel ?? null,
    alto_base: r.alto_base ?? null,
  }));
  const dePiso = ubicaciones.filter((u) => rackDeUbicacion(u, rackDeSeccion) === null);
  const deUbicacion: NodoMapa[] = dePiso.map((u) => {
    const cantidad = cantidadPorUbicacion.get(u.id) ?? 0;
    return {
      id: u.id,
      tipo: "ubicacion",
      codigo: u.codigo,
      nombre: u.nombre,
      pos_x: u.pos_x,
      pos_y: u.pos_y,
      pos_z: u.pos_z,
      altura: u.altura,
      zona_id: u.zona_id,
      ancho: ANCHO_NODO.ubicacion,
      profundidad: ALTO_NODO.ubicacion,
      ocupacion: u.capacidad_maxima ? cantidad / u.capacidad_maxima : null,
    };
  });
  return [...deZona, ...dePasillo, ...deRack, ...deUbicacion];
}
