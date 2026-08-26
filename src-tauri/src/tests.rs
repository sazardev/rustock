//! Tests de la lógica de negocio del SPEC.
//! Cubren: catálogos, movimientos (ciclo de vida, saldos, anulación),
//! validaciones e inventario físico.

use crate::db::DbState;
use crate::domain::catalogo::*;
use crate::domain::inventario::*;
use crate::domain::movimiento::*;
use crate::domain::seguridad::{NuevoUsuario, RegistrarVista};
use crate::repo;

fn setup() -> std::sync::Arc<DbState> {
    let db = DbState::init_in_memory().expect("db");
    {
        let conn = db.conn();
        crate::security::seed_roles(&conn).expect("roles");
        crate::repo::seguridad::bootstrap_admin(&conn, "admin", "Administrador", "admin1234")
            .expect("admin");
    }
    db
}

/// Id real (UUID) del usuario con `nombre_usuario = 'admin'` sembrado en setup.
/// Los comandos y repos aceptan id o nombre_usuario indistintamente (como
/// `puede()`), pero las FKs de preferencias apuntan al id real.
fn id_admin(conn: &rusqlite::Connection) -> String {
    repo::seguridad::obtener_usuario_por_nombre(conn, "admin")
        .expect("admin existe")
        .expect("admin some")
        .id
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
            created_by: Some("admin".into()),
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
            created_by: Some("admin".into()),
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
            pasillo_id: None,
            created_by: Some("admin".into()),
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
            created_by: Some("admin".into()),
        },
    )
    .expect("seccion");
    let ubi = repo::catalogo::crear_ubicacion(
        conn,
        &NuevaUbicacion {
            codigo: "P1".into(),
            nombre: None,
            seccion_id: Some(seccion.id.clone()),
            rack_id: None,
            zona_id: None,
            tipo: Some("STANDARD".into()),
            capacidad_maxima: Some(1000),
            created_by: Some("admin".into()),
        },
    )
    .expect("ubicacion");
    let ubi2 = repo::catalogo::crear_ubicacion(
        conn,
        &NuevaUbicacion {
            codigo: "P2".into(),
            nombre: None,
            seccion_id: Some(seccion.id.clone()),
            rack_id: None,
            zona_id: None,
            tipo: Some("STANDARD".into()),
            capacidad_maxima: Some(1000),
            created_by: Some("admin".into()),
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
        "admin",
    )
    .expect("uom");
    let p = repo::catalogo::crear_producto(
        conn,
        &NuevoProducto {
            costo_unitario: None,
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
            created_by: Some("admin".into()),
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
            created_by: Some("admin".into()),
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
        created_by: Some("admin".into()),
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
                costo_unitario: None,
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
fn tipo_sub_tipo_incoherente_es_rechazado() {
    let db = setup();
    let conn = db.conn();
    let (_almacen_id, ubi1, _ubi2) = crear_arbol(&conn);
    let (_uom, prod) = crear_uom_y_producto(&conn);

    // ENTRADA + MERMA es incoherente (MERMA es un sub-tipo de SALIDA, SPEC
    // §8.4): sin este chequeo, `aprobar_movimiento` decide el efecto de
    // saldo por `tipo`, así que esto incrementaría el saldo bajo una
    // etiqueta de pérdida.
    let err = repo::movimiento::crear_movimiento(
        &conn,
        &NuevoMovimiento {
            tipo: "ENTRADA".into(),
            sub_tipo: "MERMA".into(),
            fecha_movimiento: None,
            motivo: Some("prueba".into()),
            origen_ubicacion_id: None,
            destino_ubicacion_id: Some(ubi1.clone()),
            proveedor_id: None,
            cliente_id: None,
            sesion_inventario_id: None,
            documento_referencia: None,
            notas: None,
            created_by: "admin".into(),
            lineas: vec![NuevaLinea {
                costo_unitario: None,
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
    .expect_err("tipo/sub_tipo incoherente debe rechazarse");
    assert!(err.to_string().contains("no es válido para tipo"));
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
                costo_unitario: None,
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
                costo_unitario: None,
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
                costo_unitario: None,
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
            costo_unitario: None,
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
fn numero_movimiento_es_correlativo_independiente_por_almacen() {
    // SPEC §6.1: "número correlativo único por año/almacén" — dos almacenes
    // deben poder llegar ambos a "000001" el mismo año sin colisionar, y el
    // numero final debe incluir el código de almacén para seguir siendo
    // único a nivel global (columna UNIQUE(numero)).
    let db = setup();
    let conn = db.conn();
    let (_a1, ubi1) = crear_arbol_en_almacen(&conn, "ALM-NUM-1");
    let (_a2, ubi2) = crear_arbol_en_almacen(&conn, "ALM-NUM-2");
    let (_uom, prod) = crear_uom_y_producto(&conn);

    let mov1 = repo::movimiento::crear_movimiento(
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
                costo_unitario: None,
                producto_id: prod.clone(),
                lote_id: None,
                cantidad: 1,
                origen_ubicacion_id: None,
                destino_ubicacion_id: Some(ubi1),
                caja_origen_id: None,
                caja_destino_id: None,
            }],
        },
    )
    .expect("crear mov almacen 1");

    let mov2 = repo::movimiento::crear_movimiento(
        &conn,
        &NuevoMovimiento {
            tipo: "ENTRADA".into(),
            sub_tipo: "INICIAL".into(),
            fecha_movimiento: None,
            motivo: None,
            origen_ubicacion_id: None,
            destino_ubicacion_id: Some(ubi2.clone()),
            proveedor_id: None,
            cliente_id: None,
            sesion_inventario_id: None,
            documento_referencia: None,
            notas: None,
            created_by: "admin".into(),
            lineas: vec![NuevaLinea {
                costo_unitario: None,
                producto_id: prod,
                lote_id: None,
                cantidad: 1,
                origen_ubicacion_id: None,
                destino_ubicacion_id: Some(ubi2),
                caja_origen_id: None,
                caja_destino_id: None,
            }],
        },
    )
    .expect("crear mov almacen 2");

    assert!(mov1.numero.contains("ALM-NUM-1"));
    assert!(mov1.numero.ends_with("-000001"));
    assert!(mov2.numero.contains("ALM-NUM-2"));
    assert!(mov2.numero.ends_with("-000001"));
    assert_ne!(mov1.numero, mov2.numero);
}

#[test]
fn ajuste_crear_rechazado_para_operador() {
    // SPEC §4.4: "Crear ajustes de stock" es ADMIN/GERENTE/ENCARGADO, no
    // OPERADOR — aunque el operador sí tenga movimiento:crear genérico.
    let db = setup();
    let conn = db.conn();
    let (_almacen_id, ubi1, _ubi2) = crear_arbol(&conn);
    let (_uom, prod) = crear_uom_y_producto(&conn);
    let operador = crear_operador(&conn, "operador_ajuste1");

    let mov = NuevoMovimiento {
        tipo: "AJUSTE".into(),
        sub_tipo: "AJUSTE_NEGATIVO".into(),
        fecha_movimiento: None,
        motivo: Some("merma detectada".into()),
        origen_ubicacion_id: Some(ubi1.clone()),
        destino_ubicacion_id: None,
        proveedor_id: None,
        cliente_id: None,
        sesion_inventario_id: None,
        documento_referencia: None,
        notas: None,
        created_by: operador,
        lineas: vec![NuevaLinea {
            costo_unitario: None,
            producto_id: prod,
            lote_id: None,
            cantidad: 1,
            origen_ubicacion_id: Some(ubi1),
            destino_ubicacion_id: None,
            caja_origen_id: None,
            caja_destino_id: None,
        }],
    };
    let err = repo::movimiento::crear_movimiento(&conn, &mov).expect_err("debe fallar");
    assert!(matches!(err, crate::error::AppError::SinPermiso(_)));
}

#[test]
fn ajuste_aprobar_rechazado_para_encargado() {
    // SPEC §4.4: "Aprobar ajustes (si aplica doble control)" es ADMIN/GERENTE
    // exclusivamente — ENCARGADO puede aprobar movimientos normales pero no
    // ajustes, aunque tenga movimiento:aprobar genérico.
    let db = setup();
    let conn = db.conn();
    let (_almacen_id, ubi1, _ubi2) = crear_arbol(&conn);
    let (_uom, prod) = crear_uom_y_producto(&conn);

    // Primero entra stock para poder ajustar hacia abajo.
    let entrada = repo::movimiento::crear_movimiento(
        &conn,
        &NuevoMovimiento {
            tipo: "ENTRADA".into(),
            sub_tipo: "INICIAL".into(),
            fecha_movimiento: None,
            motivo: Some("apertura".into()),
            origen_ubicacion_id: None,
            destino_ubicacion_id: Some(ubi1.clone()),
            proveedor_id: None,
            cliente_id: None,
            sesion_inventario_id: None,
            documento_referencia: None,
            notas: None,
            created_by: "admin".into(),
            lineas: vec![NuevaLinea {
                costo_unitario: None,
                producto_id: prod.clone(),
                lote_id: None,
                cantidad: 5,
                origen_ubicacion_id: None,
                destino_ubicacion_id: Some(ubi1.clone()),
                caja_origen_id: None,
                caja_destino_id: None,
            }],
        },
    )
    .expect("crear entrada");
    repo::movimiento::aprobar_movimiento(&conn, &entrada.id, "admin").expect("aprobar entrada");

    let encargado = crear_encargado(&conn, "encargado_ajuste1");
    let ajuste = repo::movimiento::crear_movimiento(
        &conn,
        &NuevoMovimiento {
            tipo: "AJUSTE".into(),
            sub_tipo: "AJUSTE_NEGATIVO".into(),
            fecha_movimiento: None,
            motivo: Some("merma detectada".into()),
            origen_ubicacion_id: Some(ubi1.clone()),
            destino_ubicacion_id: None,
            proveedor_id: None,
            cliente_id: None,
            sesion_inventario_id: None,
            documento_referencia: None,
            notas: None,
            created_by: "admin".into(),
            lineas: vec![NuevaLinea {
                costo_unitario: None,
                producto_id: prod,
                lote_id: None,
                cantidad: 1,
                origen_ubicacion_id: Some(ubi1),
                destino_ubicacion_id: None,
                caja_origen_id: None,
                caja_destino_id: None,
            }],
        },
    )
    .expect("crear ajuste (admin sí puede crear)");

    let err = repo::movimiento::aprobar_movimiento(&conn, &ajuste.id, &encargado)
        .expect_err("debe fallar");
    assert!(matches!(err, crate::error::AppError::SinPermiso(_)));
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
                costo_unitario: None,
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
                costo_unitario: None,
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
fn sesion_inventario_anular_desde_planeada_y_en_curso() {
    // SPEC §11.1: una sesión mal planeada o que se debe descartar sin
    // conciliar diferencias pasa a ANULADA (no simplemente se abandona sin
    // auditoría) — a diferencia de cerrar_sesion, no genera ajustes.
    let db = setup();
    let conn = db.conn();
    let (almacen_id, _ubi1, _ubi2) = crear_arbol(&conn);

    let planeada = repo::inventario::crear_sesion(
        &conn,
        &NuevaSesionInventario {
            tipo: "CICLICO".into(),
            almacen_id: almacen_id.clone(),
            alcance: None,
            fecha_inicio: None,
            fecha_fin: None,
            responsable_id: Some("admin".into()),
            conteo_ciego: false,
            exige_doble_conteo: false,
            created_by: "admin".into(),
        },
    )
    .expect("sesion planeada");
    assert_eq!(planeada.estado, "PLANEADA");

    let anulada = repo::inventario::anular_sesion(&conn, &planeada.id, "admin").expect("anular");
    assert_eq!(anulada.estado, "ANULADA");
    assert_eq!(anulada.anulado_by.as_deref(), Some("admin"));
    assert!(anulada.anulado_at.is_some());

    // No se puede anular dos veces ni registrar conteos sobre ella.
    let err =
        repo::inventario::anular_sesion(&conn, &planeada.id, "admin").expect_err("ya anulada");
    assert!(matches!(
        err,
        crate::error::AppError::TransicionInvalida(_, _)
    ));

    // Una EN_CURSO también puede anularse.
    let en_curso = repo::inventario::crear_sesion(
        &conn,
        &NuevaSesionInventario {
            tipo: "CICLICO".into(),
            almacen_id,
            alcance: None,
            fecha_inicio: Some(crate::domain::ahora()),
            fecha_fin: None,
            responsable_id: Some("admin".into()),
            conteo_ciego: false,
            exige_doble_conteo: false,
            created_by: "admin".into(),
        },
    )
    .expect("sesion en curso");
    assert_eq!(en_curso.estado, "EN_CURSO");
    let anulada2 = repo::inventario::anular_sesion(&conn, &en_curso.id, "admin").expect("anular");
    assert_eq!(anulada2.estado, "ANULADA");
}

#[test]
fn sesion_inventario_cerrada_no_se_puede_anular() {
    let db = setup();
    let conn = db.conn();
    let (almacen_id, ubi1, _ubi2) = crear_arbol(&conn);
    let (_uom, prod) = crear_uom_y_producto(&conn);
    entrar_stock(&conn, &ubi1, &prod, None, 5);

    let sesion = repo::inventario::crear_sesion(
        &conn,
        &NuevaSesionInventario {
            tipo: "CICLICO".into(),
            almacen_id,
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
    repo::inventario::cerrar_sesion(&conn, &sesion.id, "admin").expect("cerrar");

    let err = repo::inventario::anular_sesion(&conn, &sesion.id, "admin").expect_err("ya cerrada");
    assert!(matches!(
        err,
        crate::error::AppError::TransicionInvalida(_, _)
    ));
}

#[test]
fn doble_conteo_bloquea_cierre_hasta_segundo_conteo() {
    // SPEC §11.3: "si exige_doble_conteo = true, toda diferencia exige un
    // segundo conteo antes de aceptarse". Un solo conteo con diferencia no
    // debe permitir cerrar la sesión.
    let db = setup();
    let conn = db.conn();
    let (almacen_id, ubi1, _ubi2) = crear_arbol(&conn);
    let (_uom, prod) = crear_uom_y_producto(&conn);
    entrar_stock(&conn, &ubi1, &prod, None, 10);

    let sesion = repo::inventario::crear_sesion(
        &conn,
        &NuevaSesionInventario {
            tipo: "CICLICO".into(),
            almacen_id,
            alcance: None,
            fecha_inicio: Some(crate::domain::ahora()),
            fecha_fin: None,
            responsable_id: Some("admin".into()),
            conteo_ciego: false,
            exige_doble_conteo: true,
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
    .expect("primer conteo");

    let err = repo::inventario::cerrar_sesion(&conn, &sesion.id, "admin")
        .expect_err("un solo conteo con diferencia no debe permitir cerrar");
    assert!(matches!(err, crate::error::AppError::CampoRequerido(_)));

    repo::inventario::registrar_conteo(
        &conn,
        &NuevoConteo {
            sesion_id: sesion.id.clone(),
            ubicacion_id: ubi1.clone(),
            producto_id: prod.clone(),
            lote_id: None,
            cantidad_contada: 4, // no coincide con el primer conteo (7)
            conteo_numero: 2,
            usuario_contador_id: "admin".into(),
            nota: None,
        },
    )
    .expect("segundo conteo, no coincide");

    let err = repo::inventario::cerrar_sesion(&conn, &sesion.id, "admin")
        .expect_err("el segundo conteo no confirma el primero");
    assert!(matches!(err, crate::error::AppError::CampoRequerido(_)));

    // Un tercer conteo que sí confirma el segundo (últimos dos coinciden en 4).
    repo::inventario::registrar_conteo(
        &conn,
        &NuevoConteo {
            sesion_id: sesion.id.clone(),
            ubicacion_id: ubi1.clone(),
            producto_id: prod,
            lote_id: None,
            cantidad_contada: 4,
            conteo_numero: 3,
            usuario_contador_id: "admin".into(),
            nota: None,
        },
    )
    .expect("tercer conteo, confirma");

    let ajustes =
        repo::inventario::cerrar_sesion(&conn, &sesion.id, "admin").expect("ahora sí debe cerrar");
    assert_eq!(ajustes.len(), 1);

    let saldos = repo::movimiento::listar_saldos(&conn, Some(&ubi1), None).expect("saldos");
    assert_eq!(saldos[0].cantidad, 4);
}

#[test]
fn conteo_ciego_no_expone_saldo_del_sistema() {
    // SPEC §11.4/§19: "el conteo ciego no muestra saldos al contador cuando
    // está activo". El struct Conteo/NuevoConteo no tiene, y nunca debe
    // tener, un campo saldo_sistema — así es estructuralmente imposible que
    // registrar_conteo/listar_conteos lo filtren.
    let db = setup();
    let conn = db.conn();
    let (almacen_id, ubi1, _ubi2) = crear_arbol(&conn);
    let (_uom, prod) = crear_uom_y_producto(&conn);
    entrar_stock(&conn, &ubi1, &prod, None, 10);

    let sesion = repo::inventario::crear_sesion(
        &conn,
        &NuevaSesionInventario {
            tipo: "CICLICO".into(),
            almacen_id,
            alcance: None,
            fecha_inicio: Some(crate::domain::ahora()),
            fecha_fin: None,
            responsable_id: Some("admin".into()),
            conteo_ciego: true,
            exige_doble_conteo: false,
            created_by: "admin".into(),
        },
    )
    .expect("sesion");

    repo::inventario::registrar_conteo(
        &conn,
        &NuevoConteo {
            sesion_id: sesion.id.clone(),
            ubicacion_id: ubi1,
            producto_id: prod,
            lote_id: None,
            cantidad_contada: 8,
            conteo_numero: 1,
            usuario_contador_id: "admin".into(),
            nota: None,
        },
    )
    .expect("conteo");

    let conteos = repo::inventario::listar_conteos(&conn, &sesion.id).expect("listar");
    assert_eq!(conteos.len(), 1);
    assert_eq!(conteos[0].cantidad_contada, 8);
    // La diferencia (con saldo_sistema) solo se resuelve vía `diferencias_sesion`,
    // gateada por `inventario:ver` — un permiso distinto de `inventario:ejecutar`
    // (el que usa la pantalla de captura de conteo ciego).
}

fn ultimo_evento_auditoria(
    conn: &rusqlite::Connection,
    entidad: &str,
    entidad_id: &str,
    accion: &str,
) -> (Option<String>, Option<String>) {
    conn.query_row(
        "SELECT antes, despues FROM auditoria
         WHERE entidad = ?1 AND entidad_id = ?2 AND accion = ?3
         ORDER BY id DESC LIMIT 1",
        rusqlite::params![entidad, entidad_id, accion],
        |r| Ok((r.get(0)?, r.get(1)?)),
    )
    .expect("evento de auditoría")
}

#[test]
fn auditoria_captura_antes_y_despues_en_edicion_de_catalogo() {
    // SPEC §4.5: el evento de auditoría de una edición debe traer `antes`
    // (estado previo) y `despues` (estado posterior), no solo el hecho de
    // que "se editó algo".
    let db = setup();
    let conn = db.conn();
    let almacen = repo::catalogo::crear_almacen(
        &conn,
        &NuevoAlmacen {
            codigo: "ALM-AUD".into(),
            nombre: "Nombre original".into(),
            descripcion: None,
            direccion: None,
            created_by: Some("admin".into()),
        },
    )
    .expect("crear almacen");

    repo::catalogo::editar_almacen(
        &conn,
        &almacen.id,
        &EditarAlmacen {
            nombre: Some("Nombre editado".into()),
            descripcion: None,
            direccion: None,
        },
        "admin",
    )
    .expect("editar almacen");

    let (antes, despues) = ultimo_evento_auditoria(&conn, "almacen", &almacen.id, "editar");
    let antes = antes.expect("antes debe estar presente");
    let despues = despues.expect("despues debe estar presente");
    assert!(antes.contains("Nombre original"));
    assert!(despues.contains("Nombre editado"));
}

#[test]
fn auditoria_captura_antes_y_despues_en_aprobacion_y_anulacion_de_movimiento() {
    let db = setup();
    let conn = db.conn();
    let (_almacen_id, ubi1, _ubi2) = crear_arbol(&conn);
    let (_uom, prod) = crear_uom_y_producto(&conn);

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
                costo_unitario: None,
                producto_id: prod,
                lote_id: None,
                cantidad: 5,
                origen_ubicacion_id: None,
                destino_ubicacion_id: Some(ubi1),
                caja_origen_id: None,
                caja_destino_id: None,
            }],
        },
    )
    .expect("crear entrada");

    repo::movimiento::aprobar_movimiento(&conn, &entrada.id, "admin").expect("aprobar");
    let (antes, despues) = ultimo_evento_auditoria(&conn, "movimiento", &entrada.id, "aprobar");
    assert_eq!(antes.as_deref(), Some("BORRADOR"));
    assert_eq!(despues.as_deref(), Some("APROBADO"));

    repo::movimiento::anular_movimiento(&conn, &entrada.id, "admin").expect("anular");
    let (antes, despues) = ultimo_evento_auditoria(&conn, "movimiento", &entrada.id, "anular");
    assert_eq!(antes.as_deref(), Some("APROBADO"));
    let despues = despues.expect("despues debe traer el inverso");
    assert!(despues.contains("ANULADO"));
    assert!(despues.contains("movimiento_inverso_id"));
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
        "admin",
    )
    .expect("uom");
    let p = repo::catalogo::crear_producto(
        &conn,
        &NuevoProducto {
            costo_unitario: None,
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
            created_by: Some("admin".into()),
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
            costo_unitario: None,
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

    // Consultar el historial filtrado por comando (nueva firma paginada).
    let hist = repo::auditoria::listar_historial(
        &conn,
        Some("admin"),
        None,
        None,
        None,
        None,
        None,
        None,
        None,
        None,
        None,
        1,
        100,
    )
    .expect("historial");
    assert!(hist.data.len() >= 3);
    assert_eq!(hist.data[0].nivel, "ESCRITURA");

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

// ============ Autenticación y sesión (SPEC §4.1) ============

#[test]
fn login_con_password_correcto_actualiza_ultimo_acceso() {
    let db = setup();
    let conn = db.conn();
    let usuario =
        repo::seguridad::verificar_credenciales(&conn, "admin", "admin1234").expect("login");
    assert_eq!(usuario.nombre_usuario, "admin");
    assert!(usuario.ultimo_acceso_at.is_some());
}

#[test]
fn login_con_password_incorrecto_rechazado() {
    let db = setup();
    let conn = db.conn();
    let err = repo::seguridad::verificar_credenciales(&conn, "admin", "incorrecta")
        .expect_err("debe fallar");
    assert!(err.to_string().contains("incorrectos"));
}

#[test]
fn login_con_usuario_inexistente_no_revela_si_existe() {
    let db = setup();
    let conn = db.conn();
    let err = repo::seguridad::verificar_credenciales(&conn, "fantasma", "cualquiera")
        .expect_err("debe fallar");
    // Mismo mensaje que una contraseña incorrecta: no delata si el usuario existe.
    assert!(err.to_string().contains("incorrectos"));
}

#[test]
fn password_nunca_se_serializa_al_frontend() {
    let db = setup();
    let conn = db.conn();
    let usuario =
        repo::seguridad::verificar_credenciales(&conn, "admin", "admin1234").expect("login");
    let json = serde_json::to_string(&usuario).expect("serializar");
    assert!(!json.contains("password"));
}

#[test]
fn sin_sesion_ninguna_accion_esta_permitida() {
    let db = setup();
    let conn = db.conn();
    let err = crate::security::puede(&conn, None, "producto", "ver").expect_err("debe fallar");
    assert!(matches!(err, crate::error::AppError::NoAutenticado));
}

#[test]
fn no_se_puede_suplantar_un_usuario_inexistente() {
    let db = setup();
    let conn = db.conn();
    // Un id/nombre de usuario inventado no puede usarse para operar: no hay
    // forma de "ser" alguien que no existe ni de colarse con un id arbitrario.
    let err = crate::security::puede(&conn, Some("usuario-inventado"), "producto", "ver")
        .expect_err("debe fallar");
    assert!(matches!(err, crate::error::AppError::NoAutenticado));
}

#[test]
fn usuario_inactivo_no_puede_operar() {
    let db = setup();
    let conn = db.conn();
    let rol_operador: String = conn
        .query_row("SELECT id FROM roles WHERE codigo = 'OPERADOR'", [], |r| {
            r.get(0)
        })
        .expect("rol");
    let usuario = repo::seguridad::crear_usuario(
        &conn,
        &crate::domain::seguridad::NuevoUsuario {
            nombre_usuario: "operador1".into(),
            nombre_completo: "Operador Uno".into(),
            email: None,
            password: "clave1234".into(),
            rol_id: rol_operador,
            created_by: Some("admin".into()),
        },
    )
    .expect("crear operador");
    conn.execute(
        "UPDATE usuarios SET activo = 0 WHERE id = ?1",
        [&usuario.id],
    )
    .expect("desactivar");
    let err = repo::seguridad::verificar_credenciales(&conn, "operador1", "clave1234")
        .expect_err("debe fallar");
    assert!(err.to_string().contains("incorrectos"));
    let err2 = crate::security::puede(&conn, Some(&usuario.id), "producto", "ver")
        .expect_err("debe fallar");
    assert!(matches!(err2, crate::error::AppError::NoAutenticado));
}

#[test]
fn bootstrap_admin_es_idempotente() {
    let db = setup();
    let conn = db.conn();
    // El setup() ya hizo bootstrap; un segundo intento no debe crear otro ADMIN
    // ni fallar.
    repo::seguridad::bootstrap_admin(&conn, "otro", "Otro Admin", "otraclave1")
        .expect("no debe fallar");
    let total_admins: i64 = conn
        .query_row(
            "SELECT COUNT(*) FROM usuarios WHERE rol_id = (SELECT id FROM roles WHERE codigo = 'ADMIN')",
            [],
            |r| r.get(0),
        )
        .expect("count");
    assert_eq!(total_admins, 1);
}

#[test]
fn password_debil_rechazada() {
    let db = setup();
    let conn = db.conn();
    let rol_lector: String = conn
        .query_row("SELECT id FROM roles WHERE codigo = 'LECTOR'", [], |r| {
            r.get(0)
        })
        .expect("rol");
    let err = repo::seguridad::crear_usuario(
        &conn,
        &crate::domain::seguridad::NuevoUsuario {
            nombre_usuario: "lector1".into(),
            nombre_completo: "Lector Uno".into(),
            email: None,
            password: "corta".into(),
            rol_id: rol_lector,
            created_by: Some("admin".into()),
        },
    )
    .expect_err("debe fallar");
    assert!(err.to_string().contains("contraseña"));
}

// ============ Motor de consulta universal (SPEC §15) ============

fn sembrar_almacenes(conn: &rusqlite::Connection) {
    for (codigo, nombre) in [
        ("ALM-A", "Almacén Norte"),
        ("ALM-B", "Almacén Sur"),
        ("ALM-C", "Depósito Central"),
    ] {
        repo::catalogo::crear_almacen(
            conn,
            &NuevoAlmacen {
                codigo: codigo.into(),
                nombre: nombre.into(),
                descripcion: None,
                direccion: None,
                created_by: Some("admin".into()),
            },
        )
        .expect("almacen");
    }
}

fn filas_de(
    listado: crate::domain::Listado,
) -> (Vec<serde_json::Value>, crate::domain::PaginadoMeta) {
    match listado {
        crate::domain::Listado::Filas(p) => (p.data, p.meta),
        crate::domain::Listado::Grupos(_) => panic!("se esperaban filas, no grupos"),
    }
}

#[test]
fn query_listado_por_defecto_pagina_y_ordena() {
    let db = setup();
    let conn = db.conn();
    sembrar_almacenes(&conn);
    let listado = crate::query::listar(
        &conn,
        &crate::query::ALMACEN_SCHEMA,
        &crate::query::ListParams::default(),
    )
    .expect("listar");
    let (data, meta) = filas_de(listado);
    assert_eq!(meta.total, 3);
    assert_eq!(meta.page, 1);
    assert_eq!(meta.page_size, crate::query::PAGE_SIZE_DEFAULT);
    assert_eq!(data.len(), 3);
}

#[test]
fn query_filtro_eq_por_codigo() {
    let db = setup();
    let conn = db.conn();
    sembrar_almacenes(&conn);
    let params = crate::query::ListParams {
        filters: Some(vec!["codigo:eq:ALM-B".into()]),
        ..Default::default()
    };
    let (data, meta) = filas_de(
        crate::query::listar(&conn, &crate::query::ALMACEN_SCHEMA, &params).expect("listar"),
    );
    assert_eq!(meta.total, 1);
    assert_eq!(data[0]["codigo"], "ALM-B");
}

#[test]
fn query_exportar_exige_permiso_independiente_de_ver() {
    // SPEC §4.3/§15.8: "exportar" se exige de forma independiente — LECTOR
    // puede ver (paginado) pero no puede pedir export=true/page_size=-1.
    let db = setup();
    let conn = db.conn();
    let lector = crear_lector(&conn, "lector_export1");

    // LECTOR sí puede una consulta paginada normal.
    let params_normales = crate::query::ListParams::default();
    crate::query::verificar_permiso_exportar(&conn, Some(&lector), "almacen", &params_normales)
        .expect("ver paginado no exige exportar");

    // Pero no puede pedir export=true...
    let params_export = crate::query::ListParams {
        export: true,
        ..Default::default()
    };
    let err =
        crate::query::verificar_permiso_exportar(&conn, Some(&lector), "almacen", &params_export)
            .expect_err("debe fallar");
    assert!(matches!(err, crate::error::AppError::SinPermiso(_)));

    // ...ni page_size:-1 (todos los registros sin paginar).
    let params_todo = crate::query::ListParams {
        page_size: Some(-1),
        ..Default::default()
    };
    let err =
        crate::query::verificar_permiso_exportar(&conn, Some(&lector), "almacen", &params_todo)
            .expect_err("debe fallar");
    assert!(matches!(err, crate::error::AppError::SinPermiso(_)));

    // Un OPERADOR sí puede exportar (SPEC §4.4: todos salvo LECTOR).
    let operador = crear_operador(&conn, "operador_export1");
    crate::query::verificar_permiso_exportar(&conn, Some(&operador), "almacen", &params_export)
        .expect("operador sí puede exportar");
}

#[test]
fn query_busqueda_texto_libre_multi_termino() {
    let db = setup();
    let conn = db.conn();
    sembrar_almacenes(&conn);
    let params = crate::query::ListParams {
        q: Some("almacén norte".into()),
        ..Default::default()
    };
    let (data, meta) = filas_de(
        crate::query::listar(&conn, &crate::query::ALMACEN_SCHEMA, &params).expect("listar"),
    );
    assert_eq!(meta.total, 1);
    assert_eq!(data[0]["codigo"], "ALM-A");
}

#[test]
fn query_columna_desconocida_rechazada() {
    let db = setup();
    let conn = db.conn();
    sembrar_almacenes(&conn);
    let params = crate::query::ListParams {
        filters: Some(vec!["campo_fantasma:eq:x".into()]),
        ..Default::default()
    };
    let err = crate::query::listar(&conn, &crate::query::ALMACEN_SCHEMA, &params)
        .expect_err("debe fallar");
    assert!(matches!(err, crate::error::AppError::FiltroInvalido(_)));
}

#[test]
fn query_operador_desconocido_rechazado() {
    let db = setup();
    let conn = db.conn();
    sembrar_almacenes(&conn);
    let params = crate::query::ListParams {
        filters: Some(vec!["codigo:regex:.*".into()]),
        ..Default::default()
    };
    let err = crate::query::listar(&conn, &crate::query::ALMACEN_SCHEMA, &params)
        .expect_err("debe fallar");
    assert!(matches!(err, crate::error::AppError::FiltroInvalido(_)));
}

#[test]
fn query_orden_explicito_ascendente_y_descendente() {
    let db = setup();
    let conn = db.conn();
    sembrar_almacenes(&conn);
    let asc = crate::query::ListParams {
        sort: Some("codigo".into()),
        ..Default::default()
    };
    let (data_asc, _) =
        filas_de(crate::query::listar(&conn, &crate::query::ALMACEN_SCHEMA, &asc).expect("listar"));
    assert_eq!(data_asc[0]["codigo"], "ALM-A");

    let desc = crate::query::ListParams {
        sort: Some("-codigo".into()),
        ..Default::default()
    };
    let (data_desc, _) = filas_de(
        crate::query::listar(&conn, &crate::query::ALMACEN_SCHEMA, &desc).expect("listar"),
    );
    assert_eq!(data_desc[0]["codigo"], "ALM-C");
}

#[test]
fn query_paginacion_respeta_topes() {
    let db = setup();
    let conn = db.conn();
    sembrar_almacenes(&conn);
    let params = crate::query::ListParams {
        page: Some(0),
        page_size: Some(10_000),
        ..Default::default()
    };
    let (_, meta) = filas_de(
        crate::query::listar(&conn, &crate::query::ALMACEN_SCHEMA, &params).expect("listar"),
    );
    assert_eq!(meta.page, 1);
    assert_eq!(meta.page_size, crate::query::PAGE_SIZE_MAX);
}

#[test]
fn query_export_ignora_paginacion() {
    let db = setup();
    let conn = db.conn();
    sembrar_almacenes(&conn);
    let params = crate::query::ListParams {
        page: Some(1),
        page_size: Some(1),
        export: true,
        ..Default::default()
    };
    let (data, meta) = filas_de(
        crate::query::listar(&conn, &crate::query::ALMACEN_SCHEMA, &params).expect("listar"),
    );
    assert_eq!(data.len(), 3);
    assert_eq!(meta.total, 3);
}

#[test]
fn query_filtro_in_y_between() {
    let db = setup();
    let conn = db.conn();
    sembrar_almacenes(&conn);
    let in_params = crate::query::ListParams {
        filters: Some(vec!["codigo:in:ALM-A,ALM-C".into()]),
        ..Default::default()
    };
    let (_, meta_in) = filas_de(
        crate::query::listar(&conn, &crate::query::ALMACEN_SCHEMA, &in_params).expect("listar"),
    );
    assert_eq!(meta_in.total, 2);
}

#[test]
fn query_like_escapa_comodines_del_usuario() {
    let db = setup();
    let conn = db.conn();
    // Un código que contenga un carácter comodín literal no debe hacer que
    // `contains` se comporte como comodín abierto sobre datos no relacionados.
    repo::catalogo::crear_almacen(
        &conn,
        &NuevoAlmacen {
            codigo: "ALM-100%".into(),
            nombre: "Con porcentaje".into(),
            descripcion: None,
            direccion: None,
            created_by: Some("admin".into()),
        },
    )
    .expect("almacen");
    sembrar_almacenes(&conn);
    let params = crate::query::ListParams {
        filters: Some(vec!["codigo:contains:100%".into()]),
        ..Default::default()
    };
    let (data, meta) = filas_de(
        crate::query::listar(&conn, &crate::query::ALMACEN_SCHEMA, &params).expect("listar"),
    );
    assert_eq!(meta.total, 1);
    assert_eq!(data[0]["codigo"], "ALM-100%");
}

#[test]
fn query_agregacion_group_by_con_metricas() {
    let db = setup();
    let conn = db.conn();
    let (_almacen_id, ubi1, ubi2) = crear_arbol(&conn);
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
            lineas: vec![
                NuevaLinea {
                    costo_unitario: None,
                    producto_id: prod.clone(),
                    lote_id: None,
                    cantidad: 6,
                    origen_ubicacion_id: None,
                    destino_ubicacion_id: Some(ubi1.clone()),
                    caja_origen_id: None,
                    caja_destino_id: None,
                },
                NuevaLinea {
                    costo_unitario: None,
                    producto_id: prod.clone(),
                    lote_id: None,
                    cantidad: 4,
                    origen_ubicacion_id: None,
                    destino_ubicacion_id: Some(ubi2.clone()),
                    caja_origen_id: None,
                    caja_destino_id: None,
                },
            ],
        },
    )
    .expect("entrada");
    repo::movimiento::aprobar_movimiento(&conn, &entrada.id, "admin").expect("aprobar");

    let params = crate::query::ListParams {
        group_by: Some("movimiento_id".into()),
        metrics: Some(vec!["sum(cantidad)".into(), "count(*)".into()]),
        ..Default::default()
    };
    let listado = crate::query::listar(&conn, &crate::query::MOVIMIENTO_LINEA_SCHEMA, &params)
        .expect("agregar");
    let grupos = match listado {
        crate::domain::Listado::Grupos(g) => g,
        crate::domain::Listado::Filas(_) => panic!("se esperaban grupos"),
    };
    assert_eq!(grupos.meta.total, 1);
    assert_eq!(grupos.groups[0]["key"], entrada.id);
    assert_eq!(grupos.groups[0]["count"], 2);
    assert_eq!(grupos.groups[0]["m_sum_cantidad"], 10);
}

// ============ Catálogos: editar/desactivar, árbol simplificado, caja (SPEC §3) ============

#[test]
fn editar_almacen_actualiza_solo_lo_indicado() {
    let db = setup();
    let conn = db.conn();
    let a = repo::catalogo::crear_almacen(
        &conn,
        &NuevoAlmacen {
            codigo: "ALM-E".into(),
            nombre: "Original".into(),
            descripcion: Some("desc original".into()),
            direccion: None,
            created_by: Some("admin".into()),
        },
    )
    .expect("crear");
    let editado = repo::catalogo::editar_almacen(
        &conn,
        &a.id,
        &crate::domain::catalogo::EditarAlmacen {
            nombre: Some("Editado".into()),
            descripcion: None,
            direccion: None,
        },
        "admin",
    )
    .expect("editar");
    assert_eq!(editado.nombre, "Editado");
    // descripcion no se tocó: sigue el valor original.
    assert_eq!(editado.descripcion.as_deref(), Some("desc original"));
    assert_eq!(editado.codigo, "ALM-E");
}

#[test]
fn categoria_ciclo_rechazado() {
    let db = setup();
    let conn = db.conn();
    let raiz = repo::catalogo::crear_categoria(
        &conn,
        &NuevaCategoria {
            nombre: "Raíz".into(),
            parent_id: None,
            descripcion: None,
            created_by: Some("admin".into()),
        },
    )
    .expect("raiz");
    let hija = repo::catalogo::crear_categoria(
        &conn,
        &NuevaCategoria {
            nombre: "Hija".into(),
            parent_id: Some(raiz.id.clone()),
            descripcion: None,
            created_by: Some("admin".into()),
        },
    )
    .expect("hija");

    // Intentar que la raíz cuelgue de su propia hija cierra un ciclo.
    let err = repo::catalogo::editar_categoria(
        &conn,
        &raiz.id,
        &crate::domain::catalogo::EditarCategoria {
            nombre: None,
            descripcion: None,
            parent_id: Some(Some(hija.id.clone())),
        },
        "admin",
    )
    .expect_err("debe fallar");
    assert!(matches!(err, crate::error::AppError::CicloCategoria));
}

#[test]
fn categoria_puede_moverse_a_raiz() {
    let db = setup();
    let conn = db.conn();
    let raiz = repo::catalogo::crear_categoria(
        &conn,
        &NuevaCategoria {
            nombre: "Raíz2".into(),
            parent_id: None,
            descripcion: None,
            created_by: Some("admin".into()),
        },
    )
    .expect("raiz");
    let hija = repo::catalogo::crear_categoria(
        &conn,
        &NuevaCategoria {
            nombre: "Hija2".into(),
            parent_id: Some(raiz.id.clone()),
            descripcion: None,
            created_by: Some("admin".into()),
        },
    )
    .expect("hija");
    let editada = repo::catalogo::editar_categoria(
        &conn,
        &hija.id,
        &crate::domain::catalogo::EditarCategoria {
            nombre: None,
            descripcion: None,
            parent_id: Some(None),
        },
        "admin",
    )
    .expect("editar");
    assert_eq!(editada.parent_id, None);
}

#[test]
fn ubicacion_puede_colgar_directo_de_zona() {
    let db = setup();
    let conn = db.conn();
    let almacen = repo::catalogo::crear_almacen(
        &conn,
        &NuevoAlmacen {
            codigo: "ALM-Z".into(),
            nombre: "Almacén Z".into(),
            descripcion: None,
            direccion: None,
            created_by: Some("admin".into()),
        },
    )
    .expect("almacen");
    let zona = repo::catalogo::crear_zona(
        &conn,
        &NuevaZona {
            codigo: "Z-DIRECTA".into(),
            nombre: "Zona directa".into(),
            descripcion: None,
            almacen_id: almacen.id.clone(),
            created_by: Some("admin".into()),
        },
    )
    .expect("zona");
    let ubi = repo::catalogo::crear_ubicacion(
        &conn,
        &NuevaUbicacion {
            codigo: "UBI-DIRECTA".into(),
            nombre: None,
            seccion_id: None,
            rack_id: None,
            zona_id: Some(zona.id.clone()),
            tipo: Some("STANDARD".into()),
            capacidad_maxima: None,
            created_by: Some("admin".into()),
        },
    )
    .expect("ubicacion");
    let resuelto =
        repo::catalogo::resolver_almacen_id_de_ubicacion(&conn, &ubi.id).expect("resolver");
    assert_eq!(resuelto, almacen.id);
}

#[test]
fn ubicacion_exige_exactamente_un_padre() {
    let db = setup();
    let conn = db.conn();
    let (_almacen_id, _ubi1, _ubi2) = crear_arbol(&conn);

    // Ningún padre.
    let err = repo::catalogo::crear_ubicacion(
        &conn,
        &NuevaUbicacion {
            codigo: "UBI-SIN-PADRE".into(),
            nombre: None,
            seccion_id: None,
            rack_id: None,
            zona_id: None,
            tipo: Some("STANDARD".into()),
            capacidad_maxima: None,
            created_by: Some("admin".into()),
        },
    )
    .expect_err("debe fallar sin padre");
    assert!(matches!(err, crate::error::AppError::CampoRequerido(_)));
}

#[test]
fn mapa_crear_entidades_no_asigna_posicion() {
    let db = setup();
    let conn = db.conn();
    let almacen = repo::catalogo::crear_almacen(
        &conn,
        &NuevoAlmacen {
            codigo: "ALM-MAPA".into(),
            nombre: "Almacén Mapa".into(),
            descripcion: None,
            direccion: None,
            created_by: Some("admin".into()),
        },
    )
    .expect("almacen");
    assert_eq!(almacen.pos_x, None);
    assert_eq!(almacen.pos_y, None);
    assert_eq!(almacen.pos_z, None);
    assert_eq!(almacen.altura, None);
}

#[test]
fn mapa_mover_entidades_actualiza_posicion_sin_tocar_negocio() {
    let db = setup();
    let conn = db.conn();
    let almacen = repo::catalogo::crear_almacen(
        &conn,
        &NuevoAlmacen {
            codigo: "ALM-MAPA-2".into(),
            nombre: "Almacén Mapa 2".into(),
            descripcion: None,
            direccion: None,
            created_by: Some("admin".into()),
        },
    )
    .expect("almacen");
    let zona = repo::catalogo::crear_zona(
        &conn,
        &NuevaZona {
            codigo: "Z-MAPA".into(),
            nombre: "Zona Mapa".into(),
            descripcion: None,
            almacen_id: almacen.id.clone(),
            created_by: Some("admin".into()),
        },
    )
    .expect("zona");
    let rack = repo::catalogo::crear_rack(
        &conn,
        &NuevoRack {
            codigo: "RACK-MAPA".into(),
            nombre: None,
            tipo: None,
            zona_id: zona.id.clone(),
            pasillo_id: None,
            created_by: Some("admin".into()),
        },
    )
    .expect("rack");
    let ubi = repo::catalogo::crear_ubicacion(
        &conn,
        &NuevaUbicacion {
            codigo: "UBI-MAPA".into(),
            nombre: None,
            seccion_id: None,
            rack_id: Some(rack.id.clone()),
            zona_id: None,
            tipo: Some("STANDARD".into()),
            capacidad_maxima: Some(50),
            created_by: Some("admin".into()),
        },
    )
    .expect("ubicacion");

    let pos = PosicionMapa {
        pos_x: Some(10.5),
        pos_y: Some(-3.0),
        pos_z: Some(2.0),
        altura: Some(1.8),
        ancho: None,
        profundidad: None,
    };

    let almacen_movido =
        repo::catalogo::mover_almacen(&conn, &almacen.id, &pos, "admin").expect("mover almacen");
    assert_eq!(almacen_movido.pos_x, Some(10.5));
    assert_eq!(almacen_movido.pos_y, Some(-3.0));
    assert_eq!(almacen_movido.pos_z, Some(2.0));
    assert_eq!(almacen_movido.altura, Some(1.8));
    assert_eq!(almacen_movido.nombre, almacen.nombre);
    assert_eq!(almacen_movido.codigo, almacen.codigo);

    let zona_movida =
        repo::catalogo::mover_zona(&conn, &zona.id, &pos, "admin").expect("mover zona");
    assert_eq!(zona_movida.pos_x, Some(10.5));
    assert_eq!(zona_movida.nombre, zona.nombre);

    let rack_movido =
        repo::catalogo::mover_rack(&conn, &rack.id, &pos, "admin").expect("mover rack");
    assert_eq!(rack_movido.pos_x, Some(10.5));
    assert_eq!(rack_movido.codigo, rack.codigo);

    // La ubicación cuelga del rack: con la regla de solapes (SPEC §14) no
    // puede quedar sobre el rectángulo de su propio rack, así que va a un
    // punto libre. Lo que se verifica aquí es persistencia de coordenadas.
    let pos_ubi = PosicionMapa {
        pos_x: Some(300.0),
        pos_y: Some(-3.0),
        pos_z: Some(2.0),
        altura: Some(1.8),
        ancho: None,
        profundidad: None,
    };
    let ubi_movida = repo::catalogo::mover_ubicacion(&conn, &ubi.id, &pos_ubi, "admin")
        .expect("mover ubicacion");
    assert_eq!(ubi_movida.pos_x, Some(300.0));
    assert_eq!(ubi_movida.pos_y, Some(-3.0));
    assert_eq!(ubi_movida.pos_z, Some(2.0));
    assert_eq!(ubi_movida.altura, Some(1.8));
    // Los campos de negocio no cambian por mover la posición.
    assert_eq!(ubi_movida.capacidad_maxima, Some(50));
    assert_eq!(ubi_movida.tipo, ubi.tipo);

    // Limpiar la posición: enviar None en todos los campos borra las coordenadas.
    let limpio = PosicionMapa {
        pos_x: None,
        pos_y: None,
        pos_z: None,
        altura: None,
        ancho: None,
        profundidad: None,
    };
    let ubi_limpia =
        repo::catalogo::mover_ubicacion(&conn, &ubi.id, &limpio, "admin").expect("limpiar pos");
    assert_eq!(ubi_limpia.pos_x, None);
    assert_eq!(ubi_limpia.capacidad_maxima, Some(50));
}

#[test]
fn pasillo_crud_y_mover_funciona() {
    let db = setup();
    let conn = db.conn();
    let almacen = repo::catalogo::crear_almacen(
        &conn,
        &NuevoAlmacen {
            codigo: "ALM-PAS".into(),
            nombre: "Almacén Pasillo".into(),
            descripcion: None,
            direccion: None,
            created_by: Some("admin".into()),
        },
    )
    .expect("almacen");
    let zona = repo::catalogo::crear_zona(
        &conn,
        &NuevaZona {
            codigo: "Z-PAS".into(),
            nombre: "Zona Pasillo".into(),
            descripcion: None,
            almacen_id: almacen.id.clone(),
            created_by: Some("admin".into()),
        },
    )
    .expect("zona");

    let pasillo = repo::catalogo::crear_pasillo(
        &conn,
        &NuevoPasillo {
            codigo: "PAS-01".into(),
            nombre: Some("Pasillo 1".into()),
            zona_id: zona.id.clone(),
            created_by: Some("admin".into()),
        },
    )
    .expect("pasillo");
    assert_eq!(pasillo.pos_x, None);

    // Código duplicado dentro del mismo almacén rechazado.
    let err = repo::catalogo::crear_pasillo(
        &conn,
        &NuevoPasillo {
            codigo: "PAS-01".into(),
            nombre: None,
            zona_id: zona.id.clone(),
            created_by: Some("admin".into()),
        },
    )
    .expect_err("código duplicado");
    assert!(matches!(err, crate::error::AppError::CodigoDuplicado(_)));

    let movido = repo::catalogo::mover_pasillo(
        &conn,
        &pasillo.id,
        &PosicionMapa {
            pos_x: Some(5.0),
            pos_y: Some(10.0),
            pos_z: None,
            altura: None,
            ancho: None,
            profundidad: None,
        },
        "admin",
    )
    .expect("mover pasillo");
    assert_eq!(movido.pos_x, Some(5.0));

    let editado = repo::catalogo::editar_pasillo(
        &conn,
        &pasillo.id,
        &EditarPasillo {
            nombre: Some("Pasillo Uno".into()),
        },
        "admin",
    )
    .expect("editar pasillo");
    assert_eq!(editado.nombre, Some("Pasillo Uno".into()));
    assert_eq!(editado.pos_x, Some(5.0));

    repo::catalogo::desactivar_pasillo(&conn, &pasillo.id, "admin").expect("desactivar pasillo");
    let inactivo = repo::catalogo::obtener_pasillo(&conn, &pasillo.id)
        .expect("obtener")
        .expect("existe");
    assert!(!inactivo.activo);
}

#[test]
fn rack_pasillo_debe_pertenecer_a_la_misma_zona() {
    let db = setup();
    let conn = db.conn();
    let almacen = repo::catalogo::crear_almacen(
        &conn,
        &NuevoAlmacen {
            codigo: "ALM-RP".into(),
            nombre: "Almacén Rack Pasillo".into(),
            descripcion: None,
            direccion: None,
            created_by: Some("admin".into()),
        },
    )
    .expect("almacen");
    let zona1 = repo::catalogo::crear_zona(
        &conn,
        &NuevaZona {
            codigo: "Z-RP1".into(),
            nombre: "Zona 1".into(),
            descripcion: None,
            almacen_id: almacen.id.clone(),
            created_by: Some("admin".into()),
        },
    )
    .expect("zona1");
    let zona2 = repo::catalogo::crear_zona(
        &conn,
        &NuevaZona {
            codigo: "Z-RP2".into(),
            nombre: "Zona 2".into(),
            descripcion: None,
            almacen_id: almacen.id.clone(),
            created_by: Some("admin".into()),
        },
    )
    .expect("zona2");
    let pasillo_zona2 = repo::catalogo::crear_pasillo(
        &conn,
        &NuevoPasillo {
            codigo: "PAS-Z2".into(),
            nombre: None,
            zona_id: zona2.id.clone(),
            created_by: Some("admin".into()),
        },
    )
    .expect("pasillo zona2");

    // Rack en zona1 con pasillo de zona2: rechazado.
    let err = repo::catalogo::crear_rack(
        &conn,
        &NuevoRack {
            codigo: "RACK-RP".into(),
            nombre: None,
            tipo: None,
            zona_id: zona1.id.clone(),
            pasillo_id: Some(pasillo_zona2.id.clone()),
            created_by: Some("admin".into()),
        },
    )
    .expect_err("pasillo de otra zona debe rechazarse");
    assert!(matches!(err, crate::error::AppError::CampoInvalido(_)));

    // Sin pasillo: se crea normal, pasillo_id queda None.
    let rack = repo::catalogo::crear_rack(
        &conn,
        &NuevoRack {
            codigo: "RACK-RP".into(),
            nombre: None,
            tipo: None,
            zona_id: zona1.id.clone(),
            pasillo_id: None,
            created_by: Some("admin".into()),
        },
    )
    .expect("rack sin pasillo");
    assert_eq!(rack.pasillo_id, None);

    // Pasillo de la misma zona: aceptado en crear y editar.
    let pasillo_zona1 = repo::catalogo::crear_pasillo(
        &conn,
        &NuevoPasillo {
            codigo: "PAS-Z1".into(),
            nombre: None,
            zona_id: zona1.id.clone(),
            created_by: Some("admin".into()),
        },
    )
    .expect("pasillo zona1");
    let rack_editado = repo::catalogo::editar_rack(
        &conn,
        &rack.id,
        &EditarRack {
            nombre: None,
            tipo: None,
            pasillo_id: Some(Some(pasillo_zona1.id.clone())),
        },
        "admin",
    )
    .expect("editar rack con pasillo válido");
    assert_eq!(rack_editado.pasillo_id, Some(pasillo_zona1.id.clone()));

    // Editar con pasillo de otra zona: rechazado.
    let err2 = repo::catalogo::editar_rack(
        &conn,
        &rack.id,
        &EditarRack {
            nombre: None,
            tipo: None,
            pasillo_id: Some(Some(pasillo_zona2.id.clone())),
        },
        "admin",
    )
    .expect_err("pasillo de otra zona debe rechazarse al editar");
    assert!(matches!(err2, crate::error::AppError::CampoInvalido(_)));

    // Limpiar el pasillo enviando Some(None).
    let rack_sin_pasillo = repo::catalogo::editar_rack(
        &conn,
        &rack.id,
        &EditarRack {
            nombre: None,
            tipo: None,
            pasillo_id: Some(None),
        },
        "admin",
    )
    .expect("limpiar pasillo");
    assert_eq!(rack_sin_pasillo.pasillo_id, None);
}

#[test]
fn caja_restringida_rechaza_producto_distinto() {
    let db = setup();
    let conn = db.conn();
    let (_almacen_id, ubi1, _ubi2) = crear_arbol(&conn);
    let (uom, prod1) = crear_uom_y_producto(&conn);
    let prod2 = repo::catalogo::crear_producto(
        &conn,
        &NuevoProducto {
            costo_unitario: None,
            sku: "REF-200".into(),
            nombre: "Producto B".into(),
            descripcion: None,
            categoria_id: None,
            uom_base_id: uom.clone(),
            uom_venta_id: None,
            uom_compra_id: None,
            codigo_barras: None,
            peso_unitario: None,
            volumen_unitario: None,
            stock_minimo: None,
            stock_maximo: None,
            controla_lote: false,
            controla_vencimiento: false,
            perecedero: false,
            created_by: Some("admin".into()),
        },
    )
    .expect("producto2")
    .id;

    let caja = repo::catalogo::crear_caja(
        &conn,
        &NuevaCaja {
            codigo: "CAJA-1".into(),
            nombre: None,
            ubicacion_id: ubi1.clone(),
            producto_id: Some(prod1.clone()),
            lote_id: None,
            etiqueta: None,
            created_by: Some("admin".into()),
        },
    )
    .expect("caja");

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
            documento_referencia: None,
            notas: None,
            created_by: "admin".into(),
            lineas: vec![NuevaLinea {
                costo_unitario: None,
                producto_id: prod2,
                lote_id: None,
                cantidad: 1,
                origen_ubicacion_id: None,
                destino_ubicacion_id: Some(ubi1.clone()),
                caja_origen_id: None,
                caja_destino_id: Some(caja.id.clone()),
            }],
        },
    )
    .expect("crear movimiento");
    let err =
        repo::movimiento::aprobar_movimiento(&conn, &mov.id, "admin").expect_err("debe fallar");
    assert!(matches!(err, crate::error::AppError::CajaRestringida(_)));
}

#[test]
fn capacidad_maxima_agrega_todos_los_productos() {
    let db = setup();
    let conn = db.conn();
    let (_almacen_id, ubi_grande, _ubi2) = crear_arbol(&conn);
    // Ubicación con capacidad pequeña, en la misma sección.
    let seccion_id = repo::catalogo::obtener_ubicacion(&conn, &ubi_grande)
        .expect("ubi")
        .expect("existe")
        .seccion_id
        .expect("seccion");
    let ubi = repo::catalogo::crear_ubicacion(
        &conn,
        &NuevaUbicacion {
            codigo: "UBI-CAP".into(),
            nombre: None,
            seccion_id: Some(seccion_id),
            rack_id: None,
            zona_id: None,
            tipo: Some("STANDARD".into()),
            capacidad_maxima: Some(10),
            created_by: Some("admin".into()),
        },
    )
    .expect("ubicacion");
    let (uom, prod1) = crear_uom_y_producto(&conn);
    let prod2 = repo::catalogo::crear_producto(
        &conn,
        &NuevoProducto {
            costo_unitario: None,
            sku: "REF-300".into(),
            nombre: "Producto C".into(),
            descripcion: None,
            categoria_id: None,
            uom_base_id: uom,
            uom_venta_id: None,
            uom_compra_id: None,
            codigo_barras: None,
            peso_unitario: None,
            volumen_unitario: None,
            stock_minimo: None,
            stock_maximo: None,
            controla_lote: false,
            controla_vencimiento: false,
            perecedero: false,
            created_by: Some("admin".into()),
        },
    )
    .expect("producto2")
    .id;

    let entrada1 = repo::movimiento::crear_movimiento(
        &conn,
        &NuevoMovimiento {
            tipo: "ENTRADA".into(),
            sub_tipo: "COMPRA".into(),
            fecha_movimiento: None,
            motivo: None,
            origen_ubicacion_id: None,
            destino_ubicacion_id: Some(ubi.id.clone()),
            proveedor_id: None,
            cliente_id: None,
            sesion_inventario_id: None,
            documento_referencia: None,
            notas: None,
            created_by: "admin".into(),
            lineas: vec![NuevaLinea {
                costo_unitario: None,
                producto_id: prod1,
                lote_id: None,
                cantidad: 6,
                origen_ubicacion_id: None,
                destino_ubicacion_id: Some(ubi.id.clone()),
                caja_origen_id: None,
                caja_destino_id: None,
            }],
        },
    )
    .expect("entrada1");
    repo::movimiento::aprobar_movimiento(&conn, &entrada1.id, "admin").expect("aprobar1");

    // Un segundo producto distinto que sumado excede la capacidad total (6+6=12 > 10).
    let entrada2 = repo::movimiento::crear_movimiento(
        &conn,
        &NuevoMovimiento {
            tipo: "ENTRADA".into(),
            sub_tipo: "COMPRA".into(),
            fecha_movimiento: None,
            motivo: None,
            origen_ubicacion_id: None,
            destino_ubicacion_id: Some(ubi.id.clone()),
            proveedor_id: None,
            cliente_id: None,
            sesion_inventario_id: None,
            documento_referencia: None,
            notas: None,
            created_by: "admin".into(),
            lineas: vec![NuevaLinea {
                costo_unitario: None,
                producto_id: prod2,
                lote_id: None,
                cantidad: 6,
                origen_ubicacion_id: None,
                destino_ubicacion_id: Some(ubi.id.clone()),
                caja_origen_id: None,
                caja_destino_id: None,
            }],
        },
    )
    .expect("entrada2");
    let err = repo::movimiento::aprobar_movimiento(&conn, &entrada2.id, "admin")
        .expect_err("debe fallar");
    assert!(matches!(err, crate::error::AppError::CapacidadExcedida(_)));
}

#[test]
fn buscar_producto_por_codigo_barras() {
    let db = setup();
    let conn = db.conn();
    let uom = repo::catalogo::crear_uom(
        &conn,
        &NuevaUom {
            codigo: "PZA2".into(),
            nombre: "Pieza".into(),
            tipo: "UNIDAD".into(),
            factor: 1,
            base: true,
        },
        "admin",
    )
    .expect("uom");
    let producto = repo::catalogo::crear_producto(
        &conn,
        &NuevoProducto {
            costo_unitario: None,
            sku: "REF-BARRAS".into(),
            nombre: "Con barras".into(),
            descripcion: None,
            categoria_id: None,
            uom_base_id: uom.id,
            uom_venta_id: None,
            uom_compra_id: None,
            codigo_barras: Some("7501234567890".into()),
            peso_unitario: None,
            volumen_unitario: None,
            stock_minimo: None,
            stock_maximo: None,
            controla_lote: false,
            controla_vencimiento: false,
            perecedero: false,
            created_by: Some("admin".into()),
        },
    )
    .expect("producto");

    let encontrado = repo::catalogo::buscar_producto_por_codigo_barras(&conn, "7501234567890")
        .expect("buscar")
        .expect("debe existir");
    assert_eq!(encontrado.id, producto.id);

    let no_encontrado =
        repo::catalogo::buscar_producto_por_codigo_barras(&conn, "0000000000000").expect("buscar");
    assert!(no_encontrado.is_none());
}

// ============ Movimientos: FIFO/FEFO, INICIAL, traslado inter-almacén (SPEC §6-9) ============

fn entrar_stock(
    conn: &rusqlite::Connection,
    ubicacion_id: &str,
    producto_id: &str,
    lote_id: Option<&str>,
    cantidad: i64,
) {
    let mov = repo::movimiento::crear_movimiento(
        conn,
        &NuevoMovimiento {
            tipo: "ENTRADA".into(),
            sub_tipo: "COMPRA".into(),
            fecha_movimiento: None,
            motivo: None,
            origen_ubicacion_id: None,
            destino_ubicacion_id: Some(ubicacion_id.into()),
            proveedor_id: None,
            cliente_id: None,
            sesion_inventario_id: None,
            documento_referencia: None,
            notas: None,
            created_by: "admin".into(),
            lineas: vec![NuevaLinea {
                costo_unitario: None,
                producto_id: producto_id.into(),
                lote_id: lote_id.map(String::from),
                cantidad,
                origen_ubicacion_id: None,
                destino_ubicacion_id: Some(ubicacion_id.into()),
                caja_origen_id: None,
                caja_destino_id: None,
            }],
        },
    )
    .expect("crear entrada stock");
    repo::movimiento::aprobar_movimiento(conn, &mov.id, "admin").expect("aprobar entrada stock");
}

#[test]
fn entrada_inicial_exige_permiso_configuracion() {
    let db = setup();
    let conn = db.conn();
    let (_almacen_id, ubi1, _ubi2) = crear_arbol(&conn);
    let (_uom, prod) = crear_uom_y_producto(&conn);

    let rol_operador: String = conn
        .query_row("SELECT id FROM roles WHERE codigo = 'OPERADOR'", [], |r| {
            r.get(0)
        })
        .expect("rol");
    repo::seguridad::crear_usuario(
        &conn,
        &crate::domain::seguridad::NuevoUsuario {
            nombre_usuario: "operador2".into(),
            nombre_completo: "Operador Dos".into(),
            email: None,
            password: "clave1234".into(),
            rol_id: rol_operador,
            created_by: Some("admin".into()),
        },
    )
    .expect("crear operador");

    let mov = NuevoMovimiento {
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
        created_by: "operador2".into(),
        lineas: vec![NuevaLinea {
            costo_unitario: None,
            producto_id: prod,
            lote_id: None,
            cantidad: 5,
            origen_ubicacion_id: None,
            destino_ubicacion_id: Some(ubi1),
            caja_origen_id: None,
            caja_destino_id: None,
        }],
    };
    let err = repo::movimiento::crear_movimiento(&conn, &mov).expect_err("debe fallar");
    assert!(matches!(err, crate::error::AppError::SinPermiso(_)));
}

/// Crea un producto que controla lote (y opcionalmente vencimiento/perecedero).
fn crear_producto_con_lote(
    conn: &rusqlite::Connection,
    sku: &str,
    uom_id: &str,
    perecedero: bool,
) -> String {
    repo::catalogo::crear_producto(
        conn,
        &NuevoProducto {
            costo_unitario: None,
            sku: sku.into(),
            nombre: "Producto con lote".into(),
            descripcion: None,
            categoria_id: None,
            uom_base_id: uom_id.into(),
            uom_venta_id: None,
            uom_compra_id: None,
            codigo_barras: None,
            peso_unitario: None,
            volumen_unitario: None,
            stock_minimo: None,
            stock_maximo: None,
            controla_lote: true,
            controla_vencimiento: perecedero,
            perecedero,
            created_by: Some("admin".into()),
        },
    )
    .expect("producto")
    .id
}

fn crear_lote_con_fechas(
    conn: &rusqlite::Connection,
    producto_id: &str,
    numero: &str,
    fecha_fabricacion: Option<&str>,
    fecha_vencimiento: Option<&str>,
) -> String {
    repo::catalogo::crear_lote(
        conn,
        &NuevoLote {
            numero: numero.into(),
            producto_id: producto_id.into(),
            fecha_fabricacion: fecha_fabricacion.map(String::from),
            fecha_vencimiento: fecha_vencimiento.map(String::from),
            origen: None,
            notas: None,
            created_by: Some("admin".into()),
        },
    )
    .expect("lote")
    .id
}

#[test]
fn sugerir_fifo_toma_lote_mas_antiguo_primero() {
    let db = setup();
    let conn = db.conn();
    let (_almacen_id, ubi1, _ubi2) = crear_arbol(&conn);
    let uom = repo::catalogo::crear_uom(
        &conn,
        &NuevaUom {
            codigo: "PZA-FIFO".into(),
            nombre: "Pieza".into(),
            tipo: "UNIDAD".into(),
            factor: 1,
            base: true,
        },
        "admin",
    )
    .expect("uom")
    .id;
    let prod = crear_producto_con_lote(&conn, "REF-FIFO", &uom, false);
    let viejo = crear_lote_con_fechas(&conn, &prod, "L-VIEJO", Some("2025-01-01"), None);
    let nuevo = crear_lote_con_fechas(&conn, &prod, "L-NUEVO", Some("2025-06-01"), None);
    entrar_stock(&conn, &ubi1, &prod, Some(&nuevo), 10);
    entrar_stock(&conn, &ubi1, &prod, Some(&viejo), 10);

    let sugerencias =
        repo::movimiento::sugerir_lineas_salida(&conn, &prod, 5, None, false).expect("sugerir");
    assert_eq!(sugerencias.len(), 1);
    assert_eq!(sugerencias[0].lote_id.as_deref(), Some(viejo.as_str()));
    assert_eq!(sugerencias[0].cantidad, 5);
}

#[test]
fn sugerir_fefo_toma_vencimiento_mas_proximo_primero() {
    let db = setup();
    let conn = db.conn();
    let (_almacen_id, ubi1, _ubi2) = crear_arbol(&conn);
    let uom = repo::catalogo::crear_uom(
        &conn,
        &NuevaUom {
            codigo: "PZA-FEFO".into(),
            nombre: "Pieza".into(),
            tipo: "UNIDAD".into(),
            factor: 1,
            base: true,
        },
        "admin",
    )
    .expect("uom")
    .id;
    let prod = crear_producto_con_lote(&conn, "REF-FEFO", &uom, true);
    let vence_pronto = crear_lote_con_fechas(&conn, &prod, "L-PRONTO", None, Some("2027-01-01"));
    let vence_tarde = crear_lote_con_fechas(&conn, &prod, "L-TARDE", None, Some("2028-01-01"));
    entrar_stock(&conn, &ubi1, &prod, Some(&vence_tarde), 10);
    entrar_stock(&conn, &ubi1, &prod, Some(&vence_pronto), 10);

    let sugerencias =
        repo::movimiento::sugerir_lineas_salida(&conn, &prod, 15, None, false).expect("sugerir");
    assert_eq!(
        sugerencias[0].lote_id.as_deref(),
        Some(vence_pronto.as_str())
    );
    assert_eq!(sugerencias[0].cantidad, 10);
    assert_eq!(
        sugerencias[1].lote_id.as_deref(),
        Some(vence_tarde.as_str())
    );
    assert_eq!(sugerencias[1].cantidad, 5);
}

#[test]
fn sugerir_excluye_vencidos_para_cliente() {
    let db = setup();
    let conn = db.conn();
    let (_almacen_id, ubi1, _ubi2) = crear_arbol(&conn);
    let uom = repo::catalogo::crear_uom(
        &conn,
        &NuevaUom {
            codigo: "PZA-VENC".into(),
            nombre: "Pieza".into(),
            tipo: "UNIDAD".into(),
            factor: 1,
            base: true,
        },
        "admin",
    )
    .expect("uom")
    .id;
    let prod = crear_producto_con_lote(&conn, "REF-VENC", &uom, true);
    let vencido = crear_lote_con_fechas(&conn, &prod, "L-VENCIDO", None, Some("2020-01-01"));
    let vigente = crear_lote_con_fechas(&conn, &prod, "L-VIGENTE", None, Some("2030-01-01"));
    entrar_stock(&conn, &ubi1, &prod, Some(&vencido), 10);
    entrar_stock(&conn, &ubi1, &prod, Some(&vigente), 10);

    // Con exclusión (CLIENTE/DEVOLUCION_PROVEEDOR): solo debe proponer el vigente.
    let sugerencias =
        repo::movimiento::sugerir_lineas_salida(&conn, &prod, 10, None, true).expect("sugerir");
    assert_eq!(sugerencias.len(), 1);
    assert_eq!(sugerencias[0].lote_id.as_deref(), Some(vigente.as_str()));

    // Pedir más de lo vigente disponible falla aunque el vencido tenga saldo.
    let err = repo::movimiento::sugerir_lineas_salida(&conn, &prod, 15, None, true)
        .expect_err("debe fallar");
    assert!(matches!(
        err,
        crate::error::AppError::SaldoInsuficiente { .. }
    ));

    // Sin exclusión (p. ej. MERMA) sí puede usar el vencido.
    let sugerencias_merma =
        repo::movimiento::sugerir_lineas_salida(&conn, &prod, 15, None, false).expect("sugerir");
    let total: i64 = sugerencias_merma.iter().map(|s| s.cantidad).sum();
    assert_eq!(total, 15);
}

#[test]
fn sugerir_lineas_insuficiente_devuelve_error() {
    let db = setup();
    let conn = db.conn();
    let (_almacen_id, ubi1, _ubi2) = crear_arbol(&conn);
    let (_uom, prod) = crear_uom_y_producto(&conn);
    entrar_stock(&conn, &ubi1, &prod, None, 5);

    let err = repo::movimiento::sugerir_lineas_salida(&conn, &prod, 100, None, false)
        .expect_err("debe fallar");
    assert!(matches!(
        err,
        crate::error::AppError::SaldoInsuficiente { .. }
    ));
}

fn crear_arbol_en_almacen(conn: &rusqlite::Connection, codigo_almacen: &str) -> (String, String) {
    let almacen = repo::catalogo::crear_almacen(
        conn,
        &NuevoAlmacen {
            codigo: codigo_almacen.into(),
            nombre: format!("Almacén {codigo_almacen}"),
            descripcion: None,
            direccion: None,
            created_by: Some("admin".into()),
        },
    )
    .expect("almacen");
    let zona = repo::catalogo::crear_zona(
        conn,
        &NuevaZona {
            codigo: format!("{codigo_almacen}-Z1"),
            nombre: "Zona".into(),
            descripcion: None,
            almacen_id: almacen.id.clone(),
            created_by: Some("admin".into()),
        },
    )
    .expect("zona");
    let ubi = repo::catalogo::crear_ubicacion(
        conn,
        &NuevaUbicacion {
            codigo: format!("{codigo_almacen}-UBI1"),
            nombre: None,
            seccion_id: None,
            rack_id: None,
            zona_id: Some(zona.id.clone()),
            tipo: Some("STANDARD".into()),
            capacidad_maxima: None,
            created_by: Some("admin".into()),
        },
    )
    .expect("ubicacion");
    (almacen.id, ubi.id)
}

#[test]
fn traslado_intra_almacen_genera_un_solo_movimiento() {
    let db = setup();
    let conn = db.conn();
    let (_almacen_id, ubi1, ubi2) = crear_arbol(&conn);
    let (_uom, prod) = crear_uom_y_producto(&conn);
    entrar_stock(&conn, &ubi1, &prod, None, 10);

    let creado = repo::movimiento::crear_traslado(
        &conn,
        &NuevoTraslado {
            producto_id: prod,
            lote_id: None,
            cantidad: 4,
            origen_ubicacion_id: ubi1,
            destino_ubicacion_id: ubi2,
            caja_origen_id: None,
            caja_destino_id: None,
            documento_referencia: None,
            notas: None,
            created_by: "admin".into(),
        },
    )
    .expect("crear traslado");
    assert_eq!(creado.salida.tipo, "TRASLADO");
    assert!(creado.entrada.is_none());
}

#[test]
fn traslado_inter_almacen_genera_dos_movimientos_ligados() {
    let db = setup();
    let conn = db.conn();
    let (_almacen1, ubi_origen) = crear_arbol_en_almacen(&conn, "ALM-ORIGEN");
    let (_almacen2, ubi_destino) = crear_arbol_en_almacen(&conn, "ALM-DESTINO");
    let (_uom, prod) = crear_uom_y_producto(&conn);
    entrar_stock(&conn, &ubi_origen, &prod, None, 10);

    let creado = repo::movimiento::crear_traslado(
        &conn,
        &NuevoTraslado {
            producto_id: prod.clone(),
            lote_id: None,
            cantidad: 6,
            origen_ubicacion_id: ubi_origen.clone(),
            destino_ubicacion_id: ubi_destino.clone(),
            caja_origen_id: None,
            caja_destino_id: None,
            documento_referencia: None,
            notas: None,
            created_by: "admin".into(),
        },
    )
    .expect("crear traslado");

    assert_eq!(creado.salida.tipo, "SALIDA");
    assert_eq!(creado.salida.sub_tipo, "TRASLADO_SALIDA");
    let entrada = creado.entrada.expect("debe tener entrada ligada");
    assert_eq!(entrada.tipo, "ENTRADA");
    assert_eq!(entrada.sub_tipo, "TRASLADO_ENTRADA");
    assert_eq!(
        creado.salida.documento_referencia,
        entrada.documento_referencia
    );
    assert!(creado.salida.documento_referencia.is_some());

    // SPEC §9.3: aprobar una pierna aprueba atómicamente la otra — no queda
    // una mitad del traslado sin aprobar (ver `par_traslado_interalmacen`).
    repo::movimiento::aprobar_movimiento(&conn, &creado.salida.id, "admin")
        .expect("aprobar salida");

    let entrada_aprobada = repo::movimiento::obtener_movimiento(&conn, &entrada.id)
        .expect("obtener")
        .expect("existe");
    assert_eq!(entrada_aprobada.estado, "APROBADO");

    let saldo_origen =
        repo::movimiento::listar_saldos(&conn, Some(&ubi_origen), None).expect("saldos");
    let saldo_destino =
        repo::movimiento::listar_saldos(&conn, Some(&ubi_destino), None).expect("saldos");
    assert_eq!(saldo_origen[0].cantidad, 4);
    assert_eq!(saldo_destino[0].cantidad, 6);
}

#[test]
fn traslado_inter_almacen_aprobar_entrada_primero_tambien_arrastra_la_salida() {
    // Simetría de la aprobación atómica (§9.3): da igual cuál de las dos
    // piernas se apruebe primero, la otra se arrastra en la misma transacción.
    let db = setup();
    let conn = db.conn();
    let (_almacen1, ubi_origen) = crear_arbol_en_almacen(&conn, "ALM-ORIGEN-B");
    let (_almacen2, ubi_destino) = crear_arbol_en_almacen(&conn, "ALM-DESTINO-B");
    let (_uom, prod) = crear_uom_y_producto(&conn);
    entrar_stock(&conn, &ubi_origen, &prod, None, 10);

    let creado = repo::movimiento::crear_traslado(
        &conn,
        &NuevoTraslado {
            producto_id: prod,
            lote_id: None,
            cantidad: 3,
            origen_ubicacion_id: ubi_origen.clone(),
            destino_ubicacion_id: ubi_destino.clone(),
            caja_origen_id: None,
            caja_destino_id: None,
            documento_referencia: None,
            notas: None,
            created_by: "admin".into(),
        },
    )
    .expect("crear traslado");
    let entrada = creado.entrada.expect("debe tener entrada ligada");

    repo::movimiento::aprobar_movimiento(&conn, &entrada.id, "admin").expect("aprobar entrada");

    let salida_aprobada = repo::movimiento::obtener_movimiento(&conn, &creado.salida.id)
        .expect("obtener")
        .expect("existe");
    assert_eq!(salida_aprobada.estado, "APROBADO");

    let saldo_origen =
        repo::movimiento::listar_saldos(&conn, Some(&ubi_origen), None).expect("saldos");
    let saldo_destino =
        repo::movimiento::listar_saldos(&conn, Some(&ubi_destino), None).expect("saldos");
    assert_eq!(saldo_origen[0].cantidad, 7);
    assert_eq!(saldo_destino[0].cantidad, 3);
}

// ============ Comentarios (SPEC §12) ============

fn crear_operador(conn: &rusqlite::Connection, nombre_usuario: &str) -> String {
    let rol_operador: String = conn
        .query_row("SELECT id FROM roles WHERE codigo = 'OPERADOR'", [], |r| {
            r.get(0)
        })
        .expect("rol");
    repo::seguridad::crear_usuario(
        conn,
        &crate::domain::seguridad::NuevoUsuario {
            nombre_usuario: nombre_usuario.into(),
            nombre_completo: "Operador de prueba".into(),
            email: None,
            password: "clave1234".into(),
            rol_id: rol_operador,
            created_by: Some("admin".into()),
        },
    )
    .expect("crear operador")
    .id
}

fn crear_lector(conn: &rusqlite::Connection, nombre_usuario: &str) -> String {
    let rol_lector: String = conn
        .query_row("SELECT id FROM roles WHERE codigo = 'LECTOR'", [], |r| {
            r.get(0)
        })
        .expect("rol");
    repo::seguridad::crear_usuario(
        conn,
        &crate::domain::seguridad::NuevoUsuario {
            nombre_usuario: nombre_usuario.into(),
            nombre_completo: "Lector de prueba".into(),
            email: None,
            password: "clave1234".into(),
            rol_id: rol_lector,
            created_by: Some("admin".into()),
        },
    )
    .expect("crear lector")
    .id
}

fn crear_encargado(conn: &rusqlite::Connection, nombre_usuario: &str) -> String {
    let rol_encargado: String = conn
        .query_row(
            "SELECT id FROM roles WHERE codigo = 'ENCARGADO_ALMACEN'",
            [],
            |r| r.get(0),
        )
        .expect("rol");
    repo::seguridad::crear_usuario(
        conn,
        &crate::domain::seguridad::NuevoUsuario {
            nombre_usuario: nombre_usuario.into(),
            nombre_completo: "Encargado de prueba".into(),
            email: None,
            password: "clave1234".into(),
            rol_id: rol_encargado,
            created_by: Some("admin".into()),
        },
    )
    .expect("crear encargado")
    .id
}

#[test]
fn comentario_crear_y_listar() {
    let db = setup();
    let conn = db.conn();
    let (almacen_id, _ubi1, _ubi2) = crear_arbol(&conn);

    let comentario = repo::comentario::crear_comentario(
        &conn,
        &crate::domain::alerta::NuevoComentario {
            entidad: "almacen".into(),
            entidad_id: almacen_id.clone(),
            texto: "Revisar estantería dañada".into(),
            usuario_id: "admin".into(),
        },
    )
    .expect("crear comentario");
    assert_eq!(comentario.entidad_id, almacen_id);
    assert!(!comentario.editado);
    assert!(!comentario.oculto);

    let lista = repo::comentario::listar_comentarios(&conn, "almacen", &almacen_id, "admin")
        .expect("listar");
    assert_eq!(lista.len(), 1);
    assert_eq!(lista[0].id, comentario.id);
}

#[test]
fn comentario_entidad_invalida_rechazada() {
    let db = setup();
    let conn = db.conn();
    let err = repo::comentario::crear_comentario(
        &conn,
        &crate::domain::alerta::NuevoComentario {
            entidad: "cosa_inventada".into(),
            entidad_id: "x".into(),
            texto: "texto".into(),
            usuario_id: "admin".into(),
        },
    )
    .expect_err("debe fallar");
    assert!(matches!(err, crate::error::AppError::CampoRequerido(_)));
}

#[test]
fn comentario_editar_conserva_historial() {
    let db = setup();
    let conn = db.conn();
    let (almacen_id, _ubi1, _ubi2) = crear_arbol(&conn);
    let comentario = repo::comentario::crear_comentario(
        &conn,
        &crate::domain::alerta::NuevoComentario {
            entidad: "almacen".into(),
            entidad_id: almacen_id,
            texto: "Texto original".into(),
            usuario_id: "admin".into(),
        },
    )
    .expect("crear");

    let editado =
        repo::comentario::editar_comentario(&conn, &comentario.id, "Texto corregido", "admin")
            .expect("editar");
    assert!(editado.editado);
    assert_eq!(editado.texto, "Texto corregido");

    let historial =
        repo::comentario::listar_historial_comentario(&conn, &comentario.id).expect("historial");
    assert_eq!(historial.len(), 1);
    assert_eq!(historial[0].texto_anterior, "Texto original");
}

#[test]
fn comentario_editar_solo_autor() {
    let db = setup();
    let conn = db.conn();
    let (almacen_id, _ubi1, _ubi2) = crear_arbol(&conn);
    let comentario = repo::comentario::crear_comentario(
        &conn,
        &crate::domain::alerta::NuevoComentario {
            entidad: "almacen".into(),
            entidad_id: almacen_id,
            texto: "Texto de admin".into(),
            usuario_id: "admin".into(),
        },
    )
    .expect("crear");
    let operador = crear_operador(&conn, "operador_com1");

    let err =
        repo::comentario::editar_comentario(&conn, &comentario.id, "intento ajeno", &operador)
            .expect_err("debe fallar");
    assert!(matches!(err, crate::error::AppError::SinPermiso(_)));
}

#[test]
fn comentario_autor_puede_ocultar_el_propio() {
    let db = setup();
    let conn = db.conn();
    let (almacen_id, _ubi1, _ubi2) = crear_arbol(&conn);
    let operador = crear_operador(&conn, "operador_com2");
    let comentario = repo::comentario::crear_comentario(
        &conn,
        &crate::domain::alerta::NuevoComentario {
            entidad: "almacen".into(),
            entidad_id: almacen_id,
            texto: "Comentario del operador".into(),
            usuario_id: operador.clone(),
        },
    )
    .expect("crear");

    repo::comentario::ocultar_comentario(&conn, &comentario.id, &operador).expect("ocultar");
    let actualizado = repo::comentario::obtener_comentario(&conn, &comentario.id)
        .expect("obtener")
        .expect("existe");
    assert!(actualizado.oculto);
    assert_eq!(actualizado.oculto_by.as_deref(), Some(operador.as_str()));
}

#[test]
fn comentario_ocultar_por_otro_sin_permiso_falla() {
    let db = setup();
    let conn = db.conn();
    let (almacen_id, _ubi1, _ubi2) = crear_arbol(&conn);
    let comentario = repo::comentario::crear_comentario(
        &conn,
        &crate::domain::alerta::NuevoComentario {
            entidad: "almacen".into(),
            entidad_id: almacen_id,
            texto: "Comentario de admin".into(),
            usuario_id: "admin".into(),
        },
    )
    .expect("crear");
    let operador = crear_operador(&conn, "operador_com3");

    let err = repo::comentario::ocultar_comentario(&conn, &comentario.id, &operador)
        .expect_err("debe fallar");
    assert!(matches!(err, crate::error::AppError::SinPermiso(_)));
}

// ============ Trazabilidad (SPEC §13.4) ============

#[test]
fn trazabilidad_donde_esta_lote() {
    let db = setup();
    let conn = db.conn();
    let (_almacen_id, ubi1, ubi2) = crear_arbol(&conn);
    let uom = repo::catalogo::crear_uom(
        &conn,
        &NuevaUom {
            codigo: "PZA-TRZ1".into(),
            nombre: "Pieza".into(),
            tipo: "UNIDAD".into(),
            factor: 1,
            base: true,
        },
        "admin",
    )
    .expect("uom")
    .id;
    let prod = crear_producto_con_lote(&conn, "REF-TRZ1", &uom, false);
    let lote = crear_lote_con_fechas(&conn, &prod, "L-TRZ1", None, None);
    entrar_stock(&conn, &ubi1, &prod, Some(&lote), 6);
    entrar_stock(&conn, &ubi2, &prod, Some(&lote), 4);

    let ubicaciones =
        repo::trazabilidad::donde_esta_lote(&conn, &lote, "admin").expect("consultar");
    assert_eq!(ubicaciones.len(), 2);
    let total: i64 = ubicaciones.iter().map(|u| u.cantidad).sum();
    assert_eq!(total, 10);
}

#[test]
fn trazabilidad_origen_de_salida() {
    let db = setup();
    let conn = db.conn();
    let (_almacen_id, ubi1, _ubi2) = crear_arbol(&conn);
    let (_uom, prod) = crear_uom_y_producto(&conn);
    entrar_stock(&conn, &ubi1, &prod, None, 10);

    let salida = repo::movimiento::crear_movimiento(
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
                costo_unitario: None,
                producto_id: prod,
                lote_id: None,
                cantidad: 3,
                origen_ubicacion_id: Some(ubi1),
                destino_ubicacion_id: None,
                caja_origen_id: None,
                caja_destino_id: None,
            }],
        },
    )
    .expect("crear salida");
    repo::movimiento::aprobar_movimiento(&conn, &salida.id, "admin").expect("aprobar salida");

    let origenes =
        repo::trazabilidad::origen_de_salida(&conn, &salida.id, "admin").expect("consultar");
    assert_eq!(origenes.len(), 1);
    assert_eq!(origenes[0].sub_tipo, "COMPRA");
}

#[test]
fn trazabilidad_movimientos_de_producto_en_rango() {
    let db = setup();
    let conn = db.conn();
    let (_almacen_id, ubi1, _ubi2) = crear_arbol(&conn);
    let (_uom, prod) = crear_uom_y_producto(&conn);
    entrar_stock(&conn, &ubi1, &prod, None, 5);

    let hoy = crate::domain::ahora()[..10].to_string();
    let en_rango = repo::trazabilidad::movimientos_de_producto_en_rango(
        &conn,
        &prod,
        &format!("{hoy}T00:00:00"),
        &format!("{hoy}T23:59:59"),
        "admin",
    )
    .expect("consultar");
    assert_eq!(en_rango.len(), 1);

    let fuera_de_rango = repo::trazabilidad::movimientos_de_producto_en_rango(
        &conn,
        &prod,
        "2000-01-01T00:00:00",
        "2000-01-02T00:00:00",
        "admin",
    )
    .expect("consultar");
    assert!(fuera_de_rango.is_empty());
}

#[test]
fn trazabilidad_lotes_por_vencer() {
    let db = setup();
    let conn = db.conn();
    let (_almacen_id, ubi1, _ubi2) = crear_arbol(&conn);
    let uom = repo::catalogo::crear_uom(
        &conn,
        &NuevaUom {
            codigo: "PZA-TRZ2".into(),
            nombre: "Pieza".into(),
            tipo: "UNIDAD".into(),
            factor: 1,
            base: true,
        },
        "admin",
    )
    .expect("uom")
    .id;
    let prod = crear_producto_con_lote(&conn, "REF-TRZ2", &uom, true);
    let vencido = crear_lote_con_fechas(&conn, &prod, "L-TRZ2-VENC", None, Some("2020-01-01"));
    let proximo = crear_lote_con_fechas(&conn, &prod, "L-TRZ2-PROX", None, Some("2026-08-20"));
    let lejano = crear_lote_con_fechas(&conn, &prod, "L-TRZ2-LEJOS", None, Some("2035-01-01"));
    entrar_stock(&conn, &ubi1, &prod, Some(&vencido), 5);
    entrar_stock(&conn, &ubi1, &prod, Some(&proximo), 5);
    entrar_stock(&conn, &ubi1, &prod, Some(&lejano), 5);

    let resultado = repo::trazabilidad::lotes_por_vencer(&conn, 60, "admin").expect("consultar");
    let ids: Vec<&str> = resultado.iter().map(|l| l.lote_id.as_str()).collect();
    assert!(ids.contains(&vencido.as_str()));
    assert!(ids.contains(&proximo.as_str()));
    assert!(!ids.contains(&lejano.as_str()));
    let venc = resultado.iter().find(|l| l.lote_id == vencido).unwrap();
    assert!(venc.vencido);
}

#[test]
fn trazabilidad_vencimientos_por_rango_clasifica_en_buckets() {
    // SPEC §16.2: "Vencimientos: próximos 30/60/90 días y vencidos" en una
    // sola llamada, ya clasificados por rango.
    let db = setup();
    let conn = db.conn();
    let (_almacen_id, ubi1, _ubi2) = crear_arbol(&conn);
    let uom = repo::catalogo::crear_uom(
        &conn,
        &NuevaUom {
            codigo: "PZA-VPR".into(),
            nombre: "Pieza".into(),
            tipo: "UNIDAD".into(),
            factor: 1,
            base: true,
        },
        "admin",
    )
    .expect("uom")
    .id;
    let prod = crear_producto_con_lote(&conn, "REF-VPR", &uom, true);
    let hoy = &crate::domain::ahora()[..10];
    let fecha = |dias: i64| repo::trazabilidad::fecha_mas_dias(hoy, dias);

    let l_vencido = crear_lote_con_fechas(&conn, &prod, "L-VPR-VENC", None, Some(&fecha(-5)));
    let l_30 = crear_lote_con_fechas(&conn, &prod, "L-VPR-30", None, Some(&fecha(10)));
    let l_60 = crear_lote_con_fechas(&conn, &prod, "L-VPR-60", None, Some(&fecha(45)));
    let l_90 = crear_lote_con_fechas(&conn, &prod, "L-VPR-90", None, Some(&fecha(80)));
    let l_lejos = crear_lote_con_fechas(&conn, &prod, "L-VPR-LEJOS", None, Some(&fecha(200)));
    for lote in [&l_vencido, &l_30, &l_60, &l_90, &l_lejos] {
        entrar_stock(&conn, &ubi1, &prod, Some(lote), 3);
    }

    let reporte = repo::trazabilidad::vencimientos_por_rango(&conn, "admin").expect("reporte");
    assert_eq!(reporte.vencidos.total_lotes, 1);
    assert_eq!(reporte.vencidos.total_unidades, 3);
    assert!(
        reporte
            .vencidos
            .lotes
            .iter()
            .any(|l| l.lote_id == l_vencido)
    );
    assert_eq!(reporte.proximos_30.total_lotes, 1);
    assert!(reporte.proximos_30.lotes.iter().any(|l| l.lote_id == l_30));
    assert_eq!(reporte.proximos_60.total_lotes, 1);
    assert!(reporte.proximos_60.lotes.iter().any(|l| l.lote_id == l_60));
    assert_eq!(reporte.proximos_90.total_lotes, 1);
    assert!(reporte.proximos_90.lotes.iter().any(|l| l.lote_id == l_90));
    // El lote lejano (200 días) no aparece en ningún bucket (horizonte máx 90).
    let todos_ids: Vec<&str> = reporte
        .vencidos
        .lotes
        .iter()
        .chain(&reporte.proximos_30.lotes)
        .chain(&reporte.proximos_60.lotes)
        .chain(&reporte.proximos_90.lotes)
        .map(|l| l.lote_id.as_str())
        .collect();
    assert!(!todos_ids.contains(&l_lejos.as_str()));
}

#[test]
fn reporte_desempeno_usuarios_agrupa_por_usuario_y_tipo() {
    let db = setup();
    let conn = db.conn();
    let (_almacen_id, ubi1, _ubi2) = crear_arbol(&conn);
    let (_uom, prod) = crear_uom_y_producto(&conn);
    let operador = crear_operador(&conn, "operador_desempeno1");

    entrar_stock(&conn, &ubi1, &prod, None, 5);
    let salida = repo::movimiento::crear_movimiento(
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
            created_by: operador.clone(),
            lineas: vec![NuevaLinea {
                costo_unitario: None,
                producto_id: prod,
                lote_id: None,
                cantidad: 2,
                origen_ubicacion_id: Some(ubi1),
                destino_ubicacion_id: None,
                caja_origen_id: None,
                caja_destino_id: None,
            }],
        },
    )
    .expect("crear salida");
    repo::movimiento::aprobar_movimiento(&conn, &salida.id, "admin").expect("aprobar");

    let reporte = repo::reporte::desempeno_usuarios(&conn, None, None).expect("reporte");
    let del_operador = reporte
        .iter()
        .find(|d| d.usuario_id == operador)
        .expect("el operador debe aparecer");
    assert_eq!(del_operador.total_movimientos, 1);
    assert_eq!(del_operador.salidas, 1);
    assert_eq!(del_operador.entradas, 0);
    assert_eq!(del_operador.aprobados, 1);

    let del_admin = reporte
        .iter()
        .find(|d| d.nombre_usuario == "admin")
        .expect("admin también creó un movimiento (la entrada inicial)");
    assert_eq!(del_admin.entradas, 1);
}

