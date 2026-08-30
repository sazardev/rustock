import { catalogosDe } from "../pages/catalogs";
import { idiomaActual, type Diccionario, type Idioma } from "../shared/i18n";
import { manualPartes } from "../pages/manual/manual-data";

export interface Crumb {
  label: string;
  href?: string;
}

export interface CrumbSegment {
  /** Prefijo de ruta (sin "/" inicial). Ej: "movimientos" */
  segment: string;
  /** Label de la sección raíz del segmento. */
  label: string;
}

/**
 * Mapa de ruta -> breadcrumb. El orden importa: se matchea por prefijo de segmento.
 * Cada entrada indica el label de la sección y (opcionalmente) sus sub-rutas.
 */
/** Secciones fijas de la aplicación. El segmento de la URL no se traduce
 *  (SPEC §17.4); lo que cambia es cómo se llama en pantalla. */
function crumbMap(t: Diccionario): CrumbSegment[] {
  return Object.entries(t.migas.secciones).map(([segment, label]) => ({ segment, label }));
}

/**
 * Deriva la lista de crumbs a partir del pathname actual.
 * Inteligencia de rutas:
 *  - `/` -> Dashboard
 *  - `/movimientos/nuevo` -> Movimientos / Nuevo
 *  - `/almacenes` -> Almacenes (catálogo)
 *  - `/almacenes/123/editar` -> Almacenes / <detalle> / Editar
 *  - Ruta desconocida -> se usa el propio segmento como label legible.
 */
export function crumbsFromPath(pathname: string, t: Diccionario): Crumb[] {
  const parts = pathname.split("/").filter(Boolean);
  const crumbs: Crumb[] = [];

  if (parts.length === 0) {
    crumbs.push({ label: t.nav.dashboard });
    return crumbs;
  }

  const first = parts[0];
  let matched = false;

  // Sección conocida (CRUMB_MAP) o catálogo.
  const section = crumbMap(t).find((s) => s.segment === first);
  const catalogos = catalogosDe(t);
  const isCatalog = first in catalogos;

  if (section) {
    crumbs.push({ label: section.label, href: `/${section.segment}` });
    matched = true;
  } else if (isCatalog) {
    const cfg = catalogos[first];
    crumbs.push({ label: cfg.titulo, href: `/${first}` });
    matched = true;
  }

  // Sub-rutas.
  if (matched && parts.length > 1) {
    const rest = parts.slice(1);

    // /seccion/:id/accion  (catálogo con detalle)
    if (isCatalog && rest.length >= 1) {
      const id = rest[0];
      const detalle = crumbDetalleCatalogo(first, id, t);
      if (detalle) crumbs.push(detalle);

      if (rest.length >= 2) {
        const action = rest[1];
        crumbs.push({
          label: (t.migas.acciones as Record<string, string>)[action] ?? action,
          href: action ? undefined : undefined,
        });
      }
      return crumbs;
    }

    // Manual: /manual/:id → usa título real del capítulo si existe
    if (first === "manual" && rest.length >= 1) {
      const capId = rest[0];
      const titulo = tituloManual(capId, idiomaActual());
      crumbs.push({
        label: titulo ?? (t.migas.acciones as Record<string, string>)[capId] ?? legible(capId),
      });
      return crumbs;
    }

    // /seccion/accion  (ej. /movimientos/nuevo, /inventario/nuevo)
    const action = rest[0];
    crumbs.push({ label: (t.migas.acciones as Record<string, string>)[action] ?? action });
    return crumbs;
  }

  // Ruta no mapeada: usamos cada segmento como crumb legible.
  if (!matched) {
    for (const part of parts) {
      crumbs.push({ label: legible(part), href: undefined });
    }
  }

  return crumbs;
}

/**
 * Resuelve el crumb de un detalle de catálogo. Los datos reales son
 * asíncronos (react-query) y `crumbsFromPath` es una función pura y
 * síncrona, así que aquí solo se arma un label genérico con el id — el
 * título real ya se muestra en el `PageHeader` de la página de detalle.
 */
function crumbDetalleCatalogo(slug: string, id: string, t: Diccionario): Crumb | null {
  const cfg = catalogosDe(t)[slug];
  if (!cfg) return null;
  return { label: `${cfg.singular} ${id.slice(0, 8)}`, href: `/${slug}/${id}` };
}

function tituloManual(id: string, idioma: Idioma): string | null {
  for (const parte of manualPartes(idioma)) {
    const cap = parte.capitulos.find((c) => c.id === id);
    if (cap) return cap.titulo;
  }
  return null;
}

/** Convierte un slug de ruta en texto legible (kebab-case -> Capitalizado). */
function legible(part: string): string {
  const word = part.replace(/[-_]/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
  return word || part;
}
