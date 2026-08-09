use rusqlite::Connection;
use uuid::Uuid;

use crate::domain::catalogo::*;
use crate::domain::{TipoUbicacion, ahora};
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

pub fn listar_almacenes(conn: &Connection) -> AppResult<Vec<Almacen>> {
    let mut stmt = conn.prepare(
        "SELECT id, codigo, nombre, descripcion, direccion, activo,
                created_by, created_at, updated_by, updated_at
         FROM almacenes ORDER BY codigo",
    )?;
    let rows = stmt
        .query_map([], |r| {
            Ok(Almacen {
                id: r.get(0)?,
                codigo: r.get(1)?,
                nombre: r.get(2)?,
                descripcion: r.get(3)?,
                direccion: r.get(4)?,
                activo: r.get::<_, i64>(5)? != 0,
                auditoria: crate::domain::Auditoria {
                    created_by: r.get(6)?,
                    created_at: r.get(7)?,
                    updated_by: r.get(8)?,
                    updated_at: r.get(9)?,
                },
            })
        })?
        .collect::<Result<Vec<_>, _>>()?;
    Ok(rows)
}

pub fn obtener_almacen(conn: &Connection, id: &str) -> AppResult<Option<Almacen>> {
    let mut stmt = conn.prepare(
        "SELECT id, codigo, nombre, descripcion, direccion, activo,
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
            auditoria: crate::domain::Auditoria {
                created_by: r.get(6)?,
                created_at: r.get(7)?,
                updated_by: r.get(8)?,
                updated_at: r.get(9)?,
            },
        })
    })?;
    rows.next().transpose().map_err(AppError::from)
}

/// Borrado lógico (SPEC §14.5). Un almacén inactivo no admite movimientos.
#[allow(dead_code)]
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
    Ok(obtener_zona(conn, &id)?.expect("recién insertada"))
}

pub fn listar_zonas(conn: &Connection, almacen_id: Option<&str>) -> AppResult<Vec<Zona>> {
    let mut stmt = conn.prepare(
        "SELECT id, codigo, nombre, descripcion, almacen_id, activo,
                created_by, created_at, updated_by, updated_at
         FROM zonas
         WHERE (?1 IS NULL OR almacen_id = ?1)
         ORDER BY codigo",
    )?;
    let rows = stmt
        .query_map([almacen_id], |r| {
            Ok(Zona {
                id: r.get(0)?,
                codigo: r.get(1)?,
                nombre: r.get(2)?,
                descripcion: r.get(3)?,
                almacen_id: r.get(4)?,
                activo: r.get::<_, i64>(5)? != 0,
                auditoria: crate::domain::Auditoria {
                    created_by: r.get(6)?,
                    created_at: r.get(7)?,
                    updated_by: r.get(8)?,
                    updated_at: r.get(9)?,
                },
            })
        })?
        .collect::<Result<Vec<_>, _>>()?;
    Ok(rows)
}

pub fn obtener_zona(conn: &Connection, id: &str) -> AppResult<Option<Zona>> {
    let mut stmt = conn.prepare(
        "SELECT id, codigo, nombre, descripcion, almacen_id, activo,
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
            auditoria: crate::domain::Auditoria {
                created_by: r.get(6)?,
                created_at: r.get(7)?,
                updated_by: r.get(8)?,
                updated_at: r.get(9)?,
            },
        })
    })?;
    rows.next().transpose().map_err(AppError::from)
}

// ============ Rack (SPEC §3.3) ============

pub fn crear_rack(conn: &Connection, nuevo: &NuevoRack) -> AppResult<Rack> {
    puede(conn, nuevo.created_by.as_deref(), "rack", "crear")?;
    verificar_activo(conn, "zonas", &nuevo.zona_id, "zona")?;
    let id = Uuid::new_v4().to_string();
    let codigo = crate::domain::normalizar_codigo(&nuevo.codigo);
    let ts = ahora();
    let existe: i64 = conn.query_row(
        "SELECT COUNT(*) FROM racks WHERE zona_id = ?1 AND codigo = ?2",
        rusqlite::params![nuevo.zona_id, codigo],
        |r| r.get(0),
    )?;
    if existe > 0 {
        return Err(AppError::CodigoDuplicado(codigo));
    }
    conn.execute(
        "INSERT INTO racks (id, codigo, nombre, tipo, zona_id, activo, created_at, updated_at, created_by, updated_by)
         VALUES (?1, ?2, ?3, ?4, ?5, 1, ?6, ?7, ?8, ?8)",
        rusqlite::params![id, codigo, nuevo.nombre, nuevo.tipo, nuevo.zona_id, ts, ts, nuevo.created_by],
    )?;
    Ok(obtener_rack(conn, &id)?.expect("recién insertado"))
}

