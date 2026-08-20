use rusqlite::{Connection, TransactionBehavior};
use uuid::Uuid;

use crate::domain::movimiento::*;
use crate::domain::{ahora, normalizar_codigo};
use crate::error::{AppError, AppResult};
use crate::security::puede;

/// Tupla de datos de una línea para la anulación inversa.
type LineaInversa = (
    String,
    Option<String>,
    i64,
    Option<String>,
    Option<String>,
    Option<String>,
    Option<String>,
);

/// Genera el número correlativo del movimiento (SPEC §6.1): MOV-YYYY-NNNNNN.
///
/// El incremento es atómico: se apoya en la tabla `correlativos`, cuyo
/// `UPDATE ... RETURNING` adquiere el candado de escritura de la fila. Al
/// ejecutarse dentro de una transacción `IMMEDIATE` (ver `crear_movimiento`/
/// `crear_traslado`/`anular_movimiento`), dos creaciones concurrentes quedan
/// serializadas y no colisionan en el `UNIQUE(numero)`.
fn generar_numero(conn: &Connection, anio: &str) -> AppResult<String> {
    let clave = format!("MOV-{anio}");
    conn.execute(
        "INSERT OR IGNORE INTO correlativos (clave, valor) VALUES (?1, 0)",
        [clave.clone()],
    )?;
    let valor: i64 = conn.query_row(
        "UPDATE correlativos SET valor = valor + 1 WHERE clave = ?1 RETURNING valor",
        [clave],
        |r| r.get(0),
    )?;
    Ok(format!("MOV-{anio}-{:06}", valor))
}

/// Lee un producto y devuelve si controla lote / vencimiento / está activo.
#[allow(dead_code)]
struct ReglasProducto {
    controla_lote: bool,
    controla_vencimiento: bool,
    perecedero: bool,
    activo: bool,
    sku: String,
}

fn reglas_producto(conn: &Connection, id: &str) -> AppResult<ReglasProducto> {
    let mut stmt = conn.prepare(
        "SELECT controla_lote, controla_vencimiento, perecedero, activo, sku
         FROM productos WHERE id = ?1",
    )?;
    let mut rows = stmt.query_map([id], |r| {
        Ok(ReglasProducto {
            controla_lote: r.get::<_, i64>(0)? != 0,
            controla_vencimiento: r.get::<_, i64>(1)? != 0,
            perecedero: r.get::<_, i64>(2)? != 0,
            activo: r.get::<_, i64>(3)? != 0,
            sku: r.get(4)?,
        })
    })?;
    rows.next()
        .transpose()
        .map_err(AppError::from)?
        .ok_or_else(|| AppError::NoEncontrado("producto", id.to_string()))
}

/// Código de una ubicación para mensajes claros (SPEC §14.2).
fn codigo_ubicacion(conn: &Connection, id: &str) -> AppResult<String> {
    codigo_ubicacion_pub(conn, id)
}

pub(crate) fn codigo_ubicacion_pub(conn: &Connection, id: &str) -> AppResult<String> {
    conn.query_row("SELECT codigo FROM ubicaciones WHERE id = ?1", [id], |r| {
        r.get(0)
    })
    .map_err(|_| AppError::NoEncontrado("ubicación", id.to_string()))
}

fn codigo_lote(conn: &Connection, id: &str) -> AppResult<String> {
    conn.query_row("SELECT numero FROM lotes WHERE id = ?1", [id], |r| r.get(0))
        .map_err(|_| AppError::NoEncontrado("lote", id.to_string()))
}

/// Consulta el saldo materializado actual de (ubicacion, producto, lote).
fn saldo_actual(
    conn: &Connection,
    ubicacion: &str,
    producto: &str,
    lote: Option<&str>,
) -> AppResult<i64> {
    let lote_key = lote.unwrap_or_default();
    let mut stmt = conn.prepare(
        "SELECT COALESCE(SUM(cantidad), 0) FROM saldos
         WHERE ubicacion_id = ?1 AND producto_id = ?2 AND lote_key = ?3",
    )?;
    let mut rows = stmt.query_map(rusqlite::params![ubicacion, producto, lote_key], |r| {
        r.get(0)
    })?;
    rows.next()
        .transpose()?
        .ok_or(AppError::CampoRequerido("saldo".into()))
}

/// Consulta el stock total de un producto (suma de ubicaciones) — para mínimos.
pub fn stock_total_producto(conn: &Connection, producto: &str) -> AppResult<i64> {
    let mut stmt =
        conn.prepare("SELECT COALESCE(SUM(cantidad), 0) FROM saldos WHERE producto_id = ?1")?;
    let mut rows = stmt.query_map([producto], |r| r.get(0))?;
    rows.next()
        .transpose()?
        .ok_or(AppError::CampoRequerido("saldo".into()))
}

