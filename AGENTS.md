# AGENTS.md

**Rustock** — self-hosted mini-WMS (warehouse) desktop app. React 19 + Vite 8 (Rolldown) + TypeScript 7 + CSS puro modular (`src/styles/`), backend Tauri v2 + Rust (edition 2024) + SQLite (`rusqlite` bundled) in `src-tauri/`. UI kit in `src/shared/ui/` (tokens only, no Tailwind).

## Read first (source of truth)

`SPEC.md` (business logic) → `DESIGN.md` (UI, non-negotiable) → `STACK.md` (perf/stack) → `ROADMAP.md` (phase order) → `VERSIONING.md` (SemVer + Conventional Commits) → `MEMORY.md` (session state, update at milestones). If docs conflict with code/config, trust executable source.

Key DESIGN constraints (enforced by `scripts/design-guard.mjs`):
- `border-radius` only `var(--radius-sm/md/lg/xl/full)`; `box-shadow` only `var(--shadow-*)`; zero `0` or literals forbidden. No `backdrop-filter: blur` outside `layout.css` topbar, no gradients, no `filter:blur`.
- Zero modals/popovers/drawers/`alert/confirm/prompt` — every action is a page with deep link (`/recursos/:id/eliminar`).
- Zero emojis. Icons only `lucide-react` via `src/shared/ui/Icon.tsx` (49 canonical names, DESIGN §6.13 + 7 chrome/mapa).
- Fonts only `Geist Sans` (UI) + `Geist Mono` (data) via `tokens.css:64`; fallbacks `Inter/JetBrains Mono/SFMono`. No literal `font-family`.
- Colors only tokens (`--color-*`); `ink` only sidebar, `blue` (rust) only accent. No hex/rgba literals outside `tokens.css`.
- Copy professional Spanish.

## Commands

```bash
npm run dev            # Vite 6821 strictPort
npm run dev:web        # one-shot: clean ports + seed/reset/tmpdb (scripts/dev.sh)
npm run tauri:web      # web w/o GTK: vite 6821 + Rust HTTP :1421 (RUSTOCK_WEB_ONLY=1)
npm run build          # tsc --noEmit + vite build
npm run typecheck      # tsc --noEmit
npm run lint           # oxlint src
npm run format         # prettier --write src/**/*.{ts,tsx,css}
npm run design         # design-guard
npm run routes         # route-guard
npm run audit          # audit.mjs
npm run verify         # typecheck + lint + design + routes + audit + build
npm run verify:full    # + cargo fmt --check + clippy -D warnings + cargo check
cargo check --manifest-path src-tauri/Cargo.toml
cargo clippy --all-targets --all-features --manifest-path src-tauri/Cargo.toml -- -D warnings
cargo test --manifest-path src-tauri/Cargo.toml  # 116 tests in src-tauri/src/tests.rs
```

Env for backend: `RUSTOCK_SEED=1` (seed, debug only), `RUSTOCK_WEB_ONLY=1`, `RUSTOCK_DB_PATH`, `RUSTOCK_HTTP_PORT` (default 1421, `VITE_RUSTOCK_API` for frontend). DB at `~/.local/share/com.rustock.app/rustock.db` (or `XDG_DATA_HOME`).

## Architecture

- Entry: `src/main.tsx` → `src/App.tsx` (`RouterProvider` + `ToastProvider`). CSS `src/styles/index.css` order: tokens → reset → base → utilities → layout → components → responsive.
- Router: `react-router` 8 (not `react-router-dom`). Shell `src/app/AppLayout.tsx`, routes `src/app/router.tsx`, nav `src/app/nav.ts`, pages `src/pages/` (`PageHeader` + content, one task per page). `src/app/route-paths.ts` centralizes `PATH`.
- UI kit `src/shared/ui/` barrel `index.ts` — `Icon` (canonical map), `Button`, `Field`/`Input`/`Select`, `Table` (virtualized >80 rows via `@tanstack/react-virtual`), `AppShell`/`Topbar`/`Sidebar`/`Brand`/`Breadcrumbs`, `Toast`, etc. All styles via `src/styles/*.css` classes, never hardcoded tokens in JSX.
- Shared `src/shared/`: `api.ts`/`backend.ts` (Tauri `invoke` + HTTP `fetch` fallback), `types.ts` (snake_case mirrors Rust serde), `session.ts`/`preferencias.ts`/`tema.ts` (zustand), `format.ts`, `seo.tsx`.
- Backend crate `rustock_lib` (`src-tauri/src/lib.rs` `run()` + `run_web()`, `src-tauri/src/main.rs` calls it). `tauri::generate_handler!` registers commands. `server.rs` HTTP `127.0.0.1:1421` (`tiny_http`) mirrors every Tauri command (same `domain`/`repo`).
- `src-tauri/src/`: `domain/` (types/rules), `repo/` (SQLite access), `commands.rs` (thin IPC), `query.rs` (universal SPEC §15), `db.rs` (`DbState`, `asegurar_columna` migrations, `saldos` materialized), `security.rs`/`sesion.rs`, `seed.rs` (debug).
- Data flow: Frontend never touches SQLite; all via Rust commands → `repo` → SQLite (`rusqlite` bundled, WAL, `CHECK cantidad>=0`). Frontend caches via `@tanstack/react-query` + `zustand` for UI only.
- Build: `tauri.conf.json` `devUrl http://localhost:6821`, `dist` frontend, `capabilities/default.json`, targets `deb,rpm` only (AppImage disabled — `linuxdeploy` broken).

