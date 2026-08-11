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
        crate::repo::seguridad::bootstrap_admin(&conn, "admin", "Administrador", "admin1234")
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
        "admin",
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
                    producto_id: prod.clone(),
                    lote_id: None,
                    cantidad: 6,
                    origen_ubicacion_id: None,
                    destino_ubicacion_id: Some(ubi1.clone()),
                    caja_origen_id: None,
                    caja_destino_id: None,
                },
                NuevaLinea {
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
fn caja_restringida_rechaza_producto_distinto() {
    let db = setup();
    let conn = db.conn();
    let (_almacen_id, ubi1, _ubi2) = crear_arbol(&conn);
    let (uom, prod1) = crear_uom_y_producto(&conn);
    let prod2 = repo::catalogo::crear_producto(
        &conn,
        &NuevoProducto {
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

    repo::movimiento::aprobar_movimiento(&conn, &creado.salida.id, "admin")
        .expect("aprobar salida");
    repo::movimiento::aprobar_movimiento(&conn, &entrada.id, "admin").expect("aprobar entrada");

    let saldo_origen =
        repo::movimiento::listar_saldos(&conn, Some(&ubi_origen), None).expect("saldos");
    let saldo_destino =
        repo::movimiento::listar_saldos(&conn, Some(&ubi_destino), None).expect("saldos");
    assert_eq!(saldo_origen[0].cantidad, 4);
    assert_eq!(saldo_destino[0].cantidad, 6);
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
    let abiertas = repo::alerta::listar_alertas(&conn, Some("ABIERTA"), "admin").expect("listar");
    assert!(!abiertas.iter().any(|a| a.id == abierta.id));
    let ignoradas = repo::alerta::listar_alertas(&conn, Some("IGNORADA"), "admin").expect("listar");
    assert!(ignoradas.iter().any(|a| a.id == abierta.id));
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
    assert_eq!(resumen.ubicaciones_con_stock, 1);
    assert!(resumen.ubicaciones_totales >= 2);
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
