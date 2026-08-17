//! Repositorio de sucursales (config de empresa, solo ADMIN).
//!
//! Las sucursales son puntos de operación con ubicación geográfica. No son un
//! recurso de negocio del SPEC: se rigen por `configuracion:ver/editar` y
//! viven fuera del motor de consulta universal (query.rs) porque su volumen es
//! pequeño (un puñado) y su uso es de configuración.

use rusqlite::{Connection, OptionalExtension};
use uuid::Uuid;

use crate::domain::ahora;
use crate::domain::configuracion::{EditarSucursal, NuevaSucursal, Sucursal};
use crate::domain::seguridad::EventoAuditoria;
use crate::error::{AppError, AppResult};

fn map_sucursal(r: &rusqlite::Row<'_>) -> rusqlite::Result<Sucursal> {
    Ok(Sucursal {
        id: r.get(0)?,
        codigo: r.get(1)?,
        nombre: r.get(2)?,
        pais: r.get(3)?,
        ciudad: r.get(4)?,
        direccion: r.get(5)?,
        latitud: r.get(6)?,
        longitud: r.get(7)?,
        activo: r.get::<_, i64>(8)? != 0,
        auditoria: crate::domain::Auditoria {
            created_by: r.get(9)?,
            created_at: r.get(10)?,
            updated_by: r.get(11)?,
            updated_at: r.get(12)?,
        },
    })
}

const SELECT_SUCURSAL: &str = "SELECT id, codigo, nombre, pais, ciudad, direccion,
        latitud, longitud, activo, created_by, created_at, updated_by, updated_at
        FROM sucursales";

pub fn listar_sucursales(conn: &Connection) -> AppResult<Vec<Sucursal>> {
    let mut stmt = conn.prepare(&format!("{SELECT_SUCURSAL} ORDER BY activo DESC, codigo"))?;
    let filas = stmt
        .query_map([], map_sucursal)?
        .collect::<Result<Vec<_>, _>>()?;
    Ok(filas)
}

pub fn obtener_sucursal(conn: &Connection, id: &str) -> AppResult<Option<Sucursal>> {
    conn.query_row(
        &format!("{SELECT_SUCURSAL} WHERE id = ?1"),
        [id],
        map_sucursal,
    )
    .optional()
    .map_err(AppError::from)
}

pub fn crear_sucursal(conn: &Connection, nuevo: &NuevaSucursal) -> AppResult<Sucursal> {
    nuevo.validar()?;
    let id = Uuid::new_v4().to_string();
    let ts = ahora();
    conn.execute(
        "INSERT INTO sucursales (id, codigo, nombre, pais, ciudad, direccion, latitud, longitud,
                                 activo, created_at, updated_at, created_by, updated_by)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, 1, ?9, ?9, ?10, ?10)",
        rusqlite::params![
            id,
            crate::domain::normalizar_codigo(&nuevo.codigo),
            nuevo.nombre.trim(),
            nuevo.pais,
            nuevo.ciudad,
            nuevo.direccion,
            nuevo.latitud,
            nuevo.longitud,
            ts,
            nuevo.created_by,
        ],
    )
    .map_err(|_| AppError::CodigoDuplicado(nuevo.codigo.trim().to_string()))?;
    EventoAuditoria::registrar(
        conn,
        nuevo.created_by.as_deref(),
        "crear",
        "sucursal",
        Some(&id),
        None,
        None,
        None,
    )?;
    Ok(obtener_sucursal(conn, &id)?.expect("recién insertada"))
}

pub fn editar_sucursal(
    conn: &Connection,
    id: &str,
    cambios: &EditarSucursal,
    actor: &str,
) -> AppResult<Sucursal> {
    cambios.validar()?;
    obtener_sucursal(conn, id)?
        .ok_or_else(|| AppError::NoEncontrado("sucursal", id.to_string()))?;
    let ts = ahora();
    conn.execute(
        "UPDATE sucursales SET
            nombre     = COALESCE(?1, nombre),
            pais       = ?2,
            ciudad     = ?3,
            direccion  = ?4,
            latitud    = ?5,
            longitud   = ?6,
            updated_by = ?7,
            updated_at = ?8
         WHERE id = ?9",
        rusqlite::params![
            cambios.nombre.as_ref(),
            cambios.pais.as_ref().and_then(|v| v.as_ref()),
            cambios.ciudad.as_ref().and_then(|v| v.as_ref()),
            cambios.direccion.as_ref().and_then(|v| v.as_ref()),
            cambios.latitud.as_ref().and_then(|v| v.as_ref()),
            cambios.longitud.as_ref().and_then(|v| v.as_ref()),
            actor,
            ts,
            id,
        ],
    )?;
    EventoAuditoria::registrar(
        conn,
        Some(actor),
        "editar",
        "sucursal",
        Some(id),
        None,
        None,
        None,
    )?;
    Ok(obtener_sucursal(conn, id)?.expect("recién editada"))
}

pub fn desactivar_sucursal(conn: &Connection, id: &str, actor: &str) -> AppResult<()> {
    obtener_sucursal(conn, id)?
        .ok_or_else(|| AppError::NoEncontrado("sucursal", id.to_string()))?;
    let ts = ahora();
    conn.execute(
        "UPDATE sucursales SET activo = 0, updated_by = ?2, updated_at = ?3 WHERE id = ?1",
        rusqlite::params![id, actor, ts],
    )?;
    EventoAuditoria::registrar(
        conn,
        Some(actor),
        "desactivar",
        "sucursal",
        Some(id),
        None,
        None,
        None,
    )?;
    Ok(())
}
