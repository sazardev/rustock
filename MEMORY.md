# MEMORY.md — Rustock

> **Memoria persistente del proyecto para el agente.**
> Este documento es el punto de partida de cada sesión: resume el estado actual,
> las decisiones tomadas (y por qué), el historial versionado de lo que se ha
> hecho, y el trabajo en progreso. Se actualiza en cada hito.

---

## 1. Estado actual (snapshot)

| Campo | Valor |
|---|---|
| **Versión activa** | `0.3.0` (sincronizada en package.json, Cargo.toml, tauri.conf.json) |
| **Último tag** | `v0.3.0` |
| **Fase del roadmap** | Backend: completo (§3-§17). Frontend: plan de 6 fases FE-1..FE-6 — **completo**. Modo navegador real (servidor HTTP local) — **completo**. Ver Hitos 8-10 en §2 |
| **Backend Rust** | Autenticación real (argon2 + sesión), motor de consulta universal (SPEC §15), CRUD completo de catálogos, árbol de ubicación simplificado, restricción de caja, código de barras, FIFO/FEFO, traslado inter-almacén, comentarios con historial, trazabilidad (§13.4), alertas (§17), dashboard/KPIs/kardex (§16) **y servidor HTTP local en `:1421`** (`server.rs`) que expone la misma lógica para navegadores normales. 66 tests pasan, clippy y fmt limpios. Incluye `seed.rs` para datos de ejemplo (`RUSTOCK_SEED=1`, solo debug) |
| **Pipeline de calidad** | Activo: pre-commit, pre-push, commit-msg (lefthook) |
| **Guardas de opencode** | Activas: agente `rustock`, `/verify`, `/feature`, `/fix` |
| **Repo** | Git en `main` |

**Árbol de documentación (fuentes de verdad):**
`AGENTS.md` (reglas del repo) → `SPEC.md` (lógica de negocio) → `DESIGN.md`
(sistema de diseño) → `STACK.md` (stack) → `VERSIONING.md` (versionado) →
`ROADMAP.md` (orden de implementación) → `MEMORY.md` (este, memoria de sesión).

---

## 2. Historial versionado de lo hecho (hito por hito)

Cada hito está anclado a un commit. El changelog completo vive en
`CHANGELOG.md`; aquí está el contexto de decisión de cada uno.

### v0.1.0 — Fundación (completa, tag `v0.1.0`)

**Hito 1 — Scaffold** (`164e782`)
- Tauri v2 + React 19.2.8 + TypeScript 7.0.2 (compilador Go nativo) + Vite 8.2.1.
- Rust edition 2024, perfil release optimizado (`lto`, `codegen-units=1`,
  `opt-level=3`, `panic=abort`, `strip`).
- Perfil release verificado: binario ~5 MB, builds deb/rpm.
- **Decisión:** AppImage deshabilitado (`targets: ["deb","rpm"]`) porque el
  `linuxdeploy` de esta máquina falla. No re-habilitar salvo que el entorno
  se arregle.

**Hito 2 — Sistema de diseño en CSS puro + docs** (`756e36e`)
- **Decisión importante:** se migró de **Tailwind CSS a CSS puro modular**
  (`src/styles/` con `tokens.css`, `base.css`, `layout.css`, `components.css`,
  `utilities.css`, `responsive.css`). Tailwind fue **eliminado** de las
  dependencias y de `vite.config.ts`.
- Biblioteca de componentes en `src/shared/ui/` (Icon con lucide-react, Card,
  Table, Form, Toast, etc.).
- Se escribieron `SPEC.md` (1.149 líneas de lógica de negocio), `DESIGN.md`
  (897 líneas), `STACK.md` (252 líneas) y `AGENTS.md`.

**Hito 3 — Pipeline de calidad** (incluido en `756e36e`)
- **lefthook 2.1.10** con hooks `pre-commit` (rápido, solo staged) y `pre-push`
  (completo, secuencial).
- **oxlint 1.77 + oxlint-tsgolint** como linter. **Decisión clave:**
  `typescript-eslint` está **prohibido** porque rechaza TypeScript 7.0.2
  (peer `<6.1.0`). El linter es oxlint, que sí soporta TS 7.
- **prettier 3.9.6** como formatter (`.prettierrc`: semi, dobles comillas,
  trailing comma all, printWidth 100; markdown ignorado).
- **DesignGuard** (`scripts/design-guard.mjs`): gate del DESIGN.md que bloquea
  emojis, border-radius>0, sombras/gradientes/blur, `alert/confirm/prompt`,
  fuentes fuera de Open Sans/JetBrains Mono e iconos fuera de lucide-react.
- Durante la instalación se corrigieron errores reales detectados por el
  pipeline en `Card.tsx`, `Field.tsx`, `Icon.tsx` (clave duplicada `cerrar` →
  `cerrarPanel`), `Toast.tsx` (narrowing), y lint `no-array-sort` en App.tsx.

**Hito 4 — Guardas de opencode** (`407ccb1`)
- `opencode.json`: `default_agent: rustock`, `instructions` con los 4 docs,
  permisos (git push/`--no-verify`/rm -rf denegados, resto bash ask).
- `.opencode/agent/rustock.md`: agente primario con disciplina completa.
- Comandos `/verify`, `/feature`, `/fix` (`.opencode/command/`).
- `ROADMAP.md`: 10 fases derivadas del SPEC.

**Hito 5 — Versionador** (`9855266` + `094b583`)
- **git-cliff 2.13.1** (`cliff.toml`, sin emojis por DESIGN §1.1) genera
  `CHANGELOG.md` desde Conventional Commits.
- `scripts/release.mjs`: sincroniza la versión en **las 3 fuentes**
  (package.json, Cargo.toml, tauri.conf.json), regenera changelog, commit
  `chore(release): prepare for X.Y.Z`, tag anotado `vX.Y.Z`.
- Hook **commit-msg** valida Conventional Commits (`scripts/check-commit.mjs`).
- `VERSIONING.md`: política SemVer + mapa de versiones a trabajar.
- Durante el cierre se corrigió de nuevo el typecheck (Card `Omit<...,"title">`,
  se quitaron demos sin uso `DemoBadges`).

### Hito 6 — Capa de datos SQLite en Rust (Fase 1 del ROADMAP)

- **rusqlite 0.40.2 (bundled)**: SQLite embebido self-hosted. `db.rs` con
  migraciones y esquema completo: seguridad (roles, usuarios, permisos,
  auditoría), árbol físico (almacén→zona→rack→sección→ubicación→caja),
  catálogos (producto, categoría, UOM, proveedor, cliente, lote),
  movimientos + líneas, **saldos materializados**, sesiones de inventario +
  conteos, comentarios, alertas.
- **`error.rs`**: `AppError` con mensajes en español del SPEC (saldo
  insuficiente con ubicación/disponible/intentado, lote vencido, motivo
  requerido, transiciones inválidas, etc.).
