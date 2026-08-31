//! Servidor HTTP local (`127.0.0.1`) que expone la misma lógica de negocio
//! que los comandos Tauri, para poder usar Rustock desde un navegador normal
//! cuando no hay puente IPC de ventana de escritorio disponible (SPEC: "self
//! -hosted, todo incluido" — corre en la infraestructura del dueño).
//!
//! **Regla de esta capa: nunca reimplementa una regla de negocio.** Cada
//! rama de abajo llama exactamente a la misma función `repo::*` que su
//! comando Tauri equivalente en `commands.rs`, con las mismas validaciones
//! de permisos (`puede`) y el mismo registro de auditoría
//! (`con_auditoria!`). Es sólo una segunda fachada de transporte.
//!
//! **Sesión: una por cliente.** A diferencia de la ventana de escritorio —un
//! proceso, un operador—, por HTTP pueden entrar varias personas a la vez
//! desde equipos distintos. Cada petición presenta su token en la cabecera
//! `x-rustock-sesion`, y esta capa construye con él un `SesionState` acotado
//! a esa petición. Así todo el despacho de abajo sigue llamando a
//! `sesion.usuario_id()` sin enterarse de que hay varias sesiones vivas, y la
//! auditoría atribuye cada acto a quien realmente lo hizo.
//!
//! Se usa cabecera y no cookie a propósito: el frontend vive en otro origen
//! (`localhost:6821` frente a `127.0.0.1:1421`), donde una cookie `SameSite`
//! no viajaría, y una cabecera evita además todo el enredo de CORS con
//! credenciales.

use std::sync::Arc;

use serde_json::{Value, json};
use tiny_http::{Header, Method, Response, Server, SslConfig};

use crate::commands::con_auditoria;
use crate::config::Config;
use crate::db::DbState;
use crate::domain::alerta::NuevoComentario;
use crate::domain::catalogo::*;
use crate::domain::inventario::*;
use crate::domain::movimiento::*;
use crate::domain::seguridad::*;
use crate::error::{AppError, AppResult};
use crate::query::{self, ListParams};
use crate::repo;
use crate::security::puede;
use crate::sesion::{CABECERA_SESION, RegistroSesiones, SesionActiva, SesionState};

/// Arranca el servidor en un hilo aparte. No bloquea: si el puerto ya está
/// ocupado (ej. otra instancia corriendo), se registra el error y la app
/// sigue funcionando igual como app de escritorio pura.
pub fn iniciar_con(db: Arc<DbState>, config: Config) {
    std::thread::spawn(move || {
        let registro = Arc::new(RegistroSesiones::desde_minutos(config.sesion.ttl_minutos));
        let direccion = (config.http.host.as_str(), config.http.puerto);
        let esquema = if config.tls_activo() { "https" } else { "http" };

        let server = match abrir_servidor(&config, direccion) {
            Ok(s) => s,
            Err(e) => {
                eprintln!(
                    "[server] no se pudo escuchar en {}:{}: {e}",
                    config.http.host, config.http.puerto
                );
                return;
            }
        };

        println!(
            "[server] API en {esquema}://{}:{}",
            config.http.host, config.http.puerto
        );
        // Los avisos van por stderr y con la palabra AVISO: quien despliega
        // mirando los registros tiene que tropezarse con ellos, no encontrarlos
        // si los busca.
        for aviso in config.advertencias() {
            eprintln!("[server] AVISO: {aviso}");
        }

        let cors = Cors {
            base: cabeceras_cors(&config),
            config,
        };
        for request in server.incoming_requests() {
            manejar(&db, &registro, &cors, request);
        }
    });
}

/// Abre el socket, con TLS si hay certificado configurado.
fn abrir_servidor(
    config: &Config,
    direccion: (&str, u16),
) -> Result<Server, Box<dyn std::error::Error + Send + Sync + 'static>> {
    let (Some(cert), Some(key)) = (&config.http.tls_cert, &config.http.tls_key) else {
        return Server::http(direccion);
    };
    let certificate = std::fs::read(cert)
        .map_err(|e| format!("no se pudo leer el certificado {}: {e}", cert.display()))?;
    let private_key = std::fs::read(key)
        .map_err(|e| format!("no se pudo leer la clave {}: {e}", key.display()))?;
    Server::https(
        direccion,
        SslConfig {
            certificate,
            private_key,
        },
    )
}

/// Lo que hace falta para decidir las cabeceras CORS de cada petición: la
/// lista blanca y las cabeceras que no dependen de quién llama.
pub struct Cors {
    config: Config,
    base: Vec<Header>,
}

/// Cabeceras CORS según la lista blanca configurada.
///
/// Sin orígenes configurados no se emite ninguna cabecera CORS: el navegador
/// solo dejará llamar al API desde el propio origen, que es lo correcto cuando
/// el frontend lo sirve este mismo host. Abrirlo es una decisión explícita de
/// quien despliega, no el valor por defecto.
fn cabeceras_cors(config: &Config) -> Vec<Header> {
    // Siempre se emiten: aunque no haya ningún origen configurado, los de la
    // propia máquina se admiten (ver `Http::cors_origenes`), que es como
    // funciona el modo navegador de Rustock.
    let _ = config;
    // Con varios orígenes hay que responder el que pidió cada cliente, no la
    // lista entera: `Access-Control-Allow-Origin` admite un único valor. Eso
    // se resuelve por petición en `cors_para`; aquí van las constantes.
    vec![
        Header::from_bytes(&b"Access-Control-Allow-Methods"[..], &b"POST, OPTIONS"[..]).unwrap(),
        Header::from_bytes(
            &b"Access-Control-Allow-Headers"[..],
            format!("Content-Type, {CABECERA_SESION}").as_bytes(),
        )
        .unwrap(),
        // Un origen permitido cambia la respuesta: las cachés intermedias no
        // deben servir a un origen lo que se respondió a otro.
        Header::from_bytes(&b"Vary"[..], &b"Origin"[..]).unwrap(),
    ]
}

/// Cabeceras CORS de *esta* petición: las constantes más el origen concreto,
/// solo si está en la lista blanca.
fn cors_para(config: &Config, base: &[Header], request: &tiny_http::Request) -> Vec<Header> {
    let origen = request
        .headers()
        .iter()
        .find(|h| h.field.equiv("Origin"))
        .map(|h| h.value.as_str().to_string());
    // Un origen de la propia máquina se admite sin configurar nada: es el modo
    // navegador de Rustock (frontend en un puerto, API en otro).
    let autorizado = |o: &String| {
        crate::config::es_origen_local(o)
            || config.http.cors_origenes.iter().any(|p| p == "*" || p == o)
    };
    let permitido = match &origen {
        Some(o) if autorizado(o) => o.clone(),
        // Un origen que no está en la lista no recibe permiso: la petición se
        // atiende igual, pero el navegador se negará a entregar la respuesta.
        _ => return Vec::new(),
    };
    let mut cabeceras = base.to_vec();
    cabeceras.push(
        Header::from_bytes(&b"Access-Control-Allow-Origin"[..], permitido.as_bytes()).unwrap(),
    );
    cabeceras
}

/// Token de sesión que presenta el cliente, si lo trae.
fn token_de(request: &tiny_http::Request) -> Option<String> {
    request
        .headers()
        .iter()
        .find(|h| h.field.equiv(CABECERA_SESION))
        .map(|h| h.value.as_str().trim().to_string())
        .filter(|t| !t.is_empty())
}

fn manejar(
    db: &Arc<DbState>,
    registro: &Arc<RegistroSesiones>,
    cors: &Cors,
    mut request: tiny_http::Request,
) {
    if request.method() == &Method::Options {
        let mut response = Response::empty(204);
        for h in cors_para(&cors.config, &cors.base, &request) {
            response.add_header(h);
        }
        let _ = request.respond(response);
        return;
    }

    let comando = request
        .url()
        .trim_start_matches('/')
        .trim_start_matches("api/")
        .to_string();

    let mut cuerpo = String::new();
    let _ = request.as_reader().read_to_string(&mut cuerpo);
    let args: Value = if cuerpo.trim().is_empty() {
        Value::Null
    } else {
        serde_json::from_str(&cuerpo).unwrap_or(Value::Null)
    };

    // Sesión acotada a esta petición, construida **solo** con el token que
    // presenta el cliente. Sin token no hay sesión: nunca se hereda la de la
    // ventana de escritorio ni la de otro cliente. Las dos caras de la app
    // comparten lógica de negocio y base de datos, no identidad.
    let token_entrante = token_de(&request);
    let sesion_previa = token_entrante.as_ref().and_then(|t| registro.obtener(t));
    let ambito = Arc::new(SesionState::desde(sesion_previa.clone()));

    let resultado = despachar(db, &ambito, &comando, &args);

    // Reconciliación: comparar la sesión antes y después del despacho cubre
    // `login`, `logout` y el reinicio de sesión con otro usuario sin que esta
    // función tenga que conocer ninguno de esos comandos por su nombre.
    let sesion_final = ambito.actual();
    let mut token_emitido: Option<String> = None;
    match (&sesion_previa, &sesion_final) {
        (None, Some(nueva)) => {
            token_emitido = Some(registro.abrir(nueva.clone()));
        }
        (Some(_), None) => {
            if let Some(t) = &token_entrante {
                registro.cerrar(t);
            }
        }
        // Iniciar sesión con otro usuario sin cerrar la anterior: el token
        // pasa a identificar a la nueva persona, no se acumulan sesiones.
        (Some(previa), Some(nueva)) if previa.usuario_id != nueva.usuario_id => {
            if let Some(t) = &token_entrante {
                registro.actualizar(t, nueva.clone());
            }
        }
        _ => {}
    }

    let cuerpo_respuesta = match resultado {
        Ok(v) => match &token_emitido {
            Some(token) => json!({ "ok": true, "data": v, "sesion": token }).to_string(),
            None => json!({ "ok": true, "data": v }).to_string(),
        },
        // El error viaja como código + datos para que la interfaz redacte la
        // frase en su idioma (SPEC §17.3). `error` se mantiene con el texto en
        // castellano: sirve de respaldo si aparece un código que el
        // diccionario todavía no conoce, y es lo que se ve en los registros.
        Err(e) => json!({
            "ok": false,
            "error": e.to_string(),
            "codigo": e.codigo(),
            "datos": e.datos(),
        })
        .to_string(),
    };

    let mut response = Response::from_string(cuerpo_respuesta);
    for h in cors_para(&cors.config, &cors.base, &request) {
        response.add_header(h);
    }
    response
        .add_header(Header::from_bytes(&b"Content-Type"[..], &b"application/json"[..]).unwrap());
    let _ = request.respond(response);
}

