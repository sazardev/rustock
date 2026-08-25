/**
 * Capa de datos compartida entre el mapa 2D (`AlmacenMapaPage.tsx`) y el
 * mapa 3D (`AlmacenMapa3DPage.tsx`): misma cadena de fetch (zonas → pasillos
 * → racks → secciones → ubicaciones → saldos), mismo cálculo de `nodos`,
 * misma rejilla de respaldo para nodos sin posición y misma mutación de
 * guardado de posición — así ambos mapas muestran exactamente lo mismo.
 */
import { useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  listarPasillos,
  listarRacks,
  listarSaldos,
  listarSecciones,
  listarUbicaciones,
  listarZonas,
  moverPasillo,
  moverRack,
  moverUbicacion,
  moverZona,
} from "../shared/backend";
import { esPaginado, type Pasillo, type Rack, type Ubicacion, type Zona } from "../shared/types";
import { useToast } from "../shared/ui";
import { mensajeError } from "../shared/format";

/** Referencia estable para no invalidar `useMemo` cuando aún no hay datos. */
const SIN_DATOS: never[] = [];

export type TipoNodo = "zona" | "pasillo" | "rack" | "ubicacion";

export interface NodoMapa {
  id: string;
  tipo: TipoNodo;
  codigo: string;
  nombre: string | null;
  /** Zona contenedora (pasillos y racks; null para zonas y ubicaciones):
   * permite duplicar heredando la zona sin consultas extra. */
  zona_id: string | null;
  pos_x: number | null;
  pos_y: number | null;
  pos_z: number | null;
  altura: number | null;
  /** Tamaño real del rectángulo en el plano (BD). Para zonas/pasillos/racks
   * llega de la entidad; para ubicaciones es el tamaño fijo del bin. */
  ancho: number;
  profundidad: number;
  /** 0-1, o `null` si no aplica (zonas/pasillos/racks no tienen ocupación propia). */
  ocupacion: number | null;
}

export interface ResumenNodo {
  productosDistintos: number;
  unidadesTotales: number;
}

export const ANCHO_NODO: Record<TipoNodo, number> = {
  zona: 150,
  pasillo: 130,
  rack: 110,
  ubicacion: 70,
};
export const ALTO_NODO: Record<TipoNodo, number> = {
  zona: 70,
  pasillo: 56,
  rack: 56,
  ubicacion: 48,
};
const FILA_BASE_POR_TIPO: Record<TipoNodo, number> = {
  zona: 0,
  pasillo: 150,
  rack: 300,
  ubicacion: 520,
};

export const SLUG_POR_TIPO: Record<TipoNodo, string> = {
  zona: "zonas",
  pasillo: "pasillos",
  rack: "racks",
  ubicacion: "ubicaciones",
};

/** Rejilla determinística para nodos sin posición asignada todavía. */
export function posicionPorDefecto(indice: number, tipo: TipoNodo): { x: number; y: number } {
  const columnas = 6;
  const espacioX = 170;
  const espacioY = 130;
  return {
    x: 40 + (indice % columnas) * espacioX,
    y: FILA_BASE_POR_TIPO[tipo] + Math.floor(indice / columnas) * espacioY,
  };
}

/** Devuelve el nombre de la variable CSS (sin `var()`) — el llamador decide
 * cómo consumirla: el SVG del mapa 2D la usa directamente como `var(--x)`
 * (hereda el tema activo del DOM); el mapa 3D no puede — WebGL/three.js no
 * resuelve custom properties de CSS — así que usa `resolverColorCss` abajo
 * para obtener el valor real calculado antes de pasarlo a un material. */
export function colorOcupacion(ocupacion: number | null): string {
  if (ocupacion === null) {
    return "--color-gray-100";
  }
  if (ocupacion <= 0) {
    return "--color-gray-100";
  }
  if (ocupacion < 0.7) {
    return "--color-success-500";
  }
  if (ocupacion < 1) {
    return "--color-warning-500";
  }
  return "--color-danger-500";
}

/** Color de categoría por tipo (DESIGN §3.1, solo tokens): las zonas son la
 * plataforma neutra, los pasillos el canal de tránsito (ámbar suave: se
 * distingue del piso y de la zona) y los racks la estructura cálida de
 * almacenamiento. Las ubicaciones no lo usan: su color comunica ocupación
 * (verde/ámbar/rojo), que es estado, no categoría. */
export const COLOR_NODO: Record<TipoNodo, string> = {
  zona: "--color-gray-100",
  pasillo: "--color-warning-bg",
  rack: "--color-blue-100",
  ubicacion: "--color-gray-100",
};

/** Relleno efectivo de un nodo: ocupación para ubicaciones, categoría para
 * el resto. Compartido por el mapa 2D y el 3D para que se vean igual. */
export function colorRellenoNodo(n: Pick<NodoMapa, "tipo" | "ocupacion">): string {
  return n.tipo === "ubicacion" ? colorOcupacion(n.ocupacion) : COLOR_NODO[n.tipo];
}

