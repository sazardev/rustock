import type { IconName } from "../shared/ui";
import { PATH } from "./route-paths";

export interface NavItem {
  label: string;
  href: string;
  icon: IconName;
  end?: boolean;
}

export interface NavGroup {
  title: string;
  items: NavItem[];
}

export const NAV_GROUPS: NavGroup[] = [
  {
    title: "Operación",
    items: [
      { label: "Dashboard", href: PATH.dashboard, icon: "dashboard", end: true },
      { label: "Movimientos", href: PATH.movimientos, icon: "movements" },
      { label: "Inventario físico", href: PATH.inventario, icon: "inventario" },
      { label: "Alertas", href: PATH.alertas, icon: "alerta" },
    ],
  },
  {
    title: "Catálogos",
    items: [
      { label: "Almacenes", href: "/almacenes", icon: "almacen" },
      { label: "Ubicaciones", href: "/ubicaciones", icon: "ubicacion" },
      { label: "Productos", href: "/productos", icon: "producto" },
      { label: "Lotes", href: "/lotes", icon: "lote" },
      { label: "Categorías", href: "/categorias", icon: "categoria" },
      { label: "Unidades de medida", href: "/uoms", icon: "uom" },
      { label: "Proveedores", href: "/proveedores", icon: "proveedor" },
      { label: "Clientes", href: "/clientes", icon: "cliente" },
    ],
  },
  {
    title: "Análisis",
    items: [
      { label: "Reportes", href: PATH.reportes, icon: "reportes" },
      { label: "Historial", href: PATH.historial, icon: "historial" },
    ],
  },
  {
    title: "Administración",
    items: [
      { label: "Usuarios y roles", href: PATH.usuarios, icon: "rol" },
      { label: "Configuración", href: PATH.configuracion, icon: "configuracion" },
    ],
  },
];

export const DESIGN_HREF = PATH.galeria;
