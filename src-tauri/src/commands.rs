use std::sync::Arc;

use tauri::State;

use crate::db::DbState;
use crate::domain::catalogo::*;
use crate::domain::inventario::*;
use crate::domain::movimiento::*;
use crate::domain::seguridad::*;
use crate::error::AppResult;
use crate::repo;

// ============ Almacén ============

#[tauri::command]
pub fn listar_almacenes(db: State<'_, Arc<DbState>>) -> AppResult<Vec<Almacen>> {
    let conn = db.conn();
    repo::catalogo::listar_almacenes(&conn)
}

#[tauri::command]
pub fn crear_almacen(db: State<'_, Arc<DbState>>, nuevo: NuevoAlmacen) -> AppResult<Almacen> {
    let conn = db.conn();
    repo::catalogo::crear_almacen(&conn, &nuevo)
}

#[tauri::command]
pub fn obtener_almacen(db: State<'_, Arc<DbState>>, id: String) -> AppResult<Option<Almacen>> {
    let conn = db.conn();
    repo::catalogo::obtener_almacen(&conn, &id)
}

// ============ Zona ============

#[tauri::command]
pub fn listar_zonas(
    db: State<'_, Arc<DbState>>,
    almacen_id: Option<String>,
) -> AppResult<Vec<Zona>> {
    let conn = db.conn();
    repo::catalogo::listar_zonas(&conn, almacen_id.as_deref())
}

#[tauri::command]
pub fn crear_zona(db: State<'_, Arc<DbState>>, nuevo: NuevaZona) -> AppResult<Zona> {
    let conn = db.conn();
    repo::catalogo::crear_zona(&conn, &nuevo)
}

// ============ Rack ============

#[tauri::command]
pub fn listar_racks(db: State<'_, Arc<DbState>>, zona_id: Option<String>) -> AppResult<Vec<Rack>> {
    let conn = db.conn();
    repo::catalogo::listar_racks(&conn, zona_id.as_deref())
}

#[tauri::command]
pub fn crear_rack(db: State<'_, Arc<DbState>>, nuevo: NuevoRack) -> AppResult<Rack> {
    let conn = db.conn();
    repo::catalogo::crear_rack(&conn, &nuevo)
}

// ============ Sección ============

#[tauri::command]
pub fn listar_secciones(
    db: State<'_, Arc<DbState>>,
    rack_id: Option<String>,
) -> AppResult<Vec<Seccion>> {
    let conn = db.conn();
    repo::catalogo::listar_secciones(&conn, rack_id.as_deref())
}

#[tauri::command]
pub fn crear_seccion(db: State<'_, Arc<DbState>>, nuevo: NuevaSeccion) -> AppResult<Seccion> {
    let conn = db.conn();
    repo::catalogo::crear_seccion(&conn, &nuevo)
}

// ============ Ubicación ============

#[tauri::command]
pub fn listar_ubicaciones(
    db: State<'_, Arc<DbState>>,
    seccion_id: Option<String>,
    tipo: Option<String>,
) -> AppResult<Vec<Ubicacion>> {
    let conn = db.conn();
    let tipo_enum = tipo
        .as_deref()
        .and_then(crate::domain::TipoUbicacion::parse);
    repo::catalogo::listar_ubicaciones(&conn, seccion_id.as_deref(), tipo_enum)
}

#[tauri::command]
pub fn crear_ubicacion(db: State<'_, Arc<DbState>>, nuevo: NuevaUbicacion) -> AppResult<Ubicacion> {
    let conn = db.conn();
    repo::catalogo::crear_ubicacion(&conn, &nuevo)
}

#[tauri::command]
pub fn desactivar_ubicacion(
    db: State<'_, Arc<DbState>>,
    id: String,
    by: Option<String>,
) -> AppResult<()> {
    let conn = db.conn();
    repo::catalogo::desactivar_ubicacion(&conn, &id, by.as_deref())
}

// ============ Caja ============

#[tauri::command]
pub fn listar_cajas(
    db: State<'_, Arc<DbState>>,
    ubicacion_id: Option<String>,
) -> AppResult<Vec<Caja>> {
    let conn = db.conn();
    repo::catalogo::listar_cajas(&conn, ubicacion_id.as_deref())
}

#[tauri::command]
pub fn crear_caja(db: State<'_, Arc<DbState>>, nuevo: NuevaCaja) -> AppResult<Caja> {
    let conn = db.conn();
    repo::catalogo::crear_caja(&conn, &nuevo)
}

// ============ Producto ============

#[tauri::command]
pub fn listar_productos(db: State<'_, Arc<DbState>>) -> AppResult<Vec<Producto>> {
    let conn = db.conn();
    repo::catalogo::listar_productos(&conn)
}

#[tauri::command]
pub fn crear_producto(db: State<'_, Arc<DbState>>, nuevo: NuevoProducto) -> AppResult<Producto> {
    let conn = db.conn();
    repo::catalogo::crear_producto(&conn, &nuevo)
}

