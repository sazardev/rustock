/** Resumen de contenido por nodo (indicador "N SKU"): se acumula
 * ubicación -> rack -> pasillo/zona con las listas ya traídas. */
import type { Pasillo, Rack, Seccion, Ubicacion, Zona } from "../../shared/types";
import type { ResumenNodo } from "./nodo-tipos";

interface SaldoMinimo {
  ubicacion_id: string;
  producto_id: string;
  cantidad: number;
}

function unir(destino: Map<string, Set<string>>, clave: string, productos: Set<string>) {
  const set = destino.get(clave) ?? new Set<string>();
  for (const p of productos) {
    set.add(p);
  }
  destino.set(clave, set);
}

function sumar(destino: Map<string, number>, clave: string, valor: number) {
  destino.set(clave, (destino.get(clave) ?? 0) + valor);
}

function productosPorUbicacionDe(saldos: SaldoMinimo[]) {
  const mapa = new Map<string, Set<string>>();
  for (const s of saldos) {
    if (s.cantidad <= 0) {
      continue;
    }
    const set = mapa.get(s.ubicacion_id) ?? new Set<string>();
    set.add(s.producto_id);
    mapa.set(s.ubicacion_id, set);
  }
  return mapa;
}

export function calcularResumenNodos(
  zonas: Zona[],
  pasillos: Pasillo[],
  racks: Rack[],
  secciones: Seccion[],
  ubicaciones: Ubicacion[],
  saldos: SaldoMinimo[],
  cantidadPorUbicacion: Map<string, number>,
): Map<string, ResumenNodo> {
  const productosPorUbicacion = productosPorUbicacionDe(saldos);
  const rackDeSeccion = new Map<string, string>();
  for (const s of secciones) {
    rackDeSeccion.set(s.id, s.rack_id);
  }

  const resumen = new Map<string, ResumenNodo>();
  const productosPorRack = new Map<string, Set<string>>();
  const unidadesPorRack = new Map<string, number>();
  const productosPorZonaDirecta = new Map<string, Set<string>>();
  const unidadesPorZonaDirecta = new Map<string, number>();

  for (const u of ubicaciones) {
    const productos = productosPorUbicacion.get(u.id) ?? new Set<string>();
    const unidades = cantidadPorUbicacion.get(u.id) ?? 0;
    resumen.set(u.id, { productosDistintos: productos.size, unidadesTotales: unidades });

    const rackId = u.rack_id ?? (u.seccion_id ? rackDeSeccion.get(u.seccion_id) : undefined);
    if (rackId) {
      unir(productosPorRack, rackId, productos);
      sumar(unidadesPorRack, rackId, unidades);
    } else if (u.zona_id) {
      unir(productosPorZonaDirecta, u.zona_id, productos);
      sumar(unidadesPorZonaDirecta, u.zona_id, unidades);
    }
  }

  const productosPorPasillo = new Map<string, Set<string>>();
  const unidadesPorPasillo = new Map<string, number>();
  const productosPorZonaViaRacks = new Map<string, Set<string>>();
  const unidadesPorZonaViaRacks = new Map<string, number>();

  for (const r of racks) {
    const productosRack = productosPorRack.get(r.id) ?? new Set<string>();
    const unidadesRack = unidadesPorRack.get(r.id) ?? 0;
    resumen.set(r.id, { productosDistintos: productosRack.size, unidadesTotales: unidadesRack });
    if (r.pasillo_id) {
      unir(productosPorPasillo, r.pasillo_id, productosRack);
      sumar(unidadesPorPasillo, r.pasillo_id, unidadesRack);
    }
    unir(productosPorZonaViaRacks, r.zona_id, productosRack);
    sumar(unidadesPorZonaViaRacks, r.zona_id, unidadesRack);
  }

  for (const p of pasillos) {
    const set = productosPorPasillo.get(p.id) ?? new Set<string>();
    resumen.set(p.id, {
      productosDistintos: set.size,
      unidadesTotales: unidadesPorPasillo.get(p.id) ?? 0,
    });
  }

  for (const z of zonas) {
    const combinado = new Set([
      ...(productosPorZonaDirecta.get(z.id) ?? new Set<string>()),
      ...(productosPorZonaViaRacks.get(z.id) ?? new Set<string>()),
    ]);
    resumen.set(z.id, {
      productosDistintos: combinado.size,
      unidadesTotales:
        (unidadesPorZonaDirecta.get(z.id) ?? 0) + (unidadesPorZonaViaRacks.get(z.id) ?? 0),
    });
  }

  return resumen;
}
