use rusqlite::Connection;
use serde::Serialize;
use uuid::Uuid;

use crate::domain::catalogo::*;
use crate::domain::{TipoUbicacion, ahora, normalizar_codigo};
use crate::error::{AppError, AppResult};
use crate::security::puede;

/// Verifica que una fila existe y esté activa (SPEC §14.1, §14.5).
fn verificar_activo(
    conn: &Connection,
    tabla: &str,
    id: &str,
    etiqueta: &'static str,
) -> AppResult<()> {
    let activo: i64 = conn
        .query_row(
            &format!("SELECT activo FROM {tabla} WHERE id = ?1"),
            [id],
            |r| r.get(0),
        )
        .map_err(|_| AppError::NoEncontrado(etiqueta, id.to_string()))?;
    if activo == 0 {
        return Err(AppError::EntidadInactiva(etiqueta));
    }
    Ok(())
}

/// Almacén al que pertenece una zona (para validar unicidad por almacén,
/// SPEC §3.2-§3.5: el `codigo` de cada nodo del árbol es único dentro de su
/// almacén, no solo dentro de su padre inmediato).
fn almacen_de_zona(conn: &Connection, zona_id: &str) -> AppResult<String> {
    conn.query_row(
        "SELECT almacen_id FROM zonas WHERE id = ?1",
        [zona_id],
        |r| r.get(0),
    )
    .map_err(|_| AppError::NoEncontrado("zona", zona_id.to_string()))
}

fn almacen_de_rack(conn: &Connection, rack_id: &str) -> AppResult<String> {
    conn.query_row(
        "SELECT z.almacen_id FROM racks r JOIN zonas z ON z.id = r.zona_id WHERE r.id = ?1",
        [rack_id],
        |r| r.get(0),
    )
    .map_err(|_| AppError::NoEncontrado("rack", rack_id.to_string()))
}

fn almacen_de_seccion(conn: &Connection, seccion_id: &str) -> AppResult<String> {
    conn.query_row(
        "SELECT z.almacen_id FROM secciones s
         JOIN racks r ON r.id = s.rack_id
         JOIN zonas z ON z.id = r.zona_id
         WHERE s.id = ?1",
        [seccion_id],
        |r| r.get(0),
    )
    .map_err(|_| AppError::NoEncontrado("sección", seccion_id.to_string()))
}

// ============ Almacén (SPEC §3.1) ============

pub fn crear_almacen(conn: &Connection, nuevo: &NuevoAlmacen) -> AppResult<Almacen> {
    nuevo.validar()?;
    puede(conn, nuevo.created_by.as_deref(), "almacen", "crear")?;
    let id = Uuid::new_v4().to_string();
    let codigo = nuevo.codigo_normalizado();
    let ts = ahora();
    // Código único entre activos (SPEC §3.1).
    let existe: i64 = conn.query_row(
        "SELECT COUNT(*) FROM almacenes WHERE codigo = ?1 AND activo = 1",
        [&codigo],
        |r| r.get(0),
    )?;
    if existe > 0 {
        return Err(AppError::CodigoDuplicado(codigo));
    }
    conn.execute(
        "INSERT INTO almacenes (id, codigo, nombre, descripcion, direccion, activo, created_at, updated_at, created_by, updated_by)
         VALUES (?1, ?2, ?3, ?4, ?5, 1, ?6, ?7, ?8, ?8)",
        rusqlite::params![
            id,
            codigo,
            nuevo.nombre.trim(),
            nuevo.descripcion,
            nuevo.direccion,
            ts,
            ts,
            nuevo.created_by
        ],
    )?;
    crate::domain::seguridad::EventoAuditoria::registrar(
        conn,
        nuevo.created_by.as_deref(),
        "crear",
        "almacen",
        Some(&id),
        None,
        None,
        None,
    )?;
    Ok(obtener_almacen(conn, &id)?.expect("recién insertado"))
}

pub fn obtener_almacen(conn: &Connection, id: &str) -> AppResult<Option<Almacen>> {
    let mut stmt = conn.prepare(
        "SELECT id, codigo, nombre, descripcion, direccion, activo,
                pos_x, pos_y, pos_z, altura,
                created_by, created_at, updated_by, updated_at
         FROM almacenes WHERE id = ?1",
    )?;
    let mut rows = stmt.query_map([id], |r| {
        Ok(Almacen {
            id: r.get(0)?,
            codigo: r.get(1)?,
            nombre: r.get(2)?,
            descripcion: r.get(3)?,
            direccion: r.get(4)?,
            activo: r.get::<_, i64>(5)? != 0,
            pos_x: r.get(6)?,
            pos_y: r.get(7)?,
            pos_z: r.get(8)?,
            altura: r.get(9)?,
            auditoria: crate::domain::Auditoria {
                created_by: r.get(10)?,
                created_at: r.get(11)?,
                updated_by: r.get(12)?,
                updated_at: r.get(13)?,
            },
        })
    })?;
    rows.next().transpose().map_err(AppError::from)
}

/// Actualiza solo la posición en el mapa 2D/3D (drag-and-drop). Deliberadamente
/// separado de `editar_almacen`: se guarda muy seguido (al soltar el arrastre)
/// y no debe pasar por la validación de negocio del formulario ni arriesgar
/// pisar una edición concurrente de otros campos.
pub fn mover_almacen(
    conn: &Connection,
    id: &str,
    pos: &PosicionMapa,
    actor: &str,
) -> AppResult<Almacen> {
    puede(conn, Some(actor), "almacen", "editar")?;
    verificar_activo(conn, "almacenes", id, "almacén")?;
    let ts = ahora();
    conn.execute(
        "UPDATE almacenes SET pos_x = ?2, pos_y = ?3, pos_z = ?4, altura = ?5, updated_at = ?6, updated_by = ?7 WHERE id = ?1",
        rusqlite::params![id, pos.pos_x, pos.pos_y, pos.pos_z, pos.altura, ts, actor],
    )?;
    Ok(obtener_almacen(conn, id)?.expect("existe"))
}

pub fn editar_almacen(
    conn: &Connection,
    id: &str,
    cambios: &EditarAlmacen,
    actor: &str,
) -> AppResult<Almacen> {
    puede(conn, Some(actor), "almacen", "editar")?;
    let actual = obtener_almacen(conn, id)?
        .ok_or_else(|| AppError::NoEncontrado("almacén", id.to_string()))?;
    let nombre = cambios.nombre.clone().unwrap_or(actual.nombre);
    let descripcion = cambios.descripcion.clone().or(actual.descripcion);
    let direccion = cambios.direccion.clone().or(actual.direccion);
    let ts = ahora();
    conn.execute(
        "UPDATE almacenes SET nombre = ?2, descripcion = ?3, direccion = ?4, updated_at = ?5, updated_by = ?6 WHERE id = ?1",
        rusqlite::params![id, nombre, descripcion, direccion, ts, actor],
    )?;
    crate::domain::seguridad::EventoAuditoria::registrar(
        conn,
        Some(actor),
        "editar",
        "almacen",
        Some(id),
        None,
        None,
        None,
    )?;
    Ok(obtener_almacen(conn, id)?.expect("existe"))
}

/// Borrado lógico (SPEC §14.5). Un almacén inactivo no admite movimientos.
pub fn desactivar_almacen(conn: &Connection, id: &str, by: Option<&str>) -> AppResult<()> {
    puede(conn, by, "almacen", "desactivar")?;
    let ts = ahora();
    conn.execute(
        "UPDATE almacenes SET activo = 0, updated_at = ?2, updated_by = ?3 WHERE id = ?1",
        rusqlite::params![id, ts, by],
    )?;
    crate::domain::seguridad::EventoAuditoria::registrar(
        conn,
        by,
        "desactivar",
        "almacen",
        Some(id),
        None,
        None,
        None,
    )?;
    Ok(())
}

// ============ Zona (SPEC §3.2) ============

pub fn crear_zona(conn: &Connection, nuevo: &NuevaZona) -> AppResult<Zona> {
    puede(conn, nuevo.created_by.as_deref(), "zona", "crear")?;
    verificar_activo(conn, "almacenes", &nuevo.almacen_id, "almacén")?;
    let id = Uuid::new_v4().to_string();
    let codigo = crate::domain::normalizar_codigo(&nuevo.codigo);
    let ts = ahora();
    let existe: i64 = conn.query_row(
        "SELECT COUNT(*) FROM zonas WHERE almacen_id = ?1 AND codigo = ?2",
        rusqlite::params![nuevo.almacen_id, codigo],
        |r| r.get(0),
    )?;
    if existe > 0 {
        return Err(AppError::CodigoDuplicado(codigo));
    }
    conn.execute(
        "INSERT INTO zonas (id, codigo, nombre, descripcion, almacen_id, activo, created_at, updated_at, created_by, updated_by)
         VALUES (?1, ?2, ?3, ?4, ?5, 1, ?6, ?7, ?8, ?8)",
        rusqlite::params![
            id, codigo, nuevo.nombre.trim(), nuevo.descripcion, nuevo.almacen_id, ts, ts, nuevo.created_by
        ],
    )?;
    crate::domain::seguridad::EventoAuditoria::registrar(
        conn,
        nuevo.created_by.as_deref(),
        "crear",
        "zona",
        Some(&id),
        None,
        None,
        None,
    )?;
    Ok(obtener_zona(conn, &id)?.expect("recién insertada"))
}

pub fn obtener_zona(conn: &Connection, id: &str) -> AppResult<Option<Zona>> {
    let mut stmt = conn.prepare(
        "SELECT id, codigo, nombre, descripcion, almacen_id, activo,
                pos_x, pos_y, pos_z, altura, ancho, profundidad,
                created_by, created_at, updated_by, updated_at
         FROM zonas WHERE id = ?1",
    )?;
    let mut rows = stmt.query_map([id], |r| {
        Ok(Zona {
            id: r.get(0)?,
            codigo: r.get(1)?,
            nombre: r.get(2)?,
            descripcion: r.get(3)?,
            almacen_id: r.get(4)?,
            activo: r.get::<_, i64>(5)? != 0,
            pos_x: r.get(6)?,
            pos_y: r.get(7)?,
            pos_z: r.get(8)?,
            altura: r.get(9)?,
            ancho: r.get(10)?,
            profundidad: r.get(11)?,
            auditoria: crate::domain::Auditoria {
                created_by: r.get(12)?,
                created_at: r.get(13)?,
                updated_by: r.get(14)?,
                updated_at: r.get(15)?,
            },
        })
    })?;
    rows.next().transpose().map_err(AppError::from)
}

