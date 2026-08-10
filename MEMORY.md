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
| **Fase del roadmap** | Backend: en curso un plan propio de 7 sub-fases (A-G) para cerrar el SPEC completo en `src-tauri/` — ver plan guardado en `~/.claude/plans/vivid-scribbling-cook.md`. A, B, C completas y verificadas; D en curso (ver §6) |
| **Backend Rust** | Autenticación real (argon2 + sesión), motor de consulta universal (SPEC §15), CRUD completo de catálogos (editar/desactivar en todas las entidades), árbol de ubicación simplificado, restricción de caja, código de barras, FIFO/FEFO (sugerencia) en curso. 38 tests pasan, clippy y fmt limpios |
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

**Fase D — Movimientos, SPEC §6-10 (en curso)**
- Hecho: permiso `configuracion:ejecutar` exigido además de `movimiento:crear`
  para `sub_tipo = INICIAL` (SPEC §7.5).
- Hecho: `repo::movimiento::sugerir_lineas_salida` (FEFO/FIFO/stock general
  según SPEC §8.6), con `#[allow(dead_code)]` porque **todavía no está
  conectada a un comando Tauri ni tiene tests** — eso es lo primero que falta
  al retomar.
- Pendiente: exponer `sugerir_lineas_salida` como comando (`sugerir_lineas_
  salida`, gateado por `movimiento:ver`, `excluir_vencidos` decidido por el
  `sub_tipo` que planea usar el caller — CLIENTE/DEVOLUCION_PROVEEDOR ⇒
  `true`); tests de FEFO vs FIFO vs sin-lote y de "excluir vencidos".
- Pendiente: traslado inter-almacén (SPEC §9.3) — diseño ya pensado pero sin
  escribir: nuevo `NuevoTraslado`/`crear_traslado` en `repo/movimiento.rs`
  que, si `resolver_almacen_id_de_ubicacion(origen) != resolver_almacen_id_de_
  ubicacion(destino)`, crea **dos** `Movimiento` ligados (`SALIDA`/
  `TRASLADO_SALIDA` en origen + `ENTRADA`/`TRASLADO_ENTRADA` en destino)
  compartiendo `documento_referencia` (autogenerado si no se da); si es el
  mismo almacén, se comporta como hoy (un solo `TRASLADO`). Sin tocar la
  ruta actual de un solo movimiento (usada y testeada).
- Pendiente tras eso: cerrar Fase D con el pipeline completo, luego Fases
  E (comentarios, SPEC §12), F (trazabilidad §13.4 + alertas §17 + reportes/
  KPIs §16) y G (bloqueo de ajustes durante sesión de inventario `EN_CURSO`,
  pase final del pipeline, actualizar ROADMAP.md).

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

**Dónde retomar (Fase D del Hito 7, ver §2):**

1. Conectar `repo::movimiento::sugerir_lineas_salida` (ya escrita, con
   `#[allow(dead_code)]` en `repo/movimiento.rs`) a un comando Tauri nuevo +
   registrarlo en `commands::handler()` + tests (FEFO, FIFO, sin lote,
   `excluir_vencidos`). Quitar los `#[allow(dead_code)]` al conectarla.
2. Implementar el traslado inter-almacén (SPEC §9.3) — diseño detallado en
   §2/Hito 7/Fase D. No tocar el `TRASLADO` de un solo movimiento existente
   (intra-almacén), que sigue siendo el camino por defecto y ya está
   testeado.
3. Cerrar Fase D: `cargo fmt --all --check && cargo clippy --all-targets
   --all-features -- -D warnings && cargo test` en verde dentro de
   `src-tauri/`.
4. Seguir con Fases E (comentarios §12), F (trazabilidad §13.4 + alertas §17
   + reportes/KPIs §16) y G (endurecimiento final) — todas detalladas en el
   plan `~/.claude/plans/vivid-scribbling-cook.md`.

**Importante para quien retome:** la base de datos de desarrollo
(`rustock.db`) debe borrarse antes de correr la app — el esquema de
`ubicaciones` cambió en la Fase C (columnas nuevas + `CHECK`) y no hay
migración automática, solo `CREATE TABLE IF NOT EXISTS`.

No hay cambios de frontend (`src/`) pendientes de este trabajo: el plan
decidió explícitamente no tocar `src/` porque no depende de los comandos que
cambiaron (verificado por grep antes de empezar).

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