- **`domain/`**: tipos de entidades + enums (tipo/sub-tipo/estado de
  movimiento, tipo de ubicación, roles, permisos granulares).
- **`repo/`**: CRUD con validaciones del SPEC (códigos únicos/normalizados,
  producto inactivo rechaza movimientos, controla_lote obliga lote,
  capacidad de ubicación, lote vencido no sale a cliente).
- **`repo/movimiento.rs`**: ciclo de vida completo (BORRADOR →
  PENDIENTE_APROBACION → APROBADO → ANULADO), aprobación atómica que actualiza
  saldos, anulación que **genera el inverso**, invariante de saldo ≥ 0.
- **`repo/inventario.rs`**: sesiones (completo/cíclico), conteos, diferencias,
  cierre que genera ajustes de diferencias.
- **`security.rs`**: matriz de permisos del SPEC §4.4 + seed de roles por
  defecto + bootstrap ADMIN.
- **`commands.rs`**: 40+ comandos Tauri (listar/crear/obtener para catálogos,
  usuarios, movimientos, saldos, sesiones, conteos).
- **12 tests de integración** (`src/tests.rs`) que verifican: normalización de
  códigos, duplicados rechazados, entrada→saldo, salida sin saldo rechazada,
  traslado atómico, motivo de ajuste, anulación con inverso, cierre de
  inventario con ajustes, control de lote.
- **Bugs de diseño corregidos durante el desarrollo**: `saldos.lote_key` ('' 
  para lote NULL) para que UNIQUE/ON CONFLICT funcione en SQLite; inversión de
  sentido al anular; valor neto + ON CONFLICT suma en saldos.

### Hito 7 — Backend completo conforme al SPEC (en curso, plan de 7 fases)

Trabajo pedido por el usuario: "implementar todo el backend acorde el spec de
manera segura y consistente". Un audit exhaustivo (agente Explore) encontró
que, tras el Hito 6, el backend tenía dos huecos de seguridad reales y no
implementaba el resto del SPEC (§12, §13, §15, §16, §17, partes de §3/§6-10).
Se armó un plan de 7 sub-fases (guardado en
`~/.claude/plans/vivid-scribbling-cook.md`), **solo backend** (`src-tauri/`,
sin tocar `src/` porque el frontend aún no llama ningún comando de negocio
real — confirmado por grep). Cada fase se cierra con `cargo fmt --all --check`
+ `cargo clippy --all-targets --all-features -- -D warnings` + `cargo test`
en verde antes de seguir.

**Fase A — Autenticación y sesión (completa)**
- `argon2` para hashear contraseñas; `src-tauri/src/sesion.rs` nuevo con
  `SesionState`/`SesionActiva` (sesión única en memoria del proceso, un solo
  usuario a la vez — es una app de escritorio de un proceso).
- Comandos `login`/`logout`/`quien_soy`. `crear_usuario`/`bootstrap_admin`
  reciben `password` en texto plano (IPC local) y lo hashean en Rust;
  `Usuario.password_hash` tiene `#[serde(skip_serializing)]` (nunca sale al
  frontend).
- `puede()` (`security.rs`) ya **no** tiene el bypass de "sin usuario =
  permitido"; ahora `None` siempre es `AppError::NoAutenticado`. El único
  camino sin sesión sigue siendo `bootstrap_admin` (no llama a `puede()`).
- Todos los comandos de `commands.rs` dejaron de aceptar `created_by`/`by`/
  `usuario_id` del invocador: lo resuelven de `SesionState`. Los campos
  `created_by` en los structs `Nuevo*` tienen `#[serde(skip_deserializing)]`.
- Todos los `listar_*`/`obtener_*` ahora exigen permiso `ver` (antes no
  comprobaban nada). Macro `con_auditoria!` registra cada invocación
  (éxito/fallo) con el actor real de la sesión.
- Bug encontrado y corregido: `crear_uom` llamaba `puede(conn, None, ...)`
  siempre — corría permanentemente en modo bootstrap sin verificar nada.

**Fase B — Motor de consulta universal, SPEC §15 (completa)**
- `src-tauri/src/query.rs` nuevo: `ListParams` (un solo struct recibido por
  IPC), `ResourceSchema`/`ColumnDef` (allowlist explícita de columnas por
  recurso — un nombre fuera de la lista es `AppError::FiltroInvalido`, nunca
  se interpola a SQL), parser de filtros (`eq/neq/gt/gte/lt/lte/in/nin/
  contains/starts/ends/between/is_null/not_null`) con valores siempre
  parametrizados, búsqueda `q` multi-término, orden, paginación (con tope
  `page_size` y `page_size:-1`/`export` para "todo con tope de seguridad"),
  agregación (`group_by`+`metrics`) y proyección (`fields`).
- Nuevo `domain::Listado` (enum `Filas(Paginado<Value>)`/`Grupos(Agregado<Value>)`)
  — el `Paginado<T>`/`PaginadoMeta` que existía sin uso desde el Hito 6 por
  fin se usa.
- Los 15 `listar_*` principales (almacenes, zonas, racks, secciones,
  ubicaciones, cajas, productos, lotes, proveedores, clientes, uoms,
  categorías, usuarios, movimientos, sesiones de inventario) migrados al
  motor genérico; se borraron las funciones `listar_*` ad-hoc redundantes en
  `repo/`. `listar_saldos`/`listar_conteos`/`listar_roles` quedaron fuera a
  propósito (reuso interno o naturaleza no-entidad — ver el plan).

**Fase C — Catálogos completos, SPEC §3 (completa)**
- `editar_*`/`desactivar_*` para las 10 entidades que no lo tenían (almacén,
  zona, rack, sección, ubicación, caja, categoría, proveedor, cliente,
  producto) + `editar_lote`. `sku`/`codigo` nunca son editables por este
  camino (se tratan como estables una vez creados).
- Detección real de ciclos en categorías (recorrido de ancestros, no solo
  "el padre existe"); mover una categoría a raíz (`parent_id: Some(None)`).
- Árbol de ubicación simplificado (SPEC §3.5/§3.13): `ubicaciones.seccion_id`
  ahora nullable + columnas `rack_id`/`zona_id` nuevas, con `CHECK` en SQLite
  que exige exactamente un padre. `resolver_almacen_id_de_ubicacion` camina
  el ancestro que corresponda. **Requiere una base de datos nueva** (borrar
  `rustock.db` de desarrollo): no hay migración de esquema, solo
  `CREATE TABLE IF NOT EXISTS`, y el proyecto sigue pre-1.0 sin datos reales.
- Restricción de caja (SPEC §3.6) validada al aprobar un movimiento:
  `validar_restriccion_caja` en `repo/movimiento.rs`.