/// Ver nota de `mover_almacen`: comando dedicado, aislado de `editar_zona`.
/// Valida dimensiones y solapes del rectángulo candidato antes de escribir
/// (SPEC §14, motor en `mapa.rs`); `ancho`/`profundidad` `None` = sin cambio.
pub fn mover_zona(conn: &Connection, id: &str, pos: &PosicionMapa, actor: &str) -> AppResult<Zona> {
    puede(conn, Some(actor), "zona", "editar")?;
    verificar_activo(conn, "zonas", id, "zona")?;
    let actual =
        obtener_zona(conn, id)?.ok_or_else(|| AppError::NoEncontrado("zona", id.to_string()))?;
    let ancho = pos.ancho.unwrap_or(actual.ancho);
    let profundidad = pos.profundidad.unwrap_or(actual.profundidad);
    let x = pos.pos_x.or(actual.pos_x);
    let y = pos.pos_y.or(actual.pos_y);
    if let (Some(x), Some(y)) = (x, y) {
        let rect = crate::mapa::Rect {
            x,
            y,
            ancho,
            profundo: profundidad,
        };
        crate::mapa::validar_dimensiones(crate::mapa::TipoNodo::Zona, &rect)?;
        crate::mapa::validar_colisiones(
            conn,
            &actual.almacen_id,
            crate::mapa::TipoNodo::Zona,
            id,
            &actual.codigo,
            &rect,
        )?;
    }
    let ts = ahora();
    conn.execute(
        "UPDATE zonas SET pos_x = ?2, pos_y = ?3, pos_z = ?4, altura = ?5, ancho = ?6, profundidad = ?7, updated_at = ?8, updated_by = ?9 WHERE id = ?1",
        rusqlite::params![id, pos.pos_x, pos.pos_y, pos.pos_z, pos.altura, ancho, profundidad, ts, actor],
    )?;
    Ok(obtener_zona(conn, id)?.expect("existe"))
}

pub fn editar_zona(
    conn: &Connection,
    id: &str,
    cambios: &EditarZona,
    actor: &str,
) -> AppResult<Zona> {
    puede(conn, Some(actor), "zona", "editar")?;
    let actual =
        obtener_zona(conn, id)?.ok_or_else(|| AppError::NoEncontrado("zona", id.to_string()))?;
    let nombre = cambios.nombre.clone().unwrap_or(actual.nombre);
    let descripcion = cambios.descripcion.clone().or(actual.descripcion);
    let ts = ahora();
    conn.execute(
        "UPDATE zonas SET nombre = ?2, descripcion = ?3, updated_at = ?4, updated_by = ?5 WHERE id = ?1",
        rusqlite::params![id, nombre, descripcion, ts, actor],
    )?;
    crate::domain::seguridad::EventoAuditoria::registrar(
        conn,
        Some(actor),
        "editar",
        "zona",
        Some(id),
        None,
        None,
        None,
    )?;
    Ok(obtener_zona(conn, id)?.expect("existe"))
}

/// No se desactiva una zona con stock vigente en cualquiera de sus
/// ubicaciones descendientes (directas o vía rack/sección), en la misma
/// línea que la regla de ubicación (SPEC §3.5, §14.1).
pub fn desactivar_zona(conn: &Connection, id: &str, actor: &str) -> AppResult<()> {
    puede(conn, Some(actor), "zona", "desactivar")?;
    let saldo: i64 = conn.query_row(
        "SELECT COALESCE(SUM(s.cantidad), 0) FROM saldos s
         JOIN ubicaciones u ON u.id = s.ubicacion_id
         WHERE u.zona_id = ?1
            OR u.rack_id IN (SELECT id FROM racks WHERE zona_id = ?1)
            OR u.seccion_id IN (SELECT id FROM secciones WHERE rack_id IN (SELECT id FROM racks WHERE zona_id = ?1))",
        [id],
        |r| r.get(0),
    )?;
    if saldo > 0 {
        return Err(AppError::DesactivarConSaldo("zona"));
    }
    let ts = ahora();
    conn.execute(
        "UPDATE zonas SET activo = 0, updated_at = ?2, updated_by = ?3 WHERE id = ?1",
        rusqlite::params![id, ts, actor],
    )?;
    crate::domain::seguridad::EventoAuditoria::registrar(
        conn,
        Some(actor),
        "desactivar",
        "zona",
        Some(id),
        None,
        None,
        None,
    )?;
    Ok(())
}

// ============ Pasillo (SPEC §3.3b) ============

pub fn crear_pasillo(conn: &Connection, nuevo: &NuevoPasillo) -> AppResult<Pasillo> {
    puede(conn, nuevo.created_by.as_deref(), "pasillo", "crear")?;
    verificar_activo(conn, "zonas", &nuevo.zona_id, "zona")?;
    let id = Uuid::new_v4().to_string();
    let codigo = crate::domain::normalizar_codigo(&nuevo.codigo);
    let ts = ahora();
    // Unicidad por almacén completo (mismo criterio que Rack, SPEC §3.3).
    let existe: i64 = conn.query_row(
        "SELECT COUNT(*) FROM pasillos p
         JOIN zonas z ON z.id = p.zona_id
         WHERE z.almacen_id = ?1 AND p.codigo = ?2",
        rusqlite::params![almacen_de_zona(conn, &nuevo.zona_id)?, codigo],
        |r| r.get(0),
    )?;
    if existe > 0 {
        return Err(AppError::CodigoDuplicado(codigo));
    }
    let almacen_id = almacen_de_zona(conn, &nuevo.zona_id)?;
    conn.execute(
        "INSERT INTO pasillos (id, codigo, nombre, zona_id, almacen_id, activo, created_at, updated_at, created_by, updated_by)
         VALUES (?1, ?2, ?3, ?4, ?5, 1, ?6, ?7, ?8, ?8)",
        rusqlite::params![id, codigo, nuevo.nombre, nuevo.zona_id, almacen_id, ts, ts, nuevo.created_by],
    )?;
    crate::domain::seguridad::EventoAuditoria::registrar(
        conn,
        nuevo.created_by.as_deref(),
        "crear",
        "pasillo",
        Some(&id),
        None,
        None,
        None,
    )?;
    Ok(obtener_pasillo(conn, &id)?.expect("recién insertado"))
}

pub fn obtener_pasillo(conn: &Connection, id: &str) -> AppResult<Option<Pasillo>> {
    let mut stmt = conn.prepare(
        "SELECT id, codigo, nombre, zona_id, activo,
                pos_x, pos_y, pos_z, altura, ancho, profundidad,
                created_by, created_at, updated_by, updated_at
         FROM pasillos WHERE id = ?1",
    )?;
    let mut rows = stmt.query_map([id], |r| {
        Ok(Pasillo {
            id: r.get(0)?,
            codigo: r.get(1)?,
            nombre: r.get(2)?,
            zona_id: r.get(3)?,
            activo: r.get::<_, i64>(4)? != 0,
            pos_x: r.get(5)?,
            pos_y: r.get(6)?,
            pos_z: r.get(7)?,
            altura: r.get(8)?,
            ancho: r.get(9)?,
            profundidad: r.get(10)?,
            auditoria: crate::domain::Auditoria {
                created_by: r.get(11)?,
                created_at: r.get(12)?,
                updated_by: r.get(13)?,
                updated_at: r.get(14)?,
            },
        })
    })?;
    rows.next().transpose().map_err(AppError::from)
}

/// Ver nota de `mover_almacen` y de `mover_zona`: valida solapes antes de
/// escribir; el almacén del pasillo se resuelve por su zona (SPEC §3.3b).
pub fn mover_pasillo(
    conn: &Connection,
    id: &str,
    pos: &PosicionMapa,
    actor: &str,
) -> AppResult<Pasillo> {
    puede(conn, Some(actor), "pasillo", "editar")?;
    verificar_activo(conn, "pasillos", id, "pasillo")?;
    let actual = obtener_pasillo(conn, id)?
        .ok_or_else(|| AppError::NoEncontrado("pasillo", id.to_string()))?;
    let ancho = pos.ancho.unwrap_or(actual.ancho);
    let profundidad = pos.profundidad.unwrap_or(actual.profundidad);
    let x = pos.pos_x.or(actual.pos_x);
    let y = pos.pos_y.or(actual.pos_y);
    if let (Some(x), Some(y)) = (x, y) {
        let rect = crate::mapa::Rect {
            x,
            y,
            ancho,
            profundo: profundidad,
        };
        crate::mapa::validar_dimensiones(crate::mapa::TipoNodo::Pasillo, &rect)?;
        crate::mapa::validar_colisiones(
            conn,
            &almacen_de_zona(conn, &actual.zona_id)?,
            crate::mapa::TipoNodo::Pasillo,
            id,
            &actual.codigo,
            &rect,
        )?;
    }
    let ts = ahora();
    conn.execute(
        "UPDATE pasillos SET pos_x = ?2, pos_y = ?3, pos_z = ?4, altura = ?5, ancho = ?6, profundidad = ?7, updated_at = ?8, updated_by = ?9 WHERE id = ?1",
        rusqlite::params![id, pos.pos_x, pos.pos_y, pos.pos_z, pos.altura, ancho, profundidad, ts, actor],
    )?;
    Ok(obtener_pasillo(conn, id)?.expect("existe"))
}

pub fn editar_pasillo(
    conn: &Connection,
    id: &str,
    cambios: &EditarPasillo,
    actor: &str,
) -> AppResult<Pasillo> {
    puede(conn, Some(actor), "pasillo", "editar")?;
    let actual = obtener_pasillo(conn, id)?
        .ok_or_else(|| AppError::NoEncontrado("pasillo", id.to_string()))?;
    let nombre = cambios.nombre.clone().or(actual.nombre);
    let ts = ahora();
    conn.execute(
        "UPDATE pasillos SET nombre = ?2, updated_at = ?3, updated_by = ?4 WHERE id = ?1",
        rusqlite::params![id, nombre, ts, actor],
    )?;
    crate::domain::seguridad::EventoAuditoria::registrar(
        conn,
        Some(actor),
        "editar",
        "pasillo",
        Some(id),
        None,
        None,
        None,
    )?;
    Ok(obtener_pasillo(conn, id)?.expect("existe"))
}

/// No se desactiva un pasillo con stock vigente en las ubicaciones
/// descendientes de los racks que lo tienen asignado (directas o vía sección).
pub fn desactivar_pasillo(conn: &Connection, id: &str, actor: &str) -> AppResult<()> {
    puede(conn, Some(actor), "pasillo", "desactivar")?;
    let saldo: i64 = conn.query_row(
        "SELECT COALESCE(SUM(s.cantidad), 0) FROM saldos s
         JOIN ubicaciones u ON u.id = s.ubicacion_id
         WHERE u.rack_id IN (SELECT id FROM racks WHERE pasillo_id = ?1)
            OR u.seccion_id IN (SELECT id FROM secciones WHERE rack_id IN (SELECT id FROM racks WHERE pasillo_id = ?1))",
        [id],
        |r| r.get(0),
    )?;
    if saldo > 0 {
        return Err(AppError::DesactivarConSaldo("pasillo"));
    }
    let ts = ahora();
    conn.execute(
        "UPDATE pasillos SET activo = 0, updated_at = ?2, updated_by = ?3 WHERE id = ?1",
        rusqlite::params![id, ts, actor],
    )?;
    crate::domain::seguridad::EventoAuditoria::registrar(
        conn,
        Some(actor),
        "desactivar",
        "pasillo",
        Some(id),
        None,
        None,
        None,
    )?;
    Ok(())
}

// ============ Rack (SPEC §3.3) ============

/// Si `pasillo_id` viene informado, valida que ese pasillo pertenezca a la
/// misma `zona_id` del rack (SPEC §3.3b) — no es parte del árbol
/// simplificado, es solo una referencia organizativa dentro de la zona.
fn validar_pasillo_de_zona(conn: &Connection, pasillo_id: &str, zona_id: &str) -> AppResult<()> {
    let pasillo = obtener_pasillo(conn, pasillo_id)?
        .ok_or_else(|| AppError::NoEncontrado("pasillo", pasillo_id.to_string()))?;
    if pasillo.zona_id != zona_id {
        return Err(AppError::CampoInvalido(
            "pasillo_id debe pertenecer a la misma zona del rack".into(),
        ));
    }
    Ok(())
}

