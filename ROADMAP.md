# ROADMAP.md — Rustock

> Plan de implementación derivado del `SPEC.md`. Orden de fases para que el
> agente no implemente fuera de orden ni salte dependencias. Cada fase termina
> con el pipeline de calidad pasando (`/verify`).

---

## Fase 0 — Fundación ✅ (completada)

- [x] Scaffold Tauri v2 + React 19 + TS 7 + Vite 8
- [x] Sistema de diseño en CSS puro (`src/styles/`) con tokens de DESIGN.md
- [x] Biblioteca de componentes (`src/shared/ui/`) con Icon (lucide-react)
- [x] Pipeline de calidad: lefthook (pre-commit/pre-push), oxlint, prettier,
      DesignGuard, rustfmt, clippy, build
- [x] Docs: SPEC.md, DESIGN.md, STACK.md, AGENTS.md, ROADMAP.md

---

## Fase 1 — Capa de datos (SQLite) ✅ (backend completo)

**Base:** SPEC §5 (saldos), §14 (reglas transversales), §15.11 (indexación).

- [x] Migraciones de esquema SQLite (rusqlite) en Rust
- [x] Catálogo de tablas: usuarios, roles, permisos, almacenes, zonas, racks,
      secciones, ubicaciones, cajas, productos, categorías, UOM, proveedores,
      clientes, lotes
- [x] Tablas de movimiento y líneas; tabla de saldos **materializados** con
      índices por (ubicación, producto, lote)
- [x] Auditoría (quién/quién-qué/cuándo) e historial inmutable
- [x] Comandos Tauri CRUD base + acceso a datos solo desde Rust

**Criterio de salida:** `cargo check` + tests básicos de esquema. ✅

---

## Fase 2 — Catálogos (entidades maestras) — backend ✅, UI pendiente

**Base:** SPEC §3 (entidades) con sus reglas de jerarquía y unicidad.

- [x] CRUD completo de Almacén → Zona → Rack → Sección → Ubicación → Caja
      (incluye editar/desactivar en las 6; árbol simplificado sección/rack/zona)
- [x] CRUD de Producto/SKU, Categoría, UOM, Proveedor, Cliente, Lote
- [x] Validaciones: códigos únicos/normalizados, desactivación (no borrado),
      ciclos reales en categorías, restricción de caja por producto/lote
- [ ] UI por página (listado/detalle/nuevo/editar/eliminar) para cada una,
      siguiendo DESIGN.md (cero modales) — **siguiente hito del proyecto**

**Criterio de salida:** navegación completa de catálogos con el estándar de
consulta universal (filtros/orden/búsqueda/paginación) funcionando. Backend
listo (§15 aplicado a los 15 recursos principales); falta la UI.

---

## Fase 3 — Usuarios, roles y permisos ✅ (backend completo)

**Base:** SPEC §4 (usuarios, roles, permisos, matriz, auditoría).

- [x] Autenticación local (self-hosted, argon2) + roles por defecto (ADMIN,
      GERENTE, ENCARGADO_ALMACEN, OPERADOR, LECTOR)
- [x] Permisos granulares `recurso:accion` aplicados a cada operación
      (incluidas las lecturas, antes sin gatear)
- [ ] Páginas de gestión de usuarios/roles + perfil (UI pendiente)
- [x] Registro de auditoría en cada operación, incluidos los intentos
      denegados (`SinPermiso`/`NoAutenticado`)

**Criterio de salida:** la matriz de permisos de SPEC §4.4 se cumple en toda
operación. ✅ backend.

---

## Fase 4 — Stock y movimientos (núcleo) ✅ (backend completo)

**Base:** SPEC §5, §6, §7, §8, §9, §10.

- [x] Modelo de movimiento con ciclo de vida (borrador → pendiente → aprobado
      → anulado) y anulación con inverso
- [x] Entradas (compra, devolución, ajuste +, inicial — con permiso
      `configuracion:ejecutar`)
