//! Configuración de despliegue de Rustock.
//!
//! Rustock es self-hosted: quien lo instala es quien lo opera, y casi nunca es
//! quien lo escribió. Por eso todo lo que cambia entre una instalación y otra
//! —dónde vive la base, en qué interfaz escucha, con qué certificado, cuánto
//! dura una sesión— se declara aquí y en un solo sitio, en vez de repartirse
//! en constantes por el código.
//!
//! Hay tres fuentes, de menos a más prioridad:
//!
//! 1. Los valores por defecto de este módulo, elegidos para que Rustock
//!    arranque en un portátil sin configurar nada.
//! 2. Un fichero TOML (`RUSTOCK_CONFIG`, o `rustock.toml` junto a la base).
//! 3. Las variables de entorno `RUSTOCK_*`.
//!
//! El orden importa: un contenedor puede traer su fichero horneado en la
//! imagen y aun así dejar que el orquestador sobrescriba el puerto con una
//! variable, sin reconstruir nada.
//!
//! Los valores por defecto son deliberadamente los seguros. Escuchar solo en
//! `127.0.0.1` y exigir una lista de orígenes CORS explícita significa que
//! abrir Rustock a la red es siempre un acto consciente de quien lo despliega,
//! nunca algo que ocurre por no haber leído la documentación.

use std::net::IpAddr;
use std::path::{Path, PathBuf};

use serde::{Deserialize, Serialize};

use crate::error::{AppError, AppResult};

// ============ Valores por defecto ============

const PUERTO_POR_DEFECTO: u16 = 1421;
const HOST_POR_DEFECTO: &str = "127.0.0.1";
/// Ocho conexiones cubren de sobra un almacén con decenas de terminales; SQLite
/// en WAL admite lectores concurrentes y serializa solo las escrituras.
const POOL_POR_DEFECTO: usize = 8;
const BUSY_TIMEOUT_MS_POR_DEFECTO: u32 = 5_000;
/// Ocho horas: un turno completo. Quien fiche por la mañana no vuelve a
/// escribir su contraseña antes de irse, y la sesión no sobrevive a la noche.
const SESION_TTL_MINUTOS_POR_DEFECTO: u64 = 480;
/// Copias que se conservan antes de ir borrando las más viejas.
const BACKUP_RETENER_POR_DEFECTO: usize = 7;

// ============ Estructura ============

/// Configuración completa de una instalación.
#[derive(Debug, Clone, Serialize, Deserialize, Default)]
#[serde(default, deny_unknown_fields)]
pub struct Config {
    pub datos: Datos,
    pub http: Http,
    pub sesion: Sesion,
    pub backup: Backup,
}

/// Dónde y cómo se guardan los datos.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(default, deny_unknown_fields)]
pub struct Datos {
    /// Motor de almacenamiento. Hoy solo `sqlite`; se declara igualmente para
    /// que un fichero de configuración existente siga siendo válido el día que
    /// haya otro, y para que pedir uno no implementado falle al arrancar con
    /// un mensaje claro en vez de a mitad de una operación.
    pub motor: Motor,
    /// Ruta del fichero SQLite. Vacío = la ruta estándar del sistema.
    pub ruta: Option<PathBuf>,
    /// Conexiones simultáneas del pool.
    pub pool: usize,
    /// Milisegundos que una conexión espera si otra tiene la base bloqueada.
    pub busy_timeout_ms: u32,
}

/// Motor de almacenamiento.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, Default)]
#[serde(rename_all = "lowercase")]
pub enum Motor {
    #[default]
    Sqlite,
    /// Declarado, no implementado. Ver `Config::validar`.
    Postgres,
}

impl Motor {
    pub fn codigo(self) -> &'static str {
        match self {
            Self::Sqlite => "sqlite",
            Self::Postgres => "postgres",
        }
    }
}

