# AGENTS.md

## What this is

**Rustock** — a self-hosted warehouse/inventory management (mini-WMS) desktop app. Frontend is React + a custom modular CSS design system in `src/` (no Tailwind), backend is a Tauri v2 Rust shell in `src-tauri/`. UI component library lives in `src/shared/ui/`. No business logic / data layer / router yet — see `ROADMAP.md` for the implementation order.

## Source-of-truth docs (READ FIRST)

- `SPEC.md` — complete business logic (entities, movements, stock rules, inventory, roles, universal query standard). Write UI/data behavior against this.
- `DESIGN.md` — complete UI design system. Its rules are **non-negotiable** and easy to violate by default.
- `STACK.md` — declared tech stack and performance rules (logic in Rust, SQLite/rusqlite, indexed queries, no unneeded deps).
- `ROADMAP.md` — phased implementation order derived from SPEC. Work phases in order; don't jump ahead.
- `VERSIONING.md` — SemVer policy, Conventional Commits, release flow, version→phase map. The `commit-msg` hook enforces commit format; never bypass it.
- `MEMORY.md` — session memory: current state, decision log, environment gotchas, work-in-progress. Read it first thing in a session, update it at each milestone.

Key DESIGN.md constraints (all enforced):
- Soft corners: `border-radius` only via tokens `--radius-sm/md/lg/xl/full`; never `0` nor literal values.
- **Zero modals** — no dialogs/drawers/popovers/confirmations. Every action (view/create/edit/delete/approve/cancel) is a separate page with its own deep link, e.g. `/recursos/:id/eliminar`.
- **Zero emojis** anywhere in the UI.
- Icons: only **Lucide** (`lucide-react`), fixed canonical mapping per action (§6.13) + 7 iconos de chrome/mapa (`menu`, `cerrarPanel`, `subir`/`bajar`, `pantallaCompleta`/`salirPantallaCompleta`, `cuadricula`, `encuadrar`) documentados en DESIGN §6.13.
- Fonts: **Geist Sans** (UI) + **Geist Mono** (datos/códigos) — pareja oficial de DESIGN §3.2 (`tokens.css:64`); fallbacks `Inter` / `JetBrains Mono` / `SFMono` incluidos en tokens. (AGENTS decía `Open Sans`; sincronizado con DESIGN).
- Rust palette ("Rust & Iron"): warm neutrals + iron-dark navigation surfaces + single rust accent (oxide) from §3. No colors outside the declared palette.
- UI copy is professional Spanish, never casual.
- Brand: `LogoMark` (`src/shared/ui/LogoMark.tsx`), a flat warehouse box in rust tones without background — also the favicon (`public/rustock.svg`).

## Commands

```bash
npm run dev            # Vite dev server (port 6821, strictPort)
npm run build          # typecheck (tsc --noEmit) + vite build -> dist/
npm run typecheck      # tsc --noEmit only
npm run lint           # oxlint src (Rust-native linter, TS7-compatible)
npm run lint:fix       # oxlint --fix src
npm run format         # prettier --write src/**/*.{ts,tsx,css}
npm run format:check   # prettier --check
npm run design         # scripts/design-guard.mjs — DESIGN.md compliance gate
npm run tauri dev      # run the desktop app in dev mode (spawns vite on 6821)
npm run tauri:web      # web mode sin ventana: vite (6821) + backend Rust sin GTK (API :1421)
npm run dev:web        # arranque en un solo comando (scripts/dev.sh): limpia puertos, opciones --seed/--reset/--tmpdb/--stop
npm run tauri build    # release: frontend build + cargo release + bundling
cargo check            # Rust check only (from src-tauri/)
```

- Verification order: `npm run typecheck` + `npm run lint` (frontend) and `cargo check` + `cargo clippy` (backend). No test framework is configured yet.
- `npm run tauri build` runs `beforeBuildCommand: npm run build` automatically; run `npm run build` separately if you only want the frontend.

## Git hooks (lefthook) — DISCIPLINE: never bypass

Hooks are installed via `lefthook.yml` (`npm run hooks` to re-install). `--no-verify` / `--no-gpg-sign` are forbidden. If a hook fails, fix the code — do not skip.

