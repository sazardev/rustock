use rusqlite::Connection;
use uuid::Uuid;

use crate::domain::ahora;
use crate::domain::inventario::*;
use crate::error::{AppError, AppResult};
use crate::security::puede;

pub fn crear_sesion(
    conn: &Connection,
    nuevo: &NuevaSesionInventario,
) -> AppResult<SesionInventario> {
    puede(conn, Some(&nuevo.created_by), "inventario", "ejecutar")?;
    let id = Uuid::new_v4().to_string();
    let ts = ahora();
    let anio = &ts[..4];
    let count: i64 = conn.query_row(
        "SELECT COUNT(*) FROM sesiones_inventario WHERE numero LIKE ?1",
        [format!("INV-{anio}-%")],
        |r| r.get(0),
    )?;
    let numero = format!("INV-{anio}-{:04}", count + 1);
    let estado = if nuevo.fecha_inicio.is_some() {
        "EN_CURSO"
    } else {
        "PLANEADA"
    };
    conn.execute(
        "INSERT INTO sesiones_inventario (id, numero, tipo, estado, almacen_id, alcance, fecha_inicio, fecha_fin,
                responsable_id, conteo_ciego, exige_doble_conteo, created_by, created_at)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13)",
        rusqlite::params![
            id, numero, nuevo.tipo, estado, nuevo.almacen_id, nuevo.alcance, nuevo.fecha_inicio,
            nuevo.fecha_fin, nuevo.responsable_id, nuevo.conteo_ciego as i64,
            nuevo.exige_doble_conteo as i64, nuevo.created_by, ts
        ],
    )?;
    Ok(obtener_sesion(conn, &id)?.expect("recién insertada"))
}

pub fn obtener_sesion(conn: &Connection, id: &str) -> AppResult<Option<SesionInventario>> {
    let mut stmt = conn.prepare(
        "SELECT id, numero, tipo, estado, almacen_id, alcance, fecha_inicio, fecha_fin,
                responsable_id, conteo_ciego, exige_doble_conteo, created_by, created_at, closed_by, closed_at,
                anulado_by, anulado_at
         FROM sesiones_inventario WHERE id = ?1",
    )?;
    let mut rows = stmt.query_map([id], map_sesion)?;
    rows.next().transpose().map_err(AppError::from)
}

/// Pasa una sesión `PLANEADA` a `EN_CURSO` (SPEC §11.1): fija `fecha_inicio`
/// al momento actual. Exige `inventario:ejecutar`. Las sesiones creadas con
/// `fecha_inicio` ya nacen `EN_CURSO`; este comando cubre las planeadas.
pub fn iniciar_sesion(conn: &Connection, id: &str, by: &str) -> AppResult<SesionInventario> {
    puede(conn, Some(by), "inventario", "ejecutar")?;
    let tx = conn.unchecked_transaction()?;
    let estado: String = tx
        .query_row(
            "SELECT estado FROM sesiones_inventario WHERE id = ?1",
            [id],
            |r| r.get(0),
        )
        .map_err(|_| AppError::NoEncontrado("sesión de inventario", id.to_string()))?;
    if estado != "PLANEADA" {
        return Err(AppError::TransicionInvalida("EN_CURSO".into(), estado));
    }
    let ts = ahora();
    tx.execute(
        "UPDATE sesiones_inventario SET estado = 'EN_CURSO', fecha_inicio = ?2 WHERE id = ?1",
        rusqlite::params![id, ts],
    )?;
    crate::domain::seguridad::EventoAuditoria::registrar(
        &tx,
        Some(by),
        "iniciar",
        "inventario",
        Some(id),
        Some(&estado),
        Some("EN_CURSO"),
        None,
    )?;
    tx.commit()?;
    Ok(obtener_sesion(conn, id)?.expect("existe"))
}

