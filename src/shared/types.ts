/**
 * Tipos espejo del backend Rust (`src-tauri/src/domain/*.rs`, `query.rs`).
 * Los nombres de campo son deliberadamente `snake_case`: son el JSON tal
 * cual lo serializa `serde` desde Rust, no se traducen a camelCase.
 */

// ============ Comunes ============

export interface Auditoria {
  created_by: string | null;
  created_at: string;
  updated_by: string | null;
  updated_at: string;
}

export interface PaginadoMeta {
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
  has_next: boolean;
  has_prev: boolean;
}

export interface Paginado<T> {
  data: T[];
  meta: PaginadoMeta;
}

export interface AgregadoMeta {
  total: number;
}

export interface Agregado<T = Record<string, unknown>> {
  groups: T[];
  meta: AgregadoMeta;
}

/** Respuesta de cualquier `listar_*` (SPEC §15.10): filas o grupos. */
export type Listado<T> = Paginado<T> | Agregado;

export function esPaginado<T>(listado: Listado<T>): listado is Paginado<T> {
  return "data" in listado;
}

/** Parámetros del motor de consulta universal (SPEC §15). */
export interface ListParams {
  page?: number;
  page_size?: number;
  sort?: string;
  q?: string;
  filters?: string[];
  filter_logic?: "AND" | "OR";
  fields?: string[];
  group_by?: string;
  metrics?: string[];
  export?: boolean;
}

// ============ Seguridad (SPEC §4) ============

export interface Usuario {
  id: string;
  nombre_usuario: string;
  nombre_completo: string;
  email: string | null;
  rol_id: string;
  activo: boolean;
  ultimo_acceso_at: string | null;
  created_by: string | null;
  created_at: string;
  updated_by: string | null;
  updated_at: string;
}

export interface NuevoUsuario {
  nombre_usuario: string;
  nombre_completo: string;
  email?: string | null;
  password: string;
  rol_id: string;
}

export interface Rol {
  id: string;
  codigo: string;
  descripcion: string | null;
  es_sistema: boolean;
  created_at: string;
  updated_at: string;
}

// ============ Almacén (SPEC §3.1) ============

export interface Almacen extends Auditoria {
  id: string;
  codigo: string;
  nombre: string;
  descripcion: string | null;
  direccion: string | null;
  activo: boolean;
}

export interface NuevoAlmacen {
  codigo: string;
  nombre: string;
  descripcion?: string | null;
  direccion?: string | null;
}

export interface EditarAlmacen {
  nombre?: string | null;
  descripcion?: string | null;
  direccion?: string | null;
}

// ============ Zona (SPEC §3.2) ============

export interface Zona extends Auditoria {
  id: string;
  codigo: string;
  nombre: string;
  descripcion: string | null;
  almacen_id: string;
  activo: boolean;
}

export interface NuevaZona {
  codigo: string;
  nombre: string;
  descripcion?: string | null;
  almacen_id: string;
}

export interface EditarZona {
  nombre?: string | null;
  descripcion?: string | null;
}

// ============ Rack (SPEC §3.3) ============

export interface Rack extends Auditoria {
  id: string;
  codigo: string;
  nombre: string | null;
  tipo: string | null;
  zona_id: string;
  activo: boolean;
}

export interface NuevoRack {
  codigo: string;
  nombre?: string | null;
  tipo?: string | null;
  zona_id: string;
}

export interface EditarRack {
  nombre?: string | null;
  tipo?: string | null;
}

// ============ Sección (SPEC §3.4) ============

export interface Seccion extends Auditoria {
  id: string;
  codigo: string;
  nombre: string | null;
  nivel: string | null;
  rack_id: string;
  descripcion: string | null;
  activo: boolean;
}

export interface NuevaSeccion {
  codigo: string;
  nombre?: string | null;
  nivel?: string | null;
  rack_id: string;
  descripcion?: string | null;
}

export interface EditarSeccion {
  nombre?: string | null;
  nivel?: string | null;
  descripcion?: string | null;
}

// ============ Ubicación (SPEC §3.5) ============

export type TipoUbicacion =
  | "STANDARD"
  | "PICKING"
  | "RESERVA"
  | "RECEPCION"
  | "CUARENTENA"
  | "DEVOLUCION"
  | "DANADO"
  | "EXPEDICION";

export interface Ubicacion extends Auditoria {
  id: string;
  codigo: string;
  nombre: string | null;
  seccion_id: string | null;
  rack_id: string | null;
  zona_id: string | null;
  tipo: TipoUbicacion;
  capacidad_maxima: number | null;
  activo: boolean;
}

