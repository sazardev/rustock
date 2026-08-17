/**
 * Registro de comandos estáticos del command palette (DESIGN §5, §6.10).
 *
 * Tres fuentes:
 *  - Páginas: la navegación real (`nav.ts`) + destinos que no están en el
 *    sidebar (reportes individuales, perfil, glosario).
 *  - Acciones: crear entidades, gatadas por el rol del usuario según la
 *    matriz de permisos (SPEC §4.4).
 *  - Ayuda ("palabras"): los módulos de la guía y los términos del glosario.
 *
 * Los datos de negocio (productos, ubicaciones, movimientos…) no viven aquí:
 * los resuelve el backend vía `buscar` (SPEC §15.4) y se mezclan en
 * `CommandPalette`.
 */
import type { IconName } from "../ui";
import { itemsDeNav } from "../../app/nav";
import { PATH, ayudaModulo, catalogoNuevo } from "../../app/route-paths";
import { AYUDA_GRUPOS, GLOSARIO, textoModulo } from "../../pages/ayuda/ayuda-data";

export type GrupoComando = "Páginas" | "Acciones" | "Ayuda";

export interface ComandoPalette {
  id: string;
  titulo: string;
  subtitulo?: string;
  icono: IconName;
  grupo: GrupoComando;
  href: string;
  /** Términos extra para la búsqueda (descripción, definición…). */
  keywords?: string;
}

/** Conjuntos de roles por nivel de acceso (SPEC §4.4, simplificado). */
const ROL_OPERACION = new Set(["ADMIN", "GERENTE", "ENCARGADO_ALMACEN", "OPERADOR"]);
const ROL_CATALOGO = new Set(["ADMIN", "GERENTE", "ENCARGADO_ALMACEN"]);
const ROL_ADMIN = new Set(["ADMIN"]);

const REPORTES: Array<ComandoPalette> = [
  {
    id: "pagina:reporte-stock",
    titulo: "Reporte de stock",
    subtitulo: "Saldos por producto, ubicación y lote",
    icono: "reportes",
    grupo: "Páginas",
    href: PATH.reporteStock,
  },
  {
    id: "pagina:reporte-movimientos",
    titulo: "Reporte de movimientos",
    subtitulo: "Entradas, salidas, traslados y ajustes por periodo",
    icono: "reportes",
    grupo: "Páginas",
    href: PATH.reporteMovimientos,
  },
  {
    id: "pagina:reporte-entradas",
    titulo: "Reporte de entradas",
    subtitulo: "Compras y recepciones por proveedor",
    icono: "entrada",
    grupo: "Páginas",
    href: PATH.reporteEntradas,
  },
  {
    id: "pagina:reporte-salidas",
    titulo: "Reporte de salidas",
    subtitulo: "Despachos por cliente",
    icono: "salida",
    grupo: "Páginas",
    href: PATH.reporteSalidas,
  },
  {
    id: "pagina:reporte-mermas",
    titulo: "Reporte de mermas y ajustes",
    subtitulo: "Pérdidas y correcciones de stock",
    icono: "ajuste",
    grupo: "Páginas",
    href: PATH.reporteMermasAjustes,
  },
  {
    id: "pagina:reporte-vencimientos",
    titulo: "Reporte de vencimientos",
    subtitulo: "Lotes por vencer y vencidos",
    icono: "calendario",
    grupo: "Páginas",
    href: PATH.reporteVencimientos,
  },
  {
    id: "pagina:reporte-kardex",
    titulo: "Reporte kardex",
    subtitulo: "Tarjeta de stock de un producto o lote",
    icono: "historial",
    grupo: "Páginas",
    href: PATH.reporteKardex,
  },
  {
    id: "pagina:reporte-precision",
    titulo: "Reporte de precisión",
    subtitulo: "Exactitud de las sesiones de inventario",
    icono: "inventario",
    grupo: "Páginas",
    href: PATH.reportePrecision,
  },
  {
    id: "pagina:reporte-auditoria",
    titulo: "Reporte de auditoría",
    subtitulo: "Quién hizo qué en el sistema",
    icono: "historial",
    grupo: "Páginas",
    href: PATH.reporteAuditoria,
  },
  {
    id: "pagina:reporte-usuarios",
    titulo: "Reporte de usuarios",
    subtitulo: "Desempeño por usuario y periodo",
    icono: "usuario",
    grupo: "Páginas",
    href: PATH.reporteUsuarios,
  },
];

