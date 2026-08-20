import { AYUDA_GRUPOS } from "../pages/ayuda/ayuda-data";

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

export const SEO_LANDING: SeoConfig = {
  title: "Rustock — WMS self-hosted para control total de tu almacén",
  description:
    "WMS self-hosted todo en uno: stock en tiempo real, lotes con FIFO/FEFO, trazabilidad inmutable y sin nube. Una instalación, un archivo SQLite. Tu almacén bajo control.",
  canonical: canonical("/"),
  robots: "index, follow, max-image-preview:large",
  ogType: "website",
  ogImage: OG_IMAGE,
  keywords:
    "wms, sga, gestión de almacén, control de inventario, stock, inventario físico, lotes, FIFO, FEFO, trazabilidad, kardex, self-hosted, rustock",
};

export const SEO_AYUDA_INDEX: SeoConfig = {
  title: "Ayuda de Rustock — 26 guías para dominar tu almacén",
  description:
    "Documentación completa de Rustock: 26 guías por módulo, 6 procesos de negocio, primeros pasos y glosario de 46 términos. Todo lo que hace la app, tal cual funciona.",
  canonical: canonical("/ayuda"),
  robots: "index, follow, max-image-preview:large",
  ogType: "website",
  ogImage: OG_IMAGE,
  keywords: "ayuda rustock, documentación wms, guía inventario, manual almacén",
};

export const SEO_AYUDA_GLOSARIO: SeoConfig = {
  title: "Glosario de Rustock — 46 términos de almacén y logística",
  description:
    "Glosario del dominio de Rustock: SKU, lote, FIFO, FEFO, ubicación, saldo, movimiento, inventario físico y 40 términos más, enlazados desde cada guía.",
  canonical: canonical("/ayuda/glosario"),
  robots: "index, follow, max-image-preview:large",
  ogType: "website",
  ogImage: OG_IMAGE,
  keywords: "glosario wms, términos almacén, SKU, lote, FIFO, FEFO, inventario",
};

export const SEO_GALERIA: SeoConfig = {
  title: "Galería — Sistema de diseño Rust & Iron de Rustock",
  description:
    "Componentes, tokens y patrones del sistema de diseño Rust & Iron de Rustock. Una referencia visual del producto, sin humo: lo que ves es lo que hay.",
  canonical: canonical("/galeria"),
  robots: "index, follow, max-image-preview:large",
  ogType: "website",
  ogImage: OG_IMAGE,
};

// Páginas de auth — no indexables pero con buen título cuando el usuario llega
export const SEO_LOGIN: SeoConfig = {
  title: "Iniciar sesión — Rustock",
  description:
    "Accede a tu almacén Rustock. Gestión self-hosted de inventario: stock, movimientos, lotes y trazabilidad en tu infraestructura.",
  canonical: canonical("/login"),
  robots: "noindex, nofollow",
  ogType: "website",
  ogImage: OG_IMAGE,
};

export const SEO_BOOTSTRAP: SeoConfig = {
  title: "Configurar administrador — Rustock",
  description:
    "Primer arranque de Rustock: crea el usuario administrador y toma el control de tu almacén. Sin nube, sin esperas.",
  canonical: canonical("/configurar-administrador"),
  robots: "noindex, nofollow",
  ogType: "website",
  ogImage: OG_IMAGE,
};

// Fallback para rutas privadas (dashboard, movimientos, etc.) — no indexables
function seoPrivado(titulo: string, descripcion: string, path: string): SeoConfig {
  return {
    title: `${titulo} — Rustock`,
    description: descripcion,
    canonical: canonical(path),
    robots: "noindex, nofollow",
    ogType: "website",
    ogImage: OG_IMAGE,
  };
}

