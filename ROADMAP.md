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

## Fase 1 — Capa de datos (SQLite) ✅ (backend completo)

**Base:** SPEC §5 (saldos), §14 (reglas transversales), §15.11 (indexación).

- [x] Migraciones de esquema SQLite (rusqlite) en Rust
- [x] Catálogo de tablas: usuarios, roles, permisos, almacenes, zonas, racks,
      secciones, ubicaciones, cajas, productos, categorías, UOM, proveedores,
      clientes, lotes
- [x] Tablas de movimiento y líneas; tabla de saldos **materializados** con
      índices por (ubicación, producto, lote)
- [x] Auditoría (quién/quién-qué/cuándo) e historial inmutable
- [x] Comandos Tauri CRUD base + acceso a datos solo desde Rust

**Criterio de salida:** `cargo check` + tests básicos de esquema. ✅

---

## Fase 2 — Catálogos (entidades maestras) — backend ✅, UI pendiente

**Base:** SPEC §3 (entidades) con sus reglas de jerarquía y unicidad.

- [x] CRUD completo de Almacén → Zona → Rack → Sección → Ubicación → Caja
      (incluye editar/desactivar en las 6; árbol simplificado sección/rack/zona)
- [x] CRUD de Producto/SKU, Categoría, UOM, Proveedor, Cliente, Lote
- [x] Validaciones: códigos únicos/normalizados, desactivación (no borrado),
      ciclos reales en categorías, restricción de caja por producto/lote
- [ ] UI por página (listado/detalle/nuevo/editar/eliminar) para cada una,
      siguiendo DESIGN.md (cero modales) — **siguiente hito del proyecto**

**Criterio de salida:** navegación completa de catálogos con el estándar de
consulta universal (filtros/orden/búsqueda/paginación) funcionando. Backend
listo (§15 aplicado a los 15 recursos principales); falta la UI.

---

## Fase 3 — Usuarios, roles y permisos ✅ (backend completo)

**Base:** SPEC §4 (usuarios, roles, permisos, matriz, auditoría).

- [x] Autenticación local (self-hosted, argon2) + roles por defecto (ADMIN,
      GERENTE, ENCARGADO_ALMACEN, OPERADOR, LECTOR)
- [x] Permisos granulares `recurso:accion` aplicados a cada operación
      (incluidas las lecturas, antes sin gatear)
- [ ] Páginas de gestión de usuarios/roles + perfil (UI pendiente)
- [x] Registro de auditoría en cada operación, incluidos los intentos
      denegados (`SinPermiso`/`NoAutenticado`)

**Criterio de salida:** la matriz de permisos de SPEC §4.4 se cumple en toda
operación. ✅ backend.

---

## Fase 4 — Stock y movimientos (núcleo) ✅ (backend completo)

**Base:** SPEC §5, §6, §7, §8, §9, §10.

- [x] Modelo de movimiento con ciclo de vida (borrador → pendiente → aprobado
      → anulado) y anulación con inverso
- [x] Entradas (compra, devolución, ajuste +, inicial — con permiso
      `configuracion:ejecutar`)
- [x] Salidas (cliente, devolución proveedor, merma, ajuste −) con política
      FIFO/FEFO (`sugerir_lineas_salida`) y regla de lotes vencidos
- [x] Traslados (entre ubicaciones, cajas, almacenes) atómicos — inter-almacén
      genera dos movimientos ligados por `documento_referencia` (§9.3)
- [x] Ajustes con motivo obligatorio; invariante de saldo ≥ 0; bloqueados
      durante sesión de inventario `EN_CURSO` del mismo almacén (§14.6)
- [x] Saldos materializados actualizados en transacción al aprobar;
      `capacidad_maxima` valida el total de la ubicación, no solo el producto
      entrante

**Criterio de salida:** los casos de uso 18.1, 18.2, 18.3, 18.6 funcionan de
extremo a extremo. ✅

---