// ============ Helpers de extracción de argumentos JSON ============

fn campo<'a>(v: &'a Value, clave: &str) -> AppResult<&'a Value> {
    v.get(clave)
        .filter(|x| !x.is_null())
        .ok_or_else(|| AppError::CampoRequerido(clave.into()))
}

fn str_req(v: &Value, clave: &str) -> AppResult<String> {
    campo(v, clave)?
        .as_str()
        .map(str::to_string)
        .ok_or_else(|| AppError::CampoRequerido(clave.into()))
}

fn str_opt(v: &Value, clave: &str) -> Option<String> {
    v.get(clave).and_then(|x| x.as_str()).map(str::to_string)
}

fn i64_req(v: &Value, clave: &str) -> AppResult<i64> {
    campo(v, clave)?
        .as_i64()
        .ok_or_else(|| AppError::CampoRequerido(clave.into()))
}

fn i64_opt(v: &Value, clave: &str) -> Option<i64> {
    v.get(clave).and_then(|x| x.as_i64())
}

fn bool_opt(v: &Value, clave: &str) -> Option<bool> {
    v.get(clave).and_then(|x| x.as_bool())
}

fn de_req<T: serde::de::DeserializeOwned>(v: &Value, clave: &str) -> AppResult<T> {
    let val = campo(v, clave)?;
    serde_json::from_value(val.clone())
        .map_err(|e| AppError::CampoRequerido(format!("{clave}: {e}")))
}

fn de_opt<T: serde::de::DeserializeOwned>(v: &Value, clave: &str) -> Option<T> {
    v.get(clave)
        .filter(|x| !x.is_null())
        .and_then(|val| serde_json::from_value(val.clone()).ok())
}

fn params_de(v: &Value) -> AppResult<ListParams> {
    match v.get("params") {
        Some(p) => serde_json::from_value(p.clone())
            .map_err(|e| AppError::CampoRequerido(format!("params: {e}"))),
        None => {
            // Sin envoltorio `params`: se tolera Null/objeto vacío (comandos
            // que no llevan parámetros), pero claves sueltas en la raíz son
            // casi seguro un error del cliente — si se ignoraran, la consulta
            // devolvería TODO sin filtros ni orden aparentando éxito.
            let extrañas: Vec<String> = v
                .as_object()
                .map(|obj| obj.keys().cloned().collect())
                .unwrap_or_default();
            if !extrañas.is_empty() {
                return Err(AppError::CampoInvalido(format!(
                    "parámetros inesperados en la raíz: {}; deben ir dentro de \"params\"",
                    extrañas.join(", ")
                )));
            }
            serde_json::from_value(json!({}))
                .map_err(|e| AppError::CampoRequerido(format!("params: {e}")))
        }
    }
}

fn ok<T: serde::Serialize>(v: T) -> AppResult<Value> {
    Ok(serde_json::to_value(v).unwrap_or(Value::Null))
}

