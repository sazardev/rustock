# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Read AGENTS.md first

This repo has a comprehensive `AGENTS.md` at the root — read it before doing anything. It covers commands, git hooks, versioning, toolchain quirks, and environment gotchas in detail; this file only adds a quick-reference and backend structure notes that complement it. Do not duplicate effort: if AGENTS.md and this file ever disagree, AGENTS.md wins (it's the actively maintained instructions file for both Claude Code and opencode).

Also read, in order, before writing UI/data behavior:
- `SPEC.md` — business logic (entities, movements, stock rules, inventory, roles, universal query standard).
- `DESIGN.md` — UI design system (non-negotiable rules: no modals, no emojis, Lucide-only icons, Rust color palette, deep-linking).
- `STACK.md` — declared tech stack and performance rules (business logic lives in Rust; frontend never processes business data).
- `ROADMAP.md` — phased implementation order; don't implement ahead of the current phase.

## Essential commands

```bash
npm run dev            # Vite dev server (port 6821, strictPort)
npm run build           # tsc --noEmit + vite build -> dist/
npm run typecheck       # tsc --noEmit only
npm run lint            # oxlint src
npm run design          # scripts/design-guard.mjs — DESIGN.md compliance gate
npm run tauri:web       # web mode without a GTK window: vite (6821) + Rust backend HTTP server (:1421)
cargo check             # from src-tauri/ — Rust check only
cargo clippy --all-targets --all-features -- -D warnings   # from src-tauri/
cargo test              # from src-tauri/ — runs src-tauri/src/tests.rs
```

There is no JS test framework configured. Rust tests live in `src-tauri/src/tests.rs`.

**Use `npm run tauri:web` in this environment**, not `npm run tauri dev` — this sandbox has no working X/Wayland display, so the desktop window hangs before `setup()` runs. `tauri:web` sets `RUSTOCK_WEB_ONLY=1` and serves the same SQLite-backed business logic over HTTP on `:1421` with Vite on `:6821`, no GTK involved.

Never bypass lefthook hooks (`--no-verify`, `--no-gpg-sign`) or `cargo`/`oxlint` failures — fix the underlying issue. Commit messages must be Conventional Commits (enforced by `commit-msg` hook via `scripts/check-commit.mjs`).

## Architecture

**Two deployment faces, one backend.** `src-tauri/src/lib.rs::run()` boots a Tauri desktop window (IPC via `tauri::generate_handler!`) *and* an HTTP server (`src-tauri/src/server.rs`, `127.0.0.1:1421`) exposing the same command logic — so the identical business logic serves both the desktop shell and a plain browser (`RUSTOCK_HEADLESS=1` hides the native window; `RUSTOCK_WEB_ONLY=1` / `npm run tauri:web` skips GTK entirely). Both faces share one `DbState` (SQLite via `rusqlite`) and one `SesionState`.

**Backend module layout** (`src-tauri/src/`):
- `domain/` — business types and rules per area (`movimiento`, `inventario`, `catalogo`, `seguridad`, `alerta`, `configuracion`, `sesion`, `tema`). This is where SPEC.md rules (stock math, FIFO/FEFO, validations) get encoded.
- `repo/` — SQLite data access per area, mirroring `domain/`'s split, plus `reporte`, `auditoria`, `trazabilidad`, `archivo`, `comentario`, `sucursal`.
- `commands.rs` — Tauri command handlers (the IPC surface); thin wrappers over `domain`/`repo`.
- `query.rs` — the universal query standard (SPEC §15): shared filter/sort/search/paginate logic used by all listing endpoints.
- `security.rs` / `sesion.rs` — auth, roles, session state.
- `db.rs` — `DbState`, connection setup, migrations.
- `seed.rs` (debug-only) — sample data seeding, gated by `RUSTOCK_SEED=1`.
- Frontend never touches SQLite directly; all data access is through Tauri commands or the HTTP server, both backed by the same `domain`/`repo` code.

**Frontend layout** (`src/`):
- Entry: `src/main.tsx` → `src/App.tsx` (mounts `RouterProvider` + `ToastProvider`).
- Routing: `react-router` 8 (not `react-router-dom`). Shell layout in `src/app/AppLayout.tsx`, routes in `src/app/router.tsx`, nav groups in `src/app/nav.ts`. Every action (view/create/edit/delete/approve/cancel) is its own route under `src/pages/` — DESIGN.md forbids modals, so this is structural, not a style choice.
- Shared UI library: `src/shared/ui/` (barrel `index.ts`) — every component declared in DESIGN.md lives here (`Icon`, `Button`, `Field`/`Input`/`Select`, `Table`, `Pagination`, `AppShell`/`Topbar`/`Sidebar`, etc.). Components consume classes from `src/styles/*.css`; never hardcode design tokens in JSX.
- `src/shared/` also holds cross-cutting concerns: `api.ts`/`backend.ts` (talking to the Rust backend), `session.ts`, `types.ts`, `format.ts`, `atajos.ts` (keyboard shortcuts), `tema.ts` (theme).
- CSS: `src/styles/index.css` is the entry; cascade order is tokens → reset → base → utilities → layout → components → responsive. Pure CSS, no framework — see DESIGN.md for the non-negotiable constraints (border-radius via tokens only, Rust color palette, Open Sans + JetBrains Mono only, Lucide icons only).

## Key toolchain constraints

- TypeScript **7.0.2** is pinned (Go-native compiler). `erasableSyntaxOnly: true` — no enums, no namespaces, no parameter properties, no legacy decorators. `verbatimModuleSyntax: true` — type-only imports must use `import type`.
- Linter is **oxlint + oxlint-tsgolint** (TS7-compatible); `typescript-eslint` is intentionally not used (its peer dep rejects TS 7).
- Rust edition 2024; release profile uses `lto`, `codegen-units=1`, `panic="abort"`, `strip` — first build after touching `Cargo.toml` is slow.
- Version is synced across `package.json`, `src-tauri/Cargo.toml`, `src-tauri/tauri.conf.json` — never hand-edit them individually; use `npm run release:patch|minor|major`.