/// Cómo se expone el API HTTP.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(default, deny_unknown_fields)]
pub struct Http {
    /// Interfaz en la que escuchar. `127.0.0.1` solo admite conexiones de la
    /// propia máquina; `0.0.0.0` las admite de toda la red.
    pub host: String,
    pub puerto: u16,
    /// Certificado y clave en PEM. Con ambos presentes se sirve HTTPS.
    pub tls_cert: Option<PathBuf>,
    pub tls_key: Option<PathBuf>,
    /// Orígenes *adicionales* autorizados a llamar al API desde un navegador.
    ///
    /// Los de la propia máquina (`localhost`, `127.0.0.1`, `[::1]`, en
    /// cualquier puerto) se admiten siempre y no hace falta listarlos: son el
    /// modo navegador de Rustock, donde el frontend vive en un puerto y el API
    /// en otro. Permitirlos no abre nada — una página atacante tiene su propio
    /// origen, nunca `localhost`, y el token de sesión viaja en una cabecera
    /// que esa página no puede leer ni adivinar.
    ///
    /// Aquí solo van los orígenes de fuera: el dominio desde el que sirvas el
    /// frontend si no es este mismo equipo.
    pub cors_origenes: Vec<String>,
}

/// Duración de las sesiones.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(default, deny_unknown_fields)]
pub struct Sesion {
    /// Minutos de inactividad tras los que un token deja de valer. `0` las
    /// hace eternas — desaconsejado, pero es decisión de quien despliega.
    pub ttl_minutos: u64,
}

/// Copias de seguridad.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(default, deny_unknown_fields)]
pub struct Backup {
    /// Carpeta donde se escriben. Vacío = `copias/` junto a la base de datos.
    pub directorio: Option<PathBuf>,
    /// Cuántas copias conservar al crear una nueva. `0` no borra ninguna.
    pub retener: usize,
}

impl Default for Datos {
    fn default() -> Self {
        Self {
            motor: Motor::Sqlite,
            ruta: None,
            pool: POOL_POR_DEFECTO,
            busy_timeout_ms: BUSY_TIMEOUT_MS_POR_DEFECTO,
        }
    }
}

impl Default for Http {
    fn default() -> Self {
        Self {
            host: HOST_POR_DEFECTO.to_string(),
            puerto: PUERTO_POR_DEFECTO,
            tls_cert: None,
            tls_key: None,
            cors_origenes: Vec::new(),
        }
    }
}

impl Default for Sesion {
    fn default() -> Self {
        Self {
            ttl_minutos: SESION_TTL_MINUTOS_POR_DEFECTO,
        }
    }
}

impl Default for Backup {
    fn default() -> Self {
        Self {
            directorio: None,
            retener: BACKUP_RETENER_POR_DEFECTO,
        }
    }
}

// ============ Carga ============

impl Config {
    /// Carga la configuración: fichero (si existe) y encima las variables de
    /// entorno. Falla si algo está mal escrito — arrancar con una
    /// configuración que no es la que el operador cree haber puesto es peor
    /// que no arrancar.
    pub fn cargar() -> AppResult<Self> {
        let (ruta, explicita) = Self::ruta_fichero();
        let mut config = if ruta.exists() {
            Self::desde_fichero(&ruta)?
        } else if explicita {
            // Que falte el fichero *por defecto* es lo normal: casi nadie
            // configura nada. Pero si alguien nombró uno con `RUSTOCK_CONFIG`
            // y no está, es una errata o un volumen mal montado, y arrancar
            // con otros valores que los que pidió es peor que no arrancar.
            return Err(AppError::Configuracion(format!(
                "RUSTOCK_CONFIG apunta a {}, que no existe",
                ruta.display()
            )));
        } else {
            Self::default()
        };
        config.aplicar_entorno()?;
        config.validar()?;
        Ok(config)
    }

    /// Ruta del fichero de configuración y si la eligió quien despliega
    /// (`RUSTOCK_CONFIG`) o es la de por defecto (`rustock.toml` junto a la
    /// base). La distinción importa: una se puede echar en falta, la otra no.
    pub fn ruta_fichero() -> (PathBuf, bool) {
        if let Ok(p) = std::env::var("RUSTOCK_CONFIG")
            && !p.trim().is_empty()
        {
            return (PathBuf::from(p), true);
        }
        (directorio_datos().join("rustock.toml"), false)
    }

    fn desde_fichero(ruta: &Path) -> AppResult<Self> {
        let texto = std::fs::read_to_string(ruta).map_err(|e| {
            AppError::Configuracion(format!("no se pudo leer {}: {e}", ruta.display()))
        })?;
        // `deny_unknown_fields` convierte una errata en un fallo de arranque
        // con el nombre del campo, en vez de en un ajuste que se ignora en
        // silencio y se descubre semanas después.
        toml::from_str(&texto)
            .map_err(|e| AppError::Configuracion(format!("{} no es válido: {e}", ruta.display())))
    }

