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
| **Fase del roadmap** | Backend: completo (§3-§17). Frontend: plan de 6 fases FE-1..FE-6 — **completo**. Modo navegador real (servidor HTTP local) — **completo**. Modo navegador sin ventana (`npm run tauri:web`, sin GTK) — **completo**. Formularios de creación/edición de los 8 catálogos — **completo** (Hito 12). Rebranding de identidad visual "Rust & Iron" (paleta de óxido, logo, SEO) — **completo** (Hito 13). Logo sin fondo + login con marca centrada + **landing page en la raíz pública `/`** (presentación del producto sin sesión; dashboard movido a `/dashboard`) — **completo** (Hito 14, sin commit). **Módulo de configuración de empresa + preferencias de usuario + gestión de usuarios real (páginas y backend)** — **completo** (Hito 15, sin commit). **Reportes reales de stock, movimientos, precisión y auditoría** (rutas `/reportes/*` que ya estaban declaradas sin página) — **completo** (Hito 16, sin commit). **Módulo empresa ampliado: país/ubicación con mapa OSM, fiscales, contacto, logo + documentos y entidad Sucursal** — **completo** (Hito 17, sin commit). **Mejoras a los reportes** (exportación CSV/JSON, filtros, reportes de entradas/salidas/mermas/usuarios, gráficas CSS puras) — **completo** (Hito 18, sin commit). **UX de alertas: enlace a la causa raíz + semántica de Resolver/Ignorar** — **completo** (Hito 19, sin commit). **Sección Ayuda: guía de los 19 módulos + glosario de 40 términos en un grupo nuevo del sidebar** — **completo** (Hito 20, sin commit). **Temas configurables: 6 paletas predefinidas + modo claro/oscuro, global (ADMIN) y por usuario** — **completo** (Hito 21, sin commit). **Sección Ayuda potenciada: 26 guías (19 módulos enriquecidos + 6 procesos de negocio SPEC §18 + primeros pasos), glosario de 46 términos con anclas, cruces bidireccionales módulo↔glosario, búsqueda en el índice y tarjeta de contexto de negocio** — **completo** (Hito 22, sin commit). **Command palette "Buscar en todo Rustock" (Ctrl+K)**: búsqueda global en todo — páginas, rutas, acciones, reportes, ayuda/glosario y **datos de negocio en vivo** (8 catálogos + movimientos + sesiones de inventario + alertas) vía un nuevo comando `buscar` en Rust con permisos por recurso y orden por relevancia; subsecuencia tipo fzf para comandos; recientes en localStorage — **completo** (Hito 23, sin commit). **Ampliación: la sección Ayuda (26 guías + glosario de 46 términos) se indexa por contenido completo en el command palette** (procesos, negocio y glosario) **y es configurable por usuario** (preferencia `ayuda_en_palette` con toggle en Mi perfil) — **completo** (ampliación Hito 23, sin commit). **Motor de búsqueda inteligente: matching multi-término con sinónimos del dominio, boost por historial e intención, relevancia multi-columna en `buscar` y desglose analítico en el palette** — **completo** (mejora Hito 23, sin commit). **Confirmación limpia en la Ayuda: toast al navegar desde una guía a la app (`EnlaceAyuda`), toast al abrir una guía desde Ctrl+K y toast descriptivo al activar/desactivar la ayuda en Mi perfil** — **completo** (ampliación Hito 23, sin commit). **Cierre de gaps (Hito 24): edición de movimientos (backend + frontend), "crear y aprobar" conectado a `requiere_aprobacion` con comando `puedo`, CRUD completo de Zona/Rack/Sección/Caja + árbol físico en el detalle de Almacén, UOM editable/desactivable, sesión PLANEADA→EN_CURSO, traslado inter-almacén atómico, unicidad de código por almacén, moderación de comentarios (GERENTE), mensajes de error de usuarios, virtualización de tablas (@tanstack/react-virtual), lazy-loading por ruta, skip-link a11y, iconos/meta del bundle e INSTALACION.md** — **completo** (Hito 24, sin commit). **Tracking total (Hito 25): centro de actividad en `/historial`** — auditoría ampliada (tipo de evento, ruta, módulo, proceso, metadatos JSON, tenant, duración de vista, hora/día local), comando `registrar_vista` (con beacon en beforeunload), `metricas_actividad` con insights automáticos (hora pico, módulo dominante, tendencia 7 días), `listar_historial` paginado con filtros combinables, KPIs/gráficas/exportación — **completo** (Hito 25, sin commit). Ver Hitos 8-25 en §2 |
| **Backend Rust** | Autenticación real (argon2 + sesión), motor de consulta universal (SPEC §15), CRUD completo de catálogos, árbol de ubicación simplificado, restricción de caja, código de barras, FIFO/FEFO, traslado inter-almacén **atómico**, comentarios con historial, trazabilidad (§13.4), alertas (§17), dashboard/KPIs/kardex (§16), servidor HTTP local en `:1421` (**configurable** con `RUSTOCK_HTTP_PORT`), modo web-only sin ventana, **configuración de empresa + preferencias de usuario + gestión de usuarios + umbrales de alertas + sucursales + archivos de empresa**, **edición de movimientos (`editar_movimiento`)**, **UOM editable y desactivable**, **inicio de sesión de inventario (`iniciar_sesion_inventario`)**, **unicidad de código por almacén completo**, **comando `puedo`**, **mensajes de error específicos en usuarios**, **tracking total (Hito 25): `registrar_vista`, `metricas_actividad`, `listar_historial` paginado+filtros, clasificación módulo/proceso/tenant de cada comando** — **108 tests pasan**, clippy y fmt limpios. Incluye `seed.rs` para datos de ejemplo (`RUSTOCK_SEED=1`, solo debug) |
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

### Hito 25 — Tracking total: centro de actividad con historial profundo, análisis e insights (completo, sin commit)

Pedido del usuario: "implementa metadata, logs, tracking total — qué rutas
visita, módulos, ejecuciones, procesos, horas, días, usuario, tenant, todo —
ultra mega tracking total DE TODO lo que se hace en el sistema en historial
para análisis profundo, predictivo e inteligente". Se implementó de punta a
punta: el backend registra **todo** (comandos + vistas de página) con ruta,
módulo, proceso, metadatos, tenant y tiempo local, y el frontend envía cada
navegación sin bloquear la UI. La página `/historial` se convirtió en un
**centro de actividad** con KPIs, gráficas, insights automáticos y el registro
completo filtrable y exportable.

**Backend (Rust):**
- **`db.rs` — columnas nuevas de `auditoria`** (migración idempotente por
  `asegurar_columna`, sin borrar la db): `tipo_evento` (COMANDO/VISTA, default
  COMANDO), `ruta`, `modulo`, `proceso`, `metadatos` (JSON), `tenant`,
  `duracion_vista_ms`, `hora_local` (0-23) y `dia_semana` (1-7) + índices
  `idx_auditoria_tipo_evento/modulo/ruta/proceso/tenant/tiempo_local`.
- **`domain/seguridad.rs`**: `EventoAuditoria` ampliado con los 9 campos
  nuevos; nuevo `RegistrarVista` (ruta, módulo, proceso, metadatos JSON,
  duración, hora/día local, cliente_info) con `validar()` (ruta/módulo
  requeridos, hora 0-23, día 1-7); `registrar_detallado` (insert con las 21
  columnas) al que delegan `registrar_con_metricas` (tipo COMANDO) y las
  vistas.
