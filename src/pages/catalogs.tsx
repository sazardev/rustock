import { useParams } from "react-router";
import { CatalogDetailPage, CatalogEliminarPage, CatalogListPage } from "./CatalogPages";
import { CATALOGOS } from "./catalog-adapters";

export { CATALOGOS } from "./catalog-adapters";

export function CatalogListRoute({ catalog }: { catalog: string }) {
  return <CatalogListPage adapter={CATALOGOS[catalog]} slug={catalog} />;
}

export function CatalogDetailRoute({ catalog }: { catalog: string }) {
  const { id = "" } = useParams();
  return <CatalogDetailPage adapter={CATALOGOS[catalog]} slug={catalog} id={id} />;
}

export function CatalogEliminarRoute({ catalog }: { catalog: string }) {
  const { id = "" } = useParams();
  return <CatalogEliminarPage adapter={CATALOGOS[catalog]} slug={catalog} id={id} />;
}
