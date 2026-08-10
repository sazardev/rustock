use std::sync::Arc;

use tauri::State;

use crate::db::DbState;
use crate::domain::catalogo::*;
use crate::domain::inventario::*;
use crate::domain::movimiento::*;
use crate::domain::seguridad::*;
use crate::domain::Listado;
use crate::error::AppResult;
use crate::query::{self, ListParams};
use crate::repo;
use crate::security::puede;
use crate::sesion::{SesionActiva, SesionState};

/// Ejecuta un comando, mide su duración y registra la invocación en el
/// historial de auditoría (SPEC §4.5, §13) — incluye los intentos denegados
/// (`SinPermiso`) y sin sesión (`NoAutenticado`), nunca solo los éxitos. El
/// actor se lee de la sesión activa (nunca de un parámetro del invocador).
macro_rules! con_auditoria {
    ($db:expr, $sesion:expr, $comando:expr, $cuerpo:expr) => {{
        let inicio = std::time::Instant::now();
        let actor = $sesion.actual().map(|s| s.usuario_id);
        let resultado = $cuerpo;
        let duracion_ms = inicio.elapsed().as_millis() as i64;
        let exito = resultado.is_ok();
        {
            let conn = $db.conn();
            let _ = repo::auditoria::registrar_invocacion(
                &conn,
                actor.as_deref(),
                $comando,
                duracion_ms,
                exito,
                None,
            );
        }
        resultado
    }};
}

// ============ Autenticación y sesión (SPEC §4.1) ============

/// Verifica credenciales y abre la sesión activa del proceso. Ningún otro
/// comando acepta un id de usuario del invocador: todos leen el actor de aquí.
#[tauri::command]
pub fn login(
    db: State<'_, Arc<DbState>>,
    sesion: State<'_, Arc<SesionState>>,
    nombre_usuario: String,
    password: String,
) -> AppResult<Usuario> {
    let resultado = {
        let conn = db.conn();
        repo::seguridad::verificar_credenciales(&conn, &nombre_usuario, &password)
    };
    let duracion_ms = 0;
    let exito = resultado.is_ok();
    {
        let conn = db.conn();
        let actor = resultado.as_ref().ok().map(|u: &Usuario| u.id.clone());
        let _ = repo::auditoria::registrar_invocacion(
            &conn,
            actor.as_deref(),
            "login",
            duracion_ms,
            exito,
            None,
        );
    }
    let usuario = resultado?;
    let rol_codigo = {
        let conn = db.conn();
        repo::seguridad::rol_codigo_de_usuario(&conn, &usuario.id)?
    };
    sesion.iniciar(SesionActiva {
        usuario_id: usuario.id.clone(),
        nombre_usuario: usuario.nombre_usuario.clone(),
        rol_codigo,
    });
    Ok(usuario)
}

#[tauri::command]
pub fn logout(sesion: State<'_, Arc<SesionState>>) -> AppResult<()> {
    sesion.cerrar();
    Ok(())
}

/// Usuario de la sesión activa, o `None` si nadie ha iniciado sesión.
#[tauri::command]
pub fn quien_soy(
    db: State<'_, Arc<DbState>>,
    sesion: State<'_, Arc<SesionState>>,
) -> AppResult<Option<Usuario>> {
    let Some(actual) = sesion.actual() else {
        return Ok(None);
    };
    let conn = db.conn();
    repo::seguridad::obtener_usuario(&conn, &actual.usuario_id)
}

// ============ Almacén ============

#[tauri::command]
pub fn listar_almacenes(
    db: State<'_, Arc<DbState>>,
    sesion: State<'_, Arc<SesionState>>,
    params: ListParams,
) -> AppResult<Listado> {
    con_auditoria!(db, sesion, "listar_almacenes", {
        let conn = db.conn();
        puede(&conn, Some(&sesion.usuario_id()?), "almacen", "ver")?;
        query::listar(&conn, &query::ALMACEN_SCHEMA, &params)
    })
}

