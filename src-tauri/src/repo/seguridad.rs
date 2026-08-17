use rusqlite::Connection;
use uuid::Uuid;

use crate::domain::ahora;
use crate::domain::seguridad::{EditarUsuario, EventoAuditoria, NuevoUsuario, RolSistema, Usuario};
use crate::error::{AppError, AppResult};
use crate::security::puede;

/// Inserta la fila de usuario ya con el hash calculado. Compartido por
/// `crear_usuario` (verifica permiso) y `bootstrap_admin` (no requiere sesión).
fn insertar_usuario(
    conn: &Connection,
    nuevo: &NuevoUsuario,
    password_hash: &str,
) -> AppResult<Usuario> {
    let id = Uuid::new_v4().to_string();
    let ts = ahora();
    let nombre = nuevo.nombre_usuario.trim();
    // Prevalidación con mensajes específicos (SPEC §14.1, §14.7): un rol
    // inexistente no debe reportarse como "código duplicado", ni un email
    // repetido como duplicado de usuario.
    let duplicados: i64 = conn.query_row(
        "SELECT COUNT(*) FROM usuarios WHERE nombre_usuario = ?1 OR (?2 IS NOT NULL AND email = ?2)",
        rusqlite::params![nombre, nuevo.email],
        |r| r.get(0),
    )?;
    if duplicados > 0 {
        return Err(AppError::CodigoDuplicado(nombre.to_string()));
    }
    let rol_existe: i64 = conn.query_row(
        "SELECT COUNT(*) FROM roles WHERE id = ?1",
        [&nuevo.rol_id],
        |r| r.get(0),
    )?;
    if rol_existe == 0 {
        return Err(AppError::NoEncontrado("rol", nuevo.rol_id.clone()));
    }
    conn.execute(
        "INSERT INTO usuarios (id, nombre_usuario, nombre_completo, email, password_hash, rol_id, activo, created_at, updated_at, created_by, updated_by)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, 1, ?7, ?8, ?9, ?9)",
        rusqlite::params![
            id, nombre, nuevo.nombre_completo.trim(), nuevo.email,
            password_hash, nuevo.rol_id, ts, ts, nuevo.created_by
        ],
    )?;
    EventoAuditoria::registrar(
        conn,
        nuevo.created_by.as_deref(),
        "crear",
        "usuario",
        Some(&id),
        None,
        None,
        None,
    )?;
    Ok(obtener_usuario(conn, &id)?.expect("recién insertado"))
}

pub fn crear_usuario(conn: &Connection, nuevo: &NuevoUsuario) -> AppResult<Usuario> {
    nuevo.validar()?;
    puede(conn, nuevo.created_by.as_deref(), "usuario", "crear")?;
    let password_hash = crate::sesion::hash_password(&nuevo.password)?;
    insertar_usuario(conn, nuevo, &password_hash)
}

pub fn obtener_usuario(conn: &Connection, id: &str) -> AppResult<Option<Usuario>> {
    let mut stmt = conn.prepare(
        "SELECT id, nombre_usuario, nombre_completo, email, password_hash, rol_id, activo, ultimo_acceso_at,
                created_by, created_at, updated_by, updated_at
         FROM usuarios WHERE id = ?1",
    )?;
    let mut rows = stmt.query_map([id], map_usuario)?;
    rows.next().transpose().map_err(AppError::from)
}

fn map_usuario(r: &rusqlite::Row<'_>) -> rusqlite::Result<Usuario> {
    Ok(Usuario {
        id: r.get(0)?,
        nombre_usuario: r.get(1)?,
        nombre_completo: r.get(2)?,
        email: r.get(3)?,
        password_hash: r.get(4)?,
        rol_id: r.get(5)?,
        activo: r.get::<_, i64>(6)? != 0,
        ultimo_acceso_at: r.get(7)?,
        auditoria: crate::domain::Auditoria {
            created_by: r.get(8)?,
            created_at: r.get(9)?,
            updated_by: r.get(10)?,
            updated_at: r.get(11)?,
        },
    })
}

/// Crea el usuario bootstrap ADMIN (SPEC §4.1). Idempotente: si ya existe un
/// ADMIN, no hace nada. Es el único camino de creación de usuario que **no**
/// pasa por `puede()` — no hay sesión posible antes del primer ADMIN.
pub fn bootstrap_admin(
    conn: &Connection,
    nombre_usuario: &str,
    nombre_completo: &str,
    password: &str,
) -> AppResult<()> {
    let existe: i64 = conn.query_row(
        "SELECT COUNT(*) FROM usuarios WHERE rol_id = (SELECT id FROM roles WHERE codigo = 'ADMIN')",
        [],
        |r| r.get(0),
    )?;
    if existe > 0 {
        return Ok(());
    }
    let rol_id: String = conn.query_row(
        "SELECT id FROM roles WHERE codigo = ?1",
        [RolSistema::Admin.codigo()],
        |r| r.get(0),
    )?;
    let nuevo = NuevoUsuario {
        nombre_usuario: nombre_usuario.to_string(),
        nombre_completo: nombre_completo.to_string(),
        email: None,
        password: password.to_string(),
        rol_id,
        created_by: None,
    };
    nuevo.validar()?;
    let password_hash = crate::sesion::hash_password(password)?;
    insertar_usuario(conn, &nuevo, &password_hash)?;
    Ok(())
}