pub fn crear_rack(conn: &Connection, nuevo: &NuevoRack) -> AppResult<Rack> {
    puede(conn, nuevo.created_by.as_deref(), "rack", "crear")?;
    verificar_activo(conn, "zonas", &nuevo.zona_id, "zona")?;
    if let Some(pasillo_id) = &nuevo.pasillo_id {
        validar_pasillo_de_zona(conn, pasillo_id, &nuevo.zona_id)?;
    }
    let id = Uuid::new_v4().to_string();
    let codigo = crate::domain::normalizar_codigo(&nuevo.codigo);
    let ts = ahora();
    // Unicidad por almacén completo (SPEC §3.3): el rack cuelga de una zona,
    // se resuelve el almacén de la zona y se valida contra todo ese almacén.
    let existe: i64 = conn.query_row(
        "SELECT COUNT(*) FROM racks r
         JOIN zonas z ON z.id = r.zona_id
         WHERE z.almacen_id = ?1 AND r.codigo = ?2",
        rusqlite::params![almacen_de_zona(conn, &nuevo.zona_id)?, codigo],
        |r| r.get(0),
    )?;
    if existe > 0 {
        return Err(AppError::CodigoDuplicado(codigo));
    }
    let almacen_id = almacen_de_zona(conn, &nuevo.zona_id)?;
    conn.execute(
        "INSERT INTO racks (id, codigo, nombre, tipo, zona_id, pasillo_id, almacen_id, activo, created_at, updated_at, created_by, updated_by)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, 1, ?8, ?9, ?10, ?10)",
        rusqlite::params![
            id, codigo, nuevo.nombre, nuevo.tipo, nuevo.zona_id, nuevo.pasillo_id, almacen_id, ts, ts,
            nuevo.created_by
        ],
    )?;
    crate::domain::seguridad::EventoAuditoria::registrar(
        conn,
        nuevo.created_by.as_deref(),
        "crear",
        "rack",
        Some(&id),
        None,
        None,
        None,
    )?;
    Ok(obtener_rack(conn, &id)?.expect("recién insertado"))
}

pub fn obtener_rack(conn: &Connection, id: &str) -> AppResult<Option<Rack>> {
    let mut stmt = conn.prepare(
        "SELECT id, codigo, nombre, tipo, zona_id, pasillo_id, activo,
                pos_x, pos_y, pos_z, altura, ancho, profundidad,
                created_by, created_at, updated_by, updated_at
         FROM racks WHERE id = ?1",
    )?;
    let mut rows = stmt.query_map([id], |r| {
        Ok(Rack {
            id: r.get(0)?,
            codigo: r.get(1)?,
            nombre: r.get(2)?,
            tipo: r.get(3)?,
            zona_id: r.get(4)?,
            pasillo_id: r.get(5)?,
            activo: r.get::<_, i64>(6)? != 0,
            pos_x: r.get(7)?,
            pos_y: r.get(8)?,
            pos_z: r.get(9)?,
            altura: r.get(10)?,
            ancho: r.get(11)?,
            profundidad: r.get(12)?,
            auditoria: crate::domain::Auditoria {
                created_by: r.get(13)?,
                created_at: r.get(14)?,
                updated_by: r.get(15)?,
                updated_at: r.get(16)?,
            },
        })
    })?;
    rows.next().transpose().map_err(AppError::from)
}

/// Ver nota de `mover_almacen` y de `mover_zona`: valida solapes antes de
/// escribir; el almacén del rack se resuelve por su zona (SPEC §3.3).
pub fn mover_rack(conn: &Connection, id: &str, pos: &PosicionMapa, actor: &str) -> AppResult<Rack> {
    puede(conn, Some(actor), "rack", "editar")?;
    verificar_activo(conn, "racks", id, "rack")?;
    let actual =
        obtener_rack(conn, id)?.ok_or_else(|| AppError::NoEncontrado("rack", id.to_string()))?;
    let ancho = pos.ancho.unwrap_or(actual.ancho);
    let profundidad = pos.profundidad.unwrap_or(actual.profundidad);
    let x = pos.pos_x.or(actual.pos_x);
    let y = pos.pos_y.or(actual.pos_y);
    if let (Some(x), Some(y)) = (x, y) {
        let rect = crate::mapa::Rect {
            x,
            y,
            ancho,
            profundo: profundidad,
        };
        crate::mapa::validar_dimensiones(crate::mapa::TipoNodo::Rack, &rect)?;
        crate::mapa::validar_colisiones(
            conn,
            &almacen_de_zona(conn, &actual.zona_id)?,
            crate::mapa::TipoNodo::Rack,
            id,
            &actual.codigo,
            &rect,
        )?;
    }
    let ts = ahora();
    conn.execute(
        "UPDATE racks SET pos_x = ?2, pos_y = ?3, pos_z = ?4, altura = ?5, ancho = ?6, profundidad = ?7, updated_at = ?8, updated_by = ?9 WHERE id = ?1",
        rusqlite::params![id, pos.pos_x, pos.pos_y, pos.pos_z, pos.altura, ancho, profundidad, ts, actor],
    )?;
    Ok(obtener_rack(conn, id)?.expect("existe"))
}

pub fn editar_rack(
    conn: &Connection,
    id: &str,
    cambios: &EditarRack,
    actor: &str,
) -> AppResult<Rack> {
    puede(conn, Some(actor), "rack", "editar")?;
    let actual =
        obtener_rack(conn, id)?.ok_or_else(|| AppError::NoEncontrado("rack", id.to_string()))?;
    let nombre = cambios.nombre.clone().or(actual.nombre);
    let tipo = cambios.tipo.clone().or(actual.tipo);
    let pasillo_id = match &cambios.pasillo_id {
        Some(nuevo_valor) => nuevo_valor.clone(),
        None => actual.pasillo_id.clone(),
    };
    if let Some(pasillo_id) = &pasillo_id {
        validar_pasillo_de_zona(conn, pasillo_id, &actual.zona_id)?;
    }
    let ts = ahora();
    conn.execute(
        "UPDATE racks SET nombre = ?2, tipo = ?3, pasillo_id = ?4, updated_at = ?5, updated_by = ?6 WHERE id = ?1",
        rusqlite::params![id, nombre, tipo, pasillo_id, ts, actor],
    )?;
    crate::domain::seguridad::EventoAuditoria::registrar(
        conn,
        Some(actor),
        "editar",
        "rack",
        Some(id),
        None,
        None,
        None,
    )?;
    Ok(obtener_rack(conn, id)?.expect("existe"))
}

/// No se desactiva un rack con stock vigente en sus ubicaciones descendientes
/// (directas o vía sección).
pub fn desactivar_rack(conn: &Connection, id: &str, actor: &str) -> AppResult<()> {
    puede(conn, Some(actor), "rack", "desactivar")?;
    let saldo: i64 = conn.query_row(
        "SELECT COALESCE(SUM(s.cantidad), 0) FROM saldos s
         JOIN ubicaciones u ON u.id = s.ubicacion_id
         WHERE u.rack_id = ?1
            OR u.seccion_id IN (SELECT id FROM secciones WHERE rack_id = ?1)",
        [id],
        |r| r.get(0),
    )?;
    if saldo > 0 {
        return Err(AppError::DesactivarConSaldo("rack"));
    }
    let ts = ahora();
    conn.execute(
        "UPDATE racks SET activo = 0, updated_at = ?2, updated_by = ?3 WHERE id = ?1",
        rusqlite::params![id, ts, actor],
    )?;
    crate::domain::seguridad::EventoAuditoria::registrar(
        conn,
        Some(actor),
        "desactivar",
        "rack",
        Some(id),
        None,
        None,
        None,
    )?;
    Ok(())
}

// ============ Sección (SPEC §3.4) ============

pub fn crear_seccion(conn: &Connection, nuevo: &NuevaSeccion) -> AppResult<Seccion> {
    puede(conn, nuevo.created_by.as_deref(), "seccion", "crear")?;
    verificar_activo(conn, "racks", &nuevo.rack_id, "rack")?;
    let id = Uuid::new_v4().to_string();
    let codigo = crate::domain::normalizar_codigo(&nuevo.codigo);
    let ts = ahora();
    // Unicidad por almacén completo (SPEC §3.4): se resuelve el almacén del
    // rack padre y se valida contra todo ese almacén.
    let existe: i64 = conn.query_row(
        "SELECT COUNT(*) FROM secciones s
         JOIN racks ra ON ra.id = s.rack_id
         JOIN zonas z ON z.id = ra.zona_id
         WHERE z.almacen_id = ?1 AND s.codigo = ?2",
        rusqlite::params![almacen_de_rack(conn, &nuevo.rack_id)?, codigo],
        |r| r.get(0),
    )?;
    if existe > 0 {
        return Err(AppError::CodigoDuplicado(codigo));
    }
    let almacen_id = almacen_de_rack(conn, &nuevo.rack_id)?;
    conn.execute(
        "INSERT INTO secciones (id, codigo, nombre, nivel, rack_id, almacen_id, descripcion, activo, created_at, updated_at, created_by, updated_by)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, 1, ?8, ?9, ?10, ?10)",
        rusqlite::params![
            id, codigo, nuevo.nombre, nuevo.nivel, nuevo.rack_id, almacen_id, nuevo.descripcion, ts, ts, nuevo.created_by
        ],
    )?;
    crate::domain::seguridad::EventoAuditoria::registrar(
        conn,
        nuevo.created_by.as_deref(),
        "crear",
        "seccion",
        Some(&id),
        None,
        None,
        None,
    )?;
    Ok(obtener_seccion(conn, &id)?.expect("recién insertada"))
}

pub fn obtener_seccion(conn: &Connection, id: &str) -> AppResult<Option<Seccion>> {
    let mut stmt = conn.prepare(
        "SELECT id, codigo, nombre, nivel, rack_id, descripcion, activo,
                created_by, created_at, updated_by, updated_at
         FROM secciones WHERE id = ?1",
    )?;
    let mut rows = stmt.query_map([id], |r| {
        Ok(Seccion {
            id: r.get(0)?,
            codigo: r.get(1)?,
            nombre: r.get(2)?,
            nivel: r.get(3)?,
            rack_id: r.get(4)?,
            descripcion: r.get(5)?,
            activo: r.get::<_, i64>(6)? != 0,
            auditoria: crate::domain::Auditoria {
                created_by: r.get(7)?,
                created_at: r.get(8)?,
                updated_by: r.get(9)?,
                updated_at: r.get(10)?,
            },
        })
    })?;
    rows.next().transpose().map_err(AppError::from)
}

