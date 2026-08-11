//! Comentarios anclados a cualquier entidad del dominio (SPEC §12).

use rusqlite::Connection;
use uuid::Uuid;

use crate::domain::ahora;
use crate::domain::alerta::{Comentario, HistorialComentario, NuevoComentario};
use crate::error::{AppError, AppResult};
use crate::security::puede;

fn map_comentario(r: &rusqlite::Row<'_>) -> rusqlite::Result<Comentario> {
    Ok(Comentario {
        id: r.get(0)?,
        entidad: r.get(1)?,
        entidad_id: r.get(2)?,
        usuario_id: r.get(3)?,
        texto: r.get(4)?,
        editado: r.get::<_, i64>(5)? != 0,
        oculto: r.get::<_, i64>(6)? != 0,
        oculto_by: r.get(7)?,
        oculto_at: r.get(8)?,
        created_at: r.get(9)?,
        updated_at: r.get(10)?,
    })
}

const SELECT_COMENTARIO: &str = "SELECT id, entidad, entidad_id, usuario_id, texto, editado, oculto, oculto_by, oculto_at, created_at, updated_at FROM comentarios";

/// Crea un comentario. El autor debe tener al menos `ver` sobre la entidad
/// anclada y el permiso `comentario:crear` (SPEC §12.2).
pub fn crear_comentario(conn: &Connection, nuevo: &NuevoComentario) -> AppResult<Comentario> {
    nuevo.validar()?;
    puede(conn, Some(&nuevo.usuario_id), &nuevo.entidad, "ver")?;
    puede(conn, Some(&nuevo.usuario_id), "comentario", "crear")?;
    let id = Uuid::new_v4().to_string();
    let ts = ahora();
    conn.execute(
        "INSERT INTO comentarios (id, entidad, entidad_id, usuario_id, texto, editado, oculto, created_at, updated_at)
         VALUES (?1, ?2, ?3, ?4, ?5, 0, 0, ?6, ?6)",
        rusqlite::params![id, nuevo.entidad, nuevo.entidad_id, nuevo.usuario_id, nuevo.texto.trim(), ts],
    )?;
    crate::domain::seguridad::EventoAuditoria::registrar(
        conn,
        Some(&nuevo.usuario_id),
        "crear",
        "comentario",
        Some(&id),
        None,
        None,
        None,
    )?;
    Ok(obtener_comentario(conn, &id)?.expect("recién insertado"))
}

pub fn obtener_comentario(conn: &Connection, id: &str) -> AppResult<Option<Comentario>> {
    let mut stmt = conn.prepare(&format!("{SELECT_COMENTARIO} WHERE id = ?1"))?;
    let mut rows = stmt.query_map([id], map_comentario)?;
    rows.next().transpose().map_err(AppError::from)
}

/// Lista los comentarios de una entidad (los ocultos se devuelven igual: el
/// frontend decide cómo tratarlos; SPEC §12.3 solo exige no borrarlos).
/// Requiere `ver` sobre la entidad ancla, igual que crearlos.
pub fn listar_comentarios(
    conn: &Connection,
    entidad: &str,
    entidad_id: &str,
    actor: &str,
) -> AppResult<Vec<Comentario>> {
    puede(conn, Some(actor), entidad, "ver")?;
    let mut stmt = conn.prepare(&format!(
        "{SELECT_COMENTARIO} WHERE entidad = ?1 AND entidad_id = ?2 ORDER BY created_at ASC"
    ))?;
    let rows = stmt
        .query_map(rusqlite::params![entidad, entidad_id], map_comentario)?
        .collect::<Result<Vec<_>, _>>()?;
    Ok(rows)
}

/// Edita el texto de un comentario. Solo el autor puede editar; la versión
/// anterior se conserva en `comentario_historial` (SPEC §12.1, §12.3).
pub fn editar_comentario(
    conn: &Connection,
    id: &str,
    texto_nuevo: &str,
    actor: &str,
) -> AppResult<Comentario> {
    if texto_nuevo.trim().is_empty() {
        return Err(AppError::CampoRequerido("texto".into()));
    }
    let actual = obtener_comentario(conn, id)?
        .ok_or_else(|| AppError::NoEncontrado("comentario", id.to_string()))?;
    if actual.usuario_id != actor {
        return Err(AppError::SinPermiso(
            "comentario:editar (solo el autor)".into(),
        ));
    }
    let tx = conn.unchecked_transaction()?;
    let ts = ahora();
    tx.execute(
        "INSERT INTO comentario_historial (id, comentario_id, texto_anterior, editado_by, editado_at)
         VALUES (?1, ?2, ?3, ?4, ?5)",
        rusqlite::params![Uuid::new_v4().to_string(), id, actual.texto, actor, ts],
    )?;
    tx.execute(
        "UPDATE comentarios SET texto = ?2, editado = 1, updated_at = ?3 WHERE id = ?1",
        rusqlite::params![id, texto_nuevo.trim(), ts],
    )?;
    crate::domain::seguridad::EventoAuditoria::registrar(
        &tx,
        Some(actor),
        "editar",
        "comentario",
        Some(id),
        Some(&actual.texto),
        Some(texto_nuevo.trim()),
        None,
    )?;
    tx.commit()?;
    Ok(obtener_comentario(conn, id)?.expect("existe"))
}

/// Historial de versiones anteriores de un comentario, más recientes primero.
pub fn listar_historial_comentario(
    conn: &Connection,
    comentario_id: &str,
) -> AppResult<Vec<HistorialComentario>> {
    let mut stmt = conn.prepare(
        "SELECT id, comentario_id, texto_anterior, editado_by, editado_at
         FROM comentario_historial WHERE comentario_id = ?1 ORDER BY editado_at DESC",
    )?;
    let rows = stmt
        .query_map([comentario_id], |r| {
            Ok(HistorialComentario {
                id: r.get(0)?,
                comentario_id: r.get(1)?,
                texto_anterior: r.get(2)?,
                editado_by: r.get(3)?,
                editado_at: r.get(4)?,
            })
        })?
        .collect::<Result<Vec<_>, _>>()?;
    Ok(rows)
}

/// Oculta un comentario (nunca se borra, SPEC §12.3). Lo puede ocultar el
/// autor o un rol con permiso de moderación (`comentario:eliminar`).
pub fn ocultar_comentario(conn: &Connection, id: &str, actor: &str) -> AppResult<()> {
    let actual = obtener_comentario(conn, id)?
        .ok_or_else(|| AppError::NoEncontrado("comentario", id.to_string()))?;
    if actual.usuario_id != actor {
        puede(conn, Some(actor), "comentario", "eliminar")?;
    }
    let ts = ahora();
    conn.execute(
        "UPDATE comentarios SET oculto = 1, oculto_by = ?2, oculto_at = ?3, updated_at = ?3 WHERE id = ?1",
        rusqlite::params![id, actor, ts],
    )?;
    crate::domain::seguridad::EventoAuditoria::registrar(
        conn,
        Some(actor),
        "ocultar",
        "comentario",
        Some(id),
        None,
        None,
        None,
    )?;
    Ok(())
}
