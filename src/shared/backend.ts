/**
 * Cliente tipado del backend Rust. Una función por comando Tauri
 * (`src-tauri/src/commands.rs`), todas sobre `invoke()` de `./api` (que ya
 * distingue modo Tauri/web). Los nombres de función son camelCase por
 * ergonomía en TS; el nombre del comando (string) es siempre snake_case,
 * igual que en Rust.
 */
import { invoke } from "./api";
import type {
  Alerta,
  Almacen,
  Caja,
  Categoria,
  Cliente,
  Comentario,
  Conteo,
  DashboardResumen,
  DiferenciaInventario,
  EditarAlmacen,
  EditarCaja,
  EditarCategoria,
  EditarCliente,
  EditarLote,
  EditarProducto,
  EditarProveedor,
  EditarRack,
  EditarSeccion,
  EditarUbicacion,
  EditarZona,
  EstadoAlerta,
  HistorialCaja,
  HistorialComentario,
  KardexLinea,
  KpisGenerales,
  ListParams,
  Listado,
  Lote,
  Movimiento,
  NuevaCaja,
  NuevaCategoria,
  NuevaSeccion,
  NuevaSesionInventario,
  NuevaUbicacion,
  NuevaUom,
  NuevaZona,
  NuevoAlmacen,
  NuevoCliente,
  NuevoComentario,
  NuevoConteo,
  NuevoLote,
  NuevoMovimiento,
  NuevoProducto,
  NuevoProveedor,
  NuevoRack,
  NuevoTraslado,
  NuevoUsuario,
  OrigenLinea,
  LineaMovimiento,
  LotePorVencer,
  PrecisionSesion,
  Producto,
  Proveedor,
  Rack,
  Rol,
  Saldo,
  Seccion,
  SesionInventario,
  SugerenciaLinea,
  TrasladoCreado,
  Uom,
  Ubicacion,
  UbicacionDeLote,
  Usuario,
  Zona,
} from "./types";

const params = (p?: ListParams): Record<string, unknown> => ({ params: p ?? {} });

// ============ Autenticación y sesión (SPEC §4.1) ============

export function login(nombreUsuario: string, password: string): Promise<Usuario> {
  return invoke("login", { nombreUsuario, password });
}

export function logout(): Promise<void> {
  return invoke("logout");
}

export function quienSoy(): Promise<Usuario | null> {
  return invoke("quien_soy");
}

export function bootstrapAdmin(
  nombreUsuario: string,
  nombreCompleto: string,
  password: string,
): Promise<void> {
  return invoke("bootstrap_admin", {
    nombreUsuario,
    nombreCompleto,
    password,
  });
}

// ============ Almacén ============

export const listarAlmacenes = (p?: ListParams): Promise<Listado<Almacen>> =>
  invoke("listar_almacenes", params(p));
export const crearAlmacen = (nuevo: NuevoAlmacen): Promise<Almacen> =>
  invoke("crear_almacen", { nuevo });
export const obtenerAlmacen = (id: string): Promise<Almacen | null> =>
  invoke("obtener_almacen", { id });
export const editarAlmacen = (id: string, cambios: EditarAlmacen): Promise<Almacen> =>
  invoke("editar_almacen", { id, cambios });
export const desactivarAlmacen = (id: string): Promise<void> =>
  invoke("desactivar_almacen", { id });

// ============ Zona ============

export const listarZonas = (p?: ListParams): Promise<Listado<Zona>> =>
  invoke("listar_zonas", params(p));
export const crearZona = (nuevo: NuevaZona): Promise<Zona> => invoke("crear_zona", { nuevo });
export const obtenerZona = (id: string): Promise<Zona | null> => invoke("obtener_zona", { id });
export const editarZona = (id: string, cambios: EditarZona): Promise<Zona> =>
  invoke("editar_zona", { id, cambios });
export const desactivarZona = (id: string): Promise<void> => invoke("desactivar_zona", { id });

// ============ Rack ============