pub fn editar_seccion(
    conn: &Connection,
    id: &str,
    cambios: &EditarSeccion,
    actor: &str,
) -> AppResult<Seccion> {
    puede(conn, Some(actor), "seccion", "editar")?;
    let actual = obtener_seccion(conn, id)?
        .ok_or_else(|| AppError::NoEncontrado("sección", id.to_string()))?;
    let nombre = cambios.nombre.clone().or(actual.nombre);
    let nivel = cambios.nivel.clone().or(actual.nivel);
    let descripcion = cambios.descripcion.clone().or(actual.descripcion);
    let ts = ahora();
    conn.execute(
        "UPDATE secciones SET nombre = ?2, nivel = ?3, descripcion = ?4, updated_at = ?5, updated_by = ?6 WHERE id = ?1",
        rusqlite::params![id, nombre, nivel, descripcion, ts, actor],
    )?;
    crate::domain::seguridad::EventoAuditoria::registrar(
        conn,
        Some(actor),
        "editar",
        "seccion",
        Some(id),
        None,
        None,
        None,
    )?;
    Ok(obtener_seccion(conn, id)?.expect("existe"))
}

/// No se desactiva una sección con stock vigente en sus ubicaciones.
pub fn desactivar_seccion(conn: &Connection, id: &str, actor: &str) -> AppResult<()> {
    puede(conn, Some(actor), "seccion", "desactivar")?;
    let saldo: i64 = conn.query_row(
        "SELECT COALESCE(SUM(s.cantidad), 0) FROM saldos s
         JOIN ubicaciones u ON u.id = s.ubicacion_id
         WHERE u.seccion_id = ?1",
        [id],
        |r| r.get(0),
    )?;
    if saldo > 0 {
        return Err(AppError::DesactivarConSaldo("sección"));
    }
    let ts = ahora();
    conn.execute(
        "UPDATE secciones SET activo = 0, updated_at = ?2, updated_by = ?3 WHERE id = ?1",
        rusqlite::params![id, ts, actor],
    )?;
    crate::domain::seguridad::EventoAuditoria::registrar(
        conn,
        Some(actor),
        "desactivar",
        "seccion",
        Some(id),
        None,
        None,
        None,
    )?;
    Ok(())
}

// ============ Ubicación (SPEC §3.5) ============

pub fn crear_ubicacion(conn: &Connection, nuevo: &NuevaUbicacion) -> AppResult<Ubicacion> {
    puede(conn, nuevo.created_by.as_deref(), "ubicacion", "crear")?;
    nuevo.validar_padre()?;
    let (id_padre, tabla_padre, etiqueta_padre) =
        match (&nuevo.seccion_id, &nuevo.rack_id, &nuevo.zona_id) {
            (Some(s), _, _) => (s, "secciones", "sección"),
            (_, Some(r), _) => (r, "racks", "rack"),
            (_, _, Some(z)) => (z, "zonas", "zona"),
            _ => unreachable!("validar_padre ya garantizó exactamente un padre"),
        };
    verificar_activo(conn, tabla_padre, id_padre, etiqueta_padre)?;
    let id = Uuid::new_v4().to_string();
    let codigo = crate::domain::normalizar_codigo(&nuevo.codigo);
    let tipo = nuevo.tipo()?.as_str().to_string();
    let ts = ahora();
    // Unicidad por almacén completo (SPEC §3.5): se resuelve el almacén del
    // padre y se valida contra todo ese almacén (dos padres distintos del
    // mismo almacén no pueden compartir código de ubicación).
    let almacen_id = match (&nuevo.seccion_id, &nuevo.rack_id, &nuevo.zona_id) {
        (Some(s), _, _) => almacen_de_seccion(conn, s)?,
        (_, Some(r), _) => almacen_de_rack(conn, r)?,
        (_, _, Some(z)) => almacen_de_zona(conn, z)?,
        _ => unreachable!("validar_padre ya garantizó exactamente un padre"),
    };
    let existe: i64 = conn.query_row(
        "SELECT COUNT(*) FROM ubicaciones u WHERE u.codigo = ?2 AND COALESCE(
            (SELECT za.almacen_id FROM secciones se JOIN racks ra ON ra.id = se.rack_id JOIN zonas za ON za.id = ra.zona_id WHERE se.id = u.seccion_id),
            (SELECT za.almacen_id FROM racks ra JOIN zonas za ON za.id = ra.zona_id WHERE ra.id = u.rack_id),
            (SELECT za.almacen_id FROM zonas za WHERE za.id = u.zona_id)
        ) = ?1",
        rusqlite::params![almacen_id, codigo],
        |r| r.get(0),
    )?;
    if existe > 0 {
        return Err(AppError::CodigoDuplicado(codigo));
    }
    conn.execute(
        "INSERT INTO ubicaciones (id, codigo, nombre, seccion_id, rack_id, zona_id, almacen_id, tipo, capacidad_maxima, activo, created_at, updated_at, created_by, updated_by)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, 1, ?10, ?11, ?12, ?12)",
        rusqlite::params![
            id, codigo, nuevo.nombre, nuevo.seccion_id, nuevo.rack_id, nuevo.zona_id, almacen_id, tipo,
            nuevo.capacidad_maxima, ts, ts, nuevo.created_by
        ],
    )?;
    crate::domain::seguridad::EventoAuditoria::registrar(
        conn,
        nuevo.created_by.as_deref(),
        "crear",
        "ubicacion",
        Some(&id),
        None,
        None,
        None,
    )?;
    Ok(obtener_ubicacion(conn, &id)?.expect("recién insertada"))
}

pub fn obtener_ubicacion(conn: &Connection, id: &str) -> AppResult<Option<Ubicacion>> {
    let mut stmt = conn.prepare(
        "SELECT id, codigo, nombre, seccion_id, rack_id, zona_id, tipo, capacidad_maxima, activo,
                pos_x, pos_y, pos_z, altura,
                created_by, created_at, updated_by, updated_at
         FROM ubicaciones WHERE id = ?1",
    )?;
    let mut rows = stmt.query_map([id], map_ubicacion)?;
    rows.next().transpose().map_err(AppError::from)
}

fn map_ubicacion(r: &rusqlite::Row<'_>) -> rusqlite::Result<Ubicacion> {
    Ok(Ubicacion {
        id: r.get(0)?,
        codigo: r.get(1)?,
        nombre: r.get(2)?,
        seccion_id: r.get(3)?,
        rack_id: r.get(4)?,
        zona_id: r.get(5)?,
        tipo: r.get(6)?,
        capacidad_maxima: r.get(7)?,
        activo: r.get::<_, i64>(8)? != 0,
        pos_x: r.get(9)?,
        pos_y: r.get(10)?,
        pos_z: r.get(11)?,
        altura: r.get(12)?,
        auditoria: crate::domain::Auditoria {
            created_by: r.get(13)?,
            created_at: r.get(14)?,
            updated_by: r.get(15)?,
            updated_at: r.get(16)?,
        },
    })
}

/// Ver nota de `mover_almacen` y de `mover_zona`: valida solapes antes de
/// escribir. La ubicación no es redimensionable (tamaño fijo de bin) y su
/// almacén se resuelve por transitividad del árbol (SPEC §3.13).
pub fn mover_ubicacion(
    conn: &Connection,
    id: &str,
    pos: &PosicionMapa,
    actor: &str,
) -> AppResult<Ubicacion> {
    puede(conn, Some(actor), "ubicacion", "editar")?;
    verificar_activo(conn, "ubicaciones", id, "ubicación")?;
    let actual = obtener_ubicacion(conn, id)?
        .ok_or_else(|| AppError::NoEncontrado("ubicación", id.to_string()))?;
    let x = pos.pos_x.or(actual.pos_x);
    let y = pos.pos_y.or(actual.pos_y);
    if let (Some(x), Some(y)) = (x, y) {
        let rect = crate::mapa::Rect {
            x,
            y,
            ancho: crate::mapa::UBICACION_ANCHO,
            profundo: crate::mapa::UBICACION_PROFUNDIDAD,
        };
        crate::mapa::validar_colisiones(
            conn,
            &resolver_almacen_id_de_ubicacion(conn, id)?,
            crate::mapa::TipoNodo::Ubicacion,
            id,
            &actual.codigo,
            &rect,
        )?;
    }
    let ts = ahora();
    conn.execute(
        "UPDATE ubicaciones SET pos_x = ?2, pos_y = ?3, pos_z = ?4, altura = ?5, updated_at = ?6, updated_by = ?7 WHERE id = ?1",
        rusqlite::params![id, pos.pos_x, pos.pos_y, pos.pos_z, pos.altura, ts, actor],
    )?;
    Ok(obtener_ubicacion(conn, id)?.expect("existe"))
}

/// Resuelve el `almacen_id` de una ubicación por transitividad (SPEC §3.13),
/// caminando por el ancestro que corresponda según su árbol simplificado.
#[allow(dead_code)] // usado por el traslado inter-almacén (Fase D)
pub fn resolver_almacen_id_de_ubicacion(
    conn: &Connection,
    ubicacion_id: &str,
) -> AppResult<String> {
    conn.query_row(
        "SELECT COALESCE(
            (SELECT za.almacen_id FROM ubicaciones u
                JOIN secciones se ON se.id = u.seccion_id
                JOIN racks ra ON ra.id = se.rack_id
                JOIN zonas za ON za.id = ra.zona_id
             WHERE u.id = ?1),
            (SELECT za.almacen_id FROM ubicaciones u
                JOIN racks ra ON ra.id = u.rack_id
                JOIN zonas za ON za.id = ra.zona_id
             WHERE u.id = ?1),
            (SELECT za.almacen_id FROM ubicaciones u
                JOIN zonas za ON za.id = u.zona_id
             WHERE u.id = ?1)
        )",
        [ubicacion_id],
        |r| r.get(0),
    )
    .map_err(|_| AppError::NoEncontrado("ubicación", ubicacion_id.to_string()))
}

pub fn editar_ubicacion(
    conn: &Connection,
    id: &str,
    cambios: &EditarUbicacion,
    actor: &str,
) -> AppResult<Ubicacion> {
    puede(conn, Some(actor), "ubicacion", "editar")?;
    let actual = obtener_ubicacion(conn, id)?
        .ok_or_else(|| AppError::NoEncontrado("ubicación", id.to_string()))?;
    let tipo = match &cambios.tipo {
        Some(t) => TipoUbicacion::parse(t)
            .ok_or_else(|| AppError::CampoRequerido("tipo".into()))?
            .as_str()
            .to_string(),
        None => actual.tipo,
    };
    let nombre = cambios.nombre.clone().or(actual.nombre);
    let capacidad_maxima = cambios.capacidad_maxima.or(actual.capacidad_maxima);
    let ts = ahora();
    conn.execute(
        "UPDATE ubicaciones SET nombre = ?2, tipo = ?3, capacidad_maxima = ?4, updated_at = ?5, updated_by = ?6 WHERE id = ?1",
        rusqlite::params![id, nombre, tipo, capacidad_maxima, ts, actor],
    )?;
    crate::domain::seguridad::EventoAuditoria::registrar(
        conn,
        Some(actor),
        "editar",
        "ubicacion",
        Some(id),
        None,
        None,
        None,
    )?;
    Ok(obtener_ubicacion(conn, id)?.expect("existe"))
}

/// Regla SPEC §3.5: no desactivar ubicación con saldo > 0.
pub fn desactivar_ubicacion(conn: &Connection, id: &str, by: Option<&str>) -> AppResult<()> {
    puede(conn, by, "ubicacion", "desactivar")?;
    let saldo: i64 = conn.query_row(
        "SELECT COALESCE(SUM(cantidad), 0) FROM saldos WHERE ubicacion_id = ?1",
        [id],
        |r| r.get(0),
    )?;
    if saldo > 0 {
        return Err(AppError::DesactivarConSaldo("ubicación"));
    }
    let ts = ahora();
    conn.execute(
        "UPDATE ubicaciones SET activo = 0, updated_at = ?2, updated_by = ?3 WHERE id = ?1",
        rusqlite::params![id, ts, by],
    )?;
    crate::domain::seguridad::EventoAuditoria::registrar(
        conn,
        by,
        "desactivar",
        "ubicacion",
        Some(id),
        None,
        None,
        None,
    )?;
    Ok(())
}