pub fn listar_racks(conn: &Connection, zona_id: Option<&str>) -> AppResult<Vec<Rack>> {
    let mut stmt = conn.prepare(
        "SELECT id, codigo, nombre, tipo, zona_id, activo,
                created_by, created_at, updated_by, updated_at
         FROM racks
         WHERE (?1 IS NULL OR zona_id = ?1)
         ORDER BY codigo",
    )?;
    let rows = stmt
        .query_map([zona_id], |r| {
            Ok(Rack {
                id: r.get(0)?,
                codigo: r.get(1)?,
                nombre: r.get(2)?,
                tipo: r.get(3)?,
                zona_id: r.get(4)?,
                activo: r.get::<_, i64>(5)? != 0,
                auditoria: crate::domain::Auditoria {
                    created_by: r.get(6)?,
                    created_at: r.get(7)?,
                    updated_by: r.get(8)?,
                    updated_at: r.get(9)?,
                },
            })
        })?
        .collect::<Result<Vec<_>, _>>()?;
    Ok(rows)
}

pub fn obtener_rack(conn: &Connection, id: &str) -> AppResult<Option<Rack>> {
    let mut stmt = conn.prepare(
        "SELECT id, codigo, nombre, tipo, zona_id, activo,
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
            activo: r.get::<_, i64>(5)? != 0,
            auditoria: crate::domain::Auditoria {
                created_by: r.get(6)?,
                created_at: r.get(7)?,
                updated_by: r.get(8)?,
                updated_at: r.get(9)?,
            },
        })
    })?;
    rows.next().transpose().map_err(AppError::from)
}

// ============ Sección (SPEC §3.4) ============

pub fn crear_seccion(conn: &Connection, nuevo: &NuevaSeccion) -> AppResult<Seccion> {
    puede(conn, nuevo.created_by.as_deref(), "seccion", "crear")?;
    verificar_activo(conn, "racks", &nuevo.rack_id, "rack")?;
    let id = Uuid::new_v4().to_string();
    let codigo = crate::domain::normalizar_codigo(&nuevo.codigo);
    let ts = ahora();
    let existe: i64 = conn.query_row(
        "SELECT COUNT(*) FROM secciones WHERE rack_id = ?1 AND codigo = ?2",
        rusqlite::params![nuevo.rack_id, codigo],
        |r| r.get(0),
    )?;
    if existe > 0 {
        return Err(AppError::CodigoDuplicado(codigo));
    }
    conn.execute(
        "INSERT INTO secciones (id, codigo, nombre, nivel, rack_id, descripcion, activo, created_at, updated_at, created_by, updated_by)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, 1, ?7, ?8, ?9, ?9)",
        rusqlite::params![
            id, codigo, nuevo.nombre, nuevo.nivel, nuevo.rack_id, nuevo.descripcion, ts, ts, nuevo.created_by
        ],
    )?;
    Ok(obtener_seccion(conn, &id)?.expect("recién insertada"))
}