- Bug corregido: `validar_capacidad` solo sumaba el stock del producto
  entrante (y encima con `lote=None`, ignorando lotes) contra
  `capacidad_maxima`; ahora suma **todo** el contenido de la ubicación.
- `buscar_producto_por_codigo_barras` (SPEC §14.3).
- **Gap conocido no resuelto** (preexistente, no introducido en esta sesión):
  el `codigo` de zona/rack/sección/ubicación se valida único solo contra su
  padre inmediato, no contra todo el almacén como pide el SPEC §3.2-§3.5
  literalmente. Arreglarlo bien requiere denormalizar `almacen_id` en cada
  nodo del árbol — no se hizo por alcance/tiempo.

**Fase D — Movimientos, SPEC §6-10 (completa)**
- Permiso `configuracion:ejecutar` exigido además de `movimiento:crear` para
  `sub_tipo = INICIAL` (SPEC §7.5).
- `repo::movimiento::sugerir_lineas_salida` (FEFO/FIFO/stock general según
  SPEC §8.6) conectada al comando `sugerir_lineas_salida` (gateado por
  `movimiento:ver`; `excluir_vencidos` se decide del `sub_tipo` que el
  frontend planea usar — `CLIENTE`/`DEVOLUCION_PROVEEDOR` ⇒ `true`).
- Traslado inter-almacén (SPEC §9.3): `NuevoTraslado`/`TrasladoCreado` +
  `repo::movimiento::crear_traslado` — si origen y destino resuelven al mismo
  almacén, un solo `TRASLADO` (sin cambios respecto al comportamiento
  existente); si no, dos `Movimiento` ligados por `documento_referencia`
  (`SALIDA`/`TRASLADO_SALIDA` en origen + `ENTRADA`/`TRASLADO_ENTRADA` en
  destino), cada uno en `BORRADOR` y aprobado por separado. Comando
  `crear_traslado`.
- **Bug preexistente encontrado y corregido**: `enviar_a_aprobacion` hacía
  `UPDATE movimientos SET ... updated_at = ?2` pero la tabla `movimientos`
  nunca tuvo columna `updated_at` (solo `created_at`/`approved_at`/
  `anulado_at`) — el comando fallaba en tiempo de ejecución desde el Hito 6;
  nadie lo había probado hasta el test `alertas_movimiento_pendiente_se_detecta`.

**Fase E — Comentarios, SPEC §12 (completa)**
- `db.rs`: `comentarios` gana `oculto_by`/`oculto_at`; nueva tabla
  `comentario_historial` (el texto antes de cada edición nunca se pierde,
  SPEC §12.1).
- `repo/comentario.rs`: crear (exige `ver` sobre la entidad ancla +
  `comentario:crear`; `entidad` validada contra un allowlist fijo de
  recursos), listar por entidad, editar (solo el autor; guarda la versión
  anterior), ocultar (autor o `comentario:eliminar` — hoy solo ADMIN tiene
  ese permiso en la matriz, ver §19 checklist más abajo).
- Comandos: `crear_comentario`, `listar_comentarios`, `editar_comentario`,
  `listar_historial_comentario`, `ocultar_comentario`.

**Fase F — Trazabilidad, alertas, reportes/KPIs, SPEC §13/§16/§17 (completa)**
- `repo/trazabilidad.rs`: las 5 consultas de §13.4 (`donde_esta_lote`,
  `origen_de_salida`, `movimientos_de_producto_en_rango`, `lotes_por_vencer`,
  `historial_caja`).
- `repo/alerta.rs`: `regenerar_alertas` recalcula las 7 condiciones de §17.1
  contra `saldos`/`lotes`/`sesiones_inventario`/`movimientos` y sincroniza la
  tabla `alertas` (upsert si sigue activa, auto-resuelve si la condición
  desapareció, nunca reabre una que el usuario marcó `IGNORADA`). Se
  recalcula de forma perezosa al listar (`listar_alertas` la invoca antes de
  consultar) — no hay scheduler en segundo plano en esta app de escritorio.
  Cada alerta solo es visible para quien tenga `ver` sobre el recurso de su
  `entidad` (§17.2). Comandos: `listar_alertas`, `resolver_alerta`,
  `ignorar_alerta`.
- `repo/reporte.rs`: `dashboard` (los 6 indicadores de §16.1),
  `kpis_generales` (tasa de merma, lotes vencidos sin dar de baja),
  `kardex_producto` (saldo acumulado cronológico, SPEC §16.2).
  `repo::inventario::precision_sesion` (SPEC §11.6/§16.3: precisión por SKU,
  por cantidad y exactitud por ubicación, usando el último conteo por grupo).
  **Decisión de alcance**: el resto de reportes tabulares de §16.2 (stock
  actual, movimientos/entradas/salidas por periodo) no se reimplementan como
  comandos bespoke — ya son alcanzables por el frontend contra
  `PRODUCTO_SCHEMA`/`MOVIMIENTO_SCHEMA`/`MOVIMIENTO_LINEA_SCHEMA` del motor
  de consulta universal (Fase B) con `filters`+`group_by`+`metrics`, que es
  exactamente para lo que se construyó.

**Fase G — Endurecimiento final (completa)**
- SPEC §14.6 (segunda regla): una sesión de inventario `EN_CURSO` bloquea
  ajustes manuales (`AJUSTE_POSITIVO`/`AJUSTE_NEGATIVO`) sobre cualquier
  ubicación del almacén de esa sesión —
  `repo::movimiento::verificar_sin_inventario_en_curso`, aplicado en
  `aprobar_movimiento`. Los ajustes automáticos que genera el cierre de
  sesión (`generar_ajuste_diferencia`) no pasan por esta ruta, así que no hay
  conflicto consigo mismos.
- Pipeline completo verde: `cargo fmt --all --check`, `cargo clippy
  --all-targets --all-features -- -D warnings`, `cargo test` (64 tests) y
  `npm run typecheck` (sin cambios en `src/`, confirmado sin regresiones).

**Gaps conocidos, documentados y deliberadamente fuera de esta ronda:**
- Unicidad de `codigo` en zona/rack/sección/ubicación validada solo contra el
  padre inmediato, no contra todo el almacén como dice el SPEC literalmente
  (Fase C, preexistente).
- `comentario:eliminar` (moderar/ocultar el comentario de otra persona) no
  está en la matriz de ningún rol salvo ADMIN — el SPEC no especifica qué
  permiso debería ser; se dejó así en vez de inventar una regla no escrita.
- La creación de los dos movimientos de un traslado inter-almacén no es
  atómica entre sí (cada `crear_movimiento` es su propia transacción); ambos
  nacen en `BORRADOR` sin efecto sobre stock, así que no compromete saldos.

### Hito 8 — Frontend conectado al backend real (completo, FE-1 a FE-6)

