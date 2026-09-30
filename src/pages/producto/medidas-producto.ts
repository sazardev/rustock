/**
 * Medidas del producto (largo/ancho/alto en cm) para el formulario: esquema
 * zod y conversión a número. Opcionales; si se capturan deben ser > 0.
 */
import { z } from "zod";

export const CLAVES_MEDIDA = ["largo_cm", "ancho_cm", "alto_cm"] as const;
export type ClaveMedida = (typeof CLAVES_MEDIDA)[number];

/** Campo de texto opcional que, si trae valor, debe ser un número > 0. */
export function medidaOpcional(mensaje: string) {
  return z
    .string()
    .optional()
    .refine((v) => {
      if (!v || v.trim() === "") return true;
      const n = Number(v);
      return Number.isFinite(n) && n > 0;
    }, mensaje);
}

export function esquemaMedidas(mensaje: string) {
  return {
    largo_cm: medidaOpcional(mensaje),
    ancho_cm: medidaOpcional(mensaje),
    alto_cm: medidaOpcional(mensaje),
  };
}

export const MEDIDAS_VACIAS: Record<ClaveMedida, string> = {
  largo_cm: "",
  ancho_cm: "",
  alto_cm: "",
};

export function medidasAValores(
  p: Record<ClaveMedida, number | null>,
): Record<ClaveMedida, string> {
  return {
    largo_cm: p.largo_cm?.toString() ?? "",
    ancho_cm: p.ancho_cm?.toString() ?? "",
    alto_cm: p.alto_cm?.toString() ?? "",
  };
}

/** Texto -> número o null (vacío). En edición null significa "no tocar". */
export function medidaANumero(valor: string | undefined): number | null {
  if (!valor || valor.trim() === "") return null;
  const n = Number(valor);
  return Number.isFinite(n) && n > 0 ? n : null;
}

export function medidasANumeros(v: Partial<Record<ClaveMedida, string>>) {
  return {
    largo_cm: medidaANumero(v.largo_cm),
    ancho_cm: medidaANumero(v.ancho_cm),
    alto_cm: medidaANumero(v.alto_cm),
  };
}
