---
description: Corre el pipeline completo de calidad de Rustock (lint, typecheck, design, build, Rust). Usa cuando termines cualquier cambio.
agent: rustock
---

Verifica que el repositorio cumple el pipeline completo de calidad de Rustock.
Ejecuta en orden y corrige cada fallo antes de seguir:

1. `npm run typecheck` — TypeScript 7 (tsc --noEmit)
2. `npm run lint` — oxlint sobre src/
3. `npm run format:check` — prettier --check
4. `npm run design` — DesignGuard (validación de DESIGN.md: emojis, radius,
   sombras, fuentes, iconos lucide-react)
5. `npm run build` — build de producción del frontend
6. En `src-tauri/`: `cargo fmt --all -- --check`
7. En `src-tauri/`: `cargo clippy --all-targets --all-features -- -D warnings`
8. En `src-tauri/`: `cargo check --all-targets`

Si algo falla: corrígelo respetando SPEC.md/DESIGN.md/STACK.md y vuelve a
verificar hasta que todo pase. **Nunca** sugieras `--no-verify` ni saltarte
pasos. Reporta al final un resumen de qué se ejecutó y el estado de cada paso.
