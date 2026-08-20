---
description: Auditoría total de Rustock — 10 dimensiones (navegación, módulos sin UI, iconos, diseño/tokens, accesibilidad, negocio/flujos, datos/contratos, rendimiento, código y ortografía). Detecta fugas, huérfanas, modales, emojis y violaciones SPEC/DESIGN/STACK.
agent: audit
---

Audita Rustock de forma total: $ARGUMENTS

## Qué auditar (si $ARGUMENTS está vacío, audita TODO)

- Sin argumento o `completo`/`total`/`todo`: auditoría completa en las 10 dimensiones del agente audit (navegación, módulos sin UI, iconos, diseño/tokens, accesibilidad, negocio+flujos, datos/contratos FE↔BE, rendimiento, código, ortografía/tono).
- `rapido`/`quick`: solo lo mecánico (`design`, `routes`, `audit.mjs`, `lint`, `typecheck`) — para CI.
- `diseno`/`design`: solo DESIGN.md (tokens, sombras, radius, emojis, modales, fuentes, iconos).
- `rutas`/`nav`/`fugas`: solo navegación y páginas huérfanas/muertas.
- `negocio`/`spec`: solo invariantes del SPEC (saldos, FIFO/FEFO, motivos, inmutabilidad, §15, §18).
- `a11y`/`accesibilidad`: solo WCAG 2.2 AA.
- `datos`/`contratos`: solo coherencia Rust↔frontend (comandos, tipos, índices, saldos materializados).
- `ortografia`/`copy`: solo tono profesional español + typos.
- Si $ARGUMENTS nombra un módulo (`movimientos`, `inventario`, `productos`, `alertas`…), audita ese módulo en las 10 dimensiones.

## Proceso obligatorio

1. Lee las 5 fuentes de verdad (AGENTS.md, MEMORY.md, SPEC.md, DESIGN.md, STACK.md) si aún no están en contexto.
2. Corre lo mecánico primero y captura su salida:
   - `npm run design` — DESIGN §1-10
   - `npm run routes` — DESIGN §5
   - `node scripts/audit.mjs` — escáner extendido (huérfanas, iconos, modales, TODOs, contratos FE↔BE, ortografía)
   - `npm run lint` + `npm run typecheck` + `cargo fmt --check` + `cargo clippy -- -D warnings` (si aplica al alcance)
3. Audita lo que solo tú ves: abre `src/app/router.tsx`, `src/app/nav.ts`, `src/app/route-paths.ts`, `src/shared/ui/Icon.tsx`, `src-tauri/src/commands.rs` vs `src-tauri/src/lib.rs` vs `src-tauri/src/server.rs` vs `src/shared/backend.ts`, y las páginas del módulo pedido; verifica flujos E2E, accesibilidad real, tono y coherencia de negocio.
4. Reporta en tabla por dimensión: `Severidad | Archivo:línea | Regla | Hallazgo | Fix sugerido` + top 5 fixes priorizados + estado del pipeline. Usa severidades CRÍTICO/ALTO/MEDIO/BAJO.
5. No hagas commits ni pushes salvo que el usuario lo pida. Si el SPEC/DESIGN/STACK es ambiguo, pregunta antes de inventar una regla.
