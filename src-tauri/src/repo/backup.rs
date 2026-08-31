//! Copias de seguridad de la base de datos (SPEC §14.5).
//!
//! En un WMS el histórico de movimientos *es* el activo: el stock actual se
//! puede recontar en una tarde, pero la trazabilidad de quién movió qué y
//! cuándo no se reconstruye. Por eso copiar no es una utilidad opcional sino
//! parte de la operación, y vive aquí dentro en vez de delegarse a un `cp`
//! que quien despliega tiene que acordarse de escribir.
//!
//! **Por qué la API de backup de SQLite y no copiar el fichero.** Con WAL
//! activo, el `.db` en disco no contiene por sí solo el estado completo: hay
//! transacciones confirmadas viviendo aún en el `-wal`. Copiar solo el `.db`
//! —o copiarlo mientras alguien escribe— produce un fichero que abre
//! perfectamente y le faltan los últimos movimientos, que es la peor forma de
//! fallo posible: silenciosa. La API `backup` de SQLite hace una copia
//! coherente con la base en uso, sin detener la operación.

use std::fs;
use std::path::{Path, PathBuf};

use rusqlite::Connection;
use serde::Serialize;

use crate::domain::ahora;
use crate::error::{AppError, AppResult};

/// Una copia existente en el directorio de copias.
#[derive(Debug, Clone, Serialize)]
pub struct Copia {
    /// Nombre del fichero, que es su identificador.
    pub nombre: String,
    pub ruta: String,
    pub bytes: u64,
    /// Fecha de creación en ISO-8601, tomada del nombre del fichero.
    pub creada_en: String,
}

/// Extensión de las copias. Se usa para reconocerlas al listar y al podar, de
/// modo que nada que no haya escrito Rustock se toque nunca.
const EXTENSION: &str = "rustock.db";
const PREFIJO: &str = "rustock-";

/// Crea una copia coherente de la base en `directorio` y devuelve su ficha.
///
/// El nombre lleva la marca de tiempo, así que ordenar por nombre es ordenar
/// por fecha y no hace falta consultar el sistema de ficheros para saber cuál
/// es la más reciente.
pub fn crear(conn: &Connection, directorio: &Path, retener: usize) -> AppResult<Copia> {
    fs::create_dir_all(directorio)
        .map_err(|e| AppError::Backup(format!("no se pudo crear {}: {e}", directorio.display())))?;

    let marca = ahora().replace(':', "-");
    let nombre = format!("{PREFIJO}{marca}.{EXTENSION}");
    let destino = directorio.join(&nombre);

    respaldar(conn, &destino)?;

    if retener > 0 {
        podar(directorio, retener)?;
    }
    ficha(&destino)
}

/// Vuelca la base abierta en `destino` usando la API de backup de SQLite.
fn respaldar(conn: &Connection, destino: &Path) -> AppResult<()> {
    let mut copia = Connection::open(destino)
        .map_err(|e| AppError::Backup(format!("no se pudo crear {}: {e}", destino.display())))?;
    let backup = rusqlite::backup::Backup::new(conn, &mut copia)
        .map_err(|e| AppError::Backup(format!("no se pudo iniciar la copia: {e}")))?;
    // Páginas por paso. `run_to_completion` repite hasta terminar; un paso
    // grande hace la copia en pocas vueltas sin bloquear a los escritores más
    // de lo imprescindible. (La API C admite -1 para «todas de golpe»;
    // rusqlite exige un número positivo.)
    const PAGINAS_POR_PASO: std::os::raw::c_int = 1024;
    backup
        .run_to_completion(PAGINAS_POR_PASO, std::time::Duration::from_millis(50), None)
        .map_err(|e| AppError::Backup(format!("la copia no se completó: {e}")))?;
    Ok(())
}

/// Lista las copias del directorio, de la más reciente a la más antigua.
pub fn listar(directorio: &Path) -> AppResult<Vec<Copia>> {
    if !directorio.exists() {
        return Ok(Vec::new());
    }
    let entradas = fs::read_dir(directorio)
        .map_err(|e| AppError::Backup(format!("no se pudo leer {}: {e}", directorio.display())))?;
    let mut copias: Vec<Copia> = entradas
        .flatten()
        .map(|e| e.path())
        .filter(|p| es_copia(p))
        .filter_map(|p| ficha(&p).ok())
        .collect();
    copias.sort_by(|a, b| b.nombre.cmp(&a.nombre));
    Ok(copias)
}