/// Busca un usuario por `id` o `nombre_usuario` (usado por login).
pub fn obtener_usuario_por_nombre(
    conn: &Connection,
    nombre_usuario: &str,
) -> AppResult<Option<Usuario>> {
    let mut stmt = conn.prepare(
        "SELECT id, nombre_usuario, nombre_completo, email, password_hash, rol_id, activo, ultimo_acceso_at,
                created_by, created_at, updated_by, updated_at
         FROM usuarios WHERE nombre_usuario = ?1",
    )?;
    let mut rows = stmt.query_map([nombre_usuario], map_usuario)?;
    rows.next().transpose().map_err(AppError::from)
}

/// Verifica credenciales y, si son válidas, actualiza `ultimo_acceso_at`
/// (SPEC §4.1). Nunca revela si el usuario existe o no en el mensaje de error.
pub fn verificar_credenciales(
    conn: &Connection,
    nombre_usuario: &str,
    password: &str,
) -> AppResult<Usuario> {
    let usuario =
        obtener_usuario_por_nombre(conn, nombre_usuario)?.ok_or(AppError::CredencialesInvalidas)?;
    if !usuario.activo {
        return Err(AppError::CredencialesInvalidas);
    }
    if !crate::sesion::verificar_password(password, &usuario.password_hash) {
        return Err(AppError::CredencialesInvalidas);
    }
    let ts = ahora();
    conn.execute(
        "UPDATE usuarios SET ultimo_acceso_at = ?2 WHERE id = ?1",
        rusqlite::params![usuario.id, ts],
    )?;
    Ok(Usuario {
        ultimo_acceso_at: Some(ts),
        ..usuario
    })
}

/// Código del rol de un usuario (para poblar la sesión activa).
pub fn rol_codigo_de_usuario(conn: &Connection, usuario_id: &str) -> AppResult<String> {
    conn.query_row(
        "SELECT r.codigo FROM usuarios u JOIN roles r ON r.id = u.rol_id WHERE u.id = ?1",
        [usuario_id],
        |r| r.get(0),
    )
    .map_err(|_| AppError::NoEncontrado("usuario", usuario_id.to_string()))
}

pub fn listar_roles(conn: &Connection) -> AppResult<Vec<crate::domain::seguridad::Rol>> {
    let mut stmt = conn.prepare(
        "SELECT id, codigo, descripcion, es_sistema, created_at, updated_at
         FROM roles ORDER BY es_sistema DESC, codigo",
    )?;
    let rows = stmt
        .query_map([], |r| {
            Ok(crate::domain::seguridad::Rol {
                id: r.get(0)?,
                codigo: r.get(1)?,
                descripcion: r.get(2)?,
                es_sistema: r.get::<_, i64>(3)? != 0,
                created_at: r.get(4)?,
                updated_at: r.get(5)?,
            })
        })?
        .collect::<Result<Vec<_>, _>>()?;
    Ok(rows)
}

// ============ Gestión de usuarios (SPEC §4.1, §4.5) ============
//
// `nombre_usuario` es estable una vez creado (es el identificador de la
// sesión, SPEC §14.7): la edición solo toca nombre completo, email y rol.

fn usuario_existe(conn: &Connection, id: &str) -> AppResult<()> {
    obtener_usuario(conn, id)?.ok_or_else(|| AppError::NoEncontrado("usuario", id.to_string()))?;
    Ok(())
}

/// Edita nombre completo, email y/o rol de un usuario. Exige `usuario:editar`
/// (solo ADMIN en la matriz por defecto, SPEC §4.4).
pub fn editar_usuario(
    conn: &Connection,
    id: &str,
    cambios: &EditarUsuario,
    actor: &str,
) -> AppResult<Usuario> {
    cambios.validar()?;
    puede(conn, Some(actor), "usuario", "editar")?;
    usuario_existe(conn, id)?;
    let ts = ahora();
    conn.execute(
        "UPDATE usuarios SET
            nombre_completo = COALESCE(?1, nombre_completo),
            email           = ?2,
            rol_id          = COALESCE(?3, rol_id),
            updated_by      = ?4,
            updated_at      = ?5
         WHERE id = ?6",
        rusqlite::params![
            cambios.nombre_completo.as_ref(),
            cambios.email.as_ref().and_then(|v| v.as_ref()),
            cambios.rol_id.as_ref(),
            actor,
            ts,
            id,
        ],
    )?;
    EventoAuditoria::registrar(
        conn,
        Some(actor),
        "editar",
        "usuario",
        Some(id),
        None,
        None,
        None,
    )?;
    Ok(obtener_usuario(conn, id)?.expect("recién editado"))
}