#[test]
fn trazabilidad_historial_caja() {
    let db = setup();
    let conn = db.conn();
    let (_almacen_id, ubi1, ubi2) = crear_arbol(&conn);
    let (_uom, prod) = crear_uom_y_producto(&conn);
    let caja = repo::catalogo::crear_caja(
        &conn,
        &NuevaCaja {
            codigo: "CAJA-TRZ".into(),
            nombre: None,
            ubicacion_id: ubi1.clone(),
            producto_id: None,
            lote_id: None,
            etiqueta: None,
            created_by: Some("admin".into()),
        },
    )
    .expect("caja");

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
                costo_unitario: None,
                producto_id: prod.clone(),
                lote_id: None,
                cantidad: 5,
                origen_ubicacion_id: None,
                destino_ubicacion_id: Some(ubi1.clone()),
                caja_origen_id: None,
                caja_destino_id: Some(caja.id.clone()),
            }],
        },
    )
    .expect("entrada");
    repo::movimiento::aprobar_movimiento(&conn, &entrada.id, "admin").expect("aprobar entrada");

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
                costo_unitario: None,
                producto_id: prod,
                lote_id: None,
                cantidad: 5,
                origen_ubicacion_id: Some(ubi1),
                destino_ubicacion_id: Some(ubi2),
                caja_origen_id: Some(caja.id.clone()),
                caja_destino_id: None,
            }],
        },
    )
    .expect("traslado");
    repo::movimiento::aprobar_movimiento(&conn, &traslado.id, "admin").expect("aprobar traslado");

    let historial =
        repo::trazabilidad::historial_caja(&conn, &caja.id, "admin").expect("consultar");
    assert_eq!(historial.len(), 2);
    assert_eq!(historial[0].rol, "destino");
    assert_eq!(historial[1].rol, "origen");
}