#[tauri::command]
pub fn crear_almacen(
    db: State<'_, Arc<DbState>>,
    sesion: State<'_, Arc<SesionState>>,
    mut nuevo: NuevoAlmacen,
) -> AppResult<Almacen> {
    con_auditoria!(db, sesion, "crear_almacen", {
        nuevo.created_by = Some(sesion.usuario_id()?);
        let conn = db.conn();
        repo::catalogo::crear_almacen(&conn, &nuevo)
    })
}

#[tauri::command]
pub fn obtener_almacen(
    db: State<'_, Arc<DbState>>,
    sesion: State<'_, Arc<SesionState>>,
    id: String,
) -> AppResult<Option<Almacen>> {
    con_auditoria!(db, sesion, "obtener_almacen", {
        let conn = db.conn();
        puede(&conn, Some(&sesion.usuario_id()?), "almacen", "ver")?;
        repo::catalogo::obtener_almacen(&conn, &id)
    })
}

// ============ Zona ============

#[tauri::command]
pub fn listar_zonas(
    db: State<'_, Arc<DbState>>,
    sesion: State<'_, Arc<SesionState>>,
    params: ListParams,
) -> AppResult<Listado> {
    con_auditoria!(db, sesion, "listar_zonas", {
        let conn = db.conn();
        puede(&conn, Some(&sesion.usuario_id()?), "zona", "ver")?;
        query::listar(&conn, &query::ZONA_SCHEMA, &params)
    })
}

#[tauri::command]
pub fn crear_zona(
    db: State<'_, Arc<DbState>>,
    sesion: State<'_, Arc<SesionState>>,
    mut nuevo: NuevaZona,
) -> AppResult<Zona> {
    con_auditoria!(db, sesion, "crear_zona", {
        nuevo.created_by = Some(sesion.usuario_id()?);
        let conn = db.conn();
        repo::catalogo::crear_zona(&conn, &nuevo)
    })
}

// ============ Rack ============

#[tauri::command]
pub fn listar_racks(
    db: State<'_, Arc<DbState>>,
    sesion: State<'_, Arc<SesionState>>,
    params: ListParams,
) -> AppResult<Listado> {
    con_auditoria!(db, sesion, "listar_racks", {
        let conn = db.conn();
        puede(&conn, Some(&sesion.usuario_id()?), "rack", "ver")?;
        query::listar(&conn, &query::RACK_SCHEMA, &params)
    })
}

#[tauri::command]
pub fn crear_rack(
    db: State<'_, Arc<DbState>>,
    sesion: State<'_, Arc<SesionState>>,
    mut nuevo: NuevoRack,
) -> AppResult<Rack> {
    con_auditoria!(db, sesion, "crear_rack", {
        nuevo.created_by = Some(sesion.usuario_id()?);
        let conn = db.conn();
        repo::catalogo::crear_rack(&conn, &nuevo)
    })
}

// ============ Sección ============

#[tauri::command]
pub fn listar_secciones(
    db: State<'_, Arc<DbState>>,
    sesion: State<'_, Arc<SesionState>>,
    params: ListParams,
) -> AppResult<Listado> {
    con_auditoria!(db, sesion, "listar_secciones", {
        let conn = db.conn();
        puede(&conn, Some(&sesion.usuario_id()?), "seccion", "ver")?;
        query::listar(&conn, &query::SECCION_SCHEMA, &params)
    })
}

#[tauri::command]
pub fn crear_seccion(
    db: State<'_, Arc<DbState>>,
    sesion: State<'_, Arc<SesionState>>,
    mut nuevo: NuevaSeccion,
) -> AppResult<Seccion> {
    con_auditoria!(db, sesion, "crear_seccion", {
        nuevo.created_by = Some(sesion.usuario_id()?);
        let conn = db.conn();
        repo::catalogo::crear_seccion(&conn, &nuevo)
    })
}

// ============ Ubicación ============

#[tauri::command]
pub fn listar_ubicaciones(
    db: State<'_, Arc<DbState>>,
    sesion: State<'_, Arc<SesionState>>,
    params: ListParams,
) -> AppResult<Listado> {
    con_auditoria!(db, sesion, "listar_ubicaciones", {
        let conn = db.conn();
        puede(&conn, Some(&sesion.usuario_id()?), "ubicacion", "ver")?;
        query::listar(&conn, &query::UBICACION_SCHEMA, &params)
    })
}

