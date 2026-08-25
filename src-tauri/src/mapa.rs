//! Motor de layout físico del mapa 2D/3D (SPEC §14 regla de solapes).
//!
//! Cada elemento del árbol físico posicionado en el mapa ocupa un rectángulo
//! alineado a ejes (AABB). La matriz de `solape_prohibido` define qué pares de
//! tipos no pueden coincidir en el plano: nada consigo mismo, los pasillos son
//! espacio de tránsito (no pueden tener racks ni ubicaciones encima) y las
//! zonas **contienen** a sus hijos (contención permitida, nunca bloqueada).
//!
//! La validación vive en Rust (STACK §8.7): el frontend hace feedback en vivo
//! con la misma matriz (`mapa-geometria.ts` es su espejo documentado), pero el
//! backend es quien rechaza de verdad cualquier posición/tamaño inválido.
use crate::error::{AppError, AppResult};
use rusqlite::Connection;

/// Matriz de pares prohibidos (SPEC §14, regla de layout físico):
/// - Cada tipo consigo mismo: nunca.
/// - Pasillo vs rack/ubicación: el pasillo es espacio de tránsito.
/// - Rack vs ubicación: una ubicación no flota sobre otro rack.
/// - Zona vs hijos (pasillo/rack/ubicación): contención permitida.
/// - Zona vs ubicación directa: contención permitida (árbol simplificado).
pub fn solape_prohibido(a: TipoNodo, b: TipoNodo) -> bool {
    use TipoNodo::{Pasillo, Rack, Ubicacion, Zona};
    matches!(
        (a, b),
        (Zona, Zona)
            | (Pasillo, Pasillo)
            | (Rack, Rack)
            | (Ubicacion, Ubicacion)
            | (Pasillo, Rack)
            | (Rack, Pasillo)
            | (Pasillo, Ubicacion)
            | (Ubicacion, Pasillo)
            | (Rack, Ubicacion)
            | (Ubicacion, Rack)
    )
}

pub const LADO_MINIMO: f64 = 10.0;

/// Tamaño fijo de las ubicaciones en el plano (bins uniformes; no son
/// redimensionables). Espejo de las constantes del frontend.
pub const UBICACION_ANCHO: f64 = 70.0;
pub const UBICACION_PROFUNDIDAD: f64 = 48.0;

/// Tipos de nodo que participan del plano del almacén.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum TipoNodo {
    Zona,
    Pasillo,
    Rack,
    Ubicacion,
}

impl TipoNodo {
    pub fn as_str(&self) -> &'static str {
        match self {
            TipoNodo::Zona => "zona",
            TipoNodo::Pasillo => "pasillo",
            TipoNodo::Rack => "rack",
            TipoNodo::Ubicacion => "ubicacion",
        }
    }

    pub fn etiqueta(&self) -> &'static str {
        match self {
            TipoNodo::Zona => "zona",
            TipoNodo::Pasillo => "pasillo",
            TipoNodo::Rack => "rack",
            TipoNodo::Ubicacion => "ubicación",
        }
    }

    pub fn desde_str(s: &str) -> AppResult<TipoNodo> {
        match s {
            "zona" => Ok(TipoNodo::Zona),
            "pasillo" => Ok(TipoNodo::Pasillo),
            "rack" => Ok(TipoNodo::Rack),
            "ubicacion" => Ok(TipoNodo::Ubicacion),
            otro => Err(AppError::CampoInvalido(format!(
                "'{otro}' no es un tipo de nodo del mapa (zona/pasillo/rack/ubicacion)"
            ))),
        }
    }
}

/// Rectángulo alineado a ejes. `(x, y)` es la esquina superior izquierda,
/// igual que las coordenadas que guarda el mapa (SVG y escena 3D escalada).
#[derive(Debug, Clone, Copy, PartialEq)]
pub struct Rect {
    pub x: f64,
    pub y: f64,
    pub ancho: f64,
    pub profundo: f64,
}

