export const PATH = {
  landing: "/",
  login: "/login",
  configurarAdministrador: "/configurar-administrador",
  dashboard: "/dashboard",
  escanear: "/escanear",
  etiquetas: "/etiquetas",
  escaneos: "/escaneos",
  reglas: "/reglas",
  reglaNueva: "/reglas/nueva",
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
  manual: "/manual",
  manualGlosario: "/manual/m08-glosario",
  manualImprimir: "/manual/imprimir",
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

/**
 * Catálogos que se pueden etiquetar, y a qué tipo de etiqueta corresponden.
 * Es el mismo conjunto que resuelve el escáner: se imprime lo que se lee.
 */
export const TIPO_ETIQUETA_POR_SLUG: Record<string, string> = {
  productos: "PRODUCTO",
  ubicaciones: "UBICACION",
  lotes: "LOTE",
  cajas: "CAJA",
};

/**
 * Pantalla de etiquetas ya preparada con lo que se quiere imprimir.
 *
 * Permite llamarla desde donde esté el usuario —la ficha de un producto, un
 * listado con varias filas marcadas— en vez de obligarle a ir a otra pantalla
 * y volver a buscar allí lo que ya tenía delante.
 */
export function etiquetasDe(tipo: string, ids: string[]): string {
  return `${PATH.etiquetas}?tipo=${tipo}&ids=${ids.join(",")}`;
}

export function reglaEditar(id: string): string {
  return `/reglas/${id}/editar`;
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

/** Ruta de un capítulo del Manual del Cliente. */
export function manualCapitulo(id: string): string {
  return `/manual/${id}`;
}
