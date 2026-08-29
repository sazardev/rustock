//! Registro de escaneos (SPEC §14.3, Fase 10).
//!
//! Cada lectura del escáner —resuelta, no encontrada o denegada— deja una
//! fila con quién la hizo, cuándo, desde qué ruta, con qué rol y desde qué
//! origen (cámara o teclado). Los fallos importan tanto como los aciertos: un
//! código que nadie logra resolver es una etiqueta rota o mal impresa, y una
//! racha de denegados es alguien operando fuera de su rol.
//!
//! El escaneo **nunca crea ni modifica datos de negocio** (SPEC §14.3): este
//! módulo solo resuelve un código contra el catálogo y deja constancia. Las
//! acciones que se disparan a partir de la lectura viven en sus propios
//! comandos, con sus propios permisos.

use rusqlite::{Connection, params};
use serde::{Deserialize, Serialize};
use uuid::Uuid;

use crate::domain::{ahora, normalizar_codigo};
use crate::error::AppResult;
use crate::repo::catalogo::{EscaneoResuelto, resolver_escaneo};

/// Desenlace de una lectura. Es el eje del registro: lo que se vigila no es
/// cuántas veces se escaneó, sino cuántas veces **no** funcionó.
pub const RESUELTO: &str = "RESUELTO";
pub const NO_ENCONTRADO: &str = "NO_ENCONTRADO";
pub const DENEGADO: &str = "DENEGADO";

/// Ventana en la que se cuentan los fallos consecutivos de un mismo usuario.
const VENTANA_INTENTOS_MIN: i64 = 10;

/// Lo que envía la interfaz al escanear. Todo lo que no sea el código es
/// contexto: sirve para responder "dónde y en qué estaba" cuando algo falla.
#[derive(Debug, Clone, Deserialize)]
pub struct EntradaEscaneo {
    pub codigo: String,
    /// `CAMARA` | `TECLADO` | `MANUAL`.
    #[serde(default = "origen_por_defecto")]
    pub origen: String,
    /// Simbología detectada por el lector (`EAN_13`, `CODE_128`, `QR_CODE`…).
    pub formato: Option<String>,
    /// `CONSULTA` | `CAPTURA` | `INVENTARIO` | `ETIQUETA`.
    #[serde(default = "proposito_por_defecto")]
    pub proposito: String,
    /// Ruta de la aplicación desde la que se escaneó.
    pub ruta: Option<String>,
    /// Última ubicación escaneada, si el flujo la había fijado.
    pub ubicacion_contexto_id: Option<String>,
    pub latitud: Option<f64>,
    pub longitud: Option<f64>,
    /// Navegador/plataforma, tal como los reporta el cliente.
    pub dispositivo: Option<String>,
}

fn origen_por_defecto() -> String {
    "TECLADO".into()
}

fn proposito_por_defecto() -> String {
    "CONSULTA".into()
}

/// Respuesta de un escaneo: qué se resolvió, con qué desenlace y cuántos
/// fallos seguidos lleva este usuario (para que la interfaz pueda avisar de
/// una etiqueta ilegible antes de que la persona insista diez veces).
#[derive(Debug, Clone, Serialize)]
pub struct ResultadoEscaneo {
    pub evento_id: String,
    pub resultado: String,
    pub motivo: Option<String>,
    pub resuelto: Option<EscaneoResuelto>,
    pub fallos_recientes: i64,
    /// Qué se puede hacer ahora, según lo leído y los permisos de quien lee.
    pub acciones: Vec<AccionEscaneo>,
}

/// Datos con los que se graba una fila del registro.
pub struct RegistroEscaneo<'a> {
    pub entrada: &'a EntradaEscaneo,
    pub usuario_id: &'a str,
    pub rol_codigo: &'a str,
    pub resultado: &'a str,
    pub motivo: Option<&'a str>,
    pub resuelto: Option<&'a EscaneoResuelto>,
    pub duracion_ms: i64,
}

/// Rol vigente del usuario. Se guarda como copia en el evento: si mañana
/// cambia su rol, el registro debe seguir diciendo con qué permiso actuó.
pub fn rol_de_usuario(conn: &Connection, usuario_id: &str) -> AppResult<String> {
    let rol = conn
        .query_row(
            "SELECT r.codigo
             FROM usuarios u JOIN roles r ON r.id = u.rol_id
             WHERE (u.id = ?1 OR u.nombre_usuario = ?1)",
            [usuario_id],
            |r| r.get::<_, String>(0),
        )
        .unwrap_or_else(|_| "DESCONOCIDO".to_string());
    Ok(rol)
}

