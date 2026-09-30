/**
 * Dimensiones de un producto en cm (1 unidad de mapa = 1 cm) para dibujarlo
 * a tamano real en el mapa 3D. Pura.
 *
 * Supuesto de unidad de `volumen_unitario`: METROS CUBICOS (m3). Evidencia:
 *  - UI: la etiqueta del formulario es "Volumen unitario (m3)" / "Unit volume
 *    (m3)" (src/shared/i18n/es.ts y en.ts, `volumenUnitario`).
 *  - Manual: "volumen_unitario (m3)" en manual-contenido.es.ts / .en.ts.
 *  - El backend solo lo guarda como f64 (domain/catalogo.rs) y el seed lo deja
 *    en None, asi que no contradice la etiqueta.
 * Conversion: 1 m3 = 1_000_000 cm3.
 */
import type { Producto } from "../../../shared/types";

export type OrigenDimensiones = "medido" | "volumen" | "estimado";

export interface DimensionesProducto {
  largo: number;
  ancho: number;
  alto: number;
  origen: OrigenDimensiones;
}

export type MedidasProducto = Pick<
  Producto,
  "largo_cm" | "ancho_cm" | "alto_cm" | "volumen_unitario"
>;

/** Caja por defecto (cm) cuando no hay ningun dato. */
export const CAJA_POR_DEFECTO = { largo: 30, ancho: 20, alto: 15 } as const;

const CM3_POR_M3 = 1_000_000;

function positivo(v: number | null | undefined): number | null {
  return typeof v === "number" && Number.isFinite(v) && v > 0 ? v : null;
}

function mediana(valores: number[]): number {
  const s = valores.toSorted((a, b) => a - b);
  const m = s.length >> 1;
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}

export function dimensionesProducto(p: MedidasProducto): DimensionesProducto {
  const medidas = [positivo(p.largo_cm), positivo(p.ancho_cm), positivo(p.alto_cm)];
  const presentes = medidas.filter((v): v is number => v !== null);

  if (presentes.length === 3) {
    return { largo: presentes[0], ancho: presentes[1], alto: presentes[2], origen: "medido" };
  }
  if (presentes.length > 0) {
    const relleno = mediana(presentes);
    const [largo, ancho, alto] = medidas.map((v) => v ?? relleno);
    return { largo, ancho, alto, origen: "estimado" };
  }
  const volumenM3 = positivo(p.volumen_unitario);
  if (volumenM3 !== null) {
    const arista = Math.cbrt(volumenM3 * CM3_POR_M3);
    return { largo: arista, ancho: arista, alto: arista, origen: "volumen" };
  }
  return { ...CAJA_POR_DEFECTO, origen: "estimado" };
}