- **`repo/auditoria.rs` (núcleo del tracking)**:
  - `tenant_actual` (nombre de la empresa, snapshot por evento),
    `modulo_de_comando` (comando → módulo por recurso: Movimientos, Productos,
    Almacenes, Configuración, Sesión...) y `proceso_de_comando` (comando →
    proceso de negocio SPEC §18: "gestión de movimientos", "inventario
    físico", "traslado de mercancía"...).
  - `registrar_invocacion` ahora etiqueta cada comando con módulo, proceso y
    tenant (los eventos históricos quedan clasificados también).
  - `registrar_vista` (nuevo): inserta el evento VISTA con ruta, módulo,
    proceso, metadatos (mezcla UI + cliente_info en un JSON), tenant,
    duración y tiempo local.
  - `listar_historial` reescrito con **paginación** (page/page_size, tope 200,
    `-1` = exportación con tope 5000) y **filtros combinables**: usuario,
    comando, nivel, tipo_evento, módulo, ruta, proceso, **exito** y rango de
    fechas → devuelve `Paginado<EventoAuditoria>` (SPEC §15).
  - `metricas_actividad` (nuevo): análisis profundo del periodo — resumen
    (eventos, vistas, operaciones, escrituras/lecturas, tasa de éxito,
    usuarios activos, duración media de vista), desgloses por módulo, día,
    hora del día, día de la semana, usuario, proceso y top de rutas, más
    **insights automáticos** (`construir_insights`): hora pico, día de mayor
    uso, módulo dominante, ruta más visitada, usuario más activo, proceso más
    frecuente y tendencia de 7 días.
- **`commands.rs` + `server.rs`**: `registrar_vista` (requiere sesión; **no**
  pasa por `con_auditoria!` porque el propio evento VISTA es el registro —
  evita una fila duplicada por visita), `metricas_actividad` (gateada por
  `reporte:ver`), y `listar_historial` con la firma nueva (paginación +
  filtros + exito). Ambos espejados uno a uno en el dispatcher HTTP.
- **Tests**: +5 (108 en total): vista con metadata/tenant/tiempo local,
  validación de `RegistrarVista`, clasificación módulo/proceso de comandos,
  agregaciones de `metricas_actividad` (módulo/hora/usuario/proceso/insights)
  y paginación + filtros combinados de `listar_historial`.

**Frontend (React):**
- **`src/shared/actividad.ts` (nuevo)**: `moduloDeRuta` y `procesoDeRuta`
  (mapeos declarativos ruta → módulo/proceso, DESIGN §4.3 + SPEC §18) y el
  hook **`useTrackVista`** montado en `AppLayout`: al cambiar de ruta registra
  la vista anterior con su duración (fire-and-forget con catch silencioso),
  guarda la vista en curso y la vacía por **`navigator.sendBeacon`** (blob
  text/plain, sin preflight) en `beforeunload`/`pagehide`/desmontaje; solo
  actúa con sesión. Los eventos llevan hora/día local, metadatos (pathname,
  query, referrer) y cliente_info (navegador, plataforma, idioma, pantalla).
- **`api.ts`**: se exporta `API_BASE` (para el beacon); se eliminaron
  `historialRegistrar`/`historialLeer` y el archivo
  `use-historial-navegacion.ts` (el tracking local del SPA queda obsoleto:
  ahora todo vive en el backend, también en modo navegador).
- **`audit.ts` + `backend.ts`**: `EventoAuditoria` ampliado, `RegistrarVista`,
  `MetricasActividad` (+ todos sus tipos), `registrarVista`,
  `metricasActividad` y `listarHistorial` con la firma paginada/filtrada.
- **`HistorialPage` reescrita como "Centro de actividad"** (/historial):
  filtros de periodo/usuario/tipo/módulo/resultado/comando, 6 KPIs (eventos,
  vistas, operaciones, tasa de éxito, usuarios activos, duración media),
  tarjeta **"Perspectiva del periodo"** con los insights automáticos (iconos
  canónicos), gráficas CSS puras (vistas por módulo, actividad por día, por
  hora con etiquetas cada 4 h, por día de la semana, usuarios más activos,
  procesos de negocio y rutas más visitadas) y la **tabla de eventos**
  paginada con exportación CSV/JSON.
- **`ReporteAuditoriaPage`**: filtros nuevos (tipo de evento, paginación
  real) y columnas nuevas (tipo, módulo, proceso, tenant, ruta para vistas).
  `UsuarioDetallePage` adaptado a la firma paginada.
- **Ayuda y nav**: módulo "Historial de actividad" reescrito (tracking total,
  filtros, reglas, beacon) y descripción del nav actualizada.

**Verificación:** pipeline completo en verde — backend (`cargo fmt --all
--check`, `cargo clippy --all-targets --all-features -- -D warnings`, `cargo
test --lib` 108) y frontend (`tsc --noEmit`, `oxlint` 0 errores, DesignGuard
OK 134 archivos, RouteGuard OK 42 rutas, `vite build`). **Prueba en vivo por
HTTP** (backend web-only en `RUSTOCK_HTTP_PORT=1451` con DB temporal):
bootstrap → login → 3 `registrar_vista` (dashboard/productos/movimientos) →
`metricas_actividad` devuelve resumen, por_modulo, por_hora (09:00 con 2
vistas), por_proceso (registro de movimiento, revisión de catálogo) e
insights (hora pico, día, módulo, ruta más visitada) → `listar_historial`
filtra por `tipoEvento=VISTA` + `modulo=Productos`, pagina (page 1 size 2 →
3 totales, 2 páginas) y filtra por `exito=true` → `registrar_vista` sin
sesión devuelve `NoAutenticado`. **Nota:** el SSR de Vite no aplica a esta
página (el router usa `createBrowserRouter`, que requiere `document` —
limitación preexistente del shell, no de la página; todos los gates estándar
pasan).

**Nota de concurrencia:** durante la sesión corría el backend dev del usuario
(proceso de 15:28 en `:1421`, binario anterior); el binario recompilado con
los comandos nuevos solo actúa tras reiniciar `npm run tauri:web` / `tauri
dev` (los comandos `registrar_vista`/`metricas_actividad` no existen en el
proceso viejo). Se dejó intacto el proceso del usuario.

### Hito 22 — Sección Ayuda potenciada: procesos del negocio, primeros pasos, glosario conectado y búsqueda (completo, sin commit)

Pedido del usuario: "potenciar la página de ayuda; no está mal ahora, pero falta
mucha información, claridad, guiar al usuario, que se refleje el negocio,
proceso, entender qué es cada cosa, ligar glosario, para que le quede mucho
más fácil, limpio y claro". Se le consultaron 4 decisiones y eligió: **términos
clave por módulo enlazados al glosario** (sección con anclas), **procesos de
negocio de extremo a extremo Y contexto de negocio dentro de cada módulo
("ambos")**, **guía de primeros pasos (onboarding)** y **búsqueda en el índice
de Ayuda**.

**`src/pages/ayuda/ayuda-data.ts` (núcleo):**
- **Tipos extendidos**: `AyudaModulo` gana `paraQueSirve` (contexto de negocio),
  `cuandoUsarlo`, `terminosClave` (slugs del glosario) y `relacionados` (ids de
  otras guías). Nuevo tipo de bloque `nota` con `tono` (info/warning/success)
  para avisos de errores comunes y buenas prácticas. `TerminoGlosario` gana `id`
  (slug estable usado como ancla). Helper `textoModulo()` para la búsqueda.
- **Glosario de 40 → 46 términos** con slugs explícitos (`saldo`, `fefo`,
  `movimiento`, `desactivar`, `creacion-rapida`, …) + 6 nuevos: `codigo-barras`,
  `vencimiento`, `trazabilidad`, `rol`, `permiso`, `usuario`. Los slugs son
  explícitos (no derivados) para no romper anclas con acentos/paréntesis.
- **19 módulos enriquecidos**: cada uno con `paraQueSirve`, `cuandoUsarlo`,
  `terminosClave` (2-14 términos) y `relacionados`; los que aportan suman una
  sección "Errores comunes y buenas prácticas" con bloques `nota` (ej.
  Movimientos: "el stock nunca se toca a mano", "un movimiento aprobado no se
  edita"; Inventario: "el conteo ciego evita sesgos"; Alertas: "resolver no
  arregla la causa raíz").
- **6 guías de proceso nuevas** (grupo "Procesos del negocio", SPEC §18):
  `proceso-recepcion` (§18.1), `proceso-despacho` (§18.2), `proceso-traslado`
  (§18.3), `proceso-inventario` (§18.4), `proceso-devolucion` (§18.5),
  `proceso-merma` (§18.6). Cada una con: qué necesitas antes, pasos con enlaces
  a módulos reales, qué ocurre en el sistema, y reglas/advertencias con `nota`.
- **1 guía de primeros pasos** (`primeros-pasos`, grupo "Empezar"): 7 pasos de
  puesta en marcha (configuración/usuarios → UOM → productos → almacén →
  entrada inicial → operación → inventario), cada uno con enlaces reales, más
  buenas prácticas de arranque.
- **`AYUDA_GRUPOS`**: 7 grupos → 26 módulos (Empezar, Procesos del negocio,
  Operación, Catálogos, Análisis, Administración, Sistema). Las rutas
  `/ayuda/<id>` se auto-generan en el router (flatMap existente).

**`src/pages/ayuda/AyudaPages.tsx` (render):**
- **`TarjetaContexto`**: tarjeta destacada "Para qué sirve en tu operación" +
  "Cuándo usarlo" al inicio de cada guía con contexto de negocio.
- **Bloque `nota`**: caja con fondo tintado tokenizado (info/warning/success)
  con icono canónico, usada en errores comunes y buenas prácticas.
- **Secciones automáticas** al final de cada guía: "Términos del glosario"
  (chips `Badge tone="info"` enlazados a `/ayuda/glosario#<slug>`) y "Guías
  relacionadas" (lista con icono + enlace, resuelve tanto módulos como
  procesos).
- **`AyudaIndexPage`**: campo `Search` que filtra en cliente las tarjetas de
  módulos (por título/resumen/contenido vía `textoModulo`) y los términos del
  glosario (por término/definición/slug). Sin resultados → `EmptyState` con
  "Limpiar búsqueda".
- **`AyudaGlosarioPage`**: cada término renderiza con `id=<slug>` para anclas
  directas (`/ayuda/glosario#saldo`).

**`src/styles/components.css`:** bloque `.ayuda-nota*` (info/warning/success)
con tokens existentes de fondo/borde/texto semánticos y radio token. Sin
sombras ni radios nuevos (DesignGuard OK).

**Verificación:** pipeline completo en verde — `tsc --noEmit` 0 errores,
`oxlint` 0 errores, DesignGuard OK (134 archivos), RouteGuard OK (42 rutas),
`vite build` OK, prettier OK. **Verificación de render por SSR** (patrón del
Hito 20 con `createServer` + `createMemoryRouter` + `renderToString`): los 26
módulos + índice + glosario renderizan sin error; se confirmaron por SSR el
contexto de negocio, los términos con ancla (`id="saldo"`, `id="fefo"`), las
guías relacionadas, los pasos de los procesos, las notas y el buscador.
**Integridad de datos validada por script**: 46 términos y 26 módulos sin
referencias rotas (todos los `terminosClave` existen en el glosario y todos los
`relacionados` apuntan a guías reales).

**Nota de concurrencia:** durante la sesión el usuario editaba en paralelo su
WIP `ArbolAlmacen.tsx` (untracked, referenciado por `CatalogPages.tsx`); sus
errores de typecheck aparecían/disparecían entre corridas (compilador TS7
concurrente) y se resolvieron solos al terminar el usuario su edición. No se
tocó ese archivo (ajeno a este hito).

### Hito 23 — Command palette "Buscar en todo Rustock" (Ctrl+K), búsqueda global en todo (completo, sin commit)

Pedido del usuario: "hacer funcional el buscar en todo Rustock, implementa un
poderoso command palette que busque entre todas las opciones, páginas, rutas,
acciones, palabras, que te lleve justo ahí: productos, datos, reportes". Se
consultaron 4 decisiones y eligió: **comando `buscar` en Rust** (una sola
llamada, permisos por recurso, orden por relevancia), **los 8 catálogos +
movimientos + sesiones de inventario + alertas** como datos en vivo,
**coincidencia por subsecuencia tipo fzf** para comandos estáticos, e **índice
de Ayuda + glosario** como resultados de "palabras".

**Backend (Rust):**
- **`src-tauri/src/buscar.rs`** (nuevo): `buscar(conn, usuario_id, q)` consulta
  los recursos configurados (productos, ubicaciones, lotes, proveedores,
  clientes, almacenes, categorías, uoms, movimientos, sesiones de inventario)
  con la **matriz de permisos por recurso** (SPEC §4.4): un recurso sin
  permiso `ver` se omite, no es error. Ordena por **relevancia en la propia
  SQL**: coincidencia exacta en el código/SKU/número (case-insensitive vía
  `LOWER`) > prefijo > contiene, luego el orden por defecto del schema.
  `BuscarItem { id, titulo, subtitulo, datos }` — `datos` lleva tipo/estado
  de movimientos y sesiones, y la entidad ancla de las alertas (la UI los
  etiqueta con sus propios mapas, DESIGN §9.1). Alertas se consultan aparte
  (`estado='ABIERTA'`, tipo o detalle LIKE) y devuelven `entidad`/`entidad_id`
  para enlazar a la causa raíz (SPEC §17.2).
- **`query.rs`**: se extrae `pub(crate) fn condicion_busqueda(schema, q)`
  (la lógica de `q` de `construir_where`, SPEC §15.4) para reutilizarla en
  `buscar` sin duplicar; `escapar_like` y `ResourceSchema::columna` pasan a
  `pub(crate)`. Cero cambio de comportamiento en los listados existentes.
- **`commands.rs` + `server.rs`**: comando `buscar` (autenticación
  obligatoria vía `sesion.usuario_id()?` + `con_auditoria!`), registrado en
  `handler()` y espejado en el dispatcher HTTP.
- **Tests**: +4 (94 en total): `buscar_agrupa_por_recurso_y_prioriza_coincidencia_exacta`
  (el SKU exacto va primero; movimientos devuelven `datos.tipo`/`datos.estado`),
  `buscar_q_vacio_devuelve_grupos_vacios`, `buscar_incluye_solo_alertas_abiertas`
  (solo `ABIERTA`, y desaparece al resolverse la causa) y
  `buscar_devuelve_grupos_vacios_con_usuario_invalido` (usuario sin permiso no
  ve ningún grupo; la autenticación la exige el comando).

**Frontend (React):**
- **`src/shared/palette/`** (nuevo módulo):
  - `fuzzy.ts` — `puntuacionCoincidencia` (exacto > prefijo > prefijo de
    palabra > subcadena > **subsecuencia** tipo fzf, con scoring por
    contigüidad; normaliza sin acentos vía NFD) + `indiceResaltado`.
  - `commands.ts` — registro estático: **Páginas** (nav real de `nav.ts` +
    perfil + glosario + los 10 reportes individuales), **Acciones** de
    creación gatadas por rol (SPEC §4.4: operación=OPERADOR+,
    catálogo=ENCARGADO+, usuarios/sucursales=ADMIN) y **Ayuda** (los 26
    módulos de `ayuda-data.ts` + los 46 términos del glosario con ancla).
    Recientes en `localStorage` (`rustock.palette.recientes`, máx 8).
  - `palette-store.ts` — store zustand (`abierto`, `consulta`, abrir/cerrar/
    alternar).
  - `CommandPalette.tsx` — overlay a pantalla completa con scrim sutil +
    panel (`--shadow-lg`, `--radius-lg`); input autofocado con `role=combobox`
    + `aria-activedescendant`; lista agrupada con `role=listbox`; navegación
    por ↑/↓/Inicio/Fin/Enter/Escape; **datos en vivo con debounce 250 ms vía
    react-query** (`enabled: q >= 2` caracteres); recientes con consulta
    vacía; estados carga/vacío/error; resaltado de la coincidencia en el
    título; foco devuelto al trigger al cerrar. Es el panel de búsqueda
    flotante que DESIGN §6.10 ya contemplaba — navega, nunca muta datos, así
    que convive con la regla de cero modales (§5.1).
- **`AppLayout.tsx`**: la píldora muerta `<Search>` se reemplaza por un
  `PaletteTrigger` (botón píldora "Buscar en todo Rustock" + keycap `Ctrl K`,
  icono compacto en móvil) y se monta `<CommandPalette />`. Atajos globales:
  **Ctrl/Cmd+K** alterna y **"/"** abre (ignora inputs/textarea/select,
  DESIGN §8.2).
- **`Kbd.tsx`** (nuevo, barrel `index.ts`) — keycap con clase `.kbd`.
- **`AyudaGlosarioPage`**: cada término del glosario lleva `id` para que el
  palette deep-linke a `/ayuda/glosario#término`.
- **CSS** `src/styles/palette.css` (nuevo, importado en `index.css`): solo
  tokens (radio/sombra/paleta), cero gradientes y cero blur; el indicador de
  fila activa es una barra `::before` de 2px (sin `box-shadow` literal, que
  DesignGuard prohíbe).

**Verificación:** pipeline completo en verde — backend (`cargo fmt --all
--check`, `cargo clippy --all-targets --all-features -- -D warnings`,
`cargo test --lib` 94) y frontend (`tsc --noEmit`, `oxlint` 0 errores,
DesignGuard OK 134 archivos, RouteGuard OK 42 rutas, `vite build`). No se
pudo hacer la prueba en vivo por HTTP del comando `buscar`: el puerto `:1421`
está ocupado por el **backend de desarrollo viejo** del usuario (binario sin
el comando nuevo) — para probarlo hay que **reiniciar `npm run tauri:web` /
`tauri dev`** (ver §6). Los 4 tests de Rust cubren la lógica de `buscar`
(SQL, relevancia, permisos, alertas).

**Notas de concurrencia:** el usuario editaba en paralelo su WIP de formularios
de catálogo (CajaFormPage, ArbolAlmacen, zona/rack/sección, editar_movimiento
en backend). Se aplicaron arreglos mínimos y seguros a su WIP para mantener el
pipeline en verde: destructuring `const { descartar } = usePreservarFormulario`
en CajaFormPage/RackFormPage/SeccionFormPage/ZonaFormPage (llamaban
`descartar()` sin capturar el retorno del hook), `useMemo` de `productosPorId`
dependiendo de `productosQuery.data` en CajaFormPage (exhaustive-deps) e
import de `LoteRef` restaurado en catalog-adapters. Su WIP sigue en curso y
puede volver a pisar estos archivos.

**Ampliación — Ayuda integrada en el palette (misma sesión):** el pedido del
usuario fue "que todo lo de Ayuda funcione en el command palette para dar
sugerencias de ayuda según procesos, negocio y glosario, potenciando el
aprendizaje, y configurable si lo quiere". Se implementó:
- **Keywords del contenido completo**: `palabrasAyuda()` en `commands.ts` ahora
  indexa cada guía con `textoModulo()` (todo el contenido de secciones) +
  `paraQueSirve` + `cuandoUsarlo` + `terminosClave`, no solo el `resumen`. Así
  buscar "cómo recibir mercancía", "merma", "FEFO", "saldo" encuentra las guías
  y procesos correctos por su contenido real.
- **Glosario con slugs correctos**: los términos usan `t.id` (slug estable) en
  id y ancla (`/ayuda/glosario#saldo`) en vez del término con acentos.
- **Toggle configurable `ayuda_en_palette`** (preferencia por usuario, guardada
  en `preferencias_usuario` como INTEGER default 1, migrada con
  `asegurar_columna` en `db.rs`): nueva columna + campo en
  `PreferenciasUsuario`/`PreferenciasResueltas`/`EditarPreferenciasUsuario`
  (`Option<bool>`) + repo (SELECT/UPDATE/`preferencias_resueltas`). Con la
  ayuda apagada, `comandosPalette(rol, false)` omite los 72 comandos de Ayuda
  (26 guías + 46 términos).
- **`CommandPalette.tsx`**: lee `usePreferencias(s => s.resueltas?.ayuda_en_palette
  ?? true)` reactivamente y lo pasa a `comandosPalette`; cuando la ayuda está
  desactivada y no hay resultados, el estado vacío lo recuerda con un texto que
  apunta a Mi perfil.
- **`PerfilPage.tsx`**: checkbox "Mostrar sugerencias de Ayuda en la búsqueda
  rápida (Ctrl+K)" en la tarjeta Preferencias; solo envía `ayuda_en_palette`
  cuando cambió.
- **Test Rust actualizado**: el test de preferencias fija `ayuda_en_palette:
  Some(false)` y verifica que la resuelta sea `false`. 103 tests en verde.

**Mejora de predicción, inteligencia, análisis y datos (misma sesión):** el
usuario pidió "mejora la predicción, mejor inteligencia, análisis, predicción y
datos" de la búsqueda. Se mejoró el motor de coincidencia y la relevancia:
- **`fuzzy.ts` reescrito como motor multi-término con sinónimos del dominio**:
  tokeniza la consulta (ignora conectores), expande cada término con sinónimos
  del negocio ("recibir"→entrada/recepción/compra, "vendo/pedido"→salida/
  despacho/cliente, "caducidad"→vencimiento, "bodega"→almacén, "stock"→saldo…),
  y puntúa por campo con pesos (título 4 > subtítulo 2 > keywords 1). TODOS los
  términos deben coincidir (en cualquier campo o vía sinónimo); la puntuación
  premia cobertura completa y coincidencias compactas. Verificado: "crear
  producto"→accion:producto, "cómo recibo mercancía"→proceso-recepcion,
  "caducidad de lotes"→lotes/vencimiento.
- **`CommandPalette.tsx`**: `puntuacionCandidato` (por campos separados, no el
  texto concatenado), **boost de historial** (los comandos ya usados puntúan +60,
  aprendizaje), **orden por intención heurística** (la consulta detecta si es
  "ayuda", "acción de crear" o "reporte" y coloca ese grupo primero) y
  **desglose analítico en el footer** (cuántos resultados por grupo, ej. "4
  ayuda · 2 páginas").
- **`buscar.rs` (backend)**: relevancia multi-columna en SQL — clave exacta >
  prefijo de clave > título contiene la frase > subtítulo la contiene > resto.
  Así una búsqueda por nombre de producto encuentra el registro aunque el SKU no
  coincida (antes solo ordenaba por clave). Se corrigió un bug de binds (mezclar
  `?` posicionales con `?3`/`?4` numerados → `InvalidParameterCount`); ahora
  todo es posicional. 108 tests en verde.

**Nota de concurrencia:** durante la mejora, el usuario editaba en paralelo su
Hito 25 (tracking/análisis de navegación: `repo/auditoria.rs`,
`domain/seguridad.rs`, `registrar_vista`, `metricas_actividad`). Su WIP rompió
la compilación a mitad de edición (6 errores en `map_evento`/params) y dos tests
suyos fallaron transitoriamente; se resolvieron solos al terminar el usuario su
edición (108 tests pasan). No se tocaron sus archivos de auditoría.

**Confirmación limpia en la Ayuda (misma sesión):** el usuario pidió "mejora la
ayuda con confirmación más limpia"; eligió "confirmación al guardar/navegar".
Se implementó feedback consistente al guardar y al navegar:
- **`src/shared/ui/Link.tsx`**: el componente `Link` acepta `onClick` (se pasa
  al `RouterLink` interno) — extensión mínima, no rompe usos existentes.
- **`src/pages/ayuda/AyudaPages.tsx`**: nuevo `EnlaceAyuda` que muestra un toast
  de éxito "Abriendo: <destino>" cuando el enlace de una guía (bloques
  `enlaces` de procesos/primeros pasos) apunta **fuera** de `/ayuda` (a una
  página real de la app); los enlaces internos de ayuda no confirman. Se usa en
  el bloque `enlaces` del render. El SSR (Hito 22) requiere envolver con
  `ToastProvider` para renderizar estas páginas.
- **`src/shared/palette/CommandPalette.tsx`**: al ejecutar un comando de grupo
  `Ayuda` (guía o glosario) desde Ctrl+K, toast de éxito "Abriendo guía de
  Ayuda: <título>" — confirma el destino sin modales. El palette ya vive bajo
  `ToastProvider` (App.tsx).
- **`src/pages/PerfilPage.tsx`**: al guardar preferencias, si el checkbox
  `ayuda_en_palette` cambió, el toast es descriptivo ("Ayuda activada/desactivada
  en la búsqueda rápida...") en vez del genérico "Preferencias guardadas".

Verificación: pipeline en verde (`tsc`, `oxlint`, DesignGuard 136 archivos,
RouteGuard 42 rutas, `vite build`); SSR de los 26 módulos + índice + glosario
con `ToastProvider` (28/28 OK). No se tocó el backend en esta ampliación.

### Hito 24 — Cierre de gaps: edición de movimientos, crear-y-aprobar, árbol completo, UOM, sesiones, atomicidad, rendimiento (completo, sin commit)

Pedido del usuario: "implementemos TODOS esos" — los gaps listados en una
revisión del estado del proyecto. Se consultaron 4 decisiones: **UOM editar +
desactivar con columna `activo`** (el SPEC §3.9 no la define; migración por
columna), **Fase 8 "completo en todo"** (virtualizar la `Table` genérica +
lazy-loading de todas las páginas del shell), **adaptadores + rutas + árbol en
el detalle de Almacén** para Zona/Rack/Sección/Caja, y **sí a los gaps backend
menores** (traslado inter-almacén atómico + `comentario:eliminar` a GERENTE).

**Edición de movimientos (SPEC §6.2):**
- `domain/movimiento.rs`: `EditarMovimiento` (campos operativos + líneas;
  `tipo`/`sub_tipo`/`numero` estables). `repo/movimiento.rs`:
  `editar_movimiento` (solo el creador, solo `BORRADOR`/`PENDIENTE_APROBACION`,
  motivo revalidado, líneas reemplazadas con las mismas reglas de creación,
  auditoría) + `obtener_lineas`. Comando `editar_movimiento` + rama del
  dispatcher + `backend.ts` + `route-paths.movimientoEditar` + ruta
  `/movimientos/:id/editar` + `MovimientoEditarPage` + botón "Editar" en el
  detalle. `movimiento-form.tsx` refactorizado: `MovimientoGenericoForm` y
  `TrasladoForm` aceptan modo edición (precarga, sub-tipo/códigos bloqueados,
  mutation de edición, creación rápida deshabilitada). 4 tests nuevos.

**"Crear y aprobar" conectado a `requiere_aprobacion`:**
- Comando `puedo(recurso, accion) -> bool` (consulta pura de la matriz, sin
  auditoría) + dispatcher + `backend.ts`. En los dos formularios de
  movimiento, un toggle "Crear y aprobar de inmediato" aparece cuando la
  política no exige aprobación (`!requiere_aprobacion` de `usePreferencias`) y
  el usuario puede aprobar; al guardar encadena `crear_movimiento`/
  `crear_traslado` + `aprobar_movimiento`. Test del dispatcher.

**Zona/Rack/Sección/Caja CRUD completo + árbol:**
- Adaptadores (`zonas/racks/secciones/cajas`) en `catalog-adapters.tsx`,
  `refs.tsx` (`ZonaRef/RackRef/SeccionRef/CajaRef`), rutas de
  editar/eliminar, `CajaFormPage` nuevo, y `ZonaFormPage`/`RackFormPage`/
  `SeccionFormPage` con modo edición (patrón de `UbicacionFormPage`).
  `ArbolAlmacen.tsx`: árbol navegable Zona → Rack → Sección → Ubicación en el
  detalle de Almacén (carga por niveles filtrados por padre, `filter_logic:
  OR` para ubicaciones).

**UOM editable + desactivable:**
- `EditarUom`, `editar_uom`, `desactivar_uom` (guard: no desactivar una UOM
  usada por un producto), columna `activo` en `uoms` (migración idempotente),
  `UOM_SCHEMA` con `activo`, validación de UOM activa en crear/editar
  producto, comandos + dispatcher, `UomFormPage` con edición, adaptador con
  editar/eliminar. 3 tests nuevos.

**Sesión de inventario PLANEADA → EN_CURSO:**
- `iniciar_sesion` en `repo/inventario.rs` + comando `iniciar_sesion_inventario`
  + botón inline en el detalle de sesión cuando está `PLANEADA`. Test nuevo.

**Gaps backend:**
- **Unicidad de código por almacén completo** (SPEC §3.2-§3.5): rack/sección/
  ubicación validan contra el almacén resuelto por ancestro (helpers
  `almacen_de_zona/rack/seccion`); zona ya lo hacía. 2 tests nuevos.
- **`comentario:eliminar` a GERENTE** en la matriz (moderación).
- **Traslado inter-almacén atómico**: `insertar_movimiento(tx, nuevo)` extraído
  de `crear_movimiento` (sin transacción propia); `crear_traslado` crea las dos
  piernas en una sola transacción — si la segunda falla, no queda huérfano.
  Test nuevo.
- **Mensajes de error en usuarios**: `insertar_usuario` prevalida unicidad de
  `nombre_usuario`/`email` y existencia del rol, devolviendo errores
  específicos en vez del genérico "El código ya existe". 2 tests nuevos.

**Fase 8 (rendimiento) "completo en todo":**
- `@tanstack/react-virtual@3.14.9` instalado; `Table.tsx` virtualiza filas
  cuando hay > 80 (spacers de altura, scroll contenedor, overscan) — todas las
  tablas se benefician. Lazy-loading por ruta: helper `lazyPage` en `router.tsx`
  carga las páginas del shell de forma diferida (53 chunks JS en el build; el
  chunk principal baja de ~780 KB). `Suspense` con esqueleto alrededor del
  `<Outlet/>` en `AppLayout`. Skip-link a11y (`SkipLink` + `id="contenido"`).

**Fase 9 (empaquetado):**
- Iconos del bundle regenerados desde `public/rustock-512.png` (`tauri icon`),
  metadatos de descripción/categoría en `tauri.conf.json`, `INSTALACION.md`
  nuevo (requisitos, instalación deb/rpm, bootstrap, modos de ejecución,
  ubicación de la DB, respaldo, solución de problemas). El binario release
  compila (5 min); el empaquetado deb/rpm **no se puede ejecutar en este
  entorno** porque faltan `dpkg-deb`/`rpmbuild` (limitación de la máquina, no
  del código).

**Puerto HTTP configurable (Frente 9):**
- `server.rs::puerto_http()` lee `RUSTOCK_HTTP_PORT` (default 1421); `lib.rs`
  lo usa en el log; `api.ts` lee `VITE_RUSTOCK_API` (default
  `http://127.0.0.1:1421/api`); `scripts/web.mjs` propaga el puerto al backend
  y la URL al frontend cuando se define la variable.

**Ayuda actualizada** (ayuda-data.ts): los módulos de Almacenes/árbol, UOM y
Movimientos reflejan las nuevas capacidades (CRUD completo de zona/rack/
sección/caja, árbol en el detalle, UOM editable/desactivable, edición de
movimientos, unicidad por almacén).

**Verificación:** pipeline completo en verde — backend (`cargo fmt --all
--check`, `cargo clippy --all-targets --all-features -- -D warnings`, `cargo
test --lib` 103) y frontend (`tsc --noEmit`, `oxlint` 0 errores, DesignGuard
OK 134 archivos, RouteGuard OK 42 rutas, `vite build` con 53 chunks lazy).
**Prueba en vivo por HTTP** (backend web-only en `RUSTOCK_HTTP_PORT=1450` con
DB temporal): bootstrap → login → `puedo` → UOM crear/editar → producto →
almacén + 2 zonas → rack (duplicado en otra zona **rechazado** por unicidad de
almacén) → sección → ubicación (duplicado rechazado) → caja → movimiento
BORRADOR → `editar_movimiento` (cantidad 10→15, notas) → aprobar → editar
aprobado **rechazado** → saldo 15 → sesión PLANEADA → `iniciar_sesion_inventario`
→ EN_CURSO → usuario con rol inexistente con mensaje claro.

**Nota de concurrencia:** el usuario editaba en paralelo `domain/configuracion.rs`
y `tests.rs` (preferencia `ayuda_en_palette` del command palette); su cambio
rompió un literal de test (`EditarPreferenciasUsuario` sin el campo nuevo)
mientras yo corría el pipeline — se resolvió solo al guardar su versión final.
No se tocaron sus archivos de palette.

### Hito 21 — Temas configurables: 6 paletas + modo claro/oscuro (completo, sin commit)

Pedido del usuario: "que el theme sea adaptable, que pueda elegir la paleta de
colores del tema cuando quiera y como quiera". Se le consultaron 4 decisiones y
eligió: **solo paletas predefinidas** (lista cerrada), **persistencia global
(ADMIN) + sobrescritura por usuario**, **logo teñido con el acento** e
**incluir modo oscuro** (interruptor claro/oscuro además de las paletas).

**Backend (Rust):**
- **`src-tauri/src/domain/tema.rs`** (nuevo): 6 paletas predefinidas (`rust`
  Óxido, `bosque`, `oceano`, `uva`, `miel`, `pizarra`) que declaran **solo su
  acento** (claro y oscuro); el resto de los tokens se **genera por modo**
  (`generar_variables`): escala de acento 50-900 (tintes hacia blanco/fondo
  oscuro según modo, tonos hacia negro en claro / hacia blanco en oscuro),
  neutros compartidos por modo (identidad base "Rust & Iron"), superficies,
  semánticos (success/warning/danger con sus bg/text), info-bg/info-text
  derivados del acento de la paleta, y las 7 sombras (`--shadow-*`,
  `--topbar-scroll-bg`, `--scrim-overlay`). Tipos: `ModoColor` (CLARO/OSCURO),
  `ResumenTema` (para el selector), `TemaActivo` (id, nombre, modo y
  `variables: BTreeMap<String,String>` — el mapa token→valor que la UI aplica).
  `tema_resuelto()` aplica la preferencia propia con fallback a la empresa y
  descarta ids inválidos. **Cero lógica de color en el frontend**: la UI solo
  aplica el mapa que devuelve Rust.
- **`db.rs`**: migración por columna (`asegurar_columna`, sin borrar la db):
  `configuracion_empresa.tema_id` (default `'rust'`) y `.modo_oscuro` (0/1);
  `preferencias_usuario.tema_id` y `.modo_oscuro` (NULL = heredar).
- **`domain/configuracion.rs`**: `ConfiguracionEmpresa`/`PreferenciasUsuario`
  ampliados; `EditarConfiguracionEmpresa` gana `tema_id: Option<String>` +
  `modo_oscuro: Option<bool>`; `EditarPreferenciasUsuario` gana
  `tema_id: Option<Option<String>>` y `modo_oscuro: Option<Option<bool>>`
  (None = no tocar, Some(None) = heredar, Some(Some(v)) = fijar); ambos
  validan el tema contra la lista (error claro para id inexistente).
  `PreferenciasResueltas` gana `tema_id`, `tema_heredado`, `modo_oscuro`,
  `modo_oscuro_heredado` (la UI sabe si está heredando sin pedir permiso de
  `configuracion`).
- **`repo/configuracion.rs`**: lectura/escritura de las columnas nuevas y
  `tema_activo_de_usuario()` (tema resuelto → `obtener_tema`).
- **`commands.rs` + `server.rs`**: 4 comandos espejados uno a uno en el
  dispatcher HTTP: `listar_temas` (sesión), `obtener_tema` (tema_id +
  modo_oscuro, para vista previa y activo), `obtener_tema_activo` (resuelto
  para la sesión), `obtener_tema_global` (sin sesión — pinta login/landing con
  el tema de la empresa; solo configuración de presentación, sin datos
  sensibles). `bool_opt` nuevo helper en server.rs.
- **Tests**: +6 (85 en total): módulo tema (6 paletas con muestras distintas,
  tokens completos por modo, inversión de neutros en oscuro, tema inválido →
  defecto), integración (config empresa rechaza tema inválido + herencia del
  tema global, `tema_activo_de_usuario` resuelve por modo) y **test del
  dispatcher HTTP** (`dispatcher_temas_devuelve_paletas_variables_y_global`).
  **Bug de test encontrado y corregido**: el test retenía `db.conn()` (lock del
  mutex) mientras `despachar` volvía a pedirlo → deadlock; se suelta el lock en
  un bloque antes de despachar.

**Frontend (React):**
- **`src/shared/tema.ts`** (nuevo): store zustand que aplica el mapa de
  variables al root (`document.documentElement.style.setProperty` por token +
  `dataset.tema`/`dataset.modo`); `previsualizar(temaId, modoOscuro)` para
  vista previa en vivo, `refrescarActivo()`/`refrescarGlobal()` y `limpiar()`.
- **`preferencias.ts`**: `refrescar()`/`guardar()` disparan `refrescarActivo()`
  (el tema viaja junto a las preferencias). **`App.tsx`**: sin sesión →
  `refrescarGlobal()` (login/landing con el tema del ADMIN); con sesión lo
  aplica AppLayout vía preferencias.
- **`types.ts`/`backend.ts`**: campos de tema en config/preferencias y los 4
  comandos nuevos.
- **`src/shared/ui/ThemePicker.tsx`** (nuevo, exportado del barrel):
  `PaletaPicker` (grid de botones con las dos muestras de acento claro/oscuro
  de cada paleta + opción "Heredar de la empresa") y `ModoPicker` (Claro /
  Oscuro / Heredar, con muestra circular). CSS nuevo en `components.css` con
  tokens (`.theme-picker__*`, `.modo-picker__*`).
- **`PerfilPage`**: tarjeta "Apariencia" con PaletaPicker + ModoPicker
  (incluyen "Heredar de la empresa") y **vista previa en vivo** al hacer clic;
  al guardar envía `tema_id`/`modo_oscuro` (null = heredar).
- **`ConfiguracionPage`**: tarjeta "Apariencia" (paleta global + modo
  claro/oscuro, sin "heredar") integrada al formulario existente
  (watch/setValue + preview); al guardar refresca las preferencias para
  re-aplicar el tema del ADMIN si no tiene preferencia propia.
- **`LogoMark.tsx`**: los hex hardcodeados de óxido se reemplazan por
  `var(--color-blue-400/500/700/300/200)` y `var(--color-ink-200)` → el logo
  se tiñe con la paleta y el modo activos. El favicon (`public/rustock.svg`)
  queda con óxido fijo (no puede usar variables CSS del documento).
- **CSS**: `tokens.css` — `color-scheme: var(--color-scheme, light)` (lo
  reescribe el tema) y defaults de `--topbar-scroll-bg`/`--scrim-overlay`;
  `layout.css` — los 2 únicos rgba hardcodeados (topbar en scroll y backdrop
  del nav móvil) pasan a los tokens del tema.

**Verificación:** pipeline completo en verde — backend (`cargo fmt --check`,
`cargo clippy --all-targets --all-features -- -D warnings`, `cargo test` 85) y
frontend (`tsc --noEmit`, `oxlint` 0 errores, DesignGuard OK 125 archivos,
RouteGuard OK 41 rutas, `vite build`). **Prueba en vivo por HTTP** (el backend
dev que corría ya tenía los comandos nuevos tras recompilar): `listar_temas`
(6 paletas), `obtener_tema` (escala oscura generada correctamente),
`obtener_tema_activo` (preferencia propia gana a la global), `obtener_tema_global`,
guardado de preferencia personal y config global, y **tema inválido rechazado**
con error claro. **Prueba en navegador real** (chromium headless + `--dump-dom`
sobre `http://localhost:6821/dashboard`): el JS aplica `data-tema="pizarra"`
`data-modo="oscuro"` y las variables correctas (`--color-scheme: dark`,
`--color-gray-900: #edeae4`, `--color-surface-muted: #1b1916`) — el modo
oscuro y la paleta se aplican de punta a punta. Se restauraron la preferencia
personal (`pizarra` claro) y la config global (`rust` claro) tras la prueba.

**Decisiones documentadas:**
- Los **neutros y semánticos son compartidos por modo** entre todas las
  paletas (solo cambia el acento): mantiene la identidad "Rust & Iron" y
  reduce el riesgo de contraste. Cada paleta declara únicamente su acento
  claro/oscuro.
- Sin sesión (login/landing/403) se aplica el **tema global de la empresa**
  vía `obtener_tema_global`; el tema personal solo existe con sesión.
- El favorito del usuario quedó como estaba (él ya había elegido `pizarra`).

### Hito 20 — Sección Ayuda: guía de todos los módulos + glosario (completo, sin commit)

Pedido del usuario: "una nueva sección de Ayuda para tener documentado TODOS los
módulos, con todas las acciones, explicación de términos, cómo se usa, pasos y
procesos, tal cual fiel y exacto a lo que hace la app". Se consultaron 2
decisiones (estructura y ubicación): **índice + una página por módulo +
glosario**, con un **nuevo grupo "Ayuda" al final del sidebar** (ícono
`ayuda`/HelpCircle agregado al mapa canónico de Lucide, DESIGN §6.13).

- **`src/pages/ayuda/ayuda-data.ts`** (nuevo): contenido declarativo — 19
  módulos agrupados en 5 grupos (Operación: Dashboard, Movimientos, Inventario,
  Alertas; Catálogos: Almacenes+zonas/racks/secciones, Ubicaciones, Productos,
  Lotes, Categorías, UOM, Proveedores, Clientes; Análisis: Reportes, Historial;
  Administración: Usuarios, Sucursales, Configuración, Perfil; Sistema: Inicio
  de sesión) + **40 términos de glosario**. Cada módulo documenta qué es,
  dónde acceder (enlaces reales), acciones disponibles, pasos y reglas de
  comportamiento **tal cual implementa el código** (rutas del router, campos de
  los formularios, estados, validaciones, efecto de aprobar/anular/desactivar).
- **`src/pages/ayuda/AyudaPages.tsx`** (nuevo): `AyudaIndexPage` (/ayuda, grid
  de tarjetas por grupo + tarjeta del glosario), `AyudaModulePage` (recibe el
  id **por prop**, no por `useParams` — ver bug abajo), `AyudaGlosarioPage`
  (/ayuda/glosario, términos agrupados por letra en grid de 2 columnas).
- **Conexión**: `Icon.tsx` (ayuda = HelpCircle), `route-paths.ts`
  (PATH.ayuda/ayudaGlosario + `ayudaModulo()`), `nav.ts` (grupo Ayuda),
  `breadcrumbs.ts` (segmento ayuda), `router.tsx` (rutas estáticas
  `ayuda/<id>` por módulo generadas del data).
- **Bug real encontrado y corregido durante la verificación (no habría
  aparecido en typecheck/lint/build)**: las rutas de módulo son estáticas
  (`ayuda/movimientos`) pero `AyudaModulePage` leía `id` de `useParams` →
  siempre caía en "Módulo no encontrado" y las páginas salían vacías. Se
  detectó con un **test SSR de Vite** (`createServer` + `renderToString` +
  `createMemoryRouter` — el mismo patrón que usó el Hito 10 para verificar
  rutas) y se corrigió pasando `id={mod.id}` como prop (mismo patrón que
  `CatalogDetailRoute`). El test SSR confirmó después que los 19 módulos
  renderizan contenido y que el glosario no duplica términos.
- **Ajustes de UX pedidos por el usuario tras la primera entrega**: quitar el
  botón duplicado "Glosario de términos" del PageHeader del índice (la tarjeta
  del glosario ya tenía su enlace) y poner el glosario en **formato grid**
  (antes tarjetas apiladas).
- **Nota de concurrencia**: durante la sesión el editor en paralelo del usuario
  guardó versiones nuevas de `ConfiguracionPage.tsx` (que incorpora el WIP de
  temas: `PaletaPicker`/`ModoPicker`/`temasQuery`/`useTema`) mientras yo limpiaba
  imports muertos del typecheck — se restauraron todas las importaciones que el
  código realmente usa. Quedó resuelto además el error de typecheck preexistente
  del WIP de temas en `PerfilPage.tsx` (`modo_oscuro = modoSel === null ? null :
  modoSel === "OSCURO"` — conversión del enum CLARO/OSCURO a boolean).

**Verificación:** `tsc --noEmit` 0 errores, `oxlint` 0 errores, DesignGuard OK
(125 archivos), RouteGuard OK (41 rutas), `vite build` OK, `cargo fmt --check`
OK, `cargo clippy --all-targets --all-features -- -D warnings` OK y
`cargo test --lib` (85 tests) en verde. Prueba de render de las páginas de
ayuda vía SSR de Vite (contenido completo en los 19 módulos + glosario).

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
  todos los comandos bash y herramientas permitidos sin prompts de permiso.
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
  - **Resuelto en el Hito 16 (§2):** los reportes de stock, movimientos,
    precisión y auditoría ya tienen páginas propias en `/reportes/*` (antes
    las tarjetas enlazaban a páginas ajenas o a rutas sin página).
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

### Hito 11 — Modo navegador sin ventana: `npm run tauri:web` (sin GTK/WebKit)

Pedido del usuario: que probar en modo web fuera "un solo comando" que
funcionara aunque no hubiera servidor X/Wayland. El problema real detectado
en vivo: **en WSL (o cualquier entorno sin X funcional) `npm run tauri dev`
se cuelga ANTES de `setup()`** — GTK/WebKit intenta crear la ventana nativa
y el proceso queda en `unix_wait_for_peer` (2 hilos, sin socket TCP, sin
mensaje `[server]`). `RUSTOCK_HEADLESS=1` no sirve para esto porque solo
oculta la ventana *después* de crearla; Xvfb tampoco es viable en este WSL
(`/tmp/.X11-unix` viene montado en solo lectura y el socket X0 de WSLg está
muerto). Diagnóstico: `unix_wait_for_peer` + ausencia de procesos helper de
WebKit = la inicialización GTK nunca completa.

**Solución: modo web-only sin Tauri window.** `main.rs` ahora lee
`RUSTOCK_WEB_ONLY=1` y, si está definido, llama a `rustock_lib::run_web()`
en lugar de `rustock_lib::run()` — **sin tocar `tauri::Builder` ni GTK en
absoluto**. `run_web()` (lib.rs) inicializa `DbState` + `seed_roles` +
seed opcional + `server::iniciar` (`:1421`) y bloquea con `park()` en un
loop. La ruta de la db se resuelve con `ruta_base_de_datos()`: env
`RUSTOCK_DB_PATH` si existe, si no `~/.local/share/com.rustock.app/
rustock.db` (honrando `XDG_DATA_HOME`) — la misma que usa el modo
escritorio, así ambos modos comparten datos.

**`scripts/web.mjs` (nuevo):** orquestador Node que `npm run tauri:web`
invoca — lanza `npm run dev` (vite en `:6821`) y `cargo run` con
`RUSTOCK_WEB_ONLY=1` (backend en `:1421`) como hijos, con stdio
heredado, y limpia ambos con SIGTERM/SIGKILL al salir (Ctrl+C o si uno de
los dos muere). Reemplazó al script anterior `RUSTOCK_WEB_ONLY=1 npm run
tauri dev` porque la cadena del CLI de tauri era frágil (su
`beforeDevCommand` duplicaba vite y en este entorno saturado el vite
secundario murió sin error → tauri abortaba "beforeDevCommand terminated").
`RUSTOCK_SEED=1` y `RUSTOCK_DB_PATH` pasan por el env heredado.

**Verificado en vivo por HTTP (sin ventana, sin X):** `npm run tauri:web`
levanta ambos puertos (`:6821` vite, `:1421` rustock); la cadena completa
funciona por curl — `bootstrap_admin` (creó el admin `omar`), `login` (sesión
real), `quien_soy`, `obtener_dashboard` (datos reales, vacíos para instalación
nueva). Pipeline verde: `cargo fmt --check`, `cargo clippy --all-targets
--all-features -- -D warnings`, `cargo test --lib` (66 tests), `npm run
typecheck`, `npm run lint`, `npm run design`, `npm run routes`. Docs
actualizadas: AGENTS.md (comando `tauri:web` + gotcha WSL), MEMORY.md (§4
gotcha + §6 instrucciones).

**Pendiente de probar por el usuario** (su máquina sí puede): abrir
`http://localhost:6821` y loguearse con `omar` / `Omar1234!` (admin creado
durante la verificación; si prefiere su propia contraseña, borrar
`~/.local/share/com.rustock.app/rustock.db` antes de arrancar para que el
formulario de bootstrap cree el admin de cero).

---

### Hito 12 — Formularios de creación/edición para los 6 catálogos restantes

El usuario reportó el bloqueo real: no podía crear un producto porque el
formulario pedía UOM base y no existía ninguna UI para crear UOMs — gap ya
documentado (MEMORY §6, punto 3 del trabajo sugerido). Se implementaron los
formularios que faltaban, todos con el mismo patrón que
`AlmacenFormPage`/`ProductoFormPage` (react-hook-form + zod + react-query,
sin tocar nada del backend, que ya exponía todos los comandos):

- **`src/pages/UomFormPage.tsx`** — creación de UOM (`crear_uom`):
  código, nombre, tipo (UNIDAD/PESO/VOLUMEN/LONGITUD/SUPERFICIE), factor de
  conversión, checkbox "es base". Solo creación: el backend no expone
  `editar_uom`/`desactivar_uom`, así que el adapter no define editar/eliminar.
- **`src/pages/CategoriaFormPage.tsx`** — crear + editar (`crear_categoria`/
  `editar_categoria`): nombre, categoría padre (con opción "raíz", excluyendo
  la propia en edición), descripción. En edición envía `parent_id: null` para
  mover a raíz (respeta la semántica `Option<Option<String>>` del backend).
- **`src/pages/ContactoFormPage.tsx`** — componente parametrizado
  (`tipo: "proveedor" | "cliente"`) para Proveedor y Cliente: crear + editar
  (código inmutable en edición) + contacto/teléfono/email/dirección. El
  adapter de ambas entidades ya tenía `desactivar`, así que se habilitó el
  botón Eliminar (desactivación lógica).
- **`src/pages/UbicacionFormPage.tsx`** — crear + editar (`crear_ubicacion`/
  `editar_ubicacion`): código, nombre, tipo (los 8 de SPEC §3.5),
  capacidad máxima y, en creación, el contenedor padre con selector doble
  (tipo: zona/rack/sección + el elemento concreto, respetando SPEC §3.13
  "exactamente un padre"). En edición el padre no se muestra porque
  `EditarUbicacion` no lo permite (código de la Fase C).
- **`src/pages/LoteFormPage.tsx`** — crear + editar (`crear_lote`/
  `editar_lote`): número, producto (solo los que `controla_lote`, SPEC §3.12),
  fechas de fabricación/vencimiento (input `type="date"`, que produce el
  formato `YYYY-MM-DD` que guarda el backend), origen, notas. La fecha de
  vencimiento se exige en el cliente cuando el producto seleccionado
  `controla_vencimiento`, con `setError` en el submit (el schema es estático,
  así que no hay dependencia circular useForm↔useWatch↔schema).
- **`src/pages/catalog-adapters.tsx`** — `crearHref`/`editarHref`/
  `eliminarHref`/`desactivar` agregados a los 6 adapters (uom solo crear;
  lote crear/editar sin eliminar).
- **`src/app/router.tsx`** — 14 rutas nuevas (`/uoms/nuevo`,
  `/categorias/nuevo|:id/editar|:id/eliminar`, `/proveedores/...`,
  `/clientes/...`, `/ubicaciones/...`, `/lotes/nuevo|:id/editar`), colocadas
  antes de los mapas genéricos de `CATALOG_KEYS` siguiendo el patrón de
  almacenes/productos.

**Verificación:** pipeline completo en verde (`npm run typecheck`, `npm run
lint` sin errores, `npm run design`, `npm run routes`, `npm run build`,
`cargo fmt --check`, `cargo clippy -D warnings`, `cargo test` — 66 tests) y
**prueba en vivo por HTTP** del flujo exacto que bloqueaba al usuario con DB
temporal: `bootstrap_admin` → `login` → `crear_uom` → `crear_producto` con la
`uom_base_id` de la UOM recién creada (respuesta `ok:true` en ambos).

---

### Hito 13 — Rebranding "Rust & Iron": paleta de óxido, logo y SEO

Pedido del usuario: que la identidad visual sea literalmente una **caja a
medio oxidar** con una paleta de colores de Rust (el nombre de la app es
Rust + Stock), y que el HTML tuviera SEO/meta tags/logo consistentes. Se
confirmó el alcance con el usuario: **rebranding completo** (paleta + logo +
SEO) con la estética aplicada a **toda la interfaz**. Cambios:

- **`src/styles/tokens.css` — paleta nueva ("Rust & Iron")**: se mantienen
  los nombres de variables (`--color-blue-*`, `--color-ink-*`,
  `--color-gray-*`) para no romper las cientos de referencias en CSS/TSX,
  pero los valores pasan de indigo/neutros fríos a **óxido + hierro oscuro +
  neutros cálidos**: acento único `#B7410E` (óxido clásico), escala Rust
  completa (50-900), escala Iron para superficies oscuras de navegación
  (`--color-ink-900` ahora `#1F1813`, tinte tierra), grises cálidos con tinte
  tierra, sombras con tinte cálido `rgba(21, 15, 11, ...)` en lugar del azul
  frío, `--color-info-bg`/`--color-info-text` ajustados a óxido. El
  DesignGuard no bloquea valores de color (solo radius/sombras/blur/fuentes/
  emojis/iconos), así que el pipeline no se ve afectado.
- **Logo `public/rustock.svg` + PNGs**: caja isométrica en tonos de óxido
  **sin fondo** (sin placa de hierro; la caja es la protagonista con un
  recorte ajustado de ~5% de margen), plano (sin gradientes, coherente con la
  filosofía flat del sistema). PNGs generados con `rsvg-convert`
  (`rustock-512.png` para OG/manifest, `rustock-192.png` para
  apple-touch-icon/manifest, `rustock-32.png`/`rustock-16.png` para
  favicons). Se eliminó `public/vite.svg` (favicon de Vite que quedaba).
- **`src/shared/ui/LogoMark.tsx` (nuevo)**: SVG inline de la caja oxidada,
  reutilizable, exportado desde el barrel. **`Brand.tsx`** ahora renderiza
  `LogoMark` dentro del `span.topbar__logo` (que ya no necesita
  `background-color`/`border-radius` en `layout.css`); nueva prop
  `logoSize` (default 32, 48 en la pantalla de login para más presencia).
- **`index.html` — SEO completo**: title descriptivo ("Rustock — Gestión de
  inventario y almacén (WMS) self-hosted"), meta description/keywords/
  author/robots, `theme-color` `#B7410E`, favicons SVG+PNG, Open Graph
  (og:type/site_name/title/description/image/locale `es_MX`), Twitter Card
  (summary_large_image) y link al manifest. **`public/manifest.webmanifest`**
  (nuevo): name/short_name/lang/display/theme_color/background_color/icons.
  El build de Vite copia los assets públicos y el dist/index.html resultante
  lleva el title y las etiquetas OG correctamente.
- **Docs actualizadas**: DESIGN.md reescrito a la identidad "Rust & Iron"
  (título del documento, filosofía §1, paleta §3.1 completa con las tres
  familias Iron/Rust/Gray, sombras cálidas §3.5, marca de la topbar §4.2,
  enlaces "texto óxido" §5.5, botón primario/enlaces/focus §6, y pie del
  documento v0.3). AGENTS.md: corregida la línea de `border-radius: 0` (que
  contradecía al propio DesignGuard — el sistema usa esquinas suaves con
  tokens), "Blue palette" → "Rust palette", y se añadió la nota de la marca
  `LogoMark`/favicon.
- **Nota de limpieza ajenas al rebranding**: el working tree del usuario
  traía WIP sin commitear (Hito 12, formularios con creación rápida) y
  `movimiento-form.tsx` estaba a mitad de refactor — se restauraron las
  importaciones de `creacion-rapida` que el archivo realmente usa (tsc lo
  confirmó en verde). También se quitó el import muerto `catalogoNuevo` de
  `ProductoFormPage.tsx` solo si tsc lo reportaba; al final tsc real (sin el
  wrapper `snip`, que distorsiona la salida — gotcha conocido de AGENTS.md)
  no lo reportaba, así que no se tocó.

**Verificación:** `node_modules/.bin/tsc --noEmit` (0 errores), `npm run
lint` (solo warnings preexistentes de react-perf/eslint style, no bloquean),
`npm run design` (DesignGuard OK, 93 archivos), `npm run routes` (RouteGuard
OK), `npm run build` (vite OK) y `cargo check --all-targets` (OK — no se tocó
Rust). **Importante para futuras sesiones:** usar `/usr/bin/npm` o los
binarios de `node_modules/.bin/` para verificar; el wrapper `snip` del PATH
mezcla/omite salidas y dio typecheck falsos positivos.

### Hito 14 — Logo sin fondo, login con marca y landing público en la raíz (completo, sin commit)

Pedido del usuario en dos partes: (1) quitar el fondo del logo y (2) landing
page en la raíz `/` que presente el producto cuando no hay sesión.

**Logo sin fondo:**
- `public/rustock.svg` + `src/shared/ui/LogoMark.tsx`: eliminada la placa de
  hierro oscuro (`<rect>` `#1F1813`) y recortado el `viewBox` de `0 0 64 64`
  a `12 15 40 40` — la caja ocupa ~90% del canvas con ~5% de margen. PNGs
  (16/32/192/512) regenerados con `rsvg-convert`; verificado por alpha
  (esquinas 0 = transparente, centro opaco) y trim (`462x462+25+25`).
- Docs actualizadas: AGENTS.md, DESIGN.md §4.2, MEMORY.md (Hito 13 ya no
  mencionan la placa).
- **Nota para futuras sesiones:** este modelo no lee imágenes; la
  verificación visual del logo fue programática (alpha/trim), no ocular.

**Login con marca centrada:**
- `LoginPage.tsx`: el `Brand` horizontal (logo+título lado a lado, 48px) se
  reemplazó por un bloque vertical propio: `LogoMark` a 72px centrado +
  título "Rustock" debajo en `--text-2xl` bold gris-800, todo envuelto en un
  `RouterLink` (mismo patrón que `Brand.tsx`). CSS nuevo `.auth-shell__brand-*
  ` en `layout.css`.

**Landing público en la raíz `/`:**
- `PATH.dashboard` pasó de `/` a **`/dashboard`** (único cambio de URL; todos
  los usos pasan por `PATH.*`).
- `src/pages/LandingPage.tsx` (nuevo): presentación del producto en español
  profesional — header con marca + nav (Configurar admin / Iniciar sesión),
  hero con logo 88px + badge "Self-hosted" + tagline + CTAs, grid de 6
  tarjetas de features (Stock, Movimientos, FIFO/FEFO, Inventario, Trazabilidad,
  Roles), sección de 4 principios de integridad, CTA final y footer. Cero
  emojis, iconos lucide canónicos, solo tokens de paleta/radio/sombra.
  `LandingPage` redirige a `/dashboard` si ya hay sesión activa.
- `router.tsx`: la raíz `/` ahora es pública con `LandingPage` como index y un
  layout route sin path con `AppLayout` (protegido, redirige a `/login` sin
  sesión) como contenedor de todas las rutas de la app, incluida la nueva
  `dashboard`. `NotFoundPage`/`ForbiddenPage` ahora usan `PATH.dashboard`.
- **Bug de blanco encontrado y corregido**: al mover la raíz a `LandingPage`,
  la sesión quedó en `cargando: true` para siempre — la llamada a
  `refrescar()` (quien_soy) vivía en `AppLayout`, que ya no se monta en la
  raíz, y `LandingPage` retorna `null` mientras carga → página en blanco.
  Fix: `SesionBootstrap` en `App.tsx` resuelve la sesión al arranque de la
  app (una vez, antes de `RouterProvider`), así landing/login/shell tienen
  la sesión resuelta desde el primer render. La llamada redundante de
  `AppLayout` se dejó (inofensiva, una petición extra al entrar al shell).
- CSS del landing (`.landing__*`) en `layout.css`; el landing usa scroll
  interno (`height: 100%; overflow-y: auto`) porque `body` tiene
  `overflow: hidden` por diseño de shell (base.css).
- **Gap conocido:** el usuario estaba editando en paralelo un WIP de gestión
  de usuarios (rutas `usuarios/*`, `perfil`) que dejó **errores de typecheck
  sin resolver** (`ConfiguracionPage`, `PerfilPage`, `Usuario*`,
  `preferencias.ts`: API de Toast cambiada, `ErrorPanel` exige `children`,
  etc.) — no se tocaron por ser ajenos a este hito; el pipeline completo
  (npm run build/typecheck) no queda verde hasta resolverlos.

**Verificación de este hito:** tsc con 0 errores en los archivos del hito,
`vite build` OK, oxlint sin warnings en los archivos del hito, DesignGuard OK
(101 archivos), prettier OK. El typecheck global sigue rojo por el WIP del
usuario mencionado arriba.

---

### Hito 15 — Configuración de empresa, preferencias de usuario y gestión de usuarios real (completo, sin commit)

Pedido del usuario: módulo de settings/preferencias donde se trackeen
preferencias personales (tamaño de fuente, orden del sidebar, umbral, zona
horaria, formato de fecha), con un **módulo empresa** que elige el ADMIN y
gestión de usuarios. Se le consultaron 4 decisiones de diseño (persistencia,
campos, alcance, umbral) y eligió: **backend SQLite**, todos los campos de
empresa (datos básicos, zona horaria, formato fecha, umbral vencimiento,
requerir aprobación), gestión de usuarios completa (editar/desactivar/
reactivar/cambio de contraseña + perfil propio) y **umbral de stock global**.

**Backend (Rust, todo nuevo o extendido):**
- **`db.rs`**: tablas `configuracion_empresa` (fila única `id='default'` con
  valores por defecto: zona `America/Lima`, formato `DD_MMM_YYYY`, 30 días,
  requiere aprobación = 1, stock mínimo default NULL) y `preferencias_usuario`
  (por usuario: `tamano_fuente` MEDIA, `orden_sidebar` JSON, `zona_horaria`/
  `formato_fecha` NULL = heredar de la empresa). Tablas nuevas con
  `CREATE TABLE IF NOT EXISTS`: **no requieren borrar la db existente**.
- **`domain/configuracion.rs`** (nuevo): `ConfiguracionEmpresa`,
  `EditarConfiguracionEmpresa`, `PreferenciasUsuario`, `PreferenciasResueltas`
  (con fallbacks aplicados — lo que consume la UI), `EditarPreferenciasUsuario`
  y los enums `FormatoFecha` (`DD_MMM_YYYY`/`DD_MM_YYYY`/`YYYY_MM_DD`) y
  `TamanioFuente` (`PEQUENA`/`MEDIA`/`GRANDE`), con `ZONAS_HORARIAS` (12 zonas
  IANA). Validaciones: zona horaria y formato dentro de la lista soportada,
  umbrales no negativos.
- **`repo/configuracion.rs`** (nuevo): obtener/guardar config y preferencias
  (creando la fila por defecto en el primer acceso), `preferencias_resueltas`
  (aplica fallbacks de empresa), y helpers que las alertas usan
  (`dias_aviso_o_por_defecto`, `stock_minimo_default`).
- **`repo/seguridad.rs`**: `editar_usuario` (nombre completo/email/rol;
  `nombre_usuario` inmutable, SPEC §14.7), `desactivar_usuario`/`reactivar_usuario`
  (protecciones: no autodesactivarse, no desactivar al último ADMIN activo —
  nuevo `AppError::UltimoAdmin`), `cambiar_password_propia` (verifica la actual,
  `AppError::PasswordActualIncorrecta`), `cambiar_password_admin`. Todos auditan
  (SPEC §4.5).
- **`repo/alerta.rs`**: `STOCK_BAJO` ahora usa el `stock_minimo_default` de la
  config para productos sin `stock_minimo` (SPec §17.1); `listar_alertas` sin
  `dias_por_vencer` usa el umbral configurado en vez del 30 fijo.
- **`commands.rs` + `server.rs`**: 10 comandos nuevos (editar_usuario,
  desactivar_usuario, reactivar_usuario, cambiar_password, cambiar_password_admin,
  obtener_configuracion_empresa, guardar_configuracion_empresa,
  obtener_preferencias_usuario, guardar_preferencias_usuario, obtener_usuario)
  espejados uno a uno en el dispatcher HTTP (misma regla de `server.rs`: nunca
  reimplementa negocio). Permisos: `configuracion:ver/editar` y `usuario:editar`
  (solo ADMIN en la matriz); preferencias personales solo requieren
  autenticación (son ajustes de UI, no recurso de negocio).
- **Tests**: +8 (74 en total): config default/edición/rechazo de valores
  inválidos, preferencias con fallback de empresa, gestión de usuario
  (editar/desactivar/reactivar, no autodesactivarse, último admin, cambio de
  password propia y admin) y stock_minimo_default generando alerta.

**Frontend (React):**
- **`src/shared/preferencias.ts`** (nuevo): store zustand espejo de
  `PreferenciasResueltas`; `refrescar()`/`guardar()` llaman al backend y
  aplican el tamaño de fuente al root (`document.documentElement.style.fontSize`
  — el CSS usa rem, escala toda la UI: 87.5%/100%/112.5%).
- **`format.ts`**: `formatearFecha`/`formatearFechaCorta` ahora usan la zona
  horaria y el formato de las preferencias (fallback `America/Lima` +
  `DD_MMM_YYYY`), construidos con `Intl.DateTimeFormat` (nunca `toLocaleString`
  sin timeZone). Todo listado/detalle del sistema respeta las preferencias sin
  tocar cada página.
- **`nav.ts`**: `construirNav(ordenHrefs)` reordena los ítems de cada grupo
  según el orden global de hrefs persistido (los no listados van al final);
  `itemsDeNav()` para la UI de reordenar. `AppLayout` carga preferencias al
  iniciar sesión y pasa el orden al sidebar; el `TopbarUser` ahora enlaza a
  `/perfil` (DESIGN §4.2).
- **`/perfil`** (`PerfilPage.tsx`): datos de la cuenta, **preferencias**
  (tamaño de fuente, zona horaria con opción "heredar de la empresa", formato
  de fecha, orden del panel lateral con flechas subir/bajar por grupo) y
  **cambio de contraseña** (verifica la actual). Las preferencias se guardan
  al pulsar "Guardar preferencias" y se aplican al instante.
- **`/configuracion`** (`ConfiguracionPage.tsx`, era 100% mock): formulario
  real de la empresa (datos básicos, zona horaria, formato, días de aviso,
  stock mínimo default, política de aprobación) + acción "Usuarios y roles".
  Roles no-ADMIN ven un aviso con enlace a su perfil (permiso solo ADMIN).
- **`/usuarios`** (era placeholder de `AlertasPage`): `UsuariosPage` (listado
  real con filtro por estado y paginación), `UsuarioFormPage` (nuevo/editar con
  rol; `nombre_usuario` inmutable en edición), `UsuarioDetallePage` (datos +
  actividad reciente vía `listar_historial`), `UsuarioEliminarPage`
  (confirmación desactivar/reactivar), `UsuarioPasswordPage` (reset por admin).
  Las acciones de gestión solo se muestran a ADMIN (SPEC §4.4).
- **Iconos nuevos** en el mapa canónico: `subir`/`bajar` (ChevronUp/ChevronDown)
  para el reordenamiento del sidebar.
- **Bug de lint resuelto**: `no-array-sort` (deny) en `nav.ts`/`PerfilPage`
  — se usa `toSorted` (disponible porque `tsconfig.lib` ya incluye ES2023;
  la nota de MEMORY §4 sobre que `toSorted` no existe quedó obsoleta).

**Verificación:** pipeline completo en verde — backend (`cargo fmt --check`,
`cargo clippy --all-targets --all-features -- -D warnings`, `cargo test` 74) y
frontend (`tsc --noEmit`, `oxlint` 0 errores, `npm run design`, `npm run
routes`, `vite build`). **Prueba en vivo por HTTP** (modo web-only con DB
temporal): bootstrap → login → preferencias default y guardadas (fuente GRANDE,
zona UTC) → config empresa editada (nombre, zona, 15 días, sin aprobación,
stock default 4) → crear usuario → editar → cambiar password propia → login con
nueva → desactivar (login falla) → reactivar → reset por admin → login OK.

**Gaps / decisiones documentadas:**
- El efecto de `requiere_aprobacion` queda **expuesto y guardado** (la UI lo
  recibe en `PreferenciasResueltas`) pero la creación de movimientos no cambió
  su flujo actual (BORRADOR → enviar → aprobar sigue siendo el default); el
  parámetro es la base para que el formulario de movimiento ofrezca "crear y
  aprobar" cuando la política lo permita — pendiente de UI.
- El propio usuario **no** puede editar sus datos (nombre/email) desde
  `/perfil`: `editar_usuario` exige `usuario:editar` (solo ADMIN). La edición
  de perfil de terceros vive en `/usuarios/:id/editar`; el perfil propio es de
  solo lectura + preferencias + contraseña.
- `obtener_usuario` busca por id (como el resto de `obtener_*`), no por
  `nombre_usuario`.
- El mensaje "El código 'ana' ya existe" al crear un usuario con rol inexistente
  es un mapeo preexistente del `INSERT` (cualquier fallo de FK se reporta como
  duplicado); no se tocó por no estar en el alcance.

---

### Hito 16 — Reportes reales de stock, movimientos, precisión y auditoría (completo, sin commit)

Pedido del usuario: las tarjetas de `/reportes` "no llevan a ningún lado" —
cuatro de ellas enlazaban a páginas que no son reportes (Stock actual →
catálogo de productos, Movimientos → listado genérico, Precisión → listado de
sesiones, Auditoría → historial de comandos), y las rutas `/reportes/stock`,
`/reportes/movimientos`, `/reportes/precision`, `/reportes/auditoria` ya
estaban declaradas en `route-paths.ts` y en el mapa de rutas de DESIGN §5.4
pero **no tenían página** (caían en 404). Se construyeron las 4 páginas
faltantes:

- **`ReporteStockPage` (`/reportes/stock`)** — `listar_saldos` + catálogo de
  productos (`page_size: -1`): resumen (productos con stock, unidades totales,
  ubicaciones con stock), tabla agregada por producto (SKU enlazado, nombre,
  ubicaciones, lotes, unidades) y detalle por ubicación/lote con refs a cada
  entidad; búsqueda cliente por SKU/nombre. Filas clickeables al detalle del
  producto/ubicación.
- **`ReporteMovimientosPage` (`/reportes/movimientos`)** — motor universal de
  consulta: filtros por tipo, estado y rango de fechas (los `date` inputs se
  convierten a `fecha_movimiento:gte:...T00:00:00` / `lte:...T23:59:59` porque
  las fechas se guardan en RFC3339), **totales por tipo vía `group_by: "tipo"`
  del propio motor** (agregación real, no conteo del cliente) y tabla paginada
  enlazada al detalle de cada movimiento.
- **`ReportePrecisionPage` (`/reportes/precision`)** — sesiones `CERRADA`
  (filtro `estado:eq:CERRADA`, `page_size: -1`) y `precision_sesion` en
  paralelo por sesión: promedios por SKU/cantidad/ubicación + tabla con los
  tres porcentajes y enlace al detalle de la sesión. Nuevo mapa
  `TIPO_SESION_LABEL` en `format.ts`.
- **`ReporteAuditoriaPage` (`/reportes/auditoria`)** — `listar_historial` con
  filtros por usuario (selector real de usuarios), nivel, rango de fechas y
  comando; tabla con fecha, usuario (resuelto por nombre), comando/acción,
  entidad, nivel, resultado y duración. Cumple SPEC §16.2 "quién hizo qué,
  filtrable por usuario, acción, entidad, rango de fechas".
- Tarjetas de `ReportesPage` actualizadas para apuntar a los 4 reportes
  nuevos; `router.tsx` con las 4 rutas.

**Nota de contexto — conflicto de edición en paralelo:** el usuario estaba
trabajando a la vez en un módulo **Sucursales** (archivos `Sucursal*.tsx`,
`repo/sucursal.rs`, `repo/archivo.rs`, rutas en el router, enlace en el nav)
y su editor sobrescribió `router.tsx` varias veces durante la sesión, dejando
imports huérfanos y rutas faltantes (incluidas las de reportes). Se
restauraron los imports y las rutas afectadas (`zonas/nuevo`,
`racks/nuevo`, `secciones/nuevo`, las 4 de reportes) y se corrigió el único
error de typecheck del WIP ajeno (`SucursalDetallePage` usaba `ErrorPanel`
sin `children` — mismo error de API que el Hito 15 ya corrigió en otras
páginas; se añadió el texto de hijos). Si el usuario vuelve a guardar
`router.tsx` desde su editor, puede volver a pisar estas rutas.

**Verificación:** `tsc --noEmit` 0 errores, `oxlint` 0 errores en los
archivos del hito (se corrigieron `exhaustive-deps` derivando de
`query.data` en vez de arrays recién creados, y un `??` constante en el
conteo de grupos), DesignGuard OK (113 archivos), RouteGuard OK (35 rutas),
`vite build` OK. **Prueba en vivo por HTTP** contra el backend corriendo:
`listar_saldos`, `listar_movimientos` con `group_by: "tipo"` (respuesta
`groups: [{key, count}]`), `listar_sesiones_inventario` con filtro CERRADA y
`listar_historial` responden correctamente.

---

### Hito 17 — Módulo empresa ampliado: país/ubicación con mapa, fiscales, contacto, logo + documentos y entidad Sucursal (completo, sin commit)

Pedido del usuario: "falta poder registrar de qué país soy, detecte mi
ubicación, me sugiera ponerla para que diga aquí está mi sucursal, un mapa,
muchos más datos de la empresa, archivos, etc." Se consultaron 4 decisiones:
**todos los campos** (país/dirección, fiscales, contacto, coordenadas + logo),
**mapa embebido OpenStreetMap** (iframe, elección explícita del usuario pese
a ser un tercero), **logo + documentos adjuntos** y **múltiples sucursales**
(entidad propia, no solo la principal).

**Backend (Rust):**
- **Migración por columna** (nuevo en `db.rs`): `columna_existe` +
  `asegurar_columna` (PRAGMA table_info + ALTER TABLE ADD COLUMN). Las 12
  columnas nuevas de `configuracion_empresa` (país, ciudad, dirección, código
  postal, razón social, documento fiscal, dirección fiscal, teléfono, email
  contacto, sitio web, latitud, longitud) se agregan a dbs existentes **sin
  borrar `rustock.db`** — ya no hace falta el aviso de "borrar la db" para
  este cambio.
- **`domain/configuracion.rs`**: `ConfiguracionEmpresa`/`EditarConfiguracionEmpresa`
  ampliados (validación de coordenadas en rangos geográficos), `Sucursal`/
  `NuevaSucursal`/`EditarSucursal` (con `Default`), `ArchivoEmpresa`/
  `ArchivoEmpresaCompleto`/`NuevoArchivoEmpresa` + helpers base64 y límites
  (logo ≤ 2 MB, documento ≤ 10 MB). Crate `base64` 0.22.1 agregado a Cargo.toml.
- **`repo/sucursal.rs`** (nuevo): CRUD completo (listar/crear/obtener/editar/
  desactivar) con código único normalizado y coordenadas validadas. Se rige
  por `configuracion:ver/editar` (decisión documentada: no es un recurso de
  negocio del SPEC, es configuración).
- **`repo/archivo.rs`** (nuevo): subir (el LOGO reemplaza al anterior), listar
  metadatos (sin contenido), obtener con contenido en base64, obtener logo
  actual, eliminar. Bytes como BLOB en SQLite (self-hosted).
- **`commands.rs` + `server.rs`**: 10 comandos nuevos (listar/crear/obtener/
  editar/desactivar_sucursal, listar/subir/obtener/eliminar_archivo_empresa,
  obtener_logo_empresa) espejados en el dispatcher HTTP.
- **Tests**: +4 (78 en total): sucursal CRUD + rechazo de coordenadas fuera de
  rango + archivos logo/documento (reemplazo de logo, contenido base64,
  eliminar) + rechazo de base64 inválido y tamaño excesivo.

**Frontend (React):**
- **`ConfiguracionPage`** (reescrita completa): tarjetas de Datos de la empresa
  (país con lista de países en español, ciudad, dirección, código postal),
  Datos fiscales (razón social, documento fiscal RUC/NIT/RFC, dirección
  fiscal), Contacto (teléfono, email, sitio web), **Ubicación y mapa**
  (lat/long + botón "Detectar mi ubicación" con `navigator.geolocation` +
  **iframe de OpenStreetMap** embebido + enlace "Abrir en Google Maps"),
  Parámetros generales, Política de operación, **Logo** (subir/cambiar con
  previsualización) y **Documentos** (subir, listar con tamaño, ver, eliminar).
- **Sucursales**: `SucursalesPage` (listado), `SucursalFormPage` (nuevo/editar
  con detección de ubicación), `SucursalDetallePage` (datos + mapa OSM),
  `SucursalEliminarPage` (desactivar). Ruta `/sucursales` en el nav bajo
  "Administración".
- **`ArchivoVerPage`** (`/configuracion/archivos/:id/ver`): muestra imágenes/
  PDFs embebidos (data URL) y descarga con `<a download>` (ButtonLink no sirve
  para data URLs porque react-router lo trata como ruta interna).
- **iframe sandbox**: la regla `iframe-missing-sandbox` (deny) obliga a
  `sandbox` en los iframes; OSM usa `allow-scripts allow-popups` (no puede
  llevar `allow-same-origin` junto a `allow-scripts` según la regla).
- **Nota de concurrencia**: durante este hito el usuario editaba en paralelo
  su Hito 16 (reportes + forms de zona/rack/sección) y su editor sobrescribió
  `router.tsx` varias veces. Se integró su versión final (que ya traía las
  rutas de sucursales/archivo mías + las suyas de reportes) y se corrigieron
  los 5 errores de lint de los archivos nuevos (iframe sandbox + FileReader
  con addEventListener). Al final el router contiene ambas partes.

**Verificación:** pipeline completo en verde — backend (`cargo fmt --check`,
`cargo clippy --all-targets --all-features -- -D warnings`, `cargo test` 78) y
frontend (`tsc --noEmit`, `oxlint` 0 errores, `npm run design` 113 archivos,
`npm run routes` 35 rutas, `vite build`). **Prueba en vivo por HTTP** (modo
web-only con DB temporal): config con país/ciudad/razón social/RUC/coordenadas
guardada correctamente, crear sucursal con coordenadas + listar, subir logo y
documento (base64 correcto de ida y vuelta), obtener logo con contenido, y
sucursal con latitud 100 rechazada con error claro.

**Gaps / decisiones documentadas:**
- El mapa embebido (OSM) es un servicio externo (decisión explícita del
  usuario); el resto de la app sigue sin dependencias externas. En modo
  escritorio offline el iframe no carga.
- `obtener_logo_empresa`/`obtener_archivo_empresa` devuelven el contenido en
  base64 dentro del JSON — para archivos grandes (límite 10 MB) la respuesta
  puede pesar ~13 MB; aceptable para una app de un solo operador self-hosted.
- Las sucursales no participan del motor de consulta universal (query.rs):
  son un puñado de registros de configuración, no listados de negocio. Si
  crecen a decenas, se migran al motor.
- El logo subido se guarda en la db (BLOB), no en el sistema de archivos.

---

### Hito 18 — Mejoras a los reportes: exportación, filtros, reportes nuevos y gráficas (completo, sin commit)

Pedido del usuario: "mejora los reportes". Se le consultaron 5 direcciones y
eligió **todas**: exportación, más filtros en movimientos, reportes que
faltaban del mapa de rutas, mejor resumen de stock y visualización con
gráficas (CSS puro, sin librería pesada).

- **`src/shared/exportar.ts` (nuevo)** — utilidades de exportación (SPEC
  §15.8): `exportarCSV`/`exportarJSON`/`nombreExportacion`. CSV con `;` como
  separador + BOM UTF-8 (Excel es-ES/es-MX), escapado de comillas/saltos. Es
  solo serialización del resultado que ya devolvió Rust — cero lógica de
  negocio en el cliente.
- **`src/shared/ui/ExportButtons.tsx` (nuevo, exportado del barrel)** — dos
  botones (CSV/JSON) deshabilitados cuando no hay filas. Se usó en los 7
  reportes (stock, movimientos, entradas, salidas, mermas-ajustes, precisión,
  auditoría, usuarios).
- **`ReporteMovimientosPage`** — filtros nuevos: sub_tipo, usuario
  (`created_by`), proveedor, cliente, ubicación origen y ubicación destino
  (selects reales cargados con `page_size: -1`); **gráfica "movimientos por
  día"** (últimos 30 días, barras CSS puras) alimentada por una query
  adicional `page_size: -1` + `fields` (proyección ligera); export respetando
  los filtros. Totales por tipo siguen vía `group_by: "tipo"`.
- **`ReporteMovimientosTipoPage` (nuevo, parametrizado)** — una página
  reutilizable por config (`filtrosBase`, proveedor/cliente opcional) que
  genera **Entradas** (`/reportes/entradas`, tipo=ENTRADA + proveedor),
  **Salidas** (`/reportes/salidas`, tipo=SALIDA + cliente) y **Mermas y
  ajustes** (`/reportes/mermas-ajustes`,
  `sub_tipo:in:MERMA,AJUSTE_POSITIVO,AJUSTE_NEGATIVO`), con totales por
  sub_tipo (`group_by`) y export.
- **`ReporteUsuariosPage` (nuevo, `/reportes/usuarios`)** — desempeño por
  usuario con `group_by: "created_by"` del motor, filtros tipo/periodo y
  export (SPEC §16.2 "Nº de movimientos por usuario/periodo").
- **`ReporteStockPage`** — filtros por categoría y por **almacén** (el árbol
  físico se resuelve client-side: `almacenDeUbicacion` camina
  ubicación→sección→rack→zona→almacén cargando zonas/racks/secciones con
  `page_size: -1`); columnas de mínimo/máximo del producto con badge "Stock
  bajo" cuando `unidades <= stock_minimo`; export del detalle con
  SKU/categoría/ubicación/almacén/lote/cantidad.
- **`ReportePrecisionPage`** — gráfica de **evolución de precisión por SKU**
  (barras horizontales por sesión) + export.
- **`ReporteAuditoriaPage`** — filtro por entidad (cliente) + export.
- **CSS** — sección `.chart`/`.chart__col`/`.chart__bar` (columnas) y
  `.chart-row`/`.chart-row__track`/`.chart-row__fill` (barras horizontales)
  al final de `components.css`, con tokens de radio/paleta; las alturas/anchas
  porcentuales de las barras son datos dinámicos (inline style), no tokens.
- `route-paths.ts`: `reporteEntradas/Salidas/MermasAjustes/Usuarios`.
  `router.tsx`: 4 rutas nuevas (39 rutas declaradas). `ReportesPage`: 4
  tarjetas nuevas (10 en total). `format.ts`: mapa `SUB_TIPO_MOVIMIENTO_LABEL`.
- **Nota de contexto — repetición del conflicto de router**: el archivo
  `ReporteMovimientosTipoPage.tsx` recién creado apareció una vez con
  contenido duplicado (dos `filasExport`/mitad del componente duplicada,
  probablemente por el editor en paralelo del usuario); se reescribió limpio.
  Se corrigieron además los `exhaustive-deps` (derivar dentro de los `useMemo`
  desde `query.data` en vez de arrays recreados por render) y un `.sort()` →
  `.toSorted()` (regla deny de oxlint).

**Verificación:** `tsc --noEmit` 0 errores, `oxlint` 0 errores, DesignGuard OK
(117 archivos), RouteGuard OK (39 rutas), `vite build` OK. **Prueba en vivo
por HTTP** (backend web-only con DB temporal + seed, logueado como
`admin`/`Admin1234!`): `listar_movimientos` con `fields` + `page_size: -1` +
filtros (devuelve solo los campos proyectados), `group_by: "sub_tipo"` con
`sub_tipo:in:MERMA,AJUSTE_POSITIVO,AJUSTE_NEGATIVO`, `group_by: "created_by"`,
filtros `created_by:eq` + `fecha_movimiento:gte` y `proveedor_id:not_null`,
y `listar_zonas` con `page_size: -1` — todos responden correctamente.

### Hito 19 — UX de alertas: enlace a la causa raíz y semántica de "Resolver" (completo, sin commit)

El usuario reportó que marcar una alerta como "resuelta" no producía ningún
cambio visual. Diagnóstico (correcto por diseño del SPEC, mal comunicado por
la UI): `resolver_alerta` pone `estado = 'RESUELTA'`, pero el listado
(`listar_alertas`) recalcula `regenerar_alertas` en cada consulta y, si la
condición sigue activa (ej. stock 0 ≤ mínimo 98), la **reabre** (`upsert_alerta`
reabre todo lo que no sea `IGNORADA`). Según SPEC §17.2 la resolución real de
una alerta es la acción de negocio que elimina la causa, no el botón. Se le
consultó al usuario y eligió tres mejoras:

- **`src/shared/refs.tsx`** — nuevos `MovimientoRef` (etiqueta = `numero`,
  enlace `movimientoDetalle(id)`) y `SesionInventarioRef` (etiqueta = `numero`,
  enlace `sesionInventarioDetalle(id)`), mismo patrón que los refs de catálogo.
- **`src/pages/AlertasPage.tsx`** — la columna "Entidad" ahora enlaza a la
  página de detalle de la causa raíz (`AlertaEntidadRef`: producto → `/productos/:id`,
  lote → `/lotes/:id`, ubicación → `/ubicaciones/:id`, movimiento →
  `/movimientos/:id`, inventario → `/inventario/:id`); **se eliminó el botón
  "Resolver"** (daba falsa sensación de arreglo) quedando solo "Ignorar" (icono
  `anular`/XCircle por semántica canónica §6.13, antes usaba `cerrar`/Lock) con
  **toast explicativo** por tipo: "Alerta ignorada: quedará oculta aunque la
  condición siga activa. Para resolverla, registra una entrada o sube el stock
  mínimo del producto" (mapa `GUIA_RESOLUCION` con la acción real de §17.2 por
  cada tipo).
- **`src/shared/backend.ts`** — se eliminó `resolverAlerta` (código muerto tras
  quitar el botón). El comando Rust `resolver_alerta` permanece en la API
  (auditado, usado por tests) sin cambios.
- **Bug real corregido en `repo/alerta.rs::upsert_alerta`**: "Ignorar" no
  surtía efecto visual porque el recálculo (`regenerar_alertas`, que corre en
  cada `listar_alertas`) buscaba filas `estado != 'IGNORADA'` y, al no
  encontrar la ignorada, hacía `INSERT` de una fila **nueva** `ABIERTA` con
  otro UUID (la tabla no tiene UNIQUE en `(tipo, entidad, entidad_id)`). El
  test existente no lo detectaba porque listaba sin pasar por
  `regenerar_alertas`. Fix: `upsert_alerta` ahora consulta la clave sin
  filtrar por estado; si existe alguna fila `IGNORADA`, respeta la decisión
  del usuario (no reabre ni inserta) y de paso limpia duplicados que las
  versiones anteriores dejaron en dbs reales (conserva una sola fila ignorada
  por clave). El test `alertas_ignorar_no_se_muestra_como_abierta` se
  actualizó para recalcular tras ignorar y verificar que la alerta no
  reaparece como abierta ni se duplica (afirmación por `entidad_id`, no por
  `id`, que era lo que dejaba pasar el bug).
- **Ronda 2 de UX (frustración del usuario: "sigo sin entender el punto de las
  alertas si no me deja ignorar, archivar o borrar")**: se renombró la acción y
  el estado a **"Archivar" / "Archivada"** (el vocabulario del usuario; el
  estado interno sigue siendo `IGNORADA` en la API, solo cambian los labels de
  UI en `AlertasPage` y `format.ts::ESTADO_ALERTA_LABEL`), y el botón ahora
  **quita la fila de la lista al instante** (optimistic update del cache de
  react-query con `setQueryData` antes de invalidar), con toast claro de qué
  pasó y hacia dónde fue. El diagnóstico de fondo seguía siendo que el usuario
  corría el binario viejo (proceso de las 13:57 con un binario fix de las
  14:23) — el fix del backend solo actúa tras reiniciar la app.

**Verificación:** `tsc --noEmit` 0 errores, `oxlint` 0 errores, DesignGuard OK
(125 archivos), `vite build` OK; backend `cargo fmt --check`, `cargo clippy
--all-targets --all-features -- -D warnings` y `cargo test --lib` (84 tests)
en verde. **Requiere reiniciar `npm run tauri:web` / `tauri dev`** para que el
backend recompilado tome el fix; la próxima consulta a alertas limpia los
duplicados acumulados de la db existente.

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
| Identidad visual **"Rust & Iron"**: paleta de óxido + hierro oscuro | Rebranding completo (Hito 13); el nombre Rustock es Rust + Stock |
| **Temas configurables**: 6 paletas + modo oscuro, por usuario y global | Hito 21 — lógica de color en Rust (mapa de tokens), la UI solo aplica |
| **Cero modales**, una página por acción | DESIGN §5 — deep-linking obligatorio |
| `glob_matcher: doublestar` en lefthook | gobwas rompe `{ts,tsx}` |
| Versión en **3 archivos** sincronizados | VERSIONING §1 — solo con `release:*` |

---

## 4. Gotchas del entorno (no volver a tropezar)

- **Wrapper `snip`** en PATH: intercepta `npm` (algunos subcomandos devuelven
  solo `ok`) y puede distorsionar exit codes encadenados. Usar
  `/usr/bin/npm` o `node_modules/.bin/oxlint` directo si algo se ve raro.
- **`typescript-eslint` no se agrega jamás** — rechaza TS 7.0.2.
- **`toSorted` SÍ está disponible** (tsconfig `lib: ["ES2023", ...]`) y es
  obligatorio: oxlint marca `no-array-sort` (deny) y exige `toSorted` en vez
  de `.sort()` que muta. La nota vieja de que "no existe" quedó obsoleta
  cuando el lib se movió a ES2023.
- **lefthook** necesita `glob_matcher: doublestar` para `{ts,tsx}`.
- **npm install** de paquetes con postinstall requiere aprobar el script
  (`npm install-scripts approve <pkg>`).
- **Config de opencode no se recarga en caliente** — reiniciar opencode tras
  editar `opencode.json` o `.opencode/`.
- Los commits deben ser **Conventional Commits** (el hook commit-msg rechaza
  formatos inválidos con el ejemplo correcto).
- **El puerto de dev de Vite es 6821** (`vite.config.ts` `strictPort` +
  `tauri.conf.json` `devUrl`), no 1420. Hasta agosto 2026 AGENTS/STACK/MEMORY
  decían "1420" (documentación desactualizada, corregida). Además, 1420
  puede estar ocupado por **otro proyecto** (`aura` en esta máquina): si al
  abrir `http://localhost:1420` se ve una app que no es Rustock, es ese
  proyecto — Rustock siempre es `http://localhost:6821`. El backend HTTP de
  negocio escucha en `:1421` y solo existe dentro del proceso Tauri
  (`npm run tauri dev` / `cargo run`), no es un binario separado.
- **En entornos sin X/Wayland funcional (WSL, SSH puro, CI) `npm run tauri dev`
  se cuelga ANTES de `setup()`**: GTK/WebKit intenta crear la ventana nativa y
  el proceso queda bloqueado en `unix_wait_for_peer` (ni siquiera abre el
  backend `:1421`; en WSL el socket X de WSLg puede existir pero muerto, y
  `/tmp/.X11-unix` suele estar en un mount de solo lectura). La solución es
  **`npm run tauri:web`** (Hito 11): `RUSTOCK_WEB_ONLY=1` en `main.rs` salta a
  `run_web()` en `lib.rs`, que arranca solo SQLite + el servidor HTTP `:1421`
  **sin tocar GTK/WebKit**; `scripts/web.mjs` lanza vite (`:6821`) y `cargo
  run` con esa variable. Misma db (default `~/.local/share/com.rustock.app/
  rustock.db`, o `RUSTOCK_DB_PATH`) y misma lógica de negocio. `RUSTOCK_SEED=1`
  sigue funcionando. `RUSTOCK_HEADLESS` solo oculta la ventana ya creada — no
  sirve para evitar el cuelgue; para eso está el modo web.

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
8. Respetar DESIGN.md al 100%: cero modales, cero emojis, esquinas suaves
   (tokens de radio, nunca 0), paleta óxido "Rust & Iron" (solo tokens),
   Open Sans/JetBrains Mono, iconos lucide-react.

---

## 6. Trabajo en progreso

**Backend: completo (Hito 7, §2). Frontend: completo (Hito 8, §2, FE-1 a
FE-6). Datos de ejemplo listos (Hito 9, §2). Modo navegador real con
servidor HTTP local, completo (Hito 10, §2). Modo navegador sin ventana
(`npm run tauri:web`, sin GTK/WebKit), completo (Hito 11, §2). Logo sin
fondo + login con marca centrada + **landing público en la raíz `/`**
(dashboard movido a `/dashboard`), completo (Hito 14, §2, sin commit).
**Configuración de empresa + preferencias de usuario + gestión de usuarios
real**, completo (Hito 15, §2, sin commit). **Reportes reales de stock,
movimientos, precisión y auditoría** en `/reportes/*`, completo (Hito 16, §2,
sin commit). **Módulo empresa ampliado** (país/ubicación con mapa OSM,
fiscales, contacto, logo + documentos, entidad Sucursal), completo
(Hito 17, §2, sin commit). **Mejoras a los reportes**, completo (Hito 18, §2,
sin commit). **UX de alertas: enlace a la causa raíz + reemplazo de Resolver
por Ignorar + toast explicativo**, completo (Hito 19, §2, sin commit).
**Sección Ayuda completa** (índice + 19 guías de módulo + glosario de 40
términos, grupo nuevo del sidebar), completo (Hito 20, §2, sin commit).
**Temas configurables** (6 paletas predefinidas + modo claro/oscuro, global
de empresa y preferencia personal, logo teñido con el acento), completo
(Hito 21, §2, sin commit). **Sección Ayuda potenciada** (19 módulos con
contexto de negocio y errores comunes + 6 procesos de negocio SPEC §18 +
guía de primeros pasos, glosario de 46 términos con anclas, cruces
módulo↔glosario y búsqueda en el índice), completo (Hito 22, §2, sin commit).
**Command palette "Buscar en todo Rustock"** (Ctrl+K: páginas, acciones,
ayuda/glosario y datos en vivo vía el comando `buscar` de Rust con permisos
y relevancia; trigger en la topbar; recientes en localStorage), completo
(Hito 23, §2, sin commit). **Ampliación: la Ayuda completa se indexa por
contenido en el command palette** (26 guías + 46 términos del glosario con
keywords reales de `textoModulo`/`paraQueSirve`/`cuandoUsarlo`) **y se puede
desactivar desde Mi perfil** (preferencia `ayuda_en_palette`, migración por
columna en SQLite, test Rust actualizado), completo (ampliación Hito 23, §2,
sin commit). **Confirmación limpia al guardar/navegar** (ampliación Hito 23,
§2, sin commit): toast "Abriendo: <destino>" al navegar desde una guía de
Ayuda a una página de la app (`EnlaceAyuda` en el bloque `enlaces`; `Link`
ahora acepta `onClick`), toast "Abriendo guía de Ayuda: <título>" al abrir
una guía/glosario desde Ctrl+K, y toast descriptivo en Mi perfil al
activar/desactivar la ayuda en la búsqueda. **Tracking total / centro de
actividad** (Hito 25, §2, sin
commit): backend registra **todo** — cada comando (con módulo, proceso y
tenant derivados) y cada vista de página vía `registrar_vista` (ruta, módulo,
proceso, duración, hora/día local, metadatos y cliente); `/historial` es un
centro de actividad con KPIs, gráficas CSS puras, insights automáticos
(hora pico, módulo dominante, tendencia) y el registro completo paginado,
filtrable (usuario, tipo VISTA/COMANDO, módulo, resultado, rango) y
exportable; `ReporteAuditoriaPage` ampliado con los campos nuevos.
El WIP de gestión de usuarios
que traía el working tree en el Hito 14 quedó **resuelto**: el typecheck
global vuelve a estar en verde (el Hito 15 reescribió `ConfiguracionPage`,
`PerfilPage`, `preferencias.ts` y las páginas `Usuario*` con el API correcto
de Toast/ErrorPanel). El WIP paralelo del usuario (Hito 16: reportes + forms
de zona/rack/sección) quedó **integrado** con el módulo de sucursales
(Hito 17) en un solo `router.tsx` que contiene ambas partes — ver la nota de
concurrencia del Hito 17, §2: si el usuario vuelve a guardar `router.tsx`
desde su editor con una versión vieja, puede volver a pisar las rutas de
sucursales/reportes.

**Antes de correr la app real** (`npm run tauri dev`), recordar: si la base
de datos viene de antes de la Fase C del Hito 7 (o del Hito 10 si nunca
había arrancado bien), **borrar `rustock.db`** en
`~/.local/share/com.rustock.app/rustock.db` — el esquema del Hito 7 cambió
sin migración (árbol simplificado de ubicaciones). Desde el Hito 17 ya no
hace falta borrar la db por columnas nuevas: `configuracion_empresa` se
migra sola con `asegurar_columna` (ALTER TABLE), y las tablas nuevas
(`preferencias_usuario`, `sucursales`, `archivos_empresa`) se crean con
`CREATE TABLE IF NOT EXISTS` sobre cualquier db existente. Para explorar la
app con datos de ejemplo ya poblados: `RUSTOCK_SEED=1 npm run tauri dev` —
usuario `admin` / contraseña `Admin1234!`.

**Para probar en modo navegador desde cualquier entorno (incluido WSL/SSH
sin servidor X): `npm run tauri:web`** — lanza vite (`http://localhost:6821`)
y el backend Rust en modo web-only (API `127.0.0.1:1421`, sin ventana, sin
GTK) mediante `scripts/web.mjs` + `RUSTOCK_WEB_ONLY=1` (Hito 11). Misma db
que el modo escritorio. Con `RUSTOCK_SEED=1 npm run tauri:web` se obtienen
los datos de ejemplo (admin / `Admin1234!`).

> **Importante tras el Hito 23/24/25:** los comandos nuevos (`buscar`, `puedo`,
> `editar_movimiento`, `iniciar_sesion_inventario`, `editar_uom`,
> `desactivar_uom`, `registrar_vista`, `metricas_actividad`) solo existen en el
> binario recompilado. Si hay un backend
> dev corriendo con un binario anterior (puerto `:1421` ocupado por un proceso
> viejo), **reiniciar `npm run tauri:web` / `tauri dev`** antes de probarlos;
> el proceso viejo responde "comando desconocido: X".

**Siguiente trabajo sugerido, en orden de valor** (ninguno es urgente; el
sistema es funcional y conforme al SPEC tal como está):
1. **Probar la ventana nativa de escritorio en sí** (`npm run tauri dev` sin
   `RUSTOCK_HEADLESS`) y **los formularios de escritura** (crear movimiento,
   aprobar/anular, registrar conteo, crear/editar almacén o producto) — ver
   la lista completa de "pendiente de probar" al final del Hito 10, §2. Todo
   lo demás (lectura, navegación, una mutación simple) ya se verificó en
   vivo por HTTP.
2. **Completado en el Hito 24 (§2):** página de edición de movimientos
   (`/movimientos/:id/editar`) con backend (`editar_movimiento`).
3. **Completado en el Hito 12 (§2):** los formularios de creación/edición de
   las 6 entidades de catálogo que faltaban ya existen.
4. **Completado en el Hito 15 (§2):** la gestión de usuarios real reemplazó
   el placeholder de `/usuarios` (listado, detalle, nuevo, editar,
   desactivar/reactivar, reset de contraseña por admin).
5. **Completado en el Hito 24 (§2):** `requiere_aprobacion` conectado al
   flujo de creación ("crear y aprobar de inmediato", vía comando `puedo`).
6. **Completado en el Hito 24 (§2):** puerto HTTP configurable
   (`RUSTOCK_HTTP_PORT` / `VITE_RUSTOCK_API`). Queda sin hacer, si algún día
   se pide explícitamente: exponer el servidor a la LAN (hoy solo
   `127.0.0.1` a propósito) — requeriría decidir HTTPS/autenticación
   reforzada primero.

Gaps conocidos del backend (Hito 24, resueltos): unicidad de código por
almacén completo, `comentario:eliminar` a GERENTE, traslado inter-almacén
atómico y mensajes específicos de usuario (rol inexistente). Queda
documentado que `cargo build --release` compila en este entorno pero el
empaquetado deb/rpm **no** (faltan `dpkg-deb`/`rpmbuild`): correr
`npm run tauri build` en una máquina con esas herramientas.

Gaps conocidos del frontend (Hito 24, resueltos): Zona/Rack/Sección/Caja con
CRUD completo + árbol físico en el detalle de Almacén; UOM editable y
desactivable; edición de movimientos; comando `iniciar_sesion_inventario`
(PLANEADA → EN_CURSO).

Gaps conocidos del modo navegador (Hito 10, ver detalle completo en §2):
sesión única compartida entre navegador y ventana nativa (sin tokens, por
diseño de "un solo operador"); puerto HTTP ahora configurable
(`RUSTOCK_HTTP_PORT`); sin soporte para acceso desde otros dispositivos de la
LAN.

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
