//! Tests de la lógica de negocio del SPEC.
//! Cubren: catálogos, movimientos (ciclo de vida, saldos, anulación),
//! validaciones e inventario físico.

use crate::db::DbState;
use crate::domain::catalogo::*;
use crate::domain::inventario::*;
use crate::domain::movimiento::*;
use crate::repo;

fn setup() -> std::sync::Arc<DbState> {
    let db = DbState::init_in_memory().expect("db");
    {
        let conn = db.conn();
        crate::security::seed_roles(&conn).expect("roles");
        crate::repo::seguridad::bootstrap_admin(&conn, "admin", "Administrador", "hash")
            .expect("admin");
    }
    db
}

/// Construye un árbol físico completo: almacén → zona → rack → sección → ubicación.
fn crear_arbol(conn: &rusqlite::Connection) -> (String, String, String) {
    let almacen = repo::catalogo::crear_almacen(
        conn,
        &NuevoAlmacen {
            codigo: "ALM-1".into(),
            nombre: "Almacén Central".into(),
            descripcion: None,
            direccion: None,
            created_by: None,
        },
    )
    .expect("almacen");
    let zona = repo::catalogo::crear_zona(
        conn,
        &NuevaZona {
            codigo: "Z-01".into(),
            nombre: "Zona Norte".into(),
            descripcion: None,
            almacen_id: almacen.id.clone(),
            created_by: None,
        },
    )
    .expect("zona");
    let rack = repo::catalogo::crear_rack(
        conn,
        &NuevoRack {
            codigo: "RACK-A".into(),
            nombre: None,
            tipo: None,
            zona_id: zona.id.clone(),
            created_by: None,
        },
    )
    .expect("rack");
    let seccion = repo::catalogo::crear_seccion(
        conn,
        &NuevaSeccion {
            codigo: "N1".into(),
            nombre: None,
            nivel: Some("N1".into()),
            rack_id: rack.id.clone(),
            descripcion: None,
            created_by: None,
        },
    )
    .expect("seccion");
    let ubi = repo::catalogo::crear_ubicacion(
        conn,
        &NuevaUbicacion {
            codigo: "P1".into(),
            nombre: None,
            seccion_id: seccion.id.clone(),
            tipo: Some("STANDARD".into()),
            capacidad_maxima: Some(1000),
            created_by: None,
        },
    )
    .expect("ubicacion");
    let ubi2 = repo::catalogo::crear_ubicacion(
        conn,
        &NuevaUbicacion {
            codigo: "P2".into(),
            nombre: None,
            seccion_id: seccion.id.clone(),
            tipo: Some("STANDARD".into()),
            capacidad_maxima: Some(1000),
            created_by: None,
        },
    )
    .expect("ubicacion2");
    (almacen.id.clone(), ubi.id.clone(), ubi2.id.clone())
}

fn crear_uom_y_producto(conn: &rusqlite::Connection) -> (String, String) {
    let uom = repo::catalogo::crear_uom(
        conn,
        &NuevaUom {
            codigo: "PZA".into(),
            nombre: "Pieza".into(),
            tipo: "UNIDAD".into(),
            factor: 1,
            base: true,
        },
    )
    .expect("uom");
    let p = repo::catalogo::crear_producto(
        conn,
        &NuevoProducto {
            sku: "REF-100".into(),
            nombre: "Producto A".into(),
            descripcion: None,
            categoria_id: None,
            uom_base_id: uom.id.clone(),
            uom_venta_id: None,
            uom_compra_id: None,
            codigo_barras: None,
            peso_unitario: None,
            volumen_unitario: None,
            stock_minimo: Some(2),
            stock_maximo: None,
            controla_lote: false,
            controla_vencimiento: false,
            perecedero: false,
            created_by: None,
        },
    )
    .expect("producto");
    (uom.id, p.id)
}