## Fase 5 — Inventario físico y conteo ✅ (backend completo)

**Base:** SPEC §11 (sesiones, conteo ciego, doble conteo, diferencias,
precisión).

- [x] Sesiones de inventario (completo/cíclico) con estados y alcance
- [x] Registro de conteos (conteo ciego si aplica)
- [x] Doble conteo en diferencias; generación de ajustes al cerrar
- [x] Métricas de precisión (por SKU, por cantidad, por ubicación) —
      `repo::inventario::precision_sesion`

**Criterio de salida:** caso de uso 18.4 completo + reporte de precisión. ✅

---

## Fase 6 — Comentarios, trazabilidad y auditoría ✅ (backend completo)

**Base:** SPEC §12, §13.

- [x] Comentarios anclados a cualquier entidad (sin borrado, edición con
      historial en `comentario_historial`)
- [x] Líneas de tiempo: producto (`movimientos_de_producto_en_rango`),
      ubicación/lote (`donde_esta_lote`), movimiento (estado + inverso)
- [x] Consultas de trazabilidad: las 5 de §13.4 (`donde_esta_lote`,
      `origen_de_salida`, `movimientos_de_producto_en_rango`,
      `lotes_por_vencer`, `historial_caja`)

**Criterio de salida:** las 5 consultas de trazabilidad de §13.4 respondidas. ✅

---

## Fase 7 — Estándar universal de consulta + reportes + alertas ✅ (backend completo)

**Base:** SPEC §15, §16, §17.

- [x] Motor de consulta universal en Rust (`query.rs`): paginación, orden,
      búsqueda, filtros (`eq/neq/gt/lt/in/between/is_null/...`), proyección,
      agregaciones, exportación (SPEC §15)
- [x] Los 15 listados principales lo usan (el resto de reportes tabulares de
      §16.2 se resuelven contra estos mismos esquemas desde el frontend,
      filtros/orden/búsqueda quedan pendientes de reflejarse en la URL cuando
      exista la UI)
- [x] Dashboard con KPI (SPEC §16.1) — `obtener_dashboard`
- [x] Reportes: kardex (`kardex_producto`), vencimientos (`lotes_por_vencer`),
      precisión (`precision_sesion`), auditoría (`listar_historial`); stock
      actual/movimientos/entradas/salidas por periodo vía el motor genérico
- [x] Alertas (stock bajo, excedido, sobrecapacidad, lote por vencer/vencido,
      diferencia de inventario, movimiento pendiente) — `regenerar_alertas`

**Criterio de salida:** cada endpoint de listado cumple SPEC §15 y el dashboard
muestra los KPI. ✅ backend (detalle completo en MEMORY.md, Hito 7).

---

## Fase 8 — Pulido UX y desempeño ✅ (completada)

**Base:** DESIGN.md completo + STACK.md §8 (decisiones de rendimiento).

- [x] Virtualización de listas grandes (@tanstack/react-virtual) — en la
      `Table` genérica (umbral > 80 filas)
- [x] Code-splitting por ruta (lazy) — 53 chunks JS en el build
- [x] Cache de servidor (react-query)
- [x] Estados vacíos, skeletons, error panels, toasts en todas las páginas
- [x] Accesibilidad (foco visible, contraste AA, teclado, skip-link)
- [x] Audit final contra el checklist de DESIGN §11

---

## Fase 9 — Empaquetado y release ✅ (completada)

**Base:** STACK.md §3.2 (perfil release), §9 (comandos).

- [x] Revisar `tauri build` (deb/rpm) con el binario optimizado — el binario
      release compila; el empaquetado deb/rpm se verifica en una máquina con
      `dpkg-deb`/`rpmbuild` (no presentes en este entorno)
- [x] Ajustar iconos de la app, metadatos y descripción del producto
- [x] Documentación de instalación y primer arranque (bootstrap de ADMIN) —
      `INSTALACION.md`

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
