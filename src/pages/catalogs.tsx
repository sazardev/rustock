import { useMemo } from "react";
import { useParams } from "react-router";
import { CatalogDetailPage, CatalogEliminarPage, CatalogListPage } from "./CatalogPages";
import { catalogosDe } from "./catalog-adapters";
import { useT } from "../shared/i18n";

export { catalogosDe, SLUGS_CATALOGO } from "./catalog-adapters";

/**
 * Adaptador del catálogo pedido, en el idioma activo (SPEC §17).
 *
 * Se memoiza por diccionario: reconstruir los trece adaptadores en cada render
 * crearía columnas nuevas cada vez y la tabla perdería su estado.
 */
function useCatalogo(slug: string) {
  const t = useT();
  const catalogos = useMemo(() => catalogosDe(t), [t]);
  return catalogos[slug];
}

export function CatalogListRoute({ catalog }: { catalog: string }) {
  return <CatalogListPage adapter={useCatalogo(catalog)} slug={catalog} />;
}

export function CatalogDetailRoute({ catalog }: { catalog: string }) {
  const { id = "" } = useParams();
  return <CatalogDetailPage adapter={useCatalogo(catalog)} slug={catalog} id={id} />;
}

export function CatalogEliminarRoute({ catalog }: { catalog: string }) {
  const { id = "" } = useParams();
  return <CatalogEliminarPage adapter={useCatalogo(catalog)} slug={catalog} id={id} />;
}