#[tauri::command]
pub fn crear_ubicacion(
    db: State<'_, Arc<DbState>>,
    sesion: State<'_, Arc<SesionState>>,
    mut nuevo: NuevaUbicacion,
) -> AppResult<Ubicacion> {
    con_auditoria!(db, sesion, "crear_ubicacion", {
        nuevo.created_by = Some(sesion.usuario_id()?);
        let conn = db.conn();
        repo::catalogo::crear_ubicacion(&conn, &nuevo)
    })
}

#[tauri::command]
pub fn desactivar_ubicacion(
    db: State<'_, Arc<DbState>>,
    sesion: State<'_, Arc<SesionState>>,
    id: String,
) -> AppResult<()> {
    con_auditoria!(db, sesion, "desactivar_ubicacion", {
        let actor = sesion.usuario_id()?;
        let conn = db.conn();
        repo::catalogo::desactivar_ubicacion(&conn, &id, Some(&actor))
    })
}

// ============ Caja ============

#[tauri::command]
pub fn listar_cajas(
    db: State<'_, Arc<DbState>>,
    sesion: State<'_, Arc<SesionState>>,
    params: ListParams,
) -> AppResult<Listado> {
    con_auditoria!(db, sesion, "listar_cajas", {
        let conn = db.conn();
        puede(&conn, Some(&sesion.usuario_id()?), "caja", "ver")?;
        query::listar(&conn, &query::CAJA_SCHEMA, &params)
    })
}

#[tauri::command]
pub fn crear_caja(
    db: State<'_, Arc<DbState>>,
    sesion: State<'_, Arc<SesionState>>,
    mut nuevo: NuevaCaja,
) -> AppResult<Caja> {
    con_auditoria!(db, sesion, "crear_caja", {
        nuevo.created_by = Some(sesion.usuario_id()?);
        let conn = db.conn();
        repo::catalogo::crear_caja(&conn, &nuevo)
    })
}

// ============ Producto ============

#[tauri::command]
pub fn listar_productos(
    db: State<'_, Arc<DbState>>,
    sesion: State<'_, Arc<SesionState>>,
    params: ListParams,
) -> AppResult<Listado> {
    con_auditoria!(db, sesion, "listar_productos", {
        let conn = db.conn();
        puede(&conn, Some(&sesion.usuario_id()?), "producto", "ver")?;
        query::listar(&conn, &query::PRODUCTO_SCHEMA, &params)
    })
}

#[tauri::command]
pub fn crear_producto(
    db: State<'_, Arc<DbState>>,
    sesion: State<'_, Arc<SesionState>>,
    mut nuevo: NuevoProducto,
) -> AppResult<Producto> {
    con_auditoria!(db, sesion, "crear_producto", {
        nuevo.created_by = Some(sesion.usuario_id()?);
        let conn = db.conn();
        repo::catalogo::crear_producto(&conn, &nuevo)
    })
}

#[tauri::command]
pub fn obtener_producto(
    db: State<'_, Arc<DbState>>,
    sesion: State<'_, Arc<SesionState>>,
    id: String,
) -> AppResult<Option<Producto>> {
    con_auditoria!(db, sesion, "obtener_producto", {
        let conn = db.conn();
        puede(&conn, Some(&sesion.usuario_id()?), "producto", "ver")?;
        repo::catalogo::obtener_producto(&conn, &id)
    })
}

// ============ Lote ============

#[tauri::command]
pub fn listar_lotes(
    db: State<'_, Arc<DbState>>,
    sesion: State<'_, Arc<SesionState>>,
    params: ListParams,
) -> AppResult<Listado> {
    con_auditoria!(db, sesion, "listar_lotes", {
        let conn = db.conn();
        puede(&conn, Some(&sesion.usuario_id()?), "lote", "ver")?;
        query::listar(&conn, &query::LOTE_SCHEMA, &params)
    })
}