#[test]
fn crear_almacen_normaliza_codigo() {
    let db = setup();
    let conn = db.conn();
    let a = repo::catalogo::crear_almacen(
        &conn,
        &NuevoAlmacen {
            codigo: "  alm-9  ".into(),
            nombre: "Almacén".into(),
            descripcion: None,
            direccion: None,
            created_by: None,
        },
    )
    .expect("crear");
    assert_eq!(a.codigo, "ALM-9");
}

#[test]
fn codigo_duplicado_rechazado() {
    let db = setup();
    let conn = db.conn();
    let n = NuevoAlmacen {
        codigo: "ALM-X".into(),
        nombre: "A".into(),
        descripcion: None,
        direccion: None,
        created_by: None,
    };
    repo::catalogo::crear_almacen(&conn, &n).expect("primero");
    let err = repo::catalogo::crear_almacen(&conn, &n).expect_err("segundo debe fallar");
    assert!(err.to_string().contains("ya existe"));
}

#[test]
fn entrada_aprobada_incrementa_saldo() {
    let db = setup();
    let conn = db.conn();
    let (_almacen_id, ubi1, _ubi2) = crear_arbol(&conn);
    let (_uom, prod) = crear_uom_y_producto(&conn);

    let mov = repo::movimiento::crear_movimiento(
        &conn,
        &NuevoMovimiento {
            tipo: "ENTRADA".into(),
            sub_tipo: "COMPRA".into(),
            fecha_movimiento: None,
            motivo: None,
            origen_ubicacion_id: None,
            destino_ubicacion_id: Some(ubi1.clone()),
            proveedor_id: None,
            cliente_id: None,
            sesion_inventario_id: None,
            documento_referencia: Some("OC-001".into()),
            notas: None,
            created_by: "admin".into(),
            lineas: vec![NuevaLinea {
                producto_id: prod.clone(),
                lote_id: None,
                cantidad: 10,
                origen_ubicacion_id: None,
                destino_ubicacion_id: Some(ubi1.clone()),
                caja_origen_id: None,
                caja_destino_id: None,
            }],
        },
    )
    .expect("crear entrada");

    assert_eq!(mov.estado, "BORRADOR");

    let aprobado = repo::movimiento::aprobar_movimiento(&conn, &mov.id, "admin").expect("aprobar");
    assert_eq!(aprobado.estado, "APROBADO");

    // Saldo materializado en ubi1 = 10.
    let saldo = repo::movimiento::listar_saldos(&conn, Some(&ubi1), None).expect("saldos");
    assert_eq!(saldo.len(), 1);
    assert_eq!(saldo[0].cantidad, 10);

    // Stock total del producto.
    let total = repo::movimiento::stock_total_producto(&conn, &prod).expect("total");
    assert_eq!(total, 10);
}

#[test]
fn salida_sin_saldo_suficiente_rechazada() {
    let db = setup();
    let conn = db.conn();
    let (_almacen_id, ubi1, _ubi2) = crear_arbol(&conn);
    let (_uom, prod) = crear_uom_y_producto(&conn);

    let mov = repo::movimiento::crear_movimiento(
        &conn,
        &NuevoMovimiento {
            tipo: "SALIDA".into(),
            sub_tipo: "CLIENTE".into(),
            fecha_movimiento: None,
            motivo: None,
            origen_ubicacion_id: Some(ubi1.clone()),
            destino_ubicacion_id: None,
            proveedor_id: None,
            cliente_id: None,
            sesion_inventario_id: None,
            documento_referencia: None,
            notas: None,
            created_by: "admin".into(),
            lineas: vec![NuevaLinea {
                producto_id: prod.clone(),
                lote_id: None,
                cantidad: 5,
                origen_ubicacion_id: Some(ubi1.clone()),
                destino_ubicacion_id: None,
                caja_origen_id: None,
                caja_destino_id: None,
            }],
        },
    )
    .expect("crear salida");

    let err =
        repo::movimiento::aprobar_movimiento(&conn, &mov.id, "admin").expect_err("debe fallar");
    assert!(err.to_string().contains("Saldo insuficiente"), "{}", err);
}

