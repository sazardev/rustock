//! Autenticación y sesión activa (SPEC §4.1).
//!
//! Ningún comando confía en un id de usuario provisto por el invocador: el
//! actor de cada operación se resuelve siempre desde el estado de sesión,
//! poblado únicamente por `login`.
//!
//! Hay dos formas de tener sesión, según la cara por la que se entre:
//!
//! - **Ventana de escritorio**: un proceso, un operador, una sesión. El estado
//!   vive en el `SesionState` que Tauri gestiona (`app.manage`).
//! - **Navegador (servidor HTTP)**: varias personas pueden estar conectadas a
//!   la vez desde distintos equipos. Cada una tiene su propia sesión en el
//!   `RegistroSesiones`, identificada por un token que el cliente envía en
//!   cada petición. Sin esto, la última persona en entrar se llevaría por
//!   delante la sesión de todas las demás y la auditoría atribuiría sus actos
//!   a quien no fue.

use std::collections::HashMap;
use std::time::{Duration, Instant};

use argon2::Argon2;
use argon2::password_hash::{PasswordHash, PasswordHasher, PasswordVerifier, SaltString};
use parking_lot::Mutex;
use rand_core::OsRng;
use uuid::Uuid;

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
    /// Estado ya poblado. Lo usa el servidor HTTP para dar a cada petición la
    /// sesión de su propio cliente, de modo que todo el despacho siga
    /// llamando a `sesion.usuario_id()` sin saber que hay varias sesiones.
    pub fn desde(sesion: Option<SesionActiva>) -> Self {
        Self(Mutex::new(sesion))
    }

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

/// Nombre de la cabecera con la que el cliente HTTP presenta su sesión.
pub const CABECERA_SESION: &str = "x-rustock-sesion";

/// Una sesión viva y cuándo se usó por última vez.
struct Entrada {
    sesion: SesionActiva,
    visto: Instant,
}

/// Sesiones abiertas del servidor HTTP, una por cliente.
///
/// El token es opaco y solo vive en memoria: reiniciar el backend cierra todas
/// las sesiones, que es el comportamiento correcto para una herramienta
/// self-hosted — no hay nada que persistir ni que revocar en otro sitio.
///
/// **Caducidad por inactividad.** Cada acceso renueva el reloj del token; si
/// pasa `ttl` sin usarse, deja de valer. Se mide inactividad y no antigüedad a
/// propósito: a quien está trabajando no se le corta la sesión a media tarde,
/// pero un token copiado de un equipo que quedó abierto muere solo.
///
/// La limpieza es perezosa —se hace al consultar, no con un hilo aparte—
/// porque el coste es proporcional a las sesiones vivas, que en una
/// instalación self-hosted son decenas, no millones.
pub struct RegistroSesiones {
    sesiones: Mutex<HashMap<String, Entrada>>,
    /// `None` = las sesiones no caducan.
    ttl: Option<Duration>,
}

impl Default for RegistroSesiones {
    fn default() -> Self {
        Self::con_ttl(None)
    }
}

impl RegistroSesiones {
    /// Registro con la caducidad indicada. `None` las hace eternas.
    pub fn con_ttl(ttl: Option<Duration>) -> Self {
        Self {
            sesiones: Mutex::new(HashMap::new()),
            ttl,
        }
    }

    /// Registro a partir de los minutos configurados (`0` = sin caducidad).
    pub fn desde_minutos(minutos: u64) -> Self {
        Self::con_ttl((minutos > 0).then(|| Duration::from_secs(minutos * 60)))
    }

    /// Abre una sesión y devuelve su token.
    pub fn abrir(&self, sesion: SesionActiva) -> String {
        let token = Uuid::new_v4().to_string();
        let mut sesiones = self.sesiones.lock();
        self.purgar(&mut sesiones);
        sesiones.insert(
            token.clone(),
            Entrada {
                sesion,
                visto: Instant::now(),
            },
        );
        token
    }

    /// Devuelve la sesión del token y renueva su reloj. `None` si no existe o
    /// si ya caducó — desde fuera, ambas cosas son lo mismo: no hay sesión.
    pub fn obtener(&self, token: &str) -> Option<SesionActiva> {
        let mut sesiones = self.sesiones.lock();
        let ttl = self.ttl;
        let entrada = sesiones.get_mut(token)?;
        if ttl.is_some_and(|ttl| entrada.visto.elapsed() > ttl) {
            sesiones.remove(token);
            return None;
        }
        entrada.visto = Instant::now();
        Some(entrada.sesion.clone())
    }

    /// Reemplaza la sesión de un token (p. ej. al iniciar sesión con otro
    /// usuario sin haber cerrado la anterior).
    pub fn actualizar(&self, token: &str, sesion: SesionActiva) {
        self.sesiones.lock().insert(
            token.to_string(),
            Entrada {
                sesion,
                visto: Instant::now(),
            },
        );
    }

    pub fn cerrar(&self, token: &str) {
        self.sesiones.lock().remove(token);
    }

    /// Tira las sesiones caducadas. Se llama al abrir una nueva, que es el
    /// único momento en que el mapa crece.
    fn purgar(&self, sesiones: &mut HashMap<String, Entrada>) {
        if let Some(ttl) = self.ttl {
            sesiones.retain(|_, e| e.visto.elapsed() <= ttl);
        }
    }

    /// Cuántas sesiones hay abiertas. Solo lo usan las pruebas.
    #[cfg(test)]
    pub fn abiertas(&self) -> usize {
        self.sesiones.lock().len()
    }
}