export const listarRacks = (p?: ListParams): Promise<Listado<Rack>> =>
  invoke("listar_racks", params(p));
export const crearRack = (nuevo: NuevoRack): Promise<Rack> => invoke("crear_rack", { nuevo });
export const obtenerRack = (id: string): Promise<Rack | null> => invoke("obtener_rack", { id });
export const editarRack = (id: string, cambios: EditarRack): Promise<Rack> =>
  invoke("editar_rack", { id, cambios });
export const desactivarRack = (id: string): Promise<void> => invoke("desactivar_rack", { id });

// ============ Sección ============

export const listarSecciones = (p?: ListParams): Promise<Listado<Seccion>> =>
  invoke("listar_secciones", params(p));
export const crearSeccion = (nuevo: NuevaSeccion): Promise<Seccion> =>
  invoke("crear_seccion", { nuevo });
export const obtenerSeccion = (id: string): Promise<Seccion | null> =>
  invoke("obtener_seccion", { id });
export const editarSeccion = (id: string, cambios: EditarSeccion): Promise<Seccion> =>
  invoke("editar_seccion", { id, cambios });
export const desactivarSeccion = (id: string): Promise<void> =>
  invoke("desactivar_seccion", { id });

// ============ Ubicación ============

export const listarUbicaciones = (p?: ListParams): Promise<Listado<Ubicacion>> =>
  invoke("listar_ubicaciones", params(p));
export const crearUbicacion = (nuevo: NuevaUbicacion): Promise<Ubicacion> =>
  invoke("crear_ubicacion", { nuevo });
export const obtenerUbicacion = (id: string): Promise<Ubicacion | null> =>
  invoke("obtener_ubicacion", { id });
export const editarUbicacion = (id: string, cambios: EditarUbicacion): Promise<Ubicacion> =>
  invoke("editar_ubicacion", { id, cambios });
export const desactivarUbicacion = (id: string): Promise<void> =>
  invoke("desactivar_ubicacion", { id });

// ============ Caja ============

export const listarCajas = (p?: ListParams): Promise<Listado<Caja>> =>
  invoke("listar_cajas", params(p));
export const crearCaja = (nuevo: NuevaCaja): Promise<Caja> => invoke("crear_caja", { nuevo });
export const obtenerCaja = (id: string): Promise<Caja | null> => invoke("obtener_caja", { id });
export const editarCaja = (id: string, cambios: EditarCaja): Promise<Caja> =>
  invoke("editar_caja", { id, cambios });
export const desactivarCaja = (id: string): Promise<void> => invoke("desactivar_caja", { id });

// ============ Producto ============

export const listarProductos = (p?: ListParams): Promise<Listado<Producto>> =>
  invoke("listar_productos", params(p));
export const crearProducto = (nuevo: NuevoProducto): Promise<Producto> =>
  invoke("crear_producto", { nuevo });
export const obtenerProducto = (id: string): Promise<Producto | null> =>
  invoke("obtener_producto", { id });
export const editarProducto = (id: string, cambios: EditarProducto): Promise<Producto> =>
  invoke("editar_producto", { id, cambios });
export const desactivarProducto = (id: string): Promise<void> =>
  invoke("desactivar_producto", { id });
export const buscarProductoPorCodigoBarras = (codigoBarras: string): Promise<Producto | null> =>
  invoke("buscar_producto_por_codigo_barras", { codigoBarras });

// ============ Lote ============

export const listarLotes = (p?: ListParams): Promise<Listado<Lote>> =>
  invoke("listar_lotes", params(p));
export const crearLote = (nuevo: NuevoLote): Promise<Lote> => invoke("crear_lote", { nuevo });
export const obtenerLote = (id: string): Promise<Lote | null> => invoke("obtener_lote", { id });
export const editarLote = (id: string, cambios: EditarLote): Promise<Lote> =>
  invoke("editar_lote", { id, cambios });

// ============ Proveedor / Cliente ============