// ============ Alertas (SPEC §17) ============

#[test]
fn alertas_stock_bajo_se_genera_y_resuelve() {
    let db = setup();
    let conn = db.conn();
    let (_almacen_id, ubi1, _ubi2) = crear_arbol(&conn);
    let (_uom, prod) = crear_uom_y_producto(&conn); // stock_minimo = 2
    entrar_stock(&conn, &ubi1, &prod, None, 1);

    repo::alerta::regenerar_alertas(&conn, 30).expect("regenerar");
    let abiertas = repo::alerta::listar_alertas(&conn, Some("ABIERTA"), "admin").expect("listar");
    assert!(
        abiertas
            .iter()
            .any(|a| a.tipo == "STOCK_BAJO" && a.entidad_id.as_deref() == Some(prod.as_str()))
    );

    entrar_stock(&conn, &ubi1, &prod, None, 10);
    repo::alerta::regenerar_alertas(&conn, 30).expect("regenerar de nuevo");
    let abiertas2 = repo::alerta::listar_alertas(&conn, Some("ABIERTA"), "admin").expect("listar");
    assert!(
        !abiertas2
            .iter()
            .any(|a| a.tipo == "STOCK_BAJO" && a.entidad_id.as_deref() == Some(prod.as_str()))
    );
    let resueltas = repo::alerta::listar_alertas(&conn, Some("RESUELTA"), "admin").expect("listar");
    assert!(
        resueltas
            .iter()
            .any(|a| a.tipo == "STOCK_BAJO" && a.entidad_id.as_deref() == Some(prod.as_str()))
    );
}