    fn aplicar_entorno(&mut self) -> AppResult<()> {
        if let Some(v) = var("RUSTOCK_DB_MOTOR") {
            self.datos.motor = match v.to_lowercase().as_str() {
                "sqlite" => Motor::Sqlite,
                "postgres" | "postgresql" => Motor::Postgres,
                otro => {
                    return Err(AppError::Configuracion(format!(
                        "motor de base de datos desconocido: «{otro}» (se admite: sqlite)"
                    )));
                }
            };
        }
        if let Some(v) = var("RUSTOCK_DB_PATH") {
            self.datos.ruta = Some(PathBuf::from(v));
        }
        if let Some(v) = var("RUSTOCK_DB_POOL") {
            self.datos.pool = numero(&v, "RUSTOCK_DB_POOL")?;
        }
        if let Some(v) = var("RUSTOCK_DB_BUSY_TIMEOUT_MS") {
            self.datos.busy_timeout_ms = numero(&v, "RUSTOCK_DB_BUSY_TIMEOUT_MS")?;
        }
        if let Some(v) = var("RUSTOCK_HTTP_HOST") {
            self.http.host = v;
        }
        if let Some(v) = var("RUSTOCK_HTTP_PORT") {
            self.http.puerto = numero(&v, "RUSTOCK_HTTP_PORT")?;
        }
        if let Some(v) = var("RUSTOCK_TLS_CERT") {
            self.http.tls_cert = Some(PathBuf::from(v));
        }
        if let Some(v) = var("RUSTOCK_TLS_KEY") {
            self.http.tls_key = Some(PathBuf::from(v));
        }
        if let Some(v) = var("RUSTOCK_CORS_ORIGENES") {
            self.http.cors_origenes = v
                .split(',')
                .map(|o| o.trim().to_string())
                .filter(|o| !o.is_empty())
                .collect();
        }
        if let Some(v) = var("RUSTOCK_SESION_TTL_MINUTOS") {
            self.sesion.ttl_minutos = numero(&v, "RUSTOCK_SESION_TTL_MINUTOS")?;
        }
        if let Some(v) = var("RUSTOCK_BACKUP_DIR") {
            self.backup.directorio = Some(PathBuf::from(v));
        }
        if let Some(v) = var("RUSTOCK_BACKUP_RETENER") {
            self.backup.retener = numero(&v, "RUSTOCK_BACKUP_RETENER")?;
        }
        Ok(())
    }

    /// Comprueba que la configuración describe algo que se puede arrancar. Se
    /// ejecuta antes de abrir nada: más vale morir en el arranque, donde el
    /// operador está mirando, que a la primera petición.
    pub fn validar(&self) -> AppResult<()> {
        if self.datos.motor != Motor::Sqlite {
            return Err(AppError::Configuracion(format!(
                "el motor «{}» todavía no está implementado; Rustock 0.x almacena en sqlite",
                self.datos.motor.codigo()
            )));
        }
        if self.datos.pool == 0 {
            return Err(AppError::Configuracion(
                "datos.pool debe ser al menos 1".into(),
            ));
        }
        if self.http.puerto == 0 {
            return Err(AppError::Configuracion(
                "http.puerto debe estar entre 1 y 65535".into(),
            ));
        }
        if self.http.host.parse::<IpAddr>().is_err() {
            return Err(AppError::Configuracion(format!(
                "http.host debe ser una dirección IP (por ejemplo 127.0.0.1 o 0.0.0.0), no «{}»",
                self.http.host
            )));
        }
        // Medio par de TLS es casi siempre un despiste de configuración, y el
        // resultado —servir en claro creyendo que va cifrado— es justo el que
        // no se puede permitir pasar en silencio.
        match (&self.http.tls_cert, &self.http.tls_key) {
            (Some(_), None) => {
                return Err(AppError::Configuracion(
                    "hay certificado TLS pero falta la clave (http.tls_key)".into(),
                ));
            }
            (None, Some(_)) => {
                return Err(AppError::Configuracion(
                    "hay clave TLS pero falta el certificado (http.tls_cert)".into(),
                ));
            }
            _ => {}
        }
        for origen in &self.http.cors_origenes {
            if origen != "*" && !origen.starts_with("http://") && !origen.starts_with("https://") {
                return Err(AppError::Configuracion(format!(
                    "origen CORS «{origen}» debe incluir el esquema (http:// o https://)"
                )));
            }
        }
        Ok(())
    }