// ============ Caja (SPEC §3.6) ============

#[allow(clippy::collapsible_if)]
pub fn crear_caja(conn: &Connection, nuevo: &NuevaCaja) -> AppResult<Caja> {
    puede(conn, nuevo.created_by.as_deref(), "caja", "crear")?;
    verificar_activo(conn, "ubicaciones", &nuevo.ubicacion_id, "ubicación")?;
    // SPEC §3.6: si restringe producto/lote, debe existir y ser coherente.
    if let Some(pid) = &nuevo.producto_id {
        verificar_activo(conn, "productos", pid, "producto")?;
    }
    if let Some(lid) = &nuevo.lote_id {
        let prod_del_lote: String = conn
            .query_row("SELECT producto_id FROM lotes WHERE id = ?1", [lid], |r| {
                r.get(0)
            })
            .map_err(|_| AppError::NoEncontrado("lote", lid.clone()))?;
        if let Some(pid) = &nuevo.producto_id {
            if &prod_del_lote != pid {
                return Err(AppError::CampoInvalido(format!(
                    "el lote '{lid}' no pertenece al producto '{pid}'"
                )));
            }
        }
    }
    let id = Uuid::new_v4().to_string();
    let codigo = crate::domain::normalizar_codigo(&nuevo.codigo);
    let ts = ahora();
    let almacen_id = resolver_almacen_id_de_ubicacion(conn, &nuevo.ubicacion_id)?;
    let existe: i64 = conn.query_row(
        "SELECT COUNT(*) FROM cajas WHERE almacen_id = ?1 AND codigo = ?2 AND activo = 1",
        rusqlite::params![almacen_id, codigo],
        |r| r.get(0),
    )?;
    if existe > 0 {
        return Err(AppError::CodigoDuplicado(codigo));
    }
    conn.execute(
        "INSERT INTO cajas (id, codigo, nombre, ubicacion_id, almacen_id, producto_id, lote_id, etiqueta, activo, created_at, updated_at, created_by, updated_by)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, 1, ?9, ?10, ?11, ?11)",
        rusqlite::params![
            id, codigo, nuevo.nombre, nuevo.ubicacion_id, almacen_id, nuevo.producto_id, nuevo.lote_id, nuevo.etiqueta, ts, ts, nuevo.created_by
        ],
    )?;
    crate::domain::seguridad::EventoAuditoria::registrar(
        conn,
        nuevo.created_by.as_deref(),
        "crear",
        "caja",
        Some(&id),
        None,
        None,
        None,
    )?;
    Ok(obtener_caja(conn, &id)?.expect("recién insertada"))
}

pub fn obtener_caja(conn: &Connection, id: &str) -> AppResult<Option<Caja>> {
    let mut stmt = conn.prepare(
        "SELECT id, codigo, nombre, ubicacion_id, producto_id, lote_id, etiqueta, activo,
                created_by, created_at, updated_by, updated_at
         FROM cajas WHERE id = ?1",
    )?;
    let mut rows = stmt.query_map([id], |r| {
        Ok(Caja {
            id: r.get(0)?,
            codigo: r.get(1)?,
            nombre: r.get(2)?,
            ubicacion_id: r.get(3)?,
            producto_id: r.get(4)?,
            lote_id: r.get(5)?,
            etiqueta: r.get(6)?,
            activo: r.get::<_, i64>(7)? != 0,
            auditoria: crate::domain::Auditoria {
                created_by: r.get(8)?,
                created_at: r.get(9)?,
                updated_by: r.get(10)?,
                updated_at: r.get(11)?,
            },
        })
    })?;
    rows.next().transpose().map_err(AppError::from)
}

pub fn editar_caja(
    conn: &Connection,
    id: &str,
    cambios: &EditarCaja,
    actor: &str,
) -> AppResult<Caja> {
    puede(conn, Some(actor), "caja", "editar")?;
    let actual =
        obtener_caja(conn, id)?.ok_or_else(|| AppError::NoEncontrado("caja", id.to_string()))?;
    let nombre = cambios.nombre.clone().or(actual.nombre);
    let etiqueta = cambios.etiqueta.clone().or(actual.etiqueta);
    let ts = ahora();
    conn.execute(
        "UPDATE cajas SET nombre = ?2, etiqueta = ?3, updated_at = ?4, updated_by = ?5 WHERE id = ?1",
        rusqlite::params![id, nombre, etiqueta, ts, actor],
    )?;
    crate::domain::seguridad::EventoAuditoria::registrar(
        conn,
        Some(actor),
        "editar",
        "caja",
        Some(id),
        None,
        None,
        None,
    )?;
    Ok(obtener_caja(conn, id)?.expect("existe"))
}

pub fn desactivar_caja(conn: &Connection, id: &str, actor: &str) -> AppResult<()> {
    puede(conn, Some(actor), "caja", "desactivar")?;
    let ts = ahora();
    conn.execute(
        "UPDATE cajas SET activo = 0, updated_at = ?2, updated_by = ?3 WHERE id = ?1",
        rusqlite::params![id, ts, actor],
    )?;
    crate::domain::seguridad::EventoAuditoria::registrar(
        conn,
        Some(actor),
        "desactivar",
        "caja",
        Some(id),
        None,
        None,
        None,
    )?;
    Ok(())
}

// ============ Categoría (SPEC §3.8) ============

pub fn crear_categoria(conn: &Connection, nuevo: &NuevaCategoria) -> AppResult<Categoria> {
    puede(conn, nuevo.created_by.as_deref(), "categoria", "crear")?;
    if let Some(parent) = &nuevo.parent_id {
        // No permitir ciclos (SPEC §3.8): chequeo simple de existencia.
        verificar_activo(conn, "categorias", parent, "categoría")?;
    }
    let id = Uuid::new_v4().to_string();
    let ts = ahora();
    let nombre = nuevo.nombre.trim();
    conn.execute(
        "INSERT INTO categorias (id, nombre, parent_id, descripcion, activo, created_at, updated_at, created_by, updated_by)
         VALUES (?1, ?2, ?3, ?4, 1, ?5, ?6, ?7, ?7)",
        rusqlite::params![id, nombre, nuevo.parent_id, nuevo.descripcion, ts, ts, nuevo.created_by],
    )
    .map_err(|_| AppError::CodigoDuplicado(nombre.to_string()))?;
    crate::domain::seguridad::EventoAuditoria::registrar(
        conn,
        nuevo.created_by.as_deref(),
        "crear",
        "categoria",
        Some(&id),
        None,
        None,
        None,
    )?;
    Ok(obtener_categoria(conn, &id)?.expect("recién insertada"))
}

pub fn obtener_categoria(conn: &Connection, id: &str) -> AppResult<Option<Categoria>> {
    let mut stmt = conn.prepare(
        "SELECT id, nombre, parent_id, descripcion, activo,
                created_by, created_at, updated_by, updated_at
         FROM categorias WHERE id = ?1",
    )?;
    let mut rows = stmt.query_map([id], |r| {
        Ok(Categoria {
            id: r.get(0)?,
            nombre: r.get(1)?,
            parent_id: r.get(2)?,
            descripcion: r.get(3)?,
            activo: r.get::<_, i64>(4)? != 0,
            auditoria: crate::domain::Auditoria {
                created_by: r.get(5)?,
                created_at: r.get(6)?,
                updated_by: r.get(7)?,
                updated_at: r.get(8)?,
            },
        })
    })?;
    rows.next().transpose().map_err(AppError::from)
}

/// Recorre la cadena de ancestros desde `nuevo_parent_id` hacia la raíz: si
/// llega a `id`, asignarlo como padre cerraría un ciclo (SPEC §3.8).
fn crearia_ciclo_categoria(conn: &Connection, id: &str, nuevo_parent_id: &str) -> AppResult<bool> {
    let mut actual = nuevo_parent_id.to_string();
    for _ in 0..10_000 {
        if actual == id {
            return Ok(true);
        }
        let padre: Option<String> = conn
            .query_row(
                "SELECT parent_id FROM categorias WHERE id = ?1",
                [&actual],
                |r| r.get(0),
            )
            .map_err(|_| AppError::NoEncontrado("categoría", actual.clone()))?;
        match padre {
            Some(p) => actual = p,
            None => return Ok(false),
        }
    }
    // Cadena anormalmente larga: se trata como ciclo por seguridad.
    Ok(true)
}

pub fn editar_categoria(
    conn: &Connection,
    id: &str,
    cambios: &EditarCategoria,
    actor: &str,
) -> AppResult<Categoria> {
    puede(conn, Some(actor), "categoria", "editar")?;
    let actual = obtener_categoria(conn, id)?
        .ok_or_else(|| AppError::NoEncontrado("categoría", id.to_string()))?;
    let nombre = cambios.nombre.clone().unwrap_or(actual.nombre);
    let descripcion = cambios.descripcion.clone().or(actual.descripcion);
    let parent_id = match &cambios.parent_id {
        Some(Some(nuevo_padre)) => {
            if nuevo_padre == id || crearia_ciclo_categoria(conn, id, nuevo_padre)? {
                return Err(AppError::CicloCategoria);
            }
            verificar_activo(conn, "categorias", nuevo_padre, "categoría")?;
            Some(nuevo_padre.clone())
        }
        Some(None) => None,
        None => actual.parent_id,
    };
    let ts = ahora();
    conn.execute(
        "UPDATE categorias SET nombre = ?2, parent_id = ?3, descripcion = ?4, updated_at = ?5, updated_by = ?6 WHERE id = ?1",
        rusqlite::params![id, nombre, parent_id, descripcion, ts, actor],
    )?;
    crate::domain::seguridad::EventoAuditoria::registrar(
        conn,
        Some(actor),
        "editar",
        "categoria",
        Some(id),
        None,
        None,
        None,
    )?;
    Ok(obtener_categoria(conn, id)?.expect("existe"))
}

pub fn desactivar_categoria(conn: &Connection, id: &str, actor: &str) -> AppResult<()> {
    puede(conn, Some(actor), "categoria", "desactivar")?;
    // SPEC §3.8: categoría con hijos o con productos no se elimina físicamente,
    // se desactiva — pero si tiene historial (productos/hijos) debe registrarse
    // como desactivación con trazabilidad; permitimos desactivar siempre
    // porque la regla es "no eliminar si tiene hijos/productos", no "no desactivar".
    // Verificamos solo para auditoría: si tiene hijos/productos, sigue siendo desactivación válida.
    let hijos: i64 = conn.query_row(
        "SELECT COUNT(*) FROM categorias WHERE parent_id = ?1 AND activo = 1",
        [id],
        |r| r.get(0),
    )?;
    let productos: i64 = conn.query_row(
        "SELECT COUNT(*) FROM productos WHERE categoria_id = ?1 AND activo = 1",
        [id],
        |r| r.get(0),
    )?;
    if hijos > 0 || productos > 0 {
        // Desactivación es correcta (SPEC §14.1); solo dejamos rastro en auditoría.
    }
    let ts = ahora();
    conn.execute(
        "UPDATE categorias SET activo = 0, updated_at = ?2, updated_by = ?3 WHERE id = ?1",
        rusqlite::params![id, ts, actor],
    )?;
    crate::domain::seguridad::EventoAuditoria::registrar(
        conn,
        Some(actor),
        "desactivar",
        "categoria",
        Some(id),
        None,
        None,
        None,
    )?;
    Ok(())
}