Plan completo en `~/.claude/plans/vivid-scribbling-cook.md`. Auditoría previa
confirmó que **todo** el frontend (`src/pages/*`) era maqueta con arrays
hardcodeados, sin login, con `Topbar` mostrando un usuario fijo. Este hito lo
conecta al backend real fase por fase.

**FE-1 — Cimientos (completa):**
- Instaladas las dependencias ya ancladas en `STACK.md`:
  `@tanstack/react-query`, `zustand`, `react-hook-form`, `zod`,
  `@hookform/resolvers`, `date-fns`.
- `src/shared/types.ts` (~470 líneas): tipos TS espejo de cada struct Rust
  serializable (`domain/*.rs`, `query::Listado`), en `snake_case` tal cual
  los serializa `serde` — nunca traducidos a camelCase.
- `src/shared/backend.ts`: una función por comando Tauri, nombres de función
  camelCase invocando comandos snake_case.
- `src/shared/session.ts`: store zustand (`usuario`, `cargando`,
  `iniciarSesion`, `cerrarSesion`, `refrescar`).
- `LoginPage` / `BootstrapAdminPage` nuevas, `AppLayout` ahora redirige a
  `/login` sin sesión y muestra usuario/rol reales con botón de cerrar
  sesión.
- **Bug real descubierto por esta integración** (no por tests Rust): el tipo
  `Option<Option<String>>` de `EditarCategoria.parent_id` colapsaba `null`
  JSON y ausencia de clave al mismo valor con `#[serde(default)]` plano —
  invisible a los tests Rust porque construían el struct directamente sin
  pasar por deserialización JSON. Arreglado con un helper
  `deserialize_some` + test `editar_categoria_distingue_ausente_de_null_en_json`
  que sí pasa por `serde_json::from_str`.

**FE-2 — Dashboard, Alertas, Reportes (completa):**
- `DashboardPage`: KPIs y movimientos recientes reales
  (`obtener_dashboard`, `obtener_kpis_generales`, `listar_movimientos`).
- `AlertasPage`: filtro por estado real, acciones `Resolver`/`Ignorar` que
  invalidan la query.
- `ReportesPage`: tarjetas de stock/movimientos/auditoría enlazadas a los
  listados reales ya existentes (catálogo de productos, movimientos,
  historial) en vez de duplicar vistas; **nuevas** `ReporteVencimientosPage`
  (`lotes_por_vencer` con selector de días) y `ReporteKardexPage` (selector
  de producto + `kardex_producto`). La tarjeta de precisión de inventario
  queda enlazada a `/inventario` (pendiente de un selector de sesión cerrada
  cuando exista FE-5) — decisión de alcance, no un olvido.
- Nuevo `src/shared/format.ts`: fechas y mapas de tono/etiqueta de Badge
  (tipo/estado de movimiento, severidad/estado de alerta) compartidos entre
  páginas para que no diverjan.

**FE-3 — Movimientos (completa, es el núcleo del sistema):**
- `MovimientosPage`: listado real vía el motor de consulta universal, con
  filtros de tipo/estado y paginación (`listar_movimientos`).
- `MovimientoDetallePage` (ruta nueva `/movimientos/:id`): datos generales,
  tabla de líneas (con enlaces a producto/lote/ubicación resueltos vía
  `src/shared/refs.tsx`), panel de comentarios (listar + crear, SPEC §12) y
  acciones según el estado (`Enviar a aprobación` inline porque no altera
  stock; `Aprobar`/`Anular` como páginas de confirmación propias por
  DESIGN §7.6, nunca inline).
- `MovimientoAprobarPage` / `MovimientoAnularPage`: páginas de confirmación
  dedicadas, cero modales.
- `MovimientoNuevoPage` + `src/pages/movimiento-form.tsx` (el archivo
  principal se dividió en dos porque pasaba las 300 líneas del lint):
  selector de tipo (ENTRADA/SALIDA/TRASLADO/AJUSTE), formulario genérico con
  líneas dinámicas (`useFieldArray`) que muestra/oculta lote según
  `producto.controla_lote` y origen/destino según tipo+sub_tipo, botón
  "Sugerir FIFO/FEFO" para SALIDA (`sugerir_lineas_salida`), y un formulario
  de traslado separado (`crear_traslado`, una sola línea). Validación
  cliente mínima (motivo obligatorio para ajustes/merma, lote obligatorio si
  `controla_lote`, origen/destino según tipo) + errores de servidor
  mostrados tal cual en `ErrorPanel`.
- **Regla de negocio aclarada leyendo `repo/movimiento.rs`** (no está escrita
  así de explícita en el SPEC): `tipo=AJUSTE` es su propio tipo con
  sub_tipos `AJUSTE_POSITIVO`/`AJUSTE_NEGATIVO` — no son sub-tipos de
  `ENTRADA`/`SALIDA` pese a como está redactado el SPEC §7.1/§8.1. El código
  Rust (`aprobar_movimiento`, match de `tipo_mov`) es la fuente de verdad
  usada para construir el formulario.

**FE-4 — Catálogos (completa):** `src/shared/refs.tsx` con componentes
`<XRef id/>` reutilizables (producto, ubicación, lote, categoría, uom,
proveedor, cliente, almacén) que resuelven la etiqueta legible vía
react-query y enlazan al detalle. Al construirlo se detectó que **faltaba
el comando Tauri `obtener_uom`** (la función de repo existía,
`crear_uom`/`listar_uoms` sí estaban expuestas, pero no `obtener_uom`) — se
agregó siguiendo el mismo patrón que el resto de `obtener_*` (permiso
`uom:ver` + `con_auditoria!`) y se registró en `handler()`.
`src/pages/catalogs.tsx`/`CatalogPages.tsx` (antes 100% mock) se
reemplazaron por: `src/pages/catalog-adapters.tsx` (un `CatalogAdapter<T
extends { id: string }>` por entidad — título, listar/obtener reales,
columnas de tabla, panel de datos generales, y opcionalmente
`crearHref`/`editarHref`/`eliminarHref`/`desactivar` cuando la entidad
tiene profundidad completa) + `CatalogPages.tsx` genérico
(`CatalogListPage`/`CatalogDetailPage`/`CatalogEliminarPage`) que consume
cualquier adaptador vía react-query + el motor de consulta universal
(búsqueda, paginación). Las 8 entidades del nav (almacenes, ubicaciones,
productos, lotes, categorías, uoms, proveedores, clientes) tienen listado +
detalle reales; **Almacén** y **Producto** además tienen
`AlmacenFormPage.tsx`/`ProductoFormPage.tsx` (nuevo + editar, mismo
componente) y la página de eliminación genérica (`CatalogEliminarPage`,
reutilizada para ambas) — en la práctica desactiva vía
`desactivar_almacen`/`desactivar_producto` (SPEC no permite borrado físico
con historial), con el botón rotulado "Eliminar definitivamente" y el texto
explicando que se trata de una desactivación (mismo patrón de DESIGN §7.5).
El nav (`src/app/nav.ts`) y el registro de catálogos ya excluían
Zona/Rack/Sección/Caja del top-level desde antes de este hito (se navegan
anidados, no como catálogo propio) — se respetó esa decisión preexistente,
no se agregaron rutas nuevas para ellas.