/** Exactamente uno de `seccion_id`/`rack_id`/`zona_id` (SPEC §3.5, §3.13). */
export interface NuevaUbicacion {
  codigo: string;
  nombre?: string | null;
  seccion_id?: string | null;
  rack_id?: string | null;
  zona_id?: string | null;
  tipo?: TipoUbicacion;
  capacidad_maxima?: number | null;
}

export interface EditarUbicacion {
  nombre?: string | null;
  tipo?: TipoUbicacion;
  capacidad_maxima?: number | null;
}

// ============ Caja (SPEC §3.6) ============

export interface Caja extends Auditoria {
  id: string;
  codigo: string;
  nombre: string | null;
  ubicacion_id: string;
  producto_id: string | null;
  lote_id: string | null;
  etiqueta: string | null;
  activo: boolean;
}

export interface NuevaCaja {
  codigo: string;
  nombre?: string | null;
  ubicacion_id: string;
  producto_id?: string | null;
  lote_id?: string | null;
  etiqueta?: string | null;
}

export interface EditarCaja {
  nombre?: string | null;
  etiqueta?: string | null;
}

// ============ Categoría (SPEC §3.8) ============

export interface Categoria extends Auditoria {
  id: string;
  nombre: string;
  parent_id: string | null;
  descripcion: string | null;
  activo: boolean;
}

export interface NuevaCategoria {
  nombre: string;
  parent_id?: string | null;
  descripcion?: string | null;
}

export interface EditarCategoria {
  nombre?: string | null;
  descripcion?: string | null;
  /** `undefined` = no tocar, `null` = mover a raíz, string = nuevo padre. */
  parent_id?: string | null;
}

// ============ UOM (SPEC §3.9) ============

export type TipoUom = "UNIDAD" | "PESO" | "VOLUMEN" | "LONGITUD" | "SUPERFICIE";

export interface Uom {
  id: string;
  codigo: string;
  nombre: string;
  tipo: TipoUom;
  factor: number;
  base: boolean;
  created_at: string;
  updated_at: string;
}

export interface NuevaUom {
  codigo: string;
  nombre: string;
  tipo: TipoUom;
  factor?: number;
  base?: boolean;
}

// ============ Proveedor (SPEC §3.10) / Cliente (SPEC §3.11) ============

export interface Proveedor extends Auditoria {
  id: string;
  codigo: string;
  nombre: string;
  contacto_nombre: string | null;
  contacto_telefono: string | null;
  contacto_email: string | null;
  direccion: string | null;
  activo: boolean;
}

export interface NuevoProveedor {
  codigo: string;
  nombre: string;
  contacto_nombre?: string | null;
  contacto_telefono?: string | null;
  contacto_email?: string | null;
  direccion?: string | null;
}

export type EditarProveedor = Omit<NuevoProveedor, "codigo">;

export interface Cliente extends Auditoria {
  id: string;
  codigo: string;
  nombre: string;
  contacto_nombre: string | null;
  contacto_telefono: string | null;
  contacto_email: string | null;
  direccion: string | null;
  activo: boolean;
}

export interface NuevoCliente {
  codigo: string;
  nombre: string;
  contacto_nombre?: string | null;
  contacto_telefono?: string | null;
  contacto_email?: string | null;
  direccion?: string | null;
}

export type EditarCliente = Omit<NuevoCliente, "codigo">;

// ============ Producto (SPEC §3.7) ============

export interface Producto extends Auditoria {
  id: string;
  sku: string;
  nombre: string;
  descripcion: string | null;
  categoria_id: string | null;
  uom_base_id: string;
  uom_venta_id: string | null;
  uom_compra_id: string | null;
  codigo_barras: string | null;
  peso_unitario: number | null;
  volumen_unitario: number | null;
  stock_minimo: number | null;
  stock_maximo: number | null;
  controla_lote: boolean;
  controla_vencimiento: boolean;
  perecedero: boolean;
  activo: boolean;
}

export interface NuevoProducto {
  sku: string;
  nombre: string;
  descripcion?: string | null;
  categoria_id?: string | null;
  uom_base_id: string;
  uom_venta_id?: string | null;
  uom_compra_id?: string | null;
  codigo_barras?: string | null;
  peso_unitario?: number | null;
  volumen_unitario?: number | null;
  stock_minimo?: number | null;
  stock_maximo?: number | null;
  controla_lote?: boolean;
  controla_vencimiento?: boolean;
  perecedero?: boolean;
}

export interface EditarProducto {
  nombre?: string | null;
  descripcion?: string | null;
  categoria_id?: string | null;
  uom_venta_id?: string | null;
  uom_compra_id?: string | null;
  codigo_barras?: string | null;
  peso_unitario?: number | null;
  volumen_unitario?: number | null;
  stock_minimo?: number | null;
  stock_maximo?: number | null;
  controla_lote?: boolean | null;
  controla_vencimiento?: boolean | null;
  perecedero?: boolean | null;
}

