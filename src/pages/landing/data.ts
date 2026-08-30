/**
 * Contenido de la landing pública.
 *
 * Todo se construye con el diccionario activo: la landing es lo primero que
 * ve quien no conoce Rustock, así que sigue al idioma como el resto del
 * producto. Los datos que no son texto —iconos, rutas, variantes de botón—
 * viven aquí porque no dependen de la lengua.
 */
import type { IconName } from "../../shared/ui";
import type { Diccionario } from "../../shared/i18n";

export interface Feature {
  icon: IconName;
  title: string;
  text: string;
}

export function featuresDe(t: Diccionario): Feature[] {
  const f = t.landing.features;
  return [
    { icon: "stock", title: f.stockTitulo, text: f.stockTexto },
    { icon: "movements", title: f.movimientosTitulo, text: f.movimientosTexto },
    { icon: "lote", title: f.fifoTitulo, text: f.fifoTexto },
    { icon: "inventario", title: f.inventarioTitulo, text: f.inventarioTexto },
    { icon: "historial", title: f.trazabilidadTitulo, text: f.trazabilidadTexto },
    { icon: "rol", title: f.rolesTitulo, text: f.rolesTexto },
  ];
}

export interface Paso {
  icon: IconName;
  title: string;
  text: string;
}

export function pasosDe(t: Diccionario): Paso[] {
  const p = t.landing.pasos;
  return [
    { icon: "configuracion", title: p.instalaTitulo, text: p.instalaTexto },
    { icon: "almacen", title: p.defineTitulo, text: p.defineTexto },
    { icon: "movements", title: p.registraTitulo, text: p.registraTexto },
  ];
}

export interface Principio {
  title: string;
  text: string;
}

export function principiosDe(t: Diccionario): Principio[] {
  const p = t.landing.principios;
  return [
    { title: p.movimientoTitulo, text: p.movimientoTexto },
    { title: p.saldoTitulo, text: p.saldoTexto },
    { title: p.historialTitulo, text: p.historialTexto },
    { title: p.consultableTitulo, text: p.consultableTexto },
  ];
}

export interface Estadistica {
  valor: string;
  etiqueta: string;
}

export function estadisticasDe(t: Diccionario): Estadistica[] {
  const e = t.landing.estadisticas;
  return [
    { valor: "0", etiqueta: e.serviciosNube },
    { valor: "1", etiqueta: e.archivoBd },
    { valor: "1", etiqueta: e.instalacion },
    { valor: "100%", etiqueta: e.trazabilidad },
  ];
}

// --- Dolores que Rustock elimina ---

export interface Dolor {
  icon: IconName;
  titulo: string;
  texto: string;
}

export function doloresDe(t: Diccionario): Dolor[] {
  const d = t.landing.dolores;
  return [
    { icon: "alerta", titulo: d.stockTitulo, texto: d.stockTexto },
    { icon: "lote", titulo: d.vencimientosTitulo, texto: d.vencimientosTexto },
    { icon: "historial", titulo: d.mermasTitulo, texto: d.mermasTexto },
  ];
}

// --- Confianza: operaciones que ya operan así ---

export function confianzaDe(t: Diccionario): readonly string[] {
  return t.landing.confianza;
}

// --- Stack de confianza técnica ---

export interface StackTech {
  nombre: string;
  rol: string;
}

export function stackDe(t: Diccionario): StackTech[] {
  const s = t.landing.stack;
  return [
    { nombre: "Rust", rol: s.rust },
    { nombre: "SQLite", rol: s.sqlite },
    { nombre: "Tauri v2", rol: s.tauri },
    { nombre: "React 19", rol: s.react },
  ];
}

// --- Comparativa rompedora: Rustock vs alternativas ---

export interface ComparativaFila {
  caracteristica: string;
  rustock: string;
  excel: string;
  saas: string;
  destaqueRustock?: boolean;
}

export function comparativaDe(t: Diccionario): ComparativaFila[] {
  const c = t.landing.comparativa;
  return [
    {
      caracteristica: c.costo,
      rustock: c.costoRustock,
      excel: c.costoExcel,
      saas: c.costoSaas,
      destaqueRustock: true,
    },
    {
      caracteristica: c.datos,
      rustock: c.datosRustock,
      excel: c.datosExcel,
      saas: c.datosSaas,
      destaqueRustock: true,
    },
    {
      caracteristica: c.trazabilidad,
      rustock: c.trazabilidadRustock,
      excel: c.trazabilidadExcel,
      saas: c.trazabilidadSaas,
    },
    { caracteristica: c.fifo, rustock: c.fifoRustock, excel: c.fifoExcel, saas: c.fifoSaas },
    { caracteristica: c.ciego, rustock: c.ciegoRustock, excel: c.ciegoExcel, saas: c.ciegoSaas },
    {
      caracteristica: c.auditoria,
      rustock: c.auditoriaRustock,
      excel: c.auditoriaExcel,
      saas: c.auditoriaSaas,
    },
    {
      caracteristica: c.offline,
      rustock: c.offlineRustock,
      excel: c.offlineExcel,
      saas: c.offlineSaas,
    },
  ];
}

// --- Propuesta de valor / Pricing ---

export interface Plan {
  nombre: string;
  precio: string;
  periodo: string;
  descripcion: string;
  destacado?: boolean;
  incluye: readonly string[];
  cta: { etiqueta: string; href: string; variante: "primary" | "secondary" };
}

export function planesDe(t: Diccionario): Plan[] {
  const p = t.landing.planes;
  return [
    {
      nombre: p.communityNombre,
      precio: "0",
      periodo: p.communityPeriodo,
      descripcion: p.communityDesc,
      incluye: p.communityIncluye,
      cta: { etiqueta: p.communityCta, href: "/configurar-administrador", variante: "secondary" },
    },
    {
      nombre: p.proNombre,
      precio: "0",
      periodo: p.proPeriodo,
      descripcion: p.proDesc,
      destacado: true,
      incluye: p.proIncluye,
      cta: { etiqueta: p.proCta, href: "/configurar-administrador", variante: "primary" },
    },
    {
      nombre: p.medidaNombre,
      precio: p.medidaPrecio,
      periodo: p.medidaPeriodo,
      descripcion: p.medidaDesc,
      incluye: p.medidaIncluye,
      cta: { etiqueta: p.medidaCta, href: "/ayuda", variante: "secondary" },
    },
  ];
}

// --- Testimonios / prueba social ---

export interface Testimonio {
  cita: string;
  autor: string;
  cargo: string;
  inicial: string;
}

export function testimoniosDe(t: Diccionario): Testimonio[] {
  const x = t.landing.testimonios;
  return [
    { cita: x.unoCita, autor: x.unoAutor, cargo: x.unoCargo, inicial: x.unoAutor.charAt(0) },
    { cita: x.dosCita, autor: x.dosAutor, cargo: x.dosCargo, inicial: x.dosAutor.charAt(0) },
    { cita: x.tresCita, autor: x.tresAutor, cargo: x.tresCargo, inicial: x.tresAutor.charAt(0) },
  ];
}

// --- FAQ para SEO y conversión ---

export interface Faq {
  pregunta: string;
  respuesta: string;
}

export function faqsDe(t: Diccionario): readonly Faq[] {
  return t.landing.faqs;
}
