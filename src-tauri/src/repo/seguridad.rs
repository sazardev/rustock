use rusqlite::Connection;
use uuid::Uuid;

use crate::domain::ahora;
use crate::domain::seguridad::{EventoAuditoria, NuevoUsuario, RolSistema, Usuario};
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
    conn.execute(
        "INSERT INTO usuarios (id, nombre_usuario, nombre_completo, email, password_hash, rol_id, activo, created_at, updated_at, created_by, updated_by)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, 1, ?7, ?8, ?9, ?9)",
        rusqlite::params![
            id, nuevo.nombre_usuario.trim(), nuevo.nombre_completo.trim(), nuevo.email,
            password_hash, nuevo.rol_id, ts, ts, nuevo.created_by
        ],
    )
    .map_err(|_| AppError::CodigoDuplicado(nuevo.nombre_usuario.trim().to_string()))?;
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