fn map_sesion(r: &rusqlite::Row<'_>) -> rusqlite::Result<SesionInventario> {
    Ok(SesionInventario {
        id: r.get(0)?,
        numero: r.get(1)?,
        tipo: r.get(2)?,
        estado: r.get(3)?,
        almacen_id: r.get(4)?,
        alcance: r.get(5)?,
        fecha_inicio: r.get(6)?,
        fecha_fin: r.get(7)?,
        responsable_id: r.get(8)?,
        conteo_ciego: r.get::<_, i64>(9)? != 0,
        exige_doble_conteo: r.get::<_, i64>(10)? != 0,
        created_by: r.get(11)?,
        created_at: r.get(12)?,
        closed_by: r.get(13)?,
        closed_at: r.get(14)?,
        anulado_by: r.get(15)?,
        anulado_at: r.get(16)?,
    })
}

/// Registra un conteo (SPEC §11.4). Valida el estado de la sesión y el conteo ciego.
pub fn registrar_conteo(conn: &Connection, nuevo: &NuevoConteo) -> AppResult<Conteo> {
    nuevo.validar()?;
    puede(
        conn,
        Some(&nuevo.usuario_contador_id),
        "inventario",
        "ejecutar",
    )?;
    let tx = conn.unchecked_transaction()?;

    let estado: String = tx.query_row(
        "SELECT estado FROM sesiones_inventario WHERE id = ?1",
        [&nuevo.sesion_id],
        |r| r.get(0),
    )?;
    if estado != "EN_CURSO" {
        return Err(AppError::TransicionInvalida("EN_CURSO".into(), estado));
    }

    // Validar que el producto controla lote (SPEC §11.4).
    let controla_lote: i64 = tx.query_row(
        "SELECT controla_lote FROM productos WHERE id = ?1",
        [&nuevo.producto_id],
        |r| r.get(0),
    )?;
    if controla_lote != 0 && nuevo.lote_id.is_none() {
        return Err(AppError::LoteRequerido("producto".into()));
    }

    let id = Uuid::new_v4().to_string();
    tx.execute(
        "INSERT INTO conteos (id, sesion_id, ubicacion_id, producto_id, lote_id, cantidad_contada,
                conteo_numero, usuario_contador_id, timestamp, nota)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10)",
        rusqlite::params![
            id,
            nuevo.sesion_id,
            nuevo.ubicacion_id,
            nuevo.producto_id,
            nuevo.lote_id,
            nuevo.cantidad_contada,
            nuevo.conteo_numero,
            nuevo.usuario_contador_id,
            ahora(),
            nuevo.nota
        ],
    )?;
    tx.commit()?;
    Ok(obtener_conteo(conn, &id)?.expect("recién insertado"))
}

pub fn obtener_conteo(conn: &Connection, id: &str) -> AppResult<Option<Conteo>> {
    let mut stmt = conn.prepare(
        "SELECT id, sesion_id, ubicacion_id, producto_id, lote_id, cantidad_contada,
                conteo_numero, usuario_contador_id, timestamp, nota
         FROM conteos WHERE id = ?1",
    )?;
    let mut rows = stmt.query_map([id], map_conteo)?;
    rows.next().transpose().map_err(AppError::from)
}

pub fn listar_conteos(conn: &Connection, sesion_id: &str) -> AppResult<Vec<Conteo>> {
    let mut stmt = conn.prepare(
        "SELECT id, sesion_id, ubicacion_id, producto_id, lote_id, cantidad_contada,
                conteo_numero, usuario_contador_id, timestamp, nota
         FROM conteos WHERE sesion_id = ?1 ORDER BY timestamp",
    )?;
    let rows = stmt
        .query_map([sesion_id], map_conteo)?
        .collect::<Result<Vec<_>, _>>()?;
    Ok(rows)
}

fn map_conteo(r: &rusqlite::Row<'_>) -> rusqlite::Result<Conteo> {
    Ok(Conteo {
        id: r.get(0)?,
        sesion_id: r.get(1)?,
        ubicacion_id: r.get(2)?,
        producto_id: r.get(3)?,
        lote_id: r.get(4)?,
        cantidad_contada: r.get(5)?,
        conteo_numero: r.get(6)?,
        usuario_contador_id: r.get(7)?,
        timestamp: r.get(8)?,
        nota: r.get(9)?,
    })
}

/// Fila de conteo con su saldo de referencia:
/// `(ubicacion_id, producto_id, lote_id, cantidad_contada, saldo_sistema)`.
type FilaConteo = (String, String, Option<String>, i64, i64);