// ============ UOM (SPEC §3.9) ============

pub fn crear_uom(conn: &Connection, nuevo: &NuevaUom, actor: &str) -> AppResult<Uom> {
    puede(conn, Some(actor), "uom", "crear")?;
    let id = Uuid::new_v4().to_string();
    let ts = ahora();
    let codigo = crate::domain::normalizar_codigo(&nuevo.codigo);
    conn.execute(
        "INSERT INTO uoms (id, codigo, nombre, tipo, factor, base, created_at, updated_at)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)",
        rusqlite::params![
            id,
            codigo,
            nuevo.nombre.trim(),
            nuevo.tipo,
            nuevo.factor,
            nuevo.base as i64,
            ts,
            ts
        ],
    )
    .map_err(|_| AppError::CodigoDuplicado(codigo))?;
    crate::domain::seguridad::EventoAuditoria::registrar(
        conn,
        Some(actor),
        "crear",
        "uom",
        Some(&id),
        None,
        None,
        None,
    )?;
    Ok(obtener_uom(conn, &id)?.expect("recién insertada"))
}

pub fn obtener_uom(conn: &Connection, id: &str) -> AppResult<Option<Uom>> {
    let mut stmt = conn.prepare(
        "SELECT id, codigo, nombre, tipo, factor, base, activo, created_at, updated_at
         FROM uoms WHERE id = ?1",
    )?;
    let mut rows = stmt.query_map([id], |r| {
        Ok(Uom {
            id: r.get(0)?,
            codigo: r.get(1)?,
            nombre: r.get(2)?,
            tipo: r.get(3)?,
            factor: r.get(4)?,
            base: r.get::<_, i64>(5)? != 0,
            activo: r.get::<_, i64>(6)? != 0,
            created_at: r.get(7)?,
            updated_at: r.get(8)?,
        })
    })?;
    rows.next().transpose().map_err(AppError::from)
}

/// Edita una UOM (SPEC §3.9). `codigo` es estable; se actualizan nombre,
/// tipo, factor y base. Exige `uom:editar`.
pub fn editar_uom(conn: &Connection, id: &str, cambios: &EditarUom, actor: &str) -> AppResult<Uom> {
    cambios.validar()?;
    puede(conn, Some(actor), "uom", "editar")?;
    let actual = obtener_uom(conn, id)?
        .ok_or_else(|| AppError::NoEncontrado("unidad de medida", id.to_string()))?;
    let nombre = cambios
        .nombre
        .clone()
        .map(|n| n.trim().to_string())
        .unwrap_or(actual.nombre);
    let tipo = cambios.tipo.clone().unwrap_or(actual.tipo);
    let factor = cambios.factor.unwrap_or(actual.factor);
    let base = cambios.base.unwrap_or(actual.base);
    let ts = ahora();
    conn.execute(
        "UPDATE uoms SET nombre = ?2, tipo = ?3, factor = ?4, base = ?5, updated_at = ?6 WHERE id = ?1",
        rusqlite::params![id, nombre, tipo, factor, base as i64, ts],
    )?;
    crate::domain::seguridad::EventoAuditoria::registrar(
        conn,
        Some(actor),
        "editar",
        "uom",
        Some(id),
        None,
        None,
        None,
    )?;
    Ok(obtener_uom(conn, id)?.expect("existe"))
}

/// Borrado lógico de una UOM. No se puede desactivar si algún producto la
/// referencia como `uom_base_id`/`uom_venta_id`/`uom_compra_id` (quedaría
/// huérfano, SPEC §14.1). Exige `uom:desactivar`.
pub fn desactivar_uom(conn: &Connection, id: &str, actor: &str) -> AppResult<()> {
    puede(conn, Some(actor), "uom", "desactivar")?;
    let referenciada: i64 = conn.query_row(
        "SELECT COUNT(*) FROM productos
         WHERE uom_base_id = ?1 OR uom_venta_id = ?1 OR uom_compra_id = ?1",
        [id],
        |r| r.get(0),
    )?;
    if referenciada > 0 {
        return Err(AppError::ConHistorial("unidad de medida"));
    }
    let ts = ahora();
    conn.execute(
        "UPDATE uoms SET activo = 0, updated_at = ?2 WHERE id = ?1",
        rusqlite::params![id, ts],
    )?;
    crate::domain::seguridad::EventoAuditoria::registrar(
        conn,
        Some(actor),
        "desactivar",
        "uom",
        Some(id),
        None,
        None,
        None,
    )?;
    Ok(())
}

// ============ Proveedor (SPEC §3.10) ============

pub fn crear_proveedor(conn: &Connection, nuevo: &NuevoProveedor) -> AppResult<Proveedor> {
    puede(conn, nuevo.created_by.as_deref(), "proveedor", "crear")?;
    let id = Uuid::new_v4().to_string();
    let codigo = crate::domain::normalizar_codigo(&nuevo.codigo);
    let ts = ahora();
    conn.execute(
        "INSERT INTO proveedores (id, codigo, nombre, contacto_nombre, contacto_telefono, contacto_email, direccion, activo, created_at, updated_at, created_by, updated_by)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, 1, ?8, ?9, ?10, ?10)",
        rusqlite::params![
            id, codigo, nuevo.nombre.trim(), nuevo.contacto_nombre, nuevo.contacto_telefono,
            nuevo.contacto_email, nuevo.direccion, ts, ts, nuevo.created_by
        ],
    )
    .map_err(|_| AppError::CodigoDuplicado(codigo))?;
    crate::domain::seguridad::EventoAuditoria::registrar(
        conn,
        nuevo.created_by.as_deref(),
        "crear",
        "proveedor",
        Some(&id),
        None,
        None,
        None,
    )?;
    Ok(obtener_proveedor(conn, &id)?.expect("recién insertado"))
}

pub fn obtener_proveedor(conn: &Connection, id: &str) -> AppResult<Option<Proveedor>> {
    let mut stmt = conn.prepare(
        "SELECT id, codigo, nombre, contacto_nombre, contacto_telefono, contacto_email, direccion, activo,
                created_by, created_at, updated_by, updated_at
         FROM proveedores WHERE id = ?1",
    )?;
    let mut rows = stmt.query_map([id], |r| {
        Ok(Proveedor {
            id: r.get(0)?,
            codigo: r.get(1)?,
            nombre: r.get(2)?,
            contacto_nombre: r.get(3)?,
            contacto_telefono: r.get(4)?,
            contacto_email: r.get(5)?,
            direccion: r.get(6)?,
            activo: r.get::<_, i64>(7)? != 0,
            auditoria: crate::domain::Auditoria {
                created_by: r.get(8)?,
                created_at: r.get(9)?,
                updated_by: r.get(10)?,
                updated_at: r.get(11)?,
            },
        })
    })?;
    rows.next().transpose().map_err(AppError::from)
}

pub fn editar_proveedor(
    conn: &Connection,
    id: &str,
    cambios: &EditarProveedor,
    actor: &str,
) -> AppResult<Proveedor> {
    puede(conn, Some(actor), "proveedor", "editar")?;
    let actual = obtener_proveedor(conn, id)?
        .ok_or_else(|| AppError::NoEncontrado("proveedor", id.to_string()))?;
    let nombre = cambios.nombre.clone().unwrap_or(actual.nombre);
    let contacto_nombre = cambios.contacto_nombre.clone().or(actual.contacto_nombre);
    let contacto_telefono = cambios
        .contacto_telefono
        .clone()
        .or(actual.contacto_telefono);
    let contacto_email = cambios.contacto_email.clone().or(actual.contacto_email);
    let direccion = cambios.direccion.clone().or(actual.direccion);
    let ts = ahora();
    conn.execute(
        "UPDATE proveedores SET nombre = ?2, contacto_nombre = ?3, contacto_telefono = ?4, contacto_email = ?5, direccion = ?6, updated_at = ?7, updated_by = ?8 WHERE id = ?1",
        rusqlite::params![id, nombre, contacto_nombre, contacto_telefono, contacto_email, direccion, ts, actor],
    )?;
    crate::domain::seguridad::EventoAuditoria::registrar(
        conn,
        Some(actor),
        "editar",
        "proveedor",
        Some(id),
        None,
        None,
        None,
    )?;
    Ok(obtener_proveedor(conn, id)?.expect("existe"))
}

pub fn desactivar_proveedor(conn: &Connection, id: &str, actor: &str) -> AppResult<()> {
    puede(conn, Some(actor), "proveedor", "desactivar")?;
    let ts = ahora();
    conn.execute(
        "UPDATE proveedores SET activo = 0, updated_at = ?2, updated_by = ?3 WHERE id = ?1",
        rusqlite::params![id, ts, actor],
    )?;
    crate::domain::seguridad::EventoAuditoria::registrar(
        conn,
        Some(actor),
        "desactivar",
        "proveedor",
        Some(id),
        None,
        None,
        None,
    )?;
    Ok(())
}

// ============ Cliente (SPEC §3.11) ============

pub fn crear_cliente(conn: &Connection, nuevo: &NuevoCliente) -> AppResult<Cliente> {
    puede(conn, nuevo.created_by.as_deref(), "cliente", "crear")?;
    let id = Uuid::new_v4().to_string();
    let codigo = crate::domain::normalizar_codigo(&nuevo.codigo);
    let ts = ahora();
    conn.execute(
        "INSERT INTO clientes (id, codigo, nombre, contacto_nombre, contacto_telefono, contacto_email, direccion, activo, created_at, updated_at, created_by, updated_by)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, 1, ?8, ?9, ?10, ?10)",
        rusqlite::params![
            id, codigo, nuevo.nombre.trim(), nuevo.contacto_nombre, nuevo.contacto_telefono,
            nuevo.contacto_email, nuevo.direccion, ts, ts, nuevo.created_by
        ],
    )
    .map_err(|_| AppError::CodigoDuplicado(codigo))?;
    crate::domain::seguridad::EventoAuditoria::registrar(
        conn,
        nuevo.created_by.as_deref(),
        "crear",
        "cliente",
        Some(&id),
        None,
        None,
        None,
    )?;
    Ok(obtener_cliente(conn, &id)?.expect("recién insertado"))
}

pub fn obtener_cliente(conn: &Connection, id: &str) -> AppResult<Option<Cliente>> {
    let mut stmt = conn.prepare(
        "SELECT id, codigo, nombre, contacto_nombre, contacto_telefono, contacto_email, direccion, activo,
                created_by, created_at, updated_by, updated_at
         FROM clientes WHERE id = ?1",
    )?;
    let mut rows = stmt.query_map([id], |r| {
        Ok(Cliente {
            id: r.get(0)?,
            codigo: r.get(1)?,
            nombre: r.get(2)?,
            contacto_nombre: r.get(3)?,
            contacto_telefono: r.get(4)?,
            contacto_email: r.get(5)?,
            direccion: r.get(6)?,
            activo: r.get::<_, i64>(7)? != 0,
            auditoria: crate::domain::Auditoria {
                created_by: r.get(8)?,
                created_at: r.get(9)?,
                updated_by: r.get(10)?,
                updated_at: r.get(11)?,
            },
        })
    })?;
    rows.next().transpose().map_err(AppError::from)
}