/** Páginas: navegación real del sidebar + destinos fuera de él. */
function paginas(): ComandoPalette[] {
  const delNav = itemsDeNav().map(({ item }) => ({
    id: `pagina:${item.href}`,
    titulo: item.label,
    subtitulo: item.descripcion,
    icono: item.icon,
    grupo: "Páginas" as const,
    href: item.href,
  }));
  const extras: ComandoPalette[] = [
    {
      id: "pagina:perfil",
      titulo: "Perfil",
      subtitulo: "Cuenta, preferencias y cambio de contraseña",
      icono: "usuario",
      grupo: "Páginas",
      href: PATH.perfil,
    },
    {
      id: "pagina:glosario",
      titulo: "Glosario de términos",
      subtitulo: "Definiciones de SKU, UOM, lote, FEFO y más",
      icono: "ayuda",
      grupo: "Páginas",
      href: PATH.ayudaGlosario,
    },
    ...REPORTES,
  ];
  return [...delNav, ...extras];
}

/** Acciones de creación, gatadas por rol. */
function acciones(rolCodigo: string | undefined): ComandoPalette[] {
  const permite = (roles: Set<string>) => (rolCodigo ? roles.has(rolCodigo) : false);
  const todas: Array<{ comando: ComandoPalette; roles: Set<string> }> = [
    {
      comando: {
        id: "accion:movimiento",
        titulo: "Nuevo movimiento",
        subtitulo: "Entrada, salida, traslado o ajuste de stock",
        icono: "movements",
        grupo: "Acciones",
        href: PATH.movimientosNuevo,
      },
      roles: ROL_OPERACION,
    },
    {
      comando: {
        id: "accion:inventario",
        titulo: "Nueva sesión de inventario",
        subtitulo: "Conteo completo o cíclico",
        icono: "inventario",
        grupo: "Acciones",
        href: PATH.inventarioNuevo,
      },
      roles: ROL_OPERACION,
    },
    {
      comando: {
        id: "accion:almacen",
        titulo: "Nuevo almacén",
        icono: "almacen",
        grupo: "Acciones",
        href: catalogoNuevo("almacenes"),
      },
      roles: ROL_CATALOGO,
    },
    {
      comando: {
        id: "accion:zona",
        titulo: "Nueva zona",
        subtitulo: "División del almacén",
        icono: "zona",
        grupo: "Acciones",
        href: "/zonas/nuevo",
      },
      roles: ROL_CATALOGO,
    },
    {
      comando: {
        id: "accion:rack",
        titulo: "Nuevo rack",
        subtitulo: "Estructura dentro de una zona",
        icono: "zona",
        grupo: "Acciones",
        href: "/racks/nuevo",
      },
      roles: ROL_CATALOGO,
    },
    {
      comando: {
        id: "accion:seccion",
        titulo: "Nueva sección",
        subtitulo: "Subdivisión de un rack",
        icono: "zona",
        grupo: "Acciones",
        href: "/secciones/nuevo",
      },
      roles: ROL_CATALOGO,
    },
    {
      comando: {
        id: "accion:ubicacion",
        titulo: "Nueva ubicación",
        subtitulo: "Punto de almacenamiento direccionable",
        icono: "ubicacion",
        grupo: "Acciones",
        href: catalogoNuevo("ubicaciones"),
      },
      roles: ROL_CATALOGO,
    },
    {
      comando: {
        id: "accion:producto",
        titulo: "Nuevo producto",
        subtitulo: "SKU, unidad de medida y controles",
        icono: "producto",
        grupo: "Acciones",
        href: catalogoNuevo("productos"),
      },
      roles: ROL_CATALOGO,
    },
    {
      comando: {
        id: "accion:lote",
        titulo: "Nuevo lote",
        subtitulo: "Lote de un producto que controla lote",
        icono: "lote",
        grupo: "Acciones",
        href: catalogoNuevo("lotes"),
      },
      roles: ROL_CATALOGO,
    },
    {
      comando: {
        id: "accion:categoria",
        titulo: "Nueva categoría",
        subtitulo: "Clasificación jerárquica",
        icono: "categoria",
        grupo: "Acciones",
        href: catalogoNuevo("categorias"),
      },
      roles: ROL_CATALOGO,
    },
    {
      comando: {
        id: "accion:uom",
        titulo: "Nueva unidad de medida",
        subtitulo: "UOM y factor de conversión",
        icono: "uom",
        grupo: "Acciones",
        href: catalogoNuevo("uoms"),
      },
      roles: ROL_CATALOGO,
    },
    {
      comando: {
        id: "accion:proveedor",
        titulo: "Nuevo proveedor",
        subtitulo: "Origen de compras y recepciones",
        icono: "proveedor",
        grupo: "Acciones",
        href: catalogoNuevo("proveedores"),
      },
      roles: ROL_CATALOGO,
    },
    {
      comando: {
        id: "accion:cliente",
        titulo: "Nuevo cliente",
        subtitulo: "Destino de despachos",
        icono: "cliente",
        grupo: "Acciones",
        href: catalogoNuevo("clientes"),
      },
      roles: ROL_CATALOGO,
    },
    {
      comando: {
        id: "accion:usuario",
        titulo: "Nuevo usuario",
        subtitulo: "Cuenta con rol y permisos",
        icono: "usuario",
        grupo: "Acciones",
        href: "/usuarios/nuevo",
      },
      roles: ROL_ADMIN,
    },
    {
      comando: {
        id: "accion:sucursal",
        titulo: "Nueva sucursal",
        subtitulo: "Punto de operación de la empresa",
        icono: "ubicacion",
        grupo: "Acciones",
        href: "/sucursales/nuevo",
      },
      roles: ROL_ADMIN,
    },
  ];
  return todas.filter(({ roles }) => permite(roles)).map(({ comando }) => comando);
}