/// Crea un traslado (SPEC §9), resolviendo el almacén de origen y destino
/// por transitividad (§3.13). Si coinciden, crea un único movimiento
/// `TRASLADO` (comportamiento intra-almacén sin cambios). Si difieren, crea
/// **dos** movimientos ligados por el mismo `documento_referencia` (§9.3):
/// `SALIDA`/`TRASLADO_SALIDA` en el almacén de origen y
/// `ENTRADA`/`TRASLADO_ENTRADA` en el de destino. Cada movimiento nace en
/// `BORRADOR` y se aprueba por separado (§6.2); como ninguno de los dos
/// afecta stock hasta su propia aprobación, la falta de una transacción
/// conjunta entre ambas creaciones no compromete la consistencia del saldo.
pub fn crear_traslado(conn: &Connection, nuevo: &NuevoTraslado) -> AppResult<TrasladoCreado> {
    if nuevo.cantidad <= 0 {
        return Err(AppError::CampoRequerido("cantidad (> 0)".into()));
    }
    let almacen_origen =
        crate::repo::catalogo::resolver_almacen_id_de_ubicacion(conn, &nuevo.origen_ubicacion_id)?;
    let almacen_destino =
        crate::repo::catalogo::resolver_almacen_id_de_ubicacion(conn, &nuevo.destino_ubicacion_id)?;

    // Una sola transacción para el traslado: si origen y destino están en el
    // mismo almacén se crea un único movimiento; si no, las dos piernas
    // (salida + entrada) se crean como un hecho atómico (SPEC §9.3).
    let tx = rusqlite::Transaction::new_unchecked(conn, TransactionBehavior::Immediate)?;

    if almacen_origen == almacen_destino {
        let mov = insertar_movimiento(
            &tx,
            &NuevoMovimiento {
                tipo: "TRASLADO".into(),
                sub_tipo: "TRASLADO_SALIDA".into(),
                fecha_movimiento: None,
                motivo: None,
                origen_ubicacion_id: Some(nuevo.origen_ubicacion_id.clone()),
                destino_ubicacion_id: Some(nuevo.destino_ubicacion_id.clone()),
                proveedor_id: None,
                cliente_id: None,
                sesion_inventario_id: None,
                documento_referencia: nuevo.documento_referencia.clone(),
                notas: nuevo.notas.clone(),
                lineas: vec![NuevaLinea {
                    costo_unitario: None,
                    producto_id: nuevo.producto_id.clone(),
                    lote_id: nuevo.lote_id.clone(),
                    cantidad: nuevo.cantidad,
                    origen_ubicacion_id: Some(nuevo.origen_ubicacion_id.clone()),
                    destino_ubicacion_id: Some(nuevo.destino_ubicacion_id.clone()),
                    caja_origen_id: nuevo.caja_origen_id.clone(),
                    caja_destino_id: nuevo.caja_destino_id.clone(),
                }],
                created_by: nuevo.created_by.clone(),
            },
        )?;
        tx.commit()?;
        return Ok(TrasladoCreado {
            salida: mov,
            entrada: None,
        });
    }

    let referencia = nuevo
        .documento_referencia
        .clone()
        .unwrap_or_else(|| format!("TRASLADO-{}", Uuid::new_v4()));

    let salida = insertar_movimiento(
        &tx,
        &NuevoMovimiento {
            tipo: "SALIDA".into(),
            sub_tipo: "TRASLADO_SALIDA".into(),
            fecha_movimiento: None,
            motivo: None,
            origen_ubicacion_id: Some(nuevo.origen_ubicacion_id.clone()),
            destino_ubicacion_id: None,
            proveedor_id: None,
            cliente_id: None,
            sesion_inventario_id: None,
            documento_referencia: Some(referencia.clone()),
            notas: nuevo.notas.clone(),
            lineas: vec![NuevaLinea {
                costo_unitario: None,
                producto_id: nuevo.producto_id.clone(),
                lote_id: nuevo.lote_id.clone(),
                cantidad: nuevo.cantidad,
                origen_ubicacion_id: Some(nuevo.origen_ubicacion_id.clone()),
                destino_ubicacion_id: None,
                caja_origen_id: nuevo.caja_origen_id.clone(),
                caja_destino_id: None,
            }],
            created_by: nuevo.created_by.clone(),
        },
    )?;

    let entrada = insertar_movimiento(
        &tx,
        &NuevoMovimiento {
            tipo: "ENTRADA".into(),
            sub_tipo: "TRASLADO_ENTRADA".into(),
            fecha_movimiento: None,
            motivo: None,
            origen_ubicacion_id: None,
            destino_ubicacion_id: Some(nuevo.destino_ubicacion_id.clone()),
            proveedor_id: None,
            cliente_id: None,
            sesion_inventario_id: None,
            documento_referencia: Some(referencia),
            notas: nuevo.notas.clone(),
            lineas: vec![NuevaLinea {
                costo_unitario: None,
                producto_id: nuevo.producto_id.clone(),
                lote_id: nuevo.lote_id.clone(),
                cantidad: nuevo.cantidad,
                origen_ubicacion_id: None,
                destino_ubicacion_id: Some(nuevo.destino_ubicacion_id.clone()),
                caja_origen_id: None,
                caja_destino_id: nuevo.caja_destino_id.clone(),
            }],
            created_by: nuevo.created_by.clone(),
        },
    )?;

    tx.commit()?;
    Ok(TrasladoCreado {
        salida,
        entrada: Some(entrada),
    })
}

/// Crea un movimiento en estado BORRADOR (SPEC §6.2). No afecta stock.
pub fn crear_movimiento(conn: &Connection, nuevo: &NuevoMovimiento) -> AppResult<Movimiento> {
    // Entrada inicial (SPEC §7.5): reservada a quien puede administrar la
    // configuración del sistema (ADMIN/GERENTE), además de `movimiento:crear`
    // (que valida `insertar_movimiento`).
    if nuevo.sub_tipo()?.as_str() == "INICIAL" {
        puede(conn, Some(&nuevo.created_by), "configuracion", "ejecutar")?;
    }

    let tx = rusqlite::Transaction::new_unchecked(conn, TransactionBehavior::Immediate)?;
    let mov = insertar_movimiento(&tx, nuevo)?;
    tx.commit()?;
    Ok(mov)
}

/// Inserta un movimiento `BORRADOR` dentro de la transacción `tx` (sin
/// gestionarla): compartida por `crear_movimiento` y `crear_traslado`, que
/// así pueden crear las dos piernas de un traslado inter-almacén como un
/// solo hecho atómico (SPEC §9.3) — si la segunda falla, la primera se
/// revierte y no queda ningún movimiento huérfano. Valida las reglas de
/// creación (permiso `movimiento:crear`, líneas) para ambos callers.
fn validar_proveedor_activo(tx: &Connection, id: &str) -> AppResult<()> {
    let activo: i64 = tx
        .query_row("SELECT activo FROM proveedores WHERE id = ?1", [id], |r| {
            r.get(0)
        })
        .map_err(|_| AppError::NoEncontrado("proveedor", id.to_string()))?;
    if activo == 0 {
        return Err(AppError::EntidadInactiva("proveedor"));
    }
    Ok(())
}

fn validar_cliente_activo(tx: &Connection, id: &str) -> AppResult<()> {
    let activo: i64 = tx
        .query_row("SELECT activo FROM clientes WHERE id = ?1", [id], |r| {
            r.get(0)
        })
        .map_err(|_| AppError::NoEncontrado("cliente", id.to_string()))?;
    if activo == 0 {
        return Err(AppError::EntidadInactiva("cliente"));
    }
    Ok(())
}

fn insertar_movimiento(tx: &Connection, nuevo: &NuevoMovimiento) -> AppResult<Movimiento> {
    nuevo.validar()?;
    puede(tx, Some(&nuevo.created_by), "movimiento", "crear")?;
    if let Some(pid) = &nuevo.proveedor_id {
        validar_proveedor_activo(tx, pid)?;
    }
    if let Some(cid) = &nuevo.cliente_id {
        validar_cliente_activo(tx, cid)?;
    }
    let tipo = nuevo.tipo()?.as_str();
    let sub_tipo = nuevo.sub_tipo()?.as_str();
    let id = Uuid::new_v4().to_string();
    let ts = ahora();
    let anio = &ts[..4];
    let numero = generar_numero(tx, anio)?;
    let fecha_movimiento = nuevo.fecha_movimiento.clone().unwrap_or_else(ahora);

    // Validaciones por línea (producto activo, lote requerido, etc.).
    for linea in &nuevo.lineas {
        let reglas = reglas_producto(tx, &linea.producto_id)?;
        if !reglas.activo {
            return Err(AppError::EntidadInactiva("producto"));
        }
        // SPEC §3.7: si controla_lote, toda línea debe indicar lote.
        if reglas.controla_lote && linea.lote_id.is_none() {
            return Err(AppError::LoteRequerido(reglas.sku));
        }
        // SPEC §5.2: si el producto NO controla lote, no debe llegar lote.
        if !reglas.controla_lote && linea.lote_id.is_some() {
            return Err(AppError::CampoInvalido(format!(
                "el producto '{}' no controla lote: no debe indicarse lote",
                reglas.sku
            )));
        }
        // Validar que el lote pertenezca al producto (integridad §14.1).
        if let Some(lote_id) = &linea.lote_id {
            let existe: i64 = tx.query_row(
                "SELECT COUNT(*) FROM lotes WHERE id = ?1 AND producto_id = ?2",
                rusqlite::params![lote_id, linea.producto_id],
                |r| r.get(0),
            )?;
            if existe == 0 {
                return Err(AppError::NoEncontrado("lote", lote_id.clone()));
            }
        }
    }

    tx.execute(
        "INSERT INTO movimientos (id, tipo, sub_tipo, numero, estado, fecha_movimiento, motivo,
                origen_ubicacion_id, destino_ubicacion_id, proveedor_id, cliente_id, sesion_inventario_id,
                documento_referencia, notas, created_by, created_at)
         VALUES (?1, ?2, ?3, ?4, 'BORRADOR', ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14, ?15)",
        rusqlite::params![
            id, tipo, sub_tipo, numero, fecha_movimiento, nuevo.motivo,
            nuevo.origen_ubicacion_id, nuevo.destino_ubicacion_id, nuevo.proveedor_id, nuevo.cliente_id,
            nuevo.sesion_inventario_id, nuevo.documento_referencia, nuevo.notas, nuevo.created_by, ts
        ],
    )?;

    for linea in &nuevo.lineas {
        let lid = Uuid::new_v4().to_string();
        tx.execute(
            "INSERT INTO movimiento_lineas (id, movimiento_id, producto_id, lote_id, cantidad,
                    origen_ubicacion_id, destino_ubicacion_id, caja_origen_id, caja_destino_id, costo_unitario)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10)",
            rusqlite::params![
                lid,
                id,
                linea.producto_id,
                linea.lote_id,
                linea.cantidad,
                linea.origen_ubicacion_id,
                linea.destino_ubicacion_id,
                linea.caja_origen_id,
                linea.caja_destino_id,
                linea.costo_unitario
            ],
        )?;
    }

    EventoAuditoria(tx).registrar(
        Some(&nuevo.created_by),
        "crear",
        "movimiento",
        Some(&id),
        None,
        None,
    )?;
    Ok(obtener_movimiento(tx, &id)?.expect("recién insertado"))
}