#[test]
fn traslado_mueve_saldo_atomicamente() {
    let db = setup();
    let conn = db.conn();
    let (_almacen_id, ubi1, ubi2) = crear_arbol(&conn);
    let (_uom, prod) = crear_uom_y_producto(&conn);

    // Entrada de 10 en ubi1.
    let entrada = repo::movimiento::crear_movimiento(
        &conn,
        &NuevoMovimiento {
            tipo: "ENTRADA".into(),
            sub_tipo: "COMPRA".into(),
            fecha_movimiento: None,
            motivo: None,
            origen_ubicacion_id: None,
            destino_ubicacion_id: Some(ubi1.clone()),
            proveedor_id: None,
            cliente_id: None,
            sesion_inventario_id: None,
            documento_referencia: None,
            notas: None,
            created_by: "admin".into(),
            lineas: vec![NuevaLinea {
                producto_id: prod.clone(),
                lote_id: None,
                cantidad: 10,
                origen_ubicacion_id: None,
                destino_ubicacion_id: Some(ubi1.clone()),
                caja_origen_id: None,
                caja_destino_id: None,
            }],
        },
    )
    .expect("entrada");
    repo::movimiento::aprobar_movimiento(&conn, &entrada.id, "admin").expect("aprobar entrada");

    // Traslado 4 de ubi1 -> ubi2.
    let traslado = repo::movimiento::crear_movimiento(
        &conn,
        &NuevoMovimiento {
            tipo: "TRASLADO".into(),
            sub_tipo: "TRASLADO_SALIDA".into(),
            fecha_movimiento: None,
            motivo: None,
            origen_ubicacion_id: Some(ubi1.clone()),
            destino_ubicacion_id: Some(ubi2.clone()),
            proveedor_id: None,
            cliente_id: None,
            sesion_inventario_id: None,
            documento_referencia: None,
            notas: None,
            created_by: "admin".into(),
            lineas: vec![NuevaLinea {
                producto_id: prod.clone(),
                lote_id: None,
                cantidad: 4,
                origen_ubicacion_id: Some(ubi1.clone()),
                destino_ubicacion_id: Some(ubi2.clone()),
                caja_origen_id: None,
                caja_destino_id: None,
            }],
        },
    )
    .expect("traslado");
    repo::movimiento::aprobar_movimiento(&conn, &traslado.id, "admin").expect("aprobar traslado");

    let s1 = repo::movimiento::listar_saldos(&conn, Some(&ubi1), None).expect("s1");
    let s2 = repo::movimiento::listar_saldos(&conn, Some(&ubi2), None).expect("s2");
    assert_eq!(s1[0].cantidad, 6);
    assert_eq!(s2[0].cantidad, 4);
}

#[test]
fn ajuste_negativo_exige_motivo() {
    let db = setup();
    let conn = db.conn();
    let (_almacen_id, ubi1, _ubi2) = crear_arbol(&conn);
    let (_uom, prod) = crear_uom_y_producto(&conn);

    let mov = NuevoMovimiento {
        tipo: "AJUSTE".into(),
        sub_tipo: "AJUSTE_NEGATIVO".into(),
        fecha_movimiento: None,
        motivo: Some("x".into()), // menor a 3 caracteres
        origen_ubicacion_id: Some(ubi1.clone()),
        destino_ubicacion_id: None,
        proveedor_id: None,
        cliente_id: None,
        sesion_inventario_id: None,
        documento_referencia: None,
        notas: None,
        created_by: "admin".into(),
        lineas: vec![NuevaLinea {
            producto_id: prod.clone(),
            lote_id: None,
            cantidad: 1,
            origen_ubicacion_id: Some(ubi1.clone()),
            destino_ubicacion_id: None,
            caja_origen_id: None,
            caja_destino_id: None,
        }],
    };
    let err = repo::movimiento::crear_movimiento(&conn, &mov).expect_err("motivo corto");
    assert!(err.to_string().contains("motivo"));
}

