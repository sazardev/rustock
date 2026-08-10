export const PATH = {
  dashboard: "/",
  movimientos: "/movimientos",
  movimientosNuevo: "/movimientos/nuevo",
  inventario: "/inventario",
  inventarioNuevo: "/inventario/nuevo",
  alertas: "/alertas",
  reportes: "/reportes",
  reporteStock: "/reportes/stock",
  reporteMovimientos: "/reportes/movimientos",
  reporteVencimientos: "/reportes/vencimientos",
  reportePrecision: "/reportes/precision",
  reporteAuditoria: "/reportes/auditoria",
  historial: "/historial",
  usuarios: "/usuarios",
  configuracion: "/configuracion",
  galeria: "/galeria",
  accesoNoPermitido: "/acceso-no-permitido",
  noEncontrado: "/no-encontrado",
} as const;

export function catalogoLista(slug: string): string {
  return `/${slug}`;
}

export function catalogoDetalle(slug: string, id: string): string {
  return `/${slug}/${id}`;
}

export function catalogoEditar(slug: string, id: string): string {
  return `/${slug}/${id}/editar`;
}

export function catalogoEliminar(slug: string, id: string): string {
  return `/${slug}/${id}/eliminar`;
}