/// Edita un movimiento en `BORRADOR`/`PENDIENTE_APROBACION` (SPEC §6.2: los
/// aprobados son inmutables). Solo el creador puede editarlo. Reemplaza las
/// líneas con las mismas validaciones de `crear_movimiento` (producto activo,
/// `controla_lote` exige lote, lote pertenece al producto, motivo obligatorio
/// para ajustes/mermas). `tipo`/`sub_tipo`/`numero` no se tocan.
pub fn editar_movimiento(
    conn: &Connection,
    id: &str,
    cambios: &EditarMovimiento,
    actor: &str,
) -> AppResult<Movimiento> {
    puede(conn, Some(actor), "movimiento", "crear")?;
    if cambios.lineas.is_empty() {
        return Err(AppError::CampoRequerido("lineas".into()));
    }
    for linea in &cambios.lineas {
        if linea.cantidad <= 0 {
            return Err(AppError::CampoRequerido("cantidad (> 0)".into()));
        }
    }

    let tx = conn.unchecked_transaction()?;
    let actual = obtener_movimiento(&tx, id)?
        .ok_or_else(|| AppError::NoEncontrado("movimiento", id.to_string()))?;

    // SPEC §6.2: "BORRADOR: editable por su creador". Un aprobado jamás se edita.
    if actual.created_by != actor {
        return Err(AppError::SinPermiso(
            "movimiento:editar (solo el creador)".into(),
        ));
    }
    let estado = EstadoMovimiento::parse(&actual.estado)
        .ok_or_else(|| AppError::CampoRequerido("estado".into()))?;
    if estado != EstadoMovimiento::Borrador && estado != EstadoMovimiento::PendienteAprobacion {
        return Err(AppError::MovimientoAprobadoNoEditable);
    }

    // Motivo obligatorio para ajustes/mermas (SPEC §10.3), con el sub_tipo
    // estable del movimiento (no se puede cambiar de tipo al editar).
    let subtipo = SubTipoMovimiento::parse(&actual.sub_tipo)
        .ok_or_else(|| AppError::CampoRequerido("sub_tipo".into()))?;
    let requiere_motivo = matches!(
        subtipo,
        SubTipoMovimiento::AjustePositivo
            | SubTipoMovimiento::AjusteNegativo
            | SubTipoMovimiento::Merma
    );
    let motivo = match &cambios.motivo {
        Some(Some(v)) => Some(v.clone()),
        Some(None) => None,
        None => actual.motivo.clone(),
    };
    if requiere_motivo {
        let m = motivo.as_deref().unwrap_or("").trim();
        if m.len() < 3 {
            return Err(AppError::MotivoRequerido);
        }
    }

    // Validaciones por línea, idénticas a crear_movimiento (SPEC §6.1, §3.7).
    for linea in &cambios.lineas {
        let reglas = reglas_producto(&tx, &linea.producto_id)?;
        if !reglas.activo {
            return Err(AppError::EntidadInactiva("producto"));
        }
        if reglas.controla_lote && linea.lote_id.is_none() {
            return Err(AppError::LoteRequerido(reglas.sku));
        }
        if let Some(lote_id) = &linea.lote_id {
            let existe: i64 = tx.query_row(
                "SELECT COUNT(*) FROM lotes WHERE id = ?1 AND producto_id = ?2",
                rusqlite::params![lote_id, linea.producto_id],
                |r| r.get(0),
            )?;
            if existe == 0 {
                return Err(AppError::NoEncontrado("lote", lote_id.clone()));
            }
        }
    }

    // Cabecera: solo campos operativos, los estables no se tocan.
    let fecha_movimiento = cambios
        .fecha_movimiento
        .clone()
        .unwrap_or(actual.fecha_movimiento);
    let proveedor_id = match &cambios.proveedor_id {
        Some(Some(v)) => Some(v.clone()),
        Some(None) => None,
        None => actual.proveedor_id,
    };
    let cliente_id = match &cambios.cliente_id {
        Some(Some(v)) => Some(v.clone()),
        Some(None) => None,
        None => actual.cliente_id,
    };
    let documento_referencia = match &cambios.documento_referencia {
        Some(Some(v)) => Some(v.clone()),
        Some(None) => None,
        None => actual.documento_referencia,
    };
    let notas = match &cambios.notas {
        Some(Some(v)) => Some(v.clone()),
        Some(None) => None,
        None => actual.notas,
    };
    tx.execute(
        "UPDATE movimientos SET fecha_movimiento = ?2, motivo = ?3, proveedor_id = ?4,
                cliente_id = ?5, documento_referencia = ?6, notas = ?7
         WHERE id = ?1",
        rusqlite::params![
            id,
            fecha_movimiento,
            motivo,
            proveedor_id,
            cliente_id,
            documento_referencia,
            notas
        ],
    )?;

    // Reemplazar líneas: borrar las actuales e insertar las nuevas.
    tx.execute(
        "DELETE FROM movimiento_lineas WHERE movimiento_id = ?1",
        [id],
    )?;
    for linea in &cambios.lineas {
        let lid = Uuid::new_v4().to_string();
        tx.execute(
            "INSERT INTO movimiento_lineas (id, movimiento_id, producto_id, lote_id, cantidad,
                    origen_ubicacion_id, destino_ubicacion_id, caja_origen_id, caja_destino_id, costo_unitario)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10)",
            rusqlite::params![
                lid,
                id,
                linea.producto_id,
                linea.lote_id,
                linea.cantidad,
                linea.origen_ubicacion_id,
                linea.destino_ubicacion_id,
                linea.caja_origen_id,
                linea.caja_destino_id,
                linea.costo_unitario
            ],
        )?;
    }

    EventoAuditoria(&tx).registrar(Some(actor), "editar", "movimiento", Some(id), None, None)?;
    tx.commit()?;
    Ok(obtener_movimiento(conn, id)?.expect("existe"))
}