- **pre-commit** (fast, parallel, only staged files): prettier --write + oxlint on staged TS, DesignGuard on staged CSS/TS, `cargo fmt --check` + `cargo clippy -D warnings` on staged `.rs`.
- **pre-push** (full, sequential): `npm run typecheck`, `npm run build`, `npx oxlint src`, DesignGuard, `cargo fmt --all --check`, `cargo clippy --all-targets --all-features -- -D warnings`, `cargo check --all-targets`.
- **commit-msg**: validates Conventional Commits format via `scripts/check-commit.mjs`. Allowed types: feat, fix, perf, refactor, docs, test, build, ci, chore, revert, style, wip. Example: `feat(movimientos): agrega traslados`.

## Versioning (SemVer + git-cliff)

- Version lives in 3 places that must stay in sync: `package.json`, `src-tauri/Cargo.toml`, `src-tauri/tauri.conf.json`. Never edit them separately — use `npm run release:patch|minor|major` (or `node scripts/release.mjs <X.Y.Z> --tag`).
- Releases: sync versions → regenerate `CHANGELOG.md` via git-cliff (`cliff.toml`) → commit `chore(release): prepare for X.Y.Z` → annotated tag `vX.Y.Z`.
- `npm run changelog` regenerates CHANGELOG.md; `npm run changelog:unreleased` previews pending changes.
- Full policy + version→phase map in `VERSIONING.md`. Do not jump ahead of the roadmap's current phase.

Custom gates that run in both hooks:
- **`scripts/design-guard.mjs`** — blocks code violating DESIGN.md: zero emojis, zero border-radius>0, zero box-shadow/gradients/blur, zero colores literales fuera de tokens, no `alert/confirm/prompt`, fuentes solo Geist Sans/Mono (+ fallbacks declarados), iconos solo desde `lucide-react` vía `Icon.tsx`.
- **oxlint** — configured in `.oxlintrc.json`; requires TS 7 (uses `oxlint-tsgolint`). Lint errors (`deny`) block; style warnings do not.
- **Prettier** — `.prettierrc` (semi, double quotes, trailing comma all, printWidth 100). Markdown files are ignored via `.prettierignore`.

## Architecture

- Frontend entry: `src/main.tsx` -> `src/App.tsx` (monta `RouterProvider` + `ToastProvider`). CSS entry: `src/styles/index.css` (CSS puro modular; orden de cascade: tokens -> reset -> base -> utilities -> layout -> components -> responsive). Sin frameworks de CSS.
- Navegación: **react-router 8** (`react-router`, no `react-router-dom`). Layout del shell en `src/app/AppLayout.tsx` (AppShell + Topbar + Sidebar), rutas en `src/app/router.tsx`, grupos de navegación en `src/app/nav.ts`. Páginas en `src/pages/` (patrón: PageHeader + contenido). Deep-linking obligatorio (DESIGN §5); cada acción es una ruta propia.
- Librería UI compartida: `src/shared/ui/` (barrel `index.ts`). Todo componente declarado en DESIGN.md vive aquí: `Icon` (mapa canónico §6.13), `Button`, `ButtonLink`, `Link`, `Field`/`Input`/`Select`/`Textarea`/`Checkbox`/`Radio`, `Table`, `Pagination`, `Badge`, `Card`, `PageHeader`, `EmptyState`, `Skeleton`, `DetailList`, `ToastProvider`/`useToast`, `ErrorPanel`, `AppShell`/`Topbar`/`Sidebar`/`Brand`/`Breadcrumbs`, `Search`/`FilterBar`. Los componentes de navegación (`Link`, `ButtonLink`, `Sidebar`, `Brand`, `Breadcrumbs`) usan `react-router` internamente. Los componentes consumen las clases de `src/styles/*.css`; nunca se hardcodean tokens en JSX.
- Backend: `src-tauri/src/lib.rs` (app builder + command registration via `tauri::generate_handler!`) and `src-tauri/src/main.rs` (calls `rustock_lib::run()`). Crate is named **`rustock_lib`** — the name matters for imports and mobile build.
- Tauri config: `src-tauri/tauri.conf.json`. Frontend served from `../dist`; dev URL `http://localhost:6821`.
- Capabilities/permissions: `src-tauri/capabilities/default.json` (add plugin permissions there).

