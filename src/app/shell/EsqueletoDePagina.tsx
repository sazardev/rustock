import { Skeleton } from "../../shared/ui";

/**
 * Silueta de la ruta mientras se descarga su fragmento. Reproduce la forma
 * real de una página — bloque de título, franja de filtros, tabla — para que
 * la transición no cambie de composición al llegar el contenido: lo que se
 * mueve es el detalle, no el esqueleto (DESIGN §5.6, §8.5).
 */
export function EsqueletoDePagina() {
  return (
    <div aria-hidden="true">
      <Skeleton variant="title" className="mb-2" />
      <Skeleton variant="text" />
      <Skeleton variant="panel" className="mt-8" />
    </div>
  );
}
