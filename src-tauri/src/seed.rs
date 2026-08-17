//! Datos de ejemplo para explorar Rustock manualmente (`npm run tauri dev`).
//!
//! Usa exclusivamente las mismas funciones de `repo::*` que exponen los
//! comandos Tauri — nunca SQL de escritura directo — para garantizar que los
//! datos sembrados respetan las mismas reglas de negocio que cualquier dato
//! creado desde la UI (saldos derivados de movimientos, permisos, etc.).
//!
//! Se activa con la variable de entorno `RUSTOCK_SEED=1` y es idempotente:
//! si ya existe al menos un almacén, no hace nada (para no duplicar datos en
//! reinicios sucesivos de `npm run tauri dev`).

use rusqlite::Connection;

use crate::domain::ahora;
use crate::domain::alerta::NuevoComentario;
use crate::domain::catalogo::{
    NuevaCategoria, NuevaSeccion, NuevaUbicacion, NuevaUom, NuevaZona, NuevoAlmacen, NuevoCliente,
    NuevoLote, NuevoProducto, NuevoProveedor, NuevoRack,
};
use crate::domain::inventario::{NuevaSesionInventario, NuevoConteo};
use crate::domain::movimiento::{NuevaLinea, NuevoMovimiento, NuevoTraslado};
use crate::error::AppResult;
use crate::repo;
use crate::repo::trazabilidad::fecha_mas_dias;

pub fn sembrar_si_vacio(conn: &Connection) -> AppResult<()> {
    let hay_almacenes: i64 = conn.query_row("SELECT COUNT(*) FROM almacenes", [], |r| r.get(0))?;
    if hay_almacenes > 0 {
        println!("[seed] ya hay datos, no se siembra de nuevo.");
        return Ok(());
    }
    sembrar(conn)?;
    println!("[seed] datos de ejemplo creados. Usuario: admin / Contraseña: Admin1234!");
    Ok(())
}

fn linea(
    producto_id: &str,
    lote_id: Option<String>,
    cantidad: i64,
    origen: Option<String>,
    destino: Option<String>,
) -> NuevaLinea {
    NuevaLinea {
        costo_unitario: None,
        producto_id: producto_id.to_string(),
        lote_id,
        cantidad,
        origen_ubicacion_id: origen,
        destino_ubicacion_id: destino,
        caja_origen_id: None,
        caja_destino_id: None,
    }
}

#[allow(clippy::too_many_arguments)]
fn crear_y_aprobar(
    conn: &Connection,
    by: &str,
    tipo: &str,
    sub_tipo: &str,
    proveedor_id: Option<String>,
    cliente_id: Option<String>,
    motivo: Option<String>,
    documento_referencia: Option<String>,
    lineas: Vec<NuevaLinea>,
) -> AppResult<crate::domain::movimiento::Movimiento> {
    let nuevo = NuevoMovimiento {
        tipo: tipo.to_string(),
        sub_tipo: sub_tipo.to_string(),
        fecha_movimiento: None,
        motivo,
        origen_ubicacion_id: None,
        destino_ubicacion_id: None,
        proveedor_id,
        cliente_id,
        sesion_inventario_id: None,
        documento_referencia,
        notas: None,
        lineas,
        created_by: by.to_string(),
    };
    let mov = repo::movimiento::crear_movimiento(conn, &nuevo)?;
    repo::movimiento::aprobar_movimiento(conn, &mov.id, by)
}

