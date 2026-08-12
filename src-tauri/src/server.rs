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
//! Sesión: como el resto de la app asume un único operador por instalación
//! (SPEC §4.1), esta capa reutiliza el mismo `SesionState` en memoria que
//! usan los comandos Tauri — no hay cookies ni tokens: iniciar sesión desde
//! el navegador o desde la ventana nativa es, a todo efecto, la misma
//! sesión activa del proceso.

use std::sync::Arc;

use serde_json::{Value, json};
use tiny_http::{Header, Method, Response, Server};

use crate::commands::con_auditoria;
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
use crate::sesion::{SesionActiva, SesionState};

const PUERTO: u16 = 1421;

/// Arranca el servidor en un hilo aparte. No bloquea: si el puerto ya está
/// ocupado (ej. otra instancia corriendo), se registra el error y la app
/// sigue funcionando igual como app de escritorio pura.
pub fn iniciar(db: Arc<DbState>, sesion: Arc<SesionState>) {
    std::thread::spawn(move || {
        let server = match Server::http(("127.0.0.1", PUERTO)) {
            Ok(s) => s,
            Err(e) => {
                eprintln!("[server] no se pudo abrir el puerto {PUERTO}: {e}");
                return;
            }
        };
        println!(
            "[server] API HTTP local en http://127.0.0.1:{PUERTO} (para el frontend en modo navegador)"
        );
        for request in server.incoming_requests() {
            manejar(&db, &sesion, request);
        }
    });
}

fn cors_headers() -> Vec<Header> {
    vec![
        Header::from_bytes(&b"Access-Control-Allow-Origin"[..], &b"*"[..]).unwrap(),
        Header::from_bytes(&b"Access-Control-Allow-Methods"[..], &b"POST, OPTIONS"[..]).unwrap(),
        Header::from_bytes(&b"Access-Control-Allow-Headers"[..], &b"Content-Type"[..]).unwrap(),
    ]
}

fn manejar(db: &Arc<DbState>, sesion: &Arc<SesionState>, mut request: tiny_http::Request) {
    if request.method() == &Method::Options {
        let mut response = Response::empty(204);
        for h in cors_headers() {
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

    let resultado = despachar(db, sesion, &comando, &args);
    let cuerpo_respuesta = match resultado {
        Ok(v) => json!({ "ok": true, "data": v }).to_string(),
        Err(e) => json!({ "ok": false, "error": e.to_string() }).to_string(),
    };

    let mut response = Response::from_string(cuerpo_respuesta);
    for h in cors_headers() {
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
        None => serde_json::from_value(json!({}))
            .map_err(|e| AppError::CampoRequerido(format!("params: {e}"))),
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
        "desactivar_zona" => con_auditoria!(db, sesion, "desactivar_zona", {
            let id = str_req(args, "id")?;
            let actor = sesion.usuario_id()?;
            let conn = db.conn();
            ok(repo::catalogo::desactivar_zona(&conn, &id, &actor)?)
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
        "listar_roles" => con_auditoria!(db, sesion, "listar_roles", {
            let conn = db.conn();
            puede(&conn, Some(&sesion.usuario_id()?), "rol", "ver")?;
            ok(repo::seguridad::listar_roles(&conn)?)
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
        "historial_caja" => con_auditoria!(db, sesion, "historial_caja", {
            let caja_id = str_req(args, "cajaId")?;
            let actor = sesion.usuario_id()?;
            let conn = db.conn();
            ok(repo::trazabilidad::historial_caja(&conn, &caja_id, &actor)?)
        }),

        // ============ Alertas ============
        "listar_alertas" => con_auditoria!(db, sesion, "listar_alertas", {
            let estado = str_opt(args, "estado");
            let dias_por_vencer = i64_opt(args, "diasPorVencer").unwrap_or(30);
            let actor = sesion.usuario_id()?;
            let conn = db.conn();
            repo::alerta::regenerar_alertas(&conn, dias_por_vencer)?;
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
        "listar_historial" => con_auditoria!(db, sesion, "listar_historial", {
            let usuario_id = str_opt(args, "usuarioId");
            let comando_f = str_opt(args, "comando");
            let nivel = str_opt(args, "nivel");
            let desde = str_opt(args, "desde");
            let hasta = str_opt(args, "hasta");
            let limit = i64_opt(args, "limit").unwrap_or(100);
            let conn = db.conn();
            puede(&conn, Some(&sesion.usuario_id()?), "reporte", "ver")?;
            ok(repo::auditoria::listar_historial(
                &conn,
                usuario_id.as_deref(),
                comando_f.as_deref(),
                nivel.as_deref(),
                desde.as_deref(),
                hasta.as_deref(),
                limit,
            )?)
        }),
        "metricas_historial" => con_auditoria!(db, sesion, "metricas_historial", {
            let conn = db.conn();
            puede(&conn, Some(&sesion.usuario_id()?), "reporte", "ver")?;
            ok(repo::auditoria::metricas_historial(&conn)?)
        }),

        _ => Err(AppError::CampoRequerido(format!(
            "comando desconocido: {comando}"
        ))),
    }
}