/// Pasa un movimiento de BORRADOR a PENDIENTE_APROBACION.
pub fn enviar_a_aprobacion(conn: &Connection, id: &str, by: &str) -> AppResult<Movimiento> {
    puede(conn, Some(by), "movimiento", "crear")?;
    let tx = conn.unchecked_transaction()?;
    let estado = estado_movimiento(&tx, id)?;
    match estado {
        EstadoMovimiento::Borrador => {
            tx.execute(
                "UPDATE movimientos SET estado = 'PENDIENTE_APROBACION' WHERE id = ?1",
                [id],
            )?;
        }
        _ => {
            return Err(AppError::TransicionInvalida(
                "PENDIENTE_APROBACION".into(),
                estado.as_str().into(),
            ));
        }
    }
    EventoAuditoria(&tx).registrar(
        Some(by),
        "enviar_a_aprobacion",
        "movimiento",
        Some(id),
        None,
        None,
    )?;
    tx.commit()?;
    Ok(obtener_movimiento(conn, id)?.expect("existe"))
}

/// Aprobar = ejecutar las líneas atómicamente (SPEC §6.2). Único estado que altera saldos.
/// Usa transacción `Immediate` (no `DEFERRED`) para serializar lecturas de
/// saldo concurrentes y evitar saldo negativo por carrera (SPEC §14.2, §14.6).
pub fn aprobar_movimiento(conn: &Connection, id: &str, by: &str) -> AppResult<Movimiento> {
    puede(conn, Some(by), "movimiento", "aprobar")?;
    let tx = rusqlite::Transaction::new_unchecked(conn, rusqlite::TransactionBehavior::Immediate)?;

    let (estado, tipo, sub_tipo) = estado_tipo(&tx, id)?;
    if estado != EstadoMovimiento::Borrador && estado != EstadoMovimiento::PendienteAprobacion {
        return Err(AppError::TransicionInvalida(
            "APROBADO".into(),
            estado.as_str().into(),
        ));
    }
    let tipo_mov = tipo.as_str();
    let sub = sub_tipo.as_str();

    // Validar proveedor/cliente activos también en aprobar (por si se
    // desactivó entre crear y aprobar).
    let (proveedor_id, cliente_id): (Option<String>, Option<String>) = tx.query_row(
        "SELECT proveedor_id, cliente_id FROM movimientos WHERE id = ?1",
        [id],
        |r| Ok((r.get(0)?, r.get(1)?)),
    )?;
    if let Some(pid) = proveedor_id {
        validar_proveedor_activo(&tx, &pid)?;
    }
    if let Some(cid) = cliente_id {
        validar_cliente_activo(&tx, &cid)?;
    }

    // Cargar líneas.
    let mut stmt = tx.prepare(
        "SELECT id, producto_id, lote_id, cantidad, origen_ubicacion_id, destino_ubicacion_id,
                caja_origen_id, caja_destino_id, costo_unitario
         FROM movimiento_lineas WHERE movimiento_id = ?1",
    )?;
    let lineas = stmt
        .query_map([id], |r| {
            Ok(LineaMovimiento {
                id: r.get(0)?,
                movimiento_id: id.to_string(),
                producto_id: r.get(1)?,
                lote_id: r.get(2)?,
                cantidad: r.get(3)?,
                origen_ubicacion_id: r.get(4)?,
                destino_ubicacion_id: r.get(5)?,
                caja_origen_id: r.get(6)?,
                caja_destino_id: r.get(7)?,
                costo_unitario: r.get(8)?,
            })
        })?
        .collect::<Result<Vec<_>, _>>()?;
    drop(stmt);

    for linea in &lineas {
        let reglas = reglas_producto(&tx, &linea.producto_id)?;
        // Productos inactivos no reciben entradas ni salidas (SPEC §3.7).
        if !reglas.activo {
            return Err(AppError::EntidadInactiva("producto"));
        }

        let (origen, destino) = match tipo_mov {
            "ENTRADA" => (None, Some(destino_obligatorio(&tx, sub, linea)?)),
            "SALIDA" => (Some(origen_obligatorio(&tx, sub, linea)?), None),
            "TRASLADO" => (
                Some(origen_obligatorio(&tx, sub, linea)?),
                Some(destino_obligatorio(&tx, sub, linea)?),
            ),
            "AJUSTE" => match sub {
                "AJUSTE_POSITIVO" => (None, Some(destino_obligatorio(&tx, sub, linea)?)),
                "AJUSTE_NEGATIVO" => (Some(origen_obligatorio(&tx, sub, linea)?), None),
                _ => return Err(AppError::CampoRequerido("sub_tipo".into())),
            },
            "CONSUMO" => (Some(origen_obligatorio(&tx, sub, linea)?), None),
            _ => return Err(AppError::CampoRequerido("tipo".into())),
        };

        // SPEC §14.6: una sesión de inventario en curso bloquea ajustes
        // manuales sobre las ubicaciones de su almacén (deben aplicarse como
        // diferencias de la sesión, no a mano por fuera de ella).
        if tipo_mov == "AJUSTE" {
            let ubicacion_ajustada = origen
                .as_deref()
                .or(destino.as_deref())
                .expect("ajuste siempre tiene un lado");
            verificar_sin_inventario_en_curso(&tx, ubicacion_ajustada)?;
        }

        // Salidas y traslados: saldo suficiente (SPEC §14.2), nunca negativo.
        if let Some(ori) = &origen {
            let disponible = saldo_actual(&tx, ori, &linea.producto_id, linea.lote_id.as_deref())?;
            if disponible < linea.cantidad {
                let codigo = codigo_ubicacion(&tx, ori)?;
                return Err(AppError::SaldoInsuficiente {
                    ubicacion: codigo,
                    disponible,
                    intentado: linea.cantidad,
                });
            }
            // Regla dura §8.6: lote vencido no sale como CLIENTE ni DEVOLUCION_PROVEEDOR.
            if (sub == "CLIENTE" || sub == "DEVOLUCION_PROVEEDOR")
                && let Some(lote_id) = &linea.lote_id
            {
                let vencimiento: Option<String> = tx.query_row(
                    "SELECT fecha_vencimiento FROM lotes WHERE id = ?1",
                    [lote_id],
                    |r| r.get(0),
                )?;
                if let Some(venc) = vencimiento {
                    let hoy = &ahora()[..10];
                    if venc.as_str() < hoy {
                        let num = codigo_lote(&tx, lote_id)?;
                        return Err(AppError::LoteVencido(num));
                    }
                }
            }
        }

        // Entradas y traslados: validar capacidad de destino (SPEC §5.4, §3.5).
        if let Some(dest) = &destino {
            validar_capacidad(&tx, dest, &linea.producto_id, linea.cantidad)?;
        }

        // Restricción de caja (SPEC §3.6): si la caja declara producto/lote,
        // solo admite ese producto/lote.
        if let Some(caja_id) = &linea.caja_origen_id {
            validar_restriccion_caja(&tx, caja_id, &linea.producto_id, linea.lote_id.as_deref())?;
        }
        if let Some(caja_id) = &linea.caja_destino_id {
            validar_restriccion_caja(&tx, caja_id, &linea.producto_id, linea.lote_id.as_deref())?;
        }

        // Valorización (Fase D): si la línea es una entrada con costo, se
        // actualiza el costo del producto según el método configurado (antes
        // de aplicar la línea, para usar el saldo previo en el promedio).
        if destino.is_some()
            && let Some(costo) = linea.costo_unitario
            && costo > 0.0
        {
            actualizar_costo_producto(&tx, &linea.producto_id, costo, linea.cantidad)?;
        }

        aplicar_linea(&tx, linea, origen.as_deref(), destino.as_deref())?;
    }

    let ts = ahora();
    tx.execute(
        "UPDATE movimientos SET estado = 'APROBADO', approved_by = ?2, approved_at = ?3 WHERE id = ?1",
        rusqlite::params![id, by, ts],
    )?;
    crate::domain::seguridad::EventoAuditoria::registrar(
        &tx,
        Some(by),
        "aprobar",
        "movimiento",
        Some(id),
        None,
        None,
        None,
    )?;
    tx.commit()?;
    Ok(obtener_movimiento(conn, id)?.expect("existe"))
}

