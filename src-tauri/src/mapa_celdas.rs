//! Celdas de un rack derivadas de sus ubicaciones (mapa 2D/3D de precisión real).
//!
//! Las ubicaciones de un rack no son rectángulos sueltos: se colocan DENTRO del
//! rack por nivel y bahía. Esta función pura es la fuente de la regla en Rust y
//! debe seguir siendo idéntica a `derivarCeldasRack()` del frontend.
//!
//! REGLA (contrato, no cambiar sin actualizar el espejo TS):
//! - `nivel`: primer grupo de dígitos de `secciones.nivel` ("1", "2", "N1",
//!   "Nivel 3" dan 1, 2, 1, 3). Sin sección, sin dígitos o valor 0 => nivel 1.
//!   Es base 1 (nivel 1 = el más bajo).
//! - `bahia`: posición base 1 de la ubicación dentro de (rack, nivel), ordenada
//!   por `codigo` ascendente con comparación simple de texto (sin locale ni
//!   mayúsculas/minúsculas especiales), desempate por `ubicacion_id`.
//! - `n_bahias`: cantidad de ubicaciones de ESE nivel; el ancho de una celda es
//!   `ancho_rack / n_bahias`.
//! - Salida ordenada por (nivel, bahia).
use crate::error::AppResult;
use rusqlite::Connection;

/// Una ubicación del rack con el `nivel` de su sección (si tiene).
#[derive(Debug, Clone)]
pub struct EntradaCelda {
    pub ubicacion_id: String,
    pub codigo: String,
    pub seccion_nivel: Option<String>,
}

#[derive(Debug, Clone, PartialEq, Eq, serde::Serialize)]
pub struct Celda {
    pub ubicacion_id: String,
    pub nivel: u32,
    pub bahia: u32,
    pub n_bahias: u32,
}

/// Número de nivel de un texto de sección (ver regla del módulo).
pub fn nivel_de_texto(texto: Option<&str>) -> u32 {
    let Some(t) = texto else { return 1 };
    let digitos: String = t
        .chars()
        .skip_while(|c| !c.is_ascii_digit())
        .take_while(|c| c.is_ascii_digit())
        .collect();
    match digitos.parse::<u32>() {
        Ok(n) if n >= 1 => n,
        _ => 1,
    }
}

pub fn derivar_celdas_rack(entradas: &[EntradaCelda]) -> Vec<Celda> {
    let mut ordenadas: Vec<(u32, &EntradaCelda)> = entradas
        .iter()
        .map(|e| (nivel_de_texto(e.seccion_nivel.as_deref()), e))
        .collect();
    ordenadas.sort_by(|(na, a), (nb, b)| {
        na.cmp(nb)
            .then_with(|| a.codigo.cmp(&b.codigo))
            .then_with(|| a.ubicacion_id.cmp(&b.ubicacion_id))
    });
    let mut celdas = Vec::with_capacity(ordenadas.len());
    let mut i = 0;
    while i < ordenadas.len() {
        let nivel = ordenadas[i].0;
        let fin = ordenadas[i..]
            .iter()
            .position(|(n, _)| *n != nivel)
            .map_or(ordenadas.len(), |p| i + p);
        let n_bahias = (fin - i) as u32;
        for (k, (_, e)) in ordenadas[i..fin].iter().enumerate() {
            celdas.push(Celda {
                ubicacion_id: e.ubicacion_id.clone(),
                nivel,
                bahia: k as u32 + 1,
                n_bahias,
            });
        }
        i = fin;
    }
    celdas
}

/// Celdas de un rack leyendo sus ubicaciones activas de la base (las que
/// cuelgan directo del rack o de una de sus secciones).
pub fn celdas_de_rack(conn: &Connection, rack_id: &str) -> AppResult<Vec<Celda>> {
    let mut stmt = conn.prepare(
        "SELECT u.id, u.codigo, se.nivel
           FROM ubicaciones u
           LEFT JOIN secciones se ON se.id = u.seccion_id
          WHERE u.activo = 1 AND (u.rack_id = ?1 OR se.rack_id = ?1)",
    )?;
    let entradas = stmt
        .query_map([rack_id], |r| {
            Ok(EntradaCelda {
                ubicacion_id: r.get(0)?,
                codigo: r.get(1)?,
                seccion_nivel: r.get(2)?,
            })
        })?
        .collect::<Result<Vec<_>, _>>()?;
    Ok(derivar_celdas_rack(&entradas))
}