#[tauri::command]
pub fn crear_lote(
    db: State<'_, Arc<DbState>>,
    sesion: State<'_, Arc<SesionState>>,
    mut nuevo: NuevoLote,
) -> AppResult<Lote> {
    con_auditoria!(db, sesion, "crear_lote", {
        nuevo.created_by = Some(sesion.usuario_id()?);
        let conn = db.conn();
        repo::catalogo::crear_lote(&conn, &nuevo)
    })
}

// ============ Proveedor / Cliente ============

#[tauri::command]
pub fn listar_proveedores(
    db: State<'_, Arc<DbState>>,
    sesion: State<'_, Arc<SesionState>>,
    params: ListParams,
) -> AppResult<Listado> {
    con_auditoria!(db, sesion, "listar_proveedores", {
        let conn = db.conn();
        puede(&conn, Some(&sesion.usuario_id()?), "proveedor", "ver")?;
        query::listar(&conn, &query::PROVEEDOR_SCHEMA, &params)
    })
}

#[tauri::command]
pub fn crear_proveedor(
    db: State<'_, Arc<DbState>>,
    sesion: State<'_, Arc<SesionState>>,
    mut nuevo: NuevoProveedor,
) -> AppResult<Proveedor> {
    con_auditoria!(db, sesion, "crear_proveedor", {
        nuevo.created_by = Some(sesion.usuario_id()?);
        let conn = db.conn();
        repo::catalogo::crear_proveedor(&conn, &nuevo)
    })
}

#[tauri::command]
pub fn listar_clientes(
    db: State<'_, Arc<DbState>>,
    sesion: State<'_, Arc<SesionState>>,
    params: ListParams,
) -> AppResult<Listado> {
    con_auditoria!(db, sesion, "listar_clientes", {
        let conn = db.conn();
        puede(&conn, Some(&sesion.usuario_id()?), "cliente", "ver")?;
        query::listar(&conn, &query::CLIENTE_SCHEMA, &params)
    })
}

#[tauri::command]
pub fn crear_cliente(
    db: State<'_, Arc<DbState>>,
    sesion: State<'_, Arc<SesionState>>,
    mut nuevo: NuevoCliente,
) -> AppResult<Cliente> {
    con_auditoria!(db, sesion, "crear_cliente", {
        nuevo.created_by = Some(sesion.usuario_id()?);
        let conn = db.conn();
        repo::catalogo::crear_cliente(&conn, &nuevo)
    })
}

// ============ UOM / Categoría ============

#[tauri::command]
pub fn listar_uoms(
    db: State<'_, Arc<DbState>>,
    sesion: State<'_, Arc<SesionState>>,
    params: ListParams,
) -> AppResult<Listado> {
    con_auditoria!(db, sesion, "listar_uoms", {
        let conn = db.conn();
        puede(&conn, Some(&sesion.usuario_id()?), "uom", "ver")?;
        query::listar(&conn, &query::UOM_SCHEMA, &params)
    })
}

#[tauri::command]
pub fn crear_uom(
    db: State<'_, Arc<DbState>>,
    sesion: State<'_, Arc<SesionState>>,
    nuevo: NuevaUom,
) -> AppResult<Uom> {
    con_auditoria!(db, sesion, "crear_uom", {
        let actor = sesion.usuario_id()?;
        let conn = db.conn();
        repo::catalogo::crear_uom(&conn, &nuevo, &actor)
    })
}

#[tauri::command]
pub fn listar_categorias(
    db: State<'_, Arc<DbState>>,
    sesion: State<'_, Arc<SesionState>>,
    params: ListParams,
) -> AppResult<Listado> {
    con_auditoria!(db, sesion, "listar_categorias", {
        let conn = db.conn();
        puede(&conn, Some(&sesion.usuario_id()?), "categoria", "ver")?;
        query::listar(&conn, &query::CATEGORIA_SCHEMA, &params)
    })
}

