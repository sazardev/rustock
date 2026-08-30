import { useEffect } from "react";
import { useLocation } from "react-router";
import { type SeoConfig, seoParaRuta } from "./seo-config";
import { traducir, useT } from "./i18n";

const SEO_JSONLD_ID = "seo-jsonld";

function upsertMeta(selector: string, create: () => HTMLMetaElement): HTMLMetaElement {
  let el = document.head.querySelector(selector) as HTMLMetaElement | null;
  if (!el) {
    el = create();
    document.head.appendChild(el);
  }
  return el;
}

function upsertLink(rel: string): HTMLLinkElement {
  let el = document.head.querySelector(`link[rel="${rel}"]`) as HTMLLinkElement | null;
  if (!el) {
    el = document.createElement("link");
    el.rel = rel;
    document.head.appendChild(el);
  }
  return el;
}

function aplicarSeo(config: SeoConfig): void {
  const { title, description, canonical, robots, ogType, ogImage, keywords } = config;

  // Title + description
  document.title = title;

  const desc = upsertMeta('meta[name="description"]', () => {
    const m = document.createElement("meta");
    m.name = "description";
    return m;
  });
  desc.content = description;

  if (keywords) {
    const kw = upsertMeta('meta[name="keywords"]', () => {
      const m = document.createElement("meta");
      m.name = "keywords";
      return m;
    });
    kw.content = keywords;
  }

  // Robots
  const robotsTag = upsertMeta('meta[name="robots"]', () => {
    const m = document.createElement("meta");
    m.name = "robots";
    return m;
  });
  robotsTag.content = robots;

  // Canonical
  const can = upsertLink("canonical");
  can.href = canonical;

  // Open Graph
  const ogTitle = upsertMeta('meta[property="og:title"]', () => {
    const m = document.createElement("meta");
    m.setAttribute("property", "og:title");
    return m;
  });
  ogTitle.content = title;

  const ogDesc = upsertMeta('meta[property="og:description"]', () => {
    const m = document.createElement("meta");
    m.setAttribute("property", "og:description");
    return m;
  });
  ogDesc.content = description;

  const ogUrl = upsertMeta('meta[property="og:url"]', () => {
    const m = document.createElement("meta");
    m.setAttribute("property", "og:url");
    return m;
  });
  ogUrl.content = canonical;

  const ogTypeTag = upsertMeta('meta[property="og:type"]', () => {
    const m = document.createElement("meta");
    m.setAttribute("property", "og:type");
    return m;
  });
  ogTypeTag.content = ogType;

  const ogImg = upsertMeta('meta[property="og:image"]', () => {
    const m = document.createElement("meta");
    m.setAttribute("property", "og:image");
    return m;
  });
  ogImg.content = ogImage;

  const twTitle = upsertMeta('meta[name="twitter:title"]', () => {
    const m = document.createElement("meta");
    m.name = "twitter:title";
    return m;
  });
  twTitle.content = title;

  const twDesc = upsertMeta('meta[name="twitter:description"]', () => {
    const m = document.createElement("meta");
    m.name = "twitter:description";
    return m;
  });
  twDesc.content = description;

  const twImg = upsertMeta('meta[name="twitter:image"]', () => {
    const m = document.createElement("meta");
    m.name = "twitter:image";
    return m;
  });
  twImg.content = ogImage;

  // JSON-LD específico de la ruta (si existe)
  const prev = document.getElementById(SEO_JSONLD_ID);
  if (prev) prev.remove();
  if (config.jsonLd) {
    const arr = Array.isArray(config.jsonLd) ? config.jsonLd : [config.jsonLd];
    for (const obj of arr) {
      const script = document.createElement("script");
      script.type = "application/ld+json";
      script.id = SEO_JSONLD_ID;
      script.textContent = JSON.stringify(obj);
      document.head.appendChild(script);
    }
  }
}

export interface SeoProps extends Partial<SeoConfig> {
  /** Si se pasa, ignora seoParaRuta y usa este config directo */
  config?: SeoConfig;
}

/**
 * Componente declarativo: actualiza <title>, meta description, canonical,
 * OG/Twitter y JSON-LD en el <head> al montar/cambiar props.
 * Sin dependencias externas (no react-helmet): DOM puro, 0 KB extra.
 */
export function Seo(props: SeoProps) {
  const location = useLocation();
  const t = useT();
  const base = props.config ?? seoParaRuta(location.pathname, t);

  const merged = useSeoMerged(base, props);

  useEffect(() => {
    aplicarSeo(merged);
  }, [merged]);

  return null;
}

function useSeoMerged(base: SeoConfig, props: SeoProps): SeoConfig {
  const { title, description, canonical, robots, ogType, ogImage, keywords, jsonLd } = props;
  // `useMemo` estabiliza `merged` para exhaustive-deps sin bucle.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  return {
    ...base,
    ...props,
    title: title ?? base.title,
    description: description ?? base.description,
    canonical: canonical ?? base.canonical,
    robots: robots ?? base.robots,
    ogType: (ogType as SeoConfig["ogType"]) ?? base.ogType,
    ogImage: ogImage ?? base.ogImage,
    keywords: keywords ?? base.keywords,
    jsonLd: jsonLd ?? base.jsonLd,
  };
}

/**
 * Hook imperativo para páginas que necesitan SEO dinámico
 * (ej. detalle de producto con nombre real).
 */
export function useSeo(config: Partial<SeoConfig> & { title: string; description: string }): void {
  const location = useLocation();
  const t = useT();
  const base = seoParaRuta(location.pathname, t);
  // `config` es un objeto nuevo cada render; extraemos primitivos para deps estables.
  const { title, description, canonical, robots, keywords, ogType, ogImage, jsonLd } = config;
  useEffect(() => {
    aplicarSeo({
      ...base,
      title,
      description,
      canonical: canonical ?? base.canonical,
      robots: robots ?? base.robots,
      keywords: keywords ?? base.keywords,
      ogType: (ogType as SeoConfig["ogType"]) ?? base.ogType,
      ogImage: ogImage ?? base.ogImage,
      jsonLd: jsonLd ?? base.jsonLd,
    });
  }, [base, title, description, canonical, robots, keywords, ogType, ogImage, jsonLd]);
}

/**
 * Manager global: observa cambios de ruta y aplica el SEO base
 * sin que cada página tenga que montar <Seo />. Usado en AppLayout / Landing.
 */
export function SeoManager(): null {
  const location = useLocation();
  const t = useT();
  useEffect(() => {
    aplicarSeo(seoParaRuta(location.pathname, t));
  }, [location.pathname, t]);
  return null;
}

// Helpers para JSON-LD tipados
export function jsonLdBreadcrumb(items: Array<{ name: string; url: string }>): object {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: item.url,
    })),
  };
}

export function jsonLdFaq(preguntas: Array<{ pregunta: string; respuesta: string }>): object {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: preguntas.map((p) => ({
      "@type": "Question",
      name: p.pregunta,
      acceptedAnswer: { "@type": "Answer", text: p.respuesta },
    })),
  };
}

export function jsonLdSoftwareApplication(): object {
  return {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: "Rustock",
    applicationCategory: "BusinessApplication",
    operatingSystem: "Windows, macOS, Linux",
    description: traducir().seo.aplicacionDesc,
    url: "https://rustock.app",
    image: "https://rustock.app/og-image.png",
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "USD",
      availability: "https://schema.org/InStock",
    },
    author: { "@type": "Organization", name: "Rustock", url: "https://rustock.app" },
  };
}
