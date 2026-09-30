/** Losas de zona: cada zona toma un token distinto del ciclo, para que se
 * distingan entre si sin salirse de la paleta. */
const CICLO_ZONAS = [
  "--color-blue-100",
  "--color-success-bg",
  "--color-info-bg",
  "--color-gray-100",
] as const;

export function colorDeZona(indice: number): string {
  return CICLO_ZONAS[indice % CICLO_ZONAS.length];
}