const SEO_PRIVADAS: Record<string, SeoConfig> = {
  "/dashboard": seoPrivado(
    "Dashboard",
    "Indicadores de tu almacén: SKUs, unidades, alertas, movimientos de hoy y precisión de inventario.",
    "/dashboard",
  ),
  "/movimientos": seoPrivado(
    "Movimientos",
    "Entradas, salidas, traslados y ajustes de stock con trazabilidad inmutable.",
    "/movimientos",
  ),
  "/inventario": seoPrivado(
    "Inventario físico",
    "Sesiones de conteo: completo, cíclico, conteo ciego y doble conteo con precisión medida.",
    "/inventario",
  ),
  "/alertas": seoPrivado(
    "Alertas",
    "Stock bajo, vencimientos y movimientos pendientes por resolver.",
    "/alertas",
  ),
  "/reportes": seoPrivado(
    "Reportes",
    "Stock actual, movimientos, vencimientos, kardex, precisión y auditoría — filtrables y exportables.",
    "/reportes",
  ),
  "/historial": seoPrivado(
    "Historial de actividad",
    "Tracking total: qué se hizo, cuándo, quién y desde dónde. Análisis profundo del uso del sistema.",
    "/historial",
  ),
  "/usuarios": seoPrivado(
    "Usuarios y roles",
    "Gestión de usuarios, roles y permisos granulares.",
    "/usuarios",
  ),
  "/perfil": seoPrivado("Mi perfil", "Tus datos, preferencias y cambio de contraseña.", "/perfil"),
  "/configuracion": seoPrivado(
    "Configuración",
    "Empresa, sucursales, parámetros, archivos y preferencias del sistema.",
    "/configuracion",
  ),
};

// Mapa de ayudas — se genera desde la fuente de verdad
const SEO_AYUDA_MODULOS: Record<string, SeoConfig> = Object.fromEntries(
  AYUDA_GRUPOS.flatMap((grupo) => grupo.modulos).map((modulo) => {
    const path = `/ayuda/${modulo.id}`;
    return [
      path,
      {
        title: `${modulo.titulo} — Ayuda de Rustock`,
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

export function seoParaRuta(pathname: string): SeoConfig {
  const limpio = pathname.replace(/\/$/, "") || "/";

  // Exacto
  if (limpio === "/") return SEO_LANDING;
  if (SEO_PRIVADAS[limpio]) return SEO_PRIVADAS[limpio];
  if (SEO_AYUDA_MODULOS[limpio]) return SEO_AYUDA_MODULOS[limpio];
  if (limpio === "/ayuda") return SEO_AYUDA_INDEX;
  if (limpio === "/ayuda/glosario") return SEO_AYUDA_GLOSARIO;
  if (limpio === "/galeria") return SEO_GALERIA;
  if (limpio === "/login") return SEO_LOGIN;
  if (limpio === "/configurar-administrador") return SEO_BOOTSTRAP;

  // Prefijos — ayudas y reportes indexables con patrón
  if (limpio.startsWith("/ayuda/")) {
    // Módulo desconocido: fallback indexable genérico
    return {
      title: "Ayuda — Rustock",
      description: "Guías de Rustock: aprende a operar tu almacén con control total.",
      canonical: canonical(limpio),
      robots: "index, follow",
      ogType: "article",
      ogImage: OG_IMAGE,
    };
  }
  if (limpio.startsWith("/reportes")) {
    return seoPrivado(
      "Reporte",
      "Análisis y reportes del almacén, filtrables y exportables.",
      limpio,
    );
  }

  // Catálogos y entidades — privados, con título según slug
  const segmentos = limpio.split("/").filter(Boolean);
  if (segmentos.length >= 1) {
    const slug = segmentos[0];
    const mapaSlugTitulo: Record<string, string> = {
      almacenes: "Almacenes",
      zonas: "Zonas",
      pasillos: "Pasillos",
      racks: "Racks",
      secciones: "Secciones",
      ubicaciones: "Ubicaciones",
      cajas: "Cajas",
      productos: "Productos",
      lotes: "Lotes",
      categorias: "Categorías",
      uoms: "Unidades de medida",
      proveedores: "Proveedores",
      clientes: "Clientes",
      sucursales: "Sucursales",
    };
    if (mapaSlugTitulo[slug]) {
      return seoPrivado(
        mapaSlugTitulo[slug],
        `Gestión de ${mapaSlugTitulo[slug].toLowerCase()} en tu almacén.`,
        limpio,
      );
    }
  }

  // 404 y resto privado
  if (limpio === "/no-encontrado" || limpio === "/acceso-no-permitido") {
    return {
      title: "Página no encontrada — Rustock",
      description: "La página que buscas no existe o fue movida. Vuelve al dashboard o a la ayuda.",
      canonical: canonical(limpio),
      robots: "noindex, nofollow",
      ogType: "website",
      ogImage: OG_IMAGE,
    };
  }

  return seoPrivado("Rustock", SEO_LANDING.description, limpio);
}

export { BASE_URL, OG_IMAGE };
