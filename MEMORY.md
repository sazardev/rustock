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
| **Fase del roadmap** | Backend: completo (§3-§17). Frontend: plan de 6 fases FE-1..FE-6 en `~/.claude/plans/vivid-scribbling-cook.md` — **FE-1, FE-2, FE-3 y FE-4 completas**; FE-5/FE-6 pendientes. Ver §6 |
| **Backend Rust** | Autenticación real (argon2 + sesión), motor de consulta universal (SPEC §15), CRUD completo de catálogos, árbol de ubicación simplificado, restricción de caja, código de barras, FIFO/FEFO, traslado inter-almacén, comentarios con historial, trazabilidad (§13.4), alertas (§17) y dashboard/KPIs/kardex (§16). 65 tests pasan, clippy y fmt limpios |
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

### Hito 8 — Frontend conectado al backend real (FE-1 a FE-3 completas, FE-4 en curso)

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

**Verificación de este hito:** `cargo fmt --check`, `cargo clippy --all-targets
-- -D warnings` y `cargo test` (65 tests) en verde; `npm run typecheck`,
`npm run build`, `npm run design` (DesignGuard) y `npm run routes`
(RouteGuard) en verde en cada fase.

**Limitación de entorno encontrada (no es un bug de la app):** el navegador
que controla la herramienta `claude-in-chrome` en este entorno **no alcanza
`localhost` del sandbox** donde corre `npm run dev` — se confirmó
navegando primero a la app (falla, "Frame ... showing error page") y luego
a `https://example.com` (carga con normalidad), aislando que el problema es
de red del entorno, no de la app. Por eso esta ronda se verificó con el
pipeline estático (typecheck/build/design/routes) en vez de una prueba
visual en vivo; falta la prueba manual con `npm run tauri dev` cuando el
usuario la corra en su máquina.

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

**Backend: completo (Hito 7, §2).** **Frontend: Hito 8 (§2) en curso**,
FE-1/FE-2/FE-3/FE-4 terminadas y verificadas; FE-5/FE-6 pendientes.

**Retomar exactamente aquí (FE-5 — Inventario físico, SPEC §11):**
1. `InventarioPage` (hoy es un `EmptyState` fijo, sin datos): reemplazar por
   `listar_sesiones_inventario(estado?)` real (ya existe en `backend.ts` —
   nota: este comando devuelve `SesionInventario[]` directo, no pasa por el
   motor de consulta universal como los catálogos, así que no lleva
   paginación/`ListParams`).
2. `/inventario/:id` (ruta nueva): detalle de sesión — resumen (tipo,
   alcance, estado, responsable, fechas), tabla de conteos
   (`listar_conteos(sesionId)`) y diferencias (`diferencias_sesion(sesionId)`);
   si la sesión está `CERRADA`, mostrar precisión (`precision_sesion(sesionId)`).
3. `/inventario/nuevo` (ruta ya existe en el router pero apunta al mock):
   formulario real con `crear_sesion_inventario` — tipo (`COMPLETO`/`CICLICO`),
   almacén (selector), alcance (texto libre), `conteo_ciego`,
   `exige_doble_conteo`.
4. Registrar conteos: DESIGN §7.8 pide una página dedicada
   `/inventario/:id/conteos` (captura campo a campo, sin mostrar saldo del
   sistema si `conteo_ciego`). `registrar_conteo` ya existe en `backend.ts`.
5. Cerrar sesión: `/inventario/:id/cerrar` como página de confirmación
   (mismo patrón que `MovimientoAprobarPage`/`MovimientoAnularPage`) que
   llama `cerrar_sesion_inventario(sesionId)`.
6. Reutilizar donde tenga sentido: `src/shared/refs.tsx` para enlazar
   producto/ubicación desde las líneas de conteo; `src/shared/format.ts`
   para fechas.

**Después de FE-5, queda FE-6 — Cierre:**
- Pipeline completo en verde (`typecheck`, `build`, `lint`, `design`,
  `routes`) — ya viene siendo la verificación de cada fase, así que en FE-6
  es solo confirmarlo una vez más con todo junto.
- Prueba manual con `npm run tauri dev` (login → dashboard → crear entrada →
  verla listada → aprobarla → ver el saldo reflejado). **La automatización de
  navegador de este entorno no pudo hacer esta prueba** (ver limitación de
  red más abajo) — queda pendiente que el usuario la corra en su máquina, o
  reintentarla si el entorno cambia.
- Actualizar este documento cerrando el Hito 8 (mover de "en curso" a
  "completo" en §1 y aquí) y consolidar la lista de gaps de
  amplitud-sin-profundidad (las 6 entidades de catálogo sin formulario
  propio, precisión de inventario sin selector de sesión en Reportes) como
  el "gaps conocidos" de este hito, mismo estilo que el Hito 7.

**Antes de correr la app real** (`npm run tauri dev`), recordar: si viene de
antes de la Fase C del Hito 7, **borrar `rustock.db`** — el esquema de
`ubicaciones` cambió (columnas nuevas + `CHECK`) sin migración automática.

Gaps conocidos del backend (Hito 7, sin cambios): unicidad de código por
padre inmediato en zona/rack/sección/ubicación (no por almacén completo),
`comentario:eliminar` solo para ADMIN, creación no-atómica de las dos
piernas de un traslado inter-almacén.

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
