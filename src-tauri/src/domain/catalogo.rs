use serde::{Deserialize, Deserializer, Serialize};

/// Distingue "campo ausente" (no tocar) de "campo presente con `null`"
/// (limpiar) para un `Option<Option<T>>` — el `derive(Deserialize)` normal de
/// serde colapsa ambos casos a `None` porque `null` ya satisface la propia
/// capa `Option` externa antes de llegar a la interna. Con
/// `#[serde(default, deserialize_with = "deserialize_some")]`: clave ausente
/// -> `None` (por `default`); clave presente (con `null` o un valor) ->
/// siempre `Some(..)`, dejando que la deserialización interna de `Option<T>`
/// decida entre `Some(None)` (limpiar) y `Some(Some(x))` (asignar).
fn deserialize_some<'de, T, D>(deserializer: D) -> Result<Option<T>, D::Error>
where
    T: Deserialize<'de>,
    D: Deserializer<'de>,
{
    Deserialize::deserialize(deserializer).map(Some)
}

use super::{Auditoria, TipoUbicacion, normalizar_codigo};

// ============ Almacén (SPEC §3.1) ============

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Almacen {
    pub id: String,
    pub codigo: String,
    pub nombre: String,
    pub descripcion: Option<String>,
    pub direccion: Option<String>,
    pub activo: bool,
    #[serde(flatten)]
    pub auditoria: Auditoria,
}

#[derive(Debug, Clone, Deserialize)]
pub struct NuevoAlmacen {
    pub codigo: String,
    pub nombre: String,
    #[serde(default)]
    pub descripcion: Option<String>,
    #[serde(default)]
    pub direccion: Option<String>,
    /// Nunca llega por IPC: lo resuelve el comando desde la sesión activa (SPEC §4.1).
    #[serde(skip_deserializing, default)]
    pub created_by: Option<String>,
}

impl NuevoAlmacen {
    /// Valida las reglas del SPEC §3.1.
    pub fn validar(&self) -> Result<(), crate::error::AppError> {
        if self.codigo.trim().is_empty() {
            return Err(crate::error::AppError::CampoRequerido("codigo".into()));
        }
        if self.nombre.trim().is_empty() {
            return Err(crate::error::AppError::CampoRequerido("nombre".into()));
        }
        Ok(())
    }

    pub fn codigo_normalizado(&self) -> String {
        normalizar_codigo(&self.codigo)
    }
}

/// Edición de un almacén. El `codigo` no es editable por este camino (se
/// trata como estable una vez creado, igual que el `sku` de producto);
/// `None` en un campo significa "no tocar".
#[derive(Debug, Clone, Deserialize, Default)]
pub struct EditarAlmacen {
    pub nombre: Option<String>,
    pub descripcion: Option<String>,
    pub direccion: Option<String>,
}

// ============ Zona (SPEC §3.2) ============

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Zona {
    pub id: String,
    pub codigo: String,
    pub nombre: String,
    pub descripcion: Option<String>,
    pub almacen_id: String,
    pub activo: bool,
    #[serde(flatten)]
    pub auditoria: Auditoria,
}

#[derive(Debug, Clone, Deserialize)]
pub struct NuevaZona {
    pub codigo: String,
    pub nombre: String,
    #[serde(default)]
    pub descripcion: Option<String>,
    pub almacen_id: String,
    /// Nunca llega por IPC: lo resuelve el comando desde la sesión activa (SPEC §4.1).
    #[serde(skip_deserializing, default)]
    pub created_by: Option<String>,
}

/// `None` en un campo significa "no tocar".
#[derive(Debug, Clone, Deserialize, Default)]
pub struct EditarZona {
    pub nombre: Option<String>,
    pub descripcion: Option<String>,
}

// ============ Rack (SPEC §3.3) ============

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Rack {
    pub id: String,
    pub codigo: String,
    pub nombre: Option<String>,
    pub tipo: Option<String>,
    pub zona_id: String,
    pub activo: bool,
    #[serde(flatten)]
    pub auditoria: Auditoria,
}

#[derive(Debug, Clone, Deserialize)]
pub struct NuevoRack {
    pub codigo: String,
    #[serde(default)]
    pub nombre: Option<String>,
    #[serde(default)]
    pub tipo: Option<String>,
    pub zona_id: String,
    /// Nunca llega por IPC: lo resuelve el comando desde la sesión activa (SPEC §4.1).
    #[serde(skip_deserializing, default)]
    pub created_by: Option<String>,
}

/// `None` en un campo significa "no tocar".
#[derive(Debug, Clone, Deserialize, Default)]
pub struct EditarRack {
    pub nombre: Option<String>,
    pub tipo: Option<String>,
}