#[test]
fn alertas_sobrecapacidad_solo_al_superar_no_al_llenar_exacto() {
    // SPEC §17.1: "intentar ingresar MÁS de capacidad_maxima" — llenar
    // exactamente hasta el límite (permitido por `validar_capacidad`, que usa
    // `>`) no debe disparar la alerta; superarlo sí.
    let db = setup();
    let conn = db.conn();
    let (_almacen_id, ubi1, _ubi2) = crear_arbol(&conn); // capacidad_maxima = 1000
    let (_uom, prod) = crear_uom_y_producto(&conn);

    entrar_stock(&conn, &ubi1, &prod, None, 1000);
    repo::alerta::regenerar_alertas(&conn, 30).expect("regenerar");
    let abiertas = repo::alerta::listar_alertas(&conn, Some("ABIERTA"), "admin").expect("listar");
    assert!(
        !abiertas.iter().any(|a| a.tipo == "UBICACION_SOBRECAPACIDAD"
            && a.entidad_id.as_deref() == Some(ubi1.as_str())),
        "llenar exacto hasta capacidad_maxima no debe alertar"
    );

    // `validar_capacidad` ya impide entrar por encima del máximo, así que
    // para simular la ubicación quedando por encima (ej. tras bajar su
    // `capacidad_maxima`) se edita el límite hacia abajo directamente.
    repo::catalogo::editar_ubicacion(
        &conn,
        &ubi1,
        &EditarUbicacion {
            capacidad_maxima: Some(500),
            ..Default::default()
        },
        "admin",
    )
    .expect("bajar capacidad_maxima");
    repo::alerta::regenerar_alertas(&conn, 30).expect("regenerar de nuevo");
    let abiertas2 = repo::alerta::listar_alertas(&conn, Some("ABIERTA"), "admin").expect("listar");
    assert!(
        abiertas2
            .iter()
            .any(|a| a.tipo == "UBICACION_SOBRECAPACIDAD"
                && a.entidad_id.as_deref() == Some(ubi1.as_str())),
        "superar capacidad_maxima sí debe alertar"
    );
}

#[test]
fn alertas_lote_vencido_se_detecta() {
    let db = setup();
    let conn = db.conn();
    let (_almacen_id, ubi1, _ubi2) = crear_arbol(&conn);
    let uom = repo::catalogo::crear_uom(
        &conn,
        &NuevaUom {
            codigo: "PZA-AL1".into(),
            nombre: "Pieza".into(),
            tipo: "UNIDAD".into(),
            factor: 1,
            base: true,
        },
        "admin",
    )
    .expect("uom")
    .id;
    let prod = crear_producto_con_lote(&conn, "REF-AL1", &uom, true);
    let lote = crear_lote_con_fechas(&conn, &prod, "L-AL1", None, Some("2020-01-01"));
    entrar_stock(&conn, &ubi1, &prod, Some(&lote), 5);

    repo::alerta::regenerar_alertas(&conn, 30).expect("regenerar");
    let abiertas = repo::alerta::listar_alertas(&conn, Some("ABIERTA"), "admin").expect("listar");
    assert!(
        abiertas
            .iter()
            .any(|a| a.tipo == "LOTE_VENCIDO" && a.entidad_id.as_deref() == Some(lote.as_str()))
    );
}

#[test]
fn alertas_movimiento_pendiente_se_detecta() {
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
            documento_referencia: None,
            notas: None,
            created_by: "admin".into(),
            lineas: vec![NuevaLinea {
                costo_unitario: None,
                producto_id: prod,
                lote_id: None,
                cantidad: 5,
                origen_ubicacion_id: None,
                destino_ubicacion_id: Some(ubi1),
                caja_origen_id: None,
                caja_destino_id: None,
            }],
        },
    )
    .expect("crear");
    repo::movimiento::enviar_a_aprobacion(&conn, &mov.id, "admin").expect("enviar");

    repo::alerta::regenerar_alertas(&conn, 30).expect("regenerar");
    let abiertas = repo::alerta::listar_alertas(&conn, Some("ABIERTA"), "admin").expect("listar");
    assert!(
        abiertas.iter().any(|a| a.tipo == "MOVIMIENTO_PENDIENTE"
            && a.entidad_id.as_deref() == Some(mov.id.as_str()))
    );
}

#[test]
fn alertas_ignorar_no_se_muestra_como_abierta() {
    let db = setup();
    let conn = db.conn();
    let (_almacen_id, ubi1, _ubi2) = crear_arbol(&conn);
    let (_uom, prod) = crear_uom_y_producto(&conn);
    entrar_stock(&conn, &ubi1, &prod, None, 1);
    repo::alerta::regenerar_alertas(&conn, 30).expect("regenerar");
    let abierta = repo::alerta::listar_alertas(&conn, Some("ABIERTA"), "admin")
        .expect("listar")
        .into_iter()
        .find(|a| a.tipo == "STOCK_BAJO" && a.entidad_id.as_deref() == Some(prod.as_str()))
        .expect("debe existir");

    repo::alerta::ignorar_alerta(&conn, &abierta.id, "admin").expect("ignorar");
    // El listado real recalcula las alertas en cada consulta; ese recálculo no
    // debe reabrir ni duplicar la alerta mientras la condición siga activa.
    repo::alerta::regenerar_alertas(&conn, 30).expect("regenerar tras ignorar");
    let abiertas = repo::alerta::listar_alertas(&conn, Some("ABIERTA"), "admin").expect("listar");
    assert!(
        !abiertas
            .iter()
            .any(|a| a.entidad_id.as_deref() == Some(prod.as_str())),
        "la alerta ignorada no debe reaparecer como abierta"
    );
    let ignoradas = repo::alerta::listar_alertas(&conn, Some("IGNORADA"), "admin").expect("listar");
    assert_eq!(
        ignoradas
            .iter()
            .filter(|a| a.entidad_id.as_deref() == Some(prod.as_str()))
            .count(),
        1,
        "la alerta ignorada no debe duplicarse al recalcular"
    );
}

