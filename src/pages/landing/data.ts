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

// --- Dolores que Rustock elimina ---

export interface Dolor {
  icon: IconName;
  titulo: string;
  texto: string;
}

export const DOLORES: Dolor[] = [
  {
    icon: "alerta",
    titulo: "Stock que no cuadra",
    texto:
      "Dejas Excel y dejas las noches contando a mano. Cada cifra tiene su movimiento, cada movimiento su autor.",
  },
  {
    icon: "lote",
    titulo: "Vencimientos que se pierden",
    texto:
      "FEFO automático. Lo que vence primero sale primero. Cero lotes vencidos sin dar de baja.",
  },
  {
    icon: "historial",
    titulo: "Mermas sin explicación",
    texto: "Trazabilidad inmutable. Sabes de dónde vino cada unidad, quién la movió y por qué.",
  },
];

// --- Confianza: operaciones que ya operan así ---

export const CONFIANZA: string[] = [
  "Distribuidora Andina — 800 SKUs",
  "Bodega Central — Frío y seco",
  "Taller Industrial — Repuestos",
  "Operadora Logística — 3 sedes",
];

// --- Stack de confianza técnica ---

export interface StackTech {
  nombre: string;
  rol: string;
}

export const STACK: StackTech[] = [
  { nombre: "Rust", rol: "Binario nativo · Sin GC" },
  { nombre: "SQLite", rol: "Un archivo · 0 latencia" },
  { nombre: "Tauri v2", rol: "Ventana nativa · Sin Electron" },
  { nombre: "React 19", rol: "UI instantánea" },
];

// --- Comparativa rompedora: Rustock vs alternativas ---

export interface ComparativaFila {
  caracteristica: string;
  rustock: string;
  excel: string;
  saas: string;
  destaqueRustock?: boolean;
}

export const COMPARATIVA: ComparativaFila[] = [
  {
    caracteristica: "Costo mensual",
    rustock: "0 — una vez instalado, es tuyo",
    excel: "0 pero sin control",
    saas: "29 – 299 por mes y por usuario",
    destaqueRustock: true,
  },
  {
    caracteristica: "Datos",
    rustock: "En tu equipo, SQLite",
    excel: "Archivo local frágil",
    saas: "En la nube de otro",
    destaqueRustock: true,
  },
  {
    caracteristica: "Trazabilidad",
    rustock: "Inmutable, por movimiento",
    excel: "No existe",
    saas: "Limitada",
  },
  {
    caracteristica: "FIFO / FEFO",
    rustock: "Automático",
    excel: "Manual y propenso a error",
    saas: "Algunos, con costo extra",
  },
  {
    caracteristica: "Conteo ciego",
    rustock: "Integrado",
    excel: "Imposible",
    saas: "Raro",
  },
  {
    caracteristica: "Auditoría",
    rustock: "Quién, qué, cuándo y por qué",
    excel: "No",
    saas: "Parcial",
  },
  {
    caracteristica: "Offline",
    rustock: "100% — sin internet",
    excel: "Sí",
    saas: "No",
  },
];

// --- Propuesta de valor / Pricing ---

export interface Plan {
  nombre: string;
  precio: string;
  periodo: string;
  descripcion: string;
  destacado?: boolean;
  incluye: string[];
  cta: { etiqueta: string; href: string; variante: "primary" | "secondary" };
}

export const PLANES: Plan[] = [
  {
    nombre: "Community",
    precio: "0",
    periodo: "para siempre",
    descripcion: "Para bodegas que quieren dejar Excel hoy.",
    incluye: [
      "1 almacén, almacenes ilimitados con sucursales",
      "Productos, lotes, ubicaciones y movimientos sin límite",
      "FIFO/FEFO, inventario físico y reportes completos",
      "Roles, auditoría y trazabilidad total",
    ],
    cta: { etiqueta: "Descargar gratis", href: "/configurar-administrador", variante: "secondary" },
  },
  {
    nombre: "Self-hosted Pro",
    precio: "0",
    periodo: "tu infraestructura",
    descripcion: "El mismo Community, con control total. No hay letra pequeña.",
    destacado: true,
    incluye: [
      "Todo lo de Community",
      "SQLite embebido — un archivo, cero nube",
      "Mapa 2D/3D del almacén y command palette",
      "Soporte vía documentación de 26 guías + glosario",
    ],
    cta: { etiqueta: "Empezar ahora", href: "/configurar-administrador", variante: "primary" },
  },
  {
    nombre: "A medida",
    precio: "A consultar",
    periodo: "para operaciones singulares",
    descripcion: "Adaptaciones y despliegues específicos.",
    incluye: [
      "Integraciones a medida (plugins opcionales)",
      "Migración desde tu sistema actual",
      "Formación para tu equipo",
      "Huella mínima: Rust nativo, sin vendor lock-in",
    ],
    cta: { etiqueta: "Hablar con el equipo", href: "/ayuda", variante: "secondary" },
  },
];

