//! Repositorio de archivos de empresa (logo + documentos adjuntos, solo ADMIN).
//!
//! Los bytes se guardan como BLOB en SQLite (self-hosted). En el listado solo
//! se devuelven metadatos; el contenido viaja en base64 por IPC/HTTP cuando se
//! pide explícitamente (`obtener_archivo_empresa`).

use rusqlite::{Connection, OptionalExtension};
use uuid::Uuid;

use crate::domain::ahora;
use crate::domain::configuracion::{
    ArchivoEmpresa, ArchivoEmpresaCompleto, NuevoArchivoEmpresa, TIPO_ARCHIVO_LOGO, base64_encode,
};
use crate::domain::seguridad::EventoAuditoria;
use crate::error::{AppError, AppResult};

fn map_archivo(r: &rusqlite::Row<'_>) -> rusqlite::Result<ArchivoEmpresa> {
    Ok(ArchivoEmpresa {
        id: r.get(0)?,
        nombre: r.get(1)?,
        tipo: r.get(2)?,
        mime: r.get(3)?,
        tamano: r.get(4)?,
        created_by: r.get(5)?,
        created_at: r.get(6)?,
    })
}

const SELECT_METADATA: &str = "SELECT id, nombre, tipo, mime, tamano, created_by, created_at
        FROM archivos_empresa";

pub fn listar_archivos(conn: &Connection) -> AppResult<Vec<ArchivoEmpresa>> {
    let mut stmt = conn.prepare(&format!("{SELECT_METADATA} ORDER BY tipo, created_at DESC"))?;
    let filas = stmt
        .query_map([], map_archivo)?
        .collect::<Result<Vec<_>, _>>()?;
    Ok(filas)
}

pub fn obtener_archivo(conn: &Connection, id: &str) -> AppResult<Option<ArchivoEmpresa>> {
    conn.query_row(
        &format!("{SELECT_METADATA} WHERE id = ?1"),
        [id],
        map_archivo,
    )
    .optional()
    .map_err(AppError::from)
}

/// Devuelve el archivo con su contenido en base64 (para ver/descargar).
pub fn obtener_archivo_completo(
    conn: &Connection,
    id: &str,
) -> AppResult<Option<ArchivoEmpresaCompleto>> {
    let resultado = conn
        .query_row(
            "SELECT id, nombre, tipo, mime, tamano, created_by, created_at, datos
             FROM archivos_empresa WHERE id = ?1",
            [id],
            |r| {
                let meta = map_archivo(r)?;
                let datos = r.get::<_, Vec<u8>>(7)?;
                Ok((meta, datos))
            },
        )
        .optional()?;
    Ok(resultado.map(|(meta, datos)| ArchivoEmpresaCompleto {
        id: meta.id,
        nombre: meta.nombre,
        tipo: meta.tipo,
        mime: meta.mime,
        tamano: meta.tamano,
        created_at: meta.created_at,
        datos_base64: base64_encode(&datos),
    }))
}

/// El logo actual (único por tipo LOGO), o `None` si no se subió todavía.
pub fn obtener_logo(conn: &Connection) -> AppResult<Option<ArchivoEmpresa>> {
    conn.query_row(
        &format!("{SELECT_METADATA} WHERE tipo = ?1 ORDER BY created_at DESC LIMIT 1"),
        [TIPO_ARCHIVO_LOGO],
        map_archivo,
    )
    .optional()
    .map_err(AppError::from)
}

/// Guarda un archivo. Si es LOGO, reemplaza el anterior (solo puede haber uno).
pub fn subir_archivo(conn: &Connection, nuevo: &NuevoArchivoEmpresa) -> AppResult<ArchivoEmpresa> {
    nuevo.validar()?;
    let bytes = crate::domain::configuracion::base64_decode(&nuevo.datos_base64)?;
    let id = Uuid::new_v4().to_string();
    let ts = ahora();
    let actor = nuevo.created_by.as_deref();
    if nuevo.tipo == TIPO_ARCHIVO_LOGO {
        conn.execute("DELETE FROM archivos_empresa WHERE tipo = 'LOGO'", [])?;
    }
    conn.execute(
        "INSERT INTO archivos_empresa (id, nombre, tipo, mime, tamano, datos, created_by, created_at)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)",
        rusqlite::params![
            id,
            nuevo.nombre.trim(),
            nuevo.tipo,
            nuevo.mime,
            bytes.len() as i64,
            bytes,
            actor,
            ts,
        ],
    )?;
    EventoAuditoria::registrar(
        conn,
        actor,
        "crear",
        "archivo_empresa",
        Some(&id),
        None,
        None,
        None,
    )?;
    Ok(obtener_archivo(conn, &id)?.expect("recién insertado"))
}

pub fn eliminar_archivo(conn: &Connection, id: &str, actor: &str) -> AppResult<()> {
    obtener_archivo(conn, id)?.ok_or_else(|| AppError::NoEncontrado("archivo", id.to_string()))?;
    conn.execute("DELETE FROM archivos_empresa WHERE id = ?1", [id])?;
    EventoAuditoria::registrar(
        conn,
        Some(actor),
        "eliminar",
        "archivo_empresa",
        Some(id),
        None,
        None,
        None,
    )?;
    Ok(())
}