export const listarProveedores = (p?: ListParams): Promise<Listado<Proveedor>> =>
  invoke("listar_proveedores", params(p));
export const crearProveedor = (nuevo: NuevoProveedor): Promise<Proveedor> =>
  invoke("crear_proveedor", { nuevo });
export const obtenerProveedor = (id: string): Promise<Proveedor | null> =>
  invoke("obtener_proveedor", { id });
export const editarProveedor = (id: string, cambios: EditarProveedor): Promise<Proveedor> =>
  invoke("editar_proveedor", { id, cambios });
export const desactivarProveedor = (id: string): Promise<void> =>
  invoke("desactivar_proveedor", { id });

export const listarClientes = (p?: ListParams): Promise<Listado<Cliente>> =>
  invoke("listar_clientes", params(p));
export const crearCliente = (nuevo: NuevoCliente): Promise<Cliente> =>
  invoke("crear_cliente", { nuevo });
export const obtenerCliente = (id: string): Promise<Cliente | null> =>
  invoke("obtener_cliente", { id });
export const editarCliente = (id: string, cambios: EditarCliente): Promise<Cliente> =>
  invoke("editar_cliente", { id, cambios });
export const desactivarCliente = (id: string): Promise<void> =>
  invoke("desactivar_cliente", { id });

// ============ UOM / Categoría ============

export const listarUoms = (p?: ListParams): Promise<Listado<Uom>> =>
  invoke("listar_uoms", params(p));
export const crearUom = (nuevo: NuevaUom): Promise<Uom> => invoke("crear_uom", { nuevo });
export const obtenerUom = (id: string): Promise<Uom | null> => invoke("obtener_uom", { id });

export const listarCategorias = (p?: ListParams): Promise<Listado<Categoria>> =>
  invoke("listar_categorias", params(p));
export const crearCategoria = (nuevo: NuevaCategoria): Promise<Categoria> =>
  invoke("crear_categoria", { nuevo });
export const obtenerCategoria = (id: string): Promise<Categoria | null> =>
  invoke("obtener_categoria", { id });
export const editarCategoria = (id: string, cambios: EditarCategoria): Promise<Categoria> =>
  invoke("editar_categoria", { id, cambios });
export const desactivarCategoria = (id: string): Promise<void> =>
  invoke("desactivar_categoria", { id });

// ============ Usuarios / Roles ============

export const listarUsuarios = (p?: ListParams): Promise<Listado<Usuario>> =>
  invoke("listar_usuarios", params(p));
export const crearUsuario = (nuevo: NuevoUsuario): Promise<Usuario> =>
  invoke("crear_usuario", { nuevo });
export const listarRoles = (): Promise<Rol[]> => invoke("listar_roles");

// ============ Movimientos ============

export const crearMovimiento = (nuevo: NuevoMovimiento): Promise<Movimiento> =>
  invoke("crear_movimiento", { nuevo });
export const crearTraslado = (nuevo: NuevoTraslado): Promise<TrasladoCreado> =>
  invoke("crear_traslado", { nuevo });
export const enviarAAprobacion = (id: string): Promise<Movimiento> =>
  invoke("enviar_a_aprobacion", { id });
export const aprobarMovimiento = (id: string): Promise<Movimiento> =>
  invoke("aprobar_movimiento", { id });
export const anularMovimiento = (id: string): Promise<Movimiento> =>
  invoke("anular_movimiento", { id });
export const listarMovimientos = (p?: ListParams): Promise<Listado<Movimiento>> =>
  invoke("listar_movimientos", params(p));
export const obtenerMovimiento = (id: string): Promise<Movimiento | null> =>
  invoke("obtener_movimiento", { id });
export const listarLineasMovimiento = (
  movimientoId: string,
  p?: ListParams,
): Promise<Listado<LineaMovimiento>> =>
  invoke("listar_lineas_movimiento", { movimientoId, ...params(p) });
export const listarSaldos = (ubicacionId?: string, productoId?: string): Promise<Saldo[]> =>
  invoke("listar_saldos", { ubicacionId, productoId });