// ============ Sección (SPEC §3.4) ============

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Seccion {
    pub id: String,
    pub codigo: String,
    pub nombre: Option<String>,
    pub nivel: Option<String>,
    pub rack_id: String,
    pub descripcion: Option<String>,
    pub activo: bool,
    #[serde(flatten)]
    pub auditoria: Auditoria,
}

#[derive(Debug, Clone, Deserialize)]
pub struct NuevaSeccion {
    pub codigo: String,
    #[serde(default)]
    pub nombre: Option<String>,
    #[serde(default)]
    pub nivel: Option<String>,
    pub rack_id: String,
    #[serde(default)]
    pub descripcion: Option<String>,
    /// Nunca llega por IPC: lo resuelve el comando desde la sesión activa (SPEC §4.1).
    #[serde(skip_deserializing, default)]
    pub created_by: Option<String>,
}

/// `None` en un campo significa "no tocar".
#[derive(Debug, Clone, Deserialize, Default)]
pub struct EditarSeccion {
    pub nombre: Option<String>,
    pub nivel: Option<String>,
    pub descripcion: Option<String>,
}

// ============ Ubicación (SPEC §3.5) ============

/// El árbol físico admite simplificación (SPEC §3.13): una ubicación cuelga
/// de **exactamente una** sección, rack o zona (nunca más de una, nunca
/// ninguna). `almacen_id` se resuelve por transitividad, nunca se declara.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Ubicacion {
    pub id: String,
    pub codigo: String,
    pub nombre: Option<String>,
    pub seccion_id: Option<String>,
    pub rack_id: Option<String>,
    pub zona_id: Option<String>,
    pub tipo: String,
    pub capacidad_maxima: Option<i64>,
    pub activo: bool,
    #[serde(flatten)]
    pub auditoria: Auditoria,
}

#[derive(Debug, Clone, Deserialize)]
pub struct NuevaUbicacion {
    pub codigo: String,
    #[serde(default)]
    pub nombre: Option<String>,
    #[serde(default)]
    pub seccion_id: Option<String>,
    #[serde(default)]
    pub rack_id: Option<String>,
    #[serde(default)]
    pub zona_id: Option<String>,
    #[serde(default)]
    pub tipo: Option<String>,
    #[serde(default)]
    pub capacidad_maxima: Option<i64>,
    /// Nunca llega por IPC: lo resuelve el comando desde la sesión activa (SPEC §4.1).
    #[serde(skip_deserializing, default)]
    pub created_by: Option<String>,
}

impl NuevaUbicacion {
    pub fn tipo(&self) -> Result<TipoUbicacion, crate::error::AppError> {
        let s = self.tipo.as_deref().unwrap_or("STANDARD");
        TipoUbicacion::parse(s).ok_or_else(|| crate::error::AppError::CampoRequerido("tipo".into()))
    }

    /// Exactamente uno de `seccion_id`/`rack_id`/`zona_id` debe estar
    /// presente (SPEC §3.5, §3.13: árbol simplificado, nunca ambiguo).
    pub fn validar_padre(&self) -> Result<(), crate::error::AppError> {
        let presentes = [&self.seccion_id, &self.rack_id, &self.zona_id]
            .iter()
            .filter(|v| v.is_some())
            .count();
        if presentes != 1 {
            return Err(crate::error::AppError::CampoRequerido(
                "seccion_id, rack_id o zona_id (exactamente uno)".into(),
            ));
        }
        Ok(())
    }
}

/// `None` en un campo significa "no tocar". El padre (sección/rack/zona) y el
/// `codigo` no se editan por este camino.
#[derive(Debug, Clone, Deserialize, Default)]
pub struct EditarUbicacion {
    pub nombre: Option<String>,
    pub tipo: Option<String>,
    pub capacidad_maxima: Option<i64>,
}

// ============ Caja (SPEC §3.6) ============

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Caja {
    pub id: String,
    pub codigo: String,
    pub nombre: Option<String>,
    pub ubicacion_id: String,
    pub producto_id: Option<String>,
    pub lote_id: Option<String>,
    pub etiqueta: Option<String>,
    pub activo: bool,
    #[serde(flatten)]
    pub auditoria: Auditoria,
}

#[derive(Debug, Clone, Deserialize)]
pub struct NuevaCaja {
    pub codigo: String,
    #[serde(default)]
    pub nombre: Option<String>,
    pub ubicacion_id: String,
    #[serde(default)]
    pub producto_id: Option<String>,
    #[serde(default)]
    pub lote_id: Option<String>,
    #[serde(default)]
    pub etiqueta: Option<String>,
    /// Nunca llega por IPC: lo resuelve el comando desde la sesión activa (SPEC §4.1).
    #[serde(skip_deserializing, default)]
    pub created_by: Option<String>,
}

