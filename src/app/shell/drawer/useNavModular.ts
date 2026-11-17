import { useCallback, useEffect, useMemo, useState } from "react";
import { useLocation } from "react-router";
import { usePreferencias } from "../../../shared/preferencias";
import { hrefActivo } from "../../../shared/ui";
import type { DispositivoNav, NavConfig, NavSecciones } from "../../../shared/types";
import type { NavGroup } from "../../nav";
import { normalizar, type NavGrupoView } from "./tipos";

const CLAVE_GRUPOS = "rustock.drawer.grupos";
const CLAVE_DISPOSITIVO = "rustock.drawer.dispositivo";

const SECCIONES_VACIAS: NavSecciones = { ocultas: [], orden: [], visibles: [] };

function leerAbiertos(): Set<string> {
  const porDefecto = new Set(["g0"]);
  if (typeof globalThis === "undefined") return porDefecto;
  try {
    const crudo = globalThis.localStorage.getItem(CLAVE_GRUPOS);
    return crudo ? new Set(JSON.parse(crudo) as string[]) : porDefecto;
  } catch {
    return porDefecto;
  }
}

function leerGuardarDispositivo(): boolean {
  if (typeof globalThis === "undefined") return false;
  return globalThis.localStorage.getItem(CLAVE_DISPOSITIVO) === "1";
}

function ordenDe(crudo: string | null | undefined): string[] {
  if (!crudo) return [];
  try {
    const parsed: unknown = JSON.parse(crudo);
    return Array.isArray(parsed) ? (parsed as string[]) : [];
  } catch {
    return [];
  }
}

/** Ordena por la lista de hrefs dada; los desconocidos conservan su sitio. */
function ordenarItems<T extends { href: string }>(items: T[], orden: string[]): T[] {
  if (orden.length === 0) return items;
  const pos = new Map(orden.map((href, i) => [href, i]));
  return items.toSorted((a, b) => {
    const pa = pos.get(a.href);
    const pb = pos.get(b.href);
    if (pa === undefined && pb === undefined) return 0;
    if (pa === undefined) return 1;
    if (pb === undefined) return -1;
    return pa - pb;
  });
}

/**
 * Estado del drawer con herencia en tres capas: defaults del rol, preferencias
 * globales del usuario y, si existe, la instantánea del dispositivo actual.
 * Todo se persiste en el backend; el frontend solo decide qué capa gana.
 */