#[tauri::command]
pub fn crear_categoria(
    db: State<'_, Arc<DbState>>,
    sesion: State<'_, Arc<SesionState>>,
    mut nuevo: NuevaCategoria,
) -> AppResult<Categoria> {
    con_auditoria!(db, sesion, "crear_categoria", {
        nuevo.created_by = Some(sesion.usuario_id()?);
        let conn = db.conn();
        repo::catalogo::crear_categoria(&conn, &nuevo)
    })
}

// ============ Usuarios / Roles ============

#[tauri::command]
pub fn listar_usuarios(
    db: State<'_, Arc<DbState>>,
    sesion: State<'_, Arc<SesionState>>,
    params: ListParams,
) -> AppResult<Listado> {
    con_auditoria!(db, sesion, "listar_usuarios", {
        let conn = db.conn();
        puede(&conn, Some(&sesion.usuario_id()?), "usuario", "ver")?;
        query::listar(&conn, &query::USUARIO_SCHEMA, &params)
    })
}

#[tauri::command]
pub fn crear_usuario(
    db: State<'_, Arc<DbState>>,
    sesion: State<'_, Arc<SesionState>>,
    mut nuevo: NuevoUsuario,
) -> AppResult<Usuario> {
    con_auditoria!(db, sesion, "crear_usuario", {
        nuevo.created_by = Some(sesion.usuario_id()?);
        let conn = db.conn();
        repo::seguridad::crear_usuario(&conn, &nuevo)
    })
}

#[tauri::command]
pub fn listar_roles(
    db: State<'_, Arc<DbState>>,
    sesion: State<'_, Arc<SesionState>>,
) -> AppResult<Vec<Rol>> {
    con_auditoria!(db, sesion, "listar_roles", {
        let conn = db.conn();
        puede(&conn, Some(&sesion.usuario_id()?), "rol", "ver")?;
        repo::seguridad::listar_roles(&conn)
    })
}

/// Crea el primer ADMIN de la instalación (SPEC §4.1). No requiere sesión: es
/// idempotente y solo actúa si todavía no existe ningún ADMIN.
#[tauri::command]
pub fn bootstrap_admin(
    db: State<'_, Arc<DbState>>,
    nombre_usuario: String,
    nombre_completo: String,
    password: String,
) -> AppResult<()> {
    let conn = db.conn();
    repo::seguridad::bootstrap_admin(&conn, &nombre_usuario, &nombre_completo, &password)
}

// ============ Movimientos ============

#[tauri::command]
pub fn crear_movimiento(
    db: State<'_, Arc<DbState>>,
    sesion: State<'_, Arc<SesionState>>,
    mut nuevo: NuevoMovimiento,
) -> AppResult<Movimiento> {
    con_auditoria!(db, sesion, "crear_movimiento", {
        nuevo.created_by = sesion.usuario_id()?;
        let conn = db.conn();
        repo::movimiento::crear_movimiento(&conn, &nuevo)
    })
}

#[tauri::command]
pub fn enviar_a_aprobacion(
    db: State<'_, Arc<DbState>>,
    sesion: State<'_, Arc<SesionState>>,
    id: String,
) -> AppResult<Movimiento> {
    con_auditoria!(db, sesion, "enviar_a_aprobacion", {
        let actor = sesion.usuario_id()?;
        let conn = db.conn();
        repo::movimiento::enviar_a_aprobacion(&conn, &id, &actor)
    })
}

#[tauri::command]
pub fn aprobar_movimiento(
    db: State<'_, Arc<DbState>>,
    sesion: State<'_, Arc<SesionState>>,
    id: String,
) -> AppResult<Movimiento> {
    con_auditoria!(db, sesion, "aprobar_movimiento", {
        let actor = sesion.usuario_id()?;
        let conn = db.conn();
        repo::movimiento::aprobar_movimiento(&conn, &id, &actor)
    })
}

#[tauri::command]
pub fn anular_movimiento(
    db: State<'_, Arc<DbState>>,
    sesion: State<'_, Arc<SesionState>>,
    id: String,
) -> AppResult<Movimiento> {
    con_auditoria!(db, sesion, "anular_movimiento", {
        let actor = sesion.usuario_id()?;
        let conn = db.conn();
        repo::movimiento::anular_movimiento(&conn, &id, &actor)
    })
}