/// `None` en un campo significa "no tocar". La restricción de
/// producto/lote no se reasigna por este camino (crea ambigüedad con stock
/// ya guardado); se recrea la caja si hace falta cambiarla.
#[derive(Debug, Clone, Deserialize, Default)]
pub struct EditarCaja {
    pub nombre: Option<String>,
    pub etiqueta: Option<String>,
}

// ============ Categoría (SPEC §3.8) ============

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Categoria {
    pub id: String,
    pub nombre: String,
    pub parent_id: Option<String>,
    pub descripcion: Option<String>,
    pub activo: bool,
    #[serde(flatten)]
    pub auditoria: Auditoria,
}

#[derive(Debug, Clone, Deserialize)]
pub struct NuevaCategoria {
    pub nombre: String,
    #[serde(default)]
    pub parent_id: Option<String>,
    #[serde(default)]
    pub descripcion: Option<String>,
    /// Nunca llega por IPC: lo resuelve el comando desde la sesión activa (SPEC §4.1).
    #[serde(skip_deserializing, default)]
    pub created_by: Option<String>,
}

/// `None` en un campo significa "no tocar". Cambiar `parent_id` re-valida
/// que no se forme un ciclo (SPEC §3.8).
#[derive(Debug, Clone, PartialEq, Eq, Deserialize, Default)]
pub struct EditarCategoria {
    pub nombre: Option<String>,
    pub descripcion: Option<String>,
    #[serde(default, deserialize_with = "deserialize_some")]
    pub parent_id: Option<Option<String>>,
}

// ============ UOM (SPEC §3.9) ============

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Uom {
    pub id: String,
    pub codigo: String,
    pub nombre: String,
    pub tipo: String,
    pub factor: i64,
    pub base: bool,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Clone, Deserialize)]
pub struct NuevaUom {
    pub codigo: String,
    pub nombre: String,
    pub tipo: String,
    #[serde(default = "default_factor")]
    pub factor: i64,
    #[serde(default)]
    pub base: bool,
}

fn default_factor() -> i64 {
    1
}

// ============ Proveedor (SPEC §3.10) ============

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Proveedor {
    pub id: String,
    pub codigo: String,
    pub nombre: String,
    pub contacto_nombre: Option<String>,
    pub contacto_telefono: Option<String>,
    pub contacto_email: Option<String>,
    pub direccion: Option<String>,
    pub activo: bool,
    #[serde(flatten)]
    pub auditoria: Auditoria,
}

#[derive(Debug, Clone, Deserialize)]
pub struct NuevoProveedor {
    pub codigo: String,
    pub nombre: String,
    #[serde(default)]
    pub contacto_nombre: Option<String>,
    #[serde(default)]
    pub contacto_telefono: Option<String>,
    #[serde(default)]
    pub contacto_email: Option<String>,
    #[serde(default)]
    pub direccion: Option<String>,
    /// Nunca llega por IPC: lo resuelve el comando desde la sesión activa (SPEC §4.1).
    #[serde(skip_deserializing, default)]
    pub created_by: Option<String>,
}

/// `None` en un campo significa "no tocar".
#[derive(Debug, Clone, Deserialize, Default)]
pub struct EditarProveedor {
    pub nombre: Option<String>,
    pub contacto_nombre: Option<String>,
    pub contacto_telefono: Option<String>,
    pub contacto_email: Option<String>,
    pub direccion: Option<String>,
}

// ============ Cliente (SPEC §3.11) ============

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Cliente {
    pub id: String,
    pub codigo: String,
    pub nombre: String,
    pub contacto_nombre: Option<String>,
    pub contacto_telefono: Option<String>,
    pub contacto_email: Option<String>,
    pub direccion: Option<String>,
    pub activo: bool,
    #[serde(flatten)]
    pub auditoria: Auditoria,
}

#[derive(Debug, Clone, Deserialize)]
pub struct NuevoCliente {
    pub codigo: String,
    pub nombre: String,
    #[serde(default)]
    pub contacto_nombre: Option<String>,
    #[serde(default)]
    pub contacto_telefono: Option<String>,
    #[serde(default)]
    pub contacto_email: Option<String>,
    #[serde(default)]
    pub direccion: Option<String>,
    /// Nunca llega por IPC: lo resuelve el comando desde la sesión activa (SPEC §4.1).
    #[serde(skip_deserializing, default)]
    pub created_by: Option<String>,
}

/// `None` en un campo significa "no tocar".
#[derive(Debug, Clone, Deserialize, Default)]
pub struct EditarCliente {
    pub nombre: Option<String>,
    pub contacto_nombre: Option<String>,
    pub contacto_telefono: Option<String>,
    pub contacto_email: Option<String>,
    pub direccion: Option<String>,
}

