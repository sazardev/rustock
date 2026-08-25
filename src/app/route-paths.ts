export const PATH = {
  login: "/login",
  configurarAdministrador: "/configurar-administrador",
  dashboard: "/dashboard",
  movimientos: "/movimientos",
  movimientosNuevo: "/movimientos/nuevo",
  inventario: "/inventario",
  inventarioNuevo: "/inventario/nuevo",
  alertas: "/alertas",
  reportes: "/reportes",
  reporteStock: "/reportes/stock",
  reporteMovimientos: "/reportes/movimientos",
  reporteVencimientos: "/reportes/vencimientos",
  reporteKardex: "/reportes/kardex",
  reportePrecision: "/reportes/precision",
  reporteAuditoria: "/reportes/auditoria",
  reporteEntradas: "/reportes/entradas",
  reporteSalidas: "/reportes/salidas",
  reporteMermasAjustes: "/reportes/mermas-ajustes",
  reporteUsuarios: "/reportes/usuarios",
  historial: "/historial",
  usuarios: "/usuarios",
  perfil: "/perfil",
  configuracion: "/configuracion",
  sucursales: "/sucursales",
  galeria: "/galeria",
  ayuda: "/ayuda",
  ayudaGlosario: "/ayuda/glosario",
  accesoNoPermitido: "/acceso-no-permitido",
  noEncontrado: "/no-encontrado",
} as const;

export function reporteKardexProducto(productoId: string): string {
  return `/reportes/kardex/${productoId}`;
}

export function movimientoDetalle(id: string): string {
  return `/movimientos/${id}`;
}

export function movimientoEditar(id: string): string {
  return `/movimientos/${id}/editar`;
}

export function movimientoAprobar(id: string): string {
  return `/movimientos/${id}/aprobar`;
}

export function movimientoAnular(id: string): string {
  return `/movimientos/${id}/anular`;
}

export function sesionInventarioDetalle(id: string): string {
  return `/inventario/${id}`;
}

export function sesionInventarioConteos(id: string): string {
  return `/inventario/${id}/conteos`;
}

export function sesionInventarioCerrar(id: string): string {
  return `/inventario/${id}/cerrar`;
}

export function catalogoLista(slug: string): string {
  return `/${slug}`;
}

export function catalogoNuevo(slug: string): string {
  return `/${slug}/nuevo`;
}

export function catalogoDetalle(slug: string, id: string): string {
  return `/${slug}/${id}`;
}

export function catalogoEditar(slug: string, id: string): string {
  return `/${slug}/${id}/editar`;
}

export function almacenMapa(id: string, resaltarId?: string): string {
  const base = `/almacenes/${id}/mapa`;
  return resaltarId ? `${base}?resaltar=${resaltarId}` : base;
}

export function almacenMapa3D(id: string): string {
  return `/almacenes/${id}/mapa-3d`;
}

/** Asistente de layout base (modo construcción, prototipar primero). */
export function almacenMapaAsistente(id: string): string {
  return `/almacenes/${id}/mapa/asistente`;
}

export function catalogoEliminar(slug: string, id: string): string {
  return `/${slug}/${id}/eliminar`;
}

/** Ruta de la página de ayuda de un módulo (ej. "operacion/movimientos"). */
export function ayudaModulo(id: string): string {
  return `/ayuda/${id}`;
}