#[test]
fn anular_movimiento_aprobado_genera_inverso() {
    let db = setup();
    let conn = db.conn();
    let (_almacen_id, ubi1, _ubi2) = crear_arbol(&conn);
    let (_uom, prod) = crear_uom_y_producto(&conn);

    let entrada = repo::movimiento::crear_movimiento(
        &conn,
        &NuevoMovimiento {
            tipo: "ENTRADA".into(),
            sub_tipo: "COMPRA".into(),
            fecha_movimiento: None,
            motivo: None,
            origen_ubicacion_id: None,
            destino_ubicacion_id: Some(ubi1.clone()),
            proveedor_id: None,
            cliente_id: None,
            sesion_inventario_id: None,
            documento_referencia: None,
            notas: None,
            created_by: "admin".into(),
            lineas: vec![NuevaLinea {
                producto_id: prod.clone(),
                lote_id: None,
                cantidad: 10,
                origen_ubicacion_id: None,
                destino_ubicacion_id: Some(ubi1.clone()),
                caja_origen_id: None,
                caja_destino_id: None,
            }],
        },
    )
    .expect("entrada");
    repo::movimiento::aprobar_movimiento(&conn, &entrada.id, "admin").expect("aprobar");

    // Anular: debe revertir el saldo a 0 y marcar ANULADO.
    let anulado = repo::movimiento::anular_movimiento(&conn, &entrada.id, "admin").expect("anular");
    assert_eq!(anulado.estado, "ANULADO");

    let saldos = repo::movimiento::listar_saldos(&conn, Some(&ubi1), None).expect("saldos");
    assert!(saldos.iter().all(|s| s.cantidad == 0), "{saldos:?}");
}

#[test]
fn sesion_inventario_cierra_con_ajustes() {
    let db = setup();
    let conn = db.conn();
    let (almacen_id, ubi1, _ubi2) = crear_arbol(&conn);
    let (_uom, prod) = crear_uom_y_producto(&conn);

    // Stock en sistema = 10.
    let entrada = repo::movimiento::crear_movimiento(
        &conn,
        &NuevoMovimiento {
            tipo: "ENTRADA".into(),
            sub_tipo: "INICIAL".into(),
            fecha_movimiento: None,
            motivo: None,
            origen_ubicacion_id: None,
            destino_ubicacion_id: Some(ubi1.clone()),
            proveedor_id: None,
            cliente_id: None,
            sesion_inventario_id: None,
            documento_referencia: None,
            notas: None,
            created_by: "admin".into(),
            lineas: vec![NuevaLinea {
                producto_id: prod.clone(),
                lote_id: None,
                cantidad: 10,
                origen_ubicacion_id: None,
                destino_ubicacion_id: Some(ubi1.clone()),
                caja_origen_id: None,
                caja_destino_id: None,
            }],
        },
    )
    .expect("entrada");
    repo::movimiento::aprobar_movimiento(&conn, &entrada.id, "admin").expect("aprobar");

    // Sesión de inventario con conteo: se contaron 7 (faltan 3).
    let sesion = repo::inventario::crear_sesion(
        &conn,
        &NuevaSesionInventario {
            tipo: "CICLICO".into(),
            almacen_id: almacen_id.clone(),
            alcance: None,
            fecha_inicio: Some(crate::domain::ahora()),
            fecha_fin: None,
            responsable_id: Some("admin".into()),
            conteo_ciego: false,
            exige_doble_conteo: false,
            created_by: "admin".into(),
        },
    )
    .expect("sesion");

    repo::inventario::registrar_conteo(
        &conn,
        &NuevoConteo {
            sesion_id: sesion.id.clone(),
            ubicacion_id: ubi1.clone(),
            producto_id: prod.clone(),
            lote_id: None,
            cantidad_contada: 7,
            conteo_numero: 1,
            usuario_contador_id: "admin".into(),
            nota: None,
        },
    )
    .expect("conteo");

    let difs = repo::inventario::diferencias_sesion(&conn, &sesion.id).expect("difs");
    assert_eq!(difs.len(), 1);
    assert_eq!(difs[0].diferencia, -3);
    assert_eq!(difs[0].tipo, "faltante");

    let ajustes = repo::inventario::cerrar_sesion(&conn, &sesion.id, "admin").expect("cerrar");
    assert_eq!(ajustes.len(), 1);

    // Saldo corregido a 7.
    let saldos = repo::movimiento::listar_saldos(&conn, Some(&ubi1), None).expect("saldos");
    assert_eq!(saldos[0].cantidad, 7);
}