/// Filas de conteo de una sesión con su saldo del sistema de referencia.
/// Agrupa por (ubicación, producto, lote) tomando solo el último conteo
/// (`MAX(conteo_numero)`). Fuente del dato:
/// - Sesión **CERRADA** → la instantánea `sesion_diferencias` persistida al
///   cerrar. Los ajustes ya alteraron los saldos; recalcular en vivo
///   borraría el histórico (todo aparecería "conciliado").
/// - Otro estado (PLANEADA/EN_CURSO/ANULADA) → cálculo en vivo contra los
///   saldos actuales.
fn filas_de_conteo(conn: &Connection, sesion_id: &str) -> AppResult<Vec<FilaConteo>> {
    let estado: String = conn.query_row(
        "SELECT estado FROM sesiones_inventario WHERE id = ?1",
        [sesion_id],
        |r| r.get(0),
    )?;

    if estado == "CERRADA" {
        let mut stmt = conn.prepare(
            "SELECT ubicacion_id, producto_id, lote_id, cantidad_contada, saldo_sistema
             FROM sesion_diferencias WHERE sesion_id = ?1",
        )?;
        let filas = stmt
            .query_map([sesion_id], |r| {
                Ok((
                    r.get::<_, String>(0)?,
                    r.get::<_, String>(1)?,
                    r.get::<_, Option<String>>(2)?,
                    r.get::<_, i64>(3)?,
                    r.get::<_, i64>(4)?,
                ))
            })?
            .collect::<Result<Vec<_>, _>>()?;
        if !filas.is_empty() {
            return Ok(filas);
        }
        // Sesión cerrada con una base anterior a la instantánea: no hay
        // histórico fiable del saldo al momento del conteo; se calcula en
        // vivo (mismo comportamiento que antes de la instantánea).
    }

    let mut stmt = conn.prepare(
        "SELECT c.ubicacion_id, c.producto_id, c.lote_id, c.cantidad_contada,
                COALESCE((SELECT SUM(s.cantidad) FROM saldos s
                          WHERE s.ubicacion_id = c.ubicacion_id AND s.producto_id = c.producto_id
                            AND s.lote_key = COALESCE(c.lote_id,'')), 0)
         FROM conteos c
         INNER JOIN (
           SELECT ubicacion_id, producto_id, COALESCE(lote_id,'') AS lote_key2, MAX(conteo_numero) AS max_num
           FROM conteos WHERE sesion_id = ?1
           GROUP BY ubicacion_id, producto_id, lote_key2
         ) m ON m.ubicacion_id = c.ubicacion_id
              AND m.producto_id = c.producto_id
              AND COALESCE(c.lote_id,'') = m.lote_key2
              AND c.conteo_numero = m.max_num
         WHERE c.sesion_id = ?1",
    )?;
    let filas = stmt
        .query_map([sesion_id], |r| {
            Ok((
                r.get::<_, String>(0)?,
                r.get::<_, String>(1)?,
                r.get::<_, Option<String>>(2)?,
                r.get::<_, i64>(3)?,
                r.get::<_, i64>(4)?,
            ))
        })?
        .collect::<Result<Vec<_>, _>>()?;
    Ok(filas)
}

/// Diferencias entre lo contado y el saldo en sistema (SPEC §11.5).
/// Para sesiones cerradas devuelve la instantánea persistida al cierre;
/// para sesiones activas se calcula contra los saldos actuales.
pub fn diferencias_sesion(
    conn: &Connection,
    sesion_id: &str,
) -> AppResult<Vec<DiferenciaInventario>> {
    let filas = filas_de_conteo(conn, sesion_id)?;
    let mut result: Vec<DiferenciaInventario> = Vec::new();
    for (ubicacion_id, producto_id, lote_id, cantidad_contada, saldo) in filas {
        let diferencia = cantidad_contada - saldo;
        let tipo = if diferencia == 0 {
            "conciliado".to_string()
        } else if diferencia > 0 {
            "sobrante".to_string()
        } else {
            "faltante".to_string()
        };
        result.push(DiferenciaInventario {
            ubicacion_id,
            producto_id,
            lote_id,
            saldo_sistema: saldo,
            cantidad_contada,
            diferencia,
            tipo,
        });
    }
    Ok(result)
}

