use rusqlite::Connection;

use crate::domain::seguridad::RolSistema;
use crate::error::{AppError, AppResult};

/// Matriz de permisos por defecto (SPEC §4.4).
/// fila = rol, columna = (recurso, accion). El ADMIN siempre puede todo.
pub fn puede(
    conn: &Connection,
    usuario_id: Option<&str>,
    recurso: &str,
    accion: &str,
) -> AppResult<()> {
    let Some(usuario_id) = usuario_id else {
        // Bootstrap: sin usuario aún se permite (primera configuración).
        return Ok(());
    };

    let rol_codigo: String = conn.query_row(
        "SELECT r.codigo
         FROM usuarios u JOIN roles r ON r.id = u.rol_id
         WHERE (u.id = ?1 OR u.nombre_usuario = ?1) AND u.activo = 1",
        [usuario_id],
        |r| r.get(0),
    )?;

    if rol_codigo == RolSistema::Admin.codigo() {
        return Ok(());
    }

    let permiso = match rol_codigo.as_str() {
        "GERENTE" => gerente(recurso, accion),
        "ENCARGADO_ALMACEN" => encargado(recurso, accion),
        "OPERADOR" => operador(recurso, accion),
        "LECTOR" => lector(recurso, accion),
        _ => false,
    };

    if permiso {
        Ok(())
    } else {
        Err(AppError::SinPermiso(format!("{recurso}:{accion}")))
    }
}

fn lector(_recurso: &str, accion: &str) -> bool {
    accion == "ver"
}

fn operador(recurso: &str, accion: &str) -> bool {
    match (recurso, accion) {
        ("movimiento", "crear") => true,
        ("entrada", "crear") => true,
        ("salida", "crear") => true,
        ("traslado", "crear") => true,
        ("inventario", "ejecutar") => true,
        ("comentario", "crear") => true,
        ("reporte", "ver") | ("reporte", "exportar") => true,
        _ => accion == "ver",
    }
}

fn encargado(recurso: &str, accion: &str) -> bool {
    match (recurso, accion) {
        ("movimiento", "crear") | ("movimiento", "aprobar") => true,
        ("entrada", "crear") | ("entrada", "aprobar") => true,
        ("salida", "crear") | ("salida", "aprobar") => true,
        ("traslado", "crear") | ("traslado", "aprobar") => true,
        ("ajuste", "crear") => true,
        ("inventario", "ejecutar") => true,
        ("comentario", "crear") => true,
        ("reporte", "ver") | ("reporte", "exportar") => true,
        ("producto", "crear") | ("producto", "editar") => true,
        ("proveedor", "crear") | ("proveedor", "editar") => true,
        ("cliente", "crear") | ("cliente", "editar") => true,
        ("categoria", "crear") | ("categoria", "editar") => true,
        ("uom", "crear") | ("uom", "editar") => true,
        _ => accion == "ver",
    }
}

fn gerente(recurso: &str, accion: &str) -> bool {
    match (recurso, accion) {
        ("movimiento", "crear") | ("movimiento", "aprobar") | ("movimiento", "anular") => true,
        ("entrada", "crear") | ("entrada", "aprobar") | ("entrada", "anular") => true,
        ("salida", "crear") | ("salida", "aprobar") | ("salida", "anular") => true,
        ("traslado", "crear") | ("traslado", "aprobar") | ("traslado", "anular") => true,
        ("ajuste", "crear") | ("ajuste", "aprobar") | ("ajuste", "anular") => true,
        ("inventario", "ejecutar") | ("inventario", "cerrar") => true,
        ("comentario", "crear") => true,
        ("reporte", "ver") | ("reporte", "exportar") => true,
        ("producto", "crear") | ("producto", "editar") | ("producto", "desactivar") => true,
        ("proveedor", "crear") | ("proveedor", "editar") | ("proveedor", "desactivar") => true,
        ("cliente", "crear") | ("cliente", "editar") | ("cliente", "desactivar") => true,
        ("categoria", "crear") | ("categoria", "editar") | ("categoria", "desactivar") => true,
        ("uom", "crear") | ("uom", "editar") | ("uom", "desactivar") => true,
        ("almacen", "crear") | ("almacen", "editar") | ("almacen", "desactivar") => true,
        ("zona", "crear") | ("zona", "editar") | ("zona", "desactivar") => true,
        ("rack", "crear") | ("rack", "editar") | ("rack", "desactivar") => true,
        ("seccion", "crear") | ("seccion", "editar") | ("seccion", "desactivar") => true,
        ("ubicacion", "crear") | ("ubicacion", "editar") | ("ubicacion", "desactivar") => true,
        ("caja", "crear") | ("caja", "editar") | ("caja", "desactivar") => true,
        ("lote", "crear") | ("lote", "editar") => true,
        _ => accion == "ver",
    }
}

/// Inserta los roles por defecto y sus permisos (SPEC §4.2). Idempotente.
pub fn seed_roles(conn: &Connection) -> AppResult<()> {
    use crate::domain::ahora;
    use crate::domain::seguridad::{Accion as A, Recurso as R};
    use uuid::Uuid;

    let ts = ahora();
    {
        let n: i64 = conn.query_row("SELECT COUNT(*) FROM roles", [], |r| r.get(0))?;
        if n > 0 {
            return Ok(());
        }
    }

    for rol in RolSistema::ALL {
        let id = Uuid::new_v4().to_string();
        conn.execute(
            "INSERT INTO roles (id, codigo, descripcion, es_sistema, created_at, updated_at)
             VALUES (?1, ?2, ?3, 1, ?4, ?5)",
            rusqlite::params![id, rol.codigo(), rol.descripcion(), ts, ts],
        )?;
    }

    // Admin: todos los permisos posibles.
    let admin_id: String =
        conn.query_row("SELECT id FROM roles WHERE codigo = 'ADMIN'", [], |r| {
            r.get(0)
        })?;
    let recursos = [
        R::Almacen,
        R::Zona,
        R::Rack,
        R::Seccion,
        R::Ubicacion,
        R::Caja,
        R::Producto,
        R::Categoria,
        R::Uom,
        R::Proveedor,
        R::Cliente,
        R::Lote,
        R::Usuario,
        R::Rol,
        R::Movimiento,
        R::Entrada,
        R::Salida,
        R::Traslado,
        R::Ajuste,
        R::Inventario,
        R::Comentario,
        R::Reporte,
        R::Configuracion,
    ];
    let acciones = [
        A::Ver,
        A::Crear,
        A::Editar,
        A::Eliminar,
        A::Desactivar,
        A::Aprobar,
        A::Anular,
        A::Exportar,
        A::Ejecutar,
        A::Cerrar,
        A::Asignar,
    ];
    for r in &recursos {
        for a in &acciones {
            let id = Uuid::new_v4().to_string();
            conn.execute(
                "INSERT INTO permisos (id, recurso, accion, rol_id) VALUES (?1, ?2, ?3, ?4)",
                rusqlite::params![id, r.as_str(), a.as_str(), admin_id],
            )?;
        }
    }
    Ok(())
}