/// Cuántas lecturas fallidas seguidas lleva el usuario en la ventana reciente.
/// Se cuentan las que no resolvieron, sin importar el motivo: para quien está
/// frente a la caja, una etiqueta ilegible y un permiso denegado se parecen.
fn fallos_recientes(conn: &Connection, usuario_id: &str) -> AppResult<i64> {
    let n = conn.query_row(
        "SELECT COUNT(*) FROM eventos_escaneo
         WHERE usuario_id = ?1
           AND resultado <> ?2
           AND created_at >= datetime('now', ?3)",
        params![
            usuario_id,
            RESUELTO,
            format!("-{VENTANA_INTENTOS_MIN} minutes")
        ],
        |r| r.get::<_, i64>(0),
    )?;
    Ok(n)
}

/// Graba una fila del registro. No falla la operación de negocio si el
/// registro no se puede escribir: se propaga el error para que el comando
/// decida, pero el escaneo en sí ya se resolvió antes de llegar aquí.
pub fn registrar(conn: &Connection, reg: &RegistroEscaneo<'_>) -> AppResult<String> {
    let id = Uuid::new_v4().to_string();
    let ahora_ts = ahora();
    let tenant = crate::repo::auditoria::tenant_actual(conn)?;
    let (tipo, entidad_id, etiqueta) = match reg.resuelto {
        Some(r) => (
            Some(r.tipo.clone()),
            Some(r.id.clone()),
            Some(r.etiqueta.clone()),
        ),
        None => (None, None, None),
    };

    conn.execute(
        "INSERT INTO eventos_escaneo (
            id, codigo, codigo_normalizado, resultado, motivo,
            tipo_entidad, entidad_id, entidad_etiqueta,
            origen, formato, proposito, ruta,
            usuario_id, rol_codigo, ubicacion_contexto_id,
            latitud, longitud, dispositivo, duracion_ms, tenant,
            hora_local, dia_semana, created_at
         ) VALUES (
            ?1, ?2, ?3, ?4, ?5,
            ?6, ?7, ?8,
            ?9, ?10, ?11, ?12,
            ?13, ?14, ?15,
            ?16, ?17, ?18, ?19, ?20,
            CAST(strftime('%H', 'now', 'localtime') AS INTEGER),
            CAST(strftime('%w', 'now', 'localtime') AS INTEGER),
            ?21
         )",
        params![
            id,
            reg.entrada.codigo.trim(),
            normalizar_codigo(&reg.entrada.codigo),
            reg.resultado,
            reg.motivo,
            tipo,
            entidad_id,
            etiqueta,
            reg.entrada.origen,
            reg.entrada.formato,
            reg.entrada.proposito,
            reg.entrada.ruta,
            reg.usuario_id,
            reg.rol_codigo,
            reg.entrada.ubicacion_contexto_id,
            reg.entrada.latitud,
            reg.entrada.longitud,
            reg.entrada.dispositivo,
            reg.duracion_ms,
            tenant,
            ahora_ts,
        ],
    )?;
    Ok(id)
}

/// Resuelve un código y deja constancia. El permiso ya lo verificó el comando:
/// aquí solo se decide si el código corresponde a algo del catálogo.
pub fn escanear(
    conn: &Connection,
    usuario_id: &str,
    entrada: &EntradaEscaneo,
) -> AppResult<ResultadoEscaneo> {
    let inicio = std::time::Instant::now();
    let rol = rol_de_usuario(conn, usuario_id)?;

    let resuelto = resolver_escaneo(conn, &entrada.codigo)?;
    let duracion_ms = inicio.elapsed().as_millis() as i64;

    let (resultado, motivo) = match &resuelto {
        Some(_) => (RESUELTO, None),
        None => (
            NO_ENCONTRADO,
            Some("El código no corresponde a ningún producto, ubicación, lote o caja."),
        ),
    };

    let evento_id = registrar(
        conn,
        &RegistroEscaneo {
            entrada,
            usuario_id,
            rol_codigo: &rol,
            resultado,
            motivo,
            resuelto: resuelto.as_ref(),
            duracion_ms,
        },
    )?;

    let acciones = acciones(conn, usuario_id, resuelto.as_ref(), &entrada.proposito);
    Ok(ResultadoEscaneo {
        evento_id,
        resultado: resultado.to_string(),
        motivo: motivo.map(str::to_string),
        resuelto,
        fallos_recientes: fallos_recientes(conn, usuario_id)?,
        acciones,
    })
}