/// Cantidad de administradores activos (rol ADMIN).
fn admin_activos(conn: &Connection) -> AppResult<i64> {
    conn.query_row(
        "SELECT COUNT(*) FROM usuarios u
         JOIN roles r ON r.id = u.rol_id
         WHERE r.codigo = 'ADMIN' AND u.activo = 1",
        [],
        |r| r.get(0),
    )
    .map_err(AppError::from)
}

/// Desactiva un usuario (borrado lógico, SPEC §14.5). Exige `usuario:editar`.
/// Protecciones de integridad: no se puede desactivar uno mismo ni al último
/// ADMIN activo (el sistema quedaría sin administración posible).
pub fn desactivar_usuario(conn: &Connection, id: &str, actor: &str) -> AppResult<()> {
    puede(conn, Some(actor), "usuario", "editar")?;
    usuario_existe(conn, id)?;
    if id == actor {
        return Err(AppError::CampoInvalido(
            "no puedes desactivarte a ti mismo".into(),
        ));
    }
    let es_admin: bool = conn
        .query_row(
            "SELECT EXISTS (
                SELECT 1 FROM usuarios u JOIN roles r ON r.id = u.rol_id
                WHERE u.id = ?1 AND r.codigo = 'ADMIN' AND u.activo = 1
             )",
            [id],
            |r| r.get(0),
        )
        .map_err(AppError::from)?;
    if es_admin && admin_activos(conn)? <= 1 {
        return Err(AppError::UltimoAdmin);
    }
    conn.execute(
        "UPDATE usuarios SET activo = 0, updated_by = ?2, updated_at = ?3 WHERE id = ?1",
        rusqlite::params![id, actor, ahora()],
    )?;
    EventoAuditoria::registrar(
        conn,
        Some(actor),
        "desactivar",
        "usuario",
        Some(id),
        None,
        None,
        None,
    )?;
    Ok(())
}

/// Reactiva un usuario desactivado. Exige `usuario:editar`.
pub fn reactivar_usuario(conn: &Connection, id: &str, actor: &str) -> AppResult<Usuario> {
    puede(conn, Some(actor), "usuario", "editar")?;
    usuario_existe(conn, id)?;
    conn.execute(
        "UPDATE usuarios SET activo = 1, updated_by = ?2, updated_at = ?3 WHERE id = ?1",
        rusqlite::params![id, actor, ahora()],
    )?;
    EventoAuditoria::registrar(
        conn,
        Some(actor),
        "reactivar",
        "usuario",
        Some(id),
        None,
        None,
        None,
    )?;
    Ok(obtener_usuario(conn, id)?.expect("recién reactivado"))
}

/// Cambia la contraseña del propio usuario, verificando la actual. Solo
/// requiere sesión activa: cada quien gestiona su credencial (SPEC §4.1).
pub fn cambiar_password_propia(
    conn: &Connection,
    actor: &str,
    password_actual: &str,
    password_nueva: &str,
) -> AppResult<()> {
    let usuario = obtener_usuario(conn, actor)?
        .ok_or_else(|| AppError::NoEncontrado("usuario", actor.to_string()))?;
    if !crate::sesion::verificar_password(password_actual, &usuario.password_hash) {
        return Err(AppError::PasswordActualIncorrecta);
    }
    let nuevo_hash = crate::sesion::hash_password(password_nueva)?;
    conn.execute(
        "UPDATE usuarios SET password_hash = ?2, updated_by = ?3, updated_at = ?4 WHERE id = ?1",
        rusqlite::params![actor, nuevo_hash, actor, ahora()],
    )?;
    EventoAuditoria::registrar(
        conn,
        Some(actor),
        "cambiar_password",
        "usuario",
        Some(actor),
        None,
        None,
        None,
    )?;
    Ok(())
}

/// Cambia la contraseña de cualquier usuario (reset del ADMIN). Exige
/// `usuario:editar` (solo ADMIN en la matriz por defecto).
pub fn cambiar_password_admin(
    conn: &Connection,
    id: &str,
    password_nueva: &str,
    actor: &str,
) -> AppResult<()> {
    puede(conn, Some(actor), "usuario", "editar")?;
    usuario_existe(conn, id)?;
    if password_nueva.len() < 8 {
        return Err(AppError::PasswordDebil);
    }
    let nuevo_hash = crate::sesion::hash_password(password_nueva)?;
    conn.execute(
        "UPDATE usuarios SET password_hash = ?2, updated_by = ?3, updated_at = ?4 WHERE id = ?1",
        rusqlite::params![id, nuevo_hash, actor, ahora()],
    )?;
    EventoAuditoria::registrar(
        conn,
        Some(actor),
        "cambiar_password",
        "usuario",
        Some(id),
        None,
        None,
        None,
    )?;
    Ok(())
}
