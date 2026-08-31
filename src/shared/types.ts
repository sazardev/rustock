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

// ============ Búsqueda global del command palette (SPEC §15.4) ============

/** Un resultado de la búsqueda global, normalizado para el command palette. */
export interface BuscarItem {
  id: string;
  /** Etiqueta principal (código/SKU/número/nombre). */
  titulo: string;
  /** Etiqueta secundaria legible, o null cuando se compone en `datos`. */
  subtitulo: string | null;
  /** Datos crudos adicionales (clave = nombre de columna): tipo/estado de un
   * movimiento o sesión, entidad ancla de una alerta. */
  datos: Record<string, string> | null;
}

/** Un grupo de resultados para una entidad (recurso) concreta. */
export interface BuscarGrupo {
  /** Clave de recurso (misma nomenclatura que `CATALOGOS` del frontend). */
  recurso: string;
  items: BuscarItem[];
}

export interface BuscarRespuesta {
  query: string;
  grupos: BuscarGrupo[];
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

/**
 * Posición en el mapa 2D/3D de almacenes. `null` = sin posición asignada
 * (el mapa hace fallback a una rejilla automática). `pos_z`/`altura` no los
 * usa el mapa 2D actual; quedan listos para la futura vista 3D.
 */
export interface PosicionMapa {
  pos_x: number | null;
  pos_y: number | null;
  pos_z: number | null;
  altura: number | null;
}

/** Tamaño real del rectángulo en el plano (modo construcción). Solo zonas,
 * pasillos y racks son redimensionables; las ubicaciones son bins de tamaño
 * fijo y el almacén no aparece en el lienzo. */
export interface TamanioMapa {
  ancho: number;
  profundidad: number;
}

/** Payload de `mover_*`: posición tal cual (None borra) + tamaño opcional
 * (`null`/ausente = mantener el actual). Espejo de `PosicionMapa` en Rust. */
export interface PosicionMapaEditable extends PosicionMapa {
  ancho?: number | null;
  profundidad?: number | null;
}

// ============ Almacén (SPEC §3.1) ============

export interface Almacen extends Auditoria, PosicionMapa {
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

export interface Zona extends Auditoria, PosicionMapa, TamanioMapa {
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

// ============ Pasillo (SPEC §3.3b) ============

export interface Pasillo extends Auditoria, PosicionMapa, TamanioMapa {
  id: string;
  codigo: string;
  nombre: string | null;
  zona_id: string;
  activo: boolean;
}

export interface NuevoPasillo {
  codigo: string;
  nombre?: string | null;
  zona_id: string;
}

export interface EditarPasillo {
  nombre?: string | null;
}

// ============ Rack (SPEC §3.3) ============

export interface Rack extends Auditoria, PosicionMapa, TamanioMapa {
  id: string;
  codigo: string;
  nombre: string | null;
  tipo: string | null;
  zona_id: string;
  /** Etiqueta opcional dentro de un pasillo de la misma zona (SPEC §3.3b). */
  pasillo_id: string | null;
  activo: boolean;
}

export interface NuevoRack {
  codigo: string;
  nombre?: string | null;
  tipo?: string | null;
  zona_id: string;
  pasillo_id?: string | null;
}

/** `pasillo_id`: `undefined` = no tocar, `null` = quitar, string = reasignar. */
export interface EditarRack {
  nombre?: string | null;
  tipo?: string | null;
  pasillo_id?: string | null;
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

export interface Ubicacion extends Auditoria, PosicionMapa {
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
  activo: boolean;
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

export interface EditarUom {
  nombre?: string | null;
  tipo?: TipoUom;
  factor?: number | null;
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

/** Cambios sobre un movimiento en BORRADOR/PENDIENTE_APROBACION (SPEC §6.2).
 *  `tipo`/`sub_tipo`/`numero` son estables; solo se actualizan campos
 *  operativos y se reemplazan las líneas. Enviar `null` en un campo opcional
 *  lo deja nulo; omitirlo (undefined) lo deja como está. */
export interface EditarMovimiento {
  fecha_movimiento?: string | null;
  motivo?: string | null;
  proveedor_id?: string | null;
  cliente_id?: string | null;
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

/** Resultado de resolver un código escaneado (SPEC §14.3, captura rápida). */
export interface EscaneoResuelto {
  tipo: "PRODUCTO" | "UBICACION" | "LOTE" | "CAJA";
  id: string;
  etiqueta: string;
  /** Solo PRODUCTO: si el producto exige lote (decide el paso siguiente). */
  controla_lote?: boolean;
}

/** Origen físico de la lectura. */
export type OrigenEscaneo = "CAMARA" | "TECLADO" | "MANUAL";

/** Para qué se está escaneando: decide qué ofrece la pantalla al resolver. */
export type PropositoEscaneo = "CONSULTA" | "CAPTURA" | "INVENTARIO" | "ETIQUETA";

/** Desenlace de una lectura (SPEC §14.3). */
export type ResultadoEscaneoTipo = "RESUELTO" | "NO_ENCONTRADO" | "DENEGADO";

/** Lo que la interfaz envía al escanear: el código y su contexto. */
export interface EntradaEscaneo {
  codigo: string;
  origen: OrigenEscaneo;
  formato?: string | null;
  proposito: PropositoEscaneo;
  ruta?: string | null;
  ubicacion_contexto_id?: string | null;
  latitud?: number | null;
  longitud?: number | null;
  dispositivo?: string | null;
}

/** Respuesta del backend a una lectura, con el evento ya registrado. */
export interface ResultadoEscaneo {
  evento_id: string;
  resultado: ResultadoEscaneoTipo;
  motivo: string | null;
  resuelto: EscaneoResuelto | null;
  /** Lecturas fallidas seguidas del usuario en los últimos 10 minutos. */
  fallos_recientes: number;
  /** Qué se puede hacer ahora, según lo leído y los permisos de quien lee. */
  acciones: AccionEscaneo[];
}

/** Una fila del registro de escaneos (auditoría; exige `escaneo:ver`). */
export interface EventoEscaneo {
  id: string;
  codigo: string;
  resultado: ResultadoEscaneoTipo;
  motivo: string | null;
  tipo_entidad: string | null;
  entidad_id: string | null;
  entidad_etiqueta: string | null;
  origen: OrigenEscaneo;
  formato: string | null;
  proposito: PropositoEscaneo;
  ruta: string | null;
  usuario_id: string;
  usuario_nombre: string | null;
  rol_codigo: string;
  ubicacion_contexto_id: string | null;
  duracion_ms: number | null;
  created_at: string;
}

/** Acción ofrecida tras una lectura. La decide el backend, con los permisos. */
export interface AccionEscaneo {
  clave: string;
  etiqueta: string;
  href: string;
  /** La acción sugerida para este resultado y propósito. */
  principal: boolean;
}

/** Código que falla repetidamente: casi siempre una etiqueta a reimprimir. */
export interface CodigoProblematico {
  codigo: string;
  intentos: number;
  ultimo_intento: string;
  /** Personas distintas que han tropezado con él. */
  personas: number;
}

export interface ActividadUsuarioEscaneo {
  usuario_id: string;
  usuario_nombre: string | null;
  rol_codigo: string;
  total: number;
  resueltos: number;
  no_encontrados: number;
  denegados: number;
  acierto: number;
}

export interface IntentoDenegado {
  usuario_id: string;
  usuario_nombre: string | null;
  rol_codigo: string;
  intentos: number;
  ultimo_intento: string;
}

export interface VolumenHora {
  hora: number;
  total: number;
}

/** Todo lo que muestra el panel de escaneos, resuelto en el backend. */
export interface MetricasEscaneo {
  total: number;
  resueltos: number;
  no_encontrados: number;
  denegados: number;
  acierto: number;
  por_camara: number;
  por_teclado: number;
  duracion_media_ms: number;
  codigos_problematicos: CodigoProblematico[];
  por_usuario: ActividadUsuarioEscaneo[];
  denegados_por_usuario: IntentoDenegado[];
  por_hora: VolumenHora[];
}

/** Simbología de una etiqueta imprimible (SPEC §14.3.5). */
export type Simbologia = "CODE128" | "QR";

/** Tipos de entidad que se pueden etiquetar — los mismos que resuelve el escáner. */
export type TipoEtiqueta = "PRODUCTO" | "UBICACION" | "LOTE" | "CAJA";

/** Entidad candidata a etiquetar, para el selector. */
export interface Etiquetable {
  id: string;
  codigo: string;
  nombre: string;
}

// ============ Reglas de negocio (SPEC §16) ============

/** Nivel del árbol físico donde aplica una regla. */
export type AmbitoRegla = "ALMACEN" | "ZONA" | "PASILLO" | "RACK" | "SECCION" | "UBICACION";

/** Qué limita o prohíbe la regla. */
export type TipoRegla =
  | "PESO_MAXIMO"
  | "CANTIDAD_MAXIMA"
  | "VOLUMEN_MAXIMO"
  | "PRODUCTOS_DISTINTOS_MAXIMO"
  | "CATEGORIA_PROHIBIDA"
  | "CATEGORIA_EXCLUSIVA"
  | "PRODUCTO_PROHIBIDO"
  | "REQUIERE_LOTE"
  | "PROHIBIR_VENCIDO";

/** Qué ocurre al incumplirla. */
export type SeveridadRegla = "BLOQUEA" | "ADVIERTE";

export interface Regla {
  id: string;
  codigo: string;
  nombre: string;
  descripcion: string | null;
  ambito: AmbitoRegla;
  /** `null` = aplica a todos los elementos de ese ámbito. */
  ambito_id: string | null;
  ambito_etiqueta: string | null;
  tipo: TipoRegla;
  valor_numerico: number | null;
  valor_referencia: string | null;
  referencia_etiqueta: string | null;
  severidad: SeveridadRegla;
  mensaje: string | null;
  activa: boolean;
  created_at: string;
  updated_at: string;
  created_by: string | null;
  updated_by: string | null;
}

export interface NuevaRegla {
  codigo: string;
  nombre: string;
  descripcion?: string | null;
  ambito: AmbitoRegla;
  ambito_id?: string | null;
  tipo: TipoRegla;
  valor_numerico?: number | null;
  valor_referencia?: string | null;
  severidad: SeveridadRegla;
  mensaje?: string | null;
  activa: boolean;
}

/** Regla incumplida por una línea concreta. */
export interface Incumplimiento {
  regla_id: string;
  regla_codigo: string;
  regla_nombre: string;
  severidad: SeveridadRegla;
  mensaje: string;
  ubicacion_codigo: string;
  valor_resultante: number | null;
  limite: number | null;
}

/** Formato de salida de una tanda de etiquetas. */
export type FormatoEtiqueta = "SVG" | "ZPL" | "EPL" | "PDF";

/** Resolución de la impresora. ZPL y EPL miden en puntos, no en milímetros. */
export type DpiImpresora = "d203" | "d300" | "d600";

/** Disposición sobre el papel. */
export type DisposicionEtiqueta = "rollo" | "hoja";

/** Impresora de etiquetas conectada por red (puerto 9100). */
export interface DestinoImpresora {
  host: string;
  puerto: number;
}

export interface ResultadoImpresion {
  enviado: boolean;
  bytes: number;
  destino: string;
}

/** Tanda lista para descargar o enviar a la impresora. */
export interface TandaEtiquetas {
  etiquetas: Etiqueta[];
  formato: FormatoEtiqueta;
  mime: string;
  extension: string;
  contenido_base64: string;
  nombre_archivo: string;
}

/** Petición de impresión. Las medidas son milímetros reales sobre el papel. */
export interface PeticionEtiquetas {
  tipo: TipoEtiqueta;
  ids: string[];
  simbologia: Simbologia;
  ancho_mm: number;
  alto_mm: number;
  formato?: FormatoEtiqueta;
  dpi?: DpiImpresora;
  disposicion?: DisposicionEtiqueta;
}

/** Etiqueta generada por el backend: SVG listo para imprimir. */
export interface Etiqueta {
  tipo: string;
  entidad_id: string;
  /** El código impreso — exactamente lo que leerá el escáner. */
  codigo: string;
  titulo: string;
  subtitulo: string | null;
  simbologia: string;
  svg: string;
  /** Ancho de la barra estrecha en mm (solo Code128). Decide si se podrá leer. */
  modulo_mm: number | null;
  /** Aviso de legibilidad cuando las barras quedan demasiado finas. */
  advertencia: string | null;
}

/** Resultado de una fila importada (importación masiva). */
export interface ResultadoImportacion {
  fila: number;
  ok: boolean;
  error: string | null;
  id: string | null;
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
  anulado_by: string | null;
  anulado_at: string | null;
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

export interface BucketVencimiento {
  lotes: LotePorVencer[];
  total_lotes: number;
  total_unidades: number;
}

export interface VencimientosPorRango {
  vencidos: BucketVencimiento;
  proximos_30: BucketVencimiento;
  proximos_60: BucketVencimiento;
  proximos_90: BucketVencimiento;
}

export interface DesempenoUsuario {
  usuario_id: string;
  nombre_usuario: string;
  nombre_completo: string;
  total_movimientos: number;
  entradas: number;
  salidas: number;
  traslados: number;
  ajustes: number;
  aprobados: number;
  anulados: number;
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

export interface MovimientosHoyPorTipo {
  entradas: number;
  salidas: number;
  traslados: number;
  ajustes: number;
}

export interface DashboardResumen {
  total_skus_activos: number;
  total_unidades: number;
  valor_inventario: number;
  alertas_activas: number;
  precision_sku_ultima_sesion: number | null;
  movimientos_hoy: number;
  movimientos_hoy_por_tipo: MovimientosHoyPorTipo;
  ubicaciones_con_stock: number;
  ubicaciones_totales: number;
  ocupacion_pct: number;
}

export interface KpisGenerales {
  precision_sku_ultima_sesion: number | null;
  precision_cantidad_ultima_sesion: number | null;
  exactitud_ubicacion_ultima_sesion: number | null;
  rotacion_stock_30d: number;
  dias_cobertura: number | null;
  tasa_merma_pct: number;
  lotes_vencidos_sin_dar_de_baja: number;
  antiguedad_stock_dias: number | null;
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

// ============ Configuración de empresa y preferencias (SPEC §4.3, §14.4, §17.1) ============

/** Formatos de fecha soportados (DESIGN §9.2). */
export type FormatoFecha = "DD_MMM_YYYY" | "DD_MM_YYYY" | "YYYY_MM_DD";
/** Tamaños de fuente de la UI. */
export type TamanioFuente = "PEQUENA" | "MEDIA" | "GRANDE";

/** Una copia de seguridad existente (espejo de `repo::backup::Copia`). */
export interface CopiaSeguridad {
  /** Nombre del fichero, que es su identificador. */
  nombre: string;
  ruta: string;
  bytes: number;
  creada_en: string;
}

export interface ConfiguracionEmpresa {
  id: string;
  nombre: string | null;
  codigo: string | null;
  descripcion: string | null;
  zona_horaria: string;
  formato_fecha: string;
  dias_aviso_vencimiento: number;
  requiere_aprobacion: boolean;
  stock_minimo_default: number | null;
  pais: string | null;
  ciudad: string | null;
  direccion: string | null;
  codigo_postal: string | null;
  razon_social: string | null;
  documento_fiscal: string | null;
  direccion_fiscal: string | null;
  telefono: string | null;
  email_contacto: string | null;
  sitio_web: string | null;
  latitud: number | null;
  longitud: number | null;
  /** Paleta de tema global (DESIGN §3.1). */
  tema_id: string;
  /** Modo oscuro global (interruptor claro/oscuro). */
  modo_oscuro: boolean;
  updated_by: string | null;
  updated_at: string;
}

export interface EditarConfiguracionEmpresa {
  nombre?: string | null;
  codigo?: string | null;
  descripcion?: string | null;
  zona_horaria?: string;
  formato_fecha?: string;
  dias_aviso_vencimiento?: number;
  requiere_aprobacion?: boolean;
  stock_minimo_default?: number | null;
  pais?: string | null;
  ciudad?: string | null;
  direccion?: string | null;
  codigo_postal?: string | null;
  razon_social?: string | null;
  documento_fiscal?: string | null;
  direccion_fiscal?: string | null;
  telefono?: string | null;
  email_contacto?: string | null;
  sitio_web?: string | null;
  latitud?: number | null;
  longitud?: number | null;
  /** Id de la paleta de tema (se valida contra la lista de paletas). */
  tema_id?: string;
  /** Modo oscuro global. */
  modo_oscuro?: boolean;
}

/** Preferencias de la sesión activa resueltas (fallbacks de la empresa aplicados). */
export interface PreferenciasResueltas {
  usuario_id: string;
  tamano_fuente: string;
  orden_sidebar: string | null;
  zona_horaria: string;
  formato_fecha: string;
  dias_aviso_vencimiento: number;
  requiere_aprobacion: boolean;
  stock_minimo_default: number | null;
  /** Paleta de tema activa (resuelta). */
  tema_id: string;
  /** true si el usuario no fijó paleta propia (hereda la de la empresa). */
  tema_heredado: boolean;
  /** Modo oscuro activo (resuelto). */
  modo_oscuro: boolean;
  /** true si el usuario no fijó modo propio (hereda el de la empresa). */
  modo_oscuro_heredado: boolean;
  /** ¿Mostrar sugerencias de Ayuda en el command palette (Ctrl+K)? */
  ayuda_en_palette: boolean;
}

export interface EditarPreferenciasUsuario {
  tamano_fuente?: string;
  /** JSON string con el orden de hrefs del sidebar, o null para el orden por defecto. */
  orden_sidebar?: string | null;
  /** null = heredar de la empresa. */
  zona_horaria?: string | null;
  /** null = heredar de la empresa. */
  formato_fecha?: string | null;
  /** Paleta de tema: omitir = no cambiar, null = heredar de la empresa, string = fijar. */
  tema_id?: string | null;
  /** Modo oscuro: omitir = no cambiar, null = heredar de la empresa, boolean = fijar. */
  modo_oscuro?: boolean | null;
  /** Mostrar ayuda en el command palette: omitir = no cambiar. */
  ayuda_en_palette?: boolean;
}

export interface EditarUsuario {
  nombre_completo?: string;
  email?: string | null;
  rol_id?: string;
}

/** Zonas horarias que la UI ofrece (espejo de ZONAS_HORARIAS en Rust). */
export const ZONAS_HORARIAS = [
  "America/Lima",
  "America/Mexico_City",
  "America/Bogota",
  "America/Santiago",
  "America/Argentina/Buenos_Aires",
  "America/Caracas",
  "America/Guatemala",
  "America/Panama",
  "America/Havana",
  "America/Sao_Paulo",
  "Europe/Madrid",
  "UTC",
] as const;

// ============ Sucursales (config de empresa, solo ADMIN) ============

export interface Sucursal extends Auditoria {
  id: string;
  codigo: string;
  nombre: string;
  pais: string | null;
  ciudad: string | null;
  direccion: string | null;
  latitud: number | null;
  longitud: number | null;
  activo: boolean;
}

export interface NuevaSucursal {
  codigo: string;
  nombre: string;
  pais?: string | null;
  ciudad?: string | null;
  direccion?: string | null;
  latitud?: number | null;
  longitud?: number | null;
}

export interface EditarSucursal {
  nombre?: string;
  pais?: string | null;
  ciudad?: string | null;
  direccion?: string | null;
  latitud?: number | null;
  longitud?: number | null;
}

// ============ Archivos de empresa (logo + documentos, solo ADMIN) ============

export interface ArchivoEmpresa {
  id: string;
  nombre: string;
  tipo: "LOGO" | "DOCUMENTO";
  mime: string;
  tamano: number;
  created_by: string | null;
  created_at: string;
}

export interface ArchivoEmpresaCompleto extends ArchivoEmpresa {
  datos_base64: string;
}

export interface NuevoArchivoEmpresa {
  nombre: string;
  tipo: "LOGO" | "DOCUMENTO";
  mime: string;
  datos_base64: string;
}

/** Países que la UI ofrece (nombres en español, código ISO). */
export const PAISES = [
  "Argentina",
  "Bolivia",
  "Brasil",
  "Chile",
  "Colombia",
  "Costa Rica",
  "Cuba",
  "Ecuador",
  "El Salvador",
  "España",
  "Guatemala",
  "Honduras",
  "México",
  "Nicaragua",
  "Panamá",
  "Paraguay",
  "Perú",
  "República Dominicana",
  "Uruguay",
  "Venezuela",
  "Estados Unidos",
  "Otro",
] as const;

// ============ Temas de la UI (DESIGN §3.1) ============

export type ModoColor = "CLARO" | "OSCURO";

/** Resumen de una paleta predefinida para el selector. */
export interface ResumenTema {
  id: string;
  nombre: string;
  color_claro: string;
  color_oscuro: string;
}

/** Tema resuelto: el mapa de variables CSS token -> valor para aplicar. */
export interface TemaActivo {
  id: string;
  nombre: string;
  modo: ModoColor;
  variables: Record<string, string>;
}
