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
- `border-radius: 0` everywhere; no shadows, gradients, blur, 3D effects.
- **Zero modals** — no dialogs/drawers/popovers/confirmations. Every action (view/create/edit/delete/approve/cancel) is a separate page with its own deep link, e.g. `/recursos/:id/eliminar`.
- **Zero emojis** anywhere in the UI.
- Icons: only **Lucide** (`lucide-react`), fixed canonical mapping per action (§6.13).
- Fonts: **Open Sans** (UI) + **JetBrains Mono** (codes/SKU/quantities). Only.
- Blue palette + flat/square tokens from §3. No colors outside the declared palette.
- UI copy is professional Spanish, never casual.
- Note: current `src/styles.css` still uses Inter/neutral tokens — a leftover from scaffolding. Any UI work must align it with DESIGN.md tokens first.

## Commands

```bash
npm run dev            # Vite dev server (port 1420, strictPort)
npm run build          # typecheck (tsc --noEmit) + vite build -> dist/
npm run typecheck      # tsc --noEmit only
npm run lint           # oxlint src (Rust-native linter, TS7-compatible)
npm run lint:fix       # oxlint --fix src
npm run format         # prettier --write src/**/*.{ts,tsx,css}
npm run format:check   # prettier --check
npm run design         # scripts/design-guard.mjs — DESIGN.md compliance gate
npm run tauri dev      # run the desktop app in dev mode (spawns vite on 1420)
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
- **`scripts/design-guard.mjs`** — blocks code violating DESIGN.md: zero emojis, zero border-radius>0, zero box-shadow/gradients/blur, no `alert/confirm/prompt`, fonts only Open Sans/JetBrains Mono, icons only from `lucide-react`.
- **oxlint** — configured in `.oxlintrc.json`; requires TS 7 (uses `oxlint-tsgolint`). Lint errors (`deny`) block; style warnings do not.
- **Prettier** — `.prettierrc` (semi, double quotes, trailing comma all, printWidth 100). Markdown files are ignored via `.prettierignore`.

## Architecture

- Frontend entry: `src/main.tsx` -> `src/App.tsx`. CSS entry: `src/styles/index.css` (CSS puro modular; orden de cascade: tokens -> reset -> base -> utilities -> layout -> components -> responsive). Sin frameworks de CSS.
- Librería UI compartida: `src/shared/ui/` (barrel `index.ts`). Todo componente declarado en DESIGN.md vive aquí: `Icon` (mapa canónico §6.13), `Button`, `ButtonLink`, `Link`, `Field`/`Input`/`Select`/`Textarea`/`Checkbox`/`Radio`, `Table`, `Pagination`, `Badge`, `Card`, `PageHeader`, `EmptyState`, `Skeleton`, `DetailList`, `ToastProvider`/`useToast`, `ErrorPanel`, `AppShell`/`Topbar`/`Sidebar`/`Brand`/`Breadcrumbs`, `Search`/`FilterBar`. Los componentes consumen las clases de `src/styles/*.css`; nunca se hardcodean tokens en JSX.
- Backend: `src-tauri/src/lib.rs` (app builder + command registration via `tauri::generate_handler!`) and `src-tauri/src/main.rs` (calls `rustock_lib::run()`). Crate is named **`rustock_lib`** — the name matters for imports and mobile build.
- Tauri config: `src-tauri/tauri.conf.json`. Frontend served from `../dist`; dev URL `http://localhost:1420`.
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

## opencode guardrails (project config)

- `opencode.json` — loads AGENTS/SPEC/DESIGN/STACK as mandatory instructions every session; permission rules: `git push*`, `git * --no-verify*` and `rm -rf *` are **denied**, most other bash is `ask`, git read/add is allowed. Default agent is `rustock`.
- `.opencode/agent/rustock.md` — primary agent with the full discipline prompt (read specs first, no modals, no emojis, logic in Rust, never bypass hooks).
- `.opencode/command/verify.md` — run the full quality pipeline (`/verify`).
- `.opencode/command/feature.md` — implement a SPEC feature end-to-end (`/feature`).
- `.opencode/command/fix.md` — fix root cause + verify (`/fix`).
- Config changes are not hot-reloaded: after editing anything under `.opencode/` or `opencode.json`, the user must restart opencode.

## Skills

Repo-local skill docs for this stack live in `.agents/skills/` (also mirrored via symlinks in `.claude/skills/`): `tauri-v2`, `react-best-practices`, `tailwind-css-patterns`, `frontend-design`, `typescript-advanced-types`, `accessibility`. Consult `tauri-v2/SKILL.md` before backend work.
