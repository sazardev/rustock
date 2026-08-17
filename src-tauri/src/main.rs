// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

fn main() {
    // RUSTOCK_WEB_ONLY=1: modo navegador sin ventana (sin GTK/WebKit, no crea
    // ventana) — solo base de datos + servidor HTTP local en 127.0.0.1:1421.
    // Lo usa `npm run tauri:web`. Ver `run_web()` en lib.rs.
    if std::env::var("RUSTOCK_WEB_ONLY").is_ok_and(|v| v == "1") {
        rustock_lib::run_web();
    } else {
        rustock_lib::run()
    }
}