/// Anular: si el movimiento afectó stock (APROBADO), genera el inverso (SPEC §6.2).
pub fn anular_movimiento(conn: &Connection, id: &str, by: &str) -> AppResult<Movimiento> {
    puede(conn, Some(by), "movimiento", "anular")?;
    let tx = rusqlite::Transaction::new_unchecked(conn, TransactionBehavior::Immediate)?;
    let (estado, tipo, sub_tipo) = estado_tipo(&tx, id)?;
    match estado {
        EstadoMovimiento::Aprobado => {
            let inverso_id = Uuid::new_v4().to_string();
            let ts = ahora();
            let anio = &ts[..4];
            let numero = generar_numero(&tx, anio)?;

            // Cargar líneas del original.
            let mut stmt = tx.prepare(
                "SELECT producto_id, lote_id, cantidad, origen_ubicacion_id, destino_ubicacion_id,
                        caja_origen_id, caja_destino_id
                 FROM movimiento_lineas WHERE movimiento_id = ?1",
            )?;
            let lineas: Vec<LineaInversa> = stmt
                .query_map([id], |r| {
                    Ok((
                        r.get(0)?,
                        r.get(1)?,
                        r.get(2)?,
                        r.get(3)?,
                        r.get(4)?,
                        r.get(5)?,
                        r.get(6)?,
                    ))
                })?
                .collect::<Result<_, _>>()?;
            drop(stmt);

            // Invertir tipo/sentido.
            let (tipo_inv, sub_inv) = invertir_tipo(tipo.as_str(), sub_tipo.as_str())?;

            tx.execute(
                "INSERT INTO movimientos (id, tipo, sub_tipo, numero, estado, fecha_movimiento, motivo,
                        documento_referencia, notas, movimiento_inverso_id, created_by, created_at, anulado_by, anulado_at)
                 VALUES (?1, ?2, ?3, ?4, 'APROBADO', ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13)",
                rusqlite::params![
                    inverso_id, tipo_inv, sub_inv, numero, ahora(),
                    "Anulación del movimiento original", Option::<&str>::None, Option::<&str>::None, id, by, ts, by, ts
                ],
            )?;

            // Ejecutar líneas inversas contra los saldos.
            for (producto, lote, cantidad, orig, dest, _co, _cd) in &lineas {
                // Invertir el sentido: lo que entró sale, lo que salió entra.
                let (nuevo_origen, nuevo_destino) = match tipo_inv {
                    // SALIDA inversa: sale desde el destino de la entrada original.
                    "SALIDA" => (dest.clone(), None),
                    // ENTRADA inversa: entra al origen de la salida original.
                    "ENTRADA" => (None, orig.clone()),
                    // TRASLADO inverso: intercambiar origen/destino.
                    "TRASLADO" => (dest.clone(), orig.clone()),
                    "AJUSTE" => (orig.clone(), dest.clone()),
                    _ => (None, None),
                };
                // Validar saldo en origen del inverso.
                if let Some(o) = &nuevo_origen {
                    let disp = saldo_actual(&tx, o, producto, lote.as_deref())?;
                    if disp < *cantidad {
                        let codigo = codigo_ubicacion(&tx, o)?;
                        return Err(AppError::SaldoInsuficiente {
                            ubicacion: codigo,
                            disponible: disp,
                            intentado: *cantidad,
                        });
                    }
                }
                aplicar_linea_inversa(
                    &tx,
                    &inverso_id,
                    producto,
                    lote.as_deref(),
                    *cantidad,
                    nuevo_origen.as_deref(),
                    nuevo_destino.as_deref(),
                )?;
            }

            // Marcar original como anulado.
            tx.execute(
                "UPDATE movimientos SET estado = 'ANULADO', anulado_by = ?2, anulado_at = ?3, movimiento_inverso_id = ?4 WHERE id = ?1",
                rusqlite::params![id, by, ts, inverso_id],
            )?;
            crate::domain::seguridad::EventoAuditoria::registrar(
                &tx,
                Some(by),
                "anular",
                "movimiento",
                Some(id),
                None,
                None,
                None,
            )?;
            tx.commit()?;
        }
        EstadoMovimiento::Borrador | EstadoMovimiento::PendienteAprobacion => {
            // Sin efecto sobre stock: solo se marca anulado.
            let ts = ahora();
            tx.execute(
                "UPDATE movimientos SET estado = 'ANULADO', anulado_by = ?2, anulado_at = ?3 WHERE id = ?1",
                rusqlite::params![id, by, ts],
            )?;
            EventoAuditoria(&tx).registrar(
                Some(by),
                "anular",
                "movimiento",
                Some(id),
                None,
                None,
            )?;
            tx.commit()?;
        }
        EstadoMovimiento::Anulado => {
            return Err(AppError::MovimientoAnulado);
        }
    }
    Ok(obtener_movimiento(conn, id)?.expect("existe"))
}

