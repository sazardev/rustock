use parking_lot::Mutex;
use rusqlite::Connection;
use std::path::Path;
use std::sync::Arc;

use crate::error::AppResult;

/// Estado compartido de la base de datos (una conexión, self-hosted).
pub struct DbState {
    conn: Mutex<Connection>,
}

impl DbState {
    /// Abre (o crea) la base de datos y ejecuta las migraciones.
    pub fn init(path: &Path) -> AppResult<Arc<Self>> {
        let conn = Connection::open(path)?;
        conn.pragma_update(None, "journal_mode", "WAL")?;
        conn.pragma_update(None, "foreign_keys", "ON")?;
        conn.pragma_update(None, "busy_timeout", "5000")?;
        let state = Arc::new(Self {
            conn: Mutex::new(conn),
        });
        state.migrate()?;
        Ok(state)
    }

    /// Conexión in-memory para tests.
    #[cfg(test)]
    #[allow(dead_code)]
    pub fn init_in_memory() -> AppResult<Arc<Self>> {
        let conn = Connection::open_in_memory()?;
        conn.pragma_update(None, "journal_mode", "WAL")?;
        conn.pragma_update(None, "foreign_keys", "ON")?;
        let state = Arc::new(Self {
            conn: Mutex::new(conn),
        });
        state.migrate()?;
        Ok(state)
    }

