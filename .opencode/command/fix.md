---
description: Corrige un bug o problema respetando las specs y verificando el pipeline completo.
agent: rustock
---

Corrige el siguiente problema de Rustock: $ARGUMENTS

## Proceso obligatorio

1. **Diagnostica primero**: reproduce o identifica la causa raíz. Revisa la
   sección del SPEC.md que aplica y confirma qué regla de negocio se viola (o
   qué regla de DESIGN.md/STACK.md se incumple).
2. **Corrige la causa raíz**, no el síntoma. Respeta:
   - Lógica de negocio según SPEC.md (movimientos, saldos, trazabilidad,
     estándar universal de consulta).
   - UI según DESIGN.md (cero modales, cero emojis, tokens, iconos lucide).
   - Stack según STACK.md (lógica en Rust, SQLite indexado).
3. **No cambies código fuera del alcance** del problema.
4. **Verifica con el pipeline completo**: `npm run lint`, `npm run typecheck`,
   `npm run design`, `npm run build`, y en `src-tauri/` `cargo fmt --check`,
   `cargo clippy -- -D warnings`, `cargo check`.
5. **NO uses `--no-verify`** en ninguna circunstancia. Si un hook falla,
   arregla el código.

Reporta la causa raíz, el fix aplicado y el resultado de la verificación.