#[tauri::command]
pub fn obtener_producto(db: State<'_, Arc<DbState>>, id: String) -> AppResult<Option<Producto>> {
    let conn = db.conn();
    repo::catalogo::obtener_producto(&conn, &id)
}

// ============ Lote ============

#[tauri::command]
pub fn listar_lotes(
    db: State<'_, Arc<DbState>>,
    producto_id: Option<String>,
) -> AppResult<Vec<Lote>> {
    let conn = db.conn();
    repo::catalogo::listar_lotes(&conn, producto_id.as_deref())
}

#[tauri::command]
pub fn crear_lote(db: State<'_, Arc<DbState>>, nuevo: NuevoLote) -> AppResult<Lote> {
    let conn = db.conn();
    repo::catalogo::crear_lote(&conn, &nuevo)
}

// ============ Proveedor / Cliente ============

#[tauri::command]
pub fn listar_proveedores(db: State<'_, Arc<DbState>>) -> AppResult<Vec<Proveedor>> {
    let conn = db.conn();
    repo::catalogo::listar_proveedores(&conn)
}

#[tauri::command]
pub fn crear_proveedor(db: State<'_, Arc<DbState>>, nuevo: NuevoProveedor) -> AppResult<Proveedor> {
    let conn = db.conn();
    repo::catalogo::crear_proveedor(&conn, &nuevo)
}

#[tauri::command]
pub fn listar_clientes(db: State<'_, Arc<DbState>>) -> AppResult<Vec<Cliente>> {
    let conn = db.conn();
    repo::catalogo::listar_clientes(&conn)
}

#[tauri::command]
pub fn crear_cliente(db: State<'_, Arc<DbState>>, nuevo: NuevoCliente) -> AppResult<Cliente> {
    let conn = db.conn();
    repo::catalogo::crear_cliente(&conn, &nuevo)
}

// ============ UOM / Categoría ============

#[tauri::command]
pub fn listar_uoms(db: State<'_, Arc<DbState>>) -> AppResult<Vec<Uom>> {
    let conn = db.conn();
    repo::catalogo::listar_uoms(&conn)
}

#[tauri::command]
pub fn crear_uom(db: State<'_, Arc<DbState>>, nuevo: NuevaUom) -> AppResult<Uom> {
    let conn = db.conn();
    repo::catalogo::crear_uom(&conn, &nuevo)
}

#[tauri::command]
pub fn listar_categorias(db: State<'_, Arc<DbState>>) -> AppResult<Vec<Categoria>> {
    let conn = db.conn();
    repo::catalogo::listar_categorias(&conn)
}

#[tauri::command]
pub fn crear_categoria(db: State<'_, Arc<DbState>>, nuevo: NuevaCategoria) -> AppResult<Categoria> {
    let conn = db.conn();
    repo::catalogo::crear_categoria(&conn, &nuevo)
}

// ============ Usuarios / Roles ============

#[tauri::command]
pub fn listar_usuarios(db: State<'_, Arc<DbState>>) -> AppResult<Vec<Usuario>> {
    let conn = db.conn();
    repo::seguridad::listar_usuarios(&conn)
}

#[tauri::command]
pub fn crear_usuario(db: State<'_, Arc<DbState>>, nuevo: NuevoUsuario) -> AppResult<Usuario> {
    let conn = db.conn();
    repo::seguridad::crear_usuario(&conn, &nuevo)
}

#[tauri::command]
pub fn listar_roles(db: State<'_, Arc<DbState>>) -> AppResult<Vec<Rol>> {
    let conn = db.conn();
    repo::seguridad::listar_roles(&conn)
}

#[tauri::command]
pub fn bootstrap_admin(
    db: State<'_, Arc<DbState>>,
    nombre_usuario: String,
    nombre_completo: String,
    password_hash: String,
) -> AppResult<()> {
    let conn = db.conn();
    repo::seguridad::bootstrap_admin(&conn, &nombre_usuario, &nombre_completo, &password_hash)
}

// ============ Movimientos ============

#[tauri::command]
pub fn crear_movimiento(
    db: State<'_, Arc<DbState>>,
    nuevo: NuevoMovimiento,
) -> AppResult<Movimiento> {
    let conn = db.conn();
    repo::movimiento::crear_movimiento(&conn, &nuevo)
}

#[tauri::command]
pub fn enviar_a_aprobacion(
    db: State<'_, Arc<DbState>>,
    id: String,
    by: String,
) -> AppResult<Movimiento> {
    let conn = db.conn();
    repo::movimiento::enviar_a_aprobacion(&conn, &id, &by)
}

#[tauri::command]
pub fn aprobar_movimiento(
    db: State<'_, Arc<DbState>>,
    id: String,
    by: String,
) -> AppResult<Movimiento> {
    let conn = db.conn();
    repo::movimiento::aprobar_movimiento(&conn, &id, &by)
}