// ============ Lote (SPEC §3.12) ============

export interface Lote extends Auditoria {
  id: string;
  numero: string;
  producto_id: string;
  fecha_fabricacion: string | null;
  fecha_vencimiento: string | null;
  origen: string | null;
  notas: string | null;
}

export interface NuevoLote {
  numero: string;
  producto_id: string;
  fecha_fabricacion?: string | null;
  fecha_vencimiento?: string | null;
  origen?: string | null;
  notas?: string | null;
}

export interface EditarLote {
  fecha_fabricacion?: string | null;
  fecha_vencimiento?: string | null;
  origen?: string | null;
  notas?: string | null;
}

// ============ Movimientos (SPEC §6-10) ============

export type TipoMovimiento = "ENTRADA" | "SALIDA" | "TRASLADO" | "AJUSTE" | "CONSUMO";

export type SubTipoMovimiento =
  | "COMPRA"
  | "DEVOLUCION_CLIENTE"
  | "AJUSTE_POSITIVO"
  | "INICIAL"
  | "TRASLADO_ENTRADA"
  | "CLIENTE"
  | "DEVOLUCION_PROVEEDOR"
  | "MERMA"
  | "AJUSTE_NEGATIVO"
  | "TRASLADO_SALIDA";

export type EstadoMovimiento = "BORRADOR" | "PENDIENTE_APROBACION" | "APROBADO" | "ANULADO";

export interface Movimiento {
  id: string;
  tipo: TipoMovimiento;
  sub_tipo: SubTipoMovimiento;
  numero: string;
  estado: EstadoMovimiento;
  fecha_movimiento: string;
  motivo: string | null;
  origen_ubicacion_id: string | null;
  destino_ubicacion_id: string | null;
  proveedor_id: string | null;
  cliente_id: string | null;
  sesion_inventario_id: string | null;
  documento_referencia: string | null;
  notas: string | null;
  movimiento_inverso_id: string | null;
  created_by: string;
  created_at: string;
  approved_by: string | null;
  approved_at: string | null;
  anulado_by: string | null;
  anulado_at: string | null;
}

export interface NuevaLinea {
  producto_id: string;
  lote_id?: string | null;
  cantidad: number;
  origen_ubicacion_id?: string | null;
  destino_ubicacion_id?: string | null;
  caja_origen_id?: string | null;
  caja_destino_id?: string | null;
}

export interface LineaMovimiento {
  id: string;
  movimiento_id: string;
  producto_id: string;
  lote_id: string | null;
  cantidad: number;
  origen_ubicacion_id: string | null;
  destino_ubicacion_id: string | null;
  caja_origen_id: string | null;
  caja_destino_id: string | null;
}

export interface NuevoMovimiento {
  tipo: TipoMovimiento;
  sub_tipo: SubTipoMovimiento;
  fecha_movimiento?: string | null;
  motivo?: string | null;
  origen_ubicacion_id?: string | null;
  destino_ubicacion_id?: string | null;
  proveedor_id?: string | null;
  cliente_id?: string | null;
  sesion_inventario_id?: string | null;
  documento_referencia?: string | null;
  notas?: string | null;
  lineas: NuevaLinea[];
}

export interface Saldo {
  ubicacion_id: string;
  producto_id: string;
  lote_id: string | null;
  cantidad: number;
  updated_at: string;
}

export interface SugerenciaLinea {
  ubicacion_id: string;
  lote_id: string | null;
  cantidad: number;
}

export interface NuevoTraslado {
  producto_id: string;
  lote_id?: string | null;
  cantidad: number;
  origen_ubicacion_id: string;
  destino_ubicacion_id: string;
  caja_origen_id?: string | null;
  caja_destino_id?: string | null;
  documento_referencia?: string | null;
  notas?: string | null;
}

export interface TrasladoCreado {
  salida: Movimiento;
  entrada: Movimiento | null;
}

// ============ Inventario físico (SPEC §11) ============

export type TipoSesionInventario = "COMPLETO" | "CICLICO";
export type EstadoSesionInventario = "PLANEADA" | "EN_CURSO" | "CERRADA" | "ANULADA";

export interface SesionInventario {
  id: string;
  numero: string;
  tipo: TipoSesionInventario;
  estado: EstadoSesionInventario;
  almacen_id: string;
  alcance: string | null;
  fecha_inicio: string | null;
  fecha_fin: string | null;
  responsable_id: string | null;
  conteo_ciego: boolean;
  exige_doble_conteo: boolean;
  created_by: string;
  created_at: string;
  closed_by: string | null;
  closed_at: string | null;
}