#[tauri::command]
pub fn listar_movimientos(
    db: State<'_, Arc<DbState>>,
    sesion: State<'_, Arc<SesionState>>,
    params: ListParams,
) -> AppResult<Listado> {
    con_auditoria!(db, sesion, "listar_movimientos", {
        let conn = db.conn();
        puede(&conn, Some(&sesion.usuario_id()?), "movimiento", "ver")?;
        query::listar(&conn, &query::MOVIMIENTO_SCHEMA, &params)
    })
}

#[tauri::command]
pub fn obtener_movimiento(
    db: State<'_, Arc<DbState>>,
    sesion: State<'_, Arc<SesionState>>,
    id: String,
) -> AppResult<Option<Movimiento>> {
    con_auditoria!(db, sesion, "obtener_movimiento", {
        let conn = db.conn();
        puede(&conn, Some(&sesion.usuario_id()?), "movimiento", "ver")?;
        repo::movimiento::obtener_movimiento(&conn, &id)
    })
}

#[tauri::command]
pub fn listar_lineas_movimiento(
    db: State<'_, Arc<DbState>>,
    sesion: State<'_, Arc<SesionState>>,
    movimiento_id: String,
    mut params: ListParams,
) -> AppResult<Listado> {
    con_auditoria!(db, sesion, "listar_lineas_movimiento", {
        let conn = db.conn();
        puede(&conn, Some(&sesion.usuario_id()?), "movimiento", "ver")?;
        let mut filtros = params.filters.take().unwrap_or_default();
        filtros.push(format!("movimiento_id:eq:{movimiento_id}"));
        params.filters = Some(filtros);
        query::listar(&conn, &query::MOVIMIENTO_LINEA_SCHEMA, &params)
    })
}

/// Saldos por (ubicación, producto, lote) — se rige por el permiso de
/// `producto:ver` (SPEC §5.2: el stock es una vista derivada del producto).
#[tauri::command]
pub fn listar_saldos(
    db: State<'_, Arc<DbState>>,
    sesion: State<'_, Arc<SesionState>>,
    ubicacion_id: Option<String>,
    producto_id: Option<String>,
) -> AppResult<Vec<Saldo>> {
    con_auditoria!(db, sesion, "listar_saldos", {
        let conn = db.conn();
        puede(&conn, Some(&sesion.usuario_id()?), "producto", "ver")?;
        repo::movimiento::listar_saldos(&conn, ubicacion_id.as_deref(), producto_id.as_deref())
    })
}

#[tauri::command]
pub fn stock_total_producto(
    db: State<'_, Arc<DbState>>,
    sesion: State<'_, Arc<SesionState>>,
    producto_id: String,
) -> AppResult<i64> {
    con_auditoria!(db, sesion, "stock_total_producto", {
        let conn = db.conn();
        puede(&conn, Some(&sesion.usuario_id()?), "producto", "ver")?;
        repo::movimiento::stock_total_producto(&conn, &producto_id)
    })
}

// ============ Inventario físico ============

#[tauri::command]
pub fn crear_sesion_inventario(
    db: State<'_, Arc<DbState>>,
    sesion: State<'_, Arc<SesionState>>,
    mut nuevo: NuevaSesionInventario,
) -> AppResult<SesionInventario> {
    con_auditoria!(db, sesion, "crear_sesion_inventario", {
        nuevo.created_by = sesion.usuario_id()?;
        let conn = db.conn();
        repo::inventario::crear_sesion(&conn, &nuevo)
    })
}

#[tauri::command]
pub fn listar_sesiones_inventario(
    db: State<'_, Arc<DbState>>,
    sesion: State<'_, Arc<SesionState>>,
    params: ListParams,
) -> AppResult<Listado> {
    con_auditoria!(db, sesion, "listar_sesiones_inventario", {
        let conn = db.conn();
        puede(&conn, Some(&sesion.usuario_id()?), "inventario", "ver")?;
        query::listar(&conn, &query::SESION_INVENTARIO_SCHEMA, &params)
    })
}