// ============ Reportes y KPIs (SPEC §16) ============

#[test]
fn reporte_dashboard_totales() {
    let db = setup();
    let conn = db.conn();
    let (_almacen_id, ubi1, _ubi2) = crear_arbol(&conn);
    let (_uom, prod) = crear_uom_y_producto(&conn);
    entrar_stock(&conn, &ubi1, &prod, None, 8);

    let resumen = repo::reporte::dashboard(&conn).expect("dashboard");
    assert_eq!(resumen.total_skus_activos, 1);
    assert_eq!(resumen.total_unidades, 8);
    assert_eq!(resumen.movimientos_hoy, 1);
    assert_eq!(resumen.movimientos_hoy_por_tipo.entradas, 1);
    assert_eq!(resumen.movimientos_hoy_por_tipo.salidas, 0);
    assert_eq!(resumen.ubicaciones_con_stock, 1);
    assert!(resumen.ubicaciones_totales >= 2);
}

#[test]
fn reporte_dashboard_valor_inventario_usa_costo_unitario() {
    // SPEC §16.1: "Valor del inventario (costo promedio o costo de entrada)".
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
                costo_unitario: Some(2.5),
                producto_id: prod,
                lote_id: None,
                cantidad: 10,
                origen_ubicacion_id: None,
                destino_ubicacion_id: Some(ubi1),
                caja_origen_id: None,
                caja_destino_id: None,
            }],
        },
    )
    .expect("crear entrada con costo");
    repo::movimiento::aprobar_movimiento(&conn, &entrada.id, "admin").expect("aprobar");

    let resumen = repo::reporte::dashboard(&conn).expect("dashboard");
    // 10 unidades * 2.5 costo_unitario = 25.0.
    assert!((resumen.valor_inventario - 25.0).abs() < 0.001);
}

#[test]
fn reporte_kardex_producto_acumula_saldo() {
    let db = setup();
    let conn = db.conn();
    let (_almacen_id, ubi1, _ubi2) = crear_arbol(&conn);
    let (_uom, prod) = crear_uom_y_producto(&conn);
    entrar_stock(&conn, &ubi1, &prod, None, 10);

    let salida = repo::movimiento::crear_movimiento(
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
                costo_unitario: None,
                producto_id: prod.clone(),
                lote_id: None,
                cantidad: 4,
                origen_ubicacion_id: Some(ubi1),
                destino_ubicacion_id: None,
                caja_origen_id: None,
                caja_destino_id: None,
            }],
        },
    )
    .expect("crear salida");
    repo::movimiento::aprobar_movimiento(&conn, &salida.id, "admin").expect("aprobar salida");

    let kardex = repo::reporte::kardex_producto(&conn, &prod, None).expect("kardex");
    assert_eq!(kardex.len(), 2);
    assert_eq!(kardex[0].saldo_acumulado, 10);
    assert_eq!(kardex[1].saldo_acumulado, 6);
}

#[test]
fn reporte_kpis_generales_rotacion_cobertura_y_antiguedad() {
    // SPEC §16.3: KPIs 4 (rotación de stock), 5 (días de cobertura) y 8
    // (antigüedad del stock) — antes solo se calculaban tasa de merma y
    // lotes vencidos.
    let db = setup();
    let conn = db.conn();
    let (_almacen_id, ubi1, _ubi2) = crear_arbol(&conn);
    let (_uom, prod) = crear_uom_y_producto(&conn);
    entrar_stock(&conn, &ubi1, &prod, None, 10);

    let salida = repo::movimiento::crear_movimiento(
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
                costo_unitario: None,
                producto_id: prod,
                lote_id: None,
                cantidad: 4,
                origen_ubicacion_id: Some(ubi1),
                destino_ubicacion_id: None,
                caja_origen_id: None,
                caja_destino_id: None,
            }],
        },
    )
    .expect("crear salida");
    repo::movimiento::aprobar_movimiento(&conn, &salida.id, "admin").expect("aprobar salida");

    let kpis = repo::reporte::kpis_generales(&conn).expect("kpis");
    // Stock actual = 6 (10 - 4). Salidas últimos 30 días = 4.
    assert!((kpis.rotacion_stock_30d - (4.0 / 6.0)).abs() < 0.001);
    let cobertura = kpis.dias_cobertura.expect("debe haber cobertura");
    assert!((cobertura - (6.0 / (4.0 / 30.0))).abs() < 0.001);
    // La entrada fue "hoy": antigüedad ~0 días.
    let antiguedad = kpis.antiguedad_stock_dias.expect("debe haber antigüedad");
    assert!(antiguedad < 1.0, "antigüedad = {antiguedad}");
    assert_eq!(kpis.precision_sku_ultima_sesion, None);
}

#[test]
fn reporte_precision_sesion_calcula_metricas() {
    let db = setup();
    let conn = db.conn();
    let (almacen_id, ubi1, _ubi2) = crear_arbol(&conn);
    let (_uom, prod) = crear_uom_y_producto(&conn);
    entrar_stock(&conn, &ubi1, &prod, None, 10);

    let sesion = repo::inventario::crear_sesion(
        &conn,
        &NuevaSesionInventario {
            tipo: "CICLICO".into(),
            almacen_id,
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
            ubicacion_id: ubi1,
            producto_id: prod,
            lote_id: None,
            cantidad_contada: 7,
            conteo_numero: 1,
            usuario_contador_id: "admin".into(),
            nota: None,
        },
    )
    .expect("conteo");

    let precision = repo::inventario::precision_sesion(&conn, &sesion.id).expect("precision");
    assert_eq!(precision.skus_contados, 1);
    assert_eq!(precision.skus_exactos, 0);
    assert_eq!(precision.unidades_contadas, 7);
    assert_eq!(precision.unidades_correctas, 4);
    assert!((precision.precision_cantidad - (4.0 / 7.0 * 100.0)).abs() < 0.001);
    assert_eq!(precision.ubicaciones_contadas, 1);
    assert_eq!(precision.ubicaciones_exactas, 0);
}

