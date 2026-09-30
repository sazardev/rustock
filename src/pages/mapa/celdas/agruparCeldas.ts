/** Agrupa las ubicaciones que viven dentro de un rack y deriva sus celdas. */
import type { Rack, Seccion, Ubicacion } from "../../../shared/types";
import { posicionPorDefecto } from "../../mapa2d/nodo-tipos";
import { derivarCeldasRack, type CeldaRack } from "./derivarCeldasRack";

/** Rack al que pertenece una ubicacion, o null si es de piso. */
export function rackDeUbicacion(u: Ubicacion, rackDeSeccion: Map<string, string>): string | null {
  return u.rack_id ?? (u.seccion_id ? (rackDeSeccion.get(u.seccion_id) ?? null) : null);
}

export function agruparCeldas(
  racks: Rack[],
  secciones: Seccion[],
  ubicaciones: Ubicacion[],
): { celdasPorRack: Map<string, CeldaRack[]>; rackPorUbicacion: Map<string, string> } {
  const rackDeSeccion = new Map(secciones.map((s) => [s.id, s.rack_id]));
  const rackPorUbicacion = new Map<string, string>();
  const porRack = new Map<string, Ubicacion[]>();
  for (const u of ubicaciones) {
    const rackId = rackDeUbicacion(u, rackDeSeccion);
    if (!rackId) {
      continue;
    }
    rackPorUbicacion.set(u.id, rackId);
    porRack.set(rackId, [...(porRack.get(rackId) ?? []), u]);
  }
  const celdasPorRack = new Map<string, CeldaRack[]>();
  racks.forEach((r, indice) => {
    const lista = porRack.get(r.id);
    if (!lista) {
      return;
    }
    // Misma posicion visible que el lienzo: la guardada o la rejilla de respaldo.
    const base =
      r.pos_x !== null && r.pos_y !== null
        ? { x: r.pos_x, y: r.pos_y }
        : posicionPorDefecto(indice, "rack");
    const seccionesRack = secciones.filter((s) => s.rack_id === r.id);
    celdasPorRack.set(r.id, derivarCeldasRack({ ...r, ...base }, lista, seccionesRack));
  });
  return { celdasPorRack, rackPorUbicacion };
}
