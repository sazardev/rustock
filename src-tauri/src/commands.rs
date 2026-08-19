use std::sync::Arc;

use tauri::State;

use crate::db::DbState;
use crate::domain::catalogo::*;
use crate::domain::inventario::*;
use crate::domain::movimiento::*;
use crate::domain::seguridad::*;
use crate::domain::{Listado, Paginado};
use crate::error::{AppError, AppResult};
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
            let _ = $crate::repo::auditoria::registrar_invocacion(
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
pub(crate) use con_auditoria;

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

/// Consulta de capacidad (SPEC §4.3): ¿tiene el usuario de la sesión el
/// permiso `recurso:accion`? La UI la usa para mostrar/ocultar acciones
/// (ej. "crear y aprobar" solo para quien puede aprobar). Es una consulta
/// pura de la matriz, sin auditoría (no altera datos).
#[tauri::command]
pub fn puedo(
    db: State<'_, Arc<DbState>>,
    sesion: State<'_, Arc<SesionState>>,
    recurso: String,
    accion: String,
) -> AppResult<bool> {
    let conn = db.conn();
    let actor = sesion.usuario_id()?;
    match puede(&conn, Some(&actor), &recurso, &accion) {
        Ok(()) => Ok(true),
        Err(AppError::SinPermiso(_)) => Ok(false),
        Err(e) => Err(e),
    }
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

#[tauri::command]
pub fn editar_almacen(
    db: State<'_, Arc<DbState>>,
    sesion: State<'_, Arc<SesionState>>,
    id: String,
    cambios: EditarAlmacen,
) -> AppResult<Almacen> {
    con_auditoria!(db, sesion, "editar_almacen", {
        let actor = sesion.usuario_id()?;
        let conn = db.conn();
        repo::catalogo::editar_almacen(&conn, &id, &cambios, &actor)
    })
}

#[tauri::command]
pub fn mover_almacen(
    db: State<'_, Arc<DbState>>,
    sesion: State<'_, Arc<SesionState>>,
    id: String,
    pos: PosicionMapa,
) -> AppResult<Almacen> {
    con_auditoria!(db, sesion, "mover_almacen", {
        let actor = sesion.usuario_id()?;
        let conn = db.conn();
        repo::catalogo::mover_almacen(&conn, &id, &pos, &actor)
    })
}

#[tauri::command]
pub fn desactivar_almacen(
    db: State<'_, Arc<DbState>>,
    sesion: State<'_, Arc<SesionState>>,
    id: String,
) -> AppResult<()> {
    con_auditoria!(db, sesion, "desactivar_almacen", {
        let actor = sesion.usuario_id()?;
        let conn = db.conn();
        repo::catalogo::desactivar_almacen(&conn, &id, Some(&actor))
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

#[tauri::command]
pub fn obtener_zona(
    db: State<'_, Arc<DbState>>,
    sesion: State<'_, Arc<SesionState>>,
    id: String,
) -> AppResult<Option<Zona>> {
    con_auditoria!(db, sesion, "obtener_zona", {
        let conn = db.conn();
        puede(&conn, Some(&sesion.usuario_id()?), "zona", "ver")?;
        repo::catalogo::obtener_zona(&conn, &id)
    })
}

#[tauri::command]
pub fn editar_zona(
    db: State<'_, Arc<DbState>>,
    sesion: State<'_, Arc<SesionState>>,
    id: String,
    cambios: EditarZona,
) -> AppResult<Zona> {
    con_auditoria!(db, sesion, "editar_zona", {
        let actor = sesion.usuario_id()?;
        let conn = db.conn();
        repo::catalogo::editar_zona(&conn, &id, &cambios, &actor)
    })
}

#[tauri::command]
pub fn mover_zona(
    db: State<'_, Arc<DbState>>,
    sesion: State<'_, Arc<SesionState>>,
    id: String,
    pos: PosicionMapa,
) -> AppResult<Zona> {
    con_auditoria!(db, sesion, "mover_zona", {
        let actor = sesion.usuario_id()?;
        let conn = db.conn();
        repo::catalogo::mover_zona(&conn, &id, &pos, &actor)
    })
}

#[tauri::command]
pub fn desactivar_zona(
    db: State<'_, Arc<DbState>>,
    sesion: State<'_, Arc<SesionState>>,
    id: String,
) -> AppResult<()> {
    con_auditoria!(db, sesion, "desactivar_zona", {
        let actor = sesion.usuario_id()?;
        let conn = db.conn();
        repo::catalogo::desactivar_zona(&conn, &id, &actor)
    })
}

// ============ Pasillo ============

#[tauri::command]
pub fn listar_pasillos(
    db: State<'_, Arc<DbState>>,
    sesion: State<'_, Arc<SesionState>>,
    params: ListParams,
) -> AppResult<Listado> {
    con_auditoria!(db, sesion, "listar_pasillos", {
        let conn = db.conn();
        puede(&conn, Some(&sesion.usuario_id()?), "pasillo", "ver")?;
        query::listar(&conn, &query::PASILLO_SCHEMA, &params)
    })
}

#[tauri::command]
pub fn crear_pasillo(
    db: State<'_, Arc<DbState>>,
    sesion: State<'_, Arc<SesionState>>,
    mut nuevo: NuevoPasillo,
) -> AppResult<Pasillo> {
    con_auditoria!(db, sesion, "crear_pasillo", {
        nuevo.created_by = Some(sesion.usuario_id()?);
        let conn = db.conn();
        repo::catalogo::crear_pasillo(&conn, &nuevo)
    })
}

#[tauri::command]
pub fn obtener_pasillo(
    db: State<'_, Arc<DbState>>,
    sesion: State<'_, Arc<SesionState>>,
    id: String,
) -> AppResult<Option<Pasillo>> {
    con_auditoria!(db, sesion, "obtener_pasillo", {
        let conn = db.conn();
        puede(&conn, Some(&sesion.usuario_id()?), "pasillo", "ver")?;
        repo::catalogo::obtener_pasillo(&conn, &id)
    })
}

#[tauri::command]
pub fn editar_pasillo(
    db: State<'_, Arc<DbState>>,
    sesion: State<'_, Arc<SesionState>>,
    id: String,
    cambios: EditarPasillo,
) -> AppResult<Pasillo> {
    con_auditoria!(db, sesion, "editar_pasillo", {
        let actor = sesion.usuario_id()?;
        let conn = db.conn();
        repo::catalogo::editar_pasillo(&conn, &id, &cambios, &actor)
    })
}

#[tauri::command]
pub fn mover_pasillo(
    db: State<'_, Arc<DbState>>,
    sesion: State<'_, Arc<SesionState>>,
    id: String,
    pos: PosicionMapa,
) -> AppResult<Pasillo> {
    con_auditoria!(db, sesion, "mover_pasillo", {
        let actor = sesion.usuario_id()?;
        let conn = db.conn();
        repo::catalogo::mover_pasillo(&conn, &id, &pos, &actor)
    })
}

#[tauri::command]
pub fn desactivar_pasillo(
    db: State<'_, Arc<DbState>>,
    sesion: State<'_, Arc<SesionState>>,
    id: String,
) -> AppResult<()> {
    con_auditoria!(db, sesion, "desactivar_pasillo", {
        let actor = sesion.usuario_id()?;
        let conn = db.conn();
        repo::catalogo::desactivar_pasillo(&conn, &id, &actor)
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

#[tauri::command]
pub fn obtener_rack(
    db: State<'_, Arc<DbState>>,
    sesion: State<'_, Arc<SesionState>>,
    id: String,
) -> AppResult<Option<Rack>> {
    con_auditoria!(db, sesion, "obtener_rack", {
        let conn = db.conn();
        puede(&conn, Some(&sesion.usuario_id()?), "rack", "ver")?;
        repo::catalogo::obtener_rack(&conn, &id)
    })
}

#[tauri::command]
pub fn editar_rack(
    db: State<'_, Arc<DbState>>,
    sesion: State<'_, Arc<SesionState>>,
    id: String,
    cambios: EditarRack,
) -> AppResult<Rack> {
    con_auditoria!(db, sesion, "editar_rack", {
        let actor = sesion.usuario_id()?;
        let conn = db.conn();
        repo::catalogo::editar_rack(&conn, &id, &cambios, &actor)
    })
}

#[tauri::command]
pub fn mover_rack(
    db: State<'_, Arc<DbState>>,
    sesion: State<'_, Arc<SesionState>>,
    id: String,
    pos: PosicionMapa,
) -> AppResult<Rack> {
    con_auditoria!(db, sesion, "mover_rack", {
        let actor = sesion.usuario_id()?;
        let conn = db.conn();
        repo::catalogo::mover_rack(&conn, &id, &pos, &actor)
    })
}

#[tauri::command]
pub fn desactivar_rack(
    db: State<'_, Arc<DbState>>,
    sesion: State<'_, Arc<SesionState>>,
    id: String,
) -> AppResult<()> {
    con_auditoria!(db, sesion, "desactivar_rack", {
        let actor = sesion.usuario_id()?;
        let conn = db.conn();
        repo::catalogo::desactivar_rack(&conn, &id, &actor)
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

#[tauri::command]
pub fn obtener_seccion(
    db: State<'_, Arc<DbState>>,
    sesion: State<'_, Arc<SesionState>>,
    id: String,
) -> AppResult<Option<Seccion>> {
    con_auditoria!(db, sesion, "obtener_seccion", {
        let conn = db.conn();
        puede(&conn, Some(&sesion.usuario_id()?), "seccion", "ver")?;
        repo::catalogo::obtener_seccion(&conn, &id)
    })
}

#[tauri::command]
pub fn editar_seccion(
    db: State<'_, Arc<DbState>>,
    sesion: State<'_, Arc<SesionState>>,
    id: String,
    cambios: EditarSeccion,
) -> AppResult<Seccion> {
    con_auditoria!(db, sesion, "editar_seccion", {
        let actor = sesion.usuario_id()?;
        let conn = db.conn();
        repo::catalogo::editar_seccion(&conn, &id, &cambios, &actor)
    })
}

#[tauri::command]
pub fn desactivar_seccion(
    db: State<'_, Arc<DbState>>,
    sesion: State<'_, Arc<SesionState>>,
    id: String,
) -> AppResult<()> {
    con_auditoria!(db, sesion, "desactivar_seccion", {
        let actor = sesion.usuario_id()?;
        let conn = db.conn();
        repo::catalogo::desactivar_seccion(&conn, &id, &actor)
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
pub fn obtener_ubicacion(
    db: State<'_, Arc<DbState>>,
    sesion: State<'_, Arc<SesionState>>,
    id: String,
) -> AppResult<Option<Ubicacion>> {
    con_auditoria!(db, sesion, "obtener_ubicacion", {
        let conn = db.conn();
        puede(&conn, Some(&sesion.usuario_id()?), "ubicacion", "ver")?;
        repo::catalogo::obtener_ubicacion(&conn, &id)
    })
}

#[tauri::command]
pub fn editar_ubicacion(
    db: State<'_, Arc<DbState>>,
    sesion: State<'_, Arc<SesionState>>,
    id: String,
    cambios: EditarUbicacion,
) -> AppResult<Ubicacion> {
    con_auditoria!(db, sesion, "editar_ubicacion", {
        let actor = sesion.usuario_id()?;
        let conn = db.conn();
        repo::catalogo::editar_ubicacion(&conn, &id, &cambios, &actor)
    })
}

#[tauri::command]
pub fn mover_ubicacion(
    db: State<'_, Arc<DbState>>,
    sesion: State<'_, Arc<SesionState>>,
    id: String,
    pos: PosicionMapa,
) -> AppResult<Ubicacion> {
    con_auditoria!(db, sesion, "mover_ubicacion", {
        let actor = sesion.usuario_id()?;
        let conn = db.conn();
        repo::catalogo::mover_ubicacion(&conn, &id, &pos, &actor)
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

#[tauri::command]
pub fn obtener_caja(
    db: State<'_, Arc<DbState>>,
    sesion: State<'_, Arc<SesionState>>,
    id: String,
) -> AppResult<Option<Caja>> {
    con_auditoria!(db, sesion, "obtener_caja", {
        let conn = db.conn();
        puede(&conn, Some(&sesion.usuario_id()?), "caja", "ver")?;
        repo::catalogo::obtener_caja(&conn, &id)
    })
}

#[tauri::command]
pub fn editar_caja(
    db: State<'_, Arc<DbState>>,
    sesion: State<'_, Arc<SesionState>>,
    id: String,
    cambios: EditarCaja,
) -> AppResult<Caja> {
    con_auditoria!(db, sesion, "editar_caja", {
        let actor = sesion.usuario_id()?;
        let conn = db.conn();
        repo::catalogo::editar_caja(&conn, &id, &cambios, &actor)
    })
}

#[tauri::command]
pub fn desactivar_caja(
    db: State<'_, Arc<DbState>>,
    sesion: State<'_, Arc<SesionState>>,
    id: String,
) -> AppResult<()> {
    con_auditoria!(db, sesion, "desactivar_caja", {
        let actor = sesion.usuario_id()?;
        let conn = db.conn();
        repo::catalogo::desactivar_caja(&conn, &id, &actor)
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

#[tauri::command]
pub fn editar_producto(
    db: State<'_, Arc<DbState>>,
    sesion: State<'_, Arc<SesionState>>,
    id: String,
    cambios: EditarProducto,
) -> AppResult<Producto> {
    con_auditoria!(db, sesion, "editar_producto", {
        let actor = sesion.usuario_id()?;
        let conn = db.conn();
        repo::catalogo::editar_producto(&conn, &id, &cambios, &actor)
    })
}

#[tauri::command]
pub fn desactivar_producto(
    db: State<'_, Arc<DbState>>,
    sesion: State<'_, Arc<SesionState>>,
    id: String,
) -> AppResult<()> {
    con_auditoria!(db, sesion, "desactivar_producto", {
        let actor = sesion.usuario_id()?;
        let conn = db.conn();
        repo::catalogo::desactivar_producto(&conn, &id, &actor)
    })
}

/// Resuelve un producto por código de barras exacto (SPEC §14.3). El escaneo
/// nunca crea datos: si no hay coincidencia, `None` para sugerir búsqueda manual.
#[tauri::command]
pub fn buscar_producto_por_codigo_barras(
    db: State<'_, Arc<DbState>>,
    sesion: State<'_, Arc<SesionState>>,
    codigo_barras: String,
) -> AppResult<Option<Producto>> {
    con_auditoria!(db, sesion, "buscar_producto_por_codigo_barras", {
        let conn = db.conn();
        puede(&conn, Some(&sesion.usuario_id()?), "producto", "ver")?;
        repo::catalogo::buscar_producto_por_codigo_barras(&conn, &codigo_barras)
    })
}

/// Resuelve un código escaneado (tipo teclado) a una entidad del dominio para
/// la captura rápida (SPEC §14.3). Consulta pura: el escaneo nunca crea datos.
#[tauri::command]
pub fn resolver_escaneo(
    db: State<'_, Arc<DbState>>,
    sesion: State<'_, Arc<SesionState>>,
    codigo: String,
) -> AppResult<Option<repo::catalogo::EscaneoResuelto>> {
    con_auditoria!(db, sesion, "resolver_escaneo", {
        let conn = db.conn();
        puede(&conn, Some(&sesion.usuario_id()?), "producto", "ver")?;
        repo::catalogo::resolver_escaneo(&conn, &codigo)
    })
}

/// Importación masiva (Fase C): valida e inserta filas de catálogo o stock
/// inicial contra las mismas reglas que `crear_*`, reportando errores por fila.
#[tauri::command]
pub fn importar_datos(
    db: State<'_, Arc<DbState>>,
    sesion: State<'_, Arc<SesionState>>,
    tipo: String,
    filas: Vec<serde_json::Value>,
) -> AppResult<Vec<crate::importar::ResultadoImportacion>> {
    con_auditoria!(db, sesion, "importar_datos", {
        let actor = sesion.usuario_id()?;
        let conn = db.conn();
        crate::importar::importar_datos(&conn, &tipo, &filas, &actor)
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

#[tauri::command]
pub fn obtener_lote(
    db: State<'_, Arc<DbState>>,
    sesion: State<'_, Arc<SesionState>>,
    id: String,
) -> AppResult<Option<Lote>> {
    con_auditoria!(db, sesion, "obtener_lote", {
        let conn = db.conn();
        puede(&conn, Some(&sesion.usuario_id()?), "lote", "ver")?;
        repo::catalogo::obtener_lote(&conn, &id)
    })
}

#[tauri::command]
pub fn editar_lote(
    db: State<'_, Arc<DbState>>,
    sesion: State<'_, Arc<SesionState>>,
    id: String,
    cambios: EditarLote,
) -> AppResult<Lote> {
    con_auditoria!(db, sesion, "editar_lote", {
        let actor = sesion.usuario_id()?;
        let conn = db.conn();
        repo::catalogo::editar_lote(&conn, &id, &cambios, &actor)
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
pub fn obtener_proveedor(
    db: State<'_, Arc<DbState>>,
    sesion: State<'_, Arc<SesionState>>,
    id: String,
) -> AppResult<Option<Proveedor>> {
    con_auditoria!(db, sesion, "obtener_proveedor", {
        let conn = db.conn();
        puede(&conn, Some(&sesion.usuario_id()?), "proveedor", "ver")?;
        repo::catalogo::obtener_proveedor(&conn, &id)
    })
}

#[tauri::command]
pub fn editar_proveedor(
    db: State<'_, Arc<DbState>>,
    sesion: State<'_, Arc<SesionState>>,
    id: String,
    cambios: EditarProveedor,
) -> AppResult<Proveedor> {
    con_auditoria!(db, sesion, "editar_proveedor", {
        let actor = sesion.usuario_id()?;
        let conn = db.conn();
        repo::catalogo::editar_proveedor(&conn, &id, &cambios, &actor)
    })
}

#[tauri::command]
pub fn desactivar_proveedor(
    db: State<'_, Arc<DbState>>,
    sesion: State<'_, Arc<SesionState>>,
    id: String,
) -> AppResult<()> {
    con_auditoria!(db, sesion, "desactivar_proveedor", {
        let actor = sesion.usuario_id()?;
        let conn = db.conn();
        repo::catalogo::desactivar_proveedor(&conn, &id, &actor)
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

#[tauri::command]
pub fn obtener_cliente(
    db: State<'_, Arc<DbState>>,
    sesion: State<'_, Arc<SesionState>>,
    id: String,
) -> AppResult<Option<Cliente>> {
    con_auditoria!(db, sesion, "obtener_cliente", {
        let conn = db.conn();
        puede(&conn, Some(&sesion.usuario_id()?), "cliente", "ver")?;
        repo::catalogo::obtener_cliente(&conn, &id)
    })
}

#[tauri::command]
pub fn editar_cliente(
    db: State<'_, Arc<DbState>>,
    sesion: State<'_, Arc<SesionState>>,
    id: String,
    cambios: EditarCliente,
) -> AppResult<Cliente> {
    con_auditoria!(db, sesion, "editar_cliente", {
        let actor = sesion.usuario_id()?;
        let conn = db.conn();
        repo::catalogo::editar_cliente(&conn, &id, &cambios, &actor)
    })
}

#[tauri::command]
pub fn desactivar_cliente(
    db: State<'_, Arc<DbState>>,
    sesion: State<'_, Arc<SesionState>>,
    id: String,
) -> AppResult<()> {
    con_auditoria!(db, sesion, "desactivar_cliente", {
        let actor = sesion.usuario_id()?;
        let conn = db.conn();
        repo::catalogo::desactivar_cliente(&conn, &id, &actor)
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
pub fn obtener_uom(
    db: State<'_, Arc<DbState>>,
    sesion: State<'_, Arc<SesionState>>,
    id: String,
) -> AppResult<Option<Uom>> {
    con_auditoria!(db, sesion, "obtener_uom", {
        let conn = db.conn();
        puede(&conn, Some(&sesion.usuario_id()?), "uom", "ver")?;
        repo::catalogo::obtener_uom(&conn, &id)
    })
}

#[tauri::command]
pub fn editar_uom(
    db: State<'_, Arc<DbState>>,
    sesion: State<'_, Arc<SesionState>>,
    id: String,
    cambios: EditarUom,
) -> AppResult<Uom> {
    con_auditoria!(db, sesion, "editar_uom", {
        let actor = sesion.usuario_id()?;
        let conn = db.conn();
        repo::catalogo::editar_uom(&conn, &id, &cambios, &actor)
    })
}

#[tauri::command]
pub fn desactivar_uom(
    db: State<'_, Arc<DbState>>,
    sesion: State<'_, Arc<SesionState>>,
    id: String,
) -> AppResult<()> {
    con_auditoria!(db, sesion, "desactivar_uom", {
        let actor = sesion.usuario_id()?;
        let conn = db.conn();
        repo::catalogo::desactivar_uom(&conn, &id, &actor)
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

#[tauri::command]
pub fn obtener_categoria(
    db: State<'_, Arc<DbState>>,
    sesion: State<'_, Arc<SesionState>>,
    id: String,
) -> AppResult<Option<Categoria>> {
    con_auditoria!(db, sesion, "obtener_categoria", {
        let conn = db.conn();
        puede(&conn, Some(&sesion.usuario_id()?), "categoria", "ver")?;
        repo::catalogo::obtener_categoria(&conn, &id)
    })
}

#[tauri::command]
pub fn editar_categoria(
    db: State<'_, Arc<DbState>>,
    sesion: State<'_, Arc<SesionState>>,
    id: String,
    cambios: EditarCategoria,
) -> AppResult<Categoria> {
    con_auditoria!(db, sesion, "editar_categoria", {
        let actor = sesion.usuario_id()?;
        let conn = db.conn();
        repo::catalogo::editar_categoria(&conn, &id, &cambios, &actor)
    })
}

#[tauri::command]
pub fn desactivar_categoria(
    db: State<'_, Arc<DbState>>,
    sesion: State<'_, Arc<SesionState>>,
    id: String,
) -> AppResult<()> {
    con_auditoria!(db, sesion, "desactivar_categoria", {
        let actor = sesion.usuario_id()?;
        let conn = db.conn();
        repo::catalogo::desactivar_categoria(&conn, &id, &actor)
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
pub fn obtener_usuario(
    db: State<'_, Arc<DbState>>,
    sesion: State<'_, Arc<SesionState>>,
    id: String,
) -> AppResult<Option<Usuario>> {
    con_auditoria!(db, sesion, "obtener_usuario", {
        let conn = db.conn();
        puede(&conn, Some(&sesion.usuario_id()?), "usuario", "ver")?;
        repo::seguridad::obtener_usuario(&conn, &id)
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

/// Edita nombre completo, email y/o rol de un usuario. `nombre_usuario` es
/// estable (SPEC §14.7). Permiso `usuario:editar` (solo ADMIN por defecto).
#[tauri::command]
pub fn editar_usuario(
    db: State<'_, Arc<DbState>>,
    sesion: State<'_, Arc<SesionState>>,
    id: String,
    cambios: crate::domain::seguridad::EditarUsuario,
) -> AppResult<Usuario> {
    con_auditoria!(db, sesion, "editar_usuario", {
        let actor = sesion.usuario_id()?;
        let conn = db.conn();
        repo::seguridad::editar_usuario(&conn, &id, &cambios, &actor)
    })
}

/// Desactiva un usuario (borrado lógico, SPEC §14.5). No permite desactivarse
/// a uno mismo ni al último ADMIN activo. Permiso `usuario:editar`.
#[tauri::command]
pub fn desactivar_usuario(
    db: State<'_, Arc<DbState>>,
    sesion: State<'_, Arc<SesionState>>,
    id: String,
) -> AppResult<()> {
    con_auditoria!(db, sesion, "desactivar_usuario", {
        let actor = sesion.usuario_id()?;
        let conn = db.conn();
        repo::seguridad::desactivar_usuario(&conn, &id, &actor)
    })
}

/// Reactiva un usuario desactivado. Permiso `usuario:editar`.
#[tauri::command]
pub fn reactivar_usuario(
    db: State<'_, Arc<DbState>>,
    sesion: State<'_, Arc<SesionState>>,
    id: String,
) -> AppResult<Usuario> {
    con_auditoria!(db, sesion, "reactivar_usuario", {
        let actor = sesion.usuario_id()?;
        let conn = db.conn();
        repo::seguridad::reactivar_usuario(&conn, &id, &actor)
    })
}

/// Cambia la contraseña del propio usuario verificando la actual. Solo
/// requiere sesión activa (cada quien gestiona su credencial, SPEC §4.1).
#[tauri::command]
pub fn cambiar_password(
    db: State<'_, Arc<DbState>>,
    sesion: State<'_, Arc<SesionState>>,
    password_actual: String,
    password_nueva: String,
) -> AppResult<()> {
    con_auditoria!(db, sesion, "cambiar_password", {
        let actor = sesion.usuario_id()?;
        let conn = db.conn();
        repo::seguridad::cambiar_password_propia(&conn, &actor, &password_actual, &password_nueva)
    })
}

/// Cambia la contraseña de cualquier usuario (reset del ADMIN). Permiso
/// `usuario:editar` (solo ADMIN por defecto, SPEC §4.4).
#[tauri::command]
pub fn cambiar_password_admin(
    db: State<'_, Arc<DbState>>,
    sesion: State<'_, Arc<SesionState>>,
    id: String,
    password_nueva: String,
) -> AppResult<()> {
    con_auditoria!(db, sesion, "cambiar_password_admin", {
        let actor = sesion.usuario_id()?;
        let conn = db.conn();
        repo::seguridad::cambiar_password_admin(&conn, &id, &password_nueva, &actor)
    })
}

// ============ Configuración de empresa y preferencias (SPEC §4.3, §14.4, §17.1) ============

/// Devuelve la configuración de empresa (la fila que elige el ADMIN).
/// Permiso `configuracion:ver` (solo ADMIN por defecto, SPEC §4.4).
#[tauri::command]
pub fn obtener_configuracion_empresa(
    db: State<'_, Arc<DbState>>,
    sesion: State<'_, Arc<SesionState>>,
) -> AppResult<crate::domain::configuracion::ConfiguracionEmpresa> {
    con_auditoria!(db, sesion, "obtener_configuracion_empresa", {
        let conn = db.conn();
        puede(&conn, Some(&sesion.usuario_id()?), "configuracion", "ver")?;
        repo::configuracion::obtener_configuracion_empresa(&conn)
    })
}

/// Actualiza la configuración de empresa (campos parciales). Permiso
/// `configuracion:editar` (solo ADMIN por defecto).
#[tauri::command]
pub fn guardar_configuracion_empresa(
    db: State<'_, Arc<DbState>>,
    sesion: State<'_, Arc<SesionState>>,
    cambios: crate::domain::configuracion::EditarConfiguracionEmpresa,
) -> AppResult<crate::domain::configuracion::ConfiguracionEmpresa> {
    con_auditoria!(db, sesion, "guardar_configuracion_empresa", {
        let actor = sesion.usuario_id()?;
        let conn = db.conn();
        puede(&conn, Some(&actor), "configuracion", "editar")?;
        repo::configuracion::guardar_configuracion_empresa(&conn, &cambios, &actor)
    })
}

/// Preferencias **resueltas** de la sesión activa (fallbacks de la empresa ya
/// aplicados). Solo requiere autenticación: son ajustes personales de UI y de
/// presentación, no un recurso de negocio (SPEC §14.4).
#[tauri::command]
pub fn obtener_preferencias_usuario(
    db: State<'_, Arc<DbState>>,
    sesion: State<'_, Arc<SesionState>>,
) -> AppResult<crate::domain::configuracion::PreferenciasResueltas> {
    con_auditoria!(db, sesion, "obtener_preferencias_usuario", {
        let actor = sesion.usuario_id()?;
        let conn = db.conn();
        repo::configuracion::preferencias_resueltas(&conn, &actor)
    })
}

/// Guarda las preferencias personales de la sesión activa (tamaño de fuente,
/// orden del sidebar, zona horaria/formato de fecha propios con `null` =
/// heredar de la empresa, paleta de tema y modo oscuro). Solo requiere
/// autenticación.
#[tauri::command]
pub fn guardar_preferencias_usuario(
    db: State<'_, Arc<DbState>>,
    sesion: State<'_, Arc<SesionState>>,
    cambios: crate::domain::configuracion::EditarPreferenciasUsuario,
) -> AppResult<crate::domain::configuracion::PreferenciasResueltas> {
    con_auditoria!(db, sesion, "guardar_preferencias_usuario", {
        let actor = sesion.usuario_id()?;
        let conn = db.conn();
        repo::configuracion::guardar_preferencias_usuario(&conn, &actor, &cambios)?;
        repo::configuracion::preferencias_resueltas(&conn, &actor)
    })
}

// ============ Temas de la UI (DESIGN §3.1) ============

/// Lista las paletas predefinidas con sus muestras de acento (para el
/// selector). Solo requiere autenticación: es presentación, no un recurso
/// de negocio.
#[tauri::command]
pub fn listar_temas(
    db: State<'_, Arc<DbState>>,
    sesion: State<'_, Arc<SesionState>>,
) -> AppResult<Vec<crate::domain::tema::ResumenTema>> {
    con_auditoria!(db, sesion, "listar_temas", {
        sesion.usuario_id()?;
        Ok(crate::domain::tema::listar_temas())
    })
}

/// Variables CSS de un tema concreto (paleta + modo), para vista previa y
/// para aplicar el tema activo. El `tema_id` se valida contra la lista;
/// `modo_oscuro` elige la variante.
#[tauri::command]
pub fn obtener_tema(
    db: State<'_, Arc<DbState>>,
    sesion: State<'_, Arc<SesionState>>,
    tema_id: String,
    modo_oscuro: bool,
) -> AppResult<crate::domain::tema::TemaActivo> {
    con_auditoria!(db, sesion, "obtener_tema", {
        sesion.usuario_id()?;
        let modo = if modo_oscuro {
            crate::domain::tema::ModoColor::Oscuro
        } else {
            crate::domain::tema::ModoColor::Claro
        };
        crate::domain::tema::obtener_tema(&tema_id, modo).ok_or_else(|| {
            crate::error::AppError::CampoInvalido(format!("tema '{tema_id}' no existe"))
        })
    })
}

/// Tema activo resuelto para la sesión (preferencia propia o global de la
/// empresa). Solo requiere autenticación.
#[tauri::command]
pub fn obtener_tema_activo(
    db: State<'_, Arc<DbState>>,
    sesion: State<'_, Arc<SesionState>>,
) -> AppResult<crate::domain::tema::TemaActivo> {
    con_auditoria!(db, sesion, "obtener_tema_activo", {
        let actor = sesion.usuario_id()?;
        let conn = db.conn();
        repo::configuracion::tema_activo_de_usuario(&conn, &actor)
    })
}

/// Tema global de la empresa (sin sesión), para pintar el login/la landing
/// con la apariencia que eligió el ADMIN antes de autenticarse. Es solo
/// configuración de presentación, sin datos de negocio.
#[tauri::command]
pub fn obtener_tema_global(
    db: State<'_, Arc<DbState>>,
    sesion: State<'_, Arc<SesionState>>,
) -> AppResult<crate::domain::tema::TemaActivo> {
    let _ = sesion;
    let conn = db.conn();
    let config = repo::configuracion::obtener_configuracion_empresa(&conn)?;
    let modo = if config.modo_oscuro {
        crate::domain::tema::ModoColor::Oscuro
    } else {
        crate::domain::tema::ModoColor::Claro
    };
    crate::domain::tema::obtener_tema(&config.tema_id, modo).ok_or_else(|| {
        crate::error::AppError::CampoInvalido(format!("tema '{}' no existe", config.tema_id))
    })
}

// ============ Sucursales (config de empresa, solo ADMIN) ============

#[tauri::command]
pub fn listar_sucursales(
    db: State<'_, Arc<DbState>>,
    sesion: State<'_, Arc<SesionState>>,
) -> AppResult<Vec<crate::domain::configuracion::Sucursal>> {
    con_auditoria!(db, sesion, "listar_sucursales", {
        let conn = db.conn();
        puede(&conn, Some(&sesion.usuario_id()?), "configuracion", "ver")?;
        repo::sucursal::listar_sucursales(&conn)
    })
}

#[tauri::command]
pub fn crear_sucursal(
    db: State<'_, Arc<DbState>>,
    sesion: State<'_, Arc<SesionState>>,
    mut nuevo: crate::domain::configuracion::NuevaSucursal,
) -> AppResult<crate::domain::configuracion::Sucursal> {
    con_auditoria!(db, sesion, "crear_sucursal", {
        let actor = sesion.usuario_id()?;
        let conn = db.conn();
        puede(&conn, Some(&actor), "configuracion", "editar")?;
        nuevo.created_by = Some(actor);
        repo::sucursal::crear_sucursal(&conn, &nuevo)
    })
}

#[tauri::command]
pub fn obtener_sucursal(
    db: State<'_, Arc<DbState>>,
    sesion: State<'_, Arc<SesionState>>,
    id: String,
) -> AppResult<Option<crate::domain::configuracion::Sucursal>> {
    con_auditoria!(db, sesion, "obtener_sucursal", {
        let conn = db.conn();
        puede(&conn, Some(&sesion.usuario_id()?), "configuracion", "ver")?;
        repo::sucursal::obtener_sucursal(&conn, &id)
    })
}

#[tauri::command]
pub fn editar_sucursal(
    db: State<'_, Arc<DbState>>,
    sesion: State<'_, Arc<SesionState>>,
    id: String,
    cambios: crate::domain::configuracion::EditarSucursal,
) -> AppResult<crate::domain::configuracion::Sucursal> {
    con_auditoria!(db, sesion, "editar_sucursal", {
        let actor = sesion.usuario_id()?;
        let conn = db.conn();
        puede(&conn, Some(&actor), "configuracion", "editar")?;
        repo::sucursal::editar_sucursal(&conn, &id, &cambios, &actor)
    })
}

#[tauri::command]
pub fn desactivar_sucursal(
    db: State<'_, Arc<DbState>>,
    sesion: State<'_, Arc<SesionState>>,
    id: String,
) -> AppResult<()> {
    con_auditoria!(db, sesion, "desactivar_sucursal", {
        let actor = sesion.usuario_id()?;
        let conn = db.conn();
        puede(&conn, Some(&actor), "configuracion", "editar")?;
        repo::sucursal::desactivar_sucursal(&conn, &id, &actor)
    })
}

// ============ Archivos de empresa (logo + documentos, solo ADMIN) ============

/// Lista los metadatos de los archivos (sin contenido) para la UI.
#[tauri::command]
pub fn listar_archivos_empresa(
    db: State<'_, Arc<DbState>>,
    sesion: State<'_, Arc<SesionState>>,
) -> AppResult<Vec<crate::domain::configuracion::ArchivoEmpresa>> {
    con_auditoria!(db, sesion, "listar_archivos_empresa", {
        let conn = db.conn();
        puede(&conn, Some(&sesion.usuario_id()?), "configuracion", "ver")?;
        repo::archivo::listar_archivos(&conn)
    })
}

/// Sube un archivo (logo o documento). Los bytes llegan en base64 (el JSON de
/// IPC/HTTP no transporta binario). El logo reemplaza al anterior.
#[tauri::command]
pub fn subir_archivo_empresa(
    db: State<'_, Arc<DbState>>,
    sesion: State<'_, Arc<SesionState>>,
    mut nuevo: crate::domain::configuracion::NuevoArchivoEmpresa,
) -> AppResult<crate::domain::configuracion::ArchivoEmpresa> {
    con_auditoria!(db, sesion, "subir_archivo_empresa", {
        let actor = sesion.usuario_id()?;
        let conn = db.conn();
        puede(&conn, Some(&actor), "configuracion", "editar")?;
        nuevo.created_by = Some(actor);
        repo::archivo::subir_archivo(&conn, &nuevo)
    })
}

/// Devuelve el archivo con su contenido en base64 (para ver/descargar).
#[tauri::command]
pub fn obtener_archivo_empresa(
    db: State<'_, Arc<DbState>>,
    sesion: State<'_, Arc<SesionState>>,
    id: String,
) -> AppResult<Option<crate::domain::configuracion::ArchivoEmpresaCompleto>> {
    con_auditoria!(db, sesion, "obtener_archivo_empresa", {
        let conn = db.conn();
        puede(&conn, Some(&sesion.usuario_id()?), "configuracion", "ver")?;
        repo::archivo::obtener_archivo_completo(&conn, &id)
    })
}

/// El logo actual de la empresa (con contenido), o `None` si no hay.
#[tauri::command]
pub fn obtener_logo_empresa(
    db: State<'_, Arc<DbState>>,
    sesion: State<'_, Arc<SesionState>>,
) -> AppResult<Option<crate::domain::configuracion::ArchivoEmpresaCompleto>> {
    con_auditoria!(db, sesion, "obtener_logo_empresa", {
        let conn = db.conn();
        puede(&conn, Some(&sesion.usuario_id()?), "configuracion", "ver")?;
        let Some(meta) = repo::archivo::obtener_logo(&conn)? else {
            return Ok(None);
        };
        repo::archivo::obtener_archivo_completo(&conn, &meta.id)
    })
}

#[tauri::command]
pub fn eliminar_archivo_empresa(
    db: State<'_, Arc<DbState>>,
    sesion: State<'_, Arc<SesionState>>,
    id: String,
) -> AppResult<()> {
    con_auditoria!(db, sesion, "eliminar_archivo_empresa", {
        let actor = sesion.usuario_id()?;
        let conn = db.conn();
        puede(&conn, Some(&actor), "configuracion", "editar")?;
        repo::archivo::eliminar_archivo(&conn, &id, &actor)
    })
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

/// Crea un traslado (SPEC §9): un movimiento si es intra-almacén, dos
/// ligados si cruza de almacén (§9.3) — ver `repo::movimiento::crear_traslado`.
#[tauri::command]
pub fn crear_traslado(
    db: State<'_, Arc<DbState>>,
    sesion: State<'_, Arc<SesionState>>,
    mut nuevo: NuevoTraslado,
) -> AppResult<TrasladoCreado> {
    con_auditoria!(db, sesion, "crear_traslado", {
        nuevo.created_by = sesion.usuario_id()?;
        let conn = db.conn();
        repo::movimiento::crear_traslado(&conn, &nuevo)
    })
}

#[tauri::command]
pub fn editar_movimiento(
    db: State<'_, Arc<DbState>>,
    sesion: State<'_, Arc<SesionState>>,
    id: String,
    cambios: EditarMovimiento,
) -> AppResult<Movimiento> {
    con_auditoria!(db, sesion, "editar_movimiento", {
        let actor = sesion.usuario_id()?;
        let conn = db.conn();
        repo::movimiento::editar_movimiento(&conn, &id, &cambios, &actor)
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

/// Sugiere el desglose de ubicación/lote para despachar `cantidad` unidades
/// de un producto (SPEC §8.6: FEFO/FIFO/stock general según el producto). El
/// `sub_tipo` de la salida planeada decide si se excluyen lotes vencidos
/// (`CLIENTE`/`DEVOLUCION_PROVEEDOR`, regla dura del SPEC). Es solo una
/// propuesta: el usuario puede ajustar manualmente al crear el movimiento.
#[tauri::command]
pub fn sugerir_lineas_salida(
    db: State<'_, Arc<DbState>>,
    sesion: State<'_, Arc<SesionState>>,
    producto_id: String,
    cantidad: i64,
    ubicaciones: Option<Vec<String>>,
    sub_tipo: String,
) -> AppResult<Vec<repo::movimiento::SugerenciaLinea>> {
    con_auditoria!(db, sesion, "sugerir_lineas_salida", {
        let conn = db.conn();
        puede(&conn, Some(&sesion.usuario_id()?), "movimiento", "ver")?;
        let excluir_vencidos = matches!(sub_tipo.as_str(), "CLIENTE" | "DEVOLUCION_PROVEEDOR");
        repo::movimiento::sugerir_lineas_salida(
            &conn,
            &producto_id,
            cantidad,
            ubicaciones.as_deref(),
            excluir_vencidos,
        )
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
pub fn obtener_sesion_inventario(
    db: State<'_, Arc<DbState>>,
    sesion: State<'_, Arc<SesionState>>,
    id: String,
) -> AppResult<Option<SesionInventario>> {
    con_auditoria!(db, sesion, "obtener_sesion_inventario", {
        let conn = db.conn();
        puede(&conn, Some(&sesion.usuario_id()?), "inventario", "ver")?;
        repo::inventario::obtener_sesion(&conn, &id)
    })
}

#[tauri::command]
pub fn iniciar_sesion_inventario(
    db: State<'_, Arc<DbState>>,
    sesion: State<'_, Arc<SesionState>>,
    id: String,
) -> AppResult<SesionInventario> {
    con_auditoria!(db, sesion, "iniciar_sesion_inventario", {
        let actor = sesion.usuario_id()?;
        let conn = db.conn();
        repo::inventario::iniciar_sesion(&conn, &id, &actor)
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

// ============ Comentarios (SPEC §12) ============

#[tauri::command]
pub fn crear_comentario(
    db: State<'_, Arc<DbState>>,
    sesion: State<'_, Arc<SesionState>>,
    mut nuevo: crate::domain::alerta::NuevoComentario,
) -> AppResult<crate::domain::alerta::Comentario> {
    con_auditoria!(db, sesion, "crear_comentario", {
        nuevo.usuario_id = sesion.usuario_id()?;
        let conn = db.conn();
        repo::comentario::crear_comentario(&conn, &nuevo)
    })
}

/// Lista los comentarios anclados a una entidad concreta (SPEC §12.2).
#[tauri::command]
pub fn listar_comentarios(
    db: State<'_, Arc<DbState>>,
    sesion: State<'_, Arc<SesionState>>,
    entidad: String,
    entidad_id: String,
) -> AppResult<Vec<crate::domain::alerta::Comentario>> {
    con_auditoria!(db, sesion, "listar_comentarios", {
        let actor = sesion.usuario_id()?;
        let conn = db.conn();
        repo::comentario::listar_comentarios(&conn, &entidad, &entidad_id, &actor)
    })
}

#[tauri::command]
pub fn editar_comentario(
    db: State<'_, Arc<DbState>>,
    sesion: State<'_, Arc<SesionState>>,
    id: String,
    texto: String,
) -> AppResult<crate::domain::alerta::Comentario> {
    con_auditoria!(db, sesion, "editar_comentario", {
        let actor = sesion.usuario_id()?;
        let conn = db.conn();
        repo::comentario::editar_comentario(&conn, &id, &texto, &actor)
    })
}

/// Historial de versiones anteriores del texto de un comentario (SPEC §12.1).
#[tauri::command]
pub fn listar_historial_comentario(
    db: State<'_, Arc<DbState>>,
    sesion: State<'_, Arc<SesionState>>,
    comentario_id: String,
) -> AppResult<Vec<crate::domain::alerta::HistorialComentario>> {
    con_auditoria!(db, sesion, "listar_historial_comentario", {
        sesion.usuario_id()?;
        let conn = db.conn();
        repo::comentario::listar_historial_comentario(&conn, &comentario_id)
    })
}

#[tauri::command]
pub fn ocultar_comentario(
    db: State<'_, Arc<DbState>>,
    sesion: State<'_, Arc<SesionState>>,
    id: String,
) -> AppResult<()> {
    con_auditoria!(db, sesion, "ocultar_comentario", {
        let actor = sesion.usuario_id()?;
        let conn = db.conn();
        repo::comentario::ocultar_comentario(&conn, &id, &actor)
    })
}

// ============ Trazabilidad (SPEC §13.4) ============

/// "¿Dónde está ahora el lote X?"
#[tauri::command]
pub fn donde_esta_lote(
    db: State<'_, Arc<DbState>>,
    sesion: State<'_, Arc<SesionState>>,
    lote_id: String,
) -> AppResult<Vec<repo::trazabilidad::UbicacionDeLote>> {
    con_auditoria!(db, sesion, "donde_esta_lote", {
        let actor = sesion.usuario_id()?;
        let conn = db.conn();
        repo::trazabilidad::donde_esta_lote(&conn, &lote_id, &actor)
    })
}

/// "¿De dónde vino la unidad que despaché hoy?"
#[tauri::command]
pub fn origen_de_salida(
    db: State<'_, Arc<DbState>>,
    sesion: State<'_, Arc<SesionState>>,
    movimiento_id: String,
) -> AppResult<Vec<repo::trazabilidad::OrigenLinea>> {
    con_auditoria!(db, sesion, "origen_de_salida", {
        let actor = sesion.usuario_id()?;
        let conn = db.conn();
        repo::trazabilidad::origen_de_salida(&conn, &movimiento_id, &actor)
    })
}

/// "¿Quién tocó el stock del producto Y en un rango de fechas?"
#[tauri::command]
pub fn movimientos_de_producto_en_rango(
    db: State<'_, Arc<DbState>>,
    sesion: State<'_, Arc<SesionState>>,
    producto_id: String,
    desde: String,
    hasta: String,
) -> AppResult<Vec<Movimiento>> {
    con_auditoria!(db, sesion, "movimientos_de_producto_en_rango", {
        let actor = sesion.usuario_id()?;
        let conn = db.conn();
        repo::trazabilidad::movimientos_de_producto_en_rango(
            &conn,
            &producto_id,
            &desde,
            &hasta,
            &actor,
        )
    })
}

/// "¿Cuánto vence en N días?" (por defecto 30).
#[tauri::command]
pub fn lotes_por_vencer(
    db: State<'_, Arc<DbState>>,
    sesion: State<'_, Arc<SesionState>>,
    dias: Option<i64>,
) -> AppResult<Vec<repo::trazabilidad::LotePorVencer>> {
    con_auditoria!(db, sesion, "lotes_por_vencer", {
        let actor = sesion.usuario_id()?;
        let conn = db.conn();
        repo::trazabilidad::lotes_por_vencer(&conn, dias.unwrap_or(30), &actor)
    })
}

/// "¿Dónde estuvo la caja Z?"
#[tauri::command]
pub fn historial_caja(
    db: State<'_, Arc<DbState>>,
    sesion: State<'_, Arc<SesionState>>,
    caja_id: String,
) -> AppResult<Vec<repo::trazabilidad::HistorialCaja>> {
    con_auditoria!(db, sesion, "historial_caja", {
        let actor = sesion.usuario_id()?;
        let conn = db.conn();
        repo::trazabilidad::historial_caja(&conn, &caja_id, &actor)
    })
}

// ============ Alertas (SPEC §17) ============

/// Recalcula y lista las alertas (SPEC §17.1). El horizonte de "lote por
/// vencer" usa el umbral configurado en la empresa cuando no se pasa
/// `dias_por_vencer` (SPEC §17.1: "próximos N días, configurable"). Cada
/// alerta solo es visible para quien tenga `ver` sobre el recurso de su
/// entidad (SPEC §17.2).
#[tauri::command]
pub fn listar_alertas(
    db: State<'_, Arc<DbState>>,
    sesion: State<'_, Arc<SesionState>>,
    estado: Option<String>,
    dias_por_vencer: Option<i64>,
) -> AppResult<Vec<crate::domain::alerta::Alerta>> {
    con_auditoria!(db, sesion, "listar_alertas", {
        let actor = sesion.usuario_id()?;
        let conn = db.conn();
        let dias = repo::configuracion::dias_aviso_o_por_defecto(&conn, dias_por_vencer)?;
        repo::alerta::regenerar_alertas(&conn, dias)?;
        repo::alerta::listar_alertas(&conn, estado.as_deref(), &actor)
    })
}

#[tauri::command]
pub fn resolver_alerta(
    db: State<'_, Arc<DbState>>,
    sesion: State<'_, Arc<SesionState>>,
    id: String,
) -> AppResult<()> {
    con_auditoria!(db, sesion, "resolver_alerta", {
        let actor = sesion.usuario_id()?;
        let conn = db.conn();
        repo::alerta::resolver_alerta(&conn, &id, &actor)
    })
}

#[tauri::command]
pub fn ignorar_alerta(
    db: State<'_, Arc<DbState>>,
    sesion: State<'_, Arc<SesionState>>,
    id: String,
) -> AppResult<()> {
    con_auditoria!(db, sesion, "ignorar_alerta", {
        let actor = sesion.usuario_id()?;
        let conn = db.conn();
        repo::alerta::ignorar_alerta(&conn, &id, &actor)
    })
}

// ============ Reportes y KPIs (SPEC §16) ============

#[tauri::command]
pub fn obtener_dashboard(
    db: State<'_, Arc<DbState>>,
    sesion: State<'_, Arc<SesionState>>,
) -> AppResult<repo::reporte::DashboardResumen> {
    con_auditoria!(db, sesion, "obtener_dashboard", {
        let conn = db.conn();
        puede(&conn, Some(&sesion.usuario_id()?), "reporte", "ver")?;
        repo::reporte::dashboard(&conn)
    })
}

#[tauri::command]
pub fn obtener_kpis_generales(
    db: State<'_, Arc<DbState>>,
    sesion: State<'_, Arc<SesionState>>,
) -> AppResult<repo::reporte::KpisGenerales> {
    con_auditoria!(db, sesion, "obtener_kpis_generales", {
        let conn = db.conn();
        puede(&conn, Some(&sesion.usuario_id()?), "reporte", "ver")?;
        repo::reporte::kpis_generales(&conn)
    })
}

/// Kardex / tarjeta de stock de un producto (SPEC §16.2), opcionalmente
/// acotado a un lote.
#[tauri::command]
pub fn kardex_producto(
    db: State<'_, Arc<DbState>>,
    sesion: State<'_, Arc<SesionState>>,
    producto_id: String,
    lote_id: Option<String>,
) -> AppResult<Vec<repo::reporte::KardexLinea>> {
    con_auditoria!(db, sesion, "kardex_producto", {
        let conn = db.conn();
        puede(&conn, Some(&sesion.usuario_id()?), "producto", "ver")?;
        repo::reporte::kardex_producto(&conn, &producto_id, lote_id.as_deref())
    })
}

/// Precisión de una sesión de inventario (SPEC §11.6, §16.2/§16.3).
#[tauri::command]
pub fn precision_sesion(
    db: State<'_, Arc<DbState>>,
    sesion: State<'_, Arc<SesionState>>,
    sesion_id: String,
) -> AppResult<PrecisionSesion> {
    con_auditoria!(db, sesion, "precision_sesion", {
        let conn = db.conn();
        puede(&conn, Some(&sesion.usuario_id()?), "inventario", "ver")?;
        repo::inventario::precision_sesion(&conn, &sesion_id)
    })
}

/// Expone los comandos al invoke_handler de Tauri.
/// Uso: `.invoke_handler(commands::handler())`
pub fn handler() -> impl Fn(tauri::ipc::Invoke<tauri::Wry>) -> bool {
    tauri::generate_handler![
        login,
        logout,
        quien_soy,
        puedo,
        listar_almacenes,
        crear_almacen,
        obtener_almacen,
        editar_almacen,
        mover_almacen,
        desactivar_almacen,
        listar_zonas,
        crear_zona,
        obtener_zona,
        editar_zona,
        mover_zona,
        desactivar_zona,
        listar_pasillos,
        crear_pasillo,
        obtener_pasillo,
        editar_pasillo,
        mover_pasillo,
        desactivar_pasillo,
        listar_racks,
        crear_rack,
        obtener_rack,
        editar_rack,
        mover_rack,
        desactivar_rack,
        listar_secciones,
        crear_seccion,
        obtener_seccion,
        editar_seccion,
        desactivar_seccion,
        listar_ubicaciones,
        crear_ubicacion,
        obtener_ubicacion,
        editar_ubicacion,
        mover_ubicacion,
        desactivar_ubicacion,
        listar_cajas,
        crear_caja,
        obtener_caja,
        editar_caja,
        desactivar_caja,
        listar_productos,
        crear_producto,
        obtener_producto,
        editar_producto,
        desactivar_producto,
        buscar_producto_por_codigo_barras,
        resolver_escaneo,
        importar_datos,
        listar_lotes,
        crear_lote,
        obtener_lote,
        editar_lote,
        listar_proveedores,
        crear_proveedor,
        obtener_proveedor,
        editar_proveedor,
        desactivar_proveedor,
        listar_clientes,
        crear_cliente,
        obtener_cliente,
        editar_cliente,
        desactivar_cliente,
        listar_uoms,
        crear_uom,
        obtener_uom,
        editar_uom,
        desactivar_uom,
        listar_categorias,
        crear_categoria,
        obtener_categoria,
        editar_categoria,
        desactivar_categoria,
        listar_usuarios,
        obtener_usuario,
        crear_usuario,
        listar_roles,
        bootstrap_admin,
        editar_usuario,
        desactivar_usuario,
        reactivar_usuario,
        cambiar_password,
        cambiar_password_admin,
        obtener_configuracion_empresa,
        guardar_configuracion_empresa,
        obtener_preferencias_usuario,
        guardar_preferencias_usuario,
        listar_temas,
        obtener_tema,
        obtener_tema_activo,
        obtener_tema_global,
        listar_sucursales,
        crear_sucursal,
        obtener_sucursal,
        editar_sucursal,
        desactivar_sucursal,
        listar_archivos_empresa,
        subir_archivo_empresa,
        obtener_archivo_empresa,
        obtener_logo_empresa,
        eliminar_archivo_empresa,
        crear_movimiento,
        crear_traslado,
        editar_movimiento,
        enviar_a_aprobacion,
        aprobar_movimiento,
        anular_movimiento,
        listar_movimientos,
        obtener_movimiento,
        listar_lineas_movimiento,
        listar_saldos,
        stock_total_producto,
        sugerir_lineas_salida,
        crear_sesion_inventario,
        listar_sesiones_inventario,
        obtener_sesion_inventario,
        iniciar_sesion_inventario,
        registrar_conteo,
        listar_conteos,
        diferencias_sesion,
        cerrar_sesion_inventario,
        crear_comentario,
        listar_comentarios,
        editar_comentario,
        listar_historial_comentario,
        ocultar_comentario,
        donde_esta_lote,
        origen_de_salida,
        movimientos_de_producto_en_rango,
        lotes_por_vencer,
        historial_caja,
        listar_alertas,
        resolver_alerta,
        ignorar_alerta,
        obtener_dashboard,
        obtener_kpis_generales,
        kardex_producto,
        precision_sesion,
        listar_historial,
        metricas_historial,
        registrar_vista,
        metricas_actividad,
        buscar,
    ]
}

// ============ Historial y métricas (SPEC §4.5, §13, §16) ============

/// Registra la visita del frontend a una página (tracking total, Hito 25).
/// Es el único comando que no pasa por `con_auditoria!`: el propio evento
/// VISTA es el registro de auditoría (no duplicamos una fila por visita).
/// Requiere sesión activa (nunca funciona sin usuario autenticado).
#[tauri::command]
pub fn registrar_vista(
    db: State<'_, Arc<DbState>>,
    sesion: State<'_, Arc<SesionState>>,
    vista: crate::domain::seguridad::RegistrarVista,
) -> AppResult<()> {
    vista.validar()?;
    let actor = sesion.usuario_id()?;
    let conn = db.conn();
    repo::auditoria::registrar_vista(&conn, &actor, &vista)
}

/// Lista el historial de actividad (filtrable y paginado, SPEC §15). Gateado
/// por el permiso del reporte de auditoría (SPEC §16.2).
#[allow(clippy::too_many_arguments)]
#[tauri::command]
pub fn listar_historial(
    db: State<'_, Arc<DbState>>,
    sesion: State<'_, Arc<SesionState>>,
    usuario_id: Option<String>,
    comando: Option<String>,
    nivel: Option<String>,
    tipo_evento: Option<String>,
    modulo: Option<String>,
    ruta: Option<String>,
    proceso: Option<String>,
    exito: Option<bool>,
    desde: Option<String>,
    hasta: Option<String>,
    page: Option<i64>,
    page_size: Option<i64>,
) -> AppResult<Paginado<crate::domain::seguridad::EventoAuditoria>> {
    con_auditoria!(db, sesion, "listar_historial", {
        let conn = db.conn();
        puede(&conn, Some(&sesion.usuario_id()?), "reporte", "ver")?;
        repo::auditoria::listar_historial(
            &conn,
            usuario_id.as_deref(),
            comando.as_deref(),
            nivel.as_deref(),
            tipo_evento.as_deref(),
            modulo.as_deref(),
            ruta.as_deref(),
            proceso.as_deref(),
            exito,
            desde.as_deref(),
            hasta.as_deref(),
            page.unwrap_or(1),
            page_size.unwrap_or(50),
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

/// Análisis profundo de actividad (Hito 25): resumen, desgloses por módulo,
/// día, hora, día de la semana, usuario, proceso y ruta, más insights
/// automáticos. Gateado por `reporte:ver`.
#[tauri::command]
pub fn metricas_actividad(
    db: State<'_, Arc<DbState>>,
    sesion: State<'_, Arc<SesionState>>,
    desde: Option<String>,
    hasta: Option<String>,
    usuario_id: Option<String>,
) -> AppResult<repo::auditoria::MetricasActividad> {
    con_auditoria!(db, sesion, "metricas_actividad", {
        let conn = db.conn();
        puede(&conn, Some(&sesion.usuario_id()?), "reporte", "ver")?;
        repo::auditoria::metricas_actividad(
            &conn,
            desde.as_deref(),
            hasta.as_deref(),
            usuario_id.as_deref(),
        )
    })
}

// ============ Búsqueda global del command palette (SPEC §15.4) ============

/// Búsqueda global multi-recurso para el command palette: una sola llamada
/// que consulta los recursos que el usuario tiene permiso de `ver` y devuelve
/// resultados agrupados y ordenados por relevancia. Es un servicio de lectura
/// (nunca altera datos); las alertas solo se muestran abiertas.
#[tauri::command]
pub fn buscar(
    db: State<'_, Arc<DbState>>,
    sesion: State<'_, Arc<SesionState>>,
    q: String,
) -> AppResult<crate::buscar::BuscarRespuesta> {
    con_auditoria!(db, sesion, "buscar", {
        let conn = db.conn();
        let usuario_id = sesion.usuario_id()?;
        crate::buscar::buscar(&conn, &usuario_id, &q)
    })
}