**Ajuste de tooling descubierto al mover el registro de catálogos:**
`scripts/route-guard.mjs` extraía los slugs de catálogo con una regex que
esperaba objetos literales inline (`almacenes: { ... }`, la forma del mock
viejo). Al pasar a `CATALOGOS: Record<string, CatalogAdapter<any>> = {
almacenes: almacenAdapter, ... }` (valores por referencia, no literales) la
regex dejó de matchear y RouteGuard reportaba falsos negativos en los 8
enlaces de nav de catálogos. Se corrigió apuntando la lectura a
`catalog-adapters.tsx` y acotando la regex al bloque del objeto `CATALOGOS`
(no a todo el archivo, para no capturar los nombres de campo de la interfaz
`CatalogAdapter` como si fueran slugs). También se actualizó
`src/app/breadcrumbs.ts`, que resolvía el nombre legible de un detalle de
catálogo buscando en `cfg.rows` (array estático del mock) — ya no existe,
así que el breadcrumb de detalle ahora muestra `{Singular} {id.slice(0,8)}`
en vez del código real (el título real ya se ve en el `PageHeader` de la
página de detalle; es una degradación cosmética aceptada, no un bug).

**FE-5 — Inventario físico (completa, SPEC §11):**
- `InventarioPage`: listado real de sesiones (`listar_sesiones_inventario`)
  con filtro por estado y paginación.
- **Bug real encontrado al construir esta página, no relacionado con FE-5 en
  sí**: `backend.ts` declaraba `listarSesionesInventario(estado?: string):
  Promise<SesionInventario[]>` invocando `{ estado }` — pero el comando Rust
  `listar_sesiones_inventario` en realidad recibe `params: ListParams` y
  devuelve `Listado` (pasa por el motor de consulta universal §15, igual que
  los catálogos). Esa función llevaba así desde FE-1 sin que nada la hubiera
  ejercitado todavía; habría fallado en tiempo real al primer uso (Tauri no
  habría podido deserializar el argumento). Se corrigió la firma para que
  coincida con el comando real y se agregó `obtenerSesionInventario`.
- **Segundo comando Tauri faltante, mismo patrón que `obtener_uom` del
  Hito 8/FE-4**: no existía `obtener_sesion_inventario` (la función de repo
  `obtener_sesion` sí existía, usada internamente por `crear_sesion_inventario`,
  pero nunca se expuso como comando propio). Se agregó siguiendo el mismo
  patrón (`inventario:ver` + `con_auditoria!`) y se registró en `handler()`.
- `InventarioNuevoPage`: formulario real (`crear_sesion_inventario`) — tipo,
  almacén, alcance, fecha de inicio (con valor por defecto = ahora, para que
  la sesión nazca `EN_CURSO` y admita conteos de inmediato; el backend no
  tiene un comando separado para pasar de `PLANEADA` a `EN_CURSO`, así que
  dejar la fecha vacía dejaría la sesión sin forma de activarse después —
  documentado como límite conocido, no se inventó un comando nuevo para
  esto), `conteo_ciego`, `exige_doble_conteo`.
- `SesionInventarioDetallePage` (ruta nueva `/inventario/:id`): resumen,
  tabla de conteos y de diferencias (`listar_conteos`/`diferencias_sesion`,
  con enlaces a producto/ubicación/lote vía `src/shared/refs.tsx`), y panel
  de precisión (`precision_sesion`) cuando la sesión está `CERRADA`. Acciones
  "Registrar conteos" y "Cerrar sesión" solo visibles si está `EN_CURSO`.
- `SesionInventarioConteosPage` (`/inventario/:id/conteos`, DESIGN §7.8):
  página dedicada de captura campo a campo (ubicación, producto, lote si
  `controla_lote`, cantidad, n.º de conteo, nota) con lista de conteos ya
  registrados debajo. **Decisión de alcance**: no se muestra el saldo del
  sistema en esta página en ningún caso (ciego o no) — cumple la regla dura
  del conteo ciego sin necesidad de branch adicional; mostrarlo cuando no es
  ciego queda como mejora futura, no es una regla del SPEC que se esté
  incumpliendo.
- `SesionInventarioCerrarPage` (`/inventario/:id/cerrar`): página de
  confirmación (mismo patrón que aprobar/anular movimiento) que lista las
  diferencias no conciliadas y qué tipo de ajuste generará cada una antes de
  llamar `cerrar_sesion_inventario`.
- Nuevos mapas en `src/shared/format.ts`: `ESTADO_SESION_LABEL/TONE`,
  `TIPO_DIFERENCIA_LABEL/TONE`.

**FE-6 — Cierre (completa):**
- Pipeline completo verde de punta a punta: backend (`cargo fmt --check`,
  `cargo clippy --all-targets -- -D warnings`, `cargo test` — 65 tests) y
  frontend (`npm run typecheck`, `npm run build`, `npm run lint`, `npm run
  design`, `npm run routes`).
- **No se pudo hacer la prueba manual real con `npm run tauri dev`** (login
  → dashboard → crear entrada → verla listada → aprobarla → ver el saldo
  reflejado) — ver limitación de entorno abajo. Queda pendiente que el
  usuario la corra en su máquina; todo el trabajo de esta sesión se apoyó en
  verificación estática (tipos, build, linters, guards) más los 65 tests de
  Rust, que sí cubren la lógica de negocio de extremo a extremo.
- Gaps de amplitud-sin-profundidad que quedan documentados como alcance
  deliberado de esta ronda de frontend (no como pendientes urgentes):
  - Zona, Rack, Sección, Caja: sin página propia en absoluto (ni siquiera
    listado) — decisión preexistente al Hito 8, se navegan anidadas.
  - Ubicación, Lote, Categoría, UOM, Proveedor, Cliente: listado + detalle
    reales, sin formulario de creación/edición propio.
  - Movimientos: sin página de edición (`/movimientos/:id/editar`) pese a
    estar en el mapa de rutas de DESIGN §5.4 — se puede crear, aprobar,
    anular y enviar a aprobación, pero no editar un `BORRADOR` ya creado.
  - Reportes "Precisión de inventario": no tiene un selector de sesión
    dedicado en `/reportes`; la precisión real se ve entrando a una sesión
    `CERRADA` desde `/inventario` (ahora que FE-5 existe, esto ya funciona,
    solo que no hay un atajo directo desde Reportes).
  - Usuarios y roles: la ruta `/usuarios` sigue apuntando a `AlertasPage`
    como placeholder (esto es preexistente, de antes del Hito 8; no se tocó
    en esta ronda porque no estaba en el alcance de ningún FE-1..FE-6).

