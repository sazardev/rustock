mod buscar;
mod commands;
mod config;
mod db;
/// Público para que los ejemplos de verificación (`examples/`) puedan
/// comprobar la codificación de etiquetas contra un lector externo sin pasar
/// por el servidor. El resto de módulos siguen siendo internos.
pub mod domain;
mod error;
mod importar;
mod mapa;
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

use config::Config;
use db::DbState;
use security::seed_roles;
use sesion::SesionState;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .setup(|app| {
            // La configuración manda incluso en modo escritorio: quien
            // instala Rustock en un equipo compartido puede querer la base en
            // otro disco, o el API en otro puerto, sin recompilar nada.
            let config = Config::cargar()?;
            let db_path = match &config.datos.ruta {
                Some(ruta) => ruta.clone(),
                None => app
                    .path()
                    .app_data_dir()
                    .unwrap_or_else(|_| PathBuf::from("."))
                    .join("rustock.db"),
            };
            if let Some(dir) = db_path.parent() {
                std::fs::create_dir_all(dir)?;
            }

            let db = DbState::abrir(&db_path, config.datos.pool, config.datos.busy_timeout_ms)?;
            {
                let conn = db.conn();
                seed_roles(&conn)?;
                #[cfg(debug_assertions)]
                if std::env::var("RUSTOCK_SEED").is_ok_and(|v| v == "1") {
                    seed::sembrar_si_vacio(&conn)?;
                }
            }
            let sesion = Arc::new(SesionState::default());

            // Servidor HTTP: expone la misma lógica de negocio para poder
            // usar Rustock desde un navegador normal, sin el puente IPC de la
            // ventana de escritorio (ver src/server.rs).
            repo::backup::planificar(db.clone(), &config);
            server::iniciar_con(db.clone(), config);

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

/// Modo navegador sin ventana (`RUSTOCK_WEB_ONLY=1`): arranca solo la capa de
/// datos + el servidor HTTP local (`server.rs`, `127.0.0.1:1421`) sin
/// inicializar GTK/WebKit ni crear ventana alguna. Pensado para entornos sin
/// servidor X/Wayland funcional (WSL, CI) donde la ventana nativa no puede
/// crearse y para el script `npm run tauri:web`. Misma lógica de negocio y
/// mismos permisos que el modo escritorio; las sesiones, en cambio, son por
/// cliente HTTP y viven en el registro del servidor (ver `sesion.rs`).
pub fn run_web() {
    // Una configuración inválida se dice y se muere aquí, con el mensaje del
    // campo concreto: es el momento en que quien despliega está mirando.
    let config = match Config::cargar() {
        Ok(c) => c,
        Err(e) => {
            eprintln!("[rustock-web] {e}");
            std::process::exit(2);
        }
    };
    let db_path = config.ruta_datos();
    if let Some(dir) = db_path.parent() {
        std::fs::create_dir_all(dir).expect("no se pudo crear el directorio de datos");
    }
    let db = DbState::abrir(&db_path, config.datos.pool, config.datos.busy_timeout_ms)
        .expect("no se pudo abrir la base de datos");
    {
        let conn = db.conn();
        seed_roles(&conn).expect("no se pudieron sembrar los roles por defecto");
        #[cfg(debug_assertions)]
        if std::env::var("RUSTOCK_SEED").is_ok_and(|v| v == "1") {
            seed::sembrar_si_vacio(&conn).expect("no se pudieron sembrar los datos de ejemplo");
        }
    }
    println!(
        "[rustock-web] datos en {} ({} conexiones) — Ctrl+C para detener",
        db_path.display(),
        config.datos.pool
    );
    repo::backup::planificar(db.clone(), &config);
    server::iniciar_con(db, config);
    loop {
        std::thread::park();
    }
}