/// Deja constancia de un intento sin permiso. Se llama cuando `puede()` niega
/// el acceso: sin esto, el intento más interesante de vigilar sería el único
/// que no queda escrito.
pub fn registrar_denegado(
    conn: &Connection,
    usuario_id: &str,
    entrada: &EntradaEscaneo,
    motivo: &str,
) -> AppResult<String> {
    let rol = rol_de_usuario(conn, usuario_id)?;
    registrar(
        conn,
        &RegistroEscaneo {
            entrada,
            usuario_id,
            rol_codigo: &rol,
            resultado: DENEGADO,
            motivo: Some(motivo),
            resuelto: None,
            duracion_ms: 0,
        },
    )
}

/// Qué se puede hacer con lo que se acaba de escanear.
///
/// Lo decide el backend, no la pantalla: sabe qué existe, qué permisos tiene
/// quien escanea y a qué ruta lleva cada acción. Si lo decidiera el frontend
/// acabaría ofreciendo acciones que el backend luego niega.
#[derive(Debug, Clone, Serialize)]
pub struct AccionEscaneo {
    /// Identificador estable de la acción (`ver`, `mover`, `contar`, `alta`…).
    pub clave: String,
    pub etiqueta: String,
    /// Ruta de la aplicación a la que lleva, ya con sus parámetros.
    pub href: String,
    /// La acción principal sugerida para este resultado.
    pub principal: bool,
}

/// Construye las acciones ofrecidas tras una lectura.
///
/// Cuando el código **no existe**, la única acción posible es darlo de alta —
/// y lleva al formulario de creación con el código precargado. El escaneo
/// sigue sin crear nada por sí solo (SPEC §14.3): crea una persona, en un
/// formulario, con su propio permiso.
pub fn acciones(
    conn: &Connection,
    usuario_id: &str,
    resuelto: Option<&EscaneoResuelto>,
    proposito: &str,
) -> Vec<AccionEscaneo> {
    let permitido = |recurso: &str, accion: &str| {
        crate::security::puede(conn, Some(usuario_id), recurso, accion).is_ok()
    };

    let Some(r) = resuelto else {
        // Código desconocido: se ofrece el alta del tipo que encaja con el
        // propósito, si esa persona puede crearlo.
        let mut acciones = Vec::new();
        if permitido("producto", "crear") {
            acciones.push(AccionEscaneo {
                clave: "alta_producto".into(),
                etiqueta: "Dar de alta como producto".into(),
                href: "/productos/nuevo".into(),
                principal: proposito != "INVENTARIO",
            });
        }
        if permitido("caja", "crear") {
            acciones.push(AccionEscaneo {
                clave: "alta_caja".into(),
                etiqueta: "Dar de alta como caja".into(),
                href: "/cajas/nuevo".into(),
                principal: false,
            });
        }
        if permitido("ubicacion", "crear") {
            acciones.push(AccionEscaneo {
                clave: "alta_ubicacion".into(),
                etiqueta: "Dar de alta como ubicación".into(),
                href: "/ubicaciones/nuevo".into(),
                principal: false,
            });
        }
        return acciones;
    };

    let mut acciones = vec![AccionEscaneo {
        clave: "ver".into(),
        etiqueta: "Ver ficha".into(),
        href: ruta_detalle(&r.tipo, &r.id),
        principal: proposito == "CONSULTA",
    }];

    // Reimprimir la etiqueta desde aquí cubre el caso más frecuente de todos:
    // el código costó leerlo o no leyó, y quien lo tiene en la mano quiere una
    // etiqueta nueva sin ir a buscar el producto en otra pantalla.
    acciones.push(AccionEscaneo {
        clave: "etiqueta".into(),
        etiqueta: "Imprimir etiqueta".into(),
        href: format!("/etiquetas?tipo={}&ids={}", r.tipo, r.id),
        principal: proposito == "ETIQUETA",
    });

    match r.tipo.as_str() {
        "PRODUCTO" => {
            if permitido("movimiento", "crear") {
                acciones.push(AccionEscaneo {
                    clave: "movimiento".into(),
                    etiqueta: "Registrar movimiento".into(),
                    href: format!("/movimientos/nuevo?producto={}", r.id),
                    principal: proposito == "CAPTURA",
                });
            }
            acciones.push(AccionEscaneo {
                clave: "kardex".into(),
                etiqueta: "Ver kardex".into(),
                href: format!("/reportes/kardex?producto={}", r.id),
                principal: false,
            });
        }
        "UBICACION" => {
            if permitido("movimiento", "crear") {
                acciones.push(AccionEscaneo {
                    clave: "movimiento".into(),
                    etiqueta: "Mover stock a esta ubicación".into(),
                    href: format!("/movimientos/nuevo?destino={}", r.id),
                    principal: proposito == "CAPTURA",
                });
            }
        }
        "LOTE" => {
            acciones.push(AccionEscaneo {
                clave: "trazabilidad".into(),
                etiqueta: "Ver dónde está este lote".into(),
                href: format!("/lotes/{}", r.id),
                principal: false,
            });
        }
        _ => {}
    }

    if proposito == "INVENTARIO" && permitido("inventario", "ejecutar") {
        acciones.push(AccionEscaneo {
            clave: "contar".into(),
            etiqueta: "Contar en la sesión de inventario".into(),
            href: "/inventario".into(),
            principal: true,
        });
    }

    acciones
}