**Verificación de este hito:** `cargo fmt --check`, `cargo clippy --all-targets
-- -D warnings` y `cargo test` (65 tests) en verde; `npm run typecheck`,
`npm run build`, `npm run lint`, `npm run design` (DesignGuard) y `npm run
routes` (RouteGuard) en verde en cada fase, incluida la fase de cierre.

**Limitación de entorno encontrada (no es un bug de la app, se repite en
todo el Hito 8):** el navegador que controla la herramienta
`claude-in-chrome` en este entorno **no alcanza `localhost` del sandbox**
donde corre `npm run dev` — se confirmó navegando primero a la app (falla,
"Frame ... showing error page") y luego a `https://example.com` (carga con
normalidad), aislando que el problema es de red del entorno, no de la app.
Por eso todo este hito se verificó con el pipeline estático
(typecheck/build/lint/design/routes) más los tests de Rust, en vez de una
prueba visual en vivo dentro de este entorno; sigue pendiente la prueba
manual con `npm run tauri dev` en una máquina con acceso real a la app.

---

### Hito 9 — Verificación visual en Chrome + script de datos de ejemplo

Pedido del usuario: levantar front+back en modo web, abrir Chrome y probar
toda la funcionalidad con datos semilla. Dos hallazgos importantes y una
herramienta nueva:

**Esta vez el navegador sí alcanzó `localhost`** (a diferencia del intento
del Hito 8): había dos navegadores Chrome conectados a la cuenta
(`claude-in-chrome` obliga a elegir con `select_browser` cuando hay más de
uno); el navegador Linux sí comparte red con el sandbox. **Conclusión:** la
limitación de red del Hito 8 no era del entorno en general, sino de *cuál*
navegador estaba seleccionado — si vuelve a fallar, comprobar primero
`list_connected_browsers`/`tabs_context_mcp` antes de asumir que no hay
acceso.

**Confirmado en vivo (no por lectura de código) que el modo web puro
(`npm run dev`, sin Tauri) no puede ejecutar NINGÚN comando de negocio**:
`/login` y `/configurar-administrador` renderizan perfecto (capturas
tomadas), pero al enviar el formulario de bootstrap la app devuelve el error
real `"El comando bootstrap_admin requiere la app de escritorio (Tauri)."`
— exactamente el mensaje de `webInvoke` en `src/shared/api.ts`. Esto hace
imposible, por diseño (STACK.md: lógica de negocio solo en Rust), probar
"toda la funcionalidad" sirviendo solo el frontend sin Tauri: ni con datos
semilla, porque ni el primer usuario admin se puede crear. El guardia de
autenticación de `AppLayout` sí se verificó funcionando (navegar a
`/almacenes` sin sesión redirige a `/login` incluso sin backend real).

**Solución construida: `src-tauri/src/seed.rs`** — un módulo
`#[cfg(debug_assertions)]` (nunca se compila en release) que puebla
`rustock.db` con datos realistas usando **exclusivamente las mismas
funciones `repo::*` que usan los comandos Tauri** (nunca `INSERT` directo),
así que los datos sembrados respetan las mismas reglas de negocio que
cualquier dato creado desde la UI real:
- Usuario admin (`admin` / `Admin1234!`), 3 UOMs, 2 categorías, 1 proveedor,
  1 cliente.
- Árbol físico completo: 1 almacén → 3 zonas → 1 rack → 2 secciones → 4
  ubicaciones (picking ×2, recepción, devolución) — ejemplo de árbol
  simplificado (ubicaciones colgando de zona directamente) y estricto
  (colgando de sección) a la vez.
- 4 productos: uno simple, uno que termina con **stock bajo su mínimo**
  (dispara alerta), uno con lote, uno con lote **+ vencimiento** (con un
  lote por vencer en 15 días y otro ya vencido, para disparar ambas alertas
  de vencimiento).
- Movimientos aprobados: entrada de compra (múltiples líneas y lotes),
  2 salidas a cliente, 1 traslado intra-almacén, 1 ajuste positivo — más un
  comentario en la entrada y **un movimiento dejado en
  `PENDIENTE_APROBACION`** a propósito (dispara la alerta correspondiente).
- 2 sesiones de inventario: una **CERRADA** (con un conteo exacto y uno con
  diferencia, para ver precisión y el ajuste generado al cerrar) y una
  **EN_CURSO con conteo ciego** (para que el usuario practique registrar
  conteos y cerrarla él mismo).
- Termina llamando `regenerar_alertas` para que las alertas aparezcan de
  inmediato en el dashboard sin esperar a la primera consulta.

Se activa con `RUSTOCK_SEED=1 npm run tauri dev` (revisa `lib.rs::setup()`,
justo después de `seed_roles`) y es **idempotente**: si ya existe algún
almacén, no hace nada — seguro de dejar la variable puesta entre reinicios.
Cubierto por el test `seed_de_ejemplo_puebla_datos_consistentes_y_es_idempotente`
en `tests.rs` (corre el seed dos veces y verifica que no duplica). 66 tests
en total ahora, clippy y fmt limpios.

**Sigue sin poder verificarse visualmente `npm run tauri dev` en sí** (la
ventana nativa WebKitGTK no es una pestaña de Chrome; `claude-in-chrome` no
puede adjuntarse a ella). El usuario debe correrlo él mismo con
`RUSTOCK_SEED=1 npm run tauri dev` para explorar los datos de ejemplo.

---

### Hito 10 — Modo navegador real: servidor HTTP local + modo headless

El usuario pidió explícitamente que el login (y todo lo demás) **funcionara
de verdad en un navegador normal**, no solo que se explicara por qué no
podía. Se le presentaron las opciones (servidor HTTP local reutilizando
Rust vs. duplicar la lógica en TypeScript) y eligió la primera — la única
que no viola la decisión de STACK.md de mantener la lógica de negocio solo
en Rust.

**`src-tauri/src/server.rs` (nuevo, ~800 líneas):** servidor HTTP con
`tiny_http` (bloqueante, sin runtime async — coherente con el resto del
código, todo síncrono) que escucha en `127.0.0.1:1421` y expone un
dispatcher genérico (`POST /api/<comando>` con el cuerpo JSON que ya arma
`backend.ts`) que espeja **uno a uno** cada comando Tauri de `commands.rs`:
mismo permiso (`puede`), misma función `repo::*`, misma auditoría
(`con_auditoria!`, reexportado como `pub(crate) use con_auditoria;` porque
`macro_rules!` no acepta `pub(crate)` como modificador directo — hay que
declararlo simple y re-exportarlo). **Nunca reimplementa una regla de
negocio**: es una segunda fachada de transporte, no una segunda
implementación. Arranca siempre (no solo en debug) como hilo de fondo desde
`lib.rs::setup()`, reutilizando el mismo `Arc<DbState>`/`Arc<SesionState>`
que ya gestiona Tauri — como el resto de la app asume un único operador por
instalación (SPEC §4.1), no hay cookies ni tokens: iniciar sesión desde el
navegador o desde la ventana nativa es la misma sesión activa del proceso.
CORS abierto (`Access-Control-Allow-Origin: *`) porque solo escucha en
loopback.