/** Ayuda: guías de módulo + procesos del negocio + términos del glosario. */
function palabrasAyuda(): ComandoPalette[] {
  const modulos: ComandoPalette[] = AYUDA_GRUPOS.flatMap((g) => g.modulos).map((m) => ({
    id: `ayuda:${m.id}`,
    titulo: m.titulo,
    subtitulo: `Guía de uso · ${m.resumen}`,
    icono: m.icono,
    grupo: "Ayuda",
    href: ayudaModulo(m.id),
    keywords: [
      m.resumen,
      m.paraQueSirve ?? "",
      m.cuandoUsarlo ?? "",
      textoModulo(m),
      (m.terminosClave ?? []).join(" "),
    ]
      .filter(Boolean)
      .join(" "),
  }));
  const glosario: ComandoPalette[] = GLOSARIO.map((t) => ({
    id: `glosario:${t.id}`,
    titulo: t.termino,
    subtitulo: t.definicion,
    icono: "historial",
    grupo: "Ayuda",
    href: `${PATH.ayudaGlosario}#${t.id}`,
    keywords: t.definicion,
  }));
  return [...modulos, ...glosario];
}

/** Comandos estáticos completos, filtrados por el rol de la sesión. */
export function comandosPalette(
  rolCodigo: string | undefined,
  mostrarAyuda = true,
): ComandoPalette[] {
  return [...paginas(), ...acciones(rolCodigo), ...(mostrarAyuda ? palabrasAyuda() : [])];
}

// ============ Recientes (localStorage, solo del cliente) ============

const RECIENTES_KEY = "rustock.palette.recientes";
const RECIENTES_MAX = 8;

export interface RecientePalette {
  id: string;
  titulo: string;
  subtitulo?: string;
  icono: IconName;
  grupo: string;
  href: string;
}

export function leerRecientes(): RecientePalette[] {
  try {
    const raw = window.localStorage.getItem(RECIENTES_KEY);
    if (!raw) {
      return [];
    }
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as RecientePalette[]).slice(0, RECIENTES_MAX) : [];
  } catch {
    return [];
  }
}

export function registrarReciente(entrada: RecientePalette): void {
  try {
    const actual = leerRecientes().filter((r) => r.id !== entrada.id);
    const siguientes = [entrada, ...actual].slice(0, RECIENTES_MAX);
    window.localStorage.setItem(RECIENTES_KEY, JSON.stringify(siguientes));
  } catch {
    // Almacenamiento no disponible: los recientes viven solo en memoria.
  }
}
