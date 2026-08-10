//! Autenticación y sesión activa (SPEC §4.1).
//!
//! Rustock es una app de escritorio de un solo proceso: una sola sesión activa
//! a la vez, guardada en memoria (nunca en el frontend). Ningún comando confía
//! en un id de usuario provisto por el invocador: el actor de cada operación se
//! resuelve siempre desde este estado, poblado únicamente por `login`.

use argon2::Argon2;
use argon2::password_hash::{PasswordHash, PasswordHasher, PasswordVerifier, SaltString};
use parking_lot::Mutex;
use rand_core::OsRng;

use crate::error::{AppError, AppResult};

/// Hashea una contraseña en texto plano con Argon2id (parámetros por defecto OWASP).
pub fn hash_password(password: &str) -> AppResult<String> {
    let salt = SaltString::generate(&mut OsRng);
    Argon2::default()
        .hash_password(password.as_bytes(), &salt)
        .map(|h| h.to_string())
        .map_err(|_| AppError::PasswordDebil)
}

/// Verifica una contraseña en texto plano contra un hash Argon2 almacenado.
pub fn verificar_password(password: &str, hash: &str) -> bool {
    let Ok(parsed) = PasswordHash::new(hash) else {
        return false;
    };
    Argon2::default()
        .verify_password(password.as_bytes(), &parsed)
        .is_ok()
}

/// Identidad de la sesión activa del proceso.
#[allow(dead_code)]
#[derive(Debug, Clone)]
pub struct SesionActiva {
    pub usuario_id: String,
    pub nombre_usuario: String,
    pub rol_codigo: String,
}

/// Estado gestionado por Tauri (`app.manage`) con la sesión activa, si existe.
#[derive(Default)]
pub struct SesionState(Mutex<Option<SesionActiva>>);

impl SesionState {
    pub fn iniciar(&self, sesion: SesionActiva) {
        *self.0.lock() = Some(sesion);
    }

    pub fn cerrar(&self) {
        *self.0.lock() = None;
    }

    pub fn actual(&self) -> Option<SesionActiva> {
        self.0.lock().clone()
    }

    /// Id del usuario autenticado, o `AppError::NoAutenticado` si no hay sesión.
    pub fn usuario_id(&self) -> AppResult<String> {
        self.0
            .lock()
            .as_ref()
            .map(|s| s.usuario_id.clone())
            .ok_or(AppError::NoAutenticado)
    }
}