/// Despacha un comando por nombre. Cada rama es deliberadamente un espejo
/// del comando Tauri homónimo en `commands.rs` — misma llamada a `repo::*`,
/// mismo permiso, misma auditoría — solo cambia de dónde vienen los
/// argumentos (JSON crudo en vez de los parámetros tipados que genera Tauri).
#[allow(clippy::too_many_lines)]
fn despachar(
    db: &Arc<DbState>,
    sesion: &Arc<SesionState>,
    comando: &str,
    args: &Value,
) -> AppResult<Value> {
    match comando {
        // ============ Autenticación y sesión ============
        "login" => {
            let nombre_usuario = str_req(args, "nombreUsuario")?;
            let password = str_req(args, "password")?;
            let resultado = {
                let conn = db.conn();
                repo::seguridad::verificar_credenciales(&conn, &nombre_usuario, &password)
            };
            let exito = resultado.is_ok();
            {
                let conn = db.conn();
                let actor = resultado.as_ref().ok().map(|u: &Usuario| u.id.clone());
                let _ = repo::auditoria::registrar_invocacion(
                    &conn,
                    actor.as_deref(),
                    "login",
                    0,
                    exito,
                    None,
                );
            }
            let usuario = resultado?;
            let rol_codigo = {
                let conn = db.conn();
                repo::seguridad::rol_codigo_de_usuario(&conn, &usuario.id)?
            };
            sesion.iniciar(SesionActiva {
                usuario_id: usuario.id.clone(),
                nombre_usuario: usuario.nombre_usuario.clone(),
                rol_codigo,
            });
            ok(usuario)
        }
        "logout" => {
            sesion.cerrar();
            ok(())
        }
        "quien_soy" => {
            let Some(actual) = sesion.actual() else {
                return ok(Option::<Usuario>::None);
            };
            let conn = db.conn();
            ok(repo::seguridad::obtener_usuario(&conn, &actual.usuario_id)?)
        }
        "puedo" => {
            let recurso = str_req(args, "recurso")?;
            let accion = str_req(args, "accion")?;
            let actor = sesion.usuario_id()?;
            let conn = db.conn();
            match crate::security::puede(&conn, Some(&actor), &recurso, &accion) {
                Ok(()) => ok(true),
                Err(crate::error::AppError::SinPermiso(_)) => ok(false),
                Err(e) => Err(e),
            }
        }
        "bootstrap_admin" => {
            let nombre_usuario = str_req(args, "nombreUsuario")?;
            let nombre_completo = str_req(args, "nombreCompleto")?;
            let password = str_req(args, "password")?;
            let conn = db.conn();
            repo::seguridad::bootstrap_admin(&conn, &nombre_usuario, &nombre_completo, &password)?;
            ok(())
        }

        // ============ Almacén ============
        "listar_almacenes" => con_auditoria!(db, sesion, "listar_almacenes", {
            let conn = db.conn();
            puede(&conn, Some(&sesion.usuario_id()?), "almacen", "ver")?;
            ok(query::listar(
                &conn,
                &query::ALMACEN_SCHEMA,
                &params_de(args)?,
            )?)
        }),
        "crear_almacen" => con_auditoria!(db, sesion, "crear_almacen", {
            let mut nuevo: NuevoAlmacen = de_req(args, "nuevo")?;
            nuevo.created_by = Some(sesion.usuario_id()?);
            let conn = db.conn();
            ok(repo::catalogo::crear_almacen(&conn, &nuevo)?)
        }),
        "obtener_almacen" => con_auditoria!(db, sesion, "obtener_almacen", {
            let id = str_req(args, "id")?;
            let conn = db.conn();
            puede(&conn, Some(&sesion.usuario_id()?), "almacen", "ver")?;
            ok(repo::catalogo::obtener_almacen(&conn, &id)?)
        }),
        "editar_almacen" => con_auditoria!(db, sesion, "editar_almacen", {
            let id = str_req(args, "id")?;
            let cambios: EditarAlmacen = de_req(args, "cambios")?;
            let actor = sesion.usuario_id()?;
            let conn = db.conn();
            ok(repo::catalogo::editar_almacen(
                &conn, &id, &cambios, &actor,
            )?)
        }),
        "mover_almacen" => con_auditoria!(db, sesion, "mover_almacen", {
            let id = str_req(args, "id")?;
            let pos: PosicionMapa = de_req(args, "pos")?;
            let actor = sesion.usuario_id()?;
            let conn = db.conn();
            ok(repo::catalogo::mover_almacen(&conn, &id, &pos, &actor)?)
        }),
        "desactivar_almacen" => con_auditoria!(db, sesion, "desactivar_almacen", {
            let id = str_req(args, "id")?;
            let actor = sesion.usuario_id()?;
            let conn = db.conn();
            ok(repo::catalogo::desactivar_almacen(
                &conn,
                &id,
                Some(&actor),
            )?)
        }),

        // ============ Zona ============
        "listar_zonas" => con_auditoria!(db, sesion, "listar_zonas", {
            let conn = db.conn();
            puede(&conn, Some(&sesion.usuario_id()?), "zona", "ver")?;
            ok(query::listar(
                &conn,
                &query::ZONA_SCHEMA,
                &params_de(args)?,
            )?)
        }),
        "crear_zona" => con_auditoria!(db, sesion, "crear_zona", {
            let mut nuevo: NuevaZona = de_req(args, "nuevo")?;
            nuevo.created_by = Some(sesion.usuario_id()?);
            let conn = db.conn();
            ok(repo::catalogo::crear_zona(&conn, &nuevo)?)
        }),
        "obtener_zona" => con_auditoria!(db, sesion, "obtener_zona", {
            let id = str_req(args, "id")?;
            let conn = db.conn();
            puede(&conn, Some(&sesion.usuario_id()?), "zona", "ver")?;
            ok(repo::catalogo::obtener_zona(&conn, &id)?)
        }),
        "editar_zona" => con_auditoria!(db, sesion, "editar_zona", {
            let id = str_req(args, "id")?;
            let cambios: EditarZona = de_req(args, "cambios")?;
            let actor = sesion.usuario_id()?;
            let conn = db.conn();
            ok(repo::catalogo::editar_zona(&conn, &id, &cambios, &actor)?)
        }),
        "mover_zona" => con_auditoria!(db, sesion, "mover_zona", {
            let id = str_req(args, "id")?;
            let pos: PosicionMapa = de_req(args, "pos")?;
            let actor = sesion.usuario_id()?;
            let conn = db.conn();
            ok(repo::catalogo::mover_zona(&conn, &id, &pos, &actor)?)
        }),
        "desactivar_zona" => con_auditoria!(db, sesion, "desactivar_zona", {
            let id = str_req(args, "id")?;
            let actor = sesion.usuario_id()?;
            let conn = db.conn();
            ok(repo::catalogo::desactivar_zona(&conn, &id, &actor)?)
        }),

        // ============ Pasillo ============
        "listar_pasillos" => con_auditoria!(db, sesion, "listar_pasillos", {
            let conn = db.conn();
            puede(&conn, Some(&sesion.usuario_id()?), "pasillo", "ver")?;
            ok(query::listar(
                &conn,
                &query::PASILLO_SCHEMA,
                &params_de(args)?,
            )?)
        }),
        "crear_pasillo" => con_auditoria!(db, sesion, "crear_pasillo", {
            let mut nuevo: NuevoPasillo = de_req(args, "nuevo")?;
            nuevo.created_by = Some(sesion.usuario_id()?);
            let conn = db.conn();
            ok(repo::catalogo::crear_pasillo(&conn, &nuevo)?)
        }),
        "obtener_pasillo" => con_auditoria!(db, sesion, "obtener_pasillo", {
            let id = str_req(args, "id")?;
            let conn = db.conn();
            puede(&conn, Some(&sesion.usuario_id()?), "pasillo", "ver")?;
            ok(repo::catalogo::obtener_pasillo(&conn, &id)?)
        }),
        "editar_pasillo" => con_auditoria!(db, sesion, "editar_pasillo", {
            let id = str_req(args, "id")?;
            let cambios: EditarPasillo = de_req(args, "cambios")?;
            let actor = sesion.usuario_id()?;
            let conn = db.conn();
            ok(repo::catalogo::editar_pasillo(
                &conn, &id, &cambios, &actor,
            )?)
        }),
        "mover_pasillo" => con_auditoria!(db, sesion, "mover_pasillo", {
            let id = str_req(args, "id")?;
            let pos: PosicionMapa = de_req(args, "pos")?;
            let actor = sesion.usuario_id()?;
            let conn = db.conn();
            ok(repo::catalogo::mover_pasillo(&conn, &id, &pos, &actor)?)
        }),
        "desactivar_pasillo" => con_auditoria!(db, sesion, "desactivar_pasillo", {
            let id = str_req(args, "id")?;
            let actor = sesion.usuario_id()?;
            let conn = db.conn();
            ok(repo::catalogo::desactivar_pasillo(&conn, &id, &actor)?)
        }),

        // ============ Rack ============
        "listar_racks" => con_auditoria!(db, sesion, "listar_racks", {
            let conn = db.conn();
            puede(&conn, Some(&sesion.usuario_id()?), "rack", "ver")?;
            ok(query::listar(
                &conn,
                &query::RACK_SCHEMA,
                &params_de(args)?,
            )?)
        }),
        "crear_rack" => con_auditoria!(db, sesion, "crear_rack", {
            let mut nuevo: NuevoRack = de_req(args, "nuevo")?;
            nuevo.created_by = Some(sesion.usuario_id()?);
            let conn = db.conn();
            ok(repo::catalogo::crear_rack(&conn, &nuevo)?)
        }),
        "obtener_rack" => con_auditoria!(db, sesion, "obtener_rack", {
            let id = str_req(args, "id")?;
            let conn = db.conn();
            puede(&conn, Some(&sesion.usuario_id()?), "rack", "ver")?;
            ok(repo::catalogo::obtener_rack(&conn, &id)?)
        }),
        "editar_rack" => con_auditoria!(db, sesion, "editar_rack", {
            let id = str_req(args, "id")?;
            let cambios: EditarRack = de_req(args, "cambios")?;
            let actor = sesion.usuario_id()?;
            let conn = db.conn();
            ok(repo::catalogo::editar_rack(&conn, &id, &cambios, &actor)?)
        }),
        "mover_rack" => con_auditoria!(db, sesion, "mover_rack", {
            let id = str_req(args, "id")?;
            let pos: PosicionMapa = de_req(args, "pos")?;
            let actor = sesion.usuario_id()?;
            let conn = db.conn();
            ok(repo::catalogo::mover_rack(&conn, &id, &pos, &actor)?)
        }),
        "desactivar_rack" => con_auditoria!(db, sesion, "desactivar_rack", {
            let id = str_req(args, "id")?;
            let actor = sesion.usuario_id()?;
            let conn = db.conn();
            ok(repo::catalogo::desactivar_rack(&conn, &id, &actor)?)
        }),

        // ============ Sección ============
        "listar_secciones" => con_auditoria!(db, sesion, "listar_secciones", {
            let conn = db.conn();
            puede(&conn, Some(&sesion.usuario_id()?), "seccion", "ver")?;
            ok(query::listar(
                &conn,
                &query::SECCION_SCHEMA,
                &params_de(args)?,
            )?)
        }),
        "crear_seccion" => con_auditoria!(db, sesion, "crear_seccion", {
            let mut nuevo: NuevaSeccion = de_req(args, "nuevo")?;
            nuevo.created_by = Some(sesion.usuario_id()?);
            let conn = db.conn();
            ok(repo::catalogo::crear_seccion(&conn, &nuevo)?)
        }),
        "obtener_seccion" => con_auditoria!(db, sesion, "obtener_seccion", {
            let id = str_req(args, "id")?;
            let conn = db.conn();
            puede(&conn, Some(&sesion.usuario_id()?), "seccion", "ver")?;
            ok(repo::catalogo::obtener_seccion(&conn, &id)?)
        }),
        "editar_seccion" => con_auditoria!(db, sesion, "editar_seccion", {
            let id = str_req(args, "id")?;
            let cambios: EditarSeccion = de_req(args, "cambios")?;
            let actor = sesion.usuario_id()?;
            let conn = db.conn();
            ok(repo::catalogo::editar_seccion(
                &conn, &id, &cambios, &actor,
            )?)
        }),
        "desactivar_seccion" => con_auditoria!(db, sesion, "desactivar_seccion", {
            let id = str_req(args, "id")?;
            let actor = sesion.usuario_id()?;
            let conn = db.conn();
            ok(repo::catalogo::desactivar_seccion(&conn, &id, &actor)?)
        }),

        // ============ Ubicación ============
        "listar_ubicaciones" => con_auditoria!(db, sesion, "listar_ubicaciones", {
            let conn = db.conn();
            puede(&conn, Some(&sesion.usuario_id()?), "ubicacion", "ver")?;
            ok(query::listar(
                &conn,
                &query::UBICACION_SCHEMA,
                &params_de(args)?,
            )?)
        }),
        "crear_ubicacion" => con_auditoria!(db, sesion, "crear_ubicacion", {
            let mut nuevo: NuevaUbicacion = de_req(args, "nuevo")?;
            nuevo.created_by = Some(sesion.usuario_id()?);
            let conn = db.conn();
            ok(repo::catalogo::crear_ubicacion(&conn, &nuevo)?)
        }),
        "obtener_ubicacion" => con_auditoria!(db, sesion, "obtener_ubicacion", {
            let id = str_req(args, "id")?;
            let conn = db.conn();
            puede(&conn, Some(&sesion.usuario_id()?), "ubicacion", "ver")?;
            ok(repo::catalogo::obtener_ubicacion(&conn, &id)?)
        }),
        "editar_ubicacion" => con_auditoria!(db, sesion, "editar_ubicacion", {
            let id = str_req(args, "id")?;
            let cambios: EditarUbicacion = de_req(args, "cambios")?;
            let actor = sesion.usuario_id()?;
            let conn = db.conn();
            ok(repo::catalogo::editar_ubicacion(
                &conn, &id, &cambios, &actor,
            )?)
        }),
        "mover_ubicacion" => con_auditoria!(db, sesion, "mover_ubicacion", {
            let id = str_req(args, "id")?;
            let pos: PosicionMapa = de_req(args, "pos")?;
            let actor = sesion.usuario_id()?;
            let conn = db.conn();
            ok(repo::catalogo::mover_ubicacion(&conn, &id, &pos, &actor)?)
        }),
        // Modo construcción del mapa (SPEC §14, layout físico).
        "crear_en_mapa" => con_auditoria!(db, sesion, "crear_en_mapa", {
            let pedido: crate::mapa::CreacionEnMapa = de_req(args, "pedido")?;
            let actor = sesion.usuario_id()?;
            let conn = db.conn();
            ok(crate::mapa::crear_en_mapa(&conn, &pedido, &actor)?)
        }),
        "generar_layout_base" => con_auditoria!(db, sesion, "generar_layout_base", {
            let pedido: crate::mapa::LayoutBasePedido = de_req(args, "pedido")?;
            let actor = sesion.usuario_id()?;
            let conn = db.conn();
            ok(crate::mapa::generar_layout_base(&conn, &pedido, &actor)?)
        }),
        "desactivar_ubicacion" => con_auditoria!(db, sesion, "desactivar_ubicacion", {
            let id = str_req(args, "id")?;
            let actor = sesion.usuario_id()?;
            let conn = db.conn();
            ok(repo::catalogo::desactivar_ubicacion(
                &conn,
                &id,
                Some(&actor),
            )?)
        }),

        // ============ Caja ============
        "listar_cajas" => con_auditoria!(db, sesion, "listar_cajas", {
            let conn = db.conn();
            puede(&conn, Some(&sesion.usuario_id()?), "caja", "ver")?;
            ok(query::listar(
                &conn,
                &query::CAJA_SCHEMA,
                &params_de(args)?,
            )?)
        }),
        "crear_caja" => con_auditoria!(db, sesion, "crear_caja", {
            let mut nuevo: NuevaCaja = de_req(args, "nuevo")?;
            nuevo.created_by = Some(sesion.usuario_id()?);
            let conn = db.conn();
            ok(repo::catalogo::crear_caja(&conn, &nuevo)?)
        }),
        "obtener_caja" => con_auditoria!(db, sesion, "obtener_caja", {
            let id = str_req(args, "id")?;
            let conn = db.conn();
            puede(&conn, Some(&sesion.usuario_id()?), "caja", "ver")?;
            ok(repo::catalogo::obtener_caja(&conn, &id)?)
        }),
        "editar_caja" => con_auditoria!(db, sesion, "editar_caja", {
            let id = str_req(args, "id")?;
            let cambios: EditarCaja = de_req(args, "cambios")?;
            let actor = sesion.usuario_id()?;
            let conn = db.conn();
            ok(repo::catalogo::editar_caja(&conn, &id, &cambios, &actor)?)
        }),
        "desactivar_caja" => con_auditoria!(db, sesion, "desactivar_caja", {
            let id = str_req(args, "id")?;
            let actor = sesion.usuario_id()?;
            let conn = db.conn();
            ok(repo::catalogo::desactivar_caja(&conn, &id, &actor)?)
        }),

        // ============ Producto ============
        "listar_productos" => con_auditoria!(db, sesion, "listar_productos", {
            let conn = db.conn();
            puede(&conn, Some(&sesion.usuario_id()?), "producto", "ver")?;
            ok(query::listar(
                &conn,
                &query::PRODUCTO_SCHEMA,
                &params_de(args)?,
            )?)
        }),
        "crear_producto" => con_auditoria!(db, sesion, "crear_producto", {
            let mut nuevo: NuevoProducto = de_req(args, "nuevo")?;
            nuevo.created_by = Some(sesion.usuario_id()?);
            let conn = db.conn();
            ok(repo::catalogo::crear_producto(&conn, &nuevo)?)
        }),
        "obtener_producto" => con_auditoria!(db, sesion, "obtener_producto", {
            let id = str_req(args, "id")?;
            let conn = db.conn();
            puede(&conn, Some(&sesion.usuario_id()?), "producto", "ver")?;
            ok(repo::catalogo::obtener_producto(&conn, &id)?)
        }),
        "editar_producto" => con_auditoria!(db, sesion, "editar_producto", {
            let id = str_req(args, "id")?;
            let cambios: EditarProducto = de_req(args, "cambios")?;
            let actor = sesion.usuario_id()?;
            let conn = db.conn();
            ok(repo::catalogo::editar_producto(
                &conn, &id, &cambios, &actor,
            )?)
        }),
        "desactivar_producto" => con_auditoria!(db, sesion, "desactivar_producto", {
            let id = str_req(args, "id")?;
            let actor = sesion.usuario_id()?;
            let conn = db.conn();
            ok(repo::catalogo::desactivar_producto(&conn, &id, &actor)?)
        }),
        "buscar_producto_por_codigo_barras" => {
            con_auditoria!(db, sesion, "buscar_producto_por_codigo_barras", {
                let codigo_barras = str_req(args, "codigoBarras")?;
                let conn = db.conn();
                puede(&conn, Some(&sesion.usuario_id()?), "producto", "ver")?;
                ok(repo::catalogo::buscar_producto_por_codigo_barras(
                    &conn,
                    &codigo_barras,
                )?)
            })
        }
        "escanear" => {
            con_auditoria!(db, sesion, "escanear", {
                let entrada: repo::escaneo::EntradaEscaneo = de_req(args, "entrada")?;
                let actor = sesion.usuario_id()?;
                let conn = db.conn();
                if let Err(e) = puede(&conn, Some(&actor), "escaneo", "usar") {
                    let motivo = e.to_string();
                    let _ = repo::escaneo::registrar_denegado(&conn, &actor, &entrada, &motivo);
                    return Err(e);
                }
                ok(repo::escaneo::escanear(&conn, &actor, &entrada)?)
            })
        }
        "listar_eventos_escaneo" => {
            con_auditoria!(db, sesion, "listar_eventos_escaneo", {
                let limite: Option<i64> = de_opt(args, "limite");
                let conn = db.conn();
                puede(&conn, Some(&sesion.usuario_id()?), "escaneo", "ver")?;
                ok(repo::escaneo::listar_eventos(&conn, limite.unwrap_or(100))?)
            })
        }
        "metricas_escaneo" => {
            con_auditoria!(db, sesion, "metricas_escaneo", {
                let dias: Option<i64> = de_opt(args, "dias");
                let conn = db.conn();
                puede(&conn, Some(&sesion.usuario_id()?), "escaneo", "ver")?;
                ok(repo::escaneo::metricas(&conn, dias.unwrap_or(30))?)
            })
        }
        "listar_reglas" => con_auditoria!(db, sesion, "listar_reglas", {
            let conn = db.conn();
            puede(&conn, Some(&sesion.usuario_id()?), "regla", "ver")?;
            ok(repo::regla::listar(&conn)?)
        }),
        "obtener_regla" => con_auditoria!(db, sesion, "obtener_regla", {
            let id = str_req(args, "id")?;
            let conn = db.conn();
            puede(&conn, Some(&sesion.usuario_id()?), "regla", "ver")?;
            ok(repo::regla::obtener(&conn, &id)?)
        }),
        "crear_regla" => con_auditoria!(db, sesion, "crear_regla", {
            let mut nueva: crate::domain::regla::NuevaRegla = de_req(args, "nueva")?;
            let actor = sesion.usuario_id()?;
            let conn = db.conn();
            puede(&conn, Some(&actor), "regla", "crear")?;
            nueva.created_by = Some(actor);
            ok(repo::regla::crear(&conn, &nueva)?)
        }),
        "editar_regla" => con_auditoria!(db, sesion, "editar_regla", {
            let id = str_req(args, "id")?;
            let cambios: crate::domain::regla::NuevaRegla = de_req(args, "cambios")?;
            let actor = sesion.usuario_id()?;
            let conn = db.conn();
            puede(&conn, Some(&actor), "regla", "editar")?;
            ok(repo::regla::editar(&conn, &id, &cambios, &actor)?)
        }),
        "eliminar_regla" => con_auditoria!(db, sesion, "eliminar_regla", {
            let id = str_req(args, "id")?;
            let conn = db.conn();
            puede(&conn, Some(&sesion.usuario_id()?), "regla", "eliminar")?;
            ok(repo::regla::eliminar(&conn, &id)?)
        }),
        "simular_reglas" => con_auditoria!(db, sesion, "simular_reglas", {
            let producto_id = str_req(args, "productoId")?;
            let lote_id: Option<String> = de_opt(args, "loteId");
            let cantidad: i64 = de_opt(args, "cantidad").unwrap_or(1);
            let ubicacion_destino = str_req(args, "ubicacionDestino")?;
            let conn = db.conn();
            puede(&conn, Some(&sesion.usuario_id()?), "regla", "ver")?;
            ok(repo::regla::evaluar_entrada(
                &conn,
                &repo::regla::LineaEntrante {
                    producto_id: &producto_id,
                    lote_id: lote_id.as_deref(),
                    cantidad,
                    ubicacion_destino: &ubicacion_destino,
                },
            )?)
        }),
        "generar_etiquetas" => {
            con_auditoria!(db, sesion, "generar_etiquetas", {
                let peticion: repo::etiqueta::PeticionEtiquetas = de_req(args, "peticion")?;
                let conn = db.conn();
                let recurso = repo::etiqueta::recurso_de(&peticion.tipo)?;
                puede(&conn, Some(&sesion.usuario_id()?), recurso, "ver")?;
                ok(repo::etiqueta::generar(&conn, &peticion)?)
            })
        }
        "generar_tanda_etiquetas" => {
            con_auditoria!(db, sesion, "generar_tanda_etiquetas", {
                let peticion: repo::etiqueta::PeticionEtiquetas = de_req(args, "peticion")?;
                let conn = db.conn();
                let recurso = repo::etiqueta::recurso_de(&peticion.tipo)?;
                puede(&conn, Some(&sesion.usuario_id()?), recurso, "ver")?;
                ok(repo::etiqueta::generar_tanda(&conn, &peticion)?)
            })
        }
        "imprimir_etiquetas" => {
            con_auditoria!(db, sesion, "imprimir_etiquetas", {
                use crate::domain::etiqueta::Formato;
                let peticion: repo::etiqueta::PeticionEtiquetas = de_req(args, "peticion")?;
                let destino: repo::impresora::DestinoImpresora = de_req(args, "destino")?;
                let conn = db.conn();
                let recurso = repo::etiqueta::recurso_de(&peticion.tipo)?;
                puede(&conn, Some(&sesion.usuario_id()?), recurso, "ver")?;
                if !matches!(peticion.formato, Formato::Zpl | Formato::Epl) {
                    return Err(AppError::CampoInvalido(
                        "formato para impresión directa (una impresora térmica entiende ZPL o EPL, no PDF ni SVG)".into(),
                    ));
                }
                let tanda = repo::etiqueta::generar_tanda(&conn, &peticion)?;
                use base64::Engine as _;
                let bytes = base64::engine::general_purpose::STANDARD
                    .decode(&tanda.contenido_base64)
                    .unwrap_or_default();
                ok(repo::impresora::enviar(&destino, &bytes)?)
            })
        }
        "probar_impresora" => {
            con_auditoria!(db, sesion, "probar_impresora", {
                let destino: repo::impresora::DestinoImpresora = de_req(args, "destino")?;
                let conn = db.conn();
                puede(&conn, Some(&sesion.usuario_id()?), "configuracion", "ver")?;
                ok(repo::impresora::probar(&destino)?)
            })
        }
        "listar_etiquetables" => {
            con_auditoria!(db, sesion, "listar_etiquetables", {
                let tipo = str_req(args, "tipo")?;
                let busqueda: Option<String> = de_opt(args, "busqueda");
                let limite: Option<i64> = de_opt(args, "limite");
                let conn = db.conn();
                let recurso = repo::etiqueta::recurso_de(&tipo)?;
                puede(&conn, Some(&sesion.usuario_id()?), recurso, "ver")?;
                ok(repo::etiqueta::listar_etiquetables(
                    &conn,
                    &tipo,
                    busqueda.as_deref(),
                    limite.unwrap_or(100),
                )?)
            })
        }
        "importar_datos" => con_auditoria!(db, sesion, "importar_datos", {
            let tipo = str_req(args, "tipo")?;
            let filas: Vec<serde_json::Value> = de_req(args, "filas")?;
            let actor = sesion.usuario_id()?;
            let conn = db.conn();
            ok(crate::importar::importar_datos(
                &conn, &tipo, &filas, &actor,
            )?)
        }),

        // ============ Lote ============
        "listar_lotes" => con_auditoria!(db, sesion, "listar_lotes", {
            let conn = db.conn();
            puede(&conn, Some(&sesion.usuario_id()?), "lote", "ver")?;
            ok(query::listar(
                &conn,
                &query::LOTE_SCHEMA,
                &params_de(args)?,
            )?)
        }),
        "crear_lote" => con_auditoria!(db, sesion, "crear_lote", {
            let mut nuevo: NuevoLote = de_req(args, "nuevo")?;
            nuevo.created_by = Some(sesion.usuario_id()?);
            let conn = db.conn();
            ok(repo::catalogo::crear_lote(&conn, &nuevo)?)
        }),
        "obtener_lote" => con_auditoria!(db, sesion, "obtener_lote", {
            let id = str_req(args, "id")?;
            let conn = db.conn();
            puede(&conn, Some(&sesion.usuario_id()?), "lote", "ver")?;
            ok(repo::catalogo::obtener_lote(&conn, &id)?)
        }),
        "editar_lote" => con_auditoria!(db, sesion, "editar_lote", {
            let id = str_req(args, "id")?;
            let cambios: EditarLote = de_req(args, "cambios")?;
            let actor = sesion.usuario_id()?;
            let conn = db.conn();
            ok(repo::catalogo::editar_lote(&conn, &id, &cambios, &actor)?)
        }),

        // ============ Proveedor / Cliente ============
        "listar_proveedores" => con_auditoria!(db, sesion, "listar_proveedores", {
            let conn = db.conn();
            puede(&conn, Some(&sesion.usuario_id()?), "proveedor", "ver")?;
            ok(query::listar(
                &conn,
                &query::PROVEEDOR_SCHEMA,
                &params_de(args)?,
            )?)
        }),
        "crear_proveedor" => con_auditoria!(db, sesion, "crear_proveedor", {
            let mut nuevo: NuevoProveedor = de_req(args, "nuevo")?;
            nuevo.created_by = Some(sesion.usuario_id()?);
            let conn = db.conn();
            ok(repo::catalogo::crear_proveedor(&conn, &nuevo)?)
        }),
        "obtener_proveedor" => con_auditoria!(db, sesion, "obtener_proveedor", {
            let id = str_req(args, "id")?;
            let conn = db.conn();
            puede(&conn, Some(&sesion.usuario_id()?), "proveedor", "ver")?;
            ok(repo::catalogo::obtener_proveedor(&conn, &id)?)
        }),
        "editar_proveedor" => con_auditoria!(db, sesion, "editar_proveedor", {
            let id = str_req(args, "id")?;
            let cambios: EditarProveedor = de_req(args, "cambios")?;
            let actor = sesion.usuario_id()?;
            let conn = db.conn();
            ok(repo::catalogo::editar_proveedor(
                &conn, &id, &cambios, &actor,
            )?)
        }),
        "desactivar_proveedor" => con_auditoria!(db, sesion, "desactivar_proveedor", {
            let id = str_req(args, "id")?;
            let actor = sesion.usuario_id()?;
            let conn = db.conn();
            ok(repo::catalogo::desactivar_proveedor(&conn, &id, &actor)?)
        }),
        "listar_clientes" => con_auditoria!(db, sesion, "listar_clientes", {
            let conn = db.conn();
            puede(&conn, Some(&sesion.usuario_id()?), "cliente", "ver")?;
            ok(query::listar(
                &conn,
                &query::CLIENTE_SCHEMA,
                &params_de(args)?,
            )?)
        }),
        "crear_cliente" => con_auditoria!(db, sesion, "crear_cliente", {
            let mut nuevo: NuevoCliente = de_req(args, "nuevo")?;
            nuevo.created_by = Some(sesion.usuario_id()?);
            let conn = db.conn();
            ok(repo::catalogo::crear_cliente(&conn, &nuevo)?)
        }),
        "obtener_cliente" => con_auditoria!(db, sesion, "obtener_cliente", {
            let id = str_req(args, "id")?;
            let conn = db.conn();
            puede(&conn, Some(&sesion.usuario_id()?), "cliente", "ver")?;
            ok(repo::catalogo::obtener_cliente(&conn, &id)?)
        }),
        "editar_cliente" => con_auditoria!(db, sesion, "editar_cliente", {
            let id = str_req(args, "id")?;
            let cambios: EditarCliente = de_req(args, "cambios")?;
            let actor = sesion.usuario_id()?;
            let conn = db.conn();
            ok(repo::catalogo::editar_cliente(
                &conn, &id, &cambios, &actor,
            )?)
        }),
        "desactivar_cliente" => con_auditoria!(db, sesion, "desactivar_cliente", {
            let id = str_req(args, "id")?;
            let actor = sesion.usuario_id()?;
            let conn = db.conn();
            ok(repo::catalogo::desactivar_cliente(&conn, &id, &actor)?)
        }),

        // ============ UOM / Categoría ============
        "listar_uoms" => con_auditoria!(db, sesion, "listar_uoms", {
            let conn = db.conn();
            puede(&conn, Some(&sesion.usuario_id()?), "uom", "ver")?;
            ok(query::listar(&conn, &query::UOM_SCHEMA, &params_de(args)?)?)
        }),
        "crear_uom" => con_auditoria!(db, sesion, "crear_uom", {
            let nuevo: NuevaUom = de_req(args, "nuevo")?;
            let actor = sesion.usuario_id()?;
            let conn = db.conn();
            ok(repo::catalogo::crear_uom(&conn, &nuevo, &actor)?)
        }),
        "obtener_uom" => con_auditoria!(db, sesion, "obtener_uom", {
            let id = str_req(args, "id")?;
            let conn = db.conn();
            puede(&conn, Some(&sesion.usuario_id()?), "uom", "ver")?;
            ok(repo::catalogo::obtener_uom(&conn, &id)?)
        }),
        "editar_uom" => con_auditoria!(db, sesion, "editar_uom", {
            let id = str_req(args, "id")?;
            let cambios: EditarUom = de_req(args, "cambios")?;
            let actor = sesion.usuario_id()?;
            let conn = db.conn();
            ok(repo::catalogo::editar_uom(&conn, &id, &cambios, &actor)?)
        }),
        "desactivar_uom" => con_auditoria!(db, sesion, "desactivar_uom", {
            let id = str_req(args, "id")?;
            let actor = sesion.usuario_id()?;
            let conn = db.conn();
            ok(repo::catalogo::desactivar_uom(&conn, &id, &actor)?)
        }),
        "listar_categorias" => con_auditoria!(db, sesion, "listar_categorias", {
            let conn = db.conn();
            puede(&conn, Some(&sesion.usuario_id()?), "categoria", "ver")?;
            ok(query::listar(
                &conn,
                &query::CATEGORIA_SCHEMA,
                &params_de(args)?,
            )?)
        }),
        "crear_categoria" => con_auditoria!(db, sesion, "crear_categoria", {
            let mut nuevo: NuevaCategoria = de_req(args, "nuevo")?;
            nuevo.created_by = Some(sesion.usuario_id()?);
            let conn = db.conn();
            ok(repo::catalogo::crear_categoria(&conn, &nuevo)?)
        }),
        "obtener_categoria" => con_auditoria!(db, sesion, "obtener_categoria", {
            let id = str_req(args, "id")?;
            let conn = db.conn();
            puede(&conn, Some(&sesion.usuario_id()?), "categoria", "ver")?;
            ok(repo::catalogo::obtener_categoria(&conn, &id)?)
        }),
        "editar_categoria" => con_auditoria!(db, sesion, "editar_categoria", {
            let id = str_req(args, "id")?;
            let cambios: EditarCategoria = de_req(args, "cambios")?;
            let actor = sesion.usuario_id()?;
            let conn = db.conn();
            ok(repo::catalogo::editar_categoria(
                &conn, &id, &cambios, &actor,
            )?)
        }),
        "desactivar_categoria" => con_auditoria!(db, sesion, "desactivar_categoria", {
            let id = str_req(args, "id")?;
            let actor = sesion.usuario_id()?;
            let conn = db.conn();
            ok(repo::catalogo::desactivar_categoria(&conn, &id, &actor)?)
        }),

        // ============ Usuarios / Roles ============
        "listar_usuarios" => con_auditoria!(db, sesion, "listar_usuarios", {
            let conn = db.conn();
            puede(&conn, Some(&sesion.usuario_id()?), "usuario", "ver")?;
            ok(query::listar(
                &conn,
                &query::USUARIO_SCHEMA,
                &params_de(args)?,
            )?)
        }),
        "crear_usuario" => con_auditoria!(db, sesion, "crear_usuario", {
            let mut nuevo: NuevoUsuario = de_req(args, "nuevo")?;
            nuevo.created_by = Some(sesion.usuario_id()?);
            let conn = db.conn();
            ok(repo::seguridad::crear_usuario(&conn, &nuevo)?)
        }),
        "obtener_usuario" => con_auditoria!(db, sesion, "obtener_usuario", {
            let id = str_req(args, "id")?;
            let conn = db.conn();
            puede(&conn, Some(&sesion.usuario_id()?), "usuario", "ver")?;
            ok(repo::seguridad::obtener_usuario(&conn, &id)?)
        }),
        "listar_roles" => con_auditoria!(db, sesion, "listar_roles", {
            let conn = db.conn();
            puede(&conn, Some(&sesion.usuario_id()?), "rol", "ver")?;
            ok(repo::seguridad::listar_roles(&conn)?)
        }),
        "editar_rol" => con_auditoria!(db, sesion, "editar_rol", {
            let id = str_req(args, "id")?;
            let descripcion = str_req(args, "descripcion")?;
            let actor = sesion.usuario_id()?;
            let conn = db.conn();
            ok(repo::seguridad::editar_rol(
                &conn,
                &id,
                &descripcion,
                &actor,
            )?)
        }),
        "editar_usuario" => con_auditoria!(db, sesion, "editar_usuario", {
            let id = str_req(args, "id")?;
            let cambios: crate::domain::seguridad::EditarUsuario = de_req(args, "cambios")?;
            let actor = sesion.usuario_id()?;
            let conn = db.conn();
            ok(repo::seguridad::editar_usuario(
                &conn, &id, &cambios, &actor,
            )?)
        }),
        "desactivar_usuario" => con_auditoria!(db, sesion, "desactivar_usuario", {
            let id = str_req(args, "id")?;
            let actor = sesion.usuario_id()?;
            let conn = db.conn();
            ok(repo::seguridad::desactivar_usuario(&conn, &id, &actor)?)
        }),
        "reactivar_usuario" => con_auditoria!(db, sesion, "reactivar_usuario", {
            let id = str_req(args, "id")?;
            let actor = sesion.usuario_id()?;
            let conn = db.conn();
            ok(repo::seguridad::reactivar_usuario(&conn, &id, &actor)?)
        }),
        "cambiar_password" => con_auditoria!(db, sesion, "cambiar_password", {
            let password_actual = str_req(args, "passwordActual")?;
            let password_nueva = str_req(args, "passwordNueva")?;
            let actor = sesion.usuario_id()?;
            let conn = db.conn();
            ok(repo::seguridad::cambiar_password_propia(
                &conn,
                &actor,
                &password_actual,
                &password_nueva,
            )?)
        }),
        "cambiar_password_admin" => con_auditoria!(db, sesion, "cambiar_password_admin", {
            let id = str_req(args, "id")?;
            let password_nueva = str_req(args, "passwordNueva")?;
            let actor = sesion.usuario_id()?;
            let conn = db.conn();
            ok(repo::seguridad::cambiar_password_admin(
                &conn,
                &id,
                &password_nueva,
                &actor,
            )?)
        }),

        // ============ Configuración de empresa y preferencias ============
        "obtener_configuracion_empresa" => {
            con_auditoria!(db, sesion, "obtener_configuracion_empresa", {
                let conn = db.conn();
                puede(&conn, Some(&sesion.usuario_id()?), "configuracion", "ver")?;
                ok(repo::configuracion::obtener_configuracion_empresa(&conn)?)
            })
        }
        "mis_permisos" => ok(crate::security::permisos_de(
            &db.conn(),
            &sesion.usuario_id()?,
        )?),

        // Copias de seguridad: mismo permiso y misma lógica que en
        // `commands.rs` — esta capa nunca decide nada por su cuenta.
        "crear_copia_seguridad" => {
            con_auditoria!(db, sesion, "crear_copia_seguridad", {
                let conn = db.conn();
                puede(
                    &conn,
                    Some(&sesion.usuario_id()?),
                    "configuracion",
                    "editar",
                )?;
                let config = Config::cargar()?;
                ok(repo::backup::crear(
                    &conn,
                    &config.directorio_backup(),
                    config.backup.retener,
                )?)
            })
        }
        "listar_copias_seguridad" => {
            con_auditoria!(db, sesion, "listar_copias_seguridad", {
                let conn = db.conn();
                puede(
                    &conn,
                    Some(&sesion.usuario_id()?),
                    "configuracion",
                    "editar",
                )?;
                ok(repo::backup::listar(
                    &Config::cargar()?.directorio_backup(),
                )?)
            })
        }
        "restaurar_copia_seguridad" => {
            con_auditoria!(db, sesion, "restaurar_copia_seguridad", {
                let conn = db.conn();
                puede(
                    &conn,
                    Some(&sesion.usuario_id()?),
                    "configuracion",
                    "editar",
                )?;
                let config = Config::cargar()?;
                let directorio = config.directorio_backup();
                let origen = repo::backup::ruta_de(&directorio, &str_req(args, "nombre")?)?;
                ok(repo::backup::restaurar(
                    &conn,
                    &origen,
                    &config.ruta_datos(),
                    &directorio,
                )?)
            })
        }
        "guardar_configuracion_empresa" => {
            con_auditoria!(db, sesion, "guardar_configuracion_empresa", {
                let cambios: crate::domain::configuracion::EditarConfiguracionEmpresa =
                    de_req(args, "cambios")?;
                let actor = sesion.usuario_id()?;
                let conn = db.conn();
                puede(&conn, Some(&actor), "configuracion", "editar")?;
                ok(repo::configuracion::guardar_configuracion_empresa(
                    &conn, &cambios, &actor,
                )?)
            })
        }
        "obtener_preferencias_usuario" => {
            con_auditoria!(db, sesion, "obtener_preferencias_usuario", {
                let actor = sesion.usuario_id()?;
                let conn = db.conn();
                ok(repo::configuracion::preferencias_resueltas(&conn, &actor)?)
            })
        }
        "guardar_preferencias_usuario" => {
            con_auditoria!(db, sesion, "guardar_preferencias_usuario", {
                let cambios: crate::domain::configuracion::EditarPreferenciasUsuario =
                    de_req(args, "cambios")?;
                let actor = sesion.usuario_id()?;
                let conn = db.conn();
                repo::configuracion::guardar_preferencias_usuario(&conn, &actor, &cambios)?;
                ok(repo::configuracion::preferencias_resueltas(&conn, &actor)?)
            })
        }

        // ============ Temas de la UI (DESIGN §3.1) ============
        "listar_temas" => con_auditoria!(db, sesion, "listar_temas", {
            sesion.usuario_id()?;
            ok(crate::domain::tema::listar_temas())
        }),
        "obtener_tema" => con_auditoria!(db, sesion, "obtener_tema", {
            sesion.usuario_id()?;
            // Convención del dispatcher HTTP: claves camelCase tal como las
            // envía `invoke` (backend.ts). En modo Tauri el puente IPC traduce
            // `temaId` → `tema_id`; aquí la clave viaja literal.
            let tema_id = str_req(args, "temaId")?;
            let modo_oscuro = bool_opt(args, "modoOscuro").unwrap_or(false);
            let modo = if modo_oscuro {
                crate::domain::tema::ModoColor::Oscuro
            } else {
                crate::domain::tema::ModoColor::Claro
            };
            ok(crate::domain::tema::obtener_tema(&tema_id, modo)
                .ok_or_else(|| AppError::CampoInvalido(format!("tema '{tema_id}' no existe")))?)
        }),
        "obtener_tema_activo" => con_auditoria!(db, sesion, "obtener_tema_activo", {
            let actor = sesion.usuario_id()?;
            let conn = db.conn();
            ok(repo::configuracion::tema_activo_de_usuario(&conn, &actor)?)
        }),
        "obtener_tema_global" => {
            let conn = db.conn();
            let config = repo::configuracion::obtener_configuracion_empresa(&conn)?;
            let modo = if config.modo_oscuro {
                crate::domain::tema::ModoColor::Oscuro
            } else {
                crate::domain::tema::ModoColor::Claro
            };
            ok(
                crate::domain::tema::obtener_tema(&config.tema_id, modo).ok_or_else(|| {
                    AppError::CampoInvalido(format!("tema '{}' no existe", config.tema_id))
                })?,
            )
        }

        // ============ Sucursales (config de empresa, solo ADMIN) ============
        "listar_sucursales" => con_auditoria!(db, sesion, "listar_sucursales", {
            let conn = db.conn();
            puede(&conn, Some(&sesion.usuario_id()?), "configuracion", "ver")?;
            ok(repo::sucursal::listar_sucursales(&conn)?)
        }),
        "crear_sucursal" => con_auditoria!(db, sesion, "crear_sucursal", {
            let mut nuevo: crate::domain::configuracion::NuevaSucursal = de_req(args, "nuevo")?;
            let actor = sesion.usuario_id()?;
            let conn = db.conn();
            puede(&conn, Some(&actor), "configuracion", "editar")?;
            nuevo.created_by = Some(actor);
            ok(repo::sucursal::crear_sucursal(&conn, &nuevo)?)
        }),
        "obtener_sucursal" => con_auditoria!(db, sesion, "obtener_sucursal", {
            let id = str_req(args, "id")?;
            let conn = db.conn();
            puede(&conn, Some(&sesion.usuario_id()?), "configuracion", "ver")?;
            ok(repo::sucursal::obtener_sucursal(&conn, &id)?)
        }),
        "editar_sucursal" => con_auditoria!(db, sesion, "editar_sucursal", {
            let id = str_req(args, "id")?;
            let cambios: crate::domain::configuracion::EditarSucursal = de_req(args, "cambios")?;
            let actor = sesion.usuario_id()?;
            let conn = db.conn();
            puede(&conn, Some(&actor), "configuracion", "editar")?;
            ok(repo::sucursal::editar_sucursal(
                &conn, &id, &cambios, &actor,
            )?)
        }),
        "desactivar_sucursal" => con_auditoria!(db, sesion, "desactivar_sucursal", {
            let id = str_req(args, "id")?;
            let actor = sesion.usuario_id()?;
            let conn = db.conn();
            puede(&conn, Some(&actor), "configuracion", "editar")?;
            ok(repo::sucursal::desactivar_sucursal(&conn, &id, &actor)?)
        }),

        // ============ Archivos de empresa (logo + documentos, solo ADMIN) ============
        "listar_archivos_empresa" => con_auditoria!(db, sesion, "listar_archivos_empresa", {
            let conn = db.conn();
            puede(&conn, Some(&sesion.usuario_id()?), "configuracion", "ver")?;
            ok(repo::archivo::listar_archivos(&conn)?)
        }),
        "subir_archivo_empresa" => con_auditoria!(db, sesion, "subir_archivo_empresa", {
            let mut nuevo: crate::domain::configuracion::NuevoArchivoEmpresa =
                de_req(args, "nuevo")?;
            let actor = sesion.usuario_id()?;
            let conn = db.conn();
            puede(&conn, Some(&actor), "configuracion", "editar")?;
            nuevo.created_by = Some(actor);
            ok(repo::archivo::subir_archivo(&conn, &nuevo)?)
        }),
        "obtener_archivo_empresa" => con_auditoria!(db, sesion, "obtener_archivo_empresa", {
            let id = str_req(args, "id")?;
            let conn = db.conn();
            puede(&conn, Some(&sesion.usuario_id()?), "configuracion", "ver")?;
            ok(repo::archivo::obtener_archivo_completo(&conn, &id)?)
        }),
        "obtener_logo_empresa" => con_auditoria!(db, sesion, "obtener_logo_empresa", {
            let conn = db.conn();
            puede(&conn, Some(&sesion.usuario_id()?), "configuracion", "ver")?;
            let meta = repo::archivo::obtener_logo(&conn)?;
            let completo = match meta {
                Some(m) => repo::archivo::obtener_archivo_completo(&conn, &m.id)?,
                None => None,
            };
            ok(completo)
        }),
        "eliminar_archivo_empresa" => con_auditoria!(db, sesion, "eliminar_archivo_empresa", {
            let id = str_req(args, "id")?;
            let actor = sesion.usuario_id()?;
            let conn = db.conn();
            puede(&conn, Some(&actor), "configuracion", "editar")?;
            ok(repo::archivo::eliminar_archivo(&conn, &id, &actor)?)
        }),

        // ============ Movimientos ============
        "crear_movimiento" => con_auditoria!(db, sesion, "crear_movimiento", {
            let mut nuevo: NuevoMovimiento = de_req(args, "nuevo")?;
            nuevo.created_by = sesion.usuario_id()?;
            let conn = db.conn();
            ok(repo::movimiento::crear_movimiento(&conn, &nuevo)?)
        }),
        "crear_traslado" => con_auditoria!(db, sesion, "crear_traslado", {
            let mut nuevo: NuevoTraslado = de_req(args, "nuevo")?;
            nuevo.created_by = sesion.usuario_id()?;
            let conn = db.conn();
            ok(repo::movimiento::crear_traslado(&conn, &nuevo)?)
        }),
        "editar_movimiento" => con_auditoria!(db, sesion, "editar_movimiento", {
            let id = str_req(args, "id")?;
            let cambios: EditarMovimiento = de_req(args, "cambios")?;
            let actor = sesion.usuario_id()?;
            let conn = db.conn();
            ok(repo::movimiento::editar_movimiento(
                &conn, &id, &cambios, &actor,
            )?)
        }),
        "enviar_a_aprobacion" => con_auditoria!(db, sesion, "enviar_a_aprobacion", {
            let id = str_req(args, "id")?;
            let actor = sesion.usuario_id()?;
            let conn = db.conn();
            ok(repo::movimiento::enviar_a_aprobacion(&conn, &id, &actor)?)
        }),
        "aprobar_movimiento" => con_auditoria!(db, sesion, "aprobar_movimiento", {
            let id = str_req(args, "id")?;
            let actor = sesion.usuario_id()?;
            let conn = db.conn();
            ok(repo::movimiento::aprobar_movimiento(&conn, &id, &actor)?)
        }),
        "anular_movimiento" => con_auditoria!(db, sesion, "anular_movimiento", {
            let id = str_req(args, "id")?;
            let actor = sesion.usuario_id()?;
            let conn = db.conn();
            ok(repo::movimiento::anular_movimiento(&conn, &id, &actor)?)
        }),
        "listar_movimientos" => con_auditoria!(db, sesion, "listar_movimientos", {
            let conn = db.conn();
            puede(&conn, Some(&sesion.usuario_id()?), "movimiento", "ver")?;
            ok(query::listar(
                &conn,
                &query::MOVIMIENTO_SCHEMA,
                &params_de(args)?,
            )?)
        }),
        "obtener_movimiento" => con_auditoria!(db, sesion, "obtener_movimiento", {
            let id = str_req(args, "id")?;
            let conn = db.conn();
            puede(&conn, Some(&sesion.usuario_id()?), "movimiento", "ver")?;
            ok(repo::movimiento::obtener_movimiento(&conn, &id)?)
        }),
        "listar_lineas_movimiento" => con_auditoria!(db, sesion, "listar_lineas_movimiento", {
            let movimiento_id = str_req(args, "movimientoId")?;
            let mut params = params_de(args)?;
            let conn = db.conn();
            puede(&conn, Some(&sesion.usuario_id()?), "movimiento", "ver")?;
            let mut filtros = params.filters.take().unwrap_or_default();
            filtros.push(format!("movimiento_id:eq:{movimiento_id}"));
            params.filters = Some(filtros);
            ok(query::listar(
                &conn,
                &query::MOVIMIENTO_LINEA_SCHEMA,
                &params,
            )?)
        }),
        "listar_saldos" => con_auditoria!(db, sesion, "listar_saldos", {
            let ubicacion_id = str_opt(args, "ubicacionId");
            let producto_id = str_opt(args, "productoId");
            let conn = db.conn();
            puede(&conn, Some(&sesion.usuario_id()?), "producto", "ver")?;
            ok(repo::movimiento::listar_saldos(
                &conn,
                ubicacion_id.as_deref(),
                producto_id.as_deref(),
            )?)
        }),
        "stock_total_producto" => con_auditoria!(db, sesion, "stock_total_producto", {
            let producto_id = str_req(args, "productoId")?;
            let conn = db.conn();
            puede(&conn, Some(&sesion.usuario_id()?), "producto", "ver")?;
            ok(repo::movimiento::stock_total_producto(&conn, &producto_id)?)
        }),
        "sugerir_lineas_salida" => con_auditoria!(db, sesion, "sugerir_lineas_salida", {
            let producto_id = str_req(args, "productoId")?;
            let cantidad = i64_req(args, "cantidad")?;
            let ubicaciones: Option<Vec<String>> = de_opt(args, "ubicaciones");
            let sub_tipo = str_req(args, "subTipo")?;
            let conn = db.conn();
            puede(&conn, Some(&sesion.usuario_id()?), "movimiento", "ver")?;
            let excluir_vencidos = matches!(sub_tipo.as_str(), "CLIENTE" | "DEVOLUCION_PROVEEDOR");
            ok(repo::movimiento::sugerir_lineas_salida(
                &conn,
                &producto_id,
                cantidad,
                ubicaciones.as_deref(),
                excluir_vencidos,
            )?)
        }),

        // ============ Inventario físico ============
        "crear_sesion_inventario" => con_auditoria!(db, sesion, "crear_sesion_inventario", {
            let mut nuevo: NuevaSesionInventario = de_req(args, "nuevo")?;
            nuevo.created_by = sesion.usuario_id()?;
            let conn = db.conn();
            ok(repo::inventario::crear_sesion(&conn, &nuevo)?)
        }),
        "listar_sesiones_inventario" => con_auditoria!(db, sesion, "listar_sesiones_inventario", {
            let conn = db.conn();
            puede(&conn, Some(&sesion.usuario_id()?), "inventario", "ver")?;
            ok(query::listar(
                &conn,
                &query::SESION_INVENTARIO_SCHEMA,
                &params_de(args)?,
            )?)
        }),
        "obtener_sesion_inventario" => con_auditoria!(db, sesion, "obtener_sesion_inventario", {
            let id = str_req(args, "id")?;
            let conn = db.conn();
            puede(&conn, Some(&sesion.usuario_id()?), "inventario", "ver")?;
            ok(repo::inventario::obtener_sesion(&conn, &id)?)
        }),
        "iniciar_sesion_inventario" => con_auditoria!(db, sesion, "iniciar_sesion_inventario", {
            let id = str_req(args, "id")?;
            let actor = sesion.usuario_id()?;
            let conn = db.conn();
            ok(repo::inventario::iniciar_sesion(&conn, &id, &actor)?)
        }),
        "registrar_conteo" => con_auditoria!(db, sesion, "registrar_conteo", {
            let mut nuevo: NuevoConteo = de_req(args, "nuevo")?;
            nuevo.usuario_contador_id = sesion.usuario_id()?;
            let conn = db.conn();
            ok(repo::inventario::registrar_conteo(&conn, &nuevo)?)
        }),
        "listar_conteos" => con_auditoria!(db, sesion, "listar_conteos", {
            let sesion_id = str_req(args, "sesionId")?;
            let conn = db.conn();
            puede(&conn, Some(&sesion.usuario_id()?), "inventario", "ver")?;
            ok(repo::inventario::listar_conteos(&conn, &sesion_id)?)
        }),
        "diferencias_sesion" => con_auditoria!(db, sesion, "diferencias_sesion", {
            let sesion_id = str_req(args, "sesionId")?;
            let conn = db.conn();
            puede(&conn, Some(&sesion.usuario_id()?), "inventario", "ver")?;
            ok(repo::inventario::diferencias_sesion(&conn, &sesion_id)?)
        }),
        "cerrar_sesion_inventario" => con_auditoria!(db, sesion, "cerrar_sesion_inventario", {
            let sesion_id = str_req(args, "sesionId")?;
            let actor = sesion.usuario_id()?;
            let conn = db.conn();
            ok(repo::inventario::cerrar_sesion(&conn, &sesion_id, &actor)?)
        }),
        "anular_sesion_inventario" => con_auditoria!(db, sesion, "anular_sesion_inventario", {
            let sesion_id = str_req(args, "sesionId")?;
            let actor = sesion.usuario_id()?;
            let conn = db.conn();
            ok(repo::inventario::anular_sesion(&conn, &sesion_id, &actor)?)
        }),

        // ============ Comentarios ============
        "crear_comentario" => con_auditoria!(db, sesion, "crear_comentario", {
            let mut nuevo: NuevoComentario = de_req(args, "nuevo")?;
            nuevo.usuario_id = sesion.usuario_id()?;
            let conn = db.conn();
            ok(repo::comentario::crear_comentario(&conn, &nuevo)?)
        }),
        "listar_comentarios" => con_auditoria!(db, sesion, "listar_comentarios", {
            let entidad = str_req(args, "entidad")?;
            let entidad_id = str_req(args, "entidadId")?;
            let actor = sesion.usuario_id()?;
            let conn = db.conn();
            ok(repo::comentario::listar_comentarios(
                &conn,
                &entidad,
                &entidad_id,
                &actor,
            )?)
        }),
        "editar_comentario" => con_auditoria!(db, sesion, "editar_comentario", {
            let id = str_req(args, "id")?;
            let texto = str_req(args, "texto")?;
            let actor = sesion.usuario_id()?;
            let conn = db.conn();
            ok(repo::comentario::editar_comentario(
                &conn, &id, &texto, &actor,
            )?)
        }),
        "listar_historial_comentario" => {
            con_auditoria!(db, sesion, "listar_historial_comentario", {
                let comentario_id = str_req(args, "comentarioId")?;
                sesion.usuario_id()?;
                let conn = db.conn();
                ok(repo::comentario::listar_historial_comentario(
                    &conn,
                    &comentario_id,
                )?)
            })
        }
        "ocultar_comentario" => con_auditoria!(db, sesion, "ocultar_comentario", {
            let id = str_req(args, "id")?;
            let actor = sesion.usuario_id()?;
            let conn = db.conn();
            ok(repo::comentario::ocultar_comentario(&conn, &id, &actor)?)
        }),

        // ============ Trazabilidad ============
        "donde_esta_lote" => con_auditoria!(db, sesion, "donde_esta_lote", {
            let lote_id = str_req(args, "loteId")?;
            let actor = sesion.usuario_id()?;
            let conn = db.conn();
            ok(repo::trazabilidad::donde_esta_lote(
                &conn, &lote_id, &actor,
            )?)
        }),
        "origen_de_salida" => con_auditoria!(db, sesion, "origen_de_salida", {
            let movimiento_id = str_req(args, "movimientoId")?;
            let actor = sesion.usuario_id()?;
            let conn = db.conn();
            ok(repo::trazabilidad::origen_de_salida(
                &conn,
                &movimiento_id,
                &actor,
            )?)
        }),
        "movimientos_de_producto_en_rango" => {
            con_auditoria!(db, sesion, "movimientos_de_producto_en_rango", {
                let producto_id = str_req(args, "productoId")?;
                let desde = str_req(args, "desde")?;
                let hasta = str_req(args, "hasta")?;
                let actor = sesion.usuario_id()?;
                let conn = db.conn();
                ok(repo::trazabilidad::movimientos_de_producto_en_rango(
                    &conn,
                    &producto_id,
                    &desde,
                    &hasta,
                    &actor,
                )?)
            })
        }
        "lotes_por_vencer" => con_auditoria!(db, sesion, "lotes_por_vencer", {
            let dias = i64_opt(args, "dias").unwrap_or(30);
            let actor = sesion.usuario_id()?;
            let conn = db.conn();
            ok(repo::trazabilidad::lotes_por_vencer(&conn, dias, &actor)?)
        }),
        "vencimientos_por_rango" => con_auditoria!(db, sesion, "vencimientos_por_rango", {
            let actor = sesion.usuario_id()?;
            let conn = db.conn();
            ok(repo::trazabilidad::vencimientos_por_rango(&conn, &actor)?)
        }),
        "historial_caja" => con_auditoria!(db, sesion, "historial_caja", {
            let caja_id = str_req(args, "cajaId")?;
            let actor = sesion.usuario_id()?;
            let conn = db.conn();
            ok(repo::trazabilidad::historial_caja(&conn, &caja_id, &actor)?)
        }),

        // ============ Alertas ============
        "listar_alertas" => con_auditoria!(db, sesion, "listar_alertas", {
            let estado = str_opt(args, "estado");
            let dias_por_vencer = i64_opt(args, "diasPorVencer");
            let actor = sesion.usuario_id()?;
            let conn = db.conn();
            let dias = repo::configuracion::dias_aviso_o_por_defecto(&conn, dias_por_vencer)?;
            repo::alerta::regenerar_alertas(&conn, dias)?;
            ok(repo::alerta::listar_alertas(
                &conn,
                estado.as_deref(),
                &actor,
            )?)
        }),
        "resolver_alerta" => con_auditoria!(db, sesion, "resolver_alerta", {
            let id = str_req(args, "id")?;
            let actor = sesion.usuario_id()?;
            let conn = db.conn();
            ok(repo::alerta::resolver_alerta(&conn, &id, &actor)?)
        }),
        "ignorar_alerta" => con_auditoria!(db, sesion, "ignorar_alerta", {
            let id = str_req(args, "id")?;
            let actor = sesion.usuario_id()?;
            let conn = db.conn();
            ok(repo::alerta::ignorar_alerta(&conn, &id, &actor)?)
        }),

        // ============ Reportes y KPIs ============
        "obtener_dashboard" => con_auditoria!(db, sesion, "obtener_dashboard", {
            let conn = db.conn();
            puede(&conn, Some(&sesion.usuario_id()?), "reporte", "ver")?;
            ok(repo::reporte::dashboard(&conn)?)
        }),
        "obtener_kpis_generales" => con_auditoria!(db, sesion, "obtener_kpis_generales", {
            let conn = db.conn();
            puede(&conn, Some(&sesion.usuario_id()?), "reporte", "ver")?;
            ok(repo::reporte::kpis_generales(&conn)?)
        }),
        "desempeno_usuarios" => con_auditoria!(db, sesion, "desempeno_usuarios", {
            let desde = str_opt(args, "desde");
            let hasta = str_opt(args, "hasta");
            let conn = db.conn();
            puede(&conn, Some(&sesion.usuario_id()?), "reporte", "ver")?;
            ok(repo::reporte::desempeno_usuarios(
                &conn,
                desde.as_deref(),
                hasta.as_deref(),
            )?)
        }),
        "kardex_producto" => con_auditoria!(db, sesion, "kardex_producto", {
            let producto_id = str_req(args, "productoId")?;
            let lote_id = str_opt(args, "loteId");
            let conn = db.conn();
            puede(&conn, Some(&sesion.usuario_id()?), "producto", "ver")?;
            ok(repo::reporte::kardex_producto(
                &conn,
                &producto_id,
                lote_id.as_deref(),
            )?)
        }),
        "precision_sesion" => con_auditoria!(db, sesion, "precision_sesion", {
            let sesion_id = str_req(args, "sesionId")?;
            let conn = db.conn();
            puede(&conn, Some(&sesion.usuario_id()?), "inventario", "ver")?;
            ok(repo::inventario::precision_sesion(&conn, &sesion_id)?)
        }),

        // ============ Historial y métricas ============
        "registrar_vista" => {
            // Tracking de navegación: es el propio registro de auditoría, por
            // eso no pasa por `con_auditoria!` (no duplica filas por visita).
            let vista: crate::domain::seguridad::RegistrarVista = de_req(args, "vista")?;
            vista.validar()?;
            let actor = sesion.usuario_id()?;
            let conn = db.conn();
            ok(repo::auditoria::registrar_vista(&conn, &actor, &vista)?)
        }
        "listar_historial" => con_auditoria!(db, sesion, "listar_historial", {
            let usuario_id = str_opt(args, "usuarioId");
            let comando_f = str_opt(args, "comando");
            let nivel = str_opt(args, "nivel");
            let tipo_evento = str_opt(args, "tipoEvento");
            let modulo = str_opt(args, "modulo");
            let ruta = str_opt(args, "ruta");
            let proceso = str_opt(args, "proceso");
            let exito = bool_opt(args, "exito");
            let desde = str_opt(args, "desde");
            let hasta = str_opt(args, "hasta");
            let page = i64_opt(args, "page").unwrap_or(1);
            let page_size = i64_opt(args, "pageSize").unwrap_or(50);
            let conn = db.conn();
            puede(&conn, Some(&sesion.usuario_id()?), "reporte", "ver")?;
            ok(repo::auditoria::listar_historial(
                &conn,
                usuario_id.as_deref(),
                comando_f.as_deref(),
                nivel.as_deref(),
                tipo_evento.as_deref(),
                modulo.as_deref(),
                ruta.as_deref(),
                proceso.as_deref(),
                exito,
                desde.as_deref(),
                hasta.as_deref(),
                page,
                page_size,
            )?)
        }),
        "metricas_historial" => con_auditoria!(db, sesion, "metricas_historial", {
            let conn = db.conn();
            puede(&conn, Some(&sesion.usuario_id()?), "reporte", "ver")?;
            ok(repo::auditoria::metricas_historial(&conn)?)
        }),
        "metricas_actividad" => con_auditoria!(db, sesion, "metricas_actividad", {
            let desde = str_opt(args, "desde");
            let hasta = str_opt(args, "hasta");
            let usuario_id = str_opt(args, "usuarioId");
            let conn = db.conn();
            puede(&conn, Some(&sesion.usuario_id()?), "reporte", "ver")?;
            ok(repo::auditoria::metricas_actividad(
                &conn,
                desde.as_deref(),
                hasta.as_deref(),
                usuario_id.as_deref(),
            )?)
        }),

        // ============ Búsqueda global del command palette ============
        "buscar" => con_auditoria!(db, sesion, "buscar", {
            let q = str_opt(args, "q").unwrap_or_default();
            let conn = db.conn();
            let usuario_id = sesion.usuario_id()?;
            ok(crate::buscar::buscar(&conn, &usuario_id, &q)?)
        }),

        _ => Err(AppError::CampoRequerido(format!(
            "comando desconocido: {comando}"
        ))),
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use serde_json::json;

    fn setup() -> (Arc<DbState>, Arc<SesionState>) {
        let db = DbState::init_in_memory().expect("db");
        {
            let conn = db.conn();
            crate::security::seed_roles(&conn).expect("roles");
            crate::repo::seguridad::bootstrap_admin(&conn, "admin", "Administrador", "admin1234")
                .expect("admin");
        }
        let sesion = Arc::new(SesionState::default());
        (db, sesion)
    }

    #[test]
    fn dispatcher_puedo_refleja_la_matriz_de_permisos() {
        let (db, sesion) = setup();
        let admin_id = {
            let conn = db.conn();
            crate::repo::seguridad::obtener_usuario_por_nombre(&conn, "admin")
                .expect("admin existe")
                .expect("admin some")
                .id
        };
        sesion.iniciar(SesionActiva {
            usuario_id: admin_id,
            nombre_usuario: "admin".into(),
            rol_codigo: "ADMIN".into(),
        });

        // El ADMIN puede aprobar movimientos (matriz completa).
        let r = despachar(
            &db,
            &sesion,
            "puedo",
            &json!({ "recurso": "movimiento", "accion": "aprobar" }),
        )
        .expect("puedo movimiento aprobar");
        assert_eq!(r, json!(true));

        // El ADMIN no tiene una restricción: "eliminar" de usuario sí (matriz).
        let r = despachar(
            &db,
            &sesion,
            "puedo",
            &json!({ "recurso": "configuracion", "accion": "editar" }),
        )
        .expect("puedo configuracion editar");
        assert_eq!(r, json!(true));

        // Sin sesión, `puedo` exige autenticación (no lo inventa).
        let (db2, sesion2) = setup();
        let err = despachar(
            &db2,
            &sesion2,
            "puedo",
            &json!({ "recurso": "movimiento", "accion": "aprobar" }),
        )
        .expect_err("sin sesión");
        assert!(matches!(err, crate::error::AppError::NoAutenticado));
    }

    #[test]
    fn dispatcher_temas_devuelve_paletas_variables_y_global() {
        let (db, sesion) = setup();
        // OJO: el lock de la db se suelta antes de `despachar` (que vuelve a
        // pedir `db.conn()`); retenerlo aquí causaría un deadlock del mutex.
        let admin_id = {
            let conn = db.conn();
            crate::repo::seguridad::obtener_usuario_por_nombre(&conn, "admin")
                .expect("admin existe")
                .expect("admin some")
                .id
        };
        sesion.iniciar(SesionActiva {
            usuario_id: admin_id,
            nombre_usuario: "admin".into(),
            rol_codigo: "ADMIN".into(),
        });

        // listar_temas: las 6 paletas predefinidas.
        let r = despachar(&db, &sesion, "listar_temas", &Value::Null).expect("listar_temas");
        let temas = r.as_array().expect("array de temas");
        assert_eq!(temas.len(), 6);

        // obtener_tema: variables del modo pedido (claves camelCase, tal como
        // las envía `invoke` desde el navegador).
        let r = despachar(
            &db,
            &sesion,
            "obtener_tema",
            &json!({ "temaId": "bosque", "modoOscuro": true }),
        )
        .expect("obtener_tema");
        assert_eq!(r["id"], "bosque");
        assert_eq!(r["modo"], "OSCURO");
        assert_eq!(r["variables"]["--color-scheme"], "dark");
        assert!(r["variables"]["--color-blue-500"].as_str().is_some());

        // obtener_tema_activo: por defecto hereda la empresa (óxido claro).
        let r = despachar(&db, &sesion, "obtener_tema_activo", &Value::Null).expect("activo");
        assert_eq!(r["id"], "rust");
        assert_eq!(r["modo"], "CLARO");

        // obtener_tema_global: sin sesión, devuelve el tema de la empresa.
        let r = despachar(&db, &sesion, "obtener_tema_global", &Value::Null).expect("global");
        assert_eq!(r["id"], "rust");

        // Tema inválido en el dispatcher: error claro, no rompe el JSON.
        let r = despachar(
            &db,
            &sesion,
            "obtener_tema",
            &json!({ "temaId": "neon", "modoOscuro": false }),
        );
        assert!(r.is_err(), "tema inexistente debe fallar");
    }
}