**Modo headless (`RUSTOCK_HEADLESS=1`):** para poder probar solo por HTTP
sin que aparezca la ventana nativa de Linux, `lib.rs::setup()` oculta la
ventana (`window.hide()`) tras crearla si la variable está presente — **no**
se tocó `tauri.conf.json` ni se intentó evitar que Tauri cree la ventana
(la API para "cero ventanas" tenía más riesgo de romper algo a ciegas);
ocultarla después es la vía de menor riesgo y ya cumple el objetivo (no se
ve nada en pantalla). GTK/webkit se siguen inicializando igual, así que
sigue haciendo falta un `DISPLAY` — no es un modo headless "de verdad" sin
entorno gráfico, es "headless visualmente".

**`src/shared/api.ts` reescrito:** `webInvoke` ahora hace `fetch` real a
`http://127.0.0.1:1421/api/<comando>` en vez de devolver el stub "requiere
Tauri". Si el `fetch` falla (backend no corriendo), el error es explícito:
*"No se pudo conectar con el backend local en ...¿Está corriendo la app
(npm run tauri dev)?"*. Se **eliminaron** `nivelDeComando`/`metricasDe` (ya
no hacen falta: `listar_historial`/`metricas_historial` ahora van por el
backend real en los dos modos) pero se **conservaron**
`historialRegistrar`/`historialLeer` — no son un mock del backend, los usa
`use-historial-navegacion.ts` para trackear navegación del SPA, un concepto
que no existe como comando de negocio y seguirá siendo local-only siempre.

**Bug real encontrado y corregido durante la verificación en vivo (no antes
de probarlo):** el arranque en modo Tauri normal (sin headless) falló la
primera vez con `no such column: comando in CREATE INDEX ... ON
auditoria(comando)` — un `rustock.db` viejo (de antes de que `auditoria`
tuviera esa columna) seguía en
`~/.local/share/com.rustock.app/rustock.db`, vacío (0 almacenes), se borró.
Justo el escenario que el Hito 7 ya había documentado como gap conocido
("si la base de datos viene de antes de la Fase C, borrar `rustock.db`").

**Verificado en vivo, en Chrome real, contra el backend real (no solo
`curl`)**, con `RUSTOCK_HEADLESS=1 RUSTOCK_SEED=1 npm run tauri dev` +
`npm run dev`:
- Login real con `admin`/`Admin1234!` → sesión real → redirección a
  Dashboard con los KPIs sembrados exactos (4 SKUs, 13,465 unidades, 4
  alertas, 7 movimientos, ocupación 75% 3/4).
- Alertas: las 4 alertas sembradas se ven con fechas correctas — confirma
  que el bug de fechas del Hito 9 (`fecha_mas_dias` con timestamp completo)
  quedó bien corregido: "vence el 2026-08-27" vs. "venció el 2026-08-02",
  ya no la misma fecha repetida.
- Mutación real por HTTP: clic en "Resolver" sobre la alerta de movimiento
  pendiente → toast de éxito → al recalcularse las alertas, **se vuelve a
  abrir** porque el movimiento sigue `PENDIENTE_APROBACION` — comportamiento
  correcto según SPEC §17.2 (resolver la alerta no arregla la causa raíz),
  no un bug.
- Movimientos: listado completo, detalle de `MOV-2026-000001` con líneas,
  referencias a producto/lote resueltas vía `<XRef>` (confirma que llamadas
  HTTP anidadas — el detalle dispara `obtener_producto`/`obtener_lote` por
  cada línea — funcionan igual que en Tauri), y el comentario sembrado.
- Inventario físico: las 2 sesiones sembradas (una `EN_CURSO`, una
  `CERRADA`) se listan correctamente.

**Pendiente de probar, explícitamente fuera de lo que se pudo verificar
en este entorno:**
- **La ventana nativa de escritorio en sí** (`npm run tauri dev` sin
  `RUSTOCK_HEADLESS`): se sabe que compila y arranca (se vio en el log,
  Hito 9), pero nadie ha *interactuado* con la ventana WebKitGTK real
  todavía — `claude-in-chrome` no puede adjuntarse a ella. El usuario debe
  abrirla él mismo al menos una vez para confirmar que el WebView nativo
  (distinto del motor de Chrome) renderiza igual de bien.
- **Formularios de escritura más allá de "Resolver alerta"**: crear un
  movimiento nuevo, aprobar/anular, registrar un conteo, crear/editar un
  almacén o producto — todo el CAMINO DE LECTURA (listados, detalles,
  navegación, alertas) quedó probado en vivo por HTTP; el camino de
  *creación/edición* con formularios reales (`react-hook-form` + `zod`)
  todavía no se ejercitó en este navegador, solo en las páginas
  automatizadas anteriores en modo Tauri simulado por lectura de código.
- **Multi-cliente simultáneo**: como la sesión es un único
  `Mutex<Option<SesionActiva>>` compartido (sin tokens), nunca se probó qué
  pasa si el navegador Y la ventana nativa están abiertos al mismo tiempo y
  alguien cierra sesión en uno — el otro se queda con una sesión "fantasma"
  hasta el siguiente refresh. Es la consecuencia esperada del diseño
  "un solo operador", pero no se verificó explícitamente el comportamiento
  visual de ese caso límite.
- **El puerto 1421 fijo**: si algo más en la máquina del usuario ya lo usa,
  el servidor HTTP falla en silencio (`eprintln!`, la app de escritorio
  sigue funcionando igual) — no hay todavía forma de configurarlo por env
  var; sería la primera mejora si esto da problemas en la práctica.
- **Exposición de red**: el servidor solo escucha en `127.0.0.1` a
  propósito (no en `0.0.0.0`) — acceder desde otro dispositivo de la LAN
  (otra visión del "self-hosted" de la SPEC) **no** está soportado todavía
  y requeriría una decisión explícita sobre HTTPS/autenticación reforzada
  antes de exponerlo, no se hizo sin que nadie lo pidiera.

---

## 3. Decisiones de diseño del stack (recordatorio)