// ============ Producto / SKU (SPEC §3.7) ============

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Producto {
    pub id: String,
    pub sku: String,
    pub nombre: String,
    pub descripcion: Option<String>,
    pub categoria_id: Option<String>,
    pub uom_base_id: String,
    pub uom_venta_id: Option<String>,
    pub uom_compra_id: Option<String>,
    pub codigo_barras: Option<String>,
    pub peso_unitario: Option<f64>,
    pub volumen_unitario: Option<f64>,
    pub stock_minimo: Option<i64>,
    pub stock_maximo: Option<i64>,
    pub controla_lote: bool,
    pub controla_vencimiento: bool,
    pub perecedero: bool,
    pub activo: bool,
    #[serde(flatten)]
    pub auditoria: Auditoria,
}

#[derive(Debug, Clone, Deserialize)]
pub struct NuevoProducto {
    pub sku: String,
    pub nombre: String,
    #[serde(default)]
    pub descripcion: Option<String>,
    #[serde(default)]
    pub categoria_id: Option<String>,
    pub uom_base_id: String,
    #[serde(default)]
    pub uom_venta_id: Option<String>,
    #[serde(default)]
    pub uom_compra_id: Option<String>,
    #[serde(default)]
    pub codigo_barras: Option<String>,
    #[serde(default)]
    pub peso_unitario: Option<f64>,
    #[serde(default)]
    pub volumen_unitario: Option<f64>,
    #[serde(default)]
    pub stock_minimo: Option<i64>,
    #[serde(default)]
    pub stock_maximo: Option<i64>,
    #[serde(default)]
    pub controla_lote: bool,
    #[serde(default)]
    pub controla_vencimiento: bool,
    #[serde(default)]
    pub perecedero: bool,
    /// Nunca llega por IPC: lo resuelve el comando desde la sesión activa (SPEC §4.1).
    #[serde(skip_deserializing, default)]
    pub created_by: Option<String>,
}

impl NuevoProducto {
    /// Reglas del SPEC §3.7.
    pub fn validar(&self) -> Result<(), crate::error::AppError> {
        if self.sku.trim().is_empty() {
            return Err(crate::error::AppError::CampoRequerido("sku".into()));
        }
        if self.nombre.trim().is_empty() {
            return Err(crate::error::AppError::CampoRequerido("nombre".into()));
        }
        if self.uom_base_id.trim().is_empty() {
            return Err(crate::error::AppError::CampoRequerido("uom_base_id".into()));
        }
        if self.controla_vencimiento && !self.controla_lote {
            return Err(crate::error::AppError::CampoRequerido(
                "controla_lote (controla_vencimiento lo implica)".into(),
            ));
        }
        Ok(())
    }

    pub fn sku_normalizado(&self) -> String {
        normalizar_codigo(&self.sku)
    }
}

/// Edición de un producto. El `sku` **no** es editable por este camino (SPEC
/// §3.7: "único e inmutable una vez creado"). `None` en un campo significa
/// "no tocar".
#[derive(Debug, Clone, Deserialize, Default)]
pub struct EditarProducto {
    pub nombre: Option<String>,
    pub descripcion: Option<String>,
    pub categoria_id: Option<String>,
    pub uom_venta_id: Option<String>,
    pub uom_compra_id: Option<String>,
    pub codigo_barras: Option<String>,
    pub peso_unitario: Option<f64>,
    pub volumen_unitario: Option<f64>,
    pub stock_minimo: Option<i64>,
    pub stock_maximo: Option<i64>,
    pub controla_lote: Option<bool>,
    pub controla_vencimiento: Option<bool>,
    pub perecedero: Option<bool>,
}

// ============ Lote (SPEC §3.12) ============

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Lote {
    pub id: String,
    pub numero: String,
    pub producto_id: String,
    pub fecha_fabricacion: Option<String>,
    pub fecha_vencimiento: Option<String>,
    pub origen: Option<String>,
    pub notas: Option<String>,
    #[serde(flatten)]
    pub auditoria: Auditoria,
}

#[derive(Debug, Clone, Deserialize)]
pub struct NuevoLote {
    pub numero: String,
    pub producto_id: String,
    #[serde(default)]
    pub fecha_fabricacion: Option<String>,
    #[serde(default)]
    pub fecha_vencimiento: Option<String>,
    #[serde(default)]
    pub origen: Option<String>,
    #[serde(default)]
    pub notas: Option<String>,
    /// Nunca llega por IPC: lo resuelve el comando desde la sesión activa (SPEC §4.1).
    #[serde(skip_deserializing, default)]
    pub created_by: Option<String>,
}

/// Edición de un lote. `numero`/`producto_id` no son editables por este
/// camino (definen la identidad del lote). `None` significa "no tocar".
#[derive(Debug, Clone, Deserialize, Default)]
pub struct EditarLote {
    pub fecha_fabricacion: Option<String>,
    pub fecha_vencimiento: Option<String>,
    pub origen: Option<String>,
    pub notas: Option<String>,
}