/// Solape AABB con desigualdad estricta: tocarse por el borde NO es solape
/// (racks adyacentes comparten borde legítimamente).
pub fn rects_solapan(a: &Rect, b: &Rect) -> bool {
    a.x < b.x + b.ancho && b.x < a.x + a.ancho && a.y < b.y + b.profundo && b.y < a.y + a.profundo
}

/// Dimensiones mínimas por tipo: evita rects degenerados imposibles de
/// seleccionar o arrastrar en el lienzo.
pub fn validar_dimensiones(tipo: TipoNodo, rect: &Rect) -> AppResult<()> {
    let minimo = match tipo {
        // Las ubicaciones no son redimensionables; nada que validar aquí.
        TipoNodo::Ubicacion => return Ok(()),
        _ => LADO_MINIMO,
    };
    if !rect.ancho.is_finite()
        || !rect.profundo.is_finite()
        || rect.ancho < minimo
        || rect.profundo < minimo
    {
        return Err(AppError::DimensionInvalida(tipo.etiqueta(), minimo as i64));
    }
    Ok(())
}

/// Un elemento ya posicionado del plano, tal como sale de la consulta.
#[derive(Debug)]
pub struct NodoPlano {
    pub tipo: TipoNodo,
    pub id: String,
    pub codigo: String,
    pub rect: Rect,
}

/// Todos los elementos activos y posicionados de un almacén, en una sola
/// consulta (el almacén de cada nodo se resuelve por transitividad del árbol,
/// SPEC §3.13). Los sin posición no participan: aún no están en el plano.
fn nodos_del_almacen(conn: &Connection, almacen_id: &str) -> AppResult<Vec<NodoPlano>> {
    let mut stmt = conn.prepare(
        "SELECT 'zona' AS tipo, z.id, z.codigo, z.pos_x, z.pos_y, z.ancho, z.profundidad
           FROM zonas z
          WHERE z.almacen_id = ?1 AND z.activo = 1 AND z.pos_x IS NOT NULL AND z.pos_y IS NOT NULL
         UNION ALL
         SELECT 'pasillo', p.id, p.codigo, p.pos_x, p.pos_y, p.ancho, p.profundidad
           FROM pasillos p JOIN zonas z ON z.id = p.zona_id
          WHERE z.almacen_id = ?1 AND p.activo = 1 AND p.pos_x IS NOT NULL AND p.pos_y IS NOT NULL
         UNION ALL
         SELECT 'rack', r.id, r.codigo, r.pos_x, r.pos_y, r.ancho, r.profundidad
           FROM racks r JOIN zonas z ON z.id = r.zona_id
          WHERE z.almacen_id = ?1 AND r.activo = 1 AND r.pos_x IS NOT NULL AND r.pos_y IS NOT NULL
         UNION ALL
         SELECT 'ubicacion', u.id, u.codigo, u.pos_x, u.pos_y, ?, ?
           FROM ubicaciones u
           LEFT JOIN secciones se ON se.id = u.seccion_id
           LEFT JOIN racks ru ON ru.id = u.rack_id
           LEFT JOIN racks rs ON rs.id = se.rack_id
           LEFT JOIN zonas z ON z.id = COALESCE(ru.zona_id, rs.zona_id, u.zona_id)
          WHERE z.almacen_id = ?1 AND u.activo = 1 AND u.pos_x IS NOT NULL AND u.pos_y IS NOT NULL",
    )?;
    let filas = stmt.query_map(
        rusqlite::params![almacen_id, UBICACION_ANCHO, UBICACION_PROFUNDIDAD],
        |r| {
            let tipo: String = r.get(0)?;
            Ok((
                tipo,
                r.get::<_, String>(1)?,
                r.get::<_, String>(2)?,
                r.get::<_, f64>(3)?,
                r.get::<_, f64>(4)?,
                r.get::<_, f64>(5)?,
                r.get::<_, f64>(6)?,
            ))
        },
    )?;
    let mut nodos = Vec::new();
    for fila in filas {
        let (tipo, id, codigo, x, y, ancho, profundo) = fila?;
        nodos.push(NodoPlano {
            tipo: TipoNodo::desde_str(&tipo)?,
            id,
            codigo,
            rect: Rect {
                x,
                y,
                ancho,
                profundo,
            },
        });
    }
    Ok(nodos)
}

