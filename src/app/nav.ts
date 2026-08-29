import type { IconName } from "../shared/ui";
import type { Diccionario } from "../shared/i18n";
import { PATH } from "./route-paths";

export interface NavItem {
  label: string;
  href: string;
  icon: IconName;
  /** Breve descripción del módulo; se muestra en el tooltip del modo compacto. */
  descripcion?: string;
}

export interface NavGroup {
  title: string;
  items: NavItem[];
}

/**
 * Nombres de la navegación en el idioma activo (SPEC §17).
 *
 * El árbol de rutas es el mismo en todos los idiomas —las URL no se traducen,
 * porque un enlace compartido tiene que abrir lo mismo para todo el mundo—;
 * lo que cambia es cómo se llama cada módulo en pantalla.
 */

/**
 * Construye la navegación según el orden personalizado del usuario: recibe la
 * lista de hrefs en el orden deseado (persistida en `preferencias_usuario`).
 * Los ítems de cada grupo se ordenan según su posición global en esa lista;
 * los que no aparecen (por ejemplo, una sección nueva) van al final de su
 * grupo en el orden por defecto.
 */
export function construirNav(ordenHrefs: string[] | null, t: Diccionario): NavGroup[] {
  const grupos = navDe(t);
  if (!ordenHrefs || ordenHrefs.length === 0) return grupos;
  const posicion = new Map(ordenHrefs.map((href, i) => [href, i]));
  return grupos.map((grupo) => ({
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

export function itemsDeNav(t: Diccionario): NavItemConGrupo[] {
  return navDe(t).flatMap((grupo) => grupo.items.map((item) => ({ grupo: grupo.title, item })));
}

export function navDe(t: Diccionario): NavGroup[] {
  return [
    {
      title: t.nav.grupos.operacion,
      items: [
        {
          label: t.nav.dashboard,
          href: PATH.dashboard,
          icon: "dashboard",
          descripcion: t.nav.dashboardDesc,
        },
        {
          label: t.nav.movimientos,
          href: PATH.movimientos,
          icon: "movements",
          descripcion: t.nav.movimientosDesc,
        },
        {
          label: t.nav.escaner,
          href: PATH.escanear,
          icon: "codigoBarras",
          descripcion: t.nav.escanerDesc,
        },
        {
          label: t.nav.etiquetas,
          href: PATH.etiquetas,
          icon: "exportar",
          descripcion: t.nav.etiquetasDesc,
        },
        {
          label: t.nav.capturaRapida,
          href: "/movimientos/captura-recepcion",
          icon: "escanear",
          descripcion: t.nav.capturaRapidaDesc,
        },
        {
          label: t.nav.inventario,
          href: PATH.inventario,
          icon: "inventario",
          descripcion: t.nav.inventarioDesc,
        },
        {
          label: t.nav.alertas,
          href: PATH.alertas,
          icon: "alerta",
          descripcion: t.nav.alertasDesc,
        },
      ],
    },
    {
      title: t.nav.grupos.catalogos,
      items: [
        {
          label: t.nav.almacenes,
          href: "/almacenes",
          icon: "almacen",
          descripcion: t.nav.almacenesDesc,
        },
        {
          label: t.nav.zonas,
          href: "/zonas",
          icon: "zona",
          descripcion: t.nav.zonasDesc,
        },
        {
          label: t.nav.pasillos,
          href: "/pasillos",
          icon: "zona",
          descripcion: t.nav.pasillosDesc,
        },
        {
          label: t.nav.racks,
          href: "/racks",
          icon: "zona",
          descripcion: t.nav.racksDesc,
        },
        {
          label: t.nav.secciones,
          href: "/secciones",
          icon: "zona",
          descripcion: t.nav.seccionesDesc,
        },
        {
          label: t.nav.ubicaciones,
          href: "/ubicaciones",
          icon: "ubicacion",
          descripcion: t.nav.ubicacionesDesc,
        },
        {
          label: t.nav.cajas,
          href: "/cajas",
          icon: "caja",
          descripcion: t.nav.cajasDesc,
        },
        {
          label: t.nav.productos,
          href: "/productos",
          icon: "producto",
          descripcion: t.nav.productosDesc,
        },
        {
          label: t.nav.lotes,
          href: "/lotes",
          icon: "lote",
          descripcion: t.nav.lotesDesc,
        },
        {
          label: t.nav.categorias,
          href: "/categorias",
          icon: "categoria",
          descripcion: t.nav.categoriasDesc,
        },
        {
          label: t.nav.uoms,
          href: "/uoms",
          icon: "uom",
          descripcion: t.nav.uomsDesc,
        },
        {
          label: t.nav.proveedores,
          href: "/proveedores",
          icon: "proveedor",
          descripcion: t.nav.proveedoresDesc,
        },
        {
          label: t.nav.clientes,
          href: "/clientes",
          icon: "cliente",
          descripcion: t.nav.clientesDesc,
        },
      ],
    },
    {
      title: t.nav.grupos.analisis,
      items: [
        {
          label: t.nav.reportes,
          href: PATH.reportes,
          icon: "reportes",
          descripcion: t.nav.reportesDesc,
        },
        {
          label: t.nav.escaneos,
          href: PATH.escaneos,
          icon: "codigoBarras",
          descripcion: t.nav.escaneosDesc,
        },
        {
          label: t.nav.historial,
          href: PATH.historial,
          icon: "historial",
          descripcion: t.nav.historialDesc,
        },
      ],
    },
    {
      title: t.nav.grupos.administracion,
      items: [
        {
          label: t.nav.usuarios,
          href: PATH.usuarios,
          icon: "rol",
          descripcion: t.nav.usuariosDesc,
        },
        {
          label: t.nav.sucursales,
          href: PATH.sucursales,
          icon: "ubicacion",
          descripcion: t.nav.sucursalesDesc,
        },
        {
          label: t.nav.reglas,
          href: PATH.reglas,
          icon: "ajuste",
          descripcion: t.nav.reglasDesc,
        },
        {
          label: t.nav.configuracion,
          href: PATH.configuracion,
          icon: "configuracion",
          descripcion: t.nav.configuracionDesc,
        },
      ],
    },
    {
      title: t.nav.grupos.manual,
      items: [
        {
          label: t.nav.manualCliente,
          href: PATH.manual,
          icon: "ayuda",
          descripcion: t.nav.manualClienteDesc,
        },
      ],
    },
    {
      title: t.nav.grupos.ayuda,
      items: [
        {
          label: t.nav.guiaUso,
          href: PATH.ayuda,
          icon: "ayuda",
          descripcion: t.nav.guiaUsoDesc,
        },
      ],
    },
  ];
}

export const DESIGN_HREF = PATH.galeria;