/// Restaura la base desde una copia, dejando antes una copia del estado actual.
///
/// Restaurar es destructivo por definición: sustituye los datos vivos. Por eso
/// se guarda primero lo que había — si la copia elegida resulta no ser la que
/// se creía, todavía hay marcha atrás.
///
/// No se puede aplicar en caliente sobre las conexiones abiertas, así que
/// devuelve la ruta del fichero restaurado y **exige reiniciar**: intentar
/// intercambiar el fichero bajo los pies de un pool de conexiones abiertas es
/// justo el tipo de listeza que corrompe una base.
pub fn restaurar(
    conn: &Connection,
    origen: &Path,
    destino_db: &Path,
    directorio_copias: &Path,
) -> AppResult<String> {
    if !origen.exists() {
        return Err(AppError::Backup(format!(
            "la copia {} no existe",
            origen.display()
        )));
    }
    verificar(origen)?;

    // Red de seguridad: el estado actual, antes de pisarlo.
    let previa = crear(conn, directorio_copias, 0)?;

    let pendiente = destino_db.with_extension("db.restaurar");
    fs::copy(origen, &pendiente)
        .map_err(|e| AppError::Backup(format!("no se pudo preparar la restauración: {e}")))?;

    Ok(format!(
        "Copia de seguridad del estado actual: {}. La restauración quedó preparada en {}; \
         detén Rustock y sustituye {} por ese fichero para completarla.",
        previa.nombre,
        pendiente.display(),
        destino_db.display()
    ))
}

/// Comprueba que el fichero es una base SQLite legible y con esquema de
/// Rustock. Restaurar sobre datos vivos un fichero que resulta no serlo sería
/// perder todo por un nombre mal escrito.
pub fn verificar(ruta: &Path) -> AppResult<()> {
    let conn = Connection::open(ruta)
        .map_err(|e| AppError::Backup(format!("{} no se puede abrir: {e}", ruta.display())))?;
    let tablas: i64 = conn
        .query_row(
            "SELECT COUNT(*) FROM sqlite_master
             WHERE type = 'table' AND name IN ('usuarios', 'roles', 'movimientos', 'saldos')",
            [],
            |r| r.get(0),
        )
        .map_err(|e| AppError::Backup(format!("{} no es legible: {e}", ruta.display())))?;
    if tablas < 4 {
        return Err(AppError::Backup(format!(
            "{} no parece una base de Rustock (faltan tablas del esquema)",
            ruta.display()
        )));
    }
    Ok(())
}

/// Borra las copias más antiguas hasta dejar `retener`.
fn podar(directorio: &Path, retener: usize) -> AppResult<()> {
    let copias = listar(directorio)?;
    for vieja in copias.into_iter().skip(retener) {
        // Un borrado que falla no invalida la copia recién hecha, que es lo
        // que importaba: se avisa y se sigue.
        if let Err(e) = fs::remove_file(&vieja.ruta) {
            eprintln!("[backup] no se pudo borrar {}: {e}", vieja.ruta);
        }
    }
    Ok(())
}

fn es_copia(ruta: &Path) -> bool {
    ruta.is_file()
        && ruta
            .file_name()
            .and_then(|n| n.to_str())
            .is_some_and(|n| n.starts_with(PREFIJO) && n.ends_with(EXTENSION))
}

fn ficha(ruta: &Path) -> AppResult<Copia> {
    let nombre = ruta
        .file_name()
        .and_then(|n| n.to_str())
        .unwrap_or_default()
        .to_string();
    let bytes = fs::metadata(ruta).map(|m| m.len()).unwrap_or(0);
    Ok(Copia {
        creada_en: fecha_de(&nombre),
        nombre,
        ruta: ruta.display().to_string(),
        bytes,
    })
}

/// Reconstruye el ISO-8601 a partir del nombre (se guardó con `-` en vez de
/// `:` porque los dos puntos no son válidos en todos los sistemas de ficheros).
fn fecha_de(nombre: &str) -> String {
    let marca = nombre
        .strip_prefix(PREFIJO)
        .and_then(|n| n.strip_suffix(&format!(".{EXTENSION}")))
        .unwrap_or_default();
    // `2026-08-31T02-15-30.123+00-00` -> `2026-08-31T02:15:30.123+00:00`.
    // Todo guion *después* de la T era un `:` (hora y desfase horario); los de
    // antes son los de la fecha y se quedan como están.
    match marca.split_once('T') {
        Some((dia, hora)) => format!("{dia}T{}", hora.replace('-', ":")),
        None => marca.to_string(),
    }
}

/// Ruta de una copia por su nombre, validando que no se salga del directorio.
///
/// El nombre llega desde la interfaz, así que se trata como entrada hostil: un
/// `../../etc/passwd` no puede convertirse en una ruta que se lea o se borre.
pub fn ruta_de(directorio: &Path, nombre: &str) -> AppResult<PathBuf> {
    if nombre.contains('/') || nombre.contains('\\') || nombre.contains("..") {
        return Err(AppError::Backup(format!(
            "nombre de copia inválido: «{nombre}»"
        )));
    }
    Ok(directorio.join(nombre))
}
