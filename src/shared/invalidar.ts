import type { QueryClient } from "@tanstack/react-query";

/**
 * Invalida la caché de un recurso tras una mutación que lo altera (SPEC: todo
 * listado refleja el estado actual; el saldo y los listados son derivados).
 *
 * Cada recurso tiene tres familias de query keys (ver páginas y `refs.tsx`):
 *   ["catalogo", plural, ...]  → listados del motor universal (CatalogListPage)
 *   [plural, ...]              → selectores de formulario y reportes
 *   [singular, ...]            → detalle y referencias enlazadas (`<XRef>`)
 *
 * Con `refetchOnMount: "always"` (App.tsx) todo listado al que se vuelve se
 * re-fetcha; invalidar aquí además refresca las consultas dependientes
 * (selectores, dashboard, referencias) sin esperar a re-montar la pantalla.
 */
export function invalidarRecurso(
  queryClient: QueryClient,
  plural: string,
  singular?: string,
): void {
  void queryClient.invalidateQueries({ queryKey: ["catalogo", plural] });
  void queryClient.invalidateQueries({ queryKey: [plural] });
  if (singular) void queryClient.invalidateQueries({ queryKey: [singular] });
}
