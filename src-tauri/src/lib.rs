mod commands;
mod db;
mod domain;
mod error;
mod query;
mod repo;
mod security;
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
            app.manage(db);
            app.manage(Arc::new(SesionState::default()));
            Ok(())
        })
        .invoke_handler(commands::handler())
        .run(tauri::generate_context!())
        .expect("error while running rustock");
}
