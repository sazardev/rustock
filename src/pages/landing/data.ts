import type { IconName } from "../../shared/ui";

export interface Feature {
  icon: IconName;
  title: string;
  text: string;
}

export const FEATURES: Feature[] = [
  {
    icon: "stock",
    title: "Stock en tiempo real",
    text: "Saldos por ubicación, producto y lote, con mínimos, máximos y alertas automáticas de reposición.",
  },
  {
    icon: "movements",
    title: "Movimientos trazables",
    text: "Cada alteración de stock es un movimiento con tipo, motivo y autor. Historial inmutable y anulaciones con movimiento inverso.",
  },
  {
    icon: "lote",
    title: "FIFO y FEFO automáticos",
    text: "Las salidas respetan antigüedad y vencimiento. Un lote vencido nunca sale a cliente.",
  },
  {
    icon: "inventario",
    title: "Inventario físico",
    text: "Conteos completos o cíclicos, conteo ciego, doble conteo y precisión medida por SKU, cantidad y ubicación.",
  },
  {
    icon: "historial",
    title: "Trazabilidad total",
    text: "Línea de tiempo de productos, ubicaciones, lotes y cajas: de dónde vino cada unidad y quién la movió.",
  },
  {
    icon: "rol",
    title: "Roles y permisos",
    text: "Control por roles con permisos granulares y auditoría completa de quién hizo qué y cuándo.",
  },
];

export interface Paso {
  icon: IconName;
  title: string;
  text: string;
}

export const PASOS: Paso[] = [
  {
    icon: "configuracion",
    title: "Instala y arranca",
    text: "Una sola aplicación compilada en Rust. En el primer arranque creas el usuario administrador y listo.",
  },
  {
    icon: "almacen",
    title: "Define tu almacén",
    text: "Almacenes, zonas, ubicaciones, productos, lotes y unidades de medida con códigos únicos y normalizados.",
  },
  {
    icon: "movements",
    title: "Registra y controla",
    text: "Entradas, salidas, traslados y ajustes con motivo y autor. Conteos, alertas y reportes en el mismo lugar.",
  },
];

export interface Principio {
  title: string;
  text: string;
}

export const PRINCIPIOS: Principio[] = [
  {
    title: "Un movimiento, un hecho",
    text: "Ninguna operación altera el stock por fuera del modelo de movimientos.",
  },
  {
    title: "El saldo es derivado",
    text: "Cada cifra de stock se respalda en movimientos; nunca existen saldos a mano.",
  },
  {
    title: "Nada se destruye",
    text: "Las entidades se desactivan o anulan; el historial siempre permanece.",
  },
  {
    title: "Todo consultable",
    text: "Cada listado es filtrable, ordenable, buscable, paginable y exportable.",
  },
];

export interface Estadistica {
  valor: string;
  etiqueta: string;
}

export const ESTADISTICAS: Estadistica[] = [
  { valor: "0", etiqueta: "servicios externos en la nube" },
  { valor: "1", etiqueta: "archivo de base de datos (SQLite)" },
  { valor: "1", etiqueta: "instalación en tu equipo" },
  { valor: "100%", etiqueta: "de trazabilidad por unidad" },
];