- [x] Salidas (cliente, devolución proveedor, merma, ajuste −) con política
      FIFO/FEFO (`sugerir_lineas_salida`) y regla de lotes vencidos
- [x] Traslados (entre ubicaciones, cajas, almacenes) atómicos — inter-almacén
      genera dos movimientos ligados por `documento_referencia` (§9.3)
- [x] Ajustes con motivo obligatorio; invariante de saldo ≥ 0; bloqueados
      durante sesión de inventario `EN_CURSO` del mismo almacén (§14.6)
- [x] Saldos materializados actualizados en transacción al aprobar;
      `capacidad_maxima` valida el total de la ubicación, no solo el producto
      entrante

**Criterio de salida:** los casos de uso 18.1, 18.2, 18.3, 18.6 funcionan de
extremo a extremo. ✅

---

## Fase 5 — Inventario físico y conteo ✅ (backend completo)

**Base:** SPEC §11 (sesiones, conteo ciego, doble conteo, diferencias,
precisión).

- [x] Sesiones de inventario (completo/cíclico) con estados y alcance
- [x] Registro de conteos (conteo ciego si aplica)
- [x] Doble conteo en diferencias; generación de ajustes al cerrar
- [x] Métricas de precisión (por SKU, por cantidad, por ubicación) —
      `repo::inventario::precision_sesion`

**Criterio de salida:** caso de uso 18.4 completo + reporte de precisión. ✅

---

## Fase 6 — Comentarios, trazabilidad y auditoría ✅ (backend completo)

**Base:** SPEC §12, §13.

- [x] Comentarios anclados a cualquier entidad (sin borrado, edición con
      historial en `comentario_historial`)
- [x] Líneas de tiempo: producto (`movimientos_de_producto_en_rango`),
      ubicación/lote (`donde_esta_lote`), movimiento (estado + inverso)
- [x] Consultas de trazabilidad: las 5 de §13.4 (`donde_esta_lote`,
      `origen_de_salida`, `movimientos_de_producto_en_rango`,
      `lotes_por_vencer`, `historial_caja`)

**Criterio de salida:** las 5 consultas de trazabilidad de §13.4 respondidas. ✅

---

## Fase 7 — Estándar universal de consulta + reportes + alertas ✅ (backend completo)

**Base:** SPEC §15, §16, §17.

- [x] Motor de consulta universal en Rust (`query.rs`): paginación, orden,
      búsqueda, filtros (`eq/neq/gt/lt/in/between/is_null/...`), proyección,
      agregaciones, exportación (SPEC §15)
- [x] Los 15 listados principales lo usan (el resto de reportes tabulares de
      §16.2 se resuelven contra estos mismos esquemas desde el frontend,
      filtros/orden/búsqueda quedan pendientes de reflejarse en la URL cuando
      exista la UI)
- [x] Dashboard con KPI (SPEC §16.1) — `obtener_dashboard`
- [x] Reportes: kardex (`kardex_producto`), vencimientos (`lotes_por_vencer`),
      precisión (`precision_sesion`), auditoría (`listar_historial`); stock
      actual/movimientos/entradas/salidas por periodo vía el motor genérico
- [x] Alertas (stock bajo, excedido, sobrecapacidad, lote por vencer/vencido,
      diferencia de inventario, movimiento pendiente) — `regenerar_alertas`

**Criterio de salida:** cada endpoint de listado cumple SPEC §15 y el dashboard
muestra los KPI. ✅ backend (detalle completo en MEMORY.md, Hito 7).

---

## Fase 8 — Pulido UX y desempeño ✅ (completada)

**Base:** DESIGN.md completo + STACK.md §8 (decisiones de rendimiento).

- [x] Virtualización de listas grandes (@tanstack/react-virtual) — en la
      `Table` genérica (umbral > 80 filas)