/// Ruta de la ficha de una entidad, por tipo.
fn ruta_detalle(tipo: &str, id: &str) -> String {
    let slug = match tipo {
        "PRODUCTO" => "productos",
        "UBICACION" => "ubicaciones",
        "LOTE" => "lotes",
        _ => "cajas",
    };
    format!("/{slug}/{id}")
}

/// Una fila del registro, tal como la lee el panel de escaneos.
#[derive(Debug, Clone, Serialize)]
pub struct EventoEscaneo {
    pub id: String,
    pub codigo: String,
    pub resultado: String,
    pub motivo: Option<String>,
    pub tipo_entidad: Option<String>,
    pub entidad_id: Option<String>,
    pub entidad_etiqueta: Option<String>,
    pub origen: String,
    pub formato: Option<String>,
    pub proposito: String,
    pub ruta: Option<String>,
    pub usuario_id: String,
    pub usuario_nombre: Option<String>,
    pub rol_codigo: String,
    pub ubicacion_contexto_id: Option<String>,
    pub duracion_ms: Option<i64>,
    pub created_at: String,
}

/// Últimos eventos, del más reciente al más antiguo. `limite` se acota para
/// que un cliente no pueda pedir la tabla entera de una sentada.
pub fn listar_eventos(conn: &Connection, limite: i64) -> AppResult<Vec<EventoEscaneo>> {
    let limite = limite.clamp(1, 500);
    let mut stmt = conn.prepare(
        "SELECT e.id, e.codigo, e.resultado, e.motivo,
                e.tipo_entidad, e.entidad_id, e.entidad_etiqueta,
                e.origen, e.formato, e.proposito, e.ruta,
                e.usuario_id, u.nombre_completo, e.rol_codigo,
                e.ubicacion_contexto_id, e.duracion_ms, e.created_at
         FROM eventos_escaneo e
         LEFT JOIN usuarios u ON u.id = e.usuario_id
         ORDER BY e.created_at DESC
         LIMIT ?1",
    )?;
    let filas = stmt.query_map([limite], |r| {
        Ok(EventoEscaneo {
            id: r.get(0)?,
            codigo: r.get(1)?,
            resultado: r.get(2)?,
            motivo: r.get(3)?,
            tipo_entidad: r.get(4)?,
            entidad_id: r.get(5)?,
            entidad_etiqueta: r.get(6)?,
            origen: r.get(7)?,
            formato: r.get(8)?,
            proposito: r.get(9)?,
            ruta: r.get(10)?,
            usuario_id: r.get(11)?,
            usuario_nombre: r.get(12)?,
            rol_codigo: r.get(13)?,
            ubicacion_contexto_id: r.get(14)?,
            duracion_ms: r.get(15)?,
            created_at: r.get(16)?,
        })
    })?;
    let mut salida = Vec::new();
    for fila in filas {
        salida.push(fila?);
    }
    Ok(salida)
}

