---
description: Implementa una feature del SPEC.md respetando DESIGN.md y STACK.md, con verificación completa.
agent: rustock
---

Implementa la siguiente feature de Rustock: $ARGUMENTS

## Proceso obligatorio

1. **Ubica la feature en el SPEC.md**: lee la sección relevante (entidad,
   reglas, casos de uso) y anota qué invariantes aplican.
2. **Confirma el modelo de datos** contra el SPEC: campos, tipos, validaciones,
   relaciones y reglas de saldo/trazabilidad. El esquema debe cubrir TODO lo
   que el SPEC pide para esa entidad.
3. **Implementa en Rust** la lógica de negocio (comandos Tauri, validaciones,
   transacciones, saldos materializados e índices). El frontend solo consulta.
4. **Implementa la UI según DESIGN.md**: páginas propias con URL para
   listar/ver/crear/editar/eliminar (cero modales), tokens de la paleta, iconos
   lucide-react, fuentes Open Sans/JetBrains Mono, sin emojis, radio 0.
5. **Aplica el estándar de consulta universal** (SPEC §15): el listado debe ser
   filtrable, ordenable, buscable, paginable, seccionable y con exportación.
6. **Verifica con el pipeline completo** (mismo que /verify): lint, typecheck,
   design-guard, build, y cargo fmt/clippy/check.
7. **NO hagas commit**: avisa al usuario cuando esté listo.

Si la feature entra en conflicto con otra parte del SPEC o falta información,
pregunta al usuario antes de implementar. No inventes reglas de negocio.
