//! Impresoras de etiquetas conectadas por red (SPEC §14.3.8).
//!
//! Prácticamente toda impresora térmica de etiquetas —Zebra, Honeywell, TSC,
//! Godex y la mayoría de las genéricas— acepta trabajos en crudo por TCP en el
//! puerto **9100** (el estándar de facto, heredado de HP JetDirect). Se le
//! manda el ZPL o el EPL tal cual y sale la etiqueta.
//!
//! Es, con diferencia, la vía más robusta de las que hay:
//!
//! - No hace falta driver ni instalar nada en el equipo del operador.
//! - No depende del sistema operativo ni del diálogo de impresión del
//!   navegador, que reescala y arruina el ancho de las barras.
//! - Funciona igual desde un teléfono del almacén que desde el servidor.
//!
//! Lo que **no** cubre: impresoras conectadas por USB a un equipo concreto, y
//! las de marca con protocolo propio (Dymo, Brother). Para esas el camino es
//! el PDF a tamaño real, que su propio driver imprime sin reescalar.

use std::io::Write;
use std::net::{SocketAddr, TcpStream, ToSocketAddrs};
use std::time::Duration;

use serde::{Deserialize, Serialize};

use crate::error::{AppError, AppResult};

/// Puerto de trabajos en crudo. Es el estándar; se deja configurable porque
/// algunos servidores de impresión lo reubican.
pub const PUERTO_RAW: u16 = 9100;

/// Tiempo máximo para conectar y para enviar. Corto a propósito: si la
/// impresora no responde, quien está en el muelle necesita saberlo ya, no
/// dentro de un minuto.
const TIMEOUT: Duration = Duration::from_secs(5);

/// Destino de un trabajo de impresión.
#[derive(Debug, Clone, Deserialize)]
pub struct DestinoImpresora {
    /// IP o nombre de la impresora en la red.
    pub host: String,
    #[serde(default = "puerto_por_defecto")]
    pub puerto: u16,
}

fn puerto_por_defecto() -> u16 {
    PUERTO_RAW
}

#[derive(Debug, Clone, Serialize)]
pub struct ResultadoImpresion {
    pub enviado: bool,
    pub bytes: usize,
    pub destino: String,
}

/// Resuelve el destino y comprueba que apunta a algo razonable.
fn resolver(destino: &DestinoImpresora) -> AppResult<SocketAddr> {
    let host = destino.host.trim();
    if host.is_empty() {
        return Err(AppError::CampoRequerido("dirección de la impresora".into()));
    }
    // La impresora es un equipo de la red local del almacén. Rechazar puertos
    // fuera de rango evita convertir esto en un cliente TCP genérico con el
    // que sondear la red desde el servidor.
    if destino.puerto == 0 {
        return Err(AppError::CampoInvalido("puerto de la impresora".into()));
    }
    (host, destino.puerto)
        .to_socket_addrs()
        .map_err(|e| AppError::CampoInvalido(format!("dirección de la impresora ({e})")))?
        .next()
        .ok_or_else(|| {
            AppError::CampoInvalido(format!("dirección de la impresora: '{host}' no resuelve"))
        })
}

/// Envía un trabajo en crudo a la impresora.
pub fn enviar(destino: &DestinoImpresora, trabajo: &[u8]) -> AppResult<ResultadoImpresion> {
    let direccion = resolver(destino)?;
    let mut conexion = TcpStream::connect_timeout(&direccion, TIMEOUT).map_err(|e| {
        AppError::CampoInvalido(format!(
            "no se pudo conectar con la impresora en {direccion}: {e}"
        ))
    })?;
    conexion
        .set_write_timeout(Some(TIMEOUT))
        .map_err(|e| AppError::CampoInvalido(format!("no se pudo preparar el envío: {e}")))?;
    conexion.write_all(trabajo).map_err(|e| {
        AppError::CampoInvalido(format!("la impresora cortó la conexión al recibir: {e}"))
    })?;
    conexion
        .flush()
        .map_err(|e| AppError::CampoInvalido(format!("no se pudo vaciar el envío: {e}")))?;

    Ok(ResultadoImpresion {
        enviado: true,
        bytes: trabajo.len(),
        destino: direccion.to_string(),
    })
}

/// Comprueba que la impresora acepta conexiones, sin mandarle nada.
///
/// Solo dice que el puerto está abierto: una térmica sin papel o con el
/// cabezal levantado acepta la conexión igualmente. Sirve para descartar lo
/// más común —IP mal escrita, impresora apagada, otra red— antes de mandar
/// cien etiquetas al vacío.
pub fn probar(destino: &DestinoImpresora) -> AppResult<ResultadoImpresion> {
    let direccion = resolver(destino)?;
    TcpStream::connect_timeout(&direccion, TIMEOUT).map_err(|e| {
        AppError::CampoInvalido(format!(
            "no se pudo conectar con la impresora en {direccion}: {e}"
        ))
    })?;
    Ok(ResultadoImpresion {
        enviado: false,
        bytes: 0,
        destino: direccion.to_string(),
    })
}