/// Verifica que `rect` (el candidato para `tipo_propio` con id `id_propio`)
/// no se solape con ningún par prohibido ya posicionado en el almacén.
/// Devuelve el primer solape encontrado con los códigos involucrados, para
/// que el mensaje diga exactamente qué choca con qué.
pub fn validar_colisiones(
    conn: &Connection,
    almacen_id: &str,
    tipo_propio: TipoNodo,
    id_propio: &str,
    codigo_propio: &str,
    rect: &Rect,
) -> AppResult<()> {
    for nodo in nodos_del_almacen(conn, almacen_id)? {
        if nodo.id == id_propio && nodo.tipo == tipo_propio {
            continue;
        }
        if solape_prohibido(tipo_propio, nodo.tipo) && rects_solapan(rect, &nodo.rect) {
            return Err(AppError::SolapeMapa {
                tipo_a: tipo_propio.etiqueta(),
                codigo_a: codigo_propio.to_string(),
                tipo_b: nodo.tipo.etiqueta(),
                codigo_b: nodo.codigo,
            });
        }
    }
    Ok(())
}

// ============ Crear desde el mapa (modo construcción) ============

/// Petición para crear un elemento dibujando su rectángulo en el mapa.
/// Las ubicaciones no se crean por este camino: viven dentro del árbol
/// (sección/rack/zona) y su creación masiva es otro flujo.
#[derive(Debug, serde::Deserialize)]
pub struct CreacionEnMapa {
    pub tipo: String,
    pub almacen_id: String,
    /// Obligatoria para pasillo/rack (SPEC §3.3/§3.3b): el frontend la resuelve
    /// como la zona que contiene el centro del rect; aquí se revalida dueño.
    #[serde(default)]
    pub zona_id: Option<String>,
    pub x: f64,
    pub y: f64,
    pub ancho: f64,
    pub profundidad: f64,
}

/// Elemento creado desde el mapa (para seleccionarlo en el lienzo al soltar).
#[derive(Debug, serde::Serialize)]
pub struct NodoCreado {
    pub tipo: &'static str,
    pub id: String,
    pub codigo: String,
}

/// Primer código libre para `tipo` en el almacén, con sufijo numérico
/// consecutivo (`Z-01`, `PAS-07`, `RACK-12`). Consulta dentro de la misma
/// conexión/tx del creador, así que ve los insertados aún no confirmados.
fn sugerir_codigo(conn: &Connection, almacen_id: &str, tipo: TipoNodo) -> AppResult<String> {
    let prefijo = match tipo {
        TipoNodo::Zona => "Z",
        TipoNodo::Pasillo => "PAS",
        TipoNodo::Rack => "RACK",
        TipoNodo::Ubicacion => {
            return Err(AppError::CampoInvalido(
                "Las ubicaciones no se crean desde el mapa".into(),
            ));
        }
    };
    for n in 1..=9999u32 {
        let candidato = format!("{prefijo}-{n:02}");
        let existe = match tipo {
            TipoNodo::Zona => conn.query_row(
                "SELECT COUNT(*) FROM zonas WHERE almacen_id = ?1 AND codigo = ?2",
                rusqlite::params![almacen_id, candidato],
                |r| r.get::<_, i64>(0),
            )?,
            // Unicidad por almacén completo (SPEC §3.3/§3.3b): resuelta por zona.
            _ => conn.query_row(
                match tipo {
                    TipoNodo::Pasillo => "SELECT COUNT(*) FROM pasillos p JOIN zonas z ON z.id = p.zona_id WHERE z.almacen_id = ?1 AND p.codigo = ?2",
                    _ => "SELECT COUNT(*) FROM racks r JOIN zonas z ON z.id = r.zona_id WHERE z.almacen_id = ?1 AND r.codigo = ?2",
                },
                rusqlite::params![almacen_id, candidato],
                |r| r.get::<_, i64>(0),
            )?,
        };
        if existe == 0 {
            return Ok(candidato);
        }
    }
    Err(AppError::CampoInvalido(format!(
        "No hay códigos disponibles para {} en este almacén",
        tipo.etiqueta()
    )))
}