## Hooks & versioning — never bypass

`lefthook.yml` (`glob_matcher: doublestar`, `npm run hooks` to reinstall). `--no-verify` forbidden.

- `pre-commit` (parallel, staged): `prettier --write` + `oxlint` (staged TS), `design-guard` + `route-guard` (staged), `cargo fmt --check` + `cargo clippy -D warnings` (staged rs).
- `pre-push` (sequential): `typecheck`, `build`, `oxlint src`, `design-guard`, `route-guard`, `cargo fmt --all --check`, `cargo clippy --all-targets --all-features -- -D warnings`, `cargo check --all-targets`.
- `commit-msg`: `scripts/check-commit.mjs` — Conventional Commits `feat|fix|perf|refactor|docs|test|build|ci|chore|revert|style|wip`. Ex `feat(movimientos): agrega traslados`.

### CI (GitHub Actions)

`.github/workflows/ci.yml` runs on push to `main`, on `v*` tags and on PRs, in two jobs: **frontend** (`npm ci` → `npm run verify` → `npm run format:check`) and **backend** (`cargo fmt --check`, `cargo clippy -D warnings`, `cargo test`, with the GTK/WebKit headers Tauri needs to compile). It deliberately calls the same commands as lefthook rather than restating the list — if CI and local ever disagree, that divergence is itself the bug.

Version in 3 places synced: `package.json` + `src-tauri/Cargo.toml` + `src-tauri/tauri.conf.json`. Use `npm run release:patch|minor|major` (`scripts/release.mjs`), never hand-edit. `git-cliff` (`cliff.toml`) → `CHANGELOG.md`.

## Toolchain quirks

- TypeScript `7.0.2` pinned (Go compiler), `erasableSyntaxOnly:true` (no enums/namespaces/parameter properties/decorators), `verbatimModuleSyntax:true` (`import type` required), `lib: ES2023` (so `toSorted` is available, required by `no-array-sort` deny).
- `typescript-eslint` not used (rejects TS7, peer `<6.1.0`); linter is `oxlint` + `oxlint-tsgolint`.
- Rust `edition 2024`, release `lto=1, codegen-units=1, panic=abort, strip`. First `cargo check` after `Cargo.toml` edit is slow.
- Vite 8 Rolldown, `minify: esbuild` needs `esbuild` devDep (already `allowScripts`). `manualChunks` is a function in `vite.config.ts` (Rolldown expects function, not object). `chunkSizeWarningLimit: 1000` (three chunk 914KB).
- `src-tauri/gen/schemas/` is generated (gitignored).

## Gotchas

- `snip` wrapper on `PATH` swallows `npm view` output (`ok`) and distorts exit codes when chained. Use `/usr/bin/npm` or `node_modules/.bin/oxlint` for version checks.
- `dist/` and `src-tauri/target/` are gitignored build artifacts.
- WSL/SSH/CI with no X/Wayland: `npm run tauri dev` hangs at `unix_wait_for_peer` before `setup()` (never opens `:1421`). Use `npm run tauri:web` or `npm run dev:web`.
- `pkill -f 'tauri:web'` kills itself (pattern matches own cmdline). Kill by port via `ss`+`rg` as `scripts/dev.sh --stop` does.
- DB migrations are `CREATE TABLE IF NOT EXISTS` + `asegurar_columna` (`ALTER TABLE ADD COLUMN` if `PRAGMA table_info` missing) + `UPDATE` backfill — never delete `rustock.db` for new columns (only for pre-Hito7 tree changes). `saldos` has `CHECK cantidad>=0`; origin decrements use `UPDATE ... SET cantidad=cantidad - ?` not `INSERT -? ON CONFLICT`.
- Opencode config (`opencode.json` + `.opencode/`) not hot-reloaded — restart opencode after editing.

## opencode

`opencode.json` loads `AGENTS.md,SPEC.md,DESIGN.md,STACK.md,MEMORY.md` as instructions, `default_agent: rustock`, all bash/tools allowed. Agents: `rustock` (primary), commands `verify`/`feature`/`fix` in `.opencode/command/`. Skills in `.agents/skills/` (mirrored `.claude/skills/`): `tauri-v2`, `react-best-practices`, `tailwind-css-patterns`, `frontend-design`, `typescript-advanced-types`, `accessibility`.
