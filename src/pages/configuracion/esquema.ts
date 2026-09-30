import { z } from "zod";
import type { Diccionario } from "../../shared/i18n";
import type { ConfiguracionEmpresa, EditarConfiguracionEmpresa } from "../../shared/types";

/**
 * El esquema depende del idioma: los mensajes de validación se pintan tal cual
 * en el campo, así que se construyen con el diccionario activo en vez de vivir
 * como literales de módulo.
 */
export function esquemaDe(t: Diccionario) {
  const entero = z
    .string()
    .refine(
      (v) => v === "" || (Number.isInteger(Number(v)) && Number(v) >= 0),
      t.configuracion.debeSerEntero,
    );
  const numero = z
    .string()
    .refine((v) => v === "" || !Number.isNaN(Number(v)), t.configuracion.debeSerNumero);

  return z.object({
    nombre: z.string().optional(),
    codigo: z.string().optional(),
    descripcion: z.string().optional(),
    pais: z.string().optional(),
    ciudad: z.string().optional(),
    direccion: z.string().optional(),
    codigo_postal: z.string().optional(),
    razon_social: z.string().optional(),
    documento_fiscal: z.string().optional(),
    direccion_fiscal: z.string().optional(),
    telefono: z.string().optional(),
    email_contacto: z.string().optional(),
    sitio_web: z.string().optional(),
    latitud: numero,
    longitud: numero,
    zona_horaria: z.string().min(1, t.configuracion.seleccionaZonaHoraria),
    formato_fecha: z.string().min(1, t.configuracion.seleccionaFormato),
    dias_aviso_vencimiento: entero,
    requiere_aprobacion: z.boolean(),
    stock_minimo_default: entero.optional(),
    tema_id: z.string().min(1, t.configuracion.seleccionaPaleta),
    modo_oscuro: z.boolean(),
  });
}

export type FormValues = z.infer<ReturnType<typeof esquemaDe>>;

export const VALORES_POR_DEFECTO: FormValues = {
  nombre: "",
  codigo: "",
  descripcion: "",
  pais: "",
  ciudad: "",
  direccion: "",
  codigo_postal: "",
  razon_social: "",
  documento_fiscal: "",
  direccion_fiscal: "",
  telefono: "",
  email_contacto: "",
  sitio_web: "",
  latitud: "",
  longitud: "",
  zona_horaria: "America/Lima",
  formato_fecha: "DD_MMM_YYYY",
  dias_aviso_vencimiento: "30",
  requiere_aprobacion: true,
  stock_minimo_default: "",
  tema_id: "rust",
  modo_oscuro: false,
};

/** Configuración guardada -> valores del formulario (todo texto). */
export function valoresDesde(config: ConfiguracionEmpresa): FormValues {
  return {
    nombre: config.nombre ?? "",
    codigo: config.codigo ?? "",
    descripcion: config.descripcion ?? "",
    pais: config.pais ?? "",
    ciudad: config.ciudad ?? "",
    direccion: config.direccion ?? "",
    codigo_postal: config.codigo_postal ?? "",
    razon_social: config.razon_social ?? "",
    documento_fiscal: config.documento_fiscal ?? "",
    direccion_fiscal: config.direccion_fiscal ?? "",
    telefono: config.telefono ?? "",
    email_contacto: config.email_contacto ?? "",
    sitio_web: config.sitio_web ?? "",
    latitud: config.latitud === null ? "" : String(config.latitud),
    longitud: config.longitud === null ? "" : String(config.longitud),
    zona_horaria: config.zona_horaria,
    formato_fecha: config.formato_fecha,
    dias_aviso_vencimiento: String(config.dias_aviso_vencimiento),
    requiere_aprobacion: config.requiere_aprobacion,
    stock_minimo_default:
      config.stock_minimo_default === null ? "" : String(config.stock_minimo_default),
    tema_id: config.tema_id,
    modo_oscuro: config.modo_oscuro,
  };
}

/** Valores del formulario -> carga para el backend. */
export function cargaDesde(v: FormValues): EditarConfiguracionEmpresa {
  return {
    nombre: v.nombre || null,
    codigo: v.codigo || null,
    descripcion: v.descripcion || null,
    pais: v.pais || null,
    ciudad: v.ciudad || null,
    direccion: v.direccion || null,
    codigo_postal: v.codigo_postal || null,
    razon_social: v.razon_social || null,
    documento_fiscal: v.documento_fiscal || null,
    direccion_fiscal: v.direccion_fiscal || null,
    telefono: v.telefono || null,
    email_contacto: v.email_contacto || null,
    sitio_web: v.sitio_web || null,
    latitud: v.latitud === "" ? null : Number(v.latitud),
    longitud: v.longitud === "" ? null : Number(v.longitud),
    zona_horaria: v.zona_horaria,
    formato_fecha: v.formato_fecha,
    dias_aviso_vencimiento: Number(v.dias_aviso_vencimiento),
    requiere_aprobacion: v.requiere_aprobacion,
    stock_minimo_default: v.stock_minimo_default === "" ? null : Number(v.stock_minimo_default),
    tema_id: v.tema_id,
    modo_oscuro: v.modo_oscuro,
  };
}