## Toolchain quirks

- **TypeScript 7.0.2** is pinned exactly (Go-native compiler). With `erasableSyntaxOnly: true` in tsconfig: **no TS enums, no namespaces, no parameter properties, no legacy decorators**. `verbatimModuleSyntax: true`: type-only imports must use `import type`.
- Rust **edition 2024**; release profile is fully optimized (`lto`, `codegen-units=1`, `panic="abort"`, `strip`). First `cargo check`/build after editing `Cargo.toml` will be slow.
- Vite 8 uses rolldown; `minify: "esbuild"` requires `esbuild` as a devDependency (already present, postinstall approved via `allowScripts`).
- Bundle targets are **deb + rpm only** (`tauri.conf.json`). AppImage was disabled because this machine's `linuxdeploy` fails; don't re-enable unless the environment is fixed.

## Environment gotchas

- A wrapper binary `snip` on PATH intercepts `npm` and swallows real output for some subcommands (`npm view ...` prints only `ok`), and can distort exit codes when chained. If a version/package query or exit code looks wrong, use the real binary: `/usr/bin/npm view <pkg> version` or `node_modules/.bin/oxlint` directly.
- `dist/` and `src-tauri/target/` are build artifacts (gitignored). `src-tauri/gen/schemas/` is generated (gitignored); regenerate via a tauri build/dev if missing.
- `typescript-eslint` is NOT used — it rejects TS 7.0.2 (peer `<6.1.0`). The linter is **oxlint + oxlint-tsgolint**, which supports TS 7. Don't re-add typescript-eslint.
- lefthook glob matching defaults to `gobwas` which mishandles `{ts,tsx}`; `lefthook.yml` sets `glob_matcher: doublestar`. Keep that setting if you edit patterns.
- **En entornos sin servidor X/Wayland funcional (WSL, SSH puro, CI) `npm run tauri dev` se cuelga** antes de `setup()`: GTK/WebKit no puede crear la ventana (el proceso queda en `unix_wait_for_peer` sin llegar a abrir el backend `:1421`). Usar **`npm run tauri:web`** (modo navegador sin ventana: `RUSTOCK_WEB_ONLY=1` en `main.rs` → `run_web()` en `lib.rs`, arranca solo SQLite + el servidor HTTP `:1421` sin tocar GTK; `scripts/web.mjs` lanza vite en `:6821` + `cargo run`). Misma base de datos y misma lógica de negocio que el modo escritorio. Para el arranque de un solo comando (limpia puertos + seed/reset/db temporal) usar **`npm run dev:web`** (`scripts/dev.sh`, Hito 26).
- **`pkill -f 'tauri:web'` se auto-mata**: el patrón coincide con la propia línea de comando del `pkill`, así que mata el shell que lo ejecuta (cuelga el comando). Para detener instancias de Rustock matar **por puerto** (regex acotada a `:<puerto>\b` + extracción del pid con `ss`/`rg`), que es justo lo que hace `scripts/dev.sh --stop`. No repetir `pkill -f` con patrones que coincidan con el propio comando.

## opencode guardrails (project config)

- `opencode.json` — loads AGENTS/SPEC/DESIGN/STACK as mandatory instructions every session; all tools and bash commands are allowed (no permission prompts). Default agent is `rustock`.
- `.opencode/agent/rustock.md` — primary agent with the full discipline prompt (read specs first, no modals, no emojis, logic in Rust, never bypass hooks).
- `.opencode/command/verify.md` — run the full quality pipeline (`/verify`).
- `.opencode/command/feature.md` — implement a SPEC feature end-to-end (`/feature`).
- `.opencode/command/fix.md` — fix root cause + verify (`/fix`).
- Config changes are not hot-reloaded: after editing anything under `.opencode/` or `opencode.json`, the user must restart opencode.

## Skills

Repo-local skill docs for this stack live in `.agents/skills/` (also mirrored via symlinks in `.claude/skills/`): `tauri-v2`, `react-best-practices`, `tailwind-css-patterns`, `frontend-design`, `typescript-advanced-types`, `accessibility`. Consult `tauri-v2/SKILL.md` before backend work.