/// Precisión de una sesión (SPEC §11.6, §16.3): usa el último conteo por
/// (ubicación, producto, lote); para sesiones cerradas compara contra la
/// instantánea del cierre (no contra saldos ya ajustados).
pub fn precision_sesion(conn: &Connection, sesion_id: &str) -> AppResult<PrecisionSesion> {
    let filas = filas_de_conteo(conn, sesion_id)?;

    let mut unidades_contadas = 0i64;
    let mut suma_abs_diferencia = 0i64;
    let mut por_sku: std::collections::HashMap<String, bool> = std::collections::HashMap::new();
    let mut por_ubicacion: std::collections::HashMap<String, bool> =
        std::collections::HashMap::new();

    for (ubicacion_id, producto_id, _lote_id, cantidad_contada, saldo) in &filas {
        let diferencia = cantidad_contada - saldo;
        let exacto = diferencia == 0;
        unidades_contadas += cantidad_contada;
        suma_abs_diferencia += diferencia.abs();
        por_sku
            .entry(producto_id.clone())
            .and_modify(|v| *v = *v && exacto)
            .or_insert(exacto);
        por_ubicacion
            .entry(ubicacion_id.clone())
            .and_modify(|v| *v = *v && exacto)
            .or_insert(exacto);
    }

    let skus_contados = por_sku.len() as i64;
    let skus_exactos = por_sku.values().filter(|v| **v).count() as i64;
    let ubicaciones_contadas = por_ubicacion.len() as i64;
    let ubicaciones_exactas = por_ubicacion.values().filter(|v| **v).count() as i64;
    let unidades_correctas = (unidades_contadas - suma_abs_diferencia).max(0);
    let pct = |num: i64, den: i64| {
        if den > 0 {
            (num as f64 / den as f64) * 100.0
        } else {
            0.0
        }
    };

    Ok(PrecisionSesion {
        sesion_id: sesion_id.to_string(),
        skus_contados,
        skus_exactos,
        precision_sku: pct(skus_exactos, skus_contados),
        unidades_contadas,
        unidades_correctas,
        precision_cantidad: pct(unidades_correctas, unidades_contadas),
        ubicaciones_contadas,
        ubicaciones_exactas,
        exactitud_ubicacion: pct(ubicaciones_exactas, ubicaciones_contadas),
    })
}

