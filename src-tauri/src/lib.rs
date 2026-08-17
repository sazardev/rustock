mod buscar;
mod commands;
mod db;
mod domain;
mod error;
mod importar;
mod query;
mod repo;
mod security;
mod server;
mod sesion;

#[cfg(debug_assertions)]
mod seed;

#[cfg(test)]
mod tests;

use std::path::PathBuf;
use std::sync::Arc;

use tauri::Manager;

use db::DbState;
use security::seed_roles;
use sesion::SesionState;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .setup(|app| {
            // Ruta de la base de datos self-hosted junto al binario (o app data dir).
            let app_dir = app
                .path()
                .app_data_dir()
                .unwrap_or_else(|_| PathBuf::from("."));
            std::fs::create_dir_all(&app_dir)?;
            let db_path = app_dir.join("rustock.db");

            let db = DbState::init(&db_path)?;
            {
                let conn = db.conn();
                seed_roles(&conn)?;
                #[cfg(debug_assertions)]
                if std::env::var("RUSTOCK_SEED").is_ok_and(|v| v == "1") {
                    seed::sembrar_si_vacio(&conn)?;
                }
            }
            let sesion = Arc::new(SesionState::default());

            // Servidor HTTP local (127.0.0.1:1421): expone la misma lógica de
            // negocio para poder usar Rustock desde un navegador normal, sin
            // el puente IPC de la ventana de escritorio (ver src/server.rs).
            server::iniciar(db.clone(), sesion.clone());

            app.manage(db);
            app.manage(sesion);

            // RUSTOCK_HEADLESS=1: oculta la ventana nativa (sigue existiendo
            // e inicializando GTK/webkit, solo no se muestra en pantalla) —
            // pensado para probar/depurar exclusivamente vía el servidor
            // HTTP + un navegador, sin la ventana de escritorio de por medio.
            if std::env::var("RUSTOCK_HEADLESS").is_ok_and(|v| v == "1")
                && let Some(window) = app.get_webview_window("main")
            {
                let _ = window.hide();
            }

            Ok(())
        })
        .invoke_handler(commands::handler())
        .run(tauri::generate_context!())
        .expect("error while running rustock");
}

/// Ruta de la base de datos: `RUSTOCK_DB_PATH` si se define, si no la misma
/// app data dir que usa el modo escritorio (`~/.local/share/com.rustock.app/
/// rustock.db`, con `XDG_DATA_HOME` si está definida). Así el modo web y el
/// modo ventana comparten los mismos datos.
fn ruta_base_de_datos() -> PathBuf {
    if let Ok(p) = std::env::var("RUSTOCK_DB_PATH")
        && !p.is_empty()
    {
        return PathBuf::from(p);
    }
    let home = std::env::var("HOME").unwrap_or_else(|_| ".".into());
    let data_home =
        std::env::var("XDG_DATA_HOME").unwrap_or_else(|_| format!("{home}/.local/share"));
    PathBuf::from(data_home)
        .join("com.rustock.app")
        .join("rustock.db")
}

/// Modo navegador sin ventana (`RUSTOCK_WEB_ONLY=1`): arranca solo la capa de
/// datos + el servidor HTTP local (`server.rs`, `127.0.0.1:1421`) sin
/// inicializar GTK/WebKit ni crear ventana alguna. Pensado para entornos sin
/// servidor X/Wayland funcional (WSL, CI) donde la ventana nativa no puede
/// crearse y para el script `npm run tauri:web`. Misma lógica de negocio,
/// mismos permisos, misma sesión en memoria que el modo escritorio.
pub fn run_web() {
    let db_path = ruta_base_de_datos();
    if let Some(dir) = db_path.parent() {
        std::fs::create_dir_all(dir).expect("no se pudo crear el directorio de datos");
    }
    let db = DbState::init(&db_path).expect("no se pudo abrir la base de datos");
    {
        let conn = db.conn();
        seed_roles(&conn).expect("no se pudieron sembrar los roles por defecto");
        #[cfg(debug_assertions)]
        if std::env::var("RUSTOCK_SEED").is_ok_and(|v| v == "1") {
            seed::sembrar_si_vacio(&conn).expect("no se pudieron sembrar los datos de ejemplo");
        }
    }
    let sesion = Arc::new(SesionState::default());
    server::iniciar(db, sesion);
    println!(
        "[rustock-web] backend HTTP en 127.0.0.1:{} — Ctrl+C para detener",
        server::puerto_http()
    );
    loop {
        std::thread::park();
    }
}