#[tauri::command]
pub fn anular_movimiento(
    db: State<'_, Arc<DbState>>,
    id: String,
    by: String,
) -> AppResult<Movimiento> {
    let conn = db.conn();
    repo::movimiento::anular_movimiento(&conn, &id, &by)
}

#[tauri::command]
pub fn listar_movimientos(
    db: State<'_, Arc<DbState>>,
    tipo: Option<String>,
    estado: Option<String>,
) -> AppResult<Vec<Movimiento>> {
    let conn = db.conn();
    repo::movimiento::listar_movimientos(&conn, tipo.as_deref(), estado.as_deref())
}

#[tauri::command]
pub fn obtener_movimiento(
    db: State<'_, Arc<DbState>>,
    id: String,
) -> AppResult<Option<Movimiento>> {
    let conn = db.conn();
    repo::movimiento::obtener_movimiento(&conn, &id)
}

#[tauri::command]
pub fn listar_lineas_movimiento(
    db: State<'_, Arc<DbState>>,
    movimiento_id: String,
) -> AppResult<Vec<LineaMovimiento>> {
    let conn = db.conn();
    repo::movimiento::listar_lineas(&conn, &movimiento_id)
}

#[tauri::command]
pub fn listar_saldos(
    db: State<'_, Arc<DbState>>,
    ubicacion_id: Option<String>,
    producto_id: Option<String>,
) -> AppResult<Vec<Saldo>> {
    let conn = db.conn();
    repo::movimiento::listar_saldos(&conn, ubicacion_id.as_deref(), producto_id.as_deref())
}

#[tauri::command]
pub fn stock_total_producto(db: State<'_, Arc<DbState>>, producto_id: String) -> AppResult<i64> {
    let conn = db.conn();
    repo::movimiento::stock_total_producto(&conn, &producto_id)
}

// ============ Inventario físico ============

#[tauri::command]
pub fn crear_sesion_inventario(
    db: State<'_, Arc<DbState>>,
    nuevo: NuevaSesionInventario,
) -> AppResult<SesionInventario> {
    let conn = db.conn();
    repo::inventario::crear_sesion(&conn, &nuevo)
}

#[tauri::command]
pub fn listar_sesiones_inventario(
    db: State<'_, Arc<DbState>>,
    estado: Option<String>,
) -> AppResult<Vec<SesionInventario>> {
    let conn = db.conn();
    repo::inventario::listar_sesiones(&conn, estado.as_deref())
}

#[tauri::command]
pub fn registrar_conteo(db: State<'_, Arc<DbState>>, nuevo: NuevoConteo) -> AppResult<Conteo> {
    let conn = db.conn();
    repo::inventario::registrar_conteo(&conn, &nuevo)
}

#[tauri::command]
pub fn listar_conteos(db: State<'_, Arc<DbState>>, sesion_id: String) -> AppResult<Vec<Conteo>> {
    let conn = db.conn();
    repo::inventario::listar_conteos(&conn, &sesion_id)
}

#[tauri::command]
pub fn diferencias_sesion(
    db: State<'_, Arc<DbState>>,
    sesion_id: String,
) -> AppResult<Vec<DiferenciaInventario>> {
    let conn = db.conn();
    repo::inventario::diferencias_sesion(&conn, &sesion_id)
}

#[tauri::command]
pub fn cerrar_sesion_inventario(
    db: State<'_, Arc<DbState>>,
    sesion_id: String,
    by: String,
) -> AppResult<Vec<String>> {
    let conn = db.conn();
    repo::inventario::cerrar_sesion(&conn, &sesion_id, &by)
}

/// Expone los comandos al invoke_handler de Tauri.
/// Uso: `.invoke_handler(commands::handler())`
pub fn handler() -> impl Fn(tauri::ipc::Invoke<tauri::Wry>) -> bool {
    tauri::generate_handler![
        listar_almacenes,
        crear_almacen,
        obtener_almacen,
        listar_zonas,
        crear_zona,
        listar_racks,
        crear_rack,
        listar_secciones,
        crear_seccion,
        listar_ubicaciones,
        crear_ubicacion,
        desactivar_ubicacion,
        listar_cajas,
        crear_caja,
        listar_productos,
        crear_producto,
        obtener_producto,
        listar_lotes,
        crear_lote,
        listar_proveedores,
        crear_proveedor,
        listar_clientes,
        crear_cliente,
        listar_uoms,
        crear_uom,
        listar_categorias,
        crear_categoria,
        listar_usuarios,
        crear_usuario,
        listar_roles,
        bootstrap_admin,
        crear_movimiento,
        enviar_a_aprobacion,
        aprobar_movimiento,
        anular_movimiento,
        listar_movimientos,
        obtener_movimiento,
        listar_lineas_movimiento,
        listar_saldos,
        stock_total_producto,
        crear_sesion_inventario,
        listar_sesiones_inventario,
        registrar_conteo,
        listar_conteos,
        diferencias_sesion,
        cerrar_sesion_inventario,
    ]
}