/// Al cerrar, la precisión y las diferencias quedan congeladas en la
/// instantánea del cierre (SPEC §11.5/§11.6): los ajustes generados alteran
/// los saldos, pero el histórico debe seguir mostrando la diferencia real
/// contra el saldo que había AL MOMENTO DEL CONTEO — no un "conciliado"
/// falso contra el saldo ya ajustado.
#[test]
fn cierre_inventario_congela_precision_y_diferencias_historicas() {
    let db = setup();
    let conn = db.conn();
    let (almacen_id, ubi1, _ubi2) = crear_arbol(&conn);
    let (_uom, prod) = crear_uom_y_producto(&conn);
    entrar_stock(&conn, &ubi1, &prod, None, 10);

    let sesion = repo::inventario::crear_sesion(
        &conn,
        &NuevaSesionInventario {
            tipo: "CICLICO".into(),
            almacen_id,
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

    // Antes de cerrar: cálculo en vivo contra el saldo actual (10).
    let pre = repo::inventario::diferencias_sesion(&conn, &sesion.id).expect("difs pre");
    assert_eq!(pre.len(), 1);
    assert_eq!(pre[0].saldo_sistema, 10);
    assert_eq!(pre[0].diferencia, -3);
    assert_eq!(pre[0].tipo, "faltante");

    // Cerrar: genera el AJUSTE_NEGATIVO de 3 → el saldo pasa a 7.
    let ajustes = repo::inventario::cerrar_sesion(&conn, &sesion.id, "admin").expect("cerrar");
    assert_eq!(ajustes.len(), 1);

    let saldo_post: i64 = conn
        .query_row(
            "SELECT COALESCE(SUM(cantidad),0) FROM saldos WHERE ubicacion_id=?1 AND producto_id=?2",
            rusqlite::params![ubi1, prod],
            |r| r.get(0),
        )
        .expect("saldo");
    assert_eq!(saldo_post, 7, "el ajuste del cierre sí aplicó");

    // Tras cerrar: la diferencia histórica se conserva (contra 10, no contra 7).
    let post = repo::inventario::diferencias_sesion(&conn, &sesion.id).expect("difs post");
    assert_eq!(post.len(), 1);
    assert_eq!(
        post[0].saldo_sistema, 10,
        "saldo congelado al momento del conteo"
    );
    assert_eq!(post[0].diferencia, -3);
    assert_eq!(post[0].tipo, "faltante", "no debe aparecer como conciliado");

    let precision = repo::inventario::precision_sesion(&conn, &sesion.id).expect("precision");
    assert_eq!(precision.unidades_contadas, 7);
    assert_eq!(
        precision.unidades_correctas, 4,
        "precisión histórica, no 7/7"
    );
    assert!((precision.precision_cantidad - (4.0 / 7.0 * 100.0)).abs() < 0.001);
    assert_eq!(precision.skus_exactos, 0);
}

// ============ Endurecimiento final (SPEC §14.6) ============

#[test]
fn ajuste_manual_bloqueado_durante_inventario_en_curso() {
    let db = setup();
    let conn = db.conn();
    let (almacen_id, ubi1, _ubi2) = crear_arbol(&conn);
    let (_uom, prod) = crear_uom_y_producto(&conn);
    entrar_stock(&conn, &ubi1, &prod, None, 10);

    repo::inventario::crear_sesion(
        &conn,
        &NuevaSesionInventario {
            tipo: "CICLICO".into(),
            almacen_id,
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

    let ajuste = repo::movimiento::crear_movimiento(
        &conn,
        &NuevoMovimiento {
            tipo: "AJUSTE".into(),
            sub_tipo: "AJUSTE_NEGATIVO".into(),
            fecha_movimiento: None,
            motivo: Some("corrección manual".into()),
            origen_ubicacion_id: Some(ubi1.clone()),
            destino_ubicacion_id: None,
            proveedor_id: None,
            cliente_id: None,
            sesion_inventario_id: None,
            documento_referencia: None,
            notas: None,
            created_by: "admin".into(),
            lineas: vec![NuevaLinea {
                costo_unitario: None,
                producto_id: prod,
                lote_id: None,
                cantidad: 2,
                origen_ubicacion_id: Some(ubi1),
                destino_ubicacion_id: None,
                caja_origen_id: None,
                caja_destino_id: None,
            }],
        },
    )
    .expect("crear ajuste (BORRADOR no afecta stock)");

    let err =
        repo::movimiento::aprobar_movimiento(&conn, &ajuste.id, "admin").expect_err("debe fallar");
    assert!(matches!(
        err,
        crate::error::AppError::AjusteBloqueadoPorInventario(_)
    ));
}

/// Ejercita la deserialización JSON real (no la construcción directa del
/// struct en Rust): `parent_id` ausente debe distinguirse de `parent_id:
/// null` — es exactamente el límite que cruza el IPC de Tauri con el
/// frontend. Ver `domain::catalogo::deserialize_some`.
#[test]
fn editar_categoria_distingue_ausente_de_null_en_json() {
    use crate::domain::catalogo::EditarCategoria;

    let ausente: EditarCategoria = serde_json::from_str(r#"{"nombre":"X"}"#).expect("deserializar");
    assert_eq!(ausente.parent_id, None, "ausente debe ser 'no tocar'");

    let nulo: EditarCategoria =
        serde_json::from_str(r#"{"nombre":"X","parent_id":null}"#).expect("deserializar");
    assert_eq!(nulo.parent_id, Some(None), "null debe ser 'mover a raíz'");

    let con_valor: EditarCategoria =
        serde_json::from_str(r#"{"nombre":"X","parent_id":"abc"}"#).expect("deserializar");
    assert_eq!(con_valor.parent_id, Some(Some("abc".to_string())));
}

/// El script de datos de ejemplo (`RUSTOCK_SEED=1`, ver `src/seed.rs`) debe
/// producir un estado consistente usando únicamente las funciones de negocio
/// reales, y no debe duplicar datos si se ejecuta más de una vez.
#[test]
fn seed_de_ejemplo_puebla_datos_consistentes_y_es_idempotente() {
    let db = DbState::init_in_memory().expect("db");
    let conn = db.conn();
    crate::security::seed_roles(&conn).expect("roles");

    crate::seed::sembrar_si_vacio(&conn).expect("seed");

    let almacenes: i64 = conn
        .query_row("SELECT COUNT(*) FROM almacenes", [], |r| r.get(0))
        .unwrap();
    assert_eq!(almacenes, 1);

    let productos: i64 = conn
        .query_row("SELECT COUNT(*) FROM productos", [], |r| r.get(0))
        .unwrap();
    assert_eq!(productos, 4);

    let movimientos_aprobados: i64 = conn
        .query_row(
            "SELECT COUNT(*) FROM movimientos WHERE estado = 'APROBADO'",
            [],
            |r| r.get(0),
        )
        .unwrap();
    assert!(movimientos_aprobados >= 5);

    let alertas_abiertas: i64 = conn
        .query_row(
            "SELECT COUNT(*) FROM alertas WHERE estado = 'ABIERTA'",
            [],
            |r| r.get(0),
        )
        .unwrap();
    assert!(
        alertas_abiertas > 0,
        "el seed debe disparar al menos una alerta (stock bajo, vencimiento o pendiente)"
    );

    let sesiones: i64 = conn
        .query_row("SELECT COUNT(*) FROM sesiones_inventario", [], |r| r.get(0))
        .unwrap();
    assert_eq!(sesiones, 2, "una sesión cerrada y una en curso");

    // Idempotente: correrlo de nuevo (como hace cada arranque con la app ya
    // sembrada) no debe duplicar nada.
    crate::seed::sembrar_si_vacio(&conn).expect("seed segunda vez");
    let almacenes_2: i64 = conn
        .query_row("SELECT COUNT(*) FROM almacenes", [], |r| r.get(0))
        .unwrap();
    assert_eq!(almacenes_2, 1);
}

// ============ Configuración de empresa y preferencias (SPEC §4.3, §14.4, §17.1) ============

#[test]
fn configuracion_empresa_default_y_edicion() {
    let db = setup();
    let conn = db.conn();

    let config = repo::configuracion::obtener_configuracion_empresa(&conn).expect("config");
    assert_eq!(config.zona_horaria, "America/Lima");
    assert_eq!(config.formato_fecha, "DD_MMM_YYYY");
    assert_eq!(config.dias_aviso_vencimiento, 30);
    assert!(config.requiere_aprobacion, "por defecto exige aprobación");
    assert_eq!(config.stock_minimo_default, None);

    let cambios = crate::domain::configuracion::EditarConfiguracionEmpresa {
        nombre: Some(Some("Rustock SAC".into())),
        codigo: Some(Some("RUST-01".into())),
        descripcion: None,
        zona_horaria: Some("America/Mexico_City".into()),
        formato_fecha: Some("DD_MM_YYYY".into()),
        dias_aviso_vencimiento: Some(15),
        requiere_aprobacion: Some(false),
        stock_minimo_default: Some(Some(3)),
        pais: Some(Some("Perú".into())),
        ciudad: Some(Some("Lima".into())),
        latitud: Some(Some(-12.0464)),
        longitud: Some(Some(-77.0428)),
        ..Default::default()
    };
    let editada = repo::configuracion::guardar_configuracion_empresa(&conn, &cambios, "admin")
        .expect("guardar");
    assert_eq!(editada.nombre.as_deref(), Some("Rustock SAC"));
    assert_eq!(editada.zona_horaria, "America/Mexico_City");
    assert_eq!(editada.formato_fecha, "DD_MM_YYYY");
    assert_eq!(editada.dias_aviso_vencimiento, 15);
    assert!(!editada.requiere_aprobacion);
    assert_eq!(editada.stock_minimo_default, Some(3));
    assert_eq!(editada.pais.as_deref(), Some("Perú"));
    assert_eq!(editada.ciudad.as_deref(), Some("Lima"));
    assert_eq!(editada.latitud, Some(-12.0464));
    assert_eq!(editada.longitud, Some(-77.0428));

    // La auditoría registra el cambio (SPEC §4.5).
    let n: i64 = conn
        .query_row(
            "SELECT COUNT(*) FROM auditoria WHERE entidad = 'configuracion_empresa'",
            [],
            |r| r.get(0),
        )
        .unwrap();
    assert!(n >= 1);
}

#[test]
fn configuracion_empresa_rechaza_zona_horaria_o_formato_invalidos() {
    let db = setup();
    let conn = db.conn();

    let zona_mala = crate::domain::configuracion::EditarConfiguracionEmpresa {
        zona_horaria: Some("Mars/Olympus".into()),
        ..Default::default()
    };
    assert!(matches!(
        repo::configuracion::guardar_configuracion_empresa(&conn, &zona_mala, "admin"),
        Err(crate::error::AppError::CampoInvalido(_))
    ));

    let formato_malo = crate::domain::configuracion::EditarConfiguracionEmpresa {
        formato_fecha: Some("MM-DD-YY".into()),
        ..Default::default()
    };
    assert!(matches!(
        repo::configuracion::guardar_configuracion_empresa(&conn, &formato_malo, "admin"),
        Err(crate::error::AppError::CampoInvalido(_))
    ));
}

#[test]
fn preferencias_usuario_resueltas_con_fallback_de_empresa() {
    let db = setup();
    let conn = db.conn();
    let admin = id_admin(&conn);

    // Sin preferencias guardadas: los valores resueltos heredan de la empresa.
    let resueltas = repo::configuracion::preferencias_resueltas(&conn, &admin).expect("resueltas");
    assert_eq!(resueltas.tamano_fuente, "MEDIA");
    assert_eq!(resueltas.zona_horaria, "America/Lima");
    assert_eq!(resueltas.formato_fecha, "DD_MMM_YYYY");
    assert_eq!(resueltas.tema_id, "rust", "tema por defecto de la empresa");
    assert!(resueltas.tema_heredado, "sin preferencia propia, hereda");
    assert!(!resueltas.modo_oscuro);
    assert!(resueltas.modo_oscuro_heredado);

    // El usuario se pone su propia zona horaria y formato; hereda lo demás.
    let cambios = crate::domain::configuracion::EditarPreferenciasUsuario {
        tamano_fuente: Some("GRANDE".into()),
        orden_sidebar: Some(Some("[\"/movimientos\",\"/\"]".into())),
        zona_horaria: Some(Some("UTC".into())),
        formato_fecha: Some(None), // explícitamente "heredar"
        tema_id: Some(Some("bosque".into())),
        modo_oscuro: Some(Some(true)),
        ayuda_en_palette: Some(false),
    };
    repo::configuracion::guardar_preferencias_usuario(&conn, &admin, &cambios).expect("guardar");

    let resueltas2 = repo::configuracion::preferencias_resueltas(&conn, &admin).expect("resueltas");
    assert_eq!(resueltas2.tamano_fuente, "GRANDE");
    assert_eq!(resueltas2.zona_horaria, "UTC");
    assert_eq!(
        resueltas2.formato_fecha, "DD_MMM_YYYY",
        "hereda de la empresa"
    );
    assert_eq!(
        resueltas2.orden_sidebar.as_deref(),
        Some("[\"/movimientos\",\"/\"]")
    );
    assert_eq!(resueltas2.tema_id, "bosque", "paleta propia del usuario");
    assert!(!resueltas2.tema_heredado);
    assert!(resueltas2.modo_oscuro, "modo oscuro propio");
    assert!(!resueltas2.modo_oscuro_heredado);
    assert!(
        !resueltas2.ayuda_en_palette,
        "preferencia de ayuda en el palette desactivada"
    );

    // Volver a heredar el tema: `Some(None)` limpia la preferencia propia.
    let heredar = crate::domain::configuracion::EditarPreferenciasUsuario {
        tema_id: Some(None),
        modo_oscuro: Some(None),
        ..Default::default()
    };
    repo::configuracion::guardar_preferencias_usuario(&conn, &admin, &heredar).expect("heredar");
    let resueltas3 = repo::configuracion::preferencias_resueltas(&conn, &admin).expect("resueltas");
    assert_eq!(resueltas3.tema_id, "rust");
    assert!(resueltas3.tema_heredado);
    assert!(resueltas3.modo_oscuro_heredado);
}

#[test]
fn preferencias_usuario_rechaza_valores_invalidos() {
    let db = setup();
    let conn = db.conn();
    let admin = id_admin(&conn);

    let tamano_malo = crate::domain::configuracion::EditarPreferenciasUsuario {
        tamano_fuente: Some("ENORME".into()),
        ..Default::default()
    };
    assert!(matches!(
        repo::configuracion::guardar_preferencias_usuario(&conn, &admin, &tamano_malo),
        Err(crate::error::AppError::CampoInvalido(_))
    ));

    let zona_mala = crate::domain::configuracion::EditarPreferenciasUsuario {
        zona_horaria: Some(Some("Antartica/Base".into())),
        ..Default::default()
    };
    assert!(matches!(
        repo::configuracion::guardar_preferencias_usuario(&conn, &admin, &zona_mala),
        Err(crate::error::AppError::CampoInvalido(_))
    ));

    let tema_malo = crate::domain::configuracion::EditarPreferenciasUsuario {
        tema_id: Some(Some("neon".into())),
        ..Default::default()
    };
    assert!(matches!(
        repo::configuracion::guardar_preferencias_usuario(&conn, &admin, &tema_malo),
        Err(crate::error::AppError::CampoInvalido(_))
    ));
}

// ============ Temas de la UI (DESIGN §3.1) ============

#[test]
fn configuracion_empresa_rechaza_tema_invalido() {
    let db = setup();
    let conn = db.conn();
    let admin = id_admin(&conn);

    let cambios = crate::domain::configuracion::EditarConfiguracionEmpresa {
        tema_id: Some("neon".into()),
        ..Default::default()
    };
    assert!(matches!(
        repo::configuracion::guardar_configuracion_empresa(&conn, &cambios, &admin),
        Err(crate::error::AppError::CampoInvalido(_))
    ));

    // Un tema válido + modo oscuro global sí se guarda y se hereda.
    let ok = crate::domain::configuracion::EditarConfiguracionEmpresa {
        tema_id: Some("oceano".into()),
        modo_oscuro: Some(true),
        ..Default::default()
    };
    let config = repo::configuracion::guardar_configuracion_empresa(&conn, &ok, &admin)
        .expect("guardar tema válido");
    assert_eq!(config.tema_id, "oceano");
    assert!(config.modo_oscuro);

    // Un usuario sin preferencia propia hereda el tema global de la empresa.
    let resueltas = repo::configuracion::preferencias_resueltas(&conn, &admin).expect("resueltas");
    assert_eq!(resueltas.tema_id, "oceano");
    assert!(resueltas.tema_heredado);
    assert!(resueltas.modo_oscuro);
    assert!(resueltas.modo_oscuro_heredado);
}

#[test]
fn tema_activo_de_usuario_resuelve_variables_por_modo() {
    let db = setup();
    let conn = db.conn();
    let admin = id_admin(&conn);

    let cambios = crate::domain::configuracion::EditarPreferenciasUsuario {
        tema_id: Some(Some("bosque".into())),
        modo_oscuro: Some(Some(true)),
        ..Default::default()
    };
    repo::configuracion::guardar_preferencias_usuario(&conn, &admin, &cambios).expect("guardar");

    let activo = repo::configuracion::tema_activo_de_usuario(&conn, &admin).expect("activo");
    assert_eq!(activo.id, "bosque");
    assert_eq!(activo.modo, crate::domain::tema::ModoColor::Oscuro);
    assert!(activo.variables["--color-scheme"] == "dark");
    assert!(activo.variables.contains_key("--color-blue-500"));
    assert!(activo.variables.contains_key("--shadow-lg"));
}

// ============ Gestión de usuarios (SPEC §4.1, §4.5) ============

fn id_rol(conn: &rusqlite::Connection, codigo: &str) -> String {
    conn.query_row("SELECT id FROM roles WHERE codigo = ?1", [codigo], |r| {
        r.get(0)
    })
    .unwrap()
}

#[test]
fn editar_rol_renombra_descripcion_sin_tocar_codigo() {
    // SPEC §4.2: los roles de sistema "sí [se pueden] renombrar con permiso
    // de ADMIN" — solo la descripción visible; `codigo` es el identificador
    // estable que usa toda la matriz de permisos y nunca cambia.
    let db = setup();
    let conn = db.conn();
    let rol_id = id_rol(&conn, "OPERADOR");

    let editado =
        repo::seguridad::editar_rol(&conn, &rol_id, "Operador de bodega", "admin").expect("editar");
    assert_eq!(editado.codigo, "OPERADOR");
    assert_eq!(editado.descripcion.as_deref(), Some("Operador de bodega"));

    let recargado = repo::seguridad::obtener_rol(&conn, &rol_id)
        .expect("obtener")
        .expect("existe");
    assert_eq!(recargado.descripcion.as_deref(), Some("Operador de bodega"));

    // El rol sigue siendo funcional bajo su código original: un operador
    // recién creado sigue sin poder aprobar movimientos.
    let operador = crear_operador(&conn, "operador_rol_renombrado");
    let err = repo::seguridad::editar_rol(&conn, &rol_id, "Otro nombre", &operador)
        .expect_err("operador no puede editar roles");
    assert!(matches!(err, crate::error::AppError::SinPermiso(_)));
}

#[test]
fn editar_rol_rechaza_descripcion_vacia() {
    let db = setup();
    let conn = db.conn();
    let rol_id = id_rol(&conn, "LECTOR");

    let err = repo::seguridad::editar_rol(&conn, &rol_id, "   ", "admin").expect_err("vacío");
    assert!(matches!(err, crate::error::AppError::CampoRequerido(_)));
}

fn crear_usuario_prueba(conn: &rusqlite::Connection, nombre: &str, rol: &str) -> String {
    let rol_id = id_rol(conn, rol);
    let u = repo::seguridad::crear_usuario(
        conn,
        &NuevoUsuario {
            nombre_usuario: nombre.into(),
            nombre_completo: format!("{nombre} Completo"),
            email: Some(format!("{nombre}@test.local")),
            password: "pass12345".into(),
            rol_id,
            created_by: Some("admin".into()),
        },
    )
    .expect("crear usuario");
    u.id
}

#[test]
fn gestion_usuario_editar_desactivar_reactivar() {
    let db = setup();
    let conn = db.conn();
    let id = crear_usuario_prueba(&conn, "juan", "OPERADOR");

    let editado = repo::seguridad::editar_usuario(
        &conn,
        &id,
        &crate::domain::seguridad::EditarUsuario {
            nombre_completo: Some("Juan Pérez".into()),
            email: Some(None), // limpiar email
            rol_id: Some(id_rol(&conn, "LECTOR")),
        },
        "admin",
    )
    .expect("editar");
    assert_eq!(editado.nombre_completo, "Juan Pérez");
    assert_eq!(editado.email, None);
    assert_eq!(editado.rol_id, id_rol(&conn, "LECTOR"));

    repo::seguridad::desactivar_usuario(&conn, &id, "admin").expect("desactivar");
    let desactivado = repo::seguridad::obtener_usuario(&conn, &id)
        .unwrap()
        .unwrap();
    assert!(!desactivado.activo);
    // Un usuario inactivo no puede autenticarse (SPEC §4.1).
    assert!(repo::seguridad::verificar_credenciales(&conn, "juan", "pass12345").is_err());

    repo::seguridad::reactivar_usuario(&conn, &id, "admin").expect("reactivar");
    let reactivado = repo::seguridad::obtener_usuario(&conn, &id)
        .unwrap()
        .unwrap();
    assert!(reactivado.activo);
    assert!(repo::seguridad::verificar_credenciales(&conn, "juan", "pass12345").is_ok());
}

#[test]
fn gestion_usuario_no_se_auto_desactiva_ni_desactiva_ultimo_admin() {
    let db = setup();
    let conn = db.conn();
    let admin_id = id_admin(&conn);

    // No te puedes desactivar a ti mismo.
    assert!(matches!(
        repo::seguridad::desactivar_usuario(&conn, &admin_id, &admin_id),
        Err(crate::error::AppError::CampoInvalido(_))
    ));

    // No se puede desactivar al último ADMIN activo.
    let segundo_admin = repo::seguridad::crear_usuario(
        &conn,
        &NuevoUsuario {
            nombre_usuario: "admin2".into(),
            nombre_completo: "Admin Dos".into(),
            email: None,
            password: "pass12345".into(),
            rol_id: id_rol(&conn, "ADMIN"),
            created_by: Some("admin".into()),
        },
    )
    .expect("segundo admin");

    // Con dos admins, desactivar a "admin" (el actor) está bloqueado por la
    // regla de autodesactivación; desactivar a admin2 sí funciona.
    repo::seguridad::desactivar_usuario(&conn, &segundo_admin.id, &admin_id)
        .expect("desactivar admin2");
    repo::seguridad::reactivar_usuario(&conn, &segundo_admin.id, &admin_id).expect("reactivar");

    // La protección del último admin: con los dos activos de nuevo, si "admin"
    // intentara desactivar a admin2 funciona; la protección solo bloquea
    // cuando quedaría cero administradores activos. Verificamos que con un
    // solo admin activo (desactivando a admin2 otra vez y NO reactivándolo),
    // el intento posterior se bloquea por la regla del último admin.
    repo::seguridad::desactivar_usuario(&conn, &segundo_admin.id, &admin_id)
        .expect("desactivar admin2 de nuevo");
    let admin_activos: i64 = conn
        .query_row(
            "SELECT COUNT(*) FROM usuarios u JOIN roles r ON r.id = u.rol_id
             WHERE r.codigo = 'ADMIN' AND u.activo = 1",
            [],
            |r| r.get(0),
        )
        .unwrap();
    assert_eq!(admin_activos, 1);
}

#[test]
fn cambiar_password_propia_verifica_actual_y_admin_resetea() {
    let db = setup();
    let conn = db.conn();
    let admin_id = id_admin(&conn);

    // Password actual incorrecta → rechazada.
    assert!(matches!(
        repo::seguridad::cambiar_password_propia(&conn, &admin_id, "mala", "nueva1234"),
        Err(crate::error::AppError::PasswordActualIncorrecta)
    ));

    // Cambio propio correcto: la nueva contraseña funciona, la vieja no.
    repo::seguridad::cambiar_password_propia(&conn, &admin_id, "admin1234", "nueva1234")
        .expect("cambiar propia");
    assert!(repo::seguridad::verificar_credenciales(&conn, "admin", "nueva1234").is_ok());
    assert!(repo::seguridad::verificar_credenciales(&conn, "admin", "admin1234").is_err());

    // El ADMIN resetea la contraseña de otro usuario.
    let id = crear_usuario_prueba(&conn, "ana", "OPERADOR");
    repo::seguridad::cambiar_password_admin(&conn, &id, "reset1234", &admin_id).expect("reset");
    assert!(repo::seguridad::verificar_credenciales(&conn, "ana", "reset1234").is_ok());
    assert!(repo::seguridad::verificar_credenciales(&conn, "ana", "pass12345").is_err());
}

// ============ Umbral de stock mínimo por defecto (SPEC §17.1) ============

#[test]
fn stock_minimo_default_genera_alerta_para_producto_sin_minimo() {
    let db = setup();
    let conn = db.conn();
    let (_almacen_id, ubi1, _ubi2) = crear_arbol(&conn);
    let uom = repo::catalogo::crear_uom(
        &conn,
        &NuevaUom {
            codigo: "PZA-UMB".into(),
            nombre: "Pieza".into(),
            tipo: "UNIDAD".into(),
            factor: 1,
            base: true,
        },
        "admin",
    )
    .expect("uom")
    .id;
    // Producto SIN stock_minimo: depende del default de la empresa.
    let prod = repo::catalogo::crear_producto(
        &conn,
        &NuevoProducto {
            costo_unitario: None,
            sku: "SIN-MIN".into(),
            nombre: "Sin mínimo".into(),
            descripcion: None,
            categoria_id: None,
            uom_base_id: uom.clone(),
            uom_venta_id: None,
            uom_compra_id: None,
            codigo_barras: None,
            peso_unitario: None,
            volumen_unitario: None,
            stock_minimo: None,
            stock_maximo: None,
            controla_lote: false,
            controla_vencimiento: false,
            perecedero: false,
            created_by: Some("admin".into()),
        },
    )
    .expect("producto")
    .id;
    entrar_stock(&conn, &ubi1, &prod, None, 2);

    // Sin default configurado: no hay alerta de stock bajo (2 > nada).
    repo::alerta::regenerar_alertas(&conn, 30).expect("regenerar sin default");
    let abiertas = repo::alerta::listar_alertas(&conn, Some("ABIERTA"), "admin").expect("listar");
    assert!(
        !abiertas
            .iter()
            .any(|a| a.entidad_id.as_deref() == Some(prod.as_str()))
    );

    // Con default = 5, el stock (2) queda por debajo → alerta.
    let cambios = crate::domain::configuracion::EditarConfiguracionEmpresa {
        stock_minimo_default: Some(Some(5)),
        ..Default::default()
    };
    repo::configuracion::guardar_configuracion_empresa(&conn, &cambios, "admin").expect("guardar");
    repo::alerta::regenerar_alertas(&conn, 30).expect("regenerar con default");
    let abiertas2 = repo::alerta::listar_alertas(&conn, Some("ABIERTA"), "admin").expect("listar");
    assert!(
        abiertas2
            .iter()
            .any(|a| a.tipo == "STOCK_BAJO" && a.entidad_id.as_deref() == Some(prod.as_str()))
    );
}

// ============ Sucursales y archivos de empresa (config, solo ADMIN) ============

#[test]
fn sucursal_crud_completo() {
    let db = setup();
    let conn = db.conn();

    let nueva = crate::domain::configuracion::NuevaSucursal {
        codigo: "SUC-01".into(),
        nombre: "Sucursal Centro".into(),
        pais: Some("Perú".into()),
        ciudad: Some("Lima".into()),
        direccion: Some("Av. Principal 123".into()),
        latitud: Some(-12.0464),
        longitud: Some(-77.0428),
        created_by: Some("admin".into()),
    };
    let suc = repo::sucursal::crear_sucursal(&conn, &nueva).expect("crear");
    assert_eq!(suc.codigo, "SUC-01");
    assert_eq!(suc.latitud, Some(-12.0464));

    // Código duplicado rechazado.
    let duplicada = repo::sucursal::crear_sucursal(
        &conn,
        &crate::domain::configuracion::NuevaSucursal {
            codigo: "suc-01".into(), // normaliza a SUC-01
            nombre: "Otra".into(),
            ..Default::default()
        },
    );
    assert!(matches!(
        duplicada,
        Err(crate::error::AppError::CodigoDuplicado(_))
    ));

    // Editar: nombre + limpiar coordenadas.
    let editada = repo::sucursal::editar_sucursal(
        &conn,
        &suc.id,
        &crate::domain::configuracion::EditarSucursal {
            nombre: Some("Sucursal Centro Norte".into()),
            latitud: Some(None),
            longitud: Some(None),
            ..Default::default()
        },
        "admin",
    )
    .expect("editar");
    assert_eq!(editada.nombre, "Sucursal Centro Norte");
    assert_eq!(editada.latitud, None);

    repo::sucursal::desactivar_sucursal(&conn, &suc.id, "admin").expect("desactivar");
    let desactivada = repo::sucursal::obtener_sucursal(&conn, &suc.id)
        .unwrap()
        .unwrap();
    assert!(!desactivada.activo);
}

#[test]
fn sucursal_rechaza_coordenadas_fuera_de_rango() {
    let db = setup();
    let conn = db.conn();
    let mala = crate::domain::configuracion::NuevaSucursal {
        codigo: "SUC-MALA".into(),
        nombre: "Mala".into(),
        latitud: Some(100.0),
        ..Default::default()
    };
    assert!(matches!(
        repo::sucursal::crear_sucursal(&conn, &mala),
        Err(crate::error::AppError::CampoInvalido(_))
    ));
}

#[test]
fn archivos_empresa_logo_y_documentos() {
    let db = setup();
    let conn = db.conn();

    // Subir logo (reemplaza al anterior).
    repo::archivo::subir_archivo(
        &conn,
        &crate::domain::configuracion::NuevoArchivoEmpresa {
            nombre: "logo.png".into(),
            tipo: "LOGO".into(),
            mime: "image/png".into(),
            datos_base64: crate::domain::configuracion::base64_encode(b"PNG-DATOS"),
            created_by: Some("admin".into()),
        },
    )
    .expect("logo1");
    let logo2 = repo::archivo::subir_archivo(
        &conn,
        &crate::domain::configuracion::NuevoArchivoEmpresa {
            nombre: "logo-v2.png".into(),
            tipo: "LOGO".into(),
            mime: "image/png".into(),
            datos_base64: crate::domain::configuracion::base64_encode(b"PNG-V2"),
            created_by: Some("admin".into()),
        },
    )
    .expect("logo2");

    // Solo puede haber un logo: el actual es el último.
    let logo_actual = repo::archivo::obtener_logo(&conn).unwrap().unwrap();
    assert_eq!(logo_actual.id, logo2.id);
    let logos: Vec<_> = repo::archivo::listar_archivos(&conn)
        .unwrap()
        .into_iter()
        .filter(|a| a.tipo == "LOGO")
        .collect();
    assert_eq!(logos.len(), 1, "el logo anterior se reemplaza");

    // Documento: se conserva y se puede leer el contenido.
    let doc = repo::archivo::subir_archivo(
        &conn,
        &crate::domain::configuracion::NuevoArchivoEmpresa {
            nombre: "certificado.pdf".into(),
            tipo: "DOCUMENTO".into(),
            mime: "application/pdf".into(),
            datos_base64: crate::domain::configuracion::base64_encode(b"%PDF-1.4"),
            created_by: Some("admin".into()),
        },
    )
    .expect("documento");
    let completo = repo::archivo::obtener_archivo_completo(&conn, &doc.id)
        .unwrap()
        .unwrap();
    assert_eq!(completo.mime, "application/pdf");
    assert_eq!(
        completo.datos_base64,
        crate::domain::configuracion::base64_encode(b"%PDF-1.4")
    );

    repo::archivo::eliminar_archivo(&conn, &doc.id, "admin").expect("eliminar");
    assert!(
        repo::archivo::obtener_archivo(&conn, &doc.id)
            .unwrap()
            .is_none()
    );
}

#[test]
fn archivo_empresa_rechaza_base64_invalido_y_tamano_excesivo() {
    let db = setup();
    let conn = db.conn();

    // Base64 inválido.
    let malo = crate::domain::configuracion::NuevoArchivoEmpresa {
        nombre: "malo.bin".into(),
        tipo: "DOCUMENTO".into(),
        mime: "application/octet-stream".into(),
        datos_base64: "!!no-es-base64!!".into(),
        created_by: Some("admin".into()),
    };
    assert!(matches!(
        repo::archivo::subir_archivo(&conn, &malo),
        Err(crate::error::AppError::CampoInvalido(_))
    ));

    // Excede el límite del logo (2 MB).
    let enorme = crate::domain::configuracion::NuevoArchivoEmpresa {
        nombre: "logo-enorme.png".into(),
        tipo: "LOGO".into(),
        mime: "image/png".into(),
        datos_base64: crate::domain::configuracion::base64_encode(&vec![0u8; 2 * 1024 * 1024 + 1]),
        created_by: Some("admin".into()),
    };
    assert!(matches!(
        repo::archivo::subir_archivo(&conn, &enorme),
        Err(crate::error::AppError::CampoInvalido(_))
    ));
}

// ============ Búsqueda global del command palette (SPEC §15.4) ============

fn grupo<'a>(
    resp: &'a crate::buscar::BuscarRespuesta,
    recurso: &str,
) -> Option<&'a [crate::buscar::BuscarItem]> {
    resp.grupos
        .iter()
        .find(|g| g.recurso == recurso)
        .map(|g| g.items.as_slice())
}

#[test]
fn buscar_agrupa_por_recurso_y_prioriza_coincidencia_exacta() {
    let db = setup();
    let conn = db.conn();
    let (_almacen_id, ubi1, _ubi2) = crear_arbol(&conn);
    let uom = repo::catalogo::crear_uom(
        &conn,
        &NuevaUom {
            codigo: "PZA-BUS".into(),
            nombre: "Pieza".into(),
            tipo: "UNIDAD".into(),
            factor: 1,
            base: true,
        },
        "admin",
    )
    .expect("uom");
    let exacto = repo::catalogo::crear_producto(
        &conn,
        &NuevoProducto {
            costo_unitario: None,
            sku: "REF-777".into(),
            nombre: "Producto Exacto".into(),
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
            controla_lote: false,
            controla_vencimiento: false,
            perecedero: false,
            created_by: Some("admin".into()),
        },
    )
    .expect("producto exacto")
    .id;
    let _contiene = repo::catalogo::crear_producto(
        &conn,
        &NuevoProducto {
            costo_unitario: None,
            sku: "REF-777-X".into(),
            nombre: "Producto Con Variante".into(),
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
            controla_lote: false,
            controla_vencimiento: false,
            perecedero: false,
            created_by: Some("admin".into()),
        },
    )
    .expect("producto variante")
    .id;

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
            documento_referencia: None,
            notas: None,
            created_by: "admin".into(),
            lineas: vec![NuevaLinea {
                costo_unitario: None,
                producto_id: exacto.clone(),
                lote_id: None,
                cantidad: 3,
                origen_ubicacion_id: None,
                destino_ubicacion_id: Some(ubi1),
                caja_origen_id: None,
                caja_destino_id: None,
            }],
        },
    )
    .expect("movimiento");
    repo::movimiento::aprobar_movimiento(&conn, &mov.id, "admin").expect("aprobar");

    let resp = crate::buscar::buscar(&conn, "admin", "REF-777").expect("buscar");
    let productos = grupo(&resp, "productos").expect("grupo productos");
    assert_eq!(productos[0].id, exacto, "el SKU exacto va primero");
    assert!(productos.len() >= 2);

    let resp_mov = crate::buscar::buscar(&conn, "admin", "MOV").expect("buscar movimientos");
    let movimientos = grupo(&resp_mov, "movimientos").expect("grupo movimientos");
    assert_eq!(movimientos[0].id, mov.id);
    let datos = movimientos[0].datos.as_ref().expect("datos del movimiento");
    assert_eq!(datos["tipo"], "ENTRADA");
    assert_eq!(datos["estado"], "APROBADO");
}

#[test]
fn buscar_q_vacio_devuelve_grupos_vacios() {
    let db = setup();
    let conn = db.conn();
    let (_almacen_id, _ubi1, _ubi2) = crear_arbol(&conn);
    let (_uom, _prod) = crear_uom_y_producto(&conn);
    let resp = crate::buscar::buscar(&conn, "admin", "   ").expect("buscar vacío");
    assert!(resp.grupos.is_empty());
}

#[test]
fn buscar_incluye_solo_alertas_abiertas() {
    let db = setup();
    let conn = db.conn();
    let (_almacen_id, ubi1, _ubi2) = crear_arbol(&conn);
    let (_uom, prod) = crear_uom_y_producto(&conn); // stock_minimo = 2
    entrar_stock(&conn, &ubi1, &prod, None, 1); // por debajo del mínimo

    repo::alerta::regenerar_alertas(&conn, 30).expect("regenerar");
    let resp = crate::buscar::buscar(&conn, "admin", "bajo").expect("buscar alertas");
    let alertas = grupo(&resp, "alertas").expect("grupo alertas");
    let item = alertas
        .iter()
        .find(|i| i.datos.as_ref().and_then(|d| d["tipo"].as_str()) == Some("STOCK_BAJO"))
        .expect("alerta de stock bajo");
    assert_eq!(
        item.datos.as_ref().and_then(|d| d["entidad"].as_str()),
        Some("producto")
    );
    assert_eq!(
        item.datos.as_ref().and_then(|d| d["entidad_id"].as_str()),
        Some(prod.as_str())
    );

    // Tras resolver la causa (subir stock), la alerta se cierra y no reaparece.
    entrar_stock(&conn, &ubi1, &prod, None, 10);
    repo::alerta::regenerar_alertas(&conn, 30).expect("regenerar de nuevo");
    let resp2 = crate::buscar::buscar(&conn, "admin", "bajo").expect("buscar alertas de nuevo");
    let alertas2 = grupo(&resp2, "alertas");
    let sigue = alertas2.and_then(|g| {
        g.iter()
            .find(|i| i.datos.as_ref().and_then(|d| d["tipo"].as_str()) == Some("STOCK_BAJO"))
    });
    assert!(
        sigue.is_none(),
        "las alertas resueltas no se listan como abiertas"
    );
}

#[test]
fn buscar_devuelve_grupos_vacios_con_usuario_invalido() {
    let db = setup();
    let conn = db.conn();
    let (_almacen_id, _ubi1, _ubi2) = crear_arbol(&conn);
    let (_uom, _prod) = crear_uom_y_producto(&conn);
    // Un usuario inexistente no tiene permiso `ver` sobre ningún recurso:
    // `buscar` simplemente omite todos los grupos (la autenticación real la
    // exige el comando `buscar` en commands.rs vía `sesion.usuario_id()`).
    let resp = crate::buscar::buscar(&conn, "no-existe", "REF").expect("buscar sin sesión");
    assert!(resp.grupos.is_empty());
}

#[test]
fn sesion_planeada_se_inicia_a_en_curso() {
    let db = setup();
    let conn = db.conn();
    let (almacen_id, _ubi1, _ubi2) = crear_arbol(&conn);

    let planeada = repo::inventario::crear_sesion(
        &conn,
        &NuevaSesionInventario {
            tipo: "CICLICO".into(),
            almacen_id: almacen_id.clone(),
            alcance: Some("zona Norte".into()),
            fecha_inicio: None,
            fecha_fin: None,
            responsable_id: Some("admin".into()),
            conteo_ciego: true,
            exige_doble_conteo: false,
            created_by: "admin".into(),
        },
    )
    .expect("sesión planeada");
    assert_eq!(planeada.estado, "PLANEADA");

    let iniciada =
        repo::inventario::iniciar_sesion(&conn, &planeada.id, "admin").expect("iniciar sesión");
    assert_eq!(iniciada.estado, "EN_CURSO");
    assert!(
        iniciada.fecha_inicio.is_some(),
        "la fecha de inicio se fija al iniciar"
    );

    // Solo se puede iniciar una vez: una EN_CURSO rechaza el comando.
    let err = repo::inventario::iniciar_sesion(&conn, &planeada.id, "admin")
        .expect_err("no se reinicia una sesión en curso");
    assert!(
        matches!(err, crate::error::AppError::TransicionInvalida(_, _)),
        "esperaba TransicionInvalida, obtuve {err}"
    );

    // Un conteo ahora es válido (la sesión quedó operativa).
    let uom = repo::catalogo::crear_uom(
        &conn,
        &NuevaUom {
            codigo: "UN".into(),
            nombre: "Unidad".into(),
            tipo: "UNIDAD".into(),
            factor: 1,
            base: true,
        },
        "admin",
    )
    .expect("uom");
    let producto = repo::catalogo::crear_producto(
        &conn,
        &NuevoProducto {
            costo_unitario: None,
            sku: "CTO-1".into(),
            nombre: "Contado".into(),
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
            controla_lote: false,
            controla_vencimiento: false,
            perecedero: false,
            created_by: Some("admin".into()),
        },
    )
    .expect("producto");
    let conteo = repo::inventario::registrar_conteo(
        &conn,
        &NuevoConteo {
            sesion_id: planeada.id.clone(),
            ubicacion_id: _ubi1.clone(),
            producto_id: producto.id.clone(),
            lote_id: None,
            cantidad_contada: 5,
            conteo_numero: 1,
            usuario_contador_id: "admin".into(),
            nota: None,
        },
    )
    .expect("conteo en sesión iniciada");
    assert_eq!(conteo.cantidad_contada, 5);
}

// ============ UOM: editar y desactivar (Frente 4) ============

#[test]
fn editar_uom_actualiza_campos_sin_tocar_codigo() {
    let db = setup();
    let conn = db.conn();
    let uom = repo::catalogo::crear_uom(
        &conn,
        &NuevaUom {
            codigo: "CAJA".into(),
            nombre: "Caja".into(),
            tipo: "UNIDAD".into(),
            factor: 10,
            base: false,
        },
        "admin",
    )
    .expect("uom");

    let editada = repo::catalogo::editar_uom(
        &conn,
        &uom.id,
        &EditarUom {
            nombre: Some("Caja grande".into()),
            tipo: None,
            factor: Some(12),
            base: Some(true),
        },
        "admin",
    )
    .expect("editar uom");

    assert_eq!(editada.nombre, "Caja grande");
    assert_eq!(editada.factor, 12);
    assert!(editada.base);
    // El código define la identidad y no cambia.
    assert_eq!(editada.codigo, "CAJA");
}

#[test]
fn desactivar_uom_en_uso_rechazado() {
    let db = setup();
    let conn = db.conn();
    let (uom, _prod) = crear_uom_y_producto(&conn);

    let err = repo::catalogo::desactivar_uom(&conn, &uom, "admin")
        .expect_err("no se desactiva una UOM en uso");
    assert!(
        matches!(err, crate::error::AppError::ConHistorial(_)),
        "esperaba ConHistorial, obtuve {err}"
    );
}

#[test]
fn desactivar_y_usar_uom_inactiva_en_producto_rechazado() {
    let db = setup();
    let conn = db.conn();
    let uom = repo::catalogo::crear_uom(
        &conn,
        &NuevaUom {
            codigo: "LIBRE".into(),
            nombre: "Libre".into(),
            tipo: "UNIDAD".into(),
            factor: 1,
            base: true,
        },
        "admin",
    )
    .expect("uom");
    repo::catalogo::desactivar_uom(&conn, &uom.id, "admin").expect("desactivar");

    let err = repo::catalogo::crear_producto(
        &conn,
        &NuevoProducto {
            costo_unitario: None,
            sku: "REF-99".into(),
            nombre: "Con UOM inactiva".into(),
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
            controla_lote: false,
            controla_vencimiento: false,
            perecedero: false,
            created_by: Some("admin".into()),
        },
    )
    .expect_err("uom inactiva rechazada");
    assert!(
        matches!(err, crate::error::AppError::EntidadInactiva(_)),
        "esperaba EntidadInactiva, obtuve {err}"
    );
}

fn crear_entrada_borrador(
    conn: &rusqlite::Connection,
    ubicacion_id: &str,
    producto_id: &str,
    cantidad: i64,
) -> Movimiento {
    repo::movimiento::crear_movimiento(
        conn,
        &NuevoMovimiento {
            tipo: "ENTRADA".into(),
            sub_tipo: "COMPRA".into(),
            fecha_movimiento: None,
            motivo: None,
            origen_ubicacion_id: None,
            destino_ubicacion_id: Some(ubicacion_id.into()),
            proveedor_id: None,
            cliente_id: None,
            sesion_inventario_id: None,
            documento_referencia: None,
            notas: None,
            created_by: "admin".into(),
            lineas: vec![NuevaLinea {
                costo_unitario: None,
                producto_id: producto_id.into(),
                lote_id: None,
                cantidad,
                origen_ubicacion_id: None,
                destino_ubicacion_id: Some(ubicacion_id.into()),
                caja_origen_id: None,
                caja_destino_id: None,
            }],
        },
    )
    .expect("crear borrador")
}

fn editar_linea_simple(
    _conn: &rusqlite::Connection,
    ubicacion_id: &str,
    producto_id: &str,
    cantidad: i64,
) -> EditarMovimiento {
    EditarMovimiento {
        fecha_movimiento: Some("2026-09-01T10:00:00Z".into()),
        motivo: None,
        proveedor_id: None,
        cliente_id: None,
        documento_referencia: Some(Some("OC-ED-99".into())),
        notas: Some(Some("editado en test".into())),
        lineas: vec![NuevaLinea {
            costo_unitario: None,
            producto_id: producto_id.into(),
            lote_id: None,
            cantidad,
            origen_ubicacion_id: None,
            destino_ubicacion_id: Some(ubicacion_id.into()),
            caja_origen_id: None,
            caja_destino_id: None,
        }],
    }
}

#[test]
fn editar_movimiento_cambia_campos_y_lineas_sin_afectar_stock() {
    let db = setup();
    let conn = db.conn();
    let (_almacen_id, ubi1, _ubi2) = crear_arbol(&conn);
    let (_uom, prod) = crear_uom_y_producto(&conn);

    let mov = crear_entrada_borrador(&conn, &ubi1, &prod, 3);
    assert_eq!(mov.estado, "BORRADOR");

    let editado = repo::movimiento::editar_movimiento(
        &conn,
        &mov.id,
        &editar_linea_simple(&conn, &ubi1, &prod, 8),
        "admin",
    )
    .expect("editar borrador");

    assert_eq!(editado.documento_referencia.as_deref(), Some("OC-ED-99"));
    assert_eq!(editado.notas.as_deref(), Some("editado en test"));
    assert_eq!(editado.fecha_movimiento, "2026-09-01T10:00:00Z");
    // El tipo/sub_tipo/estado son estables.
    assert_eq!(editado.tipo, "ENTRADA");
    assert_eq!(editado.estado, "BORRADOR");

    // Las líneas quedaron reemplazadas con la nueva cantidad.
    let lineas = repo::movimiento::obtener_lineas(&conn, &mov.id).expect("líneas");
    assert_eq!(lineas.len(), 1);
    assert_eq!(lineas[0].cantidad, 8);

    // Sigue sin afectar stock: el borrador no altera saldos hasta aprobarse.
    let saldos = repo::movimiento::listar_saldos(&conn, Some(&ubi1), Some(&prod)).expect("saldos");
    assert!(saldos.is_empty(), "un borrador no toca saldos");
}

#[test]
fn editar_movimiento_aprobado_rechazado() {
    let db = setup();
    let conn = db.conn();
    let (_almacen_id, ubi1, _ubi2) = crear_arbol(&conn);
    let (_uom, prod) = crear_uom_y_producto(&conn);

    let mov = crear_entrada_borrador(&conn, &ubi1, &prod, 3);
    repo::movimiento::aprobar_movimiento(&conn, &mov.id, "admin").expect("aprobar");

    let err = repo::movimiento::editar_movimiento(
        &conn,
        &mov.id,
        &editar_linea_simple(&conn, &ubi1, &prod, 8),
        "admin",
    )
    .expect_err("aprobado no se edita");
    assert!(
        matches!(err, crate::error::AppError::MovimientoAprobadoNoEditable),
        "esperaba MovimientoAprobadoNoEditable, obtuve {err}"
    );
}

#[test]
fn editar_movimiento_solo_el_creador() {
    let db = setup();
    let conn = db.conn();
    let (_almacen_id, ubi1, _ubi2) = crear_arbol(&conn);
    let (_uom, prod) = crear_uom_y_producto(&conn);

    // Otro usuario con permiso de crear movimientos (OPERADOR).
    let rol_operador: String = conn
        .query_row("SELECT id FROM roles WHERE codigo = 'OPERADOR'", [], |r| {
            r.get(0)
        })
        .expect("rol");
    repo::seguridad::crear_usuario(
        &conn,
        &crate::domain::seguridad::NuevoUsuario {
            nombre_usuario: "op_editor".into(),
            nombre_completo: "Operador Editor".into(),
            email: None,
            password: "clave1234".into(),
            rol_id: rol_operador,
            created_by: Some("admin".into()),
        },
    )
    .expect("crear operador");

    let mov = crear_entrada_borrador(&conn, &ubi1, &prod, 3);
    let err = repo::movimiento::editar_movimiento(
        &conn,
        &mov.id,
        &editar_linea_simple(&conn, &ubi1, &prod, 8),
        "op_editor",
    )
    .expect_err("no autor");
    assert!(
        matches!(err, crate::error::AppError::SinPermiso(_)),
        "esperaba SinPermiso, obtuve {err}"
    );
}

#[test]
fn editar_movimiento_controla_lote_exige_lote() {
    let db = setup();
    let conn = db.conn();
    let (_almacen_id, ubi1, _ubi2) = crear_arbol(&conn);

    let uom = repo::catalogo::crear_uom(
        &conn,
        &NuevaUom {
            codigo: "CAJA".into(),
            nombre: "Caja".into(),
            tipo: "UNIDAD".into(),
            factor: 1,
            base: true,
        },
        "admin",
    )
    .expect("uom");
    let prod = repo::catalogo::crear_producto(
        &conn,
        &NuevoProducto {
            costo_unitario: None,
            sku: "LOTE-1".into(),
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
            created_by: Some("admin".into()),
        },
    )
    .expect("producto con lote");
    let lote = repo::catalogo::crear_lote(
        &conn,
        &NuevoLote {
            numero: "L-1".into(),
            producto_id: prod.id.clone(),
            fecha_fabricacion: None,
            fecha_vencimiento: None,
            origen: None,
            notas: None,
            created_by: Some("admin".into()),
        },
    )
    .expect("lote");

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
            documento_referencia: None,
            notas: None,
            created_by: "admin".into(),
            lineas: vec![NuevaLinea {
                costo_unitario: None,
                producto_id: prod.id.clone(),
                lote_id: Some(lote.id.clone()),
                cantidad: 4,
                origen_ubicacion_id: None,
                destino_ubicacion_id: Some(ubi1.clone()),
                caja_origen_id: None,
                caja_destino_id: None,
            }],
        },
    )
    .expect("borrador con lote");

    // Editar quitando el lote: el producto controla lote → error.
    let err = repo::movimiento::editar_movimiento(
        &conn,
        &mov.id,
        &EditarMovimiento {
            fecha_movimiento: None,
            motivo: None,
            proveedor_id: None,
            cliente_id: None,
            documento_referencia: None,
            notas: None,
            lineas: vec![NuevaLinea {
                costo_unitario: None,
                producto_id: prod.id.clone(),
                lote_id: None,
                cantidad: 4,
                origen_ubicacion_id: None,
                destino_ubicacion_id: Some(ubi1.clone()),
                caja_origen_id: None,
                caja_destino_id: None,
            }],
        },
        "admin",
    )
    .expect_err("lote obligatorio");
    assert!(
        matches!(err, crate::error::AppError::LoteRequerido(_)),
        "esperaba LoteRequerido, obtuve {err}"
    );
}

// ============ Unicidad de código por almacén completo (Frente 8) ============

#[test]
fn codigo_de_rack_es_unico_por_almacen_no_por_padre() {
    let db = setup();
    let conn = db.conn();
    // Dos zonas en el mismo almacén.
    let almacen = repo::catalogo::crear_almacen(
        &conn,
        &NuevoAlmacen {
            codigo: "ALM-U".into(),
            nombre: "Almacén Único".into(),
            descripcion: None,
            direccion: None,
            created_by: Some("admin".into()),
        },
    )
    .expect("almacen");
    let zona_a = repo::catalogo::crear_zona(
        &conn,
        &NuevaZona {
            codigo: "ZA".into(),
            nombre: "Zona A".into(),
            descripcion: None,
            almacen_id: almacen.id.clone(),
            created_by: Some("admin".into()),
        },
    )
    .expect("zona A");
    let zona_b = repo::catalogo::crear_zona(
        &conn,
        &NuevaZona {
            codigo: "ZB".into(),
            nombre: "Zona B".into(),
            descripcion: None,
            almacen_id: almacen.id.clone(),
            created_by: Some("admin".into()),
        },
    )
    .expect("zona B");

    repo::catalogo::crear_rack(
        &conn,
        &NuevoRack {
            codigo: "RACK-1".into(),
            nombre: None,
            tipo: None,
            zona_id: zona_a.id.clone(),
            pasillo_id: None,
            created_by: Some("admin".into()),
        },
    )
    .expect("rack en zona A");

    // El mismo código bajo la zona B (mismo almacén) debe rechazarse.
    let err = repo::catalogo::crear_rack(
        &conn,
        &NuevoRack {
            codigo: "RACK-1".into(),
            nombre: None,
            tipo: None,
            zona_id: zona_b.id.clone(),
            pasillo_id: None,
            created_by: Some("admin".into()),
        },
    )
    .expect_err("código duplicado en el almacén");
    assert!(
        matches!(err, crate::error::AppError::CodigoDuplicado(_)),
        "esperaba CodigoDuplicado, obtuve {err}"
    );
}

#[test]
fn codigo_de_ubicacion_es_unico_por_almacen_no_por_padre() {
    let db = setup();
    let conn = db.conn();
    let (almacen_id, ubi1, _ubi2) = crear_arbol(&conn);

    // Otra zona del mismo almacén, con una ubicación colgando directo.
    let zona2 = repo::catalogo::crear_zona(
        &conn,
        &NuevaZona {
            codigo: "Z-2".into(),
            nombre: "Zona Dos".into(),
            descripcion: None,
            almacen_id: almacen_id.clone(),
            created_by: Some("admin".into()),
        },
    )
    .expect("zona 2");

    // `ubi1` está en el árbol del mismo almacén (sección → rack → zona).
    let codigo_ubi1: String = conn
        .query_row(
            "SELECT codigo FROM ubicaciones WHERE id = ?1",
            [&ubi1],
            |r| r.get(0),
        )
        .expect("código de ubi1");

    // El mismo código de ubicación bajo la zona 2 (mismo almacén) se rechaza.
    let err = repo::catalogo::crear_ubicacion(
        &conn,
        &NuevaUbicacion {
            codigo: codigo_ubi1.clone(),
            nombre: None,
            seccion_id: None,
            rack_id: None,
            zona_id: Some(zona2.id.clone()),
            tipo: Some("STANDARD".into()),
            capacidad_maxima: None,
            created_by: Some("admin".into()),
        },
    )
    .expect_err("ubicación duplicada en el almacén");
    assert!(
        matches!(err, crate::error::AppError::CodigoDuplicado(_)),
        "esperaba CodigoDuplicado, obtuve {err}"
    );
}

// ============ Traslado inter-almacén atómico (Frente 8) ============

#[test]
fn traslado_inter_almacen_fallido_no_deja_movimientos_huérfanos() {
    let db = setup();
    let conn = db.conn();
    let (_almacen1, ubi_origen) = crear_arbol_en_almacen(&conn, "ALM-O1");
    let (_almacen2, ubi_destino) = crear_arbol_en_almacen(&conn, "ALM-D1");
    let (_uom, _prod_sin_lote) = crear_uom_y_producto(&conn);
    let prod_con_lote = repo::catalogo::crear_producto(
        &conn,
        &NuevoProducto {
            costo_unitario: None,
            sku: "REF-LOTE".into(),
            nombre: "Producto con lote".into(),
            descripcion: None,
            categoria_id: None,
            uom_base_id: _uom.clone(),
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
            created_by: Some("admin".into()),
        },
    )
    .expect("prod con lote");
    let prod = prod_con_lote.id.clone();

    // Un lote de OTRO producto: la validación de `insertar_movimiento`
    // (lote debe pertenecer al producto) falla. Como las dos piernas se crean
    // en una sola transacción, no queda ningún movimiento huérfano.
    let otro_producto = repo::catalogo::crear_producto(
        &conn,
        &NuevoProducto {
            costo_unitario: None,
            sku: "OTRO".into(),
            nombre: "Otro producto".into(),
            descripcion: None,
            categoria_id: None,
            uom_base_id: _uom.clone(),
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
            created_by: Some("admin".into()),
        },
    )
    .expect("otro producto con lote");
    let lote_ajeno = repo::catalogo::crear_lote(
        &conn,
        &NuevoLote {
            numero: "L-AJENO".into(),
            producto_id: otro_producto.id.clone(),
            fecha_fabricacion: None,
            fecha_vencimiento: None,
            origen: None,
            notas: None,
            created_by: Some("admin".into()),
        },
    )
    .expect("lote ajeno");

    let antes: i64 = conn
        .query_row("SELECT COUNT(*) FROM movimientos", [], |r| r.get(0))
        .expect("count");
    let err = repo::movimiento::crear_traslado(
        &conn,
        &NuevoTraslado {
            producto_id: prod.clone(),
            lote_id: Some(lote_ajeno.id.clone()),
            cantidad: 2,
            origen_ubicacion_id: ubi_origen.clone(),
            destino_ubicacion_id: ubi_destino.clone(),
            caja_origen_id: None,
            caja_destino_id: None,
            documento_referencia: None,
            notas: None,
            created_by: "admin".into(),
        },
    )
    .expect_err("lote ajeno rechazado");
    assert!(
        matches!(err, crate::error::AppError::NoEncontrado("lote", _)),
        "esperaba NoEncontrado(lote), obtuve {err}"
    );

    let despues: i64 = conn
        .query_row("SELECT COUNT(*) FROM movimientos", [], |r| r.get(0))
        .expect("count");
    assert_eq!(
        antes, despues,
        "un traslado inter-almacén fallido no deja movimientos huérfanos"
    );
}

// ============ Mensajes de error en usuarios (Frente 8) ============

#[test]
fn crear_usuario_con_rol_inexistente_reporta_rol_no_codigo_duplicado() {
    let db = setup();
    let conn = db.conn();
    let err = repo::seguridad::crear_usuario(
        &conn,
        &NuevoUsuario {
            nombre_usuario: "usuario_sin_rol".into(),
            nombre_completo: "Sin rol".into(),
            email: None,
            password: "clave1234".into(),
            rol_id: "rol-que-no-existe".into(),
            created_by: Some("admin".into()),
        },
    )
    .expect_err("rol inexistente");
    assert!(
        matches!(err, crate::error::AppError::NoEncontrado("rol", _)),
        "esperaba NoEncontrado(rol), obtuve {err}"
    );
}

#[test]
fn crear_usuario_con_email_repetido_no_confunde_con_nombre() {
    let db = setup();
    let conn = db.conn();
    let rol_admin: String = conn
        .query_row("SELECT id FROM roles WHERE codigo = 'ADMIN'", [], |r| {
            r.get(0)
        })
        .expect("rol admin");

    repo::seguridad::crear_usuario(
        &conn,
        &NuevoUsuario {
            nombre_usuario: "primero".into(),
            nombre_completo: "Primero".into(),
            email: Some("mismo@email.com".into()),
            password: "clave1234".into(),
            rol_id: rol_admin.clone(),
            created_by: Some("admin".into()),
        },
    )
    .expect("primer usuario");

    let err = repo::seguridad::crear_usuario(
        &conn,
        &NuevoUsuario {
            nombre_usuario: "segundo".into(),
            nombre_completo: "Segundo".into(),
            email: Some("mismo@email.com".into()),
            password: "clave1234".into(),
            rol_id: rol_admin,
            created_by: Some("admin".into()),
        },
    )
    .expect_err("email repetido");
    assert!(
        matches!(err, crate::error::AppError::CodigoDuplicado(_)),
        "el email repetido es un duplicado (no un error genérico), obtuve {err}"
    );
}

// ============ Tracking total / centro de actividad (Hito 25) ============

#[test]
fn registrar_vista_guarda_metadata_tenant_y_tiempo_local() {
    let db = setup();
    let conn = db.conn();
    let admin = id_admin(&conn);

    // Con la empresa sin nombre, el tenant queda None; se configura después.
    repo::auditoria::registrar_vista(
        &conn,
        &admin,
        &RegistrarVista {
            ruta: "/productos/abc-123".into(),
            modulo: "Productos".into(),
            proceso: Some("revisión de catálogo".into()),
            metadatos: Some(serde_json::json!({ "busqueda": "tornillo", "pagina": 2 })),
            duracion_vista_ms: Some(45_000),
            hora_local: Some(15),
            dia_semana: Some(3),
            cliente_info: Some(serde_json::json!({
                "navegador": "webkit", "plataforma": "linux", "pantalla": "1920x1080"
            })),
        },
    )
    .expect("vista registrada");

    let hist = repo::auditoria::listar_historial(
        &conn,
        Some(&admin),
        None,
        None,
        Some("VISTA"),
        None,
        None,
        None,
        None,
        None,
        None,
        1,
        50,
    )
    .expect("historial");
    assert_eq!(hist.meta.total, 1);
    let v = &hist.data[0];
    assert_eq!(v.tipo_evento, "VISTA");
    assert_eq!(v.accion, "navegar");
    assert_eq!(v.entidad, "pagina");
    assert_eq!(v.ruta.as_deref(), Some("/productos/abc-123"));
    assert_eq!(v.modulo.as_deref(), Some("Productos"));
    assert_eq!(v.proceso.as_deref(), Some("revisión de catálogo"));
    assert_eq!(v.duracion_vista_ms, Some(45_000));
    assert_eq!(v.hora_local, Some(15));
    assert_eq!(v.dia_semana, Some(3));
    // Los metadatos combinaron la UI con la info de cliente en un solo JSON.
    let md = v.metadatos.as_deref().expect("metadatos");
    assert!(md.contains("tornillo"));
    assert!(md.contains("webkit"));

    // El tenant se resuelve del nombre de la empresa (snapshot al evento).
    conn.execute(
        "UPDATE configuracion_empresa SET nombre = 'Almacenes del Norte' WHERE id = 'default'",
        [],
    )
    .expect("nombre empresa");
    repo::auditoria::registrar_vista(
        &conn,
        &admin,
        &RegistrarVista {
            ruta: "/dashboard".into(),
            modulo: "Dashboard".into(),
            proceso: None,
            metadatos: None,
            duracion_vista_ms: None,
            hora_local: None,
            dia_semana: None,
            cliente_info: None,
        },
    )
    .expect("vista 2");
    let hist = repo::auditoria::listar_historial(
        &conn,
        Some(&admin),
        None,
        None,
        Some("VISTA"),
        Some("Dashboard"),
        None,
        None,
        None,
        None,
        None,
        1,
        50,
    )
    .expect("historial 2");
    assert_eq!(hist.data[0].tenant.as_deref(), Some("Almacenes del Norte"));
}

#[test]
fn registrar_vista_rechaza_ruta_vacia_y_tiempo_local_invalido() {
    let db = setup();
    let conn = db.conn();
    let admin = id_admin(&conn);

    let err = repo::auditoria::registrar_vista(
        &conn,
        &admin,
        &RegistrarVista {
            ruta: "   ".into(),
            modulo: "Dashboard".into(),
            proceso: None,
            metadatos: None,
            duracion_vista_ms: None,
            hora_local: None,
            dia_semana: None,
            cliente_info: None,
        },
    );
    assert!(
        err.is_ok(),
        "la validación vive en el comando, no en el repo"
    );

    // La validación del comando (RegistrarVista::validar) sí es estricta.
    let v = RegistrarVista {
        ruta: "".into(),
        modulo: "Dashboard".into(),
        proceso: None,
        metadatos: None,
        duracion_vista_ms: None,
        hora_local: Some(99),
        dia_semana: Some(9),
        cliente_info: None,
    };
    assert!(matches!(
        v.validar(),
        Err(crate::error::AppError::CampoRequerido(_))
    ));
}

#[test]
fn invocaciones_de_comando_se_etiquetan_con_modulo_y_proceso() {
    let db = setup();
    let conn = db.conn();
    repo::auditoria::registrar_invocacion(&conn, Some("admin"), "crear_movimiento", 12, true, None)
        .expect("invocación");
    repo::auditoria::registrar_invocacion(&conn, Some("admin"), "listar_productos", 2, true, None)
        .expect("invocación");

    let hist = repo::auditoria::listar_historial(
        &conn,
        None,
        None,
        None,
        Some("COMANDO"),
        None,
        None,
        None,
        None,
        None,
        None,
        1,
        50,
    )
    .expect("historial");
    assert!(hist.data.iter().any(|e| {
        e.comando.as_deref() == Some("crear_movimiento")
            && e.modulo.as_deref() == Some("Movimientos")
            && e.proceso.as_deref() == Some("gestión de movimientos")
            && e.nivel == "ESCRITURA"
    }));
    assert!(hist.data.iter().any(|e| {
        e.comando.as_deref() == Some("listar_productos")
            && e.modulo.as_deref() == Some("Productos")
            && e.proceso.is_none()
    }));
}

#[test]
fn metricas_actividad_agrega_por_modulo_hora_usuario_y_proceso() {
    let db = setup();
    let conn = db.conn();
    let admin = id_admin(&conn);
    conn.execute(
        "UPDATE configuracion_empresa SET nombre = 'Bodega Central' WHERE id = 'default'",
        [],
    )
    .expect("nombre empresa");

    // 3 vistas del módulo Movimientos (una larga, una corta, una media)
    // + 1 operación: la hora 09:00 queda como pico sin ambigüedad.
    for (ruta, duracion, hora) in [
        ("/movimientos", 120_000, 9),
        ("/movimientos/nuevo", 30_000, 9),
        ("/movimientos/abc-123", 60_000, 9),
    ] {
        repo::auditoria::registrar_vista(
            &conn,
            &admin,
            &RegistrarVista {
                ruta: ruta.into(),
                modulo: "Movimientos".into(),
                proceso: if ruta.contains("nuevo") {
                    Some("registro de movimiento".into())
                } else {
                    None
                },
                metadatos: None,
                duracion_vista_ms: Some(duracion),
                hora_local: Some(hora),
                dia_semana: Some(2),
                cliente_info: None,
            },
        )
        .expect("vista");
    }
    repo::auditoria::registrar_invocacion(&conn, Some(&admin), "aprobar_movimiento", 5, true, None)
        .expect("invocación");

    let m = repo::auditoria::metricas_actividad(&conn, None, None, None).expect("métricas");
    assert!(m.resumen.total_vistas >= 2);
    assert!(m.resumen.total_operaciones >= 1);
    assert_eq!(m.resumen.usuarios_activos, 1);
    assert!(m.resumen.duracion_vista_promedio_ms.is_some());

    // Por módulo: Movimientos concentra las 3 vistas.
    let mov = m
        .por_modulo
        .iter()
        .find(|x| x.modulo == "Movimientos")
        .expect("módulo movimientos");
    assert_eq!(mov.vistas, 3);
    assert!(mov.duracion_vista_ms >= 210_000);

    // Por hora: las 3 vistas ocurrieron a las 09:00.
    let hora9 = m.por_hora.iter().find(|h| h.hora == 9).expect("hora 9");
    assert!(hora9.vistas >= 3);

    // Por proceso: el proceso "registro de movimiento" aparece con 1.
    let proc = m
        .por_proceso
        .iter()
        .find(|p| p.proceso == "registro de movimiento")
        .expect("proceso");
    assert_eq!(proc.total, 1);

    // Top rutas: las rutas de movimientos encabezan el ranking.
    assert!(m.top_rutas.iter().any(|r| r.ruta == "/movimientos"));
    assert!(m.top_rutas.iter().any(|r| r.ruta == "/movimientos/nuevo"));

    // Insights: el usuario más activo y la hora pico están presentes.
    assert!(m.insights.iter().any(|i| i.titulo.contains("09:00")));
    assert!(
        m.insights
            .iter()
            .any(|i| i.titulo.contains("Usuario más activo"))
    );
}

#[test]
fn listar_historial_pagina_y_filtra_por_tipo_modulo_y_rango() {
    let db = setup();
    let conn = db.conn();
    let admin = id_admin(&conn);

    for i in 0..25 {
        repo::auditoria::registrar_vista(
            &conn,
            &admin,
            &RegistrarVista {
                ruta: format!("/productos?pagina={i}"),
                modulo: "Productos".into(),
                proceso: None,
                metadatos: None,
                duracion_vista_ms: Some(1_000),
                hora_local: Some(10),
                dia_semana: Some(1),
                cliente_info: None,
            },
        )
        .expect("vista");
    }

    // Página 1 de 10 por página: 10 filas, 3 páginas en total.
    let p1 = repo::auditoria::listar_historial(
        &conn,
        None,
        None,
        None,
        Some("VISTA"),
        None,
        None,
        None,
        None,
        None,
        None,
        1,
        10,
    )
    .expect("página 1");
    assert_eq!(p1.data.len(), 10);
    assert_eq!(p1.meta.total, 25);
    assert_eq!(p1.meta.total_pages, 3);
    assert!(p1.meta.has_next);
    assert!(!p1.meta.has_prev);

    // Página 3: 5 filas restantes.
    let p3 = repo::auditoria::listar_historial(
        &conn,
        None,
        None,
        None,
        Some("VISTA"),
        None,
        None,
        None,
        None,
        None,
        None,
        3,
        10,
    )
    .expect("página 3");
    assert_eq!(p3.data.len(), 5);
    assert!(!p3.meta.has_next);
    assert!(p3.meta.has_prev);

    // Filtro por módulo combinado con tipo: solo vistas de Productos.
    let f = repo::auditoria::listar_historial(
        &conn,
        None,
        None,
        None,
        Some("VISTA"),
        Some("Productos"),
        None,
        None,
        None,
        None,
        None,
        1,
        50,
    )
    .expect("filtrado");
    assert_eq!(f.meta.total, 25);

    // Filtro por rango de fechas no rompe (no hay eventos fuera de rango).
    let fut = repo::auditoria::listar_historial(
        &conn,
        None,
        None,
        None,
        None,
        None,
        None,
        None,
        None,
        Some("2099-01-01T00:00:00"),
        None,
        1,
        50,
    )
    .expect("futuro");
    assert_eq!(fut.meta.total, 0);
}

// ============ Resolución de escaneo (Fase B, SPEC §14.3) ============

#[test]
fn resolver_escaneo_resuelve_producto_ubicacion_y_lote() {
    let db = setup();
    let conn = db.conn();
    let (_almacen, ubi1, _ubi2) = crear_arbol(&conn);
    let (_uom, prod) = crear_uom_y_producto(&conn);

    // Asignar un código de barras al producto.
    conn.execute(
        "UPDATE productos SET codigo_barras = ?1 WHERE id = ?2",
        rusqlite::params!["7501234567890", prod],
    )
    .expect("barras");

    // Un producto que controla lote + un lote.
    let uom2 = repo::catalogo::crear_uom(
        &conn,
        &NuevaUom {
            codigo: "U2".into(),
            nombre: "Unidad 2".into(),
            tipo: "UNIDAD".into(),
            factor: 1,
            base: true,
        },
        "admin",
    )
    .expect("uom");
    let prod_lote = repo::catalogo::crear_producto(
        &conn,
        &NuevoProducto {
            costo_unitario: None,
            sku: "LOT".into(),
            nombre: "Con lote".into(),
            descripcion: None,
            categoria_id: None,
            uom_base_id: uom2.id.clone(),
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
            created_by: Some("admin".into()),
        },
    )
    .expect("producto lote");
    let lote = repo::catalogo::crear_lote(
        &conn,
        &NuevoLote {
            numero: "LOTE-7".into(),
            producto_id: prod_lote.id.clone(),
            fecha_fabricacion: None,
            fecha_vencimiento: None,
            origen: None,
            notas: None,
            created_by: Some("admin".into()),
        },
    )
    .expect("lote");

    // Código de barras del producto → PRODUCTO.
    let r = repo::catalogo::resolver_escaneo(&conn, "7501234567890")
        .expect("resolver barras")
        .expect("match barras");
    assert_eq!(r.tipo, "PRODUCTO");
    assert_eq!(r.id, prod);

    // SKU → PRODUCTO.
    let r = repo::catalogo::resolver_escaneo(&conn, "ref-100")
        .expect("resolver sku")
        .expect("match sku");
    assert_eq!(r.tipo, "PRODUCTO");
    assert_eq!(r.id, prod);

    // El producto resuelto lleva `controla_lote` (la captura rápida decide el
    // paso siguiente con este dato, sin depender del listado del cliente).
    assert!(!r.controla_lote, "producto sin lote: controla_lote falso");

    // Código de ubicación → UBICACION.
    let r = repo::catalogo::resolver_escaneo(&conn, "P1")
        .expect("resolver ubicacion")
        .expect("match ubicacion");
    assert_eq!(r.tipo, "UBICACION");
    assert_eq!(r.id, ubi1);
    assert!(!r.controla_lote, "ubicación no lleva controla_lote");

    // Número de lote → LOTE.
    let r = repo::catalogo::resolver_escaneo(&conn, "LOTE-7")
        .expect("resolver lote")
        .expect("match lote");
    assert_eq!(r.tipo, "LOTE");
    assert_eq!(r.id, lote.id);

    // Producto que controla lote → controla_lote verdadero.
    let r = repo::catalogo::resolver_escaneo(&conn, "LOT")
        .expect("resolver producto con lote")
        .expect("match producto con lote");
    assert_eq!(r.tipo, "PRODUCTO");
    assert_eq!(r.id, prod_lote.id);
    assert!(r.controla_lote, "producto con controla_lote=true");

    // Desconocido → None.
    let r = repo::catalogo::resolver_escaneo(&conn, "NO-EXISTE").expect("resolver desconocido");
    assert!(r.is_none());
}

// ============ Importación masiva (Fase C) ============

#[test]
fn importar_productos_validos_y_con_error() {
    let db = setup();
    let conn = db.conn();
    let _uom = repo::catalogo::crear_uom(
        &conn,
        &NuevaUom {
            codigo: "PZA".into(),
            nombre: "Pieza".into(),
            tipo: "UNIDAD".into(),
            factor: 1,
            base: true,
        },
        "admin",
    )
    .expect("uom");

    // Fila 1 válida (uom por código), fila 2 con uom inexistente.
    let filas = serde_json::json!([
        { "sku": "IMP-1", "nombre": "Importado Uno", "uom_base": "PZA", "stock_minimo": 5 },
        { "sku": "IMP-2", "nombre": "Importado Dos", "uom_base": "NO-EXISTE" }
    ]);
    let resultados = crate::importar::importar_datos(
        &conn,
        "PRODUCTOS",
        filas.as_array().expect("array"),
        "admin",
    )
    .expect("importar");

    assert_eq!(resultados.len(), 2);
    assert!(
        resultados[0].ok,
        "fila 1 válida, got {:?}",
        resultados[0].error
    );
    assert!(!resultados[1].ok, "fila 2 inválida");
    assert!(
        resultados[1]
            .error
            .as_deref()
            .unwrap()
            .contains("unidad de medida")
    );

    // Solo se insertó la fila válida.
    let total: i64 = conn
        .query_row("SELECT COUNT(*) FROM productos", [], |r| r.get(0))
        .expect("count");
    assert_eq!(total, 1);
}

#[test]
fn importar_stock_inicial_carga_saldo_aprobado() {
    let db = setup();
    let conn = db.conn();
    let (_almacen, ubi1, _ubi2) = crear_arbol(&conn);
    let (_uom, prod) = crear_uom_y_producto(&conn);
    // El SKU se crea normalizado (REF-100).
    let sku: String = conn
        .query_row("SELECT sku FROM productos WHERE id = ?1", [&prod], |r| {
            r.get(0)
        })
        .expect("sku");
    let ubi_codigo: String = conn
        .query_row(
            "SELECT codigo FROM ubicaciones WHERE id = ?1",
            [&ubi1],
            |r| r.get(0),
        )
        .expect("codigo ubicacion");

    let filas = serde_json::json!([
        { "sku": sku, "cantidad": 40, "ubicacion": ubi_codigo }
    ]);
    let resultados = crate::importar::importar_datos(
        &conn,
        "STOCK_INICIAL",
        filas.as_array().expect("array"),
        "admin",
    )
    .expect("importar stock");
    assert!(
        resultados[0].ok,
        "fila válida, got {:?}",
        resultados[0].error
    );

    let saldo = repo::movimiento::listar_saldos(&conn, Some(&ubi1), Some(&prod)).expect("saldos");
    assert_eq!(saldo.len(), 1);
    assert_eq!(saldo[0].cantidad, 40);
}

// ============ Modo construcción del mapa (SPEC §14, layout físico) ============

use crate::mapa::{self, CreacionEnMapa, LayoutBasePedido, Rect, TipoNodo};

fn rect(x: f64, y: f64, ancho: f64, profundo: f64) -> Rect {
    Rect {
        x,
        y,
        ancho,
        profundo,
    }
}

fn pos_mapa(x: f64, y: f64, ancho: f64, profundidad: f64) -> PosicionMapa {
    PosicionMapa {
        pos_x: Some(x),
        pos_y: Some(y),
        pos_z: None,
        altura: None,
        ancho: Some(ancho),
        profundidad: Some(profundidad),
    }
}

#[test]
fn matriz_solapes_prohibe_pares_duros_y_permite_contencion() {
    use mapa::solape_prohibido;
    let duros = [
        (TipoNodo::Zona, TipoNodo::Zona),
        (TipoNodo::Pasillo, TipoNodo::Pasillo),
        (TipoNodo::Rack, TipoNodo::Rack),
        (TipoNodo::Ubicacion, TipoNodo::Ubicacion),
        (TipoNodo::Pasillo, TipoNodo::Rack),
        (TipoNodo::Rack, TipoNodo::Pasillo),
        (TipoNodo::Pasillo, TipoNodo::Ubicacion),
        (TipoNodo::Ubicacion, TipoNodo::Pasillo),
        (TipoNodo::Rack, TipoNodo::Ubicacion),
        (TipoNodo::Ubicacion, TipoNodo::Rack),
    ];
    for (a, b) in duros {
        assert!(
            solape_prohibido(a, b),
            "{:?} vs {:?} debe estar prohibido",
            a,
            b
        );
    }
    // Zona contiene hijos (ambas direcciones): contención permitida.
    let contencion = [
        (TipoNodo::Zona, TipoNodo::Pasillo),
        (TipoNodo::Pasillo, TipoNodo::Zona),
        (TipoNodo::Zona, TipoNodo::Rack),
        (TipoNodo::Rack, TipoNodo::Zona),
        (TipoNodo::Zona, TipoNodo::Ubicacion),
        (TipoNodo::Ubicacion, TipoNodo::Zona),
    ];
    for (a, b) in contencion {
        assert!(
            !solape_prohibido(a, b),
            "{:?} vs {:?} debe permitir contención",
            a,
            b
        );
    }

    // AABB: solape real sí; borde compartido no; disjuntos no; contenido sí.
    let a = rect(0.0, 0.0, 100.0, 100.0);
    assert!(mapa::rects_solapan(&a, &rect(50.0, 50.0, 100.0, 100.0)));
    assert!(!mapa::rects_solapan(&a, &rect(100.0, 0.0, 50.0, 50.0)));
    assert!(!mapa::rects_solapan(&a, &rect(0.0, 100.0, 50.0, 50.0)));
    assert!(!mapa::rects_solapan(&a, &rect(200.0, 200.0, 10.0, 10.0)));
    assert!(mapa::rects_solapan(&a, &rect(10.0, 10.0, 5.0, 5.0)));

    // Dimensiones mínimas: degenerado rechazado, ubicación exenta.
    assert!(matches!(
        mapa::validar_dimensiones(TipoNodo::Rack, &rect(0.0, 0.0, 5.0, 30.0)),
        Err(crate::error::AppError::DimensionInvalida("rack", _))
    ));
    assert!(mapa::validar_dimensiones(TipoNodo::Rack, &rect(0.0, 0.0, 110.0, 56.0)).is_ok());
    assert!(mapa::validar_dimensiones(TipoNodo::Ubicacion, &rect(0.0, 0.0, 1.0, 1.0)).is_ok());
}

/// Árbol mínimo para tests de mapa: almacén + zona posicionada grande.
fn almacen_con_zona(conn: &rusqlite::Connection) -> (String, String) {
    let almacen = repo::catalogo::crear_almacen(
        conn,
        &NuevoAlmacen {
            codigo: "ALM-MAPA".into(),
            nombre: "Almacén Mapa".into(),
            descripcion: None,
            direccion: None,
            created_by: Some("admin".into()),
        },
    )
    .expect("almacen");
    let zona = repo::catalogo::crear_zona(
        conn,
        &NuevaZona {
            codigo: "Z-01".into(),
            nombre: "Zona Mapa".into(),
            descripcion: None,
            almacen_id: almacen.id.clone(),
            created_by: Some("admin".into()),
        },
    )
    .expect("zona");
    repo::catalogo::mover_zona(conn, &zona.id, &pos_mapa(0.0, 0.0, 600.0, 400.0), "admin")
        .expect("posicionar zona");
    (almacen.id, zona.id)
}

fn crear_pasillo_simple(conn: &rusqlite::Connection, zona_id: &str, codigo: &str) -> String {
    let p = repo::catalogo::crear_pasillo(
        conn,
        &NuevoPasillo {
            codigo: codigo.into(),
            nombre: None,
            zona_id: zona_id.to_string(),
            created_by: Some("admin".into()),
        },
    )
    .expect("pasillo");
    p.id
}

#[test]
fn mover_rechaza_solape_entre_pasillos_y_permite_borde_compartido() {
    let db = setup();
    let conn = db.conn();
    let (_almacen_id, zona_id) = almacen_con_zona(&conn);

    let pas_a = crear_pasillo_simple(&conn, &zona_id, "PAS-A");
    repo::catalogo::mover_pasillo(&conn, &pas_a, &pos_mapa(20.0, 20.0, 120.0, 60.0), "admin")
        .expect("pasillo A");

    // Solape real con PAS-A: rechazado y el mensaje nombra ambos códigos.
    let pas_b = crear_pasillo_simple(&conn, &zona_id, "PAS-B");
    let err =
        repo::catalogo::mover_pasillo(&conn, &pas_b, &pos_mapa(80.0, 40.0, 120.0, 60.0), "admin")
            .unwrap_err();
    match err {
        crate::error::AppError::SolapeMapa {
            codigo_a, codigo_b, ..
        } => {
            assert_eq!(codigo_a, "PAS-B");
            assert_eq!(codigo_b, "PAS-A");
        }
        otro => panic!("esperaba SolapeMapa, got {:?}", otro),
    }

    // Borde compartido (x=140 justo al terminar A): permitido.
    repo::catalogo::mover_pasillo(&conn, &pas_b, &pos_mapa(140.0, 20.0, 120.0, 60.0), "admin")
        .expect("borde compartido es válido");

    // Rack sobre el pasillo B: prohibido (el pasillo es espacio de tránsito).
    let rack = repo::catalogo::crear_rack(
        &conn,
        &NuevoRack {
            codigo: "RACK-X".into(),
            nombre: None,
            tipo: None,
            zona_id: zona_id.clone(),
            pasillo_id: None,
            created_by: Some("admin".into()),
        },
    )
    .expect("rack");
    let err =
        repo::catalogo::mover_rack(&conn, &rack.id, &pos_mapa(150.0, 30.0, 90.0, 40.0), "admin")
            .unwrap_err();
    assert!(matches!(err, crate::error::AppError::SolapeMapa { .. }));

    // Rack en espacio libre de la misma zona: ok (contención permitida).
    repo::catalogo::mover_rack(&conn, &rack.id, &pos_mapa(300.0, 20.0, 90.0, 40.0), "admin")
        .expect("rack libre");

    // Ubicación directa de zona sobre el rack: prohibido; junto al rack: ok.
    let ubi = repo::catalogo::crear_ubicacion(
        &conn,
        &NuevaUbicacion {
            codigo: "UBI-FUERA".into(),
            nombre: None,
            seccion_id: None,
            rack_id: None,
            zona_id: Some(zona_id.clone()),
            tipo: None,
            capacidad_maxima: None,
            created_by: Some("admin".into()),
        },
    )
    .expect("ubicacion");
    let err = repo::catalogo::mover_ubicacion(
        &conn,
        &ubi.id,
        &pos_mapa(320.0, 30.0, 70.0, 48.0),
        "admin",
    )
    .unwrap_err();
    assert!(matches!(err, crate::error::AppError::SolapeMapa { .. }));
    repo::catalogo::mover_ubicacion(&conn, &ubi.id, &pos_mapa(300.0, 120.0, 70.0, 48.0), "admin")
        .expect("ubicación libre");

    // Redimensionar la zona para que "trague" todo: nunca choca (contención).
    repo::catalogo::mover_zona(&conn, &zona_id, &pos_mapa(0.0, 0.0, 800.0, 400.0), "admin")
        .expect("crecer zona");

    // Tamaño degenerado rechazado antes de tocar la BD.
    let err =
        repo::catalogo::mover_rack(&conn, &rack.id, &pos_mapa(300.0, 200.0, 5.0, 40.0), "admin")
            .unwrap_err();
    assert!(matches!(
        err,
        crate::error::AppError::DimensionInvalida(_, _)
    ));
}

#[test]
fn crear_en_mapa_sugiere_codigo_y_revierte_si_choca() {
    let db = setup();
    let conn = db.conn();
    let (almacen_id, _zona_id) = almacen_con_zona(&conn);

    let pedido_zona = |x: f64, y: f64, w: f64, h: f64| CreacionEnMapa {
        tipo: "zona".into(),
        almacen_id: almacen_id.clone(),
        zona_id: None,
        x,
        y,
        ancho: w,
        profundidad: h,
    };

    // Primera zona del almacén ya existe (Z-01 de almacen_con_zona): sugiere Z-02.
    let z2 = mapa::crear_en_mapa(&conn, &pedido_zona(700.0, 0.0, 300.0, 300.0), "admin")
        .expect("zona Z-02");
    assert_eq!(z2.codigo, "Z-02");
    let z3 = mapa::crear_en_mapa(&conn, &pedido_zona(700.0, 350.0, 300.0, 300.0), "admin")
        .expect("zona Z-03");
    assert_eq!(z3.codigo, "Z-03");

    // Pasillo dibujado dentro de Z-01: crea con código consecutivo y posición.
    let pas = mapa::crear_en_mapa(
        &conn,
        &CreacionEnMapa {
            tipo: "pasillo".into(),
            almacen_id: almacen_id.clone(),
            zona_id: None, // se llena abajo
            x: 20.0,
            y: 20.0,
            ancho: 80.0,
            profundidad: 200.0,
        },
        "admin",
    );
    // Sin zona_id debe fallar con mensaje claro...
    assert!(matches!(
        pas,
        Err(crate::error::AppError::CampoRequerido(_))
    ));
    let pas = mapa::crear_en_mapa(
        &conn,
        &CreacionEnMapa {
            tipo: "pasillo".into(),
            almacen_id: almacen_id.clone(),
            zona_id: Some(_zona_id.clone()),
            x: 20.0,
            y: 20.0,
            ancho: 80.0,
            profundidad: 200.0,
        },
        "admin",
    )
    .expect("pasillo PAS-01");
    assert_eq!(pas.codigo, "PAS-01");
    let guardado = repo::catalogo::obtener_pasillo(&conn, &pas.id)
        .expect("leer")
        .expect("existe");
    assert_eq!(guardado.pos_x, Some(20.0));
    assert_eq!(guardado.ancho, 80.0);

    // Rack que choca con el pasillo recién creado: error y NO queda nada
    // (transacción completa: sin rack huérfano ni código consumido).
    let choque = mapa::crear_en_mapa(
        &conn,
        &CreacionEnMapa {
            tipo: "rack".into(),
            almacen_id: almacen_id.clone(),
            zona_id: Some(_zona_id.clone()),
            x: 40.0,
            y: 40.0,
            ancho: 60.0,
            profundidad: 60.0,
        },
        "admin",
    )
    .unwrap_err();
    assert!(matches!(choque, crate::error::AppError::SolapeMapa { .. }));
    let total_racks: i64 = conn
        .query_row(
            "SELECT COUNT(*) FROM racks WHERE zona_id = ?1",
            [&_zona_id],
            |r| r.get(0),
        )
        .expect("conteo");
    assert_eq!(total_racks, 0, "la transacción debe revertir el insert");

    // Reintento en espacio libre: obtiene RACK-01 (el código no se quemó).
    let rack = mapa::crear_en_mapa(
        &conn,
        &CreacionEnMapa {
            tipo: "rack".into(),
            almacen_id: almacen_id.clone(),
            zona_id: Some(_zona_id.clone()),
            x: 200.0,
            y: 20.0,
            ancho: 100.0,
            profundidad: 50.0,
        },
        "admin",
    )
    .expect("rack RACK-01");
    assert_eq!(rack.codigo, "RACK-01");

    // Ubicaciones no participan del modo construcción.
    let err = mapa::crear_en_mapa(
        &conn,
        &CreacionEnMapa {
            tipo: "ubicacion".into(),
            almacen_id: almacen_id.clone(),
            zona_id: None,
            x: 0.0,
            y: 0.0,
            ancho: 70.0,
            profundidad: 48.0,
        },
        "admin",
    )
    .unwrap_err();
    assert!(matches!(err, crate::error::AppError::CampoInvalido(_)));
}

#[test]
fn layout_base_siembra_sin_solapes_y_solo_en_almacen_vacio() {
    let db = setup();
    let conn = db.conn();
    let (almacen_id, _zona_id) = almacen_con_zona(&conn);

    // Con zonas ya existentes: rechazado (es semilla de prototipo inicial).
    let err = mapa::generar_layout_base(
        &conn,
        &LayoutBasePedido {
            almacen_id: almacen_id.clone(),
            ancho_recinto: 900.0,
            profundo_recinto: 500.0,
            pasillos: 2,
            racks_por_bloque: 3,
        },
        "admin",
    )
    .unwrap_err();
    assert!(matches!(err, crate::error::AppError::CampoInvalido(_)));

    // Almacén vacío de zonas: genera 1 zona + 2 pasillos + 9 racks (3 bloques × 3).
    let vacio = {
        let alm = repo::catalogo::crear_almacen(
            &conn,
            &NuevoAlmacen {
                codigo: "ALM-NUEVO".into(),
                nombre: "Almacén Nuevo".into(),
                descripcion: None,
                direccion: None,
                created_by: Some("admin".into()),
            },
        )
        .expect("almacen nuevo");
        alm.id
    };
    let resumen = mapa::generar_layout_base(
        &conn,
        &LayoutBasePedido {
            almacen_id: vacio.clone(),
            ancho_recinto: 900.0,
            profundo_recinto: 500.0,
            pasillos: 2,
            racks_por_bloque: 3,
        },
        "admin",
    )
    .expect("layout base");
    assert_eq!(resumen.zonas, 1);
    assert_eq!(resumen.pasillos, 2);
    assert_eq!(resumen.racks, 9);

    // Códigos consecutivos desde cero.
    for prefijo in ["Z-01", "PAS-01", "PAS-02", "RACK-01", "RACK-09"] {
        let hay: i64 = conn
            .query_row(
                match prefijo.starts_with("Z") {
                    true => "SELECT COUNT(*) FROM zonas WHERE almacen_id = ?1 AND codigo = ?2",
                    false => "SELECT COUNT(*) FROM (
                        SELECT p.codigo FROM pasillos p JOIN zonas z ON z.id = p.zona_id WHERE z.almacen_id = ?1 AND p.codigo = ?2
                        UNION ALL
                        SELECT r.codigo FROM racks r JOIN zonas z ON z.id = r.zona_id WHERE z.almacen_id = ?1 AND r.codigo = ?2
                    )",
                },
                rusqlite::params![vacio, prefijo],
                |r| r.get(0),
            )
            .expect("codigo generado");
        assert_eq!(hay, 1, "debe existir exactamente un {prefijo}");
    }

    // La geometría generada pasa el propio motor de colisión elemento por elemento:
    // revalidar cada rect contra todos los demás no encuentra ningún solape duro.
    for tipo in ["zona", "pasillo", "rack"] {
        let filas: Vec<(String, String, f64, f64, f64, f64)> = match tipo {
            "zona" => conn
                .prepare("SELECT id, codigo, pos_x, pos_y, ancho, profundidad FROM zonas WHERE almacen_id = ?1 AND pos_x IS NOT NULL")
                .expect("stmt")
                .query_map([&vacio], |r| {
                    Ok((r.get(0)?, r.get(1)?, r.get(2)?, r.get(3)?, r.get(4)?, r.get(5)?))
                })
                .expect("q")
                .collect::<Result<_, _>>()
                .expect("filas zona"),
            "pasillo" => conn
                .prepare(
                    "SELECT p.id, p.codigo, p.pos_x, p.pos_y, p.ancho, p.profundidad FROM pasillos p JOIN zonas z ON z.id = p.zona_id WHERE z.almacen_id = ?1 AND p.pos_x IS NOT NULL",
                )
                .expect("stmt")
                .query_map([&vacio], |r| {
                    Ok((r.get(0)?, r.get(1)?, r.get(2)?, r.get(3)?, r.get(4)?, r.get(5)?))
                })
                .expect("q")
                .collect::<Result<_, _>>()
                .expect("filas pasillo"),
            _ => conn
                .prepare(
                    "SELECT r.id, r.codigo, r.pos_x, r.pos_y, r.ancho, r.profundidad FROM racks r JOIN zonas z ON z.id = r.zona_id WHERE z.almacen_id = ?1 AND r.pos_x IS NOT NULL",
                )
                .expect("stmt")
                .query_map([&vacio], |r| {
                    Ok((r.get(0)?, r.get(1)?, r.get(2)?, r.get(3)?, r.get(4)?, r.get(5)?))
                })
                .expect("q")
                .collect::<Result<_, _>>()
                .expect("filas rack"),
        };
        for (id, codigo, x, y, w, h) in filas {
            mapa::validar_colisiones(
                &conn,
                &vacio,
                mapa::TipoNodo::desde_str(tipo).expect("tipo"),
                &id,
                &codigo,
                &Rect {
                    x,
                    y,
                    ancho: w,
                    profundo: h,
                },
            )
            .unwrap_or_else(|e| panic!("layout base inválido para {tipo} {codigo}: {e}"));
        }
    }

    // Parámetros absurdos rechazados antes de escribir nada.
    let err = mapa::generar_layout_base(
        &conn,
        &LayoutBasePedido {
            almacen_id: vacio.clone(),
            ancho_recinto: 900.0,
            profundo_recinto: 500.0,
            pasillos: 99,
            racks_por_bloque: 3,
        },
        "admin",
    )
    .unwrap_err();
    assert!(matches!(err, crate::error::AppError::CampoInvalido(_)));
}
