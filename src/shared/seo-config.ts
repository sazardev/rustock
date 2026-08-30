import { AYUDA_GRUPOS } from "../pages/ayuda/ayuda-data";
import type { Diccionario } from "./i18n";

const BASE_URL = "https://rustock.app";

export interface SeoConfig {
  title: string;
  description: string;
  canonical: string;
  robots: string;
  ogType: "website" | "article" | "product";
  ogImage: string;
  keywords?: string;
  jsonLd?: object | object[];
}

function canonical(path: string): string {
  return `${BASE_URL}${path === "/" ? "/" : path.replace(/\/$/, "")}`;
}

const OG_IMAGE = `${BASE_URL}/og-image.png`;

// --- SEO base para páginas públicas indexables ---
//
// Todo se construye con el diccionario activo: título y descripción son lo que
// ve el buscador y lo que aparece en la pestaña, así que siguen al idioma como
// el resto de la interfaz.

export function seoLanding(t: Diccionario): SeoConfig {
  return {
    title: t.seo.landingTitulo,
    description: t.seo.landingDesc,
    canonical: canonical("/"),
    robots: "index, follow, max-image-preview:large",
    ogType: "website",
    ogImage: OG_IMAGE,
    keywords: t.seo.landingKeywords,
  };
}

function seoAyudaIndex(t: Diccionario): SeoConfig {
  return {
    title: t.seo.ayudaIndexTitulo,
    description: t.seo.ayudaIndexDesc,
    canonical: canonical("/ayuda"),
    robots: "index, follow, max-image-preview:large",
    ogType: "website",
    ogImage: OG_IMAGE,
    keywords: t.seo.ayudaIndexKeywords,
  };
}

function seoAyudaGlosario(t: Diccionario): SeoConfig {
  return {
    title: t.seo.glosarioTitulo,
    description: t.seo.glosarioDesc,
    canonical: canonical("/ayuda/glosario"),
    robots: "index, follow, max-image-preview:large",
    ogType: "website",
    ogImage: OG_IMAGE,
    keywords: t.seo.glosarioKeywords,
  };
}

function seoGaleria(t: Diccionario): SeoConfig {
  return {
    title: t.seo.galeriaTitulo,
    description: t.seo.galeriaDesc,
    canonical: canonical("/galeria"),
    robots: "index, follow, max-image-preview:large",
    ogType: "website",
    ogImage: OG_IMAGE,
  };
}

// Páginas de auth — no indexables pero con buen título cuando el usuario llega
export function seoLogin(t: Diccionario): SeoConfig {
  return {
    title: t.seo.loginTitulo,
    description: t.seo.loginDescLarga,
    canonical: canonical("/login"),
    robots: "noindex, nofollow",
    ogType: "website",
    ogImage: OG_IMAGE,
  };
}

export function seoBootstrap(t: Diccionario): SeoConfig {
  return {
    title: t.seo.adminTitulo,
    description: t.seo.adminDescLarga,
    canonical: canonical("/configurar-administrador"),
    robots: "noindex, nofollow",
    ogType: "website",
    ogImage: OG_IMAGE,
  };
}

// Fallback para rutas privadas (dashboard, movimientos, etc.) — no indexables
function seoPrivado(t: Diccionario, titulo: string, descripcion: string, path: string): SeoConfig {
  return {
    title: t.seo.conMarca({ titulo }),
    description: descripcion,
    canonical: canonical(path),
    robots: "noindex, nofollow",
    ogType: "website",
    ogImage: OG_IMAGE,
  };
}

function seoPrivadas(t: Diccionario): Record<string, SeoConfig> {
  const p = t.seo.privadas;
  return {
    "/dashboard": seoPrivado(t, t.nav.dashboard, p.dashboard, "/dashboard"),
    "/movimientos": seoPrivado(t, t.nav.movimientos, p.movimientos, "/movimientos"),
    "/inventario": seoPrivado(t, t.nav.inventario, p.inventario, "/inventario"),
    "/alertas": seoPrivado(t, t.nav.alertas, p.alertas, "/alertas"),
    "/reportes": seoPrivado(t, t.nav.reportes, p.reportes, "/reportes"),
    "/historial": seoPrivado(t, t.nav.historial, p.historial, "/historial"),
    "/usuarios": seoPrivado(t, t.nav.usuarios, p.usuarios, "/usuarios"),
    "/perfil": seoPrivado(t, t.perfil.titulo, p.perfil, "/perfil"),
    "/configuracion": seoPrivado(t, t.nav.configuracion, p.configuracion, "/configuracion"),
  };
}