pub fn editar_cliente(
    conn: &Connection,
    id: &str,
    cambios: &EditarCliente,
    actor: &str,
) -> AppResult<Cliente> {
    puede(conn, Some(actor), "cliente", "editar")?;
    let actual = obtener_cliente(conn, id)?
        .ok_or_else(|| AppError::NoEncontrado("cliente", id.to_string()))?;
    let nombre = cambios.nombre.clone().unwrap_or(actual.nombre);
    let contacto_nombre = cambios.contacto_nombre.clone().or(actual.contacto_nombre);
    let contacto_telefono = cambios
        .contacto_telefono
        .clone()
        .or(actual.contacto_telefono);
    let contacto_email = cambios.contacto_email.clone().or(actual.contacto_email);
    let direccion = cambios.direccion.clone().or(actual.direccion);
    let ts = ahora();
    conn.execute(
        "UPDATE clientes SET nombre = ?2, contacto_nombre = ?3, contacto_telefono = ?4, contacto_email = ?5, direccion = ?6, updated_at = ?7, updated_by = ?8 WHERE id = ?1",
        rusqlite::params![id, nombre, contacto_nombre, contacto_telefono, contacto_email, direccion, ts, actor],
    )?;
    crate::domain::seguridad::EventoAuditoria::registrar(
        conn,
        Some(actor),
        "editar",
        "cliente",
        Some(id),
        None,
        None,
        None,
    )?;
    Ok(obtener_cliente(conn, id)?.expect("existe"))
}

pub fn desactivar_cliente(conn: &Connection, id: &str, actor: &str) -> AppResult<()> {
    puede(conn, Some(actor), "cliente", "desactivar")?;
    let ts = ahora();
    conn.execute(
        "UPDATE clientes SET activo = 0, updated_at = ?2, updated_by = ?3 WHERE id = ?1",
        rusqlite::params![id, ts, actor],
    )?;
    crate::domain::seguridad::EventoAuditoria::registrar(
        conn,
        Some(actor),
        "desactivar",
        "cliente",
        Some(id),
        None,
        None,
        None,
    )?;
    Ok(())
}

// ============ Producto (SPEC §3.7) ============

pub fn crear_producto(conn: &Connection, nuevo: &NuevoProducto) -> AppResult<Producto> {
    nuevo.validar()?;
    puede(conn, nuevo.created_by.as_deref(), "producto", "crear")?;
    // La UOM no tiene `activo` (SPEC §3.9): solo se valida existencia.
    // (Con `activo` añadido por configuración, además debe estar activa.)
    let uom_base = obtener_uom(conn, &nuevo.uom_base_id)?
        .ok_or_else(|| AppError::NoEncontrado("uom", nuevo.uom_base_id.clone()))?;
    if !uom_base.activo {
        return Err(AppError::EntidadInactiva("unidad de medida"));
    }
    for uom_id in [&nuevo.uom_venta_id, &nuevo.uom_compra_id]
        .into_iter()
        .flatten()
    {
        let uom = obtener_uom(conn, uom_id)?
            .ok_or_else(|| AppError::NoEncontrado("uom", uom_id.clone()))?;
        if !uom.activo {
            return Err(AppError::EntidadInactiva("unidad de medida"));
        }
    }
    let id = Uuid::new_v4().to_string();
    let sku = nuevo.sku_normalizado();
    let ts = ahora();
    conn.execute(
        "INSERT INTO productos (id, sku, nombre, descripcion, categoria_id, uom_base_id, uom_venta_id, uom_compra_id,
                codigo_barras, peso_unitario, volumen_unitario, stock_minimo, stock_maximo,
                controla_lote, controla_vencimiento, perecedero, costo_unitario, activo, created_at, updated_at, created_by, updated_by)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14, ?15, ?16, ?17, 1, ?18, ?19, ?20, ?20)",
        rusqlite::params![
            id, sku, nuevo.nombre.trim(), nuevo.descripcion, nuevo.categoria_id, nuevo.uom_base_id,
            nuevo.uom_venta_id, nuevo.uom_compra_id, nuevo.codigo_barras, nuevo.peso_unitario,
            nuevo.volumen_unitario, nuevo.stock_minimo, nuevo.stock_maximo,
            nuevo.controla_lote as i64, nuevo.controla_vencimiento as i64, nuevo.perecedero as i64,
            nuevo.costo_unitario, ts, ts, nuevo.created_by
        ],
    )
    .map_err(|_| AppError::CodigoDuplicado(sku))?;
    Ok(obtener_producto(conn, &id)?.expect("recién insertado"))
}

pub fn obtener_producto(conn: &Connection, id: &str) -> AppResult<Option<Producto>> {
    let mut stmt = conn.prepare(
        "SELECT id, sku, nombre, descripcion, categoria_id, uom_base_id, uom_venta_id, uom_compra_id,
                codigo_barras, peso_unitario, volumen_unitario, stock_minimo, stock_maximo,
                controla_lote, controla_vencimiento, perecedero, costo_unitario, activo,
                created_by, created_at, updated_by, updated_at
         FROM productos WHERE id = ?1",
    )?;
    let mut rows = stmt.query_map([id], map_producto)?;
    rows.next().transpose().map_err(AppError::from)
}

fn map_producto(r: &rusqlite::Row<'_>) -> rusqlite::Result<Producto> {
    Ok(Producto {
        id: r.get(0)?,
        sku: r.get(1)?,
        nombre: r.get(2)?,
        descripcion: r.get(3)?,
        categoria_id: r.get(4)?,
        uom_base_id: r.get(5)?,
        uom_venta_id: r.get(6)?,
        uom_compra_id: r.get(7)?,
        codigo_barras: r.get(8)?,
        peso_unitario: r.get(9)?,
        volumen_unitario: r.get(10)?,
        stock_minimo: r.get(11)?,
        stock_maximo: r.get(12)?,
        controla_lote: r.get::<_, i64>(13)? != 0,
        controla_vencimiento: r.get::<_, i64>(14)? != 0,
        perecedero: r.get::<_, i64>(15)? != 0,
        costo_unitario: r.get(16)?,
        activo: r.get::<_, i64>(17)? != 0,
        auditoria: crate::domain::Auditoria {
            created_by: r.get(18)?,
            created_at: r.get(19)?,
            updated_by: r.get(20)?,
            updated_at: r.get(21)?,
        },
    })
}

/// El `sku` no se toca aquí (SPEC §3.7: inmutable una vez creado).
pub fn editar_producto(
    conn: &Connection,
    id: &str,
    cambios: &EditarProducto,
    actor: &str,
) -> AppResult<Producto> {
    puede(conn, Some(actor), "producto", "editar")?;
    let actual = obtener_producto(conn, id)?
        .ok_or_else(|| AppError::NoEncontrado("producto", id.to_string()))?;
    let nombre = cambios.nombre.clone().unwrap_or(actual.nombre);
    let descripcion = cambios.descripcion.clone().or(actual.descripcion);
    let categoria_id = cambios.categoria_id.clone().or(actual.categoria_id);
    let uom_venta_id = cambios.uom_venta_id.clone().or(actual.uom_venta_id);
    let uom_compra_id = cambios.uom_compra_id.clone().or(actual.uom_compra_id);
    // Si se indica una UOM de venta/compra, debe existir y estar activa.
    for uom_id in [&uom_venta_id, &uom_compra_id].into_iter().flatten() {
        let uom = obtener_uom(conn, uom_id)?
            .ok_or_else(|| AppError::NoEncontrado("uom", uom_id.clone()))?;
        if !uom.activo {
            return Err(AppError::EntidadInactiva("unidad de medida"));
        }
    }
    let codigo_barras = cambios.codigo_barras.clone().or(actual.codigo_barras);
    let peso_unitario = cambios.peso_unitario.or(actual.peso_unitario);
    let volumen_unitario = cambios.volumen_unitario.or(actual.volumen_unitario);
    let stock_minimo = cambios.stock_minimo.or(actual.stock_minimo);
    let stock_maximo = cambios.stock_maximo.or(actual.stock_maximo);
    let controla_lote = cambios.controla_lote.unwrap_or(actual.controla_lote);
    let controla_vencimiento = cambios
        .controla_vencimiento
        .unwrap_or(actual.controla_vencimiento);
    let perecedero = cambios.perecedero.unwrap_or(actual.perecedero);
    let costo_unitario = cambios.costo_unitario.or(actual.costo_unitario);
    if controla_vencimiento && !controla_lote {
        return Err(AppError::CampoRequerido(
            "controla_lote (controla_vencimiento lo implica)".into(),
        ));
    }
    // SPEC §3.7: si se cambia controla_lote de false→true y ya existen movimientos
    // sin lote para este producto, se crean huérfanos (saldos fragmentados).
    // Si se cambia de true→false y hay movimientos con lote, se pierde trazabilidad.
    // Exigir que no haya movimientos previos si cambia el flag.
    if controla_lote != actual.controla_lote {
        let mov_con_sin_lote: i64 = conn.query_row(
            "SELECT COUNT(*) FROM movimiento_lineas WHERE producto_id = ?1 AND lote_id IS NULL",
            [id],
            |r| r.get(0),
        )?;
        let mov_con_lote: i64 = conn.query_row(
            "SELECT COUNT(*) FROM movimiento_lineas WHERE producto_id = ?1 AND lote_id IS NOT NULL",
            [id],
            |r| r.get(0),
        )?;
        if controla_lote && mov_con_sin_lote > 0 {
            return Err(AppError::CampoInvalido(
                "no se puede activar controla_lote: ya existen movimientos sin lote para este producto. Regulariza el historial o crea un producto nuevo".into(),
            ));
        }
        if !controla_lote && mov_con_lote > 0 {
            return Err(AppError::CampoInvalido(
                "no se puede desactivar controla_lote: ya existen movimientos con lote para este producto".into(),
            ));
        }
        // También validar saldos materializados: si hay saldo sin lote y activamos lote, fragmentación.
        let saldo_sin_lote: i64 = conn.query_row(
            "SELECT COALESCE(SUM(cantidad),0) FROM saldos WHERE producto_id=?1 AND lote_key=''",
            [id],
            |r| r.get(0),
        )?;
        let saldo_con_lote: i64 = conn.query_row(
            "SELECT COALESCE(SUM(cantidad),0) FROM saldos WHERE producto_id=?1 AND lote_key!=''",
            [id],
            |r| r.get(0),
        )?;
        if controla_lote && saldo_sin_lote > 0 {
            return Err(AppError::CampoInvalido(
                "no se puede activar controla_lote: hay stock sin lote (regulariza antes)".into(),
            ));
        }
        if !controla_lote && saldo_con_lote > 0 {
            return Err(AppError::CampoInvalido(
                "no se puede desactivar controla_lote: hay stock con lote".into(),
            ));
        }
    }
    let ts = ahora();
    conn.execute(
        "UPDATE productos SET nombre = ?2, descripcion = ?3, categoria_id = ?4, uom_venta_id = ?5,
                uom_compra_id = ?6, codigo_barras = ?7, peso_unitario = ?8, volumen_unitario = ?9,
                stock_minimo = ?10, stock_maximo = ?11, controla_lote = ?12, controla_vencimiento = ?13,
                perecedero = ?14, costo_unitario = ?15, updated_at = ?16, updated_by = ?17
         WHERE id = ?1",
        rusqlite::params![
            id, nombre, descripcion, categoria_id, uom_venta_id, uom_compra_id, codigo_barras,
            peso_unitario, volumen_unitario, stock_minimo, stock_maximo, controla_lote as i64,
            controla_vencimiento as i64, perecedero as i64, costo_unitario, ts, actor
        ],
    )
    .map_err(|_| AppError::CodigoDuplicado("codigo_barras".into()))?;
    crate::domain::seguridad::EventoAuditoria::registrar(
        conn,
        Some(actor),
        "editar",
        "producto",
        Some(id),
        None,
        None,
        None,
    )?;
    Ok(obtener_producto(conn, id)?.expect("existe"))
}