- [x] Code-splitting por ruta (lazy) — 53 chunks JS en el build
- [x] Cache de servidor (react-query)
- [x] Estados vacíos, skeletons, error panels, toasts en todas las páginas
- [x] Accesibilidad (foco visible, contraste AA, teclado, skip-link)
- [x] Audit final contra el checklist de DESIGN §11

---

## Fase 9 — Empaquetado y release ✅ (completada)

**Base:** STACK.md §3.2 (perfil release), §9 (comandos).

- [x] Revisar `tauri build` (deb/rpm) con el binario optimizado — el binario
      release compila; el empaquetado deb/rpm se verifica en una máquina con
      `dpkg-deb`/`rpmbuild` (no presentes en este entorno)
- [x] Ajustar iconos de la app, metadatos y descripción del producto
- [x] Documentación de instalación y primer arranque (bootstrap de ADMIN) —
      `INSTALACION.md`

---

## Fuera de alcance (SPEC §20)

Reservas/stock comprometido, pedidos (OC/OV), multi-rol por usuario,
integradones externas (hardware/email), valorización de inventario, API
pública. No implementar salvo que el usuario lo pida explícitamente.

---

## Reglas para el agente

- Trabajar **en orden de fase**: no implementar la fase 5 sin terminar la 4.
- Cada fase termina con `/verify` en verde y, si el usuario lo pide, un commit.
- Si una fase crece demasiado, dividir en sub-tareas (todowrite) y avisar.
- No marcar ítems como completados sin haberlo verificado realmente.

---

## Fase 10 — Escáner y trazabilidad de lectura

### Entrega 1 — Cimientos ✅

- [x] Tabla `eventos_escaneo` con migración idempotente (SPEC §14.3.4).
- [x] Recurso `escaneo` y acción `usar`; `escaneo:usar` y `escaneo:ver` en la matriz de permisos, con denegación explícita al LECTOR.
- [x] `escanear(entrada)`: resuelve el código, registra el evento y **registra también el intento denegado** antes de devolver el error.
- [x] `listar_eventos_escaneo(limite)` tras `escaneo:ver`.
- [x] Ruta `/escanear`: cámara (`BarcodeDetector` nativo con respaldo `zxing-wasm` cargado bajo demanda) y lector de mano en la misma pantalla.
- [x] Botón de escáner global en la barra superior, oculto para los roles sin permiso.
- [x] `Permissions-Policy` deja de bloquear la cámara.
- [x] 6 pruebas en `tests.rs` sobre resolución, fallos acumulados, denegación y copia del rol.

### Entrega 2 — Etiquetas ✅

- [x] Code128 implementado en Rust (tabla de 107 patrones, checksum módulo 103, patrón de parada de 13 módulos) y QR con el crate `qrcode`; ambos se dibujan como SVG en milímetros reales.
- [x] `generar_etiquetas(peticion)` y `listar_etiquetables(tipo, busqueda)`, tras el `ver` del recurso correspondiente.
- [x] Ruta `/etiquetas`: selección, simbología, tamaño y disposición (hoja A4 / rollo), con vista previa e impresión del navegador vía `@media print`.
- [x] Etiqueta de producto, ubicación, lote y caja, con el mismo código que resuelve el escáner.
- [x] Aviso de legibilidad: se calcula el ancho de barra estrecha y se avisa por debajo de 0,25 mm **antes** de imprimir.
- [x] 7 pruebas en `tests.rs` + `scripts/verificar-code128.mjs` y `scripts/verificar-etiquetas.mjs`, que decodifican con zxing lo que genera Rust.

### Entrega 3 — Acciones desde la lectura ✅

- [x] `acciones()` en Rust: qué se puede hacer con lo leído, filtrado por los permisos de quien escanea.
- [x] El `proposito` decide la acción principal (`CONSULTA` → ver, `CAPTURA` → movimiento, `INVENTARIO` → contar).
- [x] Código desconocido → alta con el código precargado (`/productos/nuevo?codigo=…`), sin romper §14.3.
- [x] La pantalla del escáner solo pinta lo que decide el backend; no propone nada por su cuenta.
- [x] 3 pruebas: el escaneo no crea nada, las acciones respetan permisos, el propósito manda.