/// Aplica una línea sobre los saldos materializados (incremento/decremento).
/// `lote_key` = '' cuando no hay lote, para que ON CONFLICT funcione en SQLite.
fn aplicar_linea(
    tx: &Connection,
    linea: &LineaMovimiento,
    origen: Option<&str>,
    destino: Option<&str>,
) -> AppResult<()> {
    let lote_key = linea.lote_id.clone().unwrap_or_default();
    // Salida de origen: decrementa el saldo existente (nunca crea fila negativa).
    // Se valida antes que `disponible >= cantidad`, así que el UPDATE debe
    // afectar exactamente 1 fila; si no, es un estado inconsistente.
    if let Some(o) = origen {
        let ts = ahora();
        let cambios = tx.execute(
            "UPDATE saldos SET cantidad = cantidad - ?1, updated_at = ?2
             WHERE ubicacion_id = ?3 AND producto_id = ?4 AND lote_key = ?5",
            rusqlite::params![linea.cantidad, ts, o, linea.producto_id, lote_key],
        )?;
        if cambios == 0 {
            // No existía fila pero la validación dijo que había saldo: inconsistencia.
            // Para cumplir el CHECK sin crear fila negativa, insertamos el delta
            // negativo solo si no existe — pero esto solo ocurre en un bug.
            return Err(AppError::SaldoNegativo {
                ubicacion: codigo_ubicacion(tx, o)?,
                producto: linea.producto_id.clone(),
            });
        }
        // Guard contra saldo negativo por carrera (el CHECK también lo protege).
        let nuevo: i64 = tx.query_row(
            "SELECT cantidad FROM saldos WHERE ubicacion_id=?1 AND producto_id=?2 AND lote_key=?3",
            rusqlite::params![o, linea.producto_id, lote_key],
            |r| r.get(0),
        )?;
        if nuevo < 0 {
            return Err(AppError::SaldoNegativo {
                ubicacion: codigo_ubicacion(tx, o)?,
                producto: linea.producto_id.clone(),
            });
        }
    }
    // Entrada en destino: valor neto positivo; ON CONFLICT suma.
    if let Some(d) = destino {
        tx.execute(
            "INSERT INTO saldos (ubicacion_id, producto_id, lote_id, lote_key, cantidad, updated_at)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6)
             ON CONFLICT(ubicacion_id, producto_id, lote_key) DO UPDATE SET
               cantidad = cantidad + excluded.cantidad,
               updated_at = excluded.updated_at",
            rusqlite::params![d, linea.producto_id, linea.lote_id, lote_key, linea.cantidad, ahora()],
        )?;
    }
    Ok(())
}

/// Aplica una línea inversa durante la anulación.
fn aplicar_linea_inversa(
    tx: &Connection,
    movimiento_id: &str,
    producto: &str,
    lote: Option<&str>,
    cantidad: i64,
    origen: Option<&str>,
    destino: Option<&str>,
) -> AppResult<()> {
    let lid = Uuid::new_v4().to_string();
    tx.execute(
        "INSERT INTO movimiento_lineas (id, movimiento_id, producto_id, lote_id, cantidad, origen_ubicacion_id, destino_ubicacion_id)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)",
        rusqlite::params![lid, movimiento_id, producto, lote, cantidad, origen, destino],
    )?;
    let lote_key = lote.unwrap_or_default();
    if let Some(o) = origen {
        let ts = ahora();
        let cambios = tx.execute(
            "UPDATE saldos SET cantidad = cantidad - ?1, updated_at = ?2
             WHERE ubicacion_id = ?3 AND producto_id = ?4 AND lote_key = ?5",
            rusqlite::params![cantidad, ts, o, producto, lote_key],
        )?;
        if cambios == 0 {
            return Err(AppError::SaldoNegativo {
                ubicacion: codigo_ubicacion(tx, o)?,
                producto: producto.to_string(),
            });
        }
        let nuevo: i64 = tx.query_row(
            "SELECT cantidad FROM saldos WHERE ubicacion_id=?1 AND producto_id=?2 AND lote_key=?3",
            rusqlite::params![o, producto, lote_key],
            |r| r.get(0),
        )?;
        if nuevo < 0 {
            return Err(AppError::SaldoNegativo {
                ubicacion: codigo_ubicacion(tx, o)?,
                producto: producto.to_string(),
            });
        }
    }
    if let Some(d) = destino {
        tx.execute(
            "INSERT INTO saldos (ubicacion_id, producto_id, lote_id, lote_key, cantidad, updated_at)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6)
             ON CONFLICT(ubicacion_id, producto_id, lote_key) DO UPDATE SET
               cantidad = cantidad + excluded.cantidad, updated_at = excluded.updated_at",
            rusqlite::params![d, producto, lote, lote_key, cantidad, ahora()],
        )?;
    }
    Ok(())
}

/// SPEC §14.6: mientras una sesión de inventario está `EN_CURSO` en el
/// almacén de `ubicacion`, los ajustes manuales quedan bloqueados — las
/// diferencias deben resolverse a través de la sesión (§11.5), no por fuera.
fn verificar_sin_inventario_en_curso(tx: &Connection, ubicacion: &str) -> AppResult<()> {
    let almacen_id = crate::repo::catalogo::resolver_almacen_id_de_ubicacion(tx, ubicacion)?;
    let en_curso: i64 = tx.query_row(
        "SELECT COUNT(*) FROM sesiones_inventario WHERE almacen_id = ?1 AND estado = 'EN_CURSO'",
        [&almacen_id],
        |r| r.get(0),
    )?;
    if en_curso > 0 {
        let codigo = codigo_ubicacion(tx, ubicacion)?;
        return Err(AppError::AjusteBloqueadoPorInventario(codigo));
    }
    Ok(())
}

/// Valida la capacidad máxima de una ubicación antes de ingresar (SPEC §5.4):
/// la capacidad es un tope agregado de **toda** la mercancía de la ubicación
/// (todos los productos y lotes), no solo del producto que entra.
fn validar_capacidad(
    tx: &Connection,
    ubicacion: &str,
    _producto: &str,
    cantidad: i64,
) -> AppResult<()> {
    let capacidad: Option<i64> = tx.query_row(
        "SELECT capacidad_maxima FROM ubicaciones WHERE id = ?1",
        [ubicacion],
        |r| r.get(0),
    )?;
    if let Some(cap) = capacidad {
        let actual: i64 = tx.query_row(
            "SELECT COALESCE(SUM(cantidad), 0) FROM saldos WHERE ubicacion_id = ?1",
            [ubicacion],
            |r| r.get(0),
        )?;
        if actual + cantidad > cap {
            let codigo = codigo_ubicacion(tx, ubicacion)?;
            return Err(AppError::CapacidadExcedida(codigo));
        }
    }
    Ok(())
}

/// Restricción de caja (SPEC §3.6): si la caja declara `producto_id`/`lote_id`,
/// solo admite ese producto/lote — nunca stock mezclado.
fn validar_restriccion_caja(
    tx: &Connection,
    caja_id: &str,
    producto_id: &str,
    lote_id: Option<&str>,
) -> AppResult<()> {
    let (codigo, producto_restringido, lote_restringido): (String, Option<String>, Option<String>) =
        tx.query_row(
            "SELECT codigo, producto_id, lote_id FROM cajas WHERE id = ?1",
            [caja_id],
            |r| Ok((r.get(0)?, r.get(1)?, r.get(2)?)),
        )
        .map_err(|_| AppError::NoEncontrado("caja", caja_id.to_string()))?;
    if let Some(p) = &producto_restringido
        && p != producto_id
    {
        return Err(AppError::CajaRestringida(codigo));
    }
    if let Some(l) = &lote_restringido
        && Some(l.as_str()) != lote_id
    {
        return Err(AppError::CajaRestringida(codigo));
    }
    Ok(())
}

/// Método de valorización configurado (`PROMEDIO` | `ULTIMO`). Default `ULTIMO`.
fn metodo_valorizacion(tx: &Connection) -> String {
    tx.query_row(
        "SELECT metodo_valorizacion FROM configuracion_empresa WHERE id = 'default'",
        [],
        |r| r.get(0),
    )
    .unwrap_or_else(|_| "ULTIMO".into())
}