#[tauri::command]
pub fn registrar_conteo(
    db: State<'_, Arc<DbState>>,
    sesion: State<'_, Arc<SesionState>>,
    mut nuevo: NuevoConteo,
) -> AppResult<Conteo> {
    con_auditoria!(db, sesion, "registrar_conteo", {
        nuevo.usuario_contador_id = sesion.usuario_id()?;
        let conn = db.conn();
        repo::inventario::registrar_conteo(&conn, &nuevo)
    })
}

#[tauri::command]
pub fn listar_conteos(
    db: State<'_, Arc<DbState>>,
    sesion: State<'_, Arc<SesionState>>,
    sesion_id: String,
) -> AppResult<Vec<Conteo>> {
    con_auditoria!(db, sesion, "listar_conteos", {
        let conn = db.conn();
        puede(&conn, Some(&sesion.usuario_id()?), "inventario", "ver")?;
        repo::inventario::listar_conteos(&conn, &sesion_id)
    })
}

#[tauri::command]
pub fn diferencias_sesion(
    db: State<'_, Arc<DbState>>,
    sesion: State<'_, Arc<SesionState>>,
    sesion_id: String,
) -> AppResult<Vec<DiferenciaInventario>> {
    con_auditoria!(db, sesion, "diferencias_sesion", {
        let conn = db.conn();
        puede(&conn, Some(&sesion.usuario_id()?), "inventario", "ver")?;
        repo::inventario::diferencias_sesion(&conn, &sesion_id)
    })
}

#[tauri::command]
pub fn cerrar_sesion_inventario(
    db: State<'_, Arc<DbState>>,
    sesion: State<'_, Arc<SesionState>>,
    sesion_id: String,
) -> AppResult<Vec<String>> {
    con_auditoria!(db, sesion, "cerrar_sesion_inventario", {
        let actor = sesion.usuario_id()?;
        let conn = db.conn();
        repo::inventario::cerrar_sesion(&conn, &sesion_id, &actor)
    })
}

/// Expone los comandos al invoke_handler de Tauri.
/// Uso: `.invoke_handler(commands::handler())`
pub fn handler() -> impl Fn(tauri::ipc::Invoke<tauri::Wry>) -> bool {
    tauri::generate_handler![
        login,
        logout,
        quien_soy,
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
        listar_historial,
        metricas_historial,
    ]
}

// ============ Historial y métricas (SPEC §4.5, §13, §16) ============

/// Lista el historial de actividad del usuario (filtrable). Gateado por el
/// permiso del reporte de auditoría (SPEC §16.2).
#[allow(clippy::too_many_arguments)]
#[tauri::command]
pub fn listar_historial(
    db: State<'_, Arc<DbState>>,
    sesion: State<'_, Arc<SesionState>>,
    usuario_id: Option<String>,
    comando: Option<String>,
    nivel: Option<String>,
    desde: Option<String>,
    hasta: Option<String>,
    limit: Option<i64>,
) -> AppResult<Vec<crate::domain::seguridad::EventoAuditoria>> {
    con_auditoria!(db, sesion, "listar_historial", {
        let conn = db.conn();
        puede(&conn, Some(&sesion.usuario_id()?), "reporte", "ver")?;
        repo::auditoria::listar_historial(
            &conn,
            usuario_id.as_deref(),
            comando.as_deref(),
            nivel.as_deref(),
            desde.as_deref(),
            hasta.as_deref(),
            limit.unwrap_or(100),
        )
    })
}

/// Métricas agregadas del historial (conteos, tasas, por comando/día).
#[tauri::command]
pub fn metricas_historial(
    db: State<'_, Arc<DbState>>,
    sesion: State<'_, Arc<SesionState>>,
) -> AppResult<repo::auditoria::MetricasHistorial> {
    con_auditoria!(db, sesion, "metricas_historial", {
        let conn = db.conn();
        puede(&conn, Some(&sesion.usuario_id()?), "reporte", "ver")?;
        repo::auditoria::metricas_historial(&conn)
    })
}