export function useNavModular(
  grupos: NavGroup[],
  dispositivo: DispositivoNav,
  rolCodigo: string | null,
) {
  const { pathname } = useLocation();
  const resueltas = usePreferencias((s) => s.resueltas);
  const guardar = usePreferencias((s) => s.guardar);
  const [consulta, setConsulta] = useState("");
  const [abiertos, setAbiertos] = useState<Set<string>>(leerAbiertos);
  const [porDispositivo, setPorDispositivo] = useState(leerGuardarDispositivo);

  const config = useMemo<NavConfig>(() => {
    const rol = rolCodigo ? resueltas?.nav_roles?.[rolCodigo] : undefined;
    const global: NavConfig = {
      fijados: resueltas?.nav_fijados ?? [],
      ocultos: resueltas?.nav_ocultos ?? [],
      orden: ordenDe(resueltas?.orden_sidebar),
      secciones: resueltas?.nav_secciones ?? SECCIONES_VACIAS,
    };
    const propio = resueltas?.nav_dispositivos?.[dispositivo];
    const base = propio ?? global;
    const visibles = new Set(base.secciones.visibles);
    return {
      fijados: base.fijados,
      ocultos: [...new Set([...base.ocultos, ...(rol?.ocultos ?? [])])].filter(
        (href) => !visibles.has(href),
      ),
      orden: base.orden.length ? base.orden : (rol?.orden ?? []),
      secciones: {
        ...base.secciones,
        ocultas: [
          ...new Set([...base.secciones.ocultas, ...(rol?.secciones.ocultas ?? [])]),
        ].filter((id) => !visibles.has(id)),
      },
    };
  }, [resueltas, dispositivo, rolCodigo]);

  const ocultos = useMemo(
    () => grupos.flatMap((g) => g.items).filter((item) => config.ocultos.includes(item.href)),
    [grupos, config.ocultos],
  );

  const seccionesOcultas = useMemo(
    () => grupos.map((_, i) => `g${i}`).filter((id) => config.secciones.ocultas.includes(id)),
    [grupos, config.secciones.ocultas],
  );

  const activo = useMemo(
    () =>
      hrefActivo(
        pathname,
        grupos.flatMap((g) => g.items.map((i) => i.href)),
      ),
    [pathname, grupos],
  );

  const q = normalizar(consulta.trim());
  const filtrando = q.length > 0;

  const gruposVisibles = useMemo<NavGrupoView[]>(
    () =>
      grupos
        .map((grupo, indice) => ({
          id: `g${indice}`,
          title: grupo.title,
          items: ordenarItems(grupo.items, config.orden)
            .filter((item) => !config.ocultos.includes(item.href))
            .filter(
              (item) =>
                !filtrando ||
                normalizar(item.label).includes(q) ||
                normalizar(item.descripcion ?? "").includes(q),
            )
            .map((item) => ({ ...item, fijado: config.fijados.includes(item.href) })),
        }))
        .filter((grupo) => grupo.items.length > 0 && !config.secciones.ocultas.includes(grupo.id)),
    [grupos, config, filtrando, q],
  );

  const fijadosVisibles = useMemo(
    () => gruposVisibles.flatMap((grupo) => grupo.items).filter((item) => item.fijado),
    [gruposVisibles],
  );

  const persistir = useCallback(
    (cambios: Partial<NavConfig>) => {
      const actual: NavConfig = {
        fijados: config.fijados,
        ocultos: config.ocultos,
        orden: config.orden,
        secciones: config.secciones,
      };
      const nuevo = { ...actual, ...cambios };
      if (porDispositivo) {
        void guardar({
          nav_dispositivos: {
            ...resueltas?.nav_dispositivos,
            [dispositivo]: nuevo,
          },
        });
      } else {
        void guardar({
          nav_fijados: nuevo.fijados,
          nav_ocultos: nuevo.ocultos,
          orden_sidebar: nuevo.orden.length ? JSON.stringify(nuevo.orden) : null,
          nav_secciones: nuevo.secciones,
        });
      }
    },
    [config, porDispositivo, guardar, resueltas?.nav_dispositivos, dispositivo],
  );

  function alternarGrupo(id: string) {
    setAbiertos((actual) => {
      const siguiente = new Set(actual);
      if (siguiente.has(id)) siguiente.delete(id);
      else siguiente.add(id);
      try {
        globalThis.localStorage.setItem(CLAVE_GRUPOS, JSON.stringify([...siguiente]));
      } catch {
        // Sin almacenamiento local el acordeón sigue funcionando en memoria.
      }
      return siguiente;
    });
  }

  function alternarGuardarDispositivo() {
    setPorDispositivo((actual) => {
      const siguiente = !actual;
      try {
        globalThis.localStorage.setItem(CLAVE_DISPOSITIVO, siguiente ? "1" : "0");
      } catch {
        // Preferencia local: si no se puede guardar, dura la sesión.
      }
      return siguiente;
    });
  }

  const alternarFijado = useCallback(
    (href: string) => {
      const siguiente = new Set(config.fijados);
      if (siguiente.has(href)) siguiente.delete(href);
      else siguiente.add(href);
      persistir({ fijados: [...siguiente] });
    },
    [config.fijados, persistir],
  );

  const ocultarModulo = useCallback(
    (href: string) => {
      persistir({
        ocultos: [...new Set([...config.ocultos, href])],
        fijados: config.fijados.filter((h) => h !== href),
      });
    },
    [config.ocultos, config.fijados, persistir],
  );

  const mostrarModulo = useCallback(
    (href: string) =>
      persistir({
        ocultos: config.ocultos.filter((h) => h !== href),
        secciones: {
          ...config.secciones,
          visibles: [...new Set([...config.secciones.visibles, href])],
        },
      }),
    [config.ocultos, config.secciones, persistir],
  );

  const mover = useCallback(
    (href: string, delta: -1 | 1) => {
      const copia = grupos.map((g) => ({ ...g, items: [...g.items] }));
      for (const grupo of copia) {
        const indice = grupo.items.findIndex((item) => item.href === href);
        if (indice === -1) continue;
        const destino = indice + delta;
        if (destino < 0 || destino >= grupo.items.length) return;
        [grupo.items[indice], grupo.items[destino]] = [grupo.items[destino], grupo.items[indice]];
        persistir({ orden: copia.flatMap((g) => g.items.map((item) => item.href)) });
        return;
      }
    },
    [grupos, persistir],
  );

  /** Mueve un módulo a otra sección (arrastre) y guarda el orden resultante. */
  const moverASeccion = useCallback(
    (href: string, idDestino: string) => {
      const ordenSecciones = config.secciones.orden.length
        ? config.secciones.orden
        : grupos.map((_, i) => `g${i}`);
      const indiceDestino = ordenSecciones.indexOf(idDestino);
      if (indiceDestino === -1) return;
      const copia = grupos.map((g) => ({ ...g, items: [...g.items] }));
      let modulo: (typeof copia)[number]["items"][number] | undefined;
      for (const grupo of copia) {
        const i = grupo.items.findIndex((item) => item.href === href);
        if (i !== -1) modulo = grupo.items.splice(i, 1)[0];
      }
      if (!modulo) return;
      copia[indiceDestino].items.push(modulo);
      persistir({ orden: copia.flatMap((g) => g.items.map((item) => item.href)) });
    },
    [grupos, config.secciones.orden, persistir],
  );

  const reordenarSeccion = useCallback(
    (id: string, delta: -1 | 1) => {
      const ids = config.secciones.orden.length
        ? [...config.secciones.orden]
        : grupos.map((_, i) => `g${i}`);
      const i = ids.indexOf(id);
      const destino = i + delta;
      if (i === -1 || destino < 0 || destino >= ids.length) return;
      [ids[i], ids[destino]] = [ids[destino], ids[i]];
      persistir({ secciones: { ...config.secciones, orden: ids } });
    },
    [config.secciones, grupos, persistir],
  );

  const moverSeccionA = useCallback(
    (id: string, destino: string) => {
      const ids = config.secciones.orden.length
        ? [...config.secciones.orden]
        : grupos.map((_, i) => `g${i}`);
      const desde = ids.indexOf(id);
      const hasta = ids.indexOf(destino);
      if (desde === -1 || hasta === -1 || desde === hasta) return;
      ids.splice(desde, 1);
      ids.splice(hasta, 0, id);
      persistir({ secciones: { ...config.secciones, orden: ids } });
    },
    [config.secciones, grupos, persistir],
  );

  const ocultarSeccion = useCallback(
    (id: string) =>
      persistir({
        secciones: {
          ...config.secciones,
          ocultas: [...new Set([...config.secciones.ocultas, id])],
        },
      }),
    [config.secciones, persistir],
  );

  const mostrarSeccion = useCallback(
    (id: string) =>
      persistir({
        secciones: {
          ...config.secciones,
          ocultas: config.secciones.ocultas.filter((s) => s !== id),
          visibles: [...new Set([...config.secciones.visibles, id])],
        },
      }),
    [config.secciones, persistir],
  );

  const restaurarTodo = useCallback(() => {
    persistir({
      fijados: [],
      ocultos: [],
      orden: [],
      secciones: SECCIONES_VACIAS,
    });
  }, [persistir]);

  useEffect(() => {
    if (typeof globalThis === "undefined") return;
    try {
      globalThis.localStorage.setItem(CLAVE_GRUPOS, JSON.stringify([...abiertos]));
    } catch {
      // Sin persistencia local el acordeón sigue funcionando en memoria.
    }
  }, [abiertos]);

  return {
    consulta,
    setConsulta,
    filtrando,
    gruposVisibles,
    fijadosVisibles,
    ocultos,
    seccionesOcultas,
    activo,
    abiertos,
    porDispositivo,
    alternarGrupo,
    alternarGuardarDispositivo,
    alternarFijado,
    ocultarModulo,
    mostrarModulo,
    mover,
    moverASeccion,
    reordenarSeccion,
    moverSeccionA,
    ocultarSeccion,
    mostrarSeccion,
    restaurarTodo,
    limpiar: () => setConsulta(""),
  };
}