/// Actualiza el `costo_unitario` del producto al aprobar una entrada (Fase D):
/// `ULTIMO` fija el costo de la línea; `PROMEDIO` pondera con el stock previo.
/// Se llama ANTES de `aplicar_linea` para usar el saldo previo en el promedio.
fn actualizar_costo_producto(
    tx: &Connection,
    producto: &str,
    costo: f64,
    cantidad: i64,
) -> AppResult<()> {
    let metodo = metodo_valorizacion(tx);
    let costo_nuevo = if metodo == "PROMEDIO" {
        let stock_previo: i64 = tx.query_row(
            "SELECT COALESCE(SUM(cantidad), 0) FROM saldos WHERE producto_id = ?1",
            [producto],
            |r| r.get(0),
        )?;
        let costo_actual: Option<f64> = tx.query_row(
            "SELECT costo_unitario FROM productos WHERE id = ?1",
            [producto],
            |r| r.get(0),
        )?;
        match (costo_actual, stock_previo) {
            (Some(ca), s) if s > 0 && ca > 0.0 => {
                (ca * s as f64 + costo * cantidad as f64) / (s + cantidad) as f64
            }
            _ => costo,
        }
    } else {
        costo
    };
    tx.execute(
        "UPDATE productos SET costo_unitario = ?2 WHERE id = ?1",
        rusqlite::params![producto, costo_nuevo],
    )?;
    Ok(())
}

fn origen_obligatorio(_tx: &Connection, _sub: &str, linea: &LineaMovimiento) -> AppResult<String> {
    linea
        .origen_ubicacion_id
        .clone()
        .ok_or_else(|| AppError::CampoRequerido("origen_ubicacion_id".into()))
}

fn destino_obligatorio(_tx: &Connection, _sub: &str, linea: &LineaMovimiento) -> AppResult<String> {
    linea
        .destino_ubicacion_id
        .clone()
        .ok_or_else(|| AppError::CampoRequerido("destino_ubicacion_id".into()))
}

fn estado_movimiento(conn: &Connection, id: &str) -> AppResult<EstadoMovimiento> {
    let s: String = conn.query_row("SELECT estado FROM movimientos WHERE id = ?1", [id], |r| {
        r.get(0)
    })?;
    EstadoMovimiento::parse(&s).ok_or_else(|| AppError::CampoRequerido("estado".into()))
}

fn estado_tipo(conn: &Connection, id: &str) -> AppResult<(EstadoMovimiento, String, String)> {
    conn.query_row(
        "SELECT estado, tipo, sub_tipo FROM movimientos WHERE id = ?1",
        [id],
        |r| {
            let estado = r.get::<_, String>(0)?;
            let tipo = r.get::<_, String>(1)?;
            let sub = r.get::<_, String>(2)?;
            Ok((
                EstadoMovimiento::parse(&estado).ok_or(rusqlite::Error::InvalidQuery)?,
                tipo,
                sub,
            ))
        },
    )
    .map_err(|_| AppError::NoEncontrado("movimiento", id.to_string()))
}

fn invertir_tipo(tipo: &str, sub: &str) -> AppResult<(&'static str, &'static str)> {
    match (tipo, sub) {
        ("ENTRADA", "COMPRA") => Ok(("SALIDA", "DEVOLUCION_PROVEEDOR")),
        ("ENTRADA", "DEVOLUCION_CLIENTE") => Ok(("SALIDA", "CLIENTE")),
        ("ENTRADA", "AJUSTE_POSITIVO") => Ok(("SALIDA", "AJUSTE_NEGATIVO")),
        ("ENTRADA", "INICIAL") => Ok(("SALIDA", "AJUSTE_NEGATIVO")),
        ("ENTRADA", "TRASLADO_ENTRADA") => Ok(("SALIDA", "TRASLADO_SALIDA")),
        ("SALIDA", "CLIENTE") => Ok(("ENTRADA", "DEVOLUCION_CLIENTE")),
        ("SALIDA", "DEVOLUCION_PROVEEDOR") => Ok(("ENTRADA", "COMPRA")),
        ("SALIDA", "MERMA") => Ok(("ENTRADA", "AJUSTE_POSITIVO")),
        ("SALIDA", "AJUSTE_NEGATIVO") => Ok(("ENTRADA", "AJUSTE_POSITIVO")),
        ("SALIDA", "TRASLADO_SALIDA") => Ok(("ENTRADA", "TRASLADO_ENTRADA")),
        ("TRASLADO", _) => Ok(("TRASLADO", "TRASLADO_ENTRADA")),
        ("AJUSTE", "AJUSTE_POSITIVO") => Ok(("SALIDA", "AJUSTE_NEGATIVO")),
        ("AJUSTE", "AJUSTE_NEGATIVO") => Ok(("ENTRADA", "AJUSTE_POSITIVO")),
        _ => Err(AppError::CampoRequerido("inversión no soportada".into())),
    }
}

pub fn obtener_movimiento(conn: &Connection, id: &str) -> AppResult<Option<Movimiento>> {
    let mut stmt = conn.prepare(
        "SELECT id, tipo, sub_tipo, numero, estado, fecha_movimiento, motivo,
                origen_ubicacion_id, destino_ubicacion_id, proveedor_id, cliente_id, sesion_inventario_id,
                documento_referencia, notas, movimiento_inverso_id, created_by, created_at,
                approved_by, approved_at, anulado_by, anulado_at
         FROM movimientos WHERE id = ?1",
    )?;
    let mut rows = stmt.query_map([id], map_movimiento)?;
    rows.next().transpose().map_err(AppError::from)
}

/// Líneas de un movimiento en orden de inserción (SPEC §6.1). Usado por los
/// tests de edición; la UI las lee vía el motor de consulta universal.
#[allow(dead_code)]
pub fn obtener_lineas(conn: &Connection, movimiento_id: &str) -> AppResult<Vec<LineaMovimiento>> {
    let mut stmt = conn.prepare(
        "SELECT id, movimiento_id, producto_id, lote_id, cantidad, origen_ubicacion_id,
                destino_ubicacion_id, caja_origen_id, caja_destino_id, costo_unitario
         FROM movimiento_lineas WHERE movimiento_id = ?1 ORDER BY rowid",
    )?;
    let rows = stmt
        .query_map([movimiento_id], |r| {
            Ok(LineaMovimiento {
                id: r.get(0)?,
                movimiento_id: r.get(1)?,
                producto_id: r.get(2)?,
                lote_id: r.get(3)?,
                cantidad: r.get(4)?,
                origen_ubicacion_id: r.get(5)?,
                destino_ubicacion_id: r.get(6)?,
                caja_origen_id: r.get(7)?,
                caja_destino_id: r.get(8)?,
                costo_unitario: r.get(9)?,
            })
        })?
        .collect::<Result<Vec<_>, _>>()?;
    Ok(rows)
}

