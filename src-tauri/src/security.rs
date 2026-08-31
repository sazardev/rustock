use rusqlite::Connection;

use crate::domain::seguridad::RolSistema;
use crate::error::{AppError, AppResult};

/// Catálogo de todos los permisos que el sistema comprueba.
///
/// Es la lista que la interfaz consulta para saber qué ofrecer y qué no. Vive
/// aquí, pegada a la matriz, y no en el frontend, porque quien decide qué
/// existe es el backend (STACK §1); la interfaz solo pregunta.
///
/// Un test recorre el código fuente y comprueba que todo `puede(...)` usa un
/// par de esta lista: si alguien añade una comprobación nueva y olvida
/// declararla aquí, la interfaz nunca sabría de ella y ofrecería un botón que
/// el backend rechaza. El test falla antes de que eso llegue a nadie.
pub const PERMISOS: &[(&str, &[&str])] = &[
    ("ajuste", &["crear", "aprobar", "anular"]),
    ("alerta", &["ver"]),
    ("almacen", &["ver", "crear", "editar", "desactivar"]),
    ("caja", &["ver", "crear", "editar", "desactivar"]),
    ("categoria", &["ver", "crear", "editar", "desactivar"]),
    ("cliente", &["ver", "crear", "editar", "desactivar"]),
    ("comentario", &["crear", "eliminar"]),
    ("configuracion", &["ver", "editar", "ejecutar"]),
    ("entrada", &["crear", "aprobar", "anular"]),
    ("escaneo", &["ver", "usar"]),
    ("inventario", &["ver", "ejecutar", "cerrar", "anular"]),
    ("lote", &["ver", "crear", "editar"]),
    ("movimiento", &["ver", "crear", "aprobar", "anular"]),
    ("pasillo", &["ver", "crear", "editar", "desactivar"]),
    ("producto", &["ver", "crear", "editar", "desactivar"]),
    ("proveedor", &["ver", "crear", "editar", "desactivar"]),
    ("rack", &["ver", "crear", "editar", "desactivar"]),
    ("regla", &["ver", "crear", "editar", "eliminar"]),
    ("reporte", &["ver", "exportar"]),
    ("rol", &["ver", "editar"]),
    ("salida", &["crear", "aprobar", "anular"]),
    ("seccion", &["ver", "crear", "editar", "desactivar"]),
    ("traslado", &["crear", "aprobar", "anular"]),
    ("ubicacion", &["ver", "crear", "editar", "desactivar"]),
    ("uom", &["ver", "crear", "editar", "desactivar"]),
    ("usuario", &["ver", "crear", "editar"]),
    ("zona", &["ver", "crear", "editar", "desactivar"]),
];

/// Todos los permisos que este usuario tiene, como `"recurso:accion"`.
///
/// Una sola llamada en vez de una por botón: la interfaz pregunta al entrar y
/// se guarda la respuesta. **No sustituye a la comprobación real** — cada
/// operación vuelve a pasar por `puede`, porque un cliente puede mentir sobre
/// lo que se le dijo. Esto solo sirve para no ofrecer lo que se va a negar.
pub fn permisos_de(conn: &Connection, usuario_id: &str) -> AppResult<Vec<String>> {
    let mut concedidos = Vec::new();
    for (recurso, acciones) in PERMISOS {
        for accion in *acciones {
            match puede(conn, Some(usuario_id), recurso, accion) {
                Ok(()) => concedidos.push(format!("{recurso}:{accion}")),
                Err(AppError::SinPermiso(_)) => {}
                // Sesión inválida o usuario desactivado: no es «no puede esto»
                // sino «no puede nada», y quien pregunta debe enterarse.
                Err(e) => return Err(e),
            }
        }
    }
    Ok(concedidos)
}