export const stockTotalProducto = (productoId: string): Promise<number> =>
  invoke("stock_total_producto", { productoId });
export interface SugerirLineasSalidaArgs {
  productoId: string;
  cantidad: number;
  ubicaciones?: string[];
  subTipo: string;
}
export const sugerirLineasSalida = (args: SugerirLineasSalidaArgs): Promise<SugerenciaLinea[]> =>
  invoke("sugerir_lineas_salida", { ...args });

// ============ Inventario físico ============

export const crearSesionInventario = (nuevo: NuevaSesionInventario): Promise<SesionInventario> =>
  invoke("crear_sesion_inventario", { nuevo });
export const listarSesionesInventario = (estado?: string): Promise<SesionInventario[]> =>
  invoke("listar_sesiones_inventario", { estado });
export const registrarConteo = (nuevo: NuevoConteo): Promise<Conteo> =>
  invoke("registrar_conteo", { nuevo });
export const listarConteos = (sesionId: string): Promise<Conteo[]> =>
  invoke("listar_conteos", { sesionId });
export const diferenciasSesion = (sesionId: string): Promise<DiferenciaInventario[]> =>
  invoke("diferencias_sesion", { sesionId });
export const cerrarSesionInventario = (sesionId: string): Promise<string[]> =>
  invoke("cerrar_sesion_inventario", { sesionId });
export const precisionSesion = (sesionId: string): Promise<PrecisionSesion> =>
  invoke("precision_sesion", { sesionId });

// ============ Comentarios ============

export const crearComentario = (nuevo: NuevoComentario): Promise<Comentario> =>
  invoke("crear_comentario", { nuevo });
export const listarComentarios = (entidad: string, entidadId: string): Promise<Comentario[]> =>
  invoke("listar_comentarios", { entidad, entidadId });
export const editarComentario = (id: string, texto: string): Promise<Comentario> =>
  invoke("editar_comentario", { id, texto });
export const listarHistorialComentario = (comentarioId: string): Promise<HistorialComentario[]> =>
  invoke("listar_historial_comentario", { comentarioId });
export const ocultarComentario = (id: string): Promise<void> =>
  invoke("ocultar_comentario", { id });

// ============ Trazabilidad (SPEC §13.4) ============

export const dondeEstaLote = (loteId: string): Promise<UbicacionDeLote[]> =>
  invoke("donde_esta_lote", { loteId });
export const origenDeSalida = (movimientoId: string): Promise<OrigenLinea[]> =>
  invoke("origen_de_salida", { movimientoId });
export const movimientosDeProductoEnRango = (
  productoId: string,
  desde: string,
  hasta: string,
): Promise<Movimiento[]> =>
  invoke("movimientos_de_producto_en_rango", { productoId, desde, hasta });
export const lotesPorVencer = (dias?: number): Promise<LotePorVencer[]> =>
  invoke("lotes_por_vencer", { dias });
export const historialCaja = (cajaId: string): Promise<HistorialCaja[]> =>
  invoke("historial_caja", { cajaId });

// ============ Alertas (SPEC §17) ============

export const listarAlertas = (estado?: EstadoAlerta, diasPorVencer?: number): Promise<Alerta[]> =>
  invoke("listar_alertas", { estado, diasPorVencer });
export const resolverAlerta = (id: string): Promise<void> => invoke("resolver_alerta", { id });
export const ignorarAlerta = (id: string): Promise<void> => invoke("ignorar_alerta", { id });

// ============ Reportes y KPIs (SPEC §16) ============

export const obtenerDashboard = (): Promise<DashboardResumen> => invoke("obtener_dashboard");
export const obtenerKpisGenerales = (): Promise<KpisGenerales> => invoke("obtener_kpis_generales");
export const kardexProducto = (productoId: string, loteId?: string): Promise<KardexLinea[]> =>
  invoke("kardex_producto", { productoId, loteId });
