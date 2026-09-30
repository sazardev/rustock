import type { GrupoCajas } from "./cajas";
import type { CeldaMeta, GruposRacks } from "./construirRack";

export interface CeldasConMetas {
  celdas: GrupoCajas;
  metas: CeldaMeta[];
}

/** Separa las celdas en las que tienen stock dibujado y las demas, conservando
 * la agrupacion por rack (`inicios`) que espera `useCajasInstanciadas`. */
const nuevo = (): CeldasConMetas => ({ celdas: { cajas: [], inicios: [0] }, metas: [] });

export function partirCeldas(
  grupos: GruposRacks,
  conStock: ReadonlySet<string>,
): { vacias: CeldasConMetas; llenas: CeldasConMetas } {
  const vacias = nuevo();
  const llenas = nuevo();
  const nRacks = grupos.celdas.inicios.length - 1;
  for (let r = 0; r < nRacks; r++) {
    for (let i = grupos.celdas.inicios[r]; i < grupos.celdas.inicios[r + 1]; i++) {
      const destino = conStock.has(grupos.metas[i].ubicacionId) ? llenas : vacias;
      destino.celdas.cajas.push(grupos.celdas.cajas[i]);
      destino.metas.push(grupos.metas[i]);
    }
    vacias.celdas.inicios.push(vacias.celdas.cajas.length);
    llenas.celdas.inicios.push(llenas.celdas.cajas.length);
  }
  return { vacias, llenas };
}