| Decisión | Por qué (referencia) |
|---|---|
| Lógica de negocio en **Rust**, frontend solo muestra | STACK §1, §8.7 |
| **SQLite/rusqlite** embebido, self-hosted | STACK §5 — sin servicios externos |
| Saldos **materializados e indexados** | SPEC §5, §15.11 — consultas instantáneas |
| Linter **oxlint** (no typescript-eslint) | TS 7 incompat. con typescript-eslint |
| **CSS puro** (no Tailwind) | Migración hecha; sistema modular propio |
| Iconos **solo lucide-react**, sin emojis | DESIGN §1.1, §6.13 |
| **Cero modales**, una página por acción | DESIGN §5 — deep-linking obligatorio |
| `glob_matcher: doublestar` en lefthook | gobwas rompe `{ts,tsx}` |
| Versión en **3 archivos** sincronizados | VERSIONING §1 — solo con `release:*` |

---

## 4. Gotchas del entorno (no volver a tropezar)

- **Wrapper `snip`** en PATH: intercepta `npm` (algunos subcomandos devuelven
  solo `ok`) y puede distorsionar exit codes encadenados. Usar
  `/usr/bin/npm` o `node_modules/.bin/oxlint` directo si algo se ve raro.
- **`typescript-eslint` no se agrega jamás** — rechaza TS 7.0.2.
- **`toSorted` no existe** en el target lib del tsconfig — usar `[...arr]`
  + `.sort(...)` (con la declaración separada para no mutar sin copia).
- **lefthook** necesita `glob_matcher: doublestar` para `{ts,tsx}`.
- **npm install** de paquetes con postinstall requiere aprobar el script
  (`npm install-scripts approve <pkg>`).
- **Config de opencode no se recarga en caliente** — reiniciar opencode tras
  editar `opencode.json` o `.opencode/`.
- Los commits deben ser **Conventional Commits** (el hook commit-msg rechaza
  formatos inválidos con el ejemplo correcto).

---

## 5. Reglas de trabajo del agente (resumen de disciplina)

1. Leer las fuentes de verdad antes de tocar código (AGENTS/SPEC/DESIGN/STACK).
2. Trabajar **en orden de fase** del ROADMAP — no saltarse fases.
3. Cada tarea con `todowrite`; un cambio a la vez.
4. Correr `/verify` (o el pipeline completo) antes de dar por terminado.
5. **Nunca** `--no-verify` ni saltarse hooks; si un hook falla, arreglar el
   código.
6. Commits solo cuando el usuario lo pida; siempre convencionales.
7. No inventar reglas de negocio que no estén en el SPEC; si hay ambigüedad,
   preguntar.
8. Respetar DESIGN.md al 100%: cero modales, cero emojis, radio 0, paleta azul,
   Open Sans/JetBrains Mono, iconos lucide-react.

---

## 6. Trabajo en progreso

**Backend: completo (Hito 7, §2). Frontend: completo (Hito 8, §2, FE-1 a
FE-6). Datos de ejemplo listos (Hito 9, §2). Modo navegador real con
servidor HTTP local, completo (Hito 10, §2).** No hay ningún FE en curso ni
tareas a medias en este momento.

**Antes de correr la app real** (`npm run tauri dev`), recordar: si la base
de datos viene de antes de la Fase C del Hito 7 (o del Hito 10 si nunca
había arrancado bien), **borrar `rustock.db`** en
`~/.local/share/com.rustock.app/rustock.db` — no hay migraciones
automáticas, solo `CREATE TABLE IF NOT EXISTS`. Para explorar la app con
datos de ejemplo ya poblados: `RUSTOCK_SEED=1 npm run tauri dev` — usuario
`admin` / contraseña `Admin1234!`. Para probar solo por HTTP sin que se vea
la ventana nativa: agregar `RUSTOCK_HEADLESS=1` a esa misma línea, y abrir
`http://localhost:1420` en cualquier navegador (el backend HTTP escucha en
`:1421`, ver Hito 10).

**Siguiente trabajo sugerido, en orden de valor** (ninguno es urgente; el
sistema es funcional y conforme al SPEC tal como está):
1. **Probar la ventana nativa de escritorio en sí** (`npm run tauri dev` sin
   `RUSTOCK_HEADLESS`) y **los formularios de escritura** (crear movimiento,
   aprobar/anular, registrar conteo, crear/editar almacén o producto) — ver
   la lista completa de "pendiente de probar" al final del Hito 10, §2. Todo
   lo demás (lectura, navegación, una mutación simple) ya se verificó en
   vivo por HTTP.
2. Página de edición de movimientos (`/movimientos/:id/editar`, solo para
   `BORRADOR`/`PENDIENTE_APROBACION`) — está en el mapa de rutas de DESIGN
   §5.4 pero no se construyó en el Hito 8.
3. Formularios de creación/edición para las 6 entidades de catálogo que hoy
   solo tienen listado + detalle (Ubicación, Lote, Categoría, UOM,
   Proveedor, Cliente) — mismo patrón que `AlmacenFormPage`/`ProductoFormPage`.
4. Reemplazar el placeholder de `/usuarios` (hoy apunta a `AlertasPage`) por
   una página real de gestión de usuarios y roles — es preexistente, de
   antes del Hito 8, y nunca estuvo en el alcance de FE-1..FE-6.
5. Puerto HTTP configurable (hoy fijo en `:1421`) y, si algún día se pide
   explícitamente, exponer el servidor a la LAN (hoy solo `127.0.0.1` a
   propósito) — requeriría decidir HTTPS/autenticación reforzada primero.

Gaps conocidos del backend (Hito 7, sin cambios): unicidad de código por
padre inmediato en zona/rack/sección/ubicación (no por almacén completo),
`comentario:eliminar` solo para ADMIN, creación no-atómica de las dos
piernas de un traslado inter-almacén.

Gaps conocidos del frontend (Hito 8, ver detalle completo en §2): Zona,
Rack, Sección y Caja sin página propia (decisión preexistente, se navegan
anidadas); 6 entidades de catálogo con amplitud pero sin profundidad
(punto 3 arriba); sin edición de movimientos (punto 2 arriba); sin comando
para pasar una sesión de inventario de `PLANEADA` a `EN_CURSO` después de
creada (limitación del backend, no del frontend — documentada en FE-5).

Gaps conocidos del modo navegador (Hito 10, ver detalle completo en §2):
sesión única compartida entre navegador y ventana nativa (sin tokens, por
diseño de "un solo operador"); puerto `:1421` fijo, sin configuración; sin
soporte para acceso desde otros dispositivos de la LAN.

---

## 7. Cómo actualizar este documento

- Tras cada **hito** (feature/fix importante o release): añadir entrada en §2
  con el número de commit, actualizar §1 (versión, fase) y mover lo terminado
  fuera de §6.
- Tras cada **decisión de diseño** que cambie el stack o el flujo: añadir fila
  en §3 y gotcha en §4 si aplica.
- Tras cada **release**: actualizar §1, verificar `CHANGELOG.md` y el tag.
- No eliminar historia de §2: el historial es la memoria del proyecto.

---

*Fin del MEMORY — Rustock v0.1.0. La memoria del proyecto es tan importante como el código.*