pub fn desactivar_producto(conn: &Connection, id: &str, actor: &str) -> AppResult<()> {
    puede(conn, Some(actor), "producto", "desactivar")?;
    let ts = ahora();
    conn.execute(
        "UPDATE productos SET activo = 0, updated_at = ?2, updated_by = ?3 WHERE id = ?1",
        rusqlite::params![id, ts, actor],
    )?;
    crate::domain::seguridad::EventoAuditoria::registrar(
        conn,
        Some(actor),
        "desactivar",
        "producto",
        Some(id),
        None,
        None,
        None,
    )?;
    Ok(())
}

/// Resuelve un producto por su código de barras exacto (SPEC §14.3). El
/// escaneo nunca crea datos: si no hay coincidencia, devuelve `None` para que
/// el llamador sugiera búsqueda manual.
pub fn buscar_producto_por_codigo_barras(
    conn: &Connection,
    codigo_barras: &str,
) -> AppResult<Option<Producto>> {
    let mut stmt = conn.prepare(
        "SELECT id, sku, nombre, descripcion, categoria_id, uom_base_id, uom_venta_id, uom_compra_id,
                codigo_barras, peso_unitario, volumen_unitario, stock_minimo, stock_maximo,
                controla_lote, controla_vencimiento, perecedero, costo_unitario, activo,
                created_by, created_at, updated_by, updated_at
         FROM productos WHERE codigo_barras = ?1",
    )?;
    let mut rows = stmt.query_map([codigo_barras], map_producto)?;
    rows.next().transpose().map_err(AppError::from)
}

// ============ Resolución de escaneo (SPEC §14.3, captura rápida) ============

/// Resultado de resolver un código escaneado (modo captura): qué entidad es y
/// su id para alimentar el formulario. `tipo` ∈ PRODUCTO | UBICACION | LOTE |
/// CAJA. Solo lectura — el escaneo nunca crea datos. Para PRODUCTO lleva
/// `controla_lote` del producto resuelto: la captura rápida decide el siguiente
/// paso (lote o cantidad) con este dato, sin depender de la lista de productos
/// en el cliente (que puede no haber cargado aún).
#[derive(Debug, Clone, Serialize)]
pub struct EscaneoResuelto {
    pub tipo: String,
    pub id: String,
    pub etiqueta: String,
    #[serde(default)]
    pub controla_lote: bool,
}

fn escaneo(tipo: &str, id: String, etiqueta: String) -> EscaneoResuelto {
    EscaneoResuelto {
        tipo: tipo.into(),
        id,
        etiqueta,
        controla_lote: false,
    }
}

/// Resuelve un código escaneado (tipo teclado) a una entidad del dominio:
/// producto por código de barras o SKU, ubicación por código, lote por número
/// y caja por código. Devuelve el primer match (prioridad producto → ubicación
/// → lote → caja) o `None` si no coincide con nada.
pub fn resolver_escaneo(conn: &Connection, codigo: &str) -> AppResult<Option<EscaneoResuelto>> {
    let c = codigo.trim();
    if c.is_empty() {
        return Ok(None);
    }

    // Producto por código de barras exacto (tiene prioridad: es la lectura
    // directa del escáner, SPEC §14.3).
    if let Ok((id, sku, controla)) = conn.query_row(
        "SELECT id, sku, controla_lote FROM productos WHERE codigo_barras = ?1",
        [c],
        |r| {
            Ok((
                r.get::<_, String>(0)?,
                r.get::<_, String>(1)?,
                r.get::<_, bool>(2)?,
            ))
        },
    ) {
        return Ok(Some(EscaneoResuelto {
            controla_lote: controla,
            ..escaneo("PRODUCTO", id, sku)
        }));
    }

    // Producto por SKU normalizado.
    let sku = normalizar_codigo(c);
    if let Ok((id, nombre_sku, controla)) = conn.query_row(
        "SELECT id, sku, controla_lote FROM productos WHERE sku = ?1",
        [&sku],
        |r| {
            Ok((
                r.get::<_, String>(0)?,
                r.get::<_, String>(1)?,
                r.get::<_, bool>(2)?,
            ))
        },
    ) {
        return Ok(Some(EscaneoResuelto {
            controla_lote: controla,
            ..escaneo("PRODUCTO", id, nombre_sku)
        }));
    }

    // Ubicación por código.
    if let Ok(fila) = conn.query_row(
        "SELECT id, codigo FROM ubicaciones WHERE codigo = ?1",
        [c],
        |r| Ok((r.get::<_, String>(0)?, r.get::<_, String>(1)?)),
    ) {
        return Ok(Some(escaneo("UBICACION", fila.0, fila.1)));
    }

    // Lote por número.
    if let Ok(fila) = conn.query_row("SELECT id, numero FROM lotes WHERE numero = ?1", [c], |r| {
        Ok((r.get::<_, String>(0)?, r.get::<_, String>(1)?))
    }) {
        return Ok(Some(escaneo("LOTE", fila.0, fila.1)));
    }

    // Caja por código.
    if let Ok(fila) = conn.query_row("SELECT id, codigo FROM cajas WHERE codigo = ?1", [c], |r| {
        Ok((r.get::<_, String>(0)?, r.get::<_, String>(1)?))
    }) {
        return Ok(Some(escaneo("CAJA", fila.0, fila.1)));
    }

    Ok(None)
}

// ============ Lote (SPEC §3.12) ============

pub fn crear_lote(conn: &Connection, nuevo: &NuevoLote) -> AppResult<Lote> {
    puede(conn, nuevo.created_by.as_deref(), "lote", "crear")?;
    let producto = obtener_producto(conn, &nuevo.producto_id)?
        .ok_or_else(|| AppError::NoEncontrado("producto", nuevo.producto_id.clone()))?;
    if !producto.controla_lote {
        return Err(AppError::CampoRequerido(
            "el producto no controla lote".into(),
        ));
    }
    // Si controla vencimiento, la fecha es obligatoria (SPEC §3.12).
    if producto.controla_vencimiento && nuevo.fecha_vencimiento.is_none() {
        return Err(AppError::CampoRequerido("fecha_vencimiento".into()));
    }
    // Normalizar fechas a YYYY-MM-DD (primeros 10 chars) para comparación lexicográfica §8.6.
    let fecha_fabricacion = nuevo
        .fecha_fabricacion
        .as_deref()
        .map(|s| s[..10.min(s.len())].to_string());
    let fecha_vencimiento = nuevo
        .fecha_vencimiento
        .as_deref()
        .map(|s| s[..10.min(s.len())].to_string());
    let id = Uuid::new_v4().to_string();
    let ts = ahora();
    let numero = nuevo.numero.trim();
    conn.execute(
        "INSERT INTO lotes (id, numero, producto_id, fecha_fabricacion, fecha_vencimiento, origen, notas, created_at, updated_at, created_by, updated_by)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?10)",
        rusqlite::params![
            id, numero, nuevo.producto_id, fecha_fabricacion, fecha_vencimiento,
            nuevo.origen, nuevo.notas, ts, ts, nuevo.created_by
        ],
    )
    .map_err(|_| AppError::CodigoDuplicado(numero.to_string()))?;
    crate::domain::seguridad::EventoAuditoria::registrar(
        conn,
        nuevo.created_by.as_deref(),
        "crear",
        "lote",
        Some(&id),
        None,
        None,
        None,
    )?;
    Ok(obtener_lote(conn, &id)?.expect("recién insertado"))
}

pub fn obtener_lote(conn: &Connection, id: &str) -> AppResult<Option<Lote>> {
    let mut stmt = conn.prepare(
        "SELECT id, numero, producto_id, fecha_fabricacion, fecha_vencimiento, origen, notas,
                created_by, created_at, updated_by, updated_at
         FROM lotes WHERE id = ?1",
    )?;
    let mut rows = stmt.query_map([id], |r| {
        Ok(Lote {
            id: r.get(0)?,
            numero: r.get(1)?,
            producto_id: r.get(2)?,
            fecha_fabricacion: r.get(3)?,
            fecha_vencimiento: r.get(4)?,
            origen: r.get(5)?,
            notas: r.get(6)?,
            auditoria: crate::domain::Auditoria {
                created_by: r.get(7)?,
                created_at: r.get(8)?,
                updated_by: r.get(9)?,
                updated_at: r.get(10)?,
            },
        })
    })?;
    rows.next().transpose().map_err(AppError::from)
}

/// `numero`/`producto_id` no se editan (definen la identidad del lote).
pub fn editar_lote(
    conn: &Connection,
    id: &str,
    cambios: &EditarLote,
    actor: &str,
) -> AppResult<Lote> {
    puede(conn, Some(actor), "lote", "editar")?;
    let actual =
        obtener_lote(conn, id)?.ok_or_else(|| AppError::NoEncontrado("lote", id.to_string()))?;
    let producto = obtener_producto(conn, &actual.producto_id)?
        .ok_or_else(|| AppError::NoEncontrado("producto", actual.producto_id.clone()))?;
    let mut fecha_fabricacion = cambios
        .fecha_fabricacion
        .clone()
        .or(actual.fecha_fabricacion);
    let mut fecha_vencimiento = cambios
        .fecha_vencimiento
        .clone()
        .or(actual.fecha_vencimiento);
    if producto.controla_vencimiento && fecha_vencimiento.is_none() {
        return Err(AppError::CampoRequerido("fecha_vencimiento".into()));
    }
    fecha_fabricacion = fecha_fabricacion.map(|s| s[..10.min(s.len())].to_string());
    fecha_vencimiento = fecha_vencimiento.map(|s| s[..10.min(s.len())].to_string());
    let origen = cambios.origen.clone().or(actual.origen);
    let notas = cambios.notas.clone().or(actual.notas);
    let ts = ahora();
    conn.execute(
        "UPDATE lotes SET fecha_fabricacion = ?2, fecha_vencimiento = ?3, origen = ?4, notas = ?5, updated_at = ?6, updated_by = ?7 WHERE id = ?1",
        rusqlite::params![id, fecha_fabricacion, fecha_vencimiento, origen, notas, ts, actor],
    )?;
    crate::domain::seguridad::EventoAuditoria::registrar(
        conn,
        Some(actor),
        "editar",
        "lote",
        Some(id),
        None,
        None,
        None,
    )?;
    Ok(obtener_lote(conn, id)?.expect("existe"))
}

#[allow(unused)]
fn _usar_tipo(_: TipoUbicacion) {}