### Entrega 4 — Panel de tracking ✅

- [x] `metricas_escaneo(dias)` calcula todo en Rust: acierto, reparto cámara/lector, tiempo medio, actividad por persona y volumen por hora.
- [x] Códigos que fallan más de una vez, con cuántas personas tropezaron.
- [x] Intentos denegados agrupados por persona y rol.
- [x] Ruta `/escaneos`, tras `escaneo:ver` (GERENTE y ADMIN).
- [x] 3 pruebas sobre separación de desenlaces, umbral de repetición y origen.

### Prerrequisito resuelto — Sesión por cliente ✅

El servidor HTTP tenía **una sola sesión para todo el proceso**: la última persona en entrar se llevaba por delante la de todas las demás, y la auditoría atribuía sus actos a quien no fue. Sin esto, el tracking de las entregas anteriores era papel mojado en modo navegador.

- [x] `RegistroSesiones`: una sesión por cliente, identificada por token opaco en la cabecera `x-rustock-sesion`.
- [x] Sesión con **ámbito de petición**: el despacho sigue llamando a `sesion.usuario_id()` sin cambiar una línea.
- [x] **Sin token no hay sesión.** El servidor HTTP ya no hereda la de la ventana de escritorio.
- [x] Cabecera en vez de cookie: el frontend vive en otro origen y una cookie `SameSite` no viajaría.
- [x] El token vive en `sessionStorage`: cerrar la pestaña cierra la sesión, que es lo que espera un equipo compartido de almacén.
- [x] 2 pruebas de aislamiento entre sesiones y de token desconocido.

### Revisión de cobertura ✅

- [x] **Agujero cerrado**: Captura rápida —la pantalla donde más se escanea— resolvía códigos con `resolver_escaneo`, que no registraba nada. Todos esos escaneos eran invisibles en el panel. Ahora usa `escanear` con propósito `CAPTURA`.
- [x] `resolver_escaneo` **retirado** de la superficie de comandos (Tauri y HTTP). Queda solo como función interna del repositorio, invocada por `escanear`. Escanear sin dejar rastro ya no es posible por construcción.
- [x] Escucha global del lector de mano en cualquier pantalla, con heurístico verificado.
- [x] Cámara a 12 muestras/s, sin relecturas del mismo código en el encuadre, con pitido y vibración de confirmación.

### Entrega 2b — Formatos de salida y conexión con impresoras ✅

- [x] **PDF** generado a mano en Rust con fuentes base (sin incrustar tipografías, sin dependencia nueva); hoja A4 y rollo.
- [x] **ZPL** (Zebra y la mayoría de genéricas) y **EPL** (modelos antiguos), con la impresora dibujando el código.
- [x] **PNG** rasterizado en el navegador desde el SVG.
- [x] Resolución seleccionable (203 / 300 / 600 dpi): ZPL y EPL miden en puntos, no en milímetros.
- [x] **Envío directo al puerto 9100** con `imprimir_etiquetas`, y `probar_impresora` para descartar IP mal escrita o impresora apagada.
- [x] Caracteres de control de ZPL saneados; paréntesis y barras escapados en PDF.
- [x] 8 pruebas en `tests.rs` + `scripts/verificar-pdf-etiquetas.mjs`, que **rasteriza el PDF a 600 dpi y decodifica los códigos con zxing**.

### Entrega 2c — Etiquetado integrado en los módulos ✅

- [x] Botón **Etiqueta** en la ficha de producto, ubicación, lote y caja (un solo cambio en `CatalogDetailPage` cubre los cuatro).
- [x] Acción **Imprimir etiqueta** en el resultado de un escaneo.
- [x] Deep-link `/etiquetas?tipo=&ids=` que **genera la vista previa sola** al llegar con selección.
- [x] Ajustes recordados por equipo: simbología, tamaño, disposición, dpi y dirección de la impresora.