/// Crea un elemento dibujado en el mapa: sugiere código, crea vía las mismas
/// funciones de catálogo (permiso `crear` y auditoría de SPEC §4.5 incluidos)
/// y posiciona/redimensiona vía los mismos `mover_*` (que validan dimensiones
/// y solapes). Todo en una transacción: si el rect choca, no queda nada.
pub fn crear_en_mapa(
    conn: &Connection,
    pedido: &CreacionEnMapa,
    actor: &str,
) -> AppResult<NodoCreado> {
    let tipo = TipoNodo::desde_str(&pedido.tipo)?;
    if tipo == TipoNodo::Ubicacion {
        return Err(AppError::CampoInvalido(
            "Las ubicaciones no se crean desde el mapa: se gestionan dentro de su rack o zona"
                .into(),
        ));
    }
    let rect = Rect {
        x: pedido.x,
        y: pedido.y,
        ancho: pedido.ancho,
        profundo: pedido.profundidad,
    };
    validar_dimensiones(tipo, &rect)?;

    let tx = conn.unchecked_transaction()?;
    // Para pasillo/rack: la zona contenedora debe existir, estar activa y ser
    // del mismo almacén (el frontend la resuelve por punto central).
    if matches!(tipo, TipoNodo::Pasillo | TipoNodo::Rack) {
        validar_zona_contenedora(&tx, pedido.zona_id.as_deref(), &pedido.almacen_id)?;
    }
    let codigo = sugerir_codigo(&tx, &pedido.almacen_id, tipo)?;
    let creado = crear_elemento_tx(
        &tx,
        tipo,
        &pedido.almacen_id,
        pedido.zona_id.as_deref(),
        &codigo,
        &rect,
        actor,
    )?;
    tx.commit()?;
    Ok(creado)
}

/// Zona contenedora de un pasillo/rack dibujado: obligatoria, activa y del
/// mismo almacén (SPEC §3.3/§3.3b — el hijo pertenece a su zona).
fn validar_zona_contenedora(
    conn: &Connection,
    zona_id: Option<&str>,
    almacen_id: &str,
) -> AppResult<()> {
    let zona_id = zona_id
        .ok_or_else(|| AppError::CampoRequerido("zona_id: dibuja dentro de una zona".into()))?;
    let zona = crate::repo::catalogo::obtener_zona(conn, zona_id)?
        .ok_or_else(|| AppError::NoEncontrado("zona", zona_id.to_string()))?;
    if !zona.activo || zona.almacen_id != almacen_id {
        return Err(AppError::CampoInvalido(
            "La zona indicada no pertenece a este almacén o está inactiva".into(),
        ));
    }
    Ok(())
}

