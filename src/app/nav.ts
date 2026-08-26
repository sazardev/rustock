import type { IconName } from "../shared/ui";
import { PATH } from "./route-paths";

export interface NavItem {
  label: string;
  href: string;
  icon: IconName;
  end?: boolean;
  /** Breve descripción del módulo; se muestra en el tooltip del modo compacto. */
  descripcion?: string;
}

export interface NavGroup {
  title: string;
  items: NavItem[];
}

/**
 * Construye la navegación según el orden personalizado del usuario: recibe la
 * lista de hrefs en el orden deseado (persistida en `preferencias_usuario`).
 * Los ítems de cada grupo se ordenan según su posición global en esa lista;
 * los que no aparecen (por ejemplo, una sección nueva) van al final de su
 * grupo en el orden por defecto.
 */
export function construirNav(ordenHrefs: string[] | null): NavGroup[] {
  if (!ordenHrefs || ordenHrefs.length === 0) return NAV_GROUPS;
  const posicion = new Map(ordenHrefs.map((href, i) => [href, i]));
  return NAV_GROUPS.map((grupo) => ({
    ...grupo,
    items: grupo.items.toSorted((a, b) => {
      const pa = posicion.get(a.href);
      const pb = posicion.get(b.href);
      if (pa === undefined && pb === undefined) return 0;
      if (pa === undefined) return 1;
      if (pb === undefined) return -1;
      return pa - pb;
    }),
  }));
}

/** Ítem con su grupo, para la UI de reordenar el sidebar en preferencias. */
export interface NavItemConGrupo {
  grupo: string;
  item: NavItem;
}

export function itemsDeNav(): NavItemConGrupo[] {
  return NAV_GROUPS.flatMap((grupo) => grupo.items.map((item) => ({ grupo: grupo.title, item })));
}

export const NAV_GROUPS: NavGroup[] = [
  {
    title: "Operación",
    items: [
      {
        label: "Dashboard",
        href: PATH.dashboard,
        icon: "dashboard",
        end: true,
        descripcion: "KPIs, movimientos recientes y alertas activas",
      },
      {
        label: "Movimientos",
        href: PATH.movimientos,
        icon: "movements",
        descripcion: "Entradas, salidas, traslados y ajustes de stock",
      },
      {
        label: "Captura rápida",
        href: "/movimientos/captura-recepcion",
        icon: "codigoBarras",
        descripcion: "Recepción y despacho guiados por escáner",
      },
      {
        label: "Inventario físico",
        href: PATH.inventario,
        icon: "inventario",
        descripcion: "Sesiones de conteo, diferencias y precisión",
      },
      {
        label: "Alertas",
        href: PATH.alertas,
        icon: "alerta",
        descripcion: "Stock bajo, vencimientos y pendientes de aprobación",
      },
    ],
  },
  {
    title: "Catálogos",
    items: [
      {
        label: "Almacenes",
        href: "/almacenes",
        icon: "almacen",
        descripcion: "Zonas, racks y secciones del árbol físico",
      },
      {
        label: "Zonas",
        href: "/zonas",
        icon: "zona",
        descripcion: "Divisiones lógicas o físicas dentro de un almacén",
      },
      {
        label: "Pasillos",
        href: "/pasillos",
        icon: "zona",
        descripcion: "Pasillos físicos que agrupan racks dentro de una zona",
      },
      {
        label: "Racks",
        href: "/racks",
        icon: "zona",
        descripcion: "Estructuras de almacenamiento dentro de una zona",
      },
      {
        label: "Secciones",
        href: "/secciones",
        icon: "zona",
        descripcion: "Subdivisiones de un rack (niveles, bahías)",
      },
      {
        label: "Ubicaciones",
        href: "/ubicaciones",
        icon: "ubicacion",
        descripcion: "Puntos de almacenamiento y su contenido",
      },
      {
        label: "Cajas",
        href: "/cajas",
        icon: "caja",
        descripcion: "Contenedores dentro de una ubicación que agrupan stock",
      },
      {
        label: "Productos",
        href: "/productos",
        icon: "producto",
        descripcion: "SKU, códigos de barras y unidades de medida",
      },
      {
        label: "Lotes",
        href: "/lotes",
        icon: "lote",
        descripcion: "Origen, vencimientos y trazabilidad",
      },
      {
        label: "Categorías",
        href: "/categorias",
        icon: "categoria",
        descripcion: "Clasificación jerárquica de productos",
      },
      {
        label: "Unidades de medida",
        href: "/uoms",
        icon: "uom",
        descripcion: "UOM y factores de conversión",
      },
      {
        label: "Proveedores",
        href: "/proveedores",
        icon: "proveedor",
        descripcion: "Origen de compras y recepciones",
      },
      {
        label: "Clientes",
        href: "/clientes",
        icon: "cliente",
        descripcion: "Destino de despachos y devoluciones",
      },
    ],
  },
  {
    title: "Análisis",
    items: [
      {
        label: "Reportes",
        href: PATH.reportes,
        icon: "reportes",
        descripcion: "Stock, movimientos, vencimientos y auditoría",
      },
      {
        label: "Historial",
        href: PATH.historial,
        icon: "historial",
        descripcion: "Centro de actividad: tracking total, análisis y auditoría",
      },
    ],
  },
  {
    title: "Administración",
    items: [
      {
        label: "Usuarios y roles",
        href: PATH.usuarios,
        icon: "rol",
        descripcion: "Cuentas, permisos y matriz de acceso",
      },
      {
        label: "Sucursales",
        href: PATH.sucursales,
        icon: "ubicacion",
        descripcion: "Puntos de operación y su ubicación",
      },
      {
        label: "Configuración",
        href: PATH.configuracion,
        icon: "configuracion",
        descripcion: "Parámetros del sistema y preferencias",
      },
    ],
  },
  {
    title: "Manual",
    items: [
      {
        label: "Manual del Cliente",
        href: PATH.manual,
        icon: "ayuda",
        descripcion: "Guía completa de la lógica de negocio — 8 partes, 50 términos",
      },
    ],
  },
  {
    title: "Ayuda",
    items: [
      {
        label: "Guía de uso",
        href: PATH.ayuda,
        icon: "ayuda",
        descripcion: "Todos los módulos, acciones y glosario de términos",
      },
    ],
  },
];

export const DESIGN_HREF = PATH.galeria;
