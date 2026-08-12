mod commands;
mod db;
mod domain;
mod error;
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
