import type { Diccionario } from "../../shared/i18n";
import type { SubTipoMovimiento, TipoMovimiento } from "../../shared/types";

/** Solo los valores: se usan para validar el parámetro de la URL, sin idioma. */
export const TIPOS_VALORES: TipoMovimiento[] = ["ENTRADA", "SALIDA", "TRASLADO", "AJUSTE"];

/** Los cuatro tipos de movimiento, en el idioma activo. */
export function tiposDe(t: Diccionario): Array<{ value: TipoMovimiento; label: string }> {
  return TIPOS_VALORES.map((value) => ({ value, label: t.dominio.tipoMovimiento[value] }));
}

/** Solo los sub-tipos que una persona elige a mano: los de traslado los
 *  genera el backend por su cuenta. */
type SubTipoElegible = keyof Diccionario["movForm"]["subTipoOpcion"];

const SUB_TIPOS_VALORES: Record<string, SubTipoElegible[]> = {
  ENTRADA: ["COMPRA", "DEVOLUCION_CLIENTE", "INICIAL"],
  SALIDA: ["CLIENTE", "DEVOLUCION_PROVEEDOR", "MERMA"],
  AJUSTE: ["AJUSTE_POSITIVO", "AJUSTE_NEGATIVO"],
};

/** Sub-tipos válidos para un tipo, ya etiquetados. */
export function subTiposDe(
  t: Diccionario,
  tipo: string,
): Array<{ value: SubTipoMovimiento; label: string }> {
  return (SUB_TIPOS_VALORES[tipo] ?? []).map((value) => ({
    value,
    label: t.movForm.subTipoOpcion[value],
  }));
}

export const REQUIERE_MOTIVO: SubTipoMovimiento[] = ["AJUSTE_POSITIVO", "AJUSTE_NEGATIVO", "MERMA"];
export const REQUIERE_PROVEEDOR: SubTipoMovimiento[] = ["COMPRA", "DEVOLUCION_PROVEEDOR"];
export const REQUIERE_CLIENTE: SubTipoMovimiento[] = ["CLIENTE", "DEVOLUCION_CLIENTE"];

export function requiereOrigen(tipo: TipoMovimiento, subTipo: SubTipoMovimiento | ""): boolean {
  return tipo === "SALIDA" || (tipo === "AJUSTE" && subTipo === "AJUSTE_NEGATIVO");
}

export function requiereDestino(tipo: TipoMovimiento, subTipo: SubTipoMovimiento | ""): boolean {
  return tipo === "ENTRADA" || (tipo === "AJUSTE" && subTipo === "AJUSTE_POSITIVO");
}

export const INVALIDAR_PRODUCTOS = ["productos", "selector-movimiento"] as const;
export const INVALIDAR_UBICACIONES = ["ubicaciones", "selector-movimiento"] as const;
export const INVALIDAR_PROVEEDORES = ["proveedores", "selector-movimiento"] as const;
export const INVALIDAR_CLIENTES = ["clientes", "selector-movimiento"] as const;
// Prefijo: invalida los lotes de cualquier producto (["lotes","por-producto",...]).
export const INVALIDAR_LOTES = ["lotes", "por-producto"] as const;