#[test]
fn producto_que_controla_lote_exige_lote() {
    let db = setup();
    let conn = db.conn();
    let (_almacen_id, ubi1, _ubi2) = crear_arbol(&conn);

    let uom = repo::catalogo::crear_uom(
        &conn,
        &NuevaUom {
            codigo: "KG".into(),
            nombre: "Kilogramo".into(),
            tipo: "PESO".into(),
            factor: 1,
            base: true,
        },
    )
    .expect("uom");
    let p = repo::catalogo::crear_producto(
        &conn,
        &NuevoProducto {
            sku: "REF-LOTE".into(),
            nombre: "Con lote".into(),
            descripcion: None,
            categoria_id: None,
            uom_base_id: uom.id.clone(),
            uom_venta_id: None,
            uom_compra_id: None,
            codigo_barras: None,
            peso_unitario: None,
            volumen_unitario: None,
            stock_minimo: None,
            stock_maximo: None,
            controla_lote: true,
            controla_vencimiento: false,
            perecedero: false,
            created_by: None,
        },
    )
    .expect("producto");

    let mov = NuevoMovimiento {
        tipo: "ENTRADA".into(),
        sub_tipo: "COMPRA".into(),
        fecha_movimiento: None,
        motivo: None,
        origen_ubicacion_id: None,
        destino_ubicacion_id: Some(ubi1.clone()),
        proveedor_id: None,
        cliente_id: None,
        sesion_inventario_id: None,
        documento_referencia: None,
        notas: None,
        created_by: "admin".into(),
        lineas: vec![NuevaLinea {
            producto_id: p.id.clone(),
            lote_id: None, // falta el lote
            cantidad: 5,
            origen_ubicacion_id: None,
            destino_ubicacion_id: Some(ubi1.clone()),
            caja_origen_id: None,
            caja_destino_id: None,
        }],
    };
    let err = repo::movimiento::crear_movimiento(&conn, &mov).expect_err("lote requerido");
    assert!(err.to_string().contains("lote"));
}

#[test]
fn historial_registra_invocaciones_con_metricas() {
    let db = setup();
    let conn = db.conn();
    let (_, ubi1, _) = crear_arbol(&conn);
    let (_, prod) = crear_uom_y_producto(&conn);

    // Simular una invocación de escritura registrada con métricas.
    repo::auditoria::registrar_invocacion(&conn, Some("admin"), "crear_movimiento", 12, true, None)
        .expect("registrar");
    repo::auditoria::registrar_invocacion(
        &conn,
        Some("admin"),
        "aprobar_movimiento",
        3,
        true,
        None,
    )
    .expect("registrar");
    repo::auditoria::registrar_invocacion(
        &conn,
        Some("admin"),
        "anular_movimiento",
        1,
        false,
        None,
    )
    .expect("registrar");

    // Consultar el historial filtrado por comando.
    let hist = repo::auditoria::listar_historial(&conn, Some("admin"), None, None, None, None, 100)
        .expect("historial");
    assert!(hist.len() >= 3);
    assert_eq!(hist[0].nivel, "ESCRITURA");

    // Métricas agregadas: total = 3 invocaciones + eventos de setup (>= 3).
    let m = repo::auditoria::metricas_historial(&conn).expect("metricas");
    assert!(m.total >= 3);
    assert_eq!(m.exitos, m.total - 1);
    assert_eq!(m.errores, 1);
    assert!(m.tasa_exito > 60.0);
    assert!(m.duracion_promedio_ms.is_some());
    assert!(!m.por_comando.is_empty());

    // Verificar que no queda saldo (el historial no toca stock).
    let saldos = repo::movimiento::listar_saldos(&conn, Some(&ubi1), None).expect("saldos");
    let _ = prod;
    assert!(saldos.is_empty());
}