fn map_movimiento(r: &rusqlite::Row<'_>) -> rusqlite::Result<Movimiento> {
    Ok(Movimiento {
        id: r.get(0)?,
        tipo: r.get(1)?,
        sub_tipo: r.get(2)?,
        numero: r.get(3)?,
        estado: r.get(4)?,
        fecha_movimiento: r.get(5)?,
        motivo: r.get(6)?,
        origen_ubicacion_id: r.get(7)?,
        destino_ubicacion_id: r.get(8)?,
        proveedor_id: r.get(9)?,
        cliente_id: r.get(10)?,
        sesion_inventario_id: r.get(11)?,
        documento_referencia: r.get(12)?,
        notas: r.get(13)?,
        movimiento_inverso_id: r.get(14)?,
        created_by: r.get(15)?,
        created_at: r.get(16)?,
        approved_by: r.get(17)?,
        approved_at: r.get(18)?,
        anulado_by: r.get(19)?,
        anulado_at: r.get(20)?,
    })
}

/// Sugerencia de una línea de salida: cuánto tomar de qué lote/ubicación.
#[derive(Debug, Clone, serde::Serialize)]
pub struct SugerenciaLinea {
    pub ubicacion_id: String,
    pub lote_id: Option<String>,
    pub cantidad: i64,
}

/// Sugiere el desglose de ubicación/lote para despachar `cantidad` unidades
/// de `producto_id` (SPEC §8.6): FEFO (`fecha_vencimiento` más próxima
/// primero) si el producto es perecedero o controla vencimiento, FIFO
/// (`fecha_fabricacion` más antigua primero) si solo controla lote, o el
/// stock más antiguo por ubicación si no controla lote. El usuario siempre
/// puede sobreescribir con un `lote_id` explícito al crear el movimiento;
/// esta función solo propone. Si `excluir_vencidos` es `true` (destino
/// CLIENTE o DEVOLUCION_PROVEEDOR, SPEC §8.6 regla dura), los lotes vencidos
/// no se proponen.
pub fn sugerir_lineas_salida(
    conn: &Connection,
    producto_id: &str,
    cantidad: i64,
    ubicaciones: Option<&[String]>,
    excluir_vencidos: bool,
) -> AppResult<Vec<SugerenciaLinea>> {
    if cantidad <= 0 {
        return Err(AppError::CampoRequerido("cantidad (> 0)".into()));
    }
    let reglas = reglas_producto(conn, producto_id)?;
    let hoy = ahora()[..10].to_string();

    let mut sql = String::from(
        "SELECT s.ubicacion_id, s.lote_id, s.cantidad
         FROM saldos s
         LEFT JOIN lotes l ON l.id = s.lote_id
         WHERE s.producto_id = ?1 AND s.cantidad > 0",
    );
    let mut binds: Vec<rusqlite::types::Value> = vec![producto_id.to_string().into()];
    if excluir_vencidos {
        sql.push_str(&format!(
            " AND (l.fecha_vencimiento IS NULL OR l.fecha_vencimiento >= ?{})",
            binds.len() + 1
        ));
        binds.push(hoy.into());
    }
    if let Some(ubis) = ubicaciones {
        if ubis.is_empty() {
            return Ok(Vec::new());
        }
        let placeholders = ubis
            .iter()
            .enumerate()
            .map(|(i, _)| format!("?{}", binds.len() + 1 + i))
            .collect::<Vec<_>>()
            .join(",");
        sql.push_str(&format!(" AND s.ubicacion_id IN ({placeholders})"));
        for u in ubis {
            binds.push(u.clone().into());
        }
    }
    if reglas.perecedero || reglas.controla_vencimiento {
        sql.push_str(" ORDER BY (l.fecha_vencimiento IS NULL), l.fecha_vencimiento ASC");
    } else if reglas.controla_lote {
        sql.push_str(" ORDER BY (l.fecha_fabricacion IS NULL), l.fecha_fabricacion ASC");
    } else {
        // SPEC §8.6: FIFO por entrada más antigua (usamos updated_at como proxy de
        // última entrada; ideal sería MIN(movimiento.fecha_movimiento), pero el
        // saldo materializado no guarda su fecha de origen. Fallback a updated_at.
        sql.push_str(" ORDER BY s.updated_at ASC");
    }

    let mut stmt = conn.prepare(&sql)?;
    let filas: Vec<(String, Option<String>, i64)> = stmt
        .query_map(rusqlite::params_from_iter(binds.iter()), |r| {
            Ok((r.get(0)?, r.get(1)?, r.get(2)?))
        })?
        .collect::<Result<_, _>>()?;

    let mut restante = cantidad;
    let mut sugerencias = Vec::new();
    for (ubicacion_id, lote_id, disponible) in filas {
        if restante <= 0 {
            break;
        }
        let tomar = restante.min(disponible);
        if tomar > 0 {
            sugerencias.push(SugerenciaLinea {
                ubicacion_id,
                lote_id,
                cantidad: tomar,
            });
            restante -= tomar;
        }
    }
    if restante > 0 {
        return Err(AppError::SaldoInsuficiente {
            ubicacion: "(todas las ubicaciones candidatas)".into(),
            disponible: cantidad - restante,
            intentado: cantidad,
        });
    }
    Ok(sugerencias)
}

/// Saldos por (ubicación, producto, lote) — consulta canónica SPEC §5.2.
pub fn listar_saldos(
    conn: &Connection,
    ubicacion: Option<&str>,
    producto: Option<&str>,
) -> AppResult<Vec<Saldo>> {
    let mut stmt = conn.prepare(
        "SELECT ubicacion_id, producto_id, lote_id, cantidad, updated_at
         FROM saldos
         WHERE (?1 IS NULL OR ubicacion_id = ?1) AND (?2 IS NULL OR producto_id = ?2)
         ORDER BY ubicacion_id, producto_id",
    )?;
    let rows = stmt
        .query_map(rusqlite::params![ubicacion, producto], |r| {
            Ok(Saldo {
                ubicacion_id: r.get(0)?,
                producto_id: r.get(1)?,
                lote_id: r.get(2)?,
                cantidad: r.get(3)?,
                updated_at: r.get(4)?,
            })
        })?
        .collect::<Result<Vec<_>, _>>()?;
    Ok(rows)
}

/// Saldo negativo como indicador de bug: consulta de auditoría (SPEC §14.2).
#[allow(dead_code)]
pub fn saldos_negativos(conn: &Connection) -> AppResult<Vec<Saldo>> {
    let mut stmt = conn.prepare(
        "SELECT ubicacion_id, producto_id, lote_id, cantidad, updated_at
         FROM saldos WHERE cantidad < 0 ORDER BY cantidad",
    )?;
    let rows = stmt
        .query_map([], |r| {
            Ok(Saldo {
                ubicacion_id: r.get(0)?,
                producto_id: r.get(1)?,
                lote_id: r.get(2)?,
                cantidad: r.get(3)?,
                updated_at: r.get(4)?,
            })
        })?
        .collect::<Result<Vec<_>, _>>()?;
    Ok(rows)
}

// Helper para auditoría dentro de transacciones.
struct EventoAuditoria<'a>(&'a Connection);
impl<'a> EventoAuditoria<'a> {
    fn registrar(
        &self,
        usuario_id: Option<&str>,
        accion: &str,
        entidad: &str,
        entidad_id: Option<&str>,
        antes: Option<&str>,
        despues: Option<&str>,
    ) -> AppResult<()> {
        crate::domain::seguridad::EventoAuditoria::registrar(
            self.0, usuario_id, accion, entidad, entidad_id, antes, despues, None,
        )
    }
}

#[allow(unused)]
fn _normalizar(c: &str) -> String {
    normalizar_codigo(c)
}