export interface NuevaSesionInventario {
  tipo: TipoSesionInventario;
  almacen_id: string;
  alcance?: string | null;
  fecha_inicio?: string | null;
  fecha_fin?: string | null;
  responsable_id?: string | null;
  conteo_ciego?: boolean;
  exige_doble_conteo?: boolean;
}

export interface Conteo {
  id: string;
  sesion_id: string;
  ubicacion_id: string;
  producto_id: string;
  lote_id: string | null;
  cantidad_contada: number;
  conteo_numero: number;
  usuario_contador_id: string;
  timestamp: string;
  nota: string | null;
}

export interface NuevoConteo {
  sesion_id: string;
  ubicacion_id: string;
  producto_id: string;
  lote_id?: string | null;
  cantidad_contada: number;
  conteo_numero: number;
  nota?: string | null;
}

export interface DiferenciaInventario {
  ubicacion_id: string;
  producto_id: string;
  lote_id: string | null;
  saldo_sistema: number;
  cantidad_contada: number;
  diferencia: number;
  tipo: "conciliado" | "sobrante" | "faltante";
}

export interface PrecisionSesion {
  sesion_id: string;
  skus_contados: number;
  skus_exactos: number;
  precision_sku: number;
  unidades_contadas: number;
  unidades_correctas: number;
  precision_cantidad: number;
  ubicaciones_contadas: number;
  ubicaciones_exactas: number;
  exactitud_ubicacion: number;
}

// ============ Comentarios (SPEC §12) ============

export interface Comentario {
  id: string;
  entidad: string;
  entidad_id: string;
  usuario_id: string;
  texto: string;
  editado: boolean;
  oculto: boolean;
  oculto_by: string | null;
  oculto_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface NuevoComentario {
  entidad: string;
  entidad_id: string;
  texto: string;
}

export interface HistorialComentario {
  id: string;
  comentario_id: string;
  texto_anterior: string;
  editado_by: string | null;
  editado_at: string;
}

// ============ Trazabilidad (SPEC §13.4) ============

export interface UbicacionDeLote {
  ubicacion_id: string;
  ubicacion_codigo: string;
  cantidad: number;
}

export interface OrigenLinea {
  producto_id: string;
  lote_id: string | null;
  movimiento_origen_id: string;
  numero: string;
  sub_tipo: SubTipoMovimiento;
  fecha_movimiento: string;
  cantidad: number;
}

export interface LotePorVencer {
  lote_id: string;
  numero: string;
  producto_id: string;
  sku: string;
  fecha_vencimiento: string;
  cantidad: number;
  vencido: boolean;
}

export interface HistorialCaja {
  movimiento_id: string;
  numero: string;
  tipo: TipoMovimiento;
  sub_tipo: SubTipoMovimiento;
  fecha_movimiento: string;
  producto_id: string;
  cantidad: number;
  rol: "origen" | "destino";
}

// ============ Alertas (SPEC §17) ============

export type TipoAlerta =
  | "STOCK_BAJO"
  | "STOCK_EXCEDIDO"
  | "UBICACION_SOBRECAPACIDAD"
  | "LOTE_POR_VENCER"
  | "LOTE_VENCIDO"
  | "DIFERENCIA_INVENTARIO"
  | "MOVIMIENTO_PENDIENTE";

export type SeveridadAlerta = "INFO" | "MEDIA" | "ALTA";
export type EstadoAlerta = "ABIERTA" | "RESUELTA" | "IGNORADA";

export interface Alerta {
  id: string;
  tipo: TipoAlerta;
  severidad: SeveridadAlerta;
  entidad: string;
  entidad_id: string | null;
  fecha_deteccion: string;
  estado: EstadoAlerta;
  detalle: string | null;
}

// ============ Reportes y KPIs (SPEC §16) ============

export interface DashboardResumen {
  total_skus_activos: number;
  total_unidades: number;
  alertas_activas: number;
  precision_sku_ultima_sesion: number | null;
  movimientos_hoy: number;
  ubicaciones_con_stock: number;
  ubicaciones_totales: number;
  ocupacion_pct: number;
}

export interface KpisGenerales {
  tasa_merma_pct: number;
  lotes_vencidos_sin_dar_de_baja: number;
}

export interface KardexLinea {
  movimiento_id: string;
  numero: string;
  tipo: TipoMovimiento;
  sub_tipo: SubTipoMovimiento;
  fecha_movimiento: string;
  entrada: number;
  salida: number;
  saldo_acumulado: number;
}