// ============ Panel de tracking (Fase 10 · Entrega 4) ============

/// Un código que falla una y otra vez: casi siempre es una etiqueta rota,
/// mal impresa o pegada en algo que ya no está en el catálogo.
#[derive(Debug, Clone, Serialize)]
pub struct CodigoProblematico {
    pub codigo: String,
    pub intentos: i64,
    pub ultimo_intento: String,
    /// Cuántas personas distintas han tropezado con él. Si son varias, el
    /// problema es de la etiqueta y no de quien escanea.
    pub personas: i64,
}

/// Actividad de escaneo de una persona.
#[derive(Debug, Clone, Serialize)]
pub struct ActividadUsuario {
    pub usuario_id: String,
    pub usuario_nombre: Option<String>,
    pub rol_codigo: String,
    pub total: i64,
    pub resueltos: i64,
    pub no_encontrados: i64,
    pub denegados: i64,
    /// Porcentaje de lecturas que resolvieron, redondeado a un decimal.
    pub acierto: f64,
}

/// Intento de operar fuera del rol. Es la señal de seguridad del módulo.
#[derive(Debug, Clone, Serialize)]
pub struct IntentoDenegado {
    pub usuario_id: String,
    pub usuario_nombre: Option<String>,
    pub rol_codigo: String,
    pub intentos: i64,
    pub ultimo_intento: String,
}

/// Volumen por hora del día, para ver cuándo se opera de verdad.
#[derive(Debug, Clone, Serialize)]
pub struct VolumenHora {
    pub hora: i64,
    pub total: i64,
}

/// Todo lo que muestra el panel, resuelto en el backend de una sola vez.
#[derive(Debug, Clone, Serialize)]
pub struct MetricasEscaneo {
    pub total: i64,
    pub resueltos: i64,
    pub no_encontrados: i64,
    pub denegados: i64,
    pub acierto: f64,
    /// Lecturas por origen: `CAMARA` frente a `TECLADO`.
    pub por_camara: i64,
    pub por_teclado: i64,
    /// Milisegundos medios en resolver.
    pub duracion_media_ms: f64,
    pub codigos_problematicos: Vec<CodigoProblematico>,
    pub por_usuario: Vec<ActividadUsuario>,
    pub denegados_por_usuario: Vec<IntentoDenegado>,
    pub por_hora: Vec<VolumenHora>,
}

fn porcentaje(parte: i64, total: i64) -> f64 {
    if total == 0 {
        return 0.0;
    }
    ((parte as f64 / total as f64) * 1000.0).round() / 10.0
}

