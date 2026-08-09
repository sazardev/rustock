# MEMORY.md — Rustock

> **Memoria persistente del proyecto para el agente.**
> Este documento es el punto de partida de cada sesión: resume el estado actual,
> las decisiones tomadas (y por qué), el historial versionado de lo que se ha
> hecho, y el trabajo en progreso. Se actualiza en cada hito.

---

## 1. Estado actual (snapshot)

| Campo | Valor |
|---|---|
| **Versión activa** | `0.1.0` (sincronizada en package.json, Cargo.toml, tauri.conf.json) |
| **Último tag** | `v0.1.0` |
| **Fase del roadmap** | Fase 0 — Fundación ✅ · Fase 1 (capa de datos SQLite) ✅ implementada · Fase 2 (catálogos CRUD completo) ⏳ siguiente |
| **Backend Rust** | Capa de datos completa: esquema SQLite, repositorios, movimientos, inventario, permisos. 12 tests pasan, clippy y fmt limpios |
| **Pipeline de calidad** | Activo: pre-commit, pre-push, commit-msg (lefthook) |
| **Guardas de opencode** | Activas: agente `rustock`, `/verify`, `/feature`, `/fix` |
| **Repo** | Git en `main`, limpio salvo 2 archivos en progreso (ver §6) |

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

## 6. Trabajo en progreso (pendiente de revisión/commit)

> Cambios del usuario fuera del flujo del agente; no commiteados aún.

- `src/shared/ui/Chrome.tsx` — Sidebar: añade prop `onNavigate` (cierre de nav
  móvil al hacer clic).
- `src/shared/ui/Table.tsx` — modificado (no revisado aún).
- `src/styles/*` — ajustes de tokens/layout del usuario.

**Siguiente hito recomendado:** Fase 2 del ROADMAP (CRUD completo de catálogos
con la UI por página), que correspondería a la **v0.3.0**.

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