/// Crea el elemento con su código y aplica posición/tamaño vía los mismos
/// `mover_*` (que revalidan dimensiones y solapes). Debe llamarse dentro de
/// una transacción ya abierta; los permisos `crear`/`editar` los chequean
/// las funciones de catálogo (en la matriz por defecto todo rol que crea
/// catálogos también edita, SPEC §4.4).
fn crear_elemento_tx(
    tx: &rusqlite::Transaction<'_>,
    tipo: TipoNodo,
    almacen_id: &str,
    zona_id: Option<&str>,
    codigo: &str,
    rect: &Rect,
    actor: &str,
) -> AppResult<NodoCreado> {
    let pos = crate::domain::catalogo::PosicionMapa {
        pos_x: Some(rect.x),
        pos_y: Some(rect.y),
        pos_z: None,
        altura: None,
        ancho: Some(rect.ancho),
        profundidad: Some(rect.profundo),
    };
    match tipo {
        TipoNodo::Zona => {
            let nueva = crate::domain::catalogo::NuevaZona {
                codigo: codigo.to_string(),
                nombre: format!("Zona {codigo}"),
                descripcion: None,
                almacen_id: almacen_id.to_string(),
                created_by: Some(actor.to_string()),
            };
            let zona = crate::repo::catalogo::crear_zona(tx, &nueva)?;
            crate::repo::catalogo::mover_zona(tx, &zona.id, &pos, actor)?;
            Ok(NodoCreado {
                tipo: tipo.as_str(),
                id: zona.id,
                codigo: codigo.to_string(),
            })
        }
        TipoNodo::Pasillo => {
            let nuevo = crate::domain::catalogo::NuevoPasillo {
                codigo: codigo.to_string(),
                nombre: Some(format!("Pasillo {codigo}")),
                zona_id: zona_id.expect("validado arriba").to_string(),
                created_by: Some(actor.to_string()),
            };
            let pasillo = crate::repo::catalogo::crear_pasillo(tx, &nuevo)?;
            crate::repo::catalogo::mover_pasillo(tx, &pasillo.id, &pos, actor)?;
            Ok(NodoCreado {
                tipo: tipo.as_str(),
                id: pasillo.id,
                codigo: codigo.to_string(),
            })
        }
        _ => {
            let nuevo = crate::domain::catalogo::NuevoRack {
                codigo: codigo.to_string(),
                nombre: Some(format!("Rack {codigo}")),
                tipo: None,
                zona_id: zona_id.expect("validado arriba").to_string(),
                pasillo_id: None,
                created_by: Some(actor.to_string()),
            };
            let rack = crate::repo::catalogo::crear_rack(tx, &nuevo)?;
            crate::repo::catalogo::mover_rack(tx, &rack.id, &pos, actor)?;
            Ok(NodoCreado {
                tipo: tipo.as_str(),
                id: rack.id,
                codigo: codigo.to_string(),
            })
        }
    }
}

// ============ Asistente de layout base (prototipar primero) ============

const MARGEN_RECINTO: f64 = 20.0;
const GAP_RACKS: f64 = 10.0;

/// Pedido del asistente "Generar layout base": siembra un prototipo completo
/// (zona contenedora + pasillos paralelos + racks apilados entre ellos) con
/// geometría garantizada sin solapes, para ajustar después a mano.
#[derive(Debug, serde::Deserialize)]
pub struct LayoutBasePedido {
    pub almacen_id: String,
    /// Dimensiones del recinto: la zona contenedora que se creará.
    pub ancho_recinto: f64,
    pub profundo_recinto: f64,
    /// Nº de pasillos paralelos verticales (1-12); alterna columnas
    /// [bloque de racks, pasillo, ..., bloque de racks].
    pub pasillos: i64,
    /// Racks apilados verticalmente por bloque (1-20).
    pub racks_por_bloque: i64,
}

/// Resumen de lo generado (para el toast de confirmación).
#[derive(Debug, serde::Serialize)]
pub struct LayoutGenerado {
    pub zonas: usize,
    pub pasillos: usize,
    pub racks: usize,
}

