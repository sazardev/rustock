/** Capas del lienzo 2D: visibilidad y bloqueo por tipo, y contenido de etiquetas. */
import type { TipoNodo } from "../nodo-tipos";

export const TIPOS_CAPA: TipoNodo[] = ["zona", "pasillo", "rack", "ubicacion"];

export type EtiquetaNodo = "completa" | "codigo" | "ocupacion" | "sku";
export const ETIQUETAS_NODO: EtiquetaNodo[] = ["completa", "codigo", "ocupacion", "sku"];

export interface CapasMapa {
  visible: Record<TipoNodo, boolean>;
  bloqueado: Record<TipoNodo, boolean>;
  etiqueta: EtiquetaNodo;
}

const porTipo = (valor: boolean): Record<TipoNodo, boolean> => ({
  zona: valor,
  pasillo: valor,
  rack: valor,
  ubicacion: valor,
});

export const CAPAS_DEFECTO: CapasMapa = {
  visible: porTipo(true),
  bloqueado: porTipo(false),
  etiqueta: "completa",
};

/** Clave propia del 2D: no comparte objeto con `rustock.mapa3d`. */
export const CLAVE_CAPAS = "rustock.mapa2d";

function leerPorTipo(
  crudo: unknown,
  defecto: Record<TipoNodo, boolean>,
): Record<TipoNodo, boolean> {
  const fuente = (typeof crudo === "object" && crudo ? crudo : {}) as Record<string, unknown>;
  const salida = { ...defecto };
  for (const tipo of TIPOS_CAPA) {
    if (typeof fuente[tipo] === "boolean") {
      salida[tipo] = fuente[tipo];
    }
  }
  return salida;
}

/** Tolera datos viejos, incompletos o corruptos: lo inválido cae al defecto. */
export function normalizarCapas(crudo: unknown): CapasMapa {
  const o = (typeof crudo === "object" && crudo ? crudo : {}) as Record<string, unknown>;
  const etiqueta = ETIQUETAS_NODO.find((e) => e === o.etiqueta) ?? CAPAS_DEFECTO.etiqueta;
  return {
    visible: leerPorTipo(o.visible, CAPAS_DEFECTO.visible),
    bloqueado: leerPorTipo(o.bloqueado, CAPAS_DEFECTO.bloqueado),
    etiqueta,
  };
}