fn sembrar(conn: &Connection) -> AppResult<()> {
    // 1. Administrador (idempotente por sí mismo).
    repo::seguridad::bootstrap_admin(conn, "admin", "Administradora Demo", "Admin1234!")?;
    let admin = repo::seguridad::obtener_usuario_por_nombre(conn, "admin")?
        .expect("admin recién creado por bootstrap_admin");
    let by = admin.id.as_str();

    // 2. Unidades de medida.
    let pza = repo::catalogo::crear_uom(
        conn,
        &NuevaUom {
            codigo: "PZA".into(),
            nombre: "Pieza".into(),
            tipo: "UNIDAD".into(),
            factor: 1,
            base: true,
        },
        by,
    )?;
    let caja_uom = repo::catalogo::crear_uom(
        conn,
        &NuevaUom {
            codigo: "CAJA".into(),
            nombre: "Caja (10 pza)".into(),
            tipo: "UNIDAD".into(),
            factor: 10,
            base: false,
        },
        by,
    )?;
    let kg = repo::catalogo::crear_uom(
        conn,
        &NuevaUom {
            codigo: "KG".into(),
            nombre: "Kilogramo".into(),
            tipo: "PESO".into(),
            factor: 1,
            base: true,
        },
        by,
    )?;

    // 3. Categorías.
    let cat_fijaciones = repo::catalogo::crear_categoria(
        conn,
        &NuevaCategoria {
            nombre: "Fijaciones".into(),
            parent_id: None,
            descripcion: Some("Tornillos, tuercas, anclajes".into()),
            created_by: Some(by.into()),
        },
    )?;
    let cat_embalaje = repo::catalogo::crear_categoria(
        conn,
        &NuevaCategoria {
            nombre: "Embalaje".into(),
            parent_id: None,
            descripcion: Some("Cintas, adhesivos, film".into()),
            created_by: Some(by.into()),
        },
    )?;

    // 4. Proveedor y cliente.
    let proveedor = repo::catalogo::crear_proveedor(
        conn,
        &NuevoProveedor {
            codigo: "PROV-001".into(),
            nombre: "Ferretería Industrial SAC".into(),
            contacto_nombre: Some("Jorge Ramos".into()),
            contacto_telefono: Some("+51 999 111 222".into()),
            contacto_email: Some("ventas@ferreteriaindustrial.pe".into()),
            direccion: Some("Av. Argentina 1234, Lima".into()),
            created_by: Some(by.into()),
        },
    )?;
    let cliente = repo::catalogo::crear_cliente(
        conn,
        &NuevoCliente {
            codigo: "CLI-001".into(),
            nombre: "Constructora Andina SAC".into(),
            contacto_nombre: Some("Lucía Vargas".into()),
            contacto_telefono: Some("+51 999 333 444".into()),
            contacto_email: Some("compras@andina.pe".into()),
            direccion: Some("Jr. Cusco 456, Lima".into()),
            created_by: Some(by.into()),
        },
    )?;

    // 5. Árbol físico: Almacén -> Zona -> Rack -> Sección -> Ubicación.
    let almacen = repo::catalogo::crear_almacen(
        conn,
        &NuevoAlmacen {
            codigo: "ALM-PRINCIPAL".into(),
            nombre: "Almacén Central".into(),
            descripcion: Some("Sede principal de operaciones".into()),
            direccion: Some("Av. Industrial 789, Lima".into()),
            created_by: Some(by.into()),
        },
    )?;
    let zona_picking = repo::catalogo::crear_zona(
        conn,
        &NuevaZona {
            codigo: "Z-01".into(),
            nombre: "Picking".into(),
            descripcion: None,
            almacen_id: almacen.id.clone(),
            created_by: Some(by.into()),
        },
    )?;
    let zona_recepcion = repo::catalogo::crear_zona(
        conn,
        &NuevaZona {
            codigo: "Z-02".into(),
            nombre: "Recepción".into(),
            descripcion: None,
            almacen_id: almacen.id.clone(),
            created_by: Some(by.into()),
        },
    )?;
    let zona_devolucion = repo::catalogo::crear_zona(
        conn,
        &NuevaZona {
            codigo: "Z-03".into(),
            nombre: "Devoluciones".into(),
            descripcion: None,
            almacen_id: almacen.id.clone(),
            created_by: Some(by.into()),
        },
    )?;

    let rack_a1 = repo::catalogo::crear_rack(
        conn,
        &NuevoRack {
            codigo: "RACK-A1".into(),
            nombre: Some("Rack A1".into()),
            tipo: Some("estanteria".into()),
            zona_id: zona_picking.id.clone(),
            created_by: Some(by.into()),
        },
    )?;
    let seccion_n1 = repo::catalogo::crear_seccion(
        conn,
        &NuevaSeccion {
            codigo: "RACK-A1-N1".into(),
            nombre: Some("Nivel 1".into()),
            nivel: Some("1".into()),
            rack_id: rack_a1.id.clone(),
            descripcion: None,
            created_by: Some(by.into()),
        },
    )?;
    let seccion_n2 = repo::catalogo::crear_seccion(
        conn,
        &NuevaSeccion {
            codigo: "RACK-A1-N2".into(),
            nombre: Some("Nivel 2".into()),
            nivel: Some("2".into()),
            rack_id: rack_a1.id.clone(),
            descripcion: None,
            created_by: Some(by.into()),
        },
    )?;

    let ubi_picking_1 = repo::catalogo::crear_ubicacion(
        conn,
        &NuevaUbicacion {
            codigo: "RACK-A1-N1-P1".into(),
            nombre: Some("Posición 1".into()),
            seccion_id: Some(seccion_n1.id.clone()),
            rack_id: None,
            zona_id: None,
            tipo: Some("PICKING".into()),
            capacidad_maxima: Some(50_000),
            created_by: Some(by.into()),
        },
    )?;
    let ubi_picking_2 = repo::catalogo::crear_ubicacion(
        conn,
        &NuevaUbicacion {
            codigo: "RACK-A1-N2-P1".into(),
            nombre: Some("Posición 1".into()),
            seccion_id: Some(seccion_n2.id.clone()),
            rack_id: None,
            zona_id: None,
            tipo: Some("PICKING".into()),
            capacidad_maxima: Some(5_000),
            created_by: Some(by.into()),
        },
    )?;
    let ubi_recepcion = repo::catalogo::crear_ubicacion(
        conn,
        &NuevaUbicacion {
            codigo: "RECEPCION-01".into(),
            nombre: Some("Andén de recepción".into()),
            seccion_id: None,
            rack_id: None,
            zona_id: Some(zona_recepcion.id.clone()),
            tipo: Some("RECEPCION".into()),
            capacidad_maxima: None,
            created_by: Some(by.into()),
        },
    )?;
    let _ubi_devolucion = repo::catalogo::crear_ubicacion(
        conn,
        &NuevaUbicacion {
            codigo: "DEVOLUCION-01".into(),
            nombre: Some("Zona de devoluciones".into()),
            seccion_id: None,
            rack_id: None,
            zona_id: Some(zona_devolucion.id.clone()),
            tipo: Some("DEVOLUCION".into()),
            capacidad_maxima: None,
            created_by: Some(by.into()),
        },
    )?;

    // 6. Productos: uno simple, uno con stock a punto de quedar bajo, uno con
    //    lote, uno con lote + vencimiento (uno de sus lotes ya vencido).
    let tornillo = repo::catalogo::crear_producto(
        conn,
        &NuevoProducto {
            costo_unitario: None,
            sku: "SKU-1001".into(),
            nombre: "Tornillo M6 x 25mm".into(),
            descripcion: Some("Tornillo hexagonal galvanizado".into()),
            categoria_id: Some(cat_fijaciones.id.clone()),
            uom_base_id: pza.id.clone(),
            uom_venta_id: Some(caja_uom.id.clone()),
            uom_compra_id: Some(caja_uom.id.clone()),
            codigo_barras: Some("7750001000015".into()),
            peso_unitario: Some(0.008),
            volumen_unitario: None,
            stock_minimo: Some(500),
            stock_maximo: Some(20_000),
            controla_lote: false,
            controla_vencimiento: false,
            perecedero: false,
            created_by: Some(by.into()),
        },
    )?;
    let arandela = repo::catalogo::crear_producto(
        conn,
        &NuevoProducto {
            costo_unitario: None,
            sku: "SKU-1002".into(),
            nombre: "Arandela plana 5/16\"".into(),
            descripcion: None,
            categoria_id: Some(cat_fijaciones.id.clone()),
            uom_base_id: pza.id.clone(),
            uom_venta_id: None,
            uom_compra_id: None,
            codigo_barras: Some("7750001000022".into()),
            peso_unitario: Some(0.003),
            volumen_unitario: None,
            stock_minimo: Some(2_000),
            stock_maximo: None,
            controla_lote: false,
            controla_vencimiento: false,
            perecedero: false,
            created_by: Some(by.into()),
        },
    )?;
    let cinta = repo::catalogo::crear_producto(
        conn,
        &NuevoProducto {
            costo_unitario: None,
            sku: "SKU-1003".into(),
            nombre: "Cinta de embalaje 48mm".into(),
            descripcion: Some("Rollo de 100m".into()),
            categoria_id: Some(cat_embalaje.id.clone()),
            uom_base_id: pza.id.clone(),
            uom_venta_id: None,
            uom_compra_id: None,
            codigo_barras: None,
            peso_unitario: Some(0.35),
            volumen_unitario: None,
            stock_minimo: Some(20),
            stock_maximo: Some(500),
            controla_lote: true,
            controla_vencimiento: false,
            perecedero: false,
            created_by: Some(by.into()),
        },
    )?;
    let adhesivo = repo::catalogo::crear_producto(
        conn,
        &NuevoProducto {
            costo_unitario: None,
            sku: "SKU-1004".into(),
            nombre: "Adhesivo de contacto 1kg".into(),
            descripcion: Some("Pegamento industrial".into()),
            categoria_id: Some(cat_embalaje.id.clone()),
            uom_base_id: kg.id.clone(),
            uom_venta_id: None,
            uom_compra_id: None,
            codigo_barras: None,
            peso_unitario: Some(1.0),
            volumen_unitario: None,
            stock_minimo: Some(10),
            stock_maximo: Some(200),
            controla_lote: true,
            controla_vencimiento: true,
            perecedero: true,
            created_by: Some(by.into()),
        },
    )?;

    // 7. Lotes: uno normal, uno por vencer pronto, uno ya vencido.
    // `fecha_mas_dias` espera fecha pura "YYYY-MM-DD" (así la llaman todos
    // los usos reales en repo::alerta/repo::trazabilidad) — pasarle la
    // marca de tiempo completa de `ahora()` hace que el parseo falle en
    // silencio y devuelva la fecha de entrada sin modificar.
    let hoy = ahora()[..10].to_string();
    let lote_cinta = repo::catalogo::crear_lote(
        conn,
        &NuevoLote {
            numero: "LOTE-CINTA-2026-01".into(),
            producto_id: cinta.id.clone(),
            fecha_fabricacion: None,
            fecha_vencimiento: None,
            origen: Some("Proveedor local".into()),
            notas: None,
            created_by: Some(by.into()),
        },
    )?;
    let lote_adhesivo_por_vencer = repo::catalogo::crear_lote(
        conn,
        &NuevoLote {
            numero: "LOTE-ADH-2026-A".into(),
            producto_id: adhesivo.id.clone(),
            fecha_fabricacion: None,
            fecha_vencimiento: Some(fecha_mas_dias(&hoy, 15)),
            origen: Some("Producción propia".into()),
            notas: None,
            created_by: Some(by.into()),
        },
    )?;
    let lote_adhesivo_vencido = repo::catalogo::crear_lote(
        conn,
        &NuevoLote {
            numero: "LOTE-ADH-2025-Z".into(),
            producto_id: adhesivo.id.clone(),
            fecha_fabricacion: None,
            fecha_vencimiento: Some(fecha_mas_dias(&hoy, -10)),
            origen: Some("Producción propia".into()),
            notas: Some("Lote antiguo, pendiente de dar de baja".into()),
            created_by: Some(by.into()),
        },
    )?;

    // 8. Movimientos aprobados: entrada de compra que arma el stock inicial.
    let entrada = crear_y_aprobar(
        conn,
        by,
        "ENTRADA",
        "COMPRA",
        Some(proveedor.id.clone()),
        None,
        None,
        Some("OC-2026-001".into()),
        vec![
            linea(
                &tornillo.id,
                None,
                15_000,
                None,
                Some(ubi_picking_1.id.clone()),
            ),
            linea(
                &arandela.id,
                None,
                2_500,
                None,
                Some(ubi_picking_1.id.clone()),
            ),
            linea(
                &cinta.id,
                Some(lote_cinta.id.clone()),
                120,
                None,
                Some(ubi_picking_2.id.clone()),
            ),
            linea(
                &adhesivo.id,
                Some(lote_adhesivo_por_vencer.id.clone()),
                40,
                None,
                Some(ubi_recepcion.id.clone()),
            ),
            linea(
                &adhesivo.id,
                Some(lote_adhesivo_vencido.id.clone()),
                15,
                None,
                Some(ubi_recepcion.id.clone()),
            ),
        ],
    )?;
    repo::comentario::crear_comentario(
        conn,
        &NuevoComentario {
            entidad: "movimiento".into(),
            entidad_id: entrada.id.clone(),
            texto: "Recepción completa, mercancía en buen estado.".into(),
            usuario_id: by.to_string(),
        },
    )?;

    // 9. Salida a cliente (consume tornillo).
    crear_y_aprobar(
        conn,
        by,
        "SALIDA",
        "CLIENTE",
        None,
        Some(cliente.id.clone()),
        None,
        Some("GUIA-2026-045".into()),
        vec![linea(
            &tornillo.id,
            None,
            3_000,
            Some(ubi_picking_1.id.clone()),
            None,
        )],
    )?;

    // 10. Salida grande de arandela: deja el saldo por debajo de su mínimo
    //     (2500 - 1200 = 1300 < 2000) para disparar la alerta de stock bajo.
    crear_y_aprobar(
        conn,
        by,
        "SALIDA",
        "CLIENTE",
        None,
        Some(cliente.id.clone()),
        None,
        Some("GUIA-2026-046".into()),
        vec![linea(
            &arandela.id,
            None,
            1_200,
            Some(ubi_picking_1.id.clone()),
            None,
        )],
    )?;

    // 11. Traslado intra-almacén de tornillo (picking 1 -> picking 2).
    let traslado = NuevoTraslado {
        producto_id: tornillo.id.clone(),
        lote_id: None,
        cantidad: 1_000,
        origen_ubicacion_id: ubi_picking_1.id.clone(),
        destino_ubicacion_id: ubi_picking_2.id.clone(),
        caja_origen_id: None,
        caja_destino_id: None,
        documento_referencia: Some("TRASLADO-2026-001".into()),
        notas: Some("Reubicación para picking de pedidos grandes.".into()),
        created_by: by.to_string(),
    };
    let traslado_creado = repo::movimiento::crear_traslado(conn, &traslado)?;
    repo::movimiento::aprobar_movimiento(conn, &traslado_creado.salida.id, by)?;

    // 12. Ajuste positivo: sobrante de cinta encontrado en picking 2.
    crear_y_aprobar(
        conn,
        by,
        "AJUSTE",
        "AJUSTE_POSITIVO",
        None,
        None,
        Some("Sobrante encontrado en revisión física de picking.".into()),
        None,
        vec![linea(
            &cinta.id,
            Some(lote_cinta.id.clone()),
            10,
            None,
            Some(ubi_picking_2.id.clone()),
        )],
    )?;

    // 13. Movimiento que queda pendiente de aprobación (dispara alerta).
    let pendiente = repo::movimiento::crear_movimiento(
        conn,
        &NuevoMovimiento {
            tipo: "ENTRADA".into(),
            sub_tipo: "COMPRA".into(),
            fecha_movimiento: None,
            motivo: None,
            origen_ubicacion_id: None,
            destino_ubicacion_id: None,
            proveedor_id: Some(proveedor.id.clone()),
            cliente_id: None,
            sesion_inventario_id: None,
            documento_referencia: Some("OC-2026-002".into()),
            notas: Some("Pendiente de validar cantidades con el proveedor.".into()),
            lineas: vec![linea(
                &tornillo.id,
                None,
                5_000,
                None,
                Some(ubi_picking_1.id.clone()),
            )],
            created_by: by.to_string(),
        },
    )?;
    repo::movimiento::enviar_a_aprobacion(conn, &pendiente.id, by)?;

    // 14. Sesión de inventario cerrada (para ver precisión) + una en curso
    //     (para que el usuario practique registrar conteos y cerrarla).
    let sesion_cerrada = repo::inventario::crear_sesion(
        conn,
        &NuevaSesionInventario {
            tipo: "CICLICO".into(),
            almacen_id: almacen.id.clone(),
            alcance: Some("Picking 1 — ciclo mensual".into()),
            fecha_inicio: Some(fecha_mas_dias(&hoy, -2)),
            fecha_fin: None,
            responsable_id: Some(by.into()),
            conteo_ciego: false,
            exige_doble_conteo: false,
            created_by: by.to_string(),
        },
    )?;
    // Tornillo: saldo real 15000-3000-1000=11000 → cuenta exacta (concilia).
    repo::inventario::registrar_conteo(
        conn,
        &NuevoConteo {
            sesion_id: sesion_cerrada.id.clone(),
            ubicacion_id: ubi_picking_1.id.clone(),
            producto_id: tornillo.id.clone(),
            lote_id: None,
            cantidad_contada: 11_000,
            conteo_numero: 1,
            usuario_contador_id: by.to_string(),
            nota: None,
        },
    )?;
    // Arandela: saldo real 1300, se cuenta 1280 → faltante de 20 (genera ajuste al cerrar).
    repo::inventario::registrar_conteo(
        conn,
        &NuevoConteo {
            sesion_id: sesion_cerrada.id.clone(),
            ubicacion_id: ubi_picking_1.id.clone(),
            producto_id: arandela.id.clone(),
            lote_id: None,
            cantidad_contada: 1_280,
            conteo_numero: 1,
            usuario_contador_id: by.to_string(),
            nota: Some("Caja abierta con unidades sueltas".into()),
        },
    )?;
    repo::inventario::cerrar_sesion(conn, &sesion_cerrada.id, by)?;

    repo::inventario::crear_sesion(
        conn,
        &NuevaSesionInventario {
            tipo: "CICLICO".into(),
            almacen_id: almacen.id.clone(),
            alcance: Some("Picking 2 — verificación de cinta y adhesivo".into()),
            fecha_inicio: Some(hoy.clone()),
            fecha_fin: None,
            responsable_id: Some(by.into()),
            conteo_ciego: true,
            exige_doble_conteo: false,
            created_by: by.to_string(),
        },
    )?;

    // 15. Recalcular alertas (stock bajo, lote por vencer/vencido, movimiento
    //     pendiente) para que aparezcan de inmediato en el dashboard.
    repo::alerta::regenerar_alertas(conn, 30)?;

    Ok(())
}