/// Genera el layout base en UNA transacción. Solo disponible en almacenes sin
/// zonas activas: es la semilla del prototipo, no un mezclador de layouts.
pub fn generar_layout_base(
    conn: &Connection,
    pedido: &LayoutBasePedido,
    actor: &str,
) -> AppResult<LayoutGenerado> {
    use crate::security::puede;
    puede(conn, Some(actor), "zona", "crear")?;
    puede(conn, Some(actor), "pasillo", "crear")?;
    puede(conn, Some(actor), "rack", "crear")?;

    let (ancho, profundo) = (pedido.ancho_recinto, pedido.profundo_recinto);
    let (np, nb) = (pedido.pasillos, pedido.racks_por_bloque);
    if !(200.0..=100000.0).contains(&ancho)
        || !(200.0..=100000.0).contains(&profundo)
        || !(1..=12).contains(&np)
        || !(1..=20).contains(&nb)
    {
        return Err(AppError::CampoInvalido(
            "Parámetros fuera de rango: recinto 200-100000 unidades, pasillos 1-12, racks por bloque 1-20".into(),
        ));
    }

    let tx = conn.unchecked_transaction()?;
    let hay_zonas: i64 = tx.query_row(
        "SELECT COUNT(*) FROM zonas WHERE almacen_id = ?1 AND activo = 1",
        [&pedido.almacen_id],
        |r| r.get(0),
    )?;
    if hay_zonas > 0 {
        return Err(AppError::CampoInvalido(
            "El almacén ya tiene zonas: el layout base solo genera el prototipo inicial".into(),
        ));
    }

    // Geometría: columnas alternadas [rack-bloque, pasillo, ..., rack-bloque].
    let usable_w = ancho - 2.0 * MARGEN_RECINTO;
    let usable_h = profundo - 2.0 * MARGEN_RECINTO;
    let total_cols = (np * 2 + 1) as f64;
    let col_w = usable_w / total_cols;
    let rack_h = (usable_h - GAP_RACKS * (nb as f64 + 1.0)) / nb as f64;
    if col_w < LADO_MINIMO || rack_h < LADO_MINIMO {
        return Err(AppError::CampoInvalido(
            "El recinto es pequeño para tantos elementos: aumenta las medidas o reduce pasillos/racks".into(),
        ));
    }

    let mut generados = LayoutGenerado {
        zonas: 0,
        pasillos: 0,
        racks: 0,
    };

    let codigo_zona = sugerir_codigo(&tx, &pedido.almacen_id, TipoNodo::Zona)?;
    let contenedora = crear_elemento_tx(
        &tx,
        TipoNodo::Zona,
        &pedido.almacen_id,
        None,
        &codigo_zona,
        &Rect {
            x: 0.0,
            y: 0.0,
            ancho,
            profundo,
        },
        actor,
    )?;
    generados.zonas += 1;
    let zona_id = Some(contenedora.id.as_str());

    for col in 0..total_cols as i64 {
        let x = MARGEN_RECINTO + col as f64 * col_w;
        if col % 2 == 1 {
            // Columna impar: pasillo vertical de alto completo.
            let codigo = sugerir_codigo(&tx, &pedido.almacen_id, TipoNodo::Pasillo)?;
            crear_elemento_tx(
                &tx,
                TipoNodo::Pasillo,
                &pedido.almacen_id,
                zona_id,
                &codigo,
                &Rect {
                    x,
                    y: MARGEN_RECINTO,
                    ancho: col_w,
                    profundo: usable_h,
                },
                actor,
            )?;
            generados.pasillos += 1;
        } else {
            // Columna par: bloque de racks apilados con separación.
            for fila in 0..nb {
                let y = MARGEN_RECINTO + GAP_RACKS + fila as f64 * (rack_h + GAP_RACKS);
                let codigo = sugerir_codigo(&tx, &pedido.almacen_id, TipoNodo::Rack)?;
                crear_elemento_tx(
                    &tx,
                    TipoNodo::Rack,
                    &pedido.almacen_id,
                    zona_id,
                    &codigo,
                    &Rect {
                        x,
                        y,
                        ancho: col_w,
                        profundo: rack_h,
                    },
                    actor,
                )?;
                generados.racks += 1;
            }
        }
    }

    tx.commit()?;
    Ok(generados)
}