    pub fn conn(&self) -> parking_lot::MutexGuard<'_, Connection> {
        self.conn.lock()
    }

    fn migrate(&self) -> AppResult<()> {
        let conn = self.conn();
        let tx = conn.unchecked_transaction()?;
        tx.execute_batch(
            "
            CREATE TABLE IF NOT EXISTS schema_migrations (
                version INTEGER PRIMARY KEY,
                applied_at TEXT NOT NULL DEFAULT (datetime('now'))
            );

            -- ============ SEGURIDAD (SPEC §4) ============
            CREATE TABLE IF NOT EXISTS roles (
                id TEXT PRIMARY KEY,
                codigo TEXT NOT NULL UNIQUE,
                descripcion TEXT,
                es_sistema INTEGER NOT NULL DEFAULT 0,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL,
                created_by TEXT,
                updated_by TEXT
            );

            CREATE TABLE IF NOT EXISTS usuarios (
                id TEXT PRIMARY KEY,
                nombre_usuario TEXT NOT NULL UNIQUE,
                nombre_completo TEXT NOT NULL,
                email TEXT,
                password_hash TEXT NOT NULL,
                rol_id TEXT NOT NULL REFERENCES roles(id),
                activo INTEGER NOT NULL DEFAULT 1,
                ultimo_acceso_at TEXT,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL,
                created_by TEXT,
                updated_by TEXT
            );

            CREATE TABLE IF NOT EXISTS permisos (
                id TEXT PRIMARY KEY,
                recurso TEXT NOT NULL,
                accion TEXT NOT NULL,
                rol_id TEXT NOT NULL REFERENCES roles(id),
                UNIQUE(rol_id, recurso, accion)
            );

            CREATE TABLE IF NOT EXISTS auditoria (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                usuario_id TEXT,
                accion TEXT NOT NULL,
                entidad TEXT NOT NULL,
                entidad_id TEXT,
                antes TEXT,
                despues TEXT,
                timestamp TEXT NOT NULL,
                origen TEXT,
                comando TEXT,
                duracion_ms INTEGER,
                exito INTEGER NOT NULL DEFAULT 1,
                nivel TEXT NOT NULL DEFAULT 'LECTURA'
            );
            CREATE INDEX IF NOT EXISTS idx_auditoria_entidad ON auditoria(entidad, entidad_id);
            CREATE INDEX IF NOT EXISTS idx_auditoria_timestamp ON auditoria(timestamp);
            CREATE INDEX IF NOT EXISTS idx_auditoria_usuario ON auditoria(usuario_id);
            CREATE INDEX IF NOT EXISTS idx_auditoria_comando ON auditoria(comando);
            CREATE INDEX IF NOT EXISTS idx_auditoria_nivel ON auditoria(nivel);

            -- ============ CATALOGOS: ARBOL FISICO (SPEC §3.1-3.6) ============
            CREATE TABLE IF NOT EXISTS almacenes (
                id TEXT PRIMARY KEY,
                codigo TEXT NOT NULL UNIQUE,
                nombre TEXT NOT NULL,
                descripcion TEXT,
                direccion TEXT,
                activo INTEGER NOT NULL DEFAULT 1,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL,
                created_by TEXT,
                updated_by TEXT
            );

            CREATE TABLE IF NOT EXISTS zonas (
                id TEXT PRIMARY KEY,
                codigo TEXT NOT NULL,
                nombre TEXT NOT NULL,
                descripcion TEXT,
                almacen_id TEXT NOT NULL REFERENCES almacenes(id),
                activo INTEGER NOT NULL DEFAULT 1,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL,
                created_by TEXT,
                updated_by TEXT,
                UNIQUE(almacen_id, codigo)
            );

            CREATE TABLE IF NOT EXISTS racks (
                id TEXT PRIMARY KEY,
                codigo TEXT NOT NULL,
                nombre TEXT,
                tipo TEXT,
                zona_id TEXT NOT NULL REFERENCES zonas(id),
                activo INTEGER NOT NULL DEFAULT 1,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL,
                created_by TEXT,
                updated_by TEXT,
                UNIQUE(zona_id, codigo)
            );

            CREATE TABLE IF NOT EXISTS secciones (
                id TEXT PRIMARY KEY,
                codigo TEXT NOT NULL,
                nombre TEXT,
                nivel TEXT,
                rack_id TEXT NOT NULL REFERENCES racks(id),
                descripcion TEXT,
                activo INTEGER NOT NULL DEFAULT 1,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL,
                created_by TEXT,
                updated_by TEXT,
                UNIQUE(rack_id, codigo)
            );

            CREATE TABLE IF NOT EXISTS ubicaciones (
                id TEXT PRIMARY KEY,
                codigo TEXT NOT NULL,
                nombre TEXT,
                seccion_id TEXT NOT NULL REFERENCES secciones(id),
                tipo TEXT NOT NULL DEFAULT 'STANDARD',
                capacidad_maxima INTEGER,
                activo INTEGER NOT NULL DEFAULT 1,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL,
                created_by TEXT,
                updated_by TEXT,
                UNIQUE(seccion_id, codigo)
            );
            CREATE INDEX IF NOT EXISTS idx_ubicaciones_activo ON ubicaciones(activo);

            CREATE TABLE IF NOT EXISTS cajas (
                id TEXT PRIMARY KEY,
                codigo TEXT NOT NULL,
                nombre TEXT,
                ubicacion_id TEXT NOT NULL REFERENCES ubicaciones(id),
                producto_id TEXT,
                lote_id TEXT,
                etiqueta TEXT,
                activo INTEGER NOT NULL DEFAULT 1,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL,
                created_by TEXT,
                updated_by TEXT,
                UNIQUE(ubicacion_id, codigo)
            );

            -- ============ CATALOGOS: PRODUCTO (SPEC §3.7-3.12) ============
            CREATE TABLE IF NOT EXISTS categorias (
                id TEXT PRIMARY KEY,
                nombre TEXT NOT NULL UNIQUE,
                parent_id TEXT REFERENCES categorias(id),
                descripcion TEXT,
                activo INTEGER NOT NULL DEFAULT 1,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL,
                created_by TEXT,
                updated_by TEXT
            );

            CREATE TABLE IF NOT EXISTS uoms (
                id TEXT PRIMARY KEY,
                codigo TEXT NOT NULL UNIQUE,
                nombre TEXT NOT NULL,
                tipo TEXT NOT NULL,
                factor INTEGER NOT NULL DEFAULT 1,
                base INTEGER NOT NULL DEFAULT 0,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL
            );

            CREATE TABLE IF NOT EXISTS proveedores (
                id TEXT PRIMARY KEY,
                codigo TEXT NOT NULL UNIQUE,
                nombre TEXT NOT NULL,
                contacto_nombre TEXT,
                contacto_telefono TEXT,
                contacto_email TEXT,
                direccion TEXT,
                activo INTEGER NOT NULL DEFAULT 1,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL,
                created_by TEXT,
                updated_by TEXT
            );

            CREATE TABLE IF NOT EXISTS clientes (
                id TEXT PRIMARY KEY,
                codigo TEXT NOT NULL UNIQUE,
                nombre TEXT NOT NULL,
                contacto_nombre TEXT,
                contacto_telefono TEXT,
                contacto_email TEXT,
                direccion TEXT,
                activo INTEGER NOT NULL DEFAULT 1,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL,
                created_by TEXT,
                updated_by TEXT
            );

            CREATE TABLE IF NOT EXISTS productos (
                id TEXT PRIMARY KEY,
                sku TEXT NOT NULL UNIQUE,
                nombre TEXT NOT NULL,
                descripcion TEXT,
                categoria_id TEXT REFERENCES categorias(id),
                uom_base_id TEXT NOT NULL REFERENCES uoms(id),
                uom_venta_id TEXT REFERENCES uoms(id),
                uom_compra_id TEXT REFERENCES uoms(id),
                codigo_barras TEXT,
                peso_unitario REAL,
                volumen_unitario REAL,
                stock_minimo INTEGER,
                stock_maximo INTEGER,
                controla_lote INTEGER NOT NULL DEFAULT 0,
                controla_vencimiento INTEGER NOT NULL DEFAULT 0,
                perecedero INTEGER NOT NULL DEFAULT 0,
                activo INTEGER NOT NULL DEFAULT 1,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL,
                created_by TEXT,
                updated_by TEXT
            );
            CREATE UNIQUE INDEX IF NOT EXISTS idx_productos_barras ON productos(codigo_barras) WHERE codigo_barras IS NOT NULL;
            CREATE INDEX IF NOT EXISTS idx_productos_categoria ON productos(categoria_id);

            CREATE TABLE IF NOT EXISTS lotes (
                id TEXT PRIMARY KEY,
                numero TEXT NOT NULL,
                producto_id TEXT NOT NULL REFERENCES productos(id),
                fecha_fabricacion TEXT,
                fecha_vencimiento TEXT,
                origen TEXT,
                notas TEXT,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL,
                created_by TEXT,
                updated_by TEXT,
                UNIQUE(producto_id, numero)
            );
            CREATE INDEX IF NOT EXISTS idx_lotes_vencimiento ON lotes(fecha_vencimiento);

            -- ============ MOVIMIENTOS (SPEC §6-10) ============
            CREATE TABLE IF NOT EXISTS movimientos (
                id TEXT PRIMARY KEY,
                tipo TEXT NOT NULL,
                sub_tipo TEXT NOT NULL,
                numero TEXT NOT NULL,
                estado TEXT NOT NULL DEFAULT 'BORRADOR',
                fecha_movimiento TEXT NOT NULL,
                motivo TEXT,
                origen_ubicacion_id TEXT REFERENCES ubicaciones(id),
                destino_ubicacion_id TEXT REFERENCES ubicaciones(id),
                proveedor_id TEXT REFERENCES proveedores(id),
                cliente_id TEXT REFERENCES clientes(id),
                sesion_inventario_id TEXT,
                documento_referencia TEXT,
                notas TEXT,
                movimiento_inverso_id TEXT REFERENCES movimientos(id),
                created_by TEXT NOT NULL,
                created_at TEXT NOT NULL,
                approved_by TEXT,
                approved_at TEXT,
                anulado_by TEXT,
                anulado_at TEXT,
                UNIQUE(numero)
            );
            CREATE INDEX IF NOT EXISTS idx_movimientos_tipo ON movimientos(tipo, estado);
            CREATE INDEX IF NOT EXISTS idx_movimientos_fecha ON movimientos(fecha_movimiento);
            CREATE INDEX IF NOT EXISTS idx_movimientos_estado ON movimientos(estado);
            CREATE INDEX IF NOT EXISTS idx_movimientos_ubicacion_origen ON movimientos(origen_ubicacion_id);
            CREATE INDEX IF NOT EXISTS idx_movimientos_ubicacion_destino ON movimientos(destino_ubicacion_id);

            CREATE TABLE IF NOT EXISTS movimiento_lineas (
                id TEXT PRIMARY KEY,
                movimiento_id TEXT NOT NULL REFERENCES movimientos(id),
                producto_id TEXT NOT NULL REFERENCES productos(id),
                lote_id TEXT REFERENCES lotes(id),
                cantidad INTEGER NOT NULL,
                origen_ubicacion_id TEXT REFERENCES ubicaciones(id),
                destino_ubicacion_id TEXT REFERENCES ubicaciones(id),
                caja_origen_id TEXT REFERENCES cajas(id),
                caja_destino_id TEXT REFERENCES cajas(id)
            );
            CREATE INDEX IF NOT EXISTS idx_lineas_movimiento ON movimiento_lineas(movimiento_id);
            CREATE INDEX IF NOT EXISTS idx_lineas_producto ON movimiento_lineas(producto_id);
            CREATE INDEX IF NOT EXISTS idx_lineas_lote ON movimiento_lineas(lote_id);

            -- ============ SALDOS MATERIALIZADOS (SPEC §5, §15.11) ============
            -- `lote_key` es la clave real ('' cuando no hay lote) para que el
            -- UNIQUE/ON CONFLICT funcione en SQLite con lote nulo.
            CREATE TABLE IF NOT EXISTS saldos (
                ubicacion_id TEXT NOT NULL REFERENCES ubicaciones(id),
                producto_id TEXT NOT NULL REFERENCES productos(id),
                lote_id TEXT REFERENCES lotes(id),
                lote_key TEXT NOT NULL DEFAULT '',
                cantidad INTEGER NOT NULL DEFAULT 0,
                updated_at TEXT NOT NULL,
                PRIMARY KEY (ubicacion_id, producto_id, lote_key)
            );
            CREATE INDEX IF NOT EXISTS idx_saldos_producto ON saldos(producto_id);
            CREATE INDEX IF NOT EXISTS idx_saldos_lote ON saldos(lote_key);
            CREATE INDEX IF NOT EXISTS idx_saldos_cantidad ON saldos(cantidad);

            -- ============ INVENTARIO FISICO (SPEC §11) ============
            CREATE TABLE IF NOT EXISTS sesiones_inventario (
                id TEXT PRIMARY KEY,
                numero TEXT NOT NULL UNIQUE,
                tipo TEXT NOT NULL,
                estado TEXT NOT NULL DEFAULT 'PLANEADA',
                almacen_id TEXT NOT NULL REFERENCES almacenes(id),
                alcance TEXT,
                fecha_inicio TEXT,
                fecha_fin TEXT,
                responsable_id TEXT,
                conteo_ciego INTEGER NOT NULL DEFAULT 0,
                exige_doble_conteo INTEGER NOT NULL DEFAULT 0,
                created_by TEXT NOT NULL,
                created_at TEXT NOT NULL,
                closed_by TEXT,
                closed_at TEXT
            );
            CREATE INDEX IF NOT EXISTS idx_sesiones_estado ON sesiones_inventario(estado);

            CREATE TABLE IF NOT EXISTS conteos (
                id TEXT PRIMARY KEY,
                sesion_id TEXT NOT NULL REFERENCES sesiones_inventario(id),
                ubicacion_id TEXT NOT NULL REFERENCES ubicaciones(id),
                producto_id TEXT NOT NULL REFERENCES productos(id),
                lote_id TEXT REFERENCES lotes(id),
                cantidad_contada INTEGER NOT NULL,
                conteo_numero INTEGER NOT NULL,
                usuario_contador_id TEXT NOT NULL,
                timestamp TEXT NOT NULL,
                nota TEXT
            );
            CREATE INDEX IF NOT EXISTS idx_conteos_sesion ON conteos(sesion_id);
            CREATE INDEX IF NOT EXISTS idx_conteos_ubicacion ON conteos(sesion_id, ubicacion_id);

            -- ============ COMENTARIOS (SPEC §12) ============
            CREATE TABLE IF NOT EXISTS comentarios (
                id TEXT PRIMARY KEY,
                entidad TEXT NOT NULL,
                entidad_id TEXT NOT NULL,
                usuario_id TEXT NOT NULL,
                texto TEXT NOT NULL,
                editado INTEGER NOT NULL DEFAULT 0,
                oculto INTEGER NOT NULL DEFAULT 0,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL
            );
            CREATE INDEX IF NOT EXISTS idx_comentarios_entidad ON comentarios(entidad, entidad_id);

            -- ============ ALERTAS (SPEC §17) ============
            CREATE TABLE IF NOT EXISTS alertas (
                id TEXT PRIMARY KEY,
                tipo TEXT NOT NULL,
                severidad TEXT NOT NULL,
                entidad TEXT NOT NULL,
                entidad_id TEXT,
                fecha_deteccion TEXT NOT NULL,
                estado TEXT NOT NULL DEFAULT 'ABIERTA',
                detalle TEXT
            );
            CREATE INDEX IF NOT EXISTS idx_alertas_estado ON alertas(estado, tipo);
            "
        )?;
        tx.commit()?;
        Ok(())
    }
}