/// Cierra la sesión (SPEC §11.5): solo con permiso; genera ajustes de diferencias.
pub fn cerrar_sesion(conn: &Connection, sesion_id: &str, by: &str) -> AppResult<Vec<String>> {
    puede(conn, Some(by), "inventario", "cerrar")?;
    let tx = rusqlite::Transaction::new_unchecked(conn, rusqlite::TransactionBehavior::Immediate)?;

    let estado: String = tx.query_row(
        "SELECT estado FROM sesiones_inventario WHERE id = ?1",
        [sesion_id],
        |r| r.get(0),
    )?;
    if estado == "CERRADA" {
        return Err(AppError::TransicionInvalida("cerrar".into(), estado));
    }
    if estado != "EN_CURSO" {
        return Err(AppError::TransicionInvalida("EN_CURSO".into(), estado));
    }

    let exige_doble: bool = tx.query_row(
        "SELECT exige_doble_conteo FROM sesiones_inventario WHERE id = ?1",
        [sesion_id],
        |r| r.get::<_, i64>(0),
    )? != 0;

    let difs = diferencias_sesion(&tx, sesion_id)?;
    // Persistir la instantánea ANTES de generar los ajustes (SPEC §11.5/§11.6):
    // una vez aplicados, los saldos ya cambiaron y recalcular en vivo
    // mostraría todo "conciliado" con precisión 100% falsa. Se guardan TODAS
    // las filas de conteo (también las conciliadas) con su saldo al momento
    // del cierre.
    tx.execute(
        "DELETE FROM sesion_diferencias WHERE sesion_id = ?1",
        [sesion_id],
    )?;
    {
        let mut stmt = tx.prepare(
            "INSERT INTO sesion_diferencias
                 (sesion_id, ubicacion_id, producto_id, lote_id, saldo_sistema, cantidad_contada)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6)",
        )?;
        for d in &difs {
            stmt.execute(rusqlite::params![
                sesion_id,
                d.ubicacion_id,
                d.producto_id,
                d.lote_id,
                d.saldo_sistema,
                d.cantidad_contada
            ])?;
        }
    }
    let mut ajustes = Vec::new();
    for d in difs {
        if d.diferencia == 0 {
            continue;
        }
        if exige_doble {
            // El segundo conteo debe confirmar la cantidad (SPEC §11.3): exige
            // al menos dos conteos y que los dos últimos coincidan en cantidad.
            let conteos_grupo: Vec<(i64, i64)> = tx
                .prepare(
                    "SELECT conteo_numero, cantidad_contada FROM conteos
                     WHERE sesion_id = ?1 AND ubicacion_id = ?2 AND producto_id = ?3
                       AND (?4 IS NULL AND lote_id IS NULL OR lote_id = ?4)
                     ORDER BY conteo_numero DESC LIMIT 2",
                )?
                .query_map(
                    rusqlite::params![sesion_id, d.ubicacion_id, d.producto_id, d.lote_id],
                    |r| Ok((r.get(0)?, r.get(1)?)),
                )?
                .collect::<Result<Vec<_>, _>>()?;
            if conteos_grupo.len() < 2 {
                return Err(AppError::CampoRequerido(
                    "doble conteo requerido para conciliar la diferencia".into(),
                ));
            }
            if conteos_grupo[0].1 != conteos_grupo[1].1 {
                return Err(AppError::CampoRequerido(
                    "el segundo conteo no confirma la cantidad del primero".into(),
                ));
            }
        }
        let ajuste = generar_ajuste_diferencia(&tx, sesion_id, &d, by)?;
        ajustes.push(ajuste);
    }

    let ts = ahora();
    tx.execute(
        "UPDATE sesiones_inventario SET estado = 'CERRADA', closed_by = ?2, closed_at = ?3, fecha_fin = ?3 WHERE id = ?1",
        rusqlite::params![sesion_id, by, ts],
    )?;
    crate::domain::seguridad::EventoAuditoria::registrar(
        &tx,
        Some(by),
        "cerrar",
        "inventario",
        Some(sesion_id),
        Some("EN_CURSO"),
        Some(&format!(
            r#"{{"estado":"CERRADA","ajustes_generados":{}}}"#,
            ajustes.len()
        )),
        None,
    )?;
    tx.commit()?;
    Ok(ajustes)
}

/// Anula una sesión de inventario (SPEC §11.1): descarta una sesión
/// `PLANEADA` o `EN_CURSO` sin generar ajustes — a diferencia de `cerrar_sesion`,
/// que concilia diferencias. Deja rastro de auditoría (`anulado_by`/`anulado_at`)
/// en vez de desaparecer sin registro. Una sesión `CERRADA` o ya `ANULADA` no
/// puede anularse (son estados terminales).
pub fn anular_sesion(conn: &Connection, sesion_id: &str, by: &str) -> AppResult<SesionInventario> {
    puede(conn, Some(by), "inventario", "anular")?;
    let tx = rusqlite::Transaction::new_unchecked(conn, rusqlite::TransactionBehavior::Immediate)?;

    let estado: String = tx
        .query_row(
            "SELECT estado FROM sesiones_inventario WHERE id = ?1",
            [sesion_id],
            |r| r.get(0),
        )
        .map_err(|_| AppError::NoEncontrado("sesión de inventario", sesion_id.to_string()))?;
    if estado != "PLANEADA" && estado != "EN_CURSO" {
        return Err(AppError::TransicionInvalida("ANULADA".into(), estado));
    }

    let ts = ahora();
    tx.execute(
        "UPDATE sesiones_inventario SET estado = 'ANULADA', anulado_by = ?2, anulado_at = ?3 WHERE id = ?1",
        rusqlite::params![sesion_id, by, ts],
    )?;
    crate::domain::seguridad::EventoAuditoria::registrar(
        &tx,
        Some(by),
        "anular",
        "inventario",
        Some(sesion_id),
        Some(&estado),
        Some("ANULADA"),
        None,
    )?;
    tx.commit()?;
    Ok(obtener_sesion(conn, sesion_id)?.expect("existe"))
}