---

## Fase 11 — Reglas de negocio configurables

### Entrega 1 — Motor de reglas ✅

- [x] Tabla `reglas_negocio` con migración idempotente.
- [x] Seis ámbitos (almacén → ubicación) con herencia: la regla del nivel superior alcanza a todo lo que cuelga de él.
- [x] Nueve tipos: topes de peso, cantidad, volumen y SKU distintos; prohibición y exclusividad de categoría; producto prohibido; exigir lote; prohibir vencidos.
- [x] Severidad `BLOQUEA` / `ADVIERTE`.
- [x] Evaluación del **estado resultante** dentro de la transacción de aprobación.
- [x] Aviso explícito cuando una regla no puede evaluarse por falta de datos del producto.
- [x] `simular_reglas` para avisar antes de registrar.
- [x] Recurso `regla` en la matriz de permisos.
- [x] Rutas `/reglas`, `/reglas/nueva` y `/reglas/:id/editar`, con el formulario ordenado como la frase que la persona piensa.
- [x] 9 pruebas en `tests.rs` sobre acumulación, herencia de ámbito, prohibiciones, homogeneidad, avisos y reglas apagadas.

### Pendiente de la Fase 11

- [ ] **Puestos y asignaciones**: operadores asignados a pasillos y a revisión, turnos, predefinidos.
- [ ] **Estados configurables**: crear y nombrar estatus propios por entidad.
- [ ] **Flujos**: uno ideal predefinido y otro a medida.
- [ ] **Etiquetado en el resto de módulos** (hoy en catálogo y escáner).

---

## Fase 12 — Internacionalización (es / en)

### Entrega 1 — Cimientos ✅

- [x] Diccionarios tipados: `es` como fuente de verdad, `en` comprobado por el compilador. Una traducción que falte no compila (verificado).
- [x] Entradas con datos como funciones, no plantillas: los parámetros se comprueban en el punto de uso.
- [x] Store de idioma con copia local para el primer frame y `<html lang>` sincronizado.
- [x] Selector en la barra superior, con cada idioma en su propia lengua.
- [x] Shell completo: navegación, barra superior, migas, avisos de plataforma, roles y command palette.
- [x] Pantallas de acceso, incluidos los mensajes de validación de los formularios.

### Entrega 2 — Errores traducibles ✅

- [x] `AppError::codigo()` y `AppError::datos()` para las 30 variantes; los códigos son contrato y no cambian aunque se reescriba el texto.
- [x] Serialización como objeto `{codigo, datos, mensaje}` por IPC y por HTTP; `error` se mantiene con el texto castellano como respaldo y para los registros.
- [x] `ErrorRustock` en el frontend normaliza lo que llega por las dos vías.
- [x] Los 30 errores redactados en castellano e inglés; `mensajeError()` compone la frase en el idioma activo.
- [x] Fechas y horas con la etiqueta BCP-47 del idioma activo.
- [x] 3 pruebas: cada error lleva código y datos, la serialización tiene la forma esperada, y los códigos son únicos y con formato estable.

### Pendiente

- [ ] **Prosa dentro de los datos**: 104 usos de `CampoRequerido`/`CampoInvalido` pasan una frase castellana como nombre del campo (`"límite en kg para la regla 'Sin tope'"`). Traducir el envoltorio no basta: hay que convertirlos a claves de campo estables.
- [ ] **Cadenas de interfaz**: ~1 000 textos en 119 archivos `.tsx`.
- [ ] **Prosa larga**: ayuda (26 guías + glosario), manual del cliente (8 partes) y landing — 6 854 líneas.
- [ ] Preferencia de idioma en el perfil (migración `preferencias_usuario.idioma`).
