# ROADMAP.md — Rustock

> Plan de implementación derivado del `SPEC.md`. Orden de fases para que el
> agente no implemente fuera de orden ni salte dependencias. Cada fase termina
> con el pipeline de calidad pasando (`/verify`).

---

## Fase 0 — Fundación ✅ (completada)

- [x] Scaffold Tauri v2 + React 19 + TS 7 + Vite 8
- [x] Sistema de diseño en CSS puro (`src/styles/`) con tokens de DESIGN.md
- [x] Biblioteca de componentes (`src/shared/ui/`) con Icon (lucide-react)
- [x] Pipeline de calidad: lefthook (pre-commit/pre-push), oxlint, prettier,
      DesignGuard, rustfmt, clippy, build
- [x] Docs: SPEC.md, DESIGN.md, STACK.md, AGENTS.md, ROADMAP.md

---

## Fase 1 — Capa de datos (SQLite)

**Base:** SPEC §5 (saldos), §14 (reglas transversales), §15.11 (indexación).

- [ ] Migraciones de esquema SQLite (rusqlite) en Rust
- [ ] Catálogo de tablas: usuarios, roles, permisos, almacenes, zonas, racks,
      secciones, ubicaciones, cajas, productos, categorías, UOM, proveedores,
      clientes, lotes
- [ ] Tablas de movimiento y líneas; tabla de saldos **materializados** con
      índices por (ubicación, producto, lote)
- [ ] Auditoría (quién/quién-qué/cuándo) e historial inmutable
- [ ] Comandos Tauri CRUD base + acceso a datos solo desde Rust

**Criterio de salida:** `cargo check` + tests básicos de esquema.

---

## Fase 2 — Catálogos (entidades maestras)

**Base:** SPEC §3 (entidades) con sus reglas de jerarquía y unicidad.

- [ ] CRUD completo de Almacén → Zona → Rack → Sección → Ubicación → Caja
- [ ] CRUD de Producto/SKU, Categoría, UOM, Proveedor, Cliente, Lote
- [ ] Validaciones: códigos únicos/normalizados, desactivación (no borrado)
- [ ] UI por página (listado/detalle/nuevo/editar/eliminar) para cada una,
      siguiendo DESIGN.md (cero modales)

**Criterio de salida:** navegación completa de catálogos con el estándar de
consulta universal (filtros/orden/búsqueda/paginación) funcionando.

---

## Fase 3 — Usuarios, roles y permisos

**Base:** SPEC §4 (usuarios, roles, permisos, matriz, auditoría).

- [ ] Autenticación local (self-hosted) + roles por defecto (ADMIN, GERENTE,
      ENCARGADO_ALMACEN, OPERADOR, LECTOR)
- [ ] Permisos granulares `recurso:accion` aplicados a cada operación
- [ ] Páginas de gestión de usuarios/roles + perfil
- [ ] Registro de auditoría en cada operación

**Criterio de salida:** la matriz de permisos de SPEC §4.4 se cumple en toda
operación.

---

## Fase 4 — Stock y movimientos (núcleo)

**Base:** SPEC §5, §6, §7, §8, §9, §10.

- [ ] Modelo de movimiento con ciclo de vida (borrador → pendiente → aprobado
      → anulado) y anulación con inverso
- [ ] Entradas (compra, devolución, ajuste +, inicial)
- [ ] Salidas (cliente, devolución proveedor, merma, ajuste −) con política
      FIFO/FEFO y regla de lotes vencidos
- [ ] Traslados (entre ubicaciones, cajas, almacenes) atómicos
- [ ] Ajustes con motivo obligatorio; invariante de saldo ≥ 0
- [ ] Saldos materializados actualizados en transacción al aprobar

**Criterio de salida:** los casos de uso 18.1, 18.2, 18.3, 18.6 funcionan de
extremo a extremo.

---

## Fase 5 — Inventario físico y conteo

**Base:** SPEC §11 (sesiones, conteo ciego, doble conteo, diferencias,
precisión).

- [ ] Sesiones de inventario (completo/cíclico) con estados y alcance
- [ ] Registro de conteos (conteo ciego si aplica)
- [ ] Doble conteo en diferencias; generación de ajustes al cerrar
- [ ] Métricas de precisión (por SKU, por cantidad, por ubicación)

**Criterio de salida:** caso de uso 18.4 completo + reporte de precisión.

---

## Fase 6 — Comentarios, trazabilidad y auditoría

**Base:** SPEC §12, §13.

- [ ] Comentarios anclados a cualquier entidad (sin borrado, edición con
      historial)
- [ ] Líneas de tiempo: producto, ubicación, movimiento
- [ ] Consultas de trazabilidad (¿dónde está el lote X?, origen de una salida)

**Criterio de salida:** las 5 consultas de trazabilidad de §13.4 respondidas.

---

## Fase 7 — Estándar universal de consulta + reportes + alertas

**Base:** SPEC §15, §16, §17.

- [ ] Motor de consulta universal en Rust: paginación, orden, búsqueda,
      filtros (`eq/neq/gt/lt/in/between/is_null/...`), proyección, agregaciones,
      exportación (SPEC §15)
- [ ] Todos los listados lo usan; filtros/orden/búsqueda en la URL
- [ ] Dashboard con KPI (SPEC §16.1)
- [ ] Reportes (stock, movimientos, entradas, salidas, kardex, vencimientos,
      precisión, auditoría)
- [ ] Alertas (stock bajo, excedido, vencimientos, diferencias, pendientes)

**Criterio de salida:** cada endpoint de listado cumple SPEC §15 y el dashboard
muestra los KPI.

---

## Fase 8 — Pulido UX y desempeño

**Base:** DESIGN.md completo + STACK.md §8 (decisiones de rendimiento).

- [ ] Virtualización de listas grandes (@tanstack/react-virtual)
- [ ] Code-splitting por ruta (lazy)
- [ ] Cache de servidor (react-query)
- [ ] Estados vacíos, skeletons, error panels, toasts en todas las páginas
- [ ] Accesibilidad (foco visible, contraste AA, teclado)
- [ ] Audit final contra el checklist de DESIGN §11

---

## Fase 9 — Empaquetado y release

**Base:** STACK.md §3.2 (perfil release), §9 (comandos).

- [ ] Revisar `tauri build` (deb/rpm) con el binario optimizado
- [ ] Ajustar iconos de la app, metadatos y descripción del producto
- [ ] Documentación de instalación y primer arranque (bootstrap de ADMIN)

---

## Fuera de alcance (SPEC §20)

Reservas/stock comprometido, pedidos (OC/OV), multi-rol por usuario,
integradones externas (hardware/email), valorización de inventario, API
pública. No implementar salvo que el usuario lo pida explícitamente.

---

## Reglas para el agente

- Trabajar **en orden de fase**: no implementar la fase 5 sin terminar la 4.
- Cada fase termina con `/verify` en verde y, si el usuario lo pide, un commit.
- Si una fase crece demasiado, dividir en sub-tareas (todowrite) y avisar.
- No marcar ítems como completados sin haberlo verificado realmente.