/// Genera el ajuste (entrada/salida por "diferencia de inventario") para una diferencia.
fn generar_ajuste_diferencia(
    tx: &Connection,
    sesion_id: &str,
    d: &DiferenciaInventario,
    by: &str,
) -> AppResult<String> {
    let id = Uuid::new_v4().to_string();
    let ts = ahora();
    let anio = &ts[..4];
    // Usar la misma tabla de correlativos que `crear_movimiento` para no
    // desincronizar el contador (bug reviewer B1: COUNT desfasaba el valor).
    let clave = format!("MOV-{anio}");
    tx.execute(
        "INSERT OR IGNORE INTO correlativos (clave, valor) VALUES (?1, 0)",
        [&clave],
    )?;
    let valor: i64 = tx.query_row(
        "UPDATE correlativos SET valor = valor + 1 WHERE clave = ?1 RETURNING valor",
        [&clave],
        |r| r.get(0),
    )?;
    let numero = format!("MOV-{anio}-{:06}", valor);

    let (tipo, sub, origen, destino) = if d.diferencia > 0 {
        (
            "ENTRADA",
            "AJUSTE_POSITIVO",
            None,
            Some(d.ubicacion_id.clone()),
        )
    } else {
        (
            "SALIDA",
            "AJUSTE_NEGATIVO",
            Some(d.ubicacion_id.clone()),
            None,
        )
    };

    tx.execute(
        "INSERT INTO movimientos (id, tipo, sub_tipo, numero, estado, fecha_movimiento, motivo,
                origen_ubicacion_id, destino_ubicacion_id, sesion_inventario_id, created_by, created_at,
                approved_by, approved_at)
         VALUES (?1, ?2, ?3, ?4, 'APROBADO', ?5, 'diferencia de inventario', ?6, ?7, ?8, ?9, ?10, ?11, ?10)",
        rusqlite::params![
            id, tipo, sub, numero, ts, origen, destino, sesion_id, by, ts, by
        ],
    )?;

    let lid = Uuid::new_v4().to_string();
    tx.execute(
        "INSERT INTO movimiento_lineas (id, movimiento_id, producto_id, lote_id, cantidad, origen_ubicacion_id, destino_ubicacion_id)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)",
        rusqlite::params![
            lid, id, d.producto_id, d.lote_id, d.diferencia.abs(), origen, destino
        ],
    )?;

    // Aplicar al saldo (valor neto; ON CONFLICT suma).
    let lote_key = d.lote_id.clone().unwrap_or_default();
    if let Some(o) = &origen {
        let cambios = tx.execute(
            "UPDATE saldos SET cantidad = cantidad - ?1, updated_at = ?2
             WHERE ubicacion_id = ?3 AND producto_id = ?4 AND lote_key = ?5",
            rusqlite::params![d.diferencia.abs(), ts, o, d.producto_id, lote_key],
        )?;
        if cambios == 0 {
            return Err(AppError::SaldoNegativo {
                ubicacion: crate::repo::movimiento::codigo_ubicacion_pub(tx, o)?,
                producto: d.producto_id.clone(),
            });
        }
        let nuevo: i64 = tx.query_row(
            "SELECT cantidad FROM saldos WHERE ubicacion_id=?1 AND producto_id=?2 AND lote_key=?3",
            rusqlite::params![o, d.producto_id, lote_key],
            |r| r.get(0),
        )?;
        if nuevo < 0 {
            return Err(AppError::SaldoNegativo {
                ubicacion: crate::repo::movimiento::codigo_ubicacion_pub(tx, o)?,
                producto: d.producto_id.clone(),
            });
        }
    }
    if let Some(dest) = &destino {
        tx.execute(
            "INSERT INTO saldos (ubicacion_id, producto_id, lote_id, lote_key, cantidad, updated_at)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6)
             ON CONFLICT(ubicacion_id, producto_id, lote_key) DO UPDATE SET
               cantidad = cantidad + excluded.cantidad, updated_at = excluded.updated_at",
            rusqlite::params![dest, d.producto_id, d.lote_id, lote_key, d.diferencia.abs(), ts],
        )?;
    }
    Ok(numero)
}