pub fn listar_secciones(conn: &Connection, rack_id: Option<&str>) -> AppResult<Vec<Seccion>> {
    let mut stmt = conn.prepare(
        "SELECT id, codigo, nombre, nivel, rack_id, descripcion, activo,
                created_by, created_at, updated_by, updated_at
         FROM secciones
         WHERE (?1 IS NULL OR rack_id = ?1)
         ORDER BY codigo",
    )?;
    let rows = stmt
        .query_map([rack_id], |r| {
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
        })?
        .collect::<Result<Vec<_>, _>>()?;
    Ok(rows)
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

// ============ Ubicación (SPEC §3.5) ============

pub fn crear_ubicacion(conn: &Connection, nuevo: &NuevaUbicacion) -> AppResult<Ubicacion> {
    puede(conn, nuevo.created_by.as_deref(), "ubicacion", "crear")?;
    verificar_activo(conn, "secciones", &nuevo.seccion_id, "sección")?;
    let id = Uuid::new_v4().to_string();
    let codigo = crate::domain::normalizar_codigo(&nuevo.codigo);
    let tipo = nuevo.tipo()?.as_str().to_string();
    let ts = ahora();
    let existe: i64 = conn.query_row(
        "SELECT COUNT(*) FROM ubicaciones WHERE seccion_id = ?1 AND codigo = ?2",
        rusqlite::params![nuevo.seccion_id, codigo],
        |r| r.get(0),
    )?;
    if existe > 0 {
        return Err(AppError::CodigoDuplicado(codigo));
    }
    conn.execute(
        "INSERT INTO ubicaciones (id, codigo, nombre, seccion_id, tipo, capacidad_maxima, activo, created_at, updated_at, created_by, updated_by)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, 1, ?7, ?8, ?9, ?9)",
        rusqlite::params![
            id, codigo, nuevo.nombre, nuevo.seccion_id, tipo, nuevo.capacidad_maxima, ts, ts, nuevo.created_by
        ],
    )?;
    Ok(obtener_ubicacion(conn, &id)?.expect("recién insertada"))
}

pub fn listar_ubicaciones(
    conn: &Connection,
    seccion_id: Option<&str>,
    tipo: Option<TipoUbicacion>,
) -> AppResult<Vec<Ubicacion>> {
    let mut stmt = conn.prepare(
        "SELECT id, codigo, nombre, seccion_id, tipo, capacidad_maxima, activo,
                created_by, created_at, updated_by, updated_at
         FROM ubicaciones
         WHERE (?1 IS NULL OR seccion_id = ?1)
           AND (?2 IS NULL OR tipo = ?2)
         ORDER BY codigo",
    )?;
    let tipo_str = tipo.map(|t| t.as_str().to_string());
    let rows = stmt
        .query_map(rusqlite::params![seccion_id, tipo_str], |r| {
            Ok(Ubicacion {
                id: r.get(0)?,
                codigo: r.get(1)?,
                nombre: r.get(2)?,
                seccion_id: r.get(3)?,
                tipo: r.get(4)?,
                capacidad_maxima: r.get(5)?,
                activo: r.get::<_, i64>(6)? != 0,
                auditoria: crate::domain::Auditoria {
                    created_by: r.get(7)?,
                    created_at: r.get(8)?,
                    updated_by: r.get(9)?,
                    updated_at: r.get(10)?,
                },
            })
        })?
        .collect::<Result<Vec<_>, _>>()?;
    Ok(rows)
}

pub fn obtener_ubicacion(conn: &Connection, id: &str) -> AppResult<Option<Ubicacion>> {
    let mut stmt = conn.prepare(
        "SELECT id, codigo, nombre, seccion_id, tipo, capacidad_maxima, activo,
                created_by, created_at, updated_by, updated_at
         FROM ubicaciones WHERE id = ?1",
    )?;
    let mut rows = stmt.query_map([id], |r| {
        Ok(Ubicacion {
            id: r.get(0)?,
            codigo: r.get(1)?,
            nombre: r.get(2)?,
            seccion_id: r.get(3)?,
            tipo: r.get(4)?,
            capacidad_maxima: r.get(5)?,
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
    Ok(())
}

// ============ Caja (SPEC §3.6) ============

pub fn crear_caja(conn: &Connection, nuevo: &NuevaCaja) -> AppResult<Caja> {
    puede(conn, nuevo.created_by.as_deref(), "caja", "crear")?;
    verificar_activo(conn, "ubicaciones", &nuevo.ubicacion_id, "ubicación")?;
    let id = Uuid::new_v4().to_string();
    let codigo = crate::domain::normalizar_codigo(&nuevo.codigo);
    let ts = ahora();
    let existe: i64 = conn.query_row(
        "SELECT COUNT(*) FROM cajas WHERE ubicacion_id = ?1 AND codigo = ?2",
        rusqlite::params![nuevo.ubicacion_id, codigo],
        |r| r.get(0),
    )?;
    if existe > 0 {
        return Err(AppError::CodigoDuplicado(codigo));
    }
    conn.execute(
        "INSERT INTO cajas (id, codigo, nombre, ubicacion_id, producto_id, lote_id, etiqueta, activo, created_at, updated_at, created_by, updated_by)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, 1, ?8, ?9, ?10, ?10)",
        rusqlite::params![
            id, codigo, nuevo.nombre, nuevo.ubicacion_id, nuevo.producto_id, nuevo.lote_id, nuevo.etiqueta, ts, ts, nuevo.created_by
        ],
    )?;
    Ok(obtener_caja(conn, &id)?.expect("recién insertada"))
}

pub fn listar_cajas(conn: &Connection, ubicacion_id: Option<&str>) -> AppResult<Vec<Caja>> {
    let mut stmt = conn.prepare(
        "SELECT id, codigo, nombre, ubicacion_id, producto_id, lote_id, etiqueta, activo,
                created_by, created_at, updated_by, updated_at
         FROM cajas
         WHERE (?1 IS NULL OR ubicacion_id = ?1)
         ORDER BY codigo",
    )?;
    let rows = stmt
        .query_map([ubicacion_id], |r| {
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
        })?
        .collect::<Result<Vec<_>, _>>()?;
    Ok(rows)
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
    Ok(obtener_categoria(conn, &id)?.expect("recién insertada"))
}

pub fn listar_categorias(conn: &Connection) -> AppResult<Vec<Categoria>> {
    let mut stmt = conn.prepare(
        "SELECT id, nombre, parent_id, descripcion, activo,
                created_by, created_at, updated_by, updated_at
         FROM categorias ORDER BY nombre",
    )?;
    let rows = stmt
        .query_map([], |r| {
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
        })?
        .collect::<Result<Vec<_>, _>>()?;
    Ok(rows)
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

// ============ UOM (SPEC §3.9) ============

pub fn crear_uom(conn: &Connection, nuevo: &NuevaUom) -> AppResult<Uom> {
    puede(conn, None, "uom", "crear")?;
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
    Ok(obtener_uom(conn, &id)?.expect("recién insertada"))
}

pub fn listar_uoms(conn: &Connection) -> AppResult<Vec<Uom>> {
    let mut stmt = conn.prepare(
        "SELECT id, codigo, nombre, tipo, factor, base, created_at, updated_at
         FROM uoms ORDER BY codigo",
    )?;
    let rows = stmt
        .query_map([], |r| {
            Ok(Uom {
                id: r.get(0)?,
                codigo: r.get(1)?,
                nombre: r.get(2)?,
                tipo: r.get(3)?,
                factor: r.get(4)?,
                base: r.get::<_, i64>(5)? != 0,
                created_at: r.get(6)?,
                updated_at: r.get(7)?,
            })
        })?
        .collect::<Result<Vec<_>, _>>()?;
    Ok(rows)
}

pub fn obtener_uom(conn: &Connection, id: &str) -> AppResult<Option<Uom>> {
    let mut stmt = conn.prepare(
        "SELECT id, codigo, nombre, tipo, factor, base, created_at, updated_at
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
            created_at: r.get(6)?,
            updated_at: r.get(7)?,
        })
    })?;
    rows.next().transpose().map_err(AppError::from)
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
    Ok(obtener_proveedor(conn, &id)?.expect("recién insertado"))
}

pub fn listar_proveedores(conn: &Connection) -> AppResult<Vec<Proveedor>> {
    let mut stmt = conn.prepare(
        "SELECT id, codigo, nombre, contacto_nombre, contacto_telefono, contacto_email, direccion, activo,
                created_by, created_at, updated_by, updated_at
         FROM proveedores ORDER BY codigo",
    )?;
    let rows = stmt
        .query_map([], |r| {
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
        })?
        .collect::<Result<Vec<_>, _>>()?;
    Ok(rows)
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
    Ok(obtener_cliente(conn, &id)?.expect("recién insertado"))
}

pub fn listar_clientes(conn: &Connection) -> AppResult<Vec<Cliente>> {
    let mut stmt = conn.prepare(
        "SELECT id, codigo, nombre, contacto_nombre, contacto_telefono, contacto_email, direccion, activo,
                created_by, created_at, updated_by, updated_at
         FROM clientes ORDER BY codigo",
    )?;
    let rows = stmt
        .query_map([], |r| {
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
        })?
        .collect::<Result<Vec<_>, _>>()?;
    Ok(rows)
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

// ============ Producto (SPEC §3.7) ============

pub fn crear_producto(conn: &Connection, nuevo: &NuevoProducto) -> AppResult<Producto> {
    nuevo.validar()?;
    puede(conn, nuevo.created_by.as_deref(), "producto", "crear")?;
    // La UOM no tiene `activo` (SPEC §3.9): solo se valida existencia.
    let uom_existe: i64 = conn.query_row(
        "SELECT COUNT(*) FROM uoms WHERE id = ?1",
        [&nuevo.uom_base_id],
        |r| r.get(0),
    )?;
    if uom_existe == 0 {
        return Err(AppError::NoEncontrado("uom", nuevo.uom_base_id.clone()));
    }
    let id = Uuid::new_v4().to_string();
    let sku = nuevo.sku_normalizado();
    let ts = ahora();
    conn.execute(
        "INSERT INTO productos (id, sku, nombre, descripcion, categoria_id, uom_base_id, uom_venta_id, uom_compra_id,
                codigo_barras, peso_unitario, volumen_unitario, stock_minimo, stock_maximo,
                controla_lote, controla_vencimiento, perecedero, activo, created_at, updated_at, created_by, updated_by)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14, ?15, ?16, 1, ?17, ?18, ?19, ?19)",
        rusqlite::params![
            id, sku, nuevo.nombre.trim(), nuevo.descripcion, nuevo.categoria_id, nuevo.uom_base_id,
            nuevo.uom_venta_id, nuevo.uom_compra_id, nuevo.codigo_barras, nuevo.peso_unitario,
            nuevo.volumen_unitario, nuevo.stock_minimo, nuevo.stock_maximo,
            nuevo.controla_lote as i64, nuevo.controla_vencimiento as i64, nuevo.perecedero as i64,
            ts, ts, nuevo.created_by
        ],
    )
    .map_err(|_| AppError::CodigoDuplicado(sku))?;
    Ok(obtener_producto(conn, &id)?.expect("recién insertado"))
}

pub fn listar_productos(conn: &Connection) -> AppResult<Vec<Producto>> {
    let mut stmt = conn.prepare(
        "SELECT id, sku, nombre, descripcion, categoria_id, uom_base_id, uom_venta_id, uom_compra_id,
                codigo_barras, peso_unitario, volumen_unitario, stock_minimo, stock_maximo,
                controla_lote, controla_vencimiento, perecedero, activo,
                created_by, created_at, updated_by, updated_at
         FROM productos ORDER BY sku",
    )?;
    let rows = stmt
        .query_map([], map_producto)?
        .collect::<Result<Vec<_>, _>>()?;
    Ok(rows)
}

pub fn obtener_producto(conn: &Connection, id: &str) -> AppResult<Option<Producto>> {
    let mut stmt = conn.prepare(
        "SELECT id, sku, nombre, descripcion, categoria_id, uom_base_id, uom_venta_id, uom_compra_id,
                codigo_barras, peso_unitario, volumen_unitario, stock_minimo, stock_maximo,
                controla_lote, controla_vencimiento, perecedero, activo,
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
        activo: r.get::<_, i64>(16)? != 0,
        auditoria: crate::domain::Auditoria {
            created_by: r.get(17)?,
            created_at: r.get(18)?,
            updated_by: r.get(19)?,
            updated_at: r.get(20)?,
        },
    })
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
    let id = Uuid::new_v4().to_string();
    let ts = ahora();
    let numero = nuevo.numero.trim();
    conn.execute(
        "INSERT INTO lotes (id, numero, producto_id, fecha_fabricacion, fecha_vencimiento, origen, notas, created_at, updated_at, created_by, updated_by)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?10)",
        rusqlite::params![
            id, numero, nuevo.producto_id, nuevo.fecha_fabricacion, nuevo.fecha_vencimiento,
            nuevo.origen, nuevo.notas, ts, ts, nuevo.created_by
        ],
    )
    .map_err(|_| AppError::CodigoDuplicado(numero.to_string()))?;
    Ok(obtener_lote(conn, &id)?.expect("recién insertado"))
}

pub fn listar_lotes(conn: &Connection, producto_id: Option<&str>) -> AppResult<Vec<Lote>> {
    let mut stmt = conn.prepare(
        "SELECT id, numero, producto_id, fecha_fabricacion, fecha_vencimiento, origen, notas,
                created_by, created_at, updated_by, updated_at
         FROM lotes
         WHERE (?1 IS NULL OR producto_id = ?1)
         ORDER BY COALESCE(fecha_vencimiento, fecha_fabricacion, created_at)",
    )?;
    let rows = stmt
        .query_map([producto_id], |r| {
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
        })?
        .collect::<Result<Vec<_>, _>>()?;
    Ok(rows)
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

#[allow(unused)]
fn _usar_tipo(_: TipoUbicacion) {}