// Mapa de ayudas — se genera desde la fuente de verdad
function seoAyudaModulos(t: Diccionario): Record<string, SeoConfig> {
  return Object.fromEntries(
    AYUDA_GRUPOS.flatMap((grupo) => grupo.modulos).map((modulo) => {
      const path = `/ayuda/${modulo.id}`;
      return [
        path,
        {
          title: t.seo.ayudaModulo({ titulo: modulo.titulo }),
          description: modulo.resumen,
          canonical: canonical(path),
          robots: "index, follow, max-image-preview:large",
          ogType: "article" as const,
          ogImage: OG_IMAGE,
          keywords: (modulo.terminosClave ?? []).join(", "),
        } satisfies SeoConfig,
      ];
    }),
  );
}

export function seoParaRuta(pathname: string, t: Diccionario): SeoConfig {
  const limpio = pathname.replace(/\/$/, "") || "/";

  // Exacto
  if (limpio === "/") return seoLanding(t);
  const privadas = seoPrivadas(t);
  if (privadas[limpio]) return privadas[limpio];
  const modulos = seoAyudaModulos(t);
  if (modulos[limpio]) return modulos[limpio];
  if (limpio === "/ayuda") return seoAyudaIndex(t);
  if (limpio === "/ayuda/glosario") return seoAyudaGlosario(t);
  if (limpio === "/galeria") return seoGaleria(t);
  if (limpio === "/login") return seoLogin(t);
  if (limpio === "/configurar-administrador") return seoBootstrap(t);

  // Prefijos — ayudas y reportes indexables con patrón
  if (limpio.startsWith("/ayuda/")) {
    // Módulo desconocido: fallback indexable genérico
    return {
      title: t.seo.ayudaGenericaTitulo,
      description: t.seo.ayudaGenericaDesc,
      canonical: canonical(limpio),
      robots: "index, follow",
      ogType: "article",
      ogImage: OG_IMAGE,
    };
  }
  if (limpio.startsWith("/reportes")) {
    return seoPrivado(t, t.seo.reporteGenerico, t.seo.reporteGenericoDesc, limpio);
  }

  // Catálogos y entidades — privados, con título según slug
  const segmentos = limpio.split("/").filter(Boolean);
  if (segmentos.length >= 1) {
    const slug = segmentos[0];
    const mapaSlugTitulo: Record<string, string> = {
      almacenes: t.nav.almacenes,
      zonas: t.nav.zonas,
      pasillos: t.nav.pasillos,
      racks: t.nav.racks,
      secciones: t.nav.secciones,
      ubicaciones: t.nav.ubicaciones,
      cajas: t.nav.cajas,
      productos: t.nav.productos,
      lotes: t.nav.lotes,
      categorias: t.nav.categorias,
      uoms: t.nav.uoms,
      proveedores: t.nav.proveedores,
      clientes: t.nav.clientes,
      sucursales: t.nav.sucursales,
    };
    if (mapaSlugTitulo[slug]) {
      return seoPrivado(
        t,
        mapaSlugTitulo[slug],
        t.seo.gestionDe({ entidad: mapaSlugTitulo[slug].toLocaleLowerCase() }),
        limpio,
      );
    }
  }

  // 404 y resto privado
  if (limpio === "/no-encontrado" || limpio === "/acceso-no-permitido") {
    return {
      title: t.seo.conMarca({ titulo: t.paginas.noEncontrada }),
      description: t.seo.noEncontradaDesc,
      canonical: canonical(limpio),
      robots: "noindex, nofollow",
      ogType: "website",
      ogImage: OG_IMAGE,
    };
  }

  return seoPrivado(t, "Rustock", t.seo.landingDesc, limpio);
}

export { BASE_URL, OG_IMAGE };