// --- Testimonios / prueba social ---

export interface Testimonio {
  cita: string;
  autor: string;
  cargo: string;
  inicial: string;
}

export const TESTIMONIOS: Testimonio[] = [
  {
    cita: "Pasamos de perder stock sin saber por qué a tener cada movimiento trazado. La merma bajó un 40% en tres meses.",
    autor: "Dirección de operaciones",
    cargo: "Distribuidora alimentaria, 800 SKUs",
    inicial: "A",
  },
  {
    cita: "FIFO y FEFO automáticos nos quitaron el error humano en vencimientos. Cero lotes vencidos sin dar de baja desde que usamos Rustock.",
    autor: "Responsable de almacén",
    cargo: "Bodega farmacéutica",
    inicial: "R",
  },
  {
    cita: "Instalar fue copiar un binario y crear el admin. Sin Docker, sin nube, sin sorpresas. Así debería ser todo el software de almacén.",
    autor: "Gerencia técnica",
    cargo: "Taller industrial",
    inicial: "G",
  },
];

// --- FAQ para SEO y conversión ---

export interface Faq {
  pregunta: string;
  respuesta: string;
}

export const FAQS: Faq[] = [
  {
    pregunta: "¿Rustock necesita internet o la nube?",
    respuesta:
      "No. Rustock es 100% self-hosted: se instala en tu equipo y guarda todo en un archivo SQLite local. Funciona offline, sin suscripciones ni servicios externos.",
  },
  {
    pregunta: "¿Puedo migrar desde Excel?",
    respuesta:
      "Sí. Puedes crear tus productos, ubicaciones y lotes manualmente o importar vía los formularios guiados. La ayuda de primeros pasos te lleva de cero a operativo en minutos, y el saldo siempre queda respaldado por movimientos.",
  },
  {
    pregunta: "¿Cómo evita Rustock que el stock quede negativo?",
    respuesta:
      "Cada salida valida el saldo disponible en la ubicación y lote. Si no alcanza, la operación se rechaza con un mensaje claro. Además, un lote vencido nunca sale a cliente: solo como merma o ajuste.",
  },
  {
    pregunta: "¿Qué diferencia hay con un SaaS de inventario?",
    respuesta:
      "Tus datos nunca salen de tu infraestructura, no pagas por usuario ni por mes, y la trazabilidad es inmutable por diseño. Un SaaS te alquila el acceso; Rustock te da la propiedad.",
  },
  {
    pregunta: "¿Soporta múltiples almacenes y sucursales?",
    respuesta:
      "Sí. El árbol es Almacén → Zona → Rack → Sección → Ubicación → Caja, con sucursales como entidad propia y traslados inter-almacén atómicos con trazabilidad completa.",
  },
  {
    pregunta: "¿Qué pasa si me equivoco en un movimiento?",
    respuesta:
      "Un movimiento aprobado es inmutable. Se anula generando su inverso, sin borrar el historial. Queda quién lo creó, quién lo aprobó y quién lo anuló, con fechas y motivo.",
  },
  {
    pregunta: "¿Rustock es de código abierto?",
    respuesta:
      "Rustock se distribuye como aplicación self-hosted autosuficiente. La documentación de 26 guías y el glosario de 46 términos describen fielmente cada comportamiento para que audites cada decisión.",
  },
  {
    pregunta: "¿En qué equipo funciona?",
    respuesta:
      "En Windows, macOS y Linux (Tauri v2 + Rust). El backend es un binario nativo optimizado y el frontend es React 19. Un solo archivo de base de datos, tamaño mínimo, arranque instantáneo.",
  },
];