/// Matriz de permisos por defecto (SPEC §4.4).
/// fila = rol, columna = (recurso, accion). El ADMIN siempre puede todo.
pub fn puede(
    conn: &Connection,
    usuario_id: Option<&str>,
    recurso: &str,
    accion: &str,
) -> AppResult<()> {
    // No hay bypass: toda acción exige un usuario autenticado y activo. El
    // único camino sin sesión es el bootstrap del primer ADMIN, que nunca pasa
    // por esta función (ver `repo::seguridad::bootstrap_admin`).
    let Some(usuario_id) = usuario_id else {
        return Err(AppError::NoAutenticado);
    };

    let rol_codigo: String = conn
        .query_row(
            "SELECT r.codigo
             FROM usuarios u JOIN roles r ON r.id = u.rol_id
             WHERE (u.id = ?1 OR u.nombre_usuario = ?1) AND u.activo = 1",
            [usuario_id],
            |r| r.get(0),
        )
        // Usuario inexistente/inactivo (p. ej. desactivado tras iniciar sesión):
        // se trata como sesión inválida, nunca como error interno.
        .map_err(|_| AppError::NoAutenticado)?;

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

fn lector(recurso: &str, accion: &str) -> bool {
    // El registro de escaneos es auditoría, no catálogo: un LECTOR ve datos de
    // negocio, no quién escaneó qué. Y `escaneo:usar` es una acción de piso,
    // así que tampoco le corresponde — un intento suyo queda registrado como
    // DENEGADO, que es justo la señal que interesa vigilar (SPEC §14.3).
    if recurso == "escaneo" {
        return false;
    }
    accion == "ver"
}

fn operador(recurso: &str, accion: &str) -> bool {
    match (recurso, accion) {
        // El escáner es la herramienta del operador en el piso del almacén,
        // pero su registro es auditoría: se deniega explícitamente porque el
        // `_ => accion == "ver"` de abajo lo concedería sin querer.
        ("escaneo", "usar") => true,
        ("escaneo", _) => false,
        ("movimiento", "crear") => true,
        ("entrada", "crear") => true,
        ("salida", "crear") => true,
        ("traslado", "crear") => true,
        ("inventario", "ejecutar") => true,
        ("comentario", "crear") => true,
        ("reporte", "ver") | ("reporte", "exportar") => true,
        // SPEC §4.4: "Exportar reportes" es ✔ para todos salvo LECTOR — se
        // aplica por recurso (§4.3: `exportar` se exige de forma
        // independiente de `ver`), no solo al recurso `reporte`.
        _ => accion == "ver" || accion == "exportar",
    }
}

fn encargado(recurso: &str, accion: &str) -> bool {
    match (recurso, accion) {
        // Igual que el operador: usa el escáner, no audita su registro.
        ("escaneo", "usar") => true,
        ("escaneo", _) => false,
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
        _ => accion == "ver" || accion == "exportar",
    }
}

fn gerente(recurso: &str, accion: &str) -> bool {
    match (recurso, accion) {
        // El gerente además audita: `escaneo:ver` abre el registro de eventos,
        // que es dato de auditoría y no de operación.
        ("escaneo", "usar") | ("escaneo", "ver") => true,
        // Las reglas de negocio las define quien responde de la operación.
        ("regla", "crear") | ("regla", "editar") | ("regla", "eliminar") => true,
        ("movimiento", "crear") | ("movimiento", "aprobar") | ("movimiento", "anular") => true,
        ("entrada", "crear") | ("entrada", "aprobar") | ("entrada", "anular") => true,
        ("salida", "crear") | ("salida", "aprobar") | ("salida", "anular") => true,
        ("traslado", "crear") | ("traslado", "aprobar") | ("traslado", "anular") => true,
        ("ajuste", "crear") | ("ajuste", "aprobar") | ("ajuste", "anular") => true,
        ("inventario", "ejecutar") | ("inventario", "cerrar") | ("inventario", "anular") => true,
        ("comentario", "crear") | ("comentario", "eliminar") => true,
        ("reporte", "ver") | ("reporte", "exportar") => true,
        ("producto", "crear") | ("producto", "editar") | ("producto", "desactivar") => true,
        ("proveedor", "crear") | ("proveedor", "editar") | ("proveedor", "desactivar") => true,
        ("cliente", "crear") | ("cliente", "editar") | ("cliente", "desactivar") => true,
        ("categoria", "crear") | ("categoria", "editar") | ("categoria", "desactivar") => true,
        ("uom", "crear") | ("uom", "editar") | ("uom", "desactivar") => true,
        ("almacen", "crear") | ("almacen", "editar") | ("almacen", "desactivar") => true,
        ("zona", "crear") | ("zona", "editar") | ("zona", "desactivar") => true,
        ("pasillo", "crear") | ("pasillo", "editar") | ("pasillo", "desactivar") => true,
        ("rack", "crear") | ("rack", "editar") | ("rack", "desactivar") => true,
        ("seccion", "crear") | ("seccion", "editar") | ("seccion", "desactivar") => true,
        ("ubicacion", "crear") | ("ubicacion", "editar") | ("ubicacion", "desactivar") => true,
        ("caja", "crear") | ("caja", "editar") | ("caja", "desactivar") => true,
        ("lote", "crear") | ("lote", "editar") => true,
        _ => accion == "ver" || accion == "exportar",
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
        R::Escaneo,
        R::Regla,
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
        A::Usar,
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
