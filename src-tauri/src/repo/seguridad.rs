use rusqlite::Connection;
use uuid::Uuid;

use crate::domain::ahora;
use crate::domain::seguridad::{EventoAuditoria, NuevoUsuario, RolSistema, Usuario};
use crate::error::{AppError, AppResult};
use crate::security::puede;

pub fn crear_usuario(conn: &Connection, nuevo: &NuevoUsuario) -> AppResult<Usuario> {
    nuevo.validar()?;
    puede(conn, nuevo.created_by.as_deref(), "usuario", "crear")?;
    let id = Uuid::new_v4().to_string();
    let ts = ahora();
    conn.execute(
        "INSERT INTO usuarios (id, nombre_usuario, nombre_completo, email, password_hash, rol_id, activo, created_at, updated_at, created_by, updated_by)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, 1, ?7, ?8, ?9, ?9)",
        rusqlite::params![
            id, nuevo.nombre_usuario.trim(), nuevo.nombre_completo.trim(), nuevo.email,
            nuevo.password_hash, nuevo.rol_id, ts, ts, nuevo.created_by
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

pub fn listar_usuarios(conn: &Connection) -> AppResult<Vec<Usuario>> {
    let mut stmt = conn.prepare(
        "SELECT id, nombre_usuario, nombre_completo, email, password_hash, rol_id, activo, ultimo_acceso_at,
                created_by, created_at, updated_by, updated_at
         FROM usuarios ORDER BY nombre_usuario",
    )?;
    let rows = stmt
        .query_map([], map_usuario)?
        .collect::<Result<Vec<_>, _>>()?;
    Ok(rows)
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

/// Crea el usuario bootstrap ADMIN (SPEC §4.1). Idempotente.
pub fn bootstrap_admin(
    conn: &Connection,
    nombre_usuario: &str,
    nombre_completo: &str,
    password_hash: &str,
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
        password_hash: password_hash.to_string(),
        rol_id,
        created_by: None,
    };
    crear_usuario(conn, &nuevo)?;
    Ok(())
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