/** Convierte los nodos al formato que esperan `primerChoque` y
 * `calcularMapaColocacion` (mapa-geometria.ts). Compartido por 2D y 3D. */
export function otrosParaChoque(nodos: NodoMapa[]) {
  return nodos.map((n) => ({
    id: n.id,
    codigo: n.codigo,
    tipo: n.tipo,
    ancho: n.ancho,
    profundidad: n.profundidad,
    pos_x: n.pos_x,
    pos_y: n.pos_y,
  }));
}

/** Resuelve una variable CSS (ej. `--color-success-500`) a su valor real
 * calculado en el DOM (hex/rgb) — necesario para el mapa 3D, ya que los
 * materiales de three.js no entienden `var(--x)`. */
export function resolverColorCss(variable: string): string {
  if (typeof document === "undefined") {
    // Fallback SSR: token real en CSS es --color-gray-400 (#AAA096), cercano a #9a9a9a.
    return "var(--color-gray-400)";
  }
  const valor = getComputedStyle(document.documentElement).getPropertyValue(variable).trim();
  // Fallback si el token no existe (p. ej. SSR inicial): usa el gris del tema.
  return valor || "var(--color-gray-400)";
}

export function useMapaAlmacenDatos(almacenId: string | undefined) {
  const zonasQ = useQuery({
    queryKey: ["mapa-almacen", "zonas", almacenId],
    queryFn: () =>
      listarZonas({
        filters: [`almacen_id:eq:${almacenId}`, "activo:eq:true"],
        sort: "codigo",
        page_size: -1,
      }),
    enabled: !!almacenId,
  });
  const zonas = zonasQ.data && esPaginado(zonasQ.data) ? zonasQ.data.data : SIN_DATOS;
  const zonaIds = zonas.map((z) => z.id);

  const pasillosQ = useQuery({
    queryKey: ["mapa-almacen", "pasillos", almacenId, zonaIds],
    queryFn: () =>
      listarPasillos({
        filters: [`zona_id:in:${zonaIds.join(",")}`, "activo:eq:true"],
        sort: "codigo",
        page_size: -1,
      }),
    enabled: zonaIds.length > 0,
  });
  const pasillos = pasillosQ.data && esPaginado(pasillosQ.data) ? pasillosQ.data.data : SIN_DATOS;

  const racksQ = useQuery({
    queryKey: ["mapa-almacen", "racks", almacenId, zonaIds],
    queryFn: () =>
      listarRacks({
        filters: [`zona_id:in:${zonaIds.join(",")}`, "activo:eq:true"],
        sort: "codigo",
        page_size: -1,
      }),
    enabled: zonaIds.length > 0,
  });
  const racks = racksQ.data && esPaginado(racksQ.data) ? racksQ.data.data : SIN_DATOS;
  const rackIds = racks.map((r) => r.id);

  const seccionesQ = useQuery({
    queryKey: ["mapa-almacen", "secciones", almacenId, rackIds],
    queryFn: () =>
      listarSecciones({
        filters: [`rack_id:in:${rackIds.join(",")}`],
        sort: "codigo",
        page_size: -1,
      }),
    enabled: rackIds.length > 0,
  });
  const secciones =
    seccionesQ.data && esPaginado(seccionesQ.data) ? seccionesQ.data.data : SIN_DATOS;
  const seccionIds = secciones.map((s) => s.id);

  const ubicacionesQ = useQuery({
    queryKey: ["mapa-almacen", "ubicaciones", almacenId, seccionIds, rackIds, zonaIds],
    queryFn: () => {
      const filtros = [
        seccionIds.length ? `seccion_id:in:${seccionIds.join(",")}` : "",
        rackIds.length ? `rack_id:in:${rackIds.join(",")}` : "",
        zonaIds.length ? `zona_id:in:${zonaIds.join(",")}` : "",
      ].filter(Boolean);
      // El OR resuelve el árbol simplificado (exactamente un padre); el filtro
      // de activos va en cliente: el motor no mezcla grupos AND dentro del OR.
      return listarUbicaciones({
        filters: filtros,
        filter_logic: "OR",
        sort: "codigo",
        page_size: -1,
      });
    },
    enabled: seccionIds.length > 0 || rackIds.length > 0 || zonaIds.length > 0,
  });
  const ubicaciones = (
    ubicacionesQ.data && esPaginado(ubicacionesQ.data) ? ubicacionesQ.data.data : SIN_DATOS
  ).filter((u) => u.activo);
  const ubicacionIds = ubicaciones.map((u) => u.id);

  const saldosQ = useQuery({
    queryKey: ["mapa-almacen", "saldos"],
    queryFn: () => listarSaldos(),
    enabled: ubicacionIds.length > 0,
  });
  const cantidadPorUbicacion = useMemo(() => {
    const mapa = new Map<string, number>();
    for (const s of saldosQ.data ?? []) {
      mapa.set(s.ubicacion_id, (mapa.get(s.ubicacion_id) ?? 0) + s.cantidad);
    }
    return mapa;
  }, [saldosQ.data]);

  const nodos: NodoMapa[] = useMemo(() => {
    // Tamaño real desde BD con fallback a las constantes históricas si el
    // valor llegara inválido (defensivo; la migración lo rellena siempre).
    const tam = (v: { ancho: number; profundidad: number }, tipo: TipoNodo) => ({
      ancho: typeof v?.ancho === "number" && v.ancho > 0 ? v.ancho : ANCHO_NODO[tipo],
      profundidad:
        typeof v?.profundidad === "number" && v.profundidad > 0 ? v.profundidad : ALTO_NODO[tipo],
    });
    const deZona: NodoMapa[] = zonas.map((z: Zona) => ({
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
    const dePasillo: NodoMapa[] = pasillos.map((p: Pasillo) => ({
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
    const deRack: NodoMapa[] = racks.map((r: Rack) => ({
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
      ocupacion: null,
    }));
    const deUbicacion: NodoMapa[] = ubicaciones.map((u: Ubicacion) => {
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
        zona_id: null,
        ancho: ANCHO_NODO.ubicacion,
        profundidad: ALTO_NODO.ubicacion,
        ocupacion: u.capacidad_maxima ? cantidad / u.capacidad_maxima : null,
      };
    });
    return [...deZona, ...dePasillo, ...deRack, ...deUbicacion];
  }, [zonas, pasillos, racks, ubicaciones, cantidadPorUbicacion]);

  // Resumen de contenido por nodo (para el indicador "N SKU" del mapa): se
  // acumula ubicación → rack → pasillo/zona reutilizando las mismas listas
  // ya traídas arriba, sin queries nuevas.
  const resumenPorNodo: Map<string, ResumenNodo> = useMemo(() => {
    const productosPorUbicacion = new Map<string, Set<string>>();
    for (const s of saldosQ.data ?? []) {
      if (s.cantidad <= 0) continue;
      const set = productosPorUbicacion.get(s.ubicacion_id) ?? new Set<string>();
      set.add(s.producto_id);
      productosPorUbicacion.set(s.ubicacion_id, set);
    }

    const rackDeSeccion = new Map<string, string>();
    for (const s of secciones) rackDeSeccion.set(s.id, s.rack_id);

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
        const set = productosPorRack.get(rackId) ?? new Set<string>();
        for (const p of productos) set.add(p);
        productosPorRack.set(rackId, set);
        unidadesPorRack.set(rackId, (unidadesPorRack.get(rackId) ?? 0) + unidades);
      } else if (u.zona_id) {
        const set = productosPorZonaDirecta.get(u.zona_id) ?? new Set<string>();
        for (const p of productos) set.add(p);
        productosPorZonaDirecta.set(u.zona_id, set);
        unidadesPorZonaDirecta.set(
          u.zona_id,
          (unidadesPorZonaDirecta.get(u.zona_id) ?? 0) + unidades,
        );
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
        const set = productosPorPasillo.get(r.pasillo_id) ?? new Set<string>();
        for (const p of productosRack) set.add(p);
        productosPorPasillo.set(r.pasillo_id, set);
        unidadesPorPasillo.set(
          r.pasillo_id,
          (unidadesPorPasillo.get(r.pasillo_id) ?? 0) + unidadesRack,
        );
      }

      const setZona = productosPorZonaViaRacks.get(r.zona_id) ?? new Set<string>();
      for (const p of productosRack) setZona.add(p);
      productosPorZonaViaRacks.set(r.zona_id, setZona);
      unidadesPorZonaViaRacks.set(
        r.zona_id,
        (unidadesPorZonaViaRacks.get(r.zona_id) ?? 0) + unidadesRack,
      );
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
  }, [zonas, pasillos, racks, secciones, ubicaciones, saldosQ.data, cantidadPorUbicacion]);

  const cargando =
    zonasQ.isLoading ||
    pasillosQ.isLoading ||
    racksQ.isLoading ||
    seccionesQ.isLoading ||
    ubicacionesQ.isLoading;

  return { nodos, cargando, resumenPorNodo };
}

export interface PosicionMapaXY {
  pos_x: number;
  pos_y: number;
  pos_z: number | null;
  altura: number | null;
  /** Tamaño candidato (modo construcción); ausente = mantener. */
  ancho?: number | null;
  profundidad?: number | null;
}

export function useMoverNodoMapa() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({
      tipo,
      nodoId,
      pos,
    }: {
      tipo: TipoNodo;
      nodoId: string;
      pos: PosicionMapaXY;
    }): Promise<void> => {
      if (tipo === "zona") {
        await moverZona(nodoId, pos);
      } else if (tipo === "pasillo") {
        await moverPasillo(nodoId, pos);
      } else if (tipo === "rack") {
        await moverRack(nodoId, pos);
      } else {
        await moverUbicacion(nodoId, pos);
      }
    },
    onError: (err) => toast(mensajeError(err), "error"),
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["mapa-almacen"] });
    },
  });
}
