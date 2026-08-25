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
                nivel TEXT NOT NULL DEFAULT 'LECTURA',
                -- Tracking total (Hito 25): todo evento registra tipo, módulo,
                -- ruta/proceso, metadatos, tenant y tiempo local para análisis.
                tipo_evento TEXT NOT NULL DEFAULT 'COMANDO',
                ruta TEXT,
                modulo TEXT,
                proceso TEXT,
                metadatos TEXT,
                tenant TEXT,
                duracion_vista_ms INTEGER,
                hora_local INTEGER,
                dia_semana INTEGER
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

            -- Pasillo (SPEC §3.3b): agrupa racks dentro de una zona. Es un
            -- nivel jerárquico real pero opcional para el rack (rack.pasillo_id
            -- es nullable) — el rack siempre sigue perteneciendo a su zona.
            CREATE TABLE IF NOT EXISTS pasillos (
                id TEXT PRIMARY KEY,
                codigo TEXT NOT NULL,
                nombre TEXT,
                zona_id TEXT NOT NULL REFERENCES zonas(id),
                activo INTEGER NOT NULL DEFAULT 1,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL,
                created_by TEXT,
                updated_by TEXT,
                UNIQUE(zona_id, codigo)
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

            -- Árbol simplificado (SPEC §3.5, §3.13): una ubicación cuelga de
            -- EXACTAMENTE una sección, rack o zona (nunca más de una, nunca
            -- ninguna); el CHECK lo hace innegociable también a nivel de dato.
            CREATE TABLE IF NOT EXISTS ubicaciones (
                id TEXT PRIMARY KEY,
                codigo TEXT NOT NULL,
                nombre TEXT,
                seccion_id TEXT REFERENCES secciones(id),
                rack_id TEXT REFERENCES racks(id),
                zona_id TEXT REFERENCES zonas(id),
                tipo TEXT NOT NULL DEFAULT 'STANDARD',
                capacidad_maxima INTEGER,
                activo INTEGER NOT NULL DEFAULT 1,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL,
                created_by TEXT,
                updated_by TEXT,
                CHECK (
                    (seccion_id IS NOT NULL) + (rack_id IS NOT NULL) + (zona_id IS NOT NULL) = 1
                )
            );
            CREATE INDEX IF NOT EXISTS idx_ubicaciones_activo ON ubicaciones(activo);
            CREATE UNIQUE INDEX IF NOT EXISTS idx_ubicaciones_codigo_seccion ON ubicaciones(seccion_id, codigo) WHERE seccion_id IS NOT NULL;
            CREATE UNIQUE INDEX IF NOT EXISTS idx_ubicaciones_codigo_rack ON ubicaciones(rack_id, codigo) WHERE rack_id IS NOT NULL;
            CREATE UNIQUE INDEX IF NOT EXISTS idx_ubicaciones_codigo_zona ON ubicaciones(zona_id, codigo) WHERE zona_id IS NOT NULL;

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
            CREATE INDEX IF NOT EXISTS idx_movimientos_created_by ON movimientos(created_by);
            CREATE INDEX IF NOT EXISTS idx_movimientos_proveedor ON movimientos(proveedor_id);
            CREATE INDEX IF NOT EXISTS idx_movimientos_cliente ON movimientos(cliente_id);
            CREATE INDEX IF NOT EXISTS idx_movimientos_documento ON movimientos(documento_referencia);
            CREATE INDEX IF NOT EXISTS idx_movimientos_motivo ON movimientos(motivo);
            CREATE INDEX IF NOT EXISTS idx_movimientos_sesion ON movimientos(sesion_inventario_id);
            CREATE INDEX IF NOT EXISTS idx_ubicaciones_tipo ON ubicaciones(tipo);
            CREATE INDEX IF NOT EXISTS idx_zonas_almacen ON zonas(almacen_id);
            CREATE INDEX IF NOT EXISTS idx_racks_zona ON racks(zona_id);
            CREATE INDEX IF NOT EXISTS idx_secciones_rack ON secciones(rack_id);
            -- Unicidad por almacén cuando activo=1 (SPEC §3.1): permite reciclar código tras desactivar.
            CREATE UNIQUE INDEX IF NOT EXISTS idx_almacenes_codigo_activo ON almacenes(codigo) WHERE activo = 1;

            -- Correlativos de número de movimiento (SPEC §6.1). El incremento es
            -- atómico dentro de la transacción IMMEDIATE del creador, así dos
            -- creaciones concurrentes no colisionan en el UNIQUE(numero).
            CREATE TABLE IF NOT EXISTS correlativos (
                clave TEXT PRIMARY KEY,
                valor INTEGER NOT NULL DEFAULT 0
            );

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
                cantidad INTEGER NOT NULL DEFAULT 0 CHECK (cantidad >= 0),
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

            -- Instantánea de diferencias al CERRAR la sesión (SPEC §11.5/§11.6):
            -- una vez aplicados los ajustes del cierre, los saldos ya cambiaron;
            -- sin esta tabla, diferencias_sesion y precision_sesion recalcularían
            -- contra saldos post-ajuste y el histórico mostraría todo conciliado
            -- con precisión 100% falsa. Se persiste TODA fila de conteo (también
            -- las conciliadas) con su saldo del sistema AL MOMENTO DEL CIERRE.
            CREATE TABLE IF NOT EXISTS sesion_diferencias (
                sesion_id TEXT NOT NULL REFERENCES sesiones_inventario(id),
                ubicacion_id TEXT NOT NULL,
                producto_id TEXT NOT NULL,
                lote_id TEXT,
                saldo_sistema INTEGER NOT NULL,
                cantidad_contada INTEGER NOT NULL
            );
            CREATE INDEX IF NOT EXISTS idx_sesion_diferencias_sesion ON sesion_diferencias(sesion_id);

            -- ============ COMENTARIOS (SPEC §12) ============
            CREATE TABLE IF NOT EXISTS comentarios (
                id TEXT PRIMARY KEY,
                entidad TEXT NOT NULL,
                entidad_id TEXT NOT NULL,
                usuario_id TEXT NOT NULL,
                texto TEXT NOT NULL,
                editado INTEGER NOT NULL DEFAULT 0,
                oculto INTEGER NOT NULL DEFAULT 0,
                oculto_by TEXT,
                oculto_at TEXT,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL
            );
            CREATE INDEX IF NOT EXISTS idx_comentarios_entidad ON comentarios(entidad, entidad_id);

            -- El texto original nunca se pierde al editar (SPEC §12.1): cada
            -- edición guarda aquí el texto que tenía el comentario antes.
            CREATE TABLE IF NOT EXISTS comentario_historial (
                id TEXT PRIMARY KEY,
                comentario_id TEXT NOT NULL REFERENCES comentarios(id),
                texto_anterior TEXT NOT NULL,
                editado_by TEXT,
                editado_at TEXT NOT NULL
            );
            CREATE INDEX IF NOT EXISTS idx_comentario_historial_comentario ON comentario_historial(comentario_id);

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

            -- ============ CONFIGURACIÓN DE EMPRESA (admin, SPEC §4.3) ============
            -- Fila única: los parámetros globales que elige el ADMIN. Los
            -- usuarios heredan de aquí sus valores por defecto (zona horaria,
            -- formato de fecha, umbral de vencimiento) salvo que tengan
            -- preferencia propia (SPEC §14.4, §17.1). Las columnas de datos de
            -- la empresa (país, fiscales, contacto, coordenadas) se agregan
            -- con `asegurar_columna` al final de la migración para no romper
            -- bases de datos ya existentes.
            CREATE TABLE IF NOT EXISTS configuracion_empresa (
                id TEXT PRIMARY KEY,
                nombre TEXT,
                codigo TEXT,
                descripcion TEXT,
                zona_horaria TEXT NOT NULL DEFAULT 'America/Lima',
                formato_fecha TEXT NOT NULL DEFAULT 'DD_MMM_YYYY',
                dias_aviso_vencimiento INTEGER NOT NULL DEFAULT 30,
                requiere_aprobacion INTEGER NOT NULL DEFAULT 1,
                stock_minimo_default INTEGER,
                pais TEXT,
                ciudad TEXT,
                direccion TEXT,
                codigo_postal TEXT,
                razon_social TEXT,
                documento_fiscal TEXT,
                direccion_fiscal TEXT,
                telefono TEXT,
                email_contacto TEXT,
                sitio_web TEXT,
                latitud REAL,
                longitud REAL,
                updated_by TEXT,
                updated_at TEXT NOT NULL
            );
            INSERT OR IGNORE INTO configuracion_empresa
                (id, updated_at) VALUES ('default', datetime('now'));

            -- ============ SUCURSALES (config de empresa, admin) ============
            -- Puntos de operación de la empresa con su ubicación geográfica
            -- (país, dirección, coordenadas para el mapa). Las gestiona el
            -- ADMIN; se rigen por el permiso `configuracion:ver/editar`.
            CREATE TABLE IF NOT EXISTS sucursales (
                id TEXT PRIMARY KEY,
                codigo TEXT NOT NULL UNIQUE,
                nombre TEXT NOT NULL,
                pais TEXT,
                ciudad TEXT,
                direccion TEXT,
                latitud REAL,
                longitud REAL,
                activo INTEGER NOT NULL DEFAULT 1,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL,
                created_by TEXT,
                updated_by TEXT
            );

            -- ============ ARCHIVOS DE EMPRESA (logo + documentos, admin) ============
            -- El logo (una sola fila de tipo LOGO, se reemplaza) y documentos
            -- adjuntos. Los bytes viajan en base64 por IPC/HTTP y se guardan
            -- como BLOB en SQLite (self-hosted, sin servicios externos).
            CREATE TABLE IF NOT EXISTS archivos_empresa (
                id TEXT PRIMARY KEY,
                nombre TEXT NOT NULL,
                tipo TEXT NOT NULL DEFAULT 'DOCUMENTO',
                mime TEXT NOT NULL,
                tamano INTEGER NOT NULL,
                datos BLOB NOT NULL,
                created_by TEXT,
                created_at TEXT NOT NULL
            );
            CREATE INDEX IF NOT EXISTS idx_archivos_empresa_tipo ON archivos_empresa(tipo);

            -- ============ PREFERENCIAS DE USUARIO (por usuario) ============
            -- Preferencias personales de UI y de presentacion. Los campos con
            -- valor NULL significan heredar de la configuracion de empresa.
            CREATE TABLE IF NOT EXISTS preferencias_usuario (
                usuario_id TEXT PRIMARY KEY REFERENCES usuarios(id),
                tamano_fuente TEXT NOT NULL DEFAULT 'MEDIA',
                orden_sidebar TEXT,
                zona_horaria TEXT,
                formato_fecha TEXT,
                updated_at TEXT NOT NULL
            );
            "
        )?;

        // Migración por columna para bases de datos existentes: las columnas
        // de datos de la empresa se agregan con ALTER TABLE si no existen. Así
        // una db creada antes de este cambio se actualiza sin borrarla (la
        // tabla ya existe y el CREATE TABLE IF NOT EXISTS no toca sus columnas).
        // OJO: solo `configuracion_empresa` tiene columnas nuevas; las tablas
        // nuevas (sucursales, archivos_empresa) ya las crea el batch anterior.
        asegurar_columna(&tx, "configuracion_empresa", "pais", "TEXT")?;
        asegurar_columna(&tx, "configuracion_empresa", "ciudad", "TEXT")?;
        asegurar_columna(&tx, "configuracion_empresa", "direccion", "TEXT")?;
        asegurar_columna(&tx, "configuracion_empresa", "codigo_postal", "TEXT")?;
        asegurar_columna(&tx, "configuracion_empresa", "razon_social", "TEXT")?;
        asegurar_columna(&tx, "configuracion_empresa", "documento_fiscal", "TEXT")?;
        asegurar_columna(&tx, "configuracion_empresa", "direccion_fiscal", "TEXT")?;
        asegurar_columna(&tx, "configuracion_empresa", "telefono", "TEXT")?;
        asegurar_columna(&tx, "configuracion_empresa", "email_contacto", "TEXT")?;
        asegurar_columna(&tx, "configuracion_empresa", "sitio_web", "TEXT")?;
        asegurar_columna(&tx, "configuracion_empresa", "latitud", "REAL")?;
        asegurar_columna(&tx, "configuracion_empresa", "longitud", "REAL")?;
        // Tema de la UI (DESIGN §3.1): paleta global (ADMIN) y modo claro/oscuro.
        // El ALTER TABLE con NOT NULL DEFAULT funciona en SQLite (sin rewrite).
        asegurar_columna(
            &tx,
            "configuracion_empresa",
            "tema_id",
            "TEXT NOT NULL DEFAULT 'rust'",
        )?;
        asegurar_columna(
            &tx,
            "configuracion_empresa",
            "modo_oscuro",
            "INTEGER NOT NULL DEFAULT 0",
        )?;
        // Preferencia personal de tema: NULL = heredar de la empresa.
        asegurar_columna(&tx, "preferencias_usuario", "tema_id", "TEXT")?;
        asegurar_columna(&tx, "preferencias_usuario", "modo_oscuro", "INTEGER")?;
        // Preferencia de búsqueda: si la ayuda aparece en el command palette
        // (Ctrl+K). Default 1 = activa (DESIGN §6.10, Hito 22).
        asegurar_columna(
            &tx,
            "preferencias_usuario",
            "ayuda_en_palette",
            "INTEGER NOT NULL DEFAULT 1",
        )?;
        // UOM: la SPEC §3.9 no define `activo`, pero la matriz de permisos
        // contempla `uom:desactivar` (GERENTE). Se agrega con default activo
        // para dbs existentes (migración idempotente como las anteriores).
        asegurar_columna(&tx, "uoms", "activo", "INTEGER NOT NULL DEFAULT 1")?;

        // Tracking total (Hito 25): columnas nuevas de `auditoria` para bases
        // ya creadas (el CREATE TABLE IF NOT EXISTS anterior no las agrega).
        asegurar_columna(
            &tx,
            "auditoria",
            "tipo_evento",
            "TEXT NOT NULL DEFAULT 'COMANDO'",
        )?;
        asegurar_columna(&tx, "auditoria", "ruta", "TEXT")?;
        asegurar_columna(&tx, "auditoria", "modulo", "TEXT")?;
        asegurar_columna(&tx, "auditoria", "proceso", "TEXT")?;
        asegurar_columna(&tx, "auditoria", "metadatos", "TEXT")?;
        asegurar_columna(&tx, "auditoria", "tenant", "TEXT")?;
        asegurar_columna(&tx, "auditoria", "duracion_vista_ms", "INTEGER")?;
        asegurar_columna(&tx, "auditoria", "hora_local", "INTEGER")?;
        asegurar_columna(&tx, "auditoria", "dia_semana", "INTEGER")?;
        // Los índices sobre estas columnas se crean aquí (no en el batch
        // inicial): en una db existente, `CREATE TABLE IF NOT EXISTS` no
        // agrega las columnas nuevas, así que crear el índice antes de los
        // `asegurar_columna` de arriba fallaba con "no such column".
        tx.execute_batch(
            "
            CREATE INDEX IF NOT EXISTS idx_auditoria_tipo_evento ON auditoria(tipo_evento);
            CREATE INDEX IF NOT EXISTS idx_auditoria_modulo ON auditoria(modulo);
            CREATE INDEX IF NOT EXISTS idx_auditoria_ruta ON auditoria(ruta);
            CREATE INDEX IF NOT EXISTS idx_auditoria_proceso ON auditoria(proceso);
            CREATE INDEX IF NOT EXISTS idx_auditoria_tenant ON auditoria(tenant);
            CREATE INDEX IF NOT EXISTS idx_auditoria_tiempo_local ON auditoria(hora_local, dia_semana);
            ",
        )?;

        // Valorización de inventario (Fase D): costo del producto, costo por
        // línea de entrada y método configurado en la empresa.
        asegurar_columna(&tx, "productos", "costo_unitario", "REAL")?;
        asegurar_columna(&tx, "movimiento_lineas", "costo_unitario", "REAL")?;
        asegurar_columna(
            &tx,
            "configuracion_empresa",
            "metodo_valorizacion",
            "TEXT NOT NULL DEFAULT 'ULTIMO'",
        )?;

        // Mapa 2D/3D de almacenes: posición libre por entidad del árbol físico.
        // NULL = sin posición asignada (el frontend hace fallback a rejilla).
        // pos_z/altura no los usa el mapa 2D actual; quedan listos para la
        // futura vista 3D de apilado vertical.
        for tabla in ["almacenes", "zonas", "racks", "ubicaciones", "pasillos"] {
            asegurar_columna(&tx, tabla, "pos_x", "REAL")?;
            asegurar_columna(&tx, tabla, "pos_y", "REAL")?;
            asegurar_columna(&tx, tabla, "pos_z", "REAL")?;
            asegurar_columna(&tx, tabla, "altura", "REAL")?;
        }

        // Modo construcción (SPEC §14, layout físico): tamaño real del
        // rectángulo que ocupa cada elemento redimensionable en el plano.
        // Los defaults replican las constantes visuales que el mapa usaba
        // antes de haber tamaños en BD (ningún mapa existente salta). Las
        // ubicaciones quedan de tamaño fijo (bins uniformes) y no llevan
        // columnas. El motor de colisión vive en `mapa.rs`.
        asegurar_columna(&tx, "zonas", "ancho", "REAL NOT NULL DEFAULT 150")?;
        asegurar_columna(&tx, "zonas", "profundidad", "REAL NOT NULL DEFAULT 70")?;
        asegurar_columna(&tx, "pasillos", "ancho", "REAL NOT NULL DEFAULT 130")?;
        asegurar_columna(&tx, "pasillos", "profundidad", "REAL NOT NULL DEFAULT 56")?;
        asegurar_columna(&tx, "racks", "ancho", "REAL NOT NULL DEFAULT 110")?;
        asegurar_columna(&tx, "racks", "profundidad", "REAL NOT NULL DEFAULT 56")?;

        // Pasillo (Hito Pasillo): etiqueta opcional de agrupación dentro de la
        // zona del rack. Aditivo — no toca la FK obligatoria rack.zona_id.
        asegurar_columna(&tx, "racks", "pasillo_id", "TEXT REFERENCES pasillos(id)")?;
        tx.execute_batch("CREATE INDEX IF NOT EXISTS idx_racks_pasillo ON racks(pasillo_id);")?;

        // Unicidad por almacén (SPEC §3.2-3.5): denormaliza almacen_id en las
        // 5 entidades del árbol para poder hacer UNIQUE(almacen_id, codigo)
        // a nivel DB (antes solo code-level con SELECT COUNT). Migrado para
        // dbs existentes (ALTER + backfill), y en dbs nuevas queda listo.
        for (tabla, sql) in [
            ("pasillos", "TEXT REFERENCES almacenes(id)"),
            ("racks", "TEXT REFERENCES almacenes(id)"),
            ("secciones", "TEXT REFERENCES almacenes(id)"),
            ("ubicaciones", "TEXT REFERENCES almacenes(id)"),
            ("cajas", "TEXT REFERENCES almacenes(id)"),
        ] {
            asegurar_columna(&tx, tabla, "almacen_id", sql)?;
        }
        // Backfill: resolver almacen_id por transitividad para filas existentes.
        tx.execute_batch(
            "
            UPDATE pasillos SET almacen_id = (SELECT almacen_id FROM zonas WHERE zonas.id = pasillos.zona_id) WHERE almacen_id IS NULL;
            UPDATE racks SET almacen_id = (SELECT almacen_id FROM zonas WHERE zonas.id = racks.zona_id) WHERE almacen_id IS NULL;
            UPDATE secciones SET almacen_id = (SELECT almacen_id FROM zonas WHERE zonas.id = (SELECT zona_id FROM racks WHERE racks.id = secciones.rack_id)) WHERE almacen_id IS NULL;
            UPDATE ubicaciones SET almacen_id = COALESCE(
                (SELECT almacen_id FROM zonas WHERE zonas.id = (SELECT zona_id FROM racks WHERE racks.id = (SELECT rack_id FROM secciones WHERE secciones.id = ubicaciones.seccion_id)) ),
                (SELECT almacen_id FROM zonas WHERE zonas.id = (SELECT zona_id FROM racks WHERE racks.id = ubicaciones.rack_id)),
                (SELECT almacen_id FROM zonas WHERE zonas.id = ubicaciones.zona_id)
            ) WHERE almacen_id IS NULL;
            UPDATE cajas SET almacen_id = (SELECT almacen_id FROM ubicaciones WHERE ubicaciones.id = cajas.ubicacion_id) WHERE almacen_id IS NULL;
            ",
        )?;
        // Índices únicos por almacén (solo filas activas, para permitir reciclaje).
        // Se crean después del backfill para que no fallen por NULLs antiguos.
        tx.execute_batch(
            "
            CREATE UNIQUE INDEX IF NOT EXISTS idx_pasillos_codigo_almacen ON pasillos(almacen_id, codigo) WHERE activo = 1;
            CREATE UNIQUE INDEX IF NOT EXISTS idx_racks_codigo_almacen ON racks(almacen_id, codigo) WHERE activo = 1;
            CREATE UNIQUE INDEX IF NOT EXISTS idx_secciones_codigo_almacen ON secciones(almacen_id, codigo) WHERE activo = 1;
            CREATE UNIQUE INDEX IF NOT EXISTS idx_ubicaciones_codigo_almacen ON ubicaciones(almacen_id, codigo) WHERE activo = 1;
            CREATE UNIQUE INDEX IF NOT EXISTS idx_cajas_codigo_almacen ON cajas(almacen_id, codigo) WHERE activo = 1;
            CREATE INDEX IF NOT EXISTS idx_pasillos_almacen ON pasillos(almacen_id);
            CREATE INDEX IF NOT EXISTS idx_racks_almacen ON racks(almacen_id);
            CREATE INDEX IF NOT EXISTS idx_secciones_almacen ON secciones(almacen_id);
            CREATE INDEX IF NOT EXISTS idx_ubicaciones_almacen ON ubicaciones(almacen_id);
            CREATE INDEX IF NOT EXISTS idx_cajas_almacen ON cajas(almacen_id);
            ",
        )?;

        // Recupera el correlativo máximo ya usado por año (para dbs existentes)
        // y lo deja como valor de arranque; en dbs nuevas no hay filas y es 0.
        tx.execute_batch(
            "
            INSERT INTO correlativos (clave, valor)
                SELECT 'MOV-' || substr(numero, 5, 4),
                       MAX(CAST(substr(numero, 10) AS INTEGER))
                FROM movimientos
                WHERE numero LIKE 'MOV-____-%'
                GROUP BY substr(numero, 5, 4)
            ON CONFLICT(clave) DO UPDATE SET valor = MAX(valor, excluded.valor);
            ",
        )?;

        tx.commit()?;
        Ok(())
    }
}

/// ¿Existe la columna `columna` en la tabla `tabla`? (PRAGMA table_info)
fn columna_existe(conn: &Connection, tabla: &str, columna: &str) -> AppResult<bool> {
    let mut stmt = conn.prepare(&format!("PRAGMA table_info({tabla})"))?;
    let filas = stmt.query_map([], |r| r.get::<_, String>(1))?;
    for nombre in filas {
        if nombre? == columna {
            return Ok(true);
        }
    }
    Ok(false)
}

/// Agrega la columna si no existe (migración idempotente para dbs existentes).
fn asegurar_columna(
    conn: &Connection,
    tabla: &str,
    columna: &str,
    definicion: &str,
) -> AppResult<()> {
    if !columna_existe(conn, tabla, columna)? {
        conn.execute(
            &format!("ALTER TABLE {tabla} ADD COLUMN {columna} {definicion}"),
            [],
        )?;
    }
    Ok(())
}
