/** Medidas verticales de un rack con los valores por defecto del contrato. */
import { RACK_DEFECTO } from "../reglas";

interface EntradaMedidas {
  niveles?: number | null;
  alto_nivel?: number | null;
  alto_base?: number | null;
  altura?: number | null;
}

export interface MedidasRack {
  niveles: number;
  altoNivel: number;
  altoBase: number;
  /** Altura total: la explicita o base + niveles x alto_nivel. */
  altura: number;
}

export function medidasRack(r: EntradaMedidas): MedidasRack {
  const niveles = r.niveles && r.niveles > 0 ? r.niveles : RACK_DEFECTO.niveles;
  const altoNivel = r.alto_nivel && r.alto_nivel > 0 ? r.alto_nivel : RACK_DEFECTO.altoNivel;
  const altoBase = r.alto_base ?? RACK_DEFECTO.altoBase;
  return { niveles, altoNivel, altoBase, altura: r.altura ?? altoBase + niveles * altoNivel };
}