/// Calcula las métricas del panel sobre los últimos `dias` días.
///
/// Todo el cálculo vive aquí y no en el frontend: son datos de negocio, y la
/// interfaz solo los muestra (STACK.md).
pub fn metricas(conn: &Connection, dias: i64) -> AppResult<MetricasEscaneo> {
    let dias = dias.clamp(1, 365);
    let desde = format!("-{dias} days");

    let (total, resueltos, no_encontrados, denegados, camara, teclado, duracion) = conn.query_row(
        "SELECT
            COUNT(*),
            SUM(resultado = ?1),
            SUM(resultado = ?2),
            SUM(resultado = ?3),
            SUM(origen = 'CAMARA'),
            SUM(origen = 'TECLADO'),
            AVG(COALESCE(duracion_ms, 0))
         FROM eventos_escaneo
         WHERE created_at >= datetime('now', ?4)",
        params![RESUELTO, NO_ENCONTRADO, DENEGADO, desde],
        |r| {
            Ok((
                r.get::<_, i64>(0)?,
                r.get::<_, Option<i64>>(1)?.unwrap_or(0),
                r.get::<_, Option<i64>>(2)?.unwrap_or(0),
                r.get::<_, Option<i64>>(3)?.unwrap_or(0),
                r.get::<_, Option<i64>>(4)?.unwrap_or(0),
                r.get::<_, Option<i64>>(5)?.unwrap_or(0),
                r.get::<_, Option<f64>>(6)?.unwrap_or(0.0),
            ))
        },
    )?;

    // Códigos que fallan repetidamente. Se exige más de un intento: un fallo
    // suelto es un dedo torpe, tres son una etiqueta que hay que reimprimir.
    let mut stmt = conn.prepare(
        "SELECT codigo, COUNT(*), MAX(created_at), COUNT(DISTINCT usuario_id)
         FROM eventos_escaneo
         WHERE resultado = ?1 AND created_at >= datetime('now', ?2)
         GROUP BY codigo_normalizado
         HAVING COUNT(*) > 1
         ORDER BY COUNT(*) DESC, MAX(created_at) DESC
         LIMIT 20",
    )?;
    let codigos_problematicos = stmt
        .query_map(params![NO_ENCONTRADO, desde], |r| {
            Ok(CodigoProblematico {
                codigo: r.get(0)?,
                intentos: r.get(1)?,
                ultimo_intento: r.get(2)?,
                personas: r.get(3)?,
            })
        })?
        .collect::<rusqlite::Result<Vec<_>>>()?;

    let mut stmt = conn.prepare(
        "SELECT e.usuario_id, u.nombre_completo, e.rol_codigo,
                COUNT(*), SUM(e.resultado = ?1), SUM(e.resultado = ?2), SUM(e.resultado = ?3)
         FROM eventos_escaneo e
         LEFT JOIN usuarios u ON u.id = e.usuario_id
         WHERE e.created_at >= datetime('now', ?4)
         GROUP BY e.usuario_id
         ORDER BY COUNT(*) DESC
         LIMIT 50",
    )?;
    let por_usuario = stmt
        .query_map(params![RESUELTO, NO_ENCONTRADO, DENEGADO, desde], |r| {
            let total: i64 = r.get(3)?;
            let resueltos: i64 = r.get::<_, Option<i64>>(4)?.unwrap_or(0);
            Ok(ActividadUsuario {
                usuario_id: r.get(0)?,
                usuario_nombre: r.get(1)?,
                rol_codigo: r.get(2)?,
                total,
                resueltos,
                no_encontrados: r.get::<_, Option<i64>>(5)?.unwrap_or(0),
                denegados: r.get::<_, Option<i64>>(6)?.unwrap_or(0),
                acierto: porcentaje(resueltos, total),
            })
        })?
        .collect::<rusqlite::Result<Vec<_>>>()?;

    let mut stmt = conn.prepare(
        "SELECT e.usuario_id, u.nombre_completo, e.rol_codigo, COUNT(*), MAX(e.created_at)
         FROM eventos_escaneo e
         LEFT JOIN usuarios u ON u.id = e.usuario_id
         WHERE e.resultado = ?1 AND e.created_at >= datetime('now', ?2)
         GROUP BY e.usuario_id
         ORDER BY COUNT(*) DESC
         LIMIT 20",
    )?;
    let denegados_por_usuario = stmt
        .query_map(params![DENEGADO, desde], |r| {
            Ok(IntentoDenegado {
                usuario_id: r.get(0)?,
                usuario_nombre: r.get(1)?,
                rol_codigo: r.get(2)?,
                intentos: r.get(3)?,
                ultimo_intento: r.get(4)?,
            })
        })?
        .collect::<rusqlite::Result<Vec<_>>>()?;

    let mut stmt = conn.prepare(
        "SELECT hora_local, COUNT(*) FROM eventos_escaneo
         WHERE created_at >= datetime('now', ?1) AND hora_local IS NOT NULL
         GROUP BY hora_local ORDER BY hora_local",
    )?;
    let horas: Vec<VolumenHora> = stmt
        .query_map(params![desde], |r| {
            Ok(VolumenHora {
                hora: r.get(0)?,
                total: r.get(1)?,
            })
        })?
        .collect::<rusqlite::Result<Vec<_>>>()?;
    // Las 24 horas siempre presentes: una gráfica con huecos se lee mal.
    let por_hora = (0..24)
        .map(|h| VolumenHora {
            hora: h,
            total: horas.iter().find(|x| x.hora == h).map_or(0, |x| x.total),
        })
        .collect();

    Ok(MetricasEscaneo {
        total,
        resueltos,
        no_encontrados,
        denegados,
        acierto: porcentaje(resueltos, total),
        por_camara: camara,
        por_teclado: teclado,
        duracion_media_ms: (duracion * 10.0).round() / 10.0,
        codigos_problematicos,
        por_usuario,
        denegados_por_usuario,
        por_hora,
    })
}