    /// Ruta efectiva de la base de datos.
    pub fn ruta_datos(&self) -> PathBuf {
        self.datos
            .ruta
            .clone()
            .unwrap_or_else(|| directorio_datos().join("rustock.db"))
    }

    /// Carpeta efectiva de copias de seguridad.
    pub fn directorio_backup(&self) -> PathBuf {
        self.backup.directorio.clone().unwrap_or_else(|| {
            self.ruta_datos()
                .parent()
                .unwrap_or(Path::new("."))
                .join("copias")
        })
    }

    /// ¿Se sirve cifrado?
    pub fn tls_activo(&self) -> bool {
        self.http.tls_cert.is_some() && self.http.tls_key.is_some()
    }

    /// ¿Escucha en una interfaz que ve la red, y no solo esta máquina?
    pub fn expuesto_en_red(&self) -> bool {
        match self.http.host.parse::<IpAddr>() {
            Ok(ip) => !ip.is_loopback(),
            Err(_) => false,
        }
    }

    /// Avisos que merecen salir por consola al arrancar. No impiden arrancar:
    /// hay despliegues legítimos tras un proxy inverso que ya cifra.
    pub fn advertencias(&self) -> Vec<String> {
        let mut avisos = Vec::new();
        if self.expuesto_en_red() && !self.tls_activo() {
            avisos.push(format!(
                "escuchando en {} SIN TLS: el tráfico, incluidas las contraseñas, viaja en claro. \
                 Configura http.tls_cert/http.tls_key o pon Rustock detrás de un proxy que cifre.",
                self.http.host
            ));
        }
        if self.http.cors_origenes.iter().any(|o| o == "*") {
            avisos.push(
                "CORS abierto a «*»: cualquier página web puede llamar a este API desde el \
                 navegador de quien tenga sesión. Enumera los orígenes que necesites."
                    .into(),
            );
        }
        if self.sesion.ttl_minutos == 0 {
            avisos.push(
                "las sesiones no caducan (sesion.ttl_minutos = 0): un token robado vale para \
                 siempre mientras el proceso siga vivo."
                    .into(),
            );
        }
        avisos
    }
}

// ============ Auxiliares ============

/// ¿El origen es una página servida desde esta misma máquina?
///
/// Se admiten siempre (ver `Http::cors_origenes`): son el modo navegador de
/// Rustock. Se compara el host exacto para que `http://localhost.evil.com` no
/// cuele por empezar igual.
pub fn es_origen_local(origen: &str) -> bool {
    let sin_esquema = match origen.split_once("://") {
        Some(("http" | "https", resto)) => resto,
        _ => return false,
    };
    // Un host IPv6 va entre corchetes y lleva `:` dentro, así que el puerto no
    // se puede separar por el primer `:`: se corta tras el `]`.
    let host = if let Some(fin) = sin_esquema.strip_prefix('[').and_then(|r| r.find(']')) {
        &sin_esquema[..fin + 2]
    } else {
        sin_esquema.split_once(':').map_or(sin_esquema, |(h, _)| h)
    };
    matches!(host, "localhost" | "127.0.0.1" | "[::1]")
}

/// Variable de entorno no vacía.
fn var(clave: &str) -> Option<String> {
    std::env::var(clave).ok().filter(|v| !v.trim().is_empty())
}

fn numero<T: std::str::FromStr>(valor: &str, clave: &str) -> AppResult<T> {
    valor
        .trim()
        .parse::<T>()
        .map_err(|_| AppError::Configuracion(format!("{clave} debe ser un número, no «{valor}»")))
}

/// Directorio de datos estándar del sistema (`XDG_DATA_HOME` si está definida).
/// Es el mismo que usa la ventana de escritorio, para que el modo navegador y
/// el modo ventana compartan los datos sin configurar nada.
pub fn directorio_datos() -> PathBuf {
    let home = std::env::var("HOME").unwrap_or_else(|_| ".".into());
    let data_home =
        std::env::var("XDG_DATA_HOME").unwrap_or_else(|_| format!("{home}/.local/share"));
    PathBuf::from(data_home).join("com.rustock.app")
}
