# STACK.md — Rustock

> **Declaración del stack tecnológico.**
> Complementa a `SPEC.md` (lógica de negocio) y `DESIGN.md` (interfaz). Este documento define **con qué herramientas se construye Rustock, por qué esas y ninguna otra**, con un criterio absoluto: **máximo rendimiento, cero tolerancia a la lentitud**.

---

## 1. Filosofía de rendimiento

Rustock se construye bajo un único principio rector:

> **Nada es aceptable si no es rápido. La lentitud es un defecto de diseño, no una consecuencia inevitable.**

Esto significa:

- **Cada milisegundo cuenta.** El arranque, la navegación, la búsqueda, el filtrado y las operaciones de inventario se optimizan al extremo.
- **El backend es el motor.** Toda la lógica de negocio y el procesamiento de datos viven en **Rust**, compilado a binario nativo. El frontend **no procesa datos de negocio**: solo los solicita y los muestra.
- **El frontend es el espejo.** El stack de UI es el más rápido y liviano posible: nada de frameworks pesados, nada de runtime innecesario, nada de re-renders evitables.
- **Los datos se indexan.** Todo campo consultable (SPEC §15) está indexado en el almacén de datos para consultas instantáneas.
- **Cero dependencias frívolas.** Cada paquete/crate del stack tiene una justificación de rendimiento o de mantenibilidad. Si algo no aporta velocidad o claridad, no está.

---

## 2. Criterios de elección (reglas de selección)

Todo componente del stack debió pasar estos filtros:

1. **Rendimiento nativo** — prioridad a soluciones compiladas a binario o con runtime mínimo.
2. **Self-hosted, cero servicios externos** — nada depende de un servicio en la nube o un tercero para funcionar.
3. **Modernidad comprobada** — versiones recientes, mantenidas activamente, con hoja de ruta pública.
4. **Pequeño y liviano** — menor tamaño de binario/paquete y menor huella de memoria posible.
5. **Coherencia con SPEC y DESIGN** — el stack debe cumplir el estándar universal de consulta (SPEC §15) y el sistema de diseño (DESIGN).

---

## 3. Stack del backend (núcleo nativo)

### 3.1 Rust + Tauri v2

| Componente | Versión | Rol |
|---|---|---|
| **Rust** | 1.96 (edition **2024**) | Lenguaje del backend. Código nativo, sin GC, sin runtime pesado. |
| **Tauri v2** | 2.11.5 | Shell de escritorio. Crea la ventana nativa y expone IPC Rust ↔ frontend. |
| **tauri-build** | 2.6.3 | Build-time: genera el contexto de la app y los schemas de capabilities. |

**Razones:**
- Tauri usa el renderizador web del sistema operativo (WebKitGTK en Linux, WKWebView en macOS, WebView2 en Windows): **no embarca un navegador** (a diferencia de Electron), lo que reduce drásticamente el tamaño y la memoria.
- El backend en Rust permite **código seguro, sin runtime y veloz**; la lógica de stock/inventario se ejecuta a velocidad nativa.
- IPC (comunicación frontend↔backend) mediante `invoke` serializado con serde, mínimo overhead.

### 3.2 Perfil de release (rendimiento de producción)

Declarado en `src-tauri/Cargo.toml`:

```toml
[profile.release]
codegen-units = 1      # máximo nivel de optimización de código generado
lto = true             # link-time optimization: inlining cross-crate completo
opt-level = 3          # optimización agresiva por velocidad
panic = "abort"        # binarios más pequeños y sin unwinding (correcto para una app)
strip = "symbols"      # remueve símbolos: binario mínimo
```

**Efecto:** el binario de release resultante es pequeño (~5 MB para la fundación) y está optimizado al máximo por velocidad.

### 3.3 Capacidades y plugins

| Plugin | Versión | Uso |
|---|---|---|
| **tauri-plugin-opener** | 2.5.4 | Apertura de enlaces/documentos externos. |
| *(futuro)* tauri-plugin-* según necesidad | — | Solo se agregan plugins con justificación de rendimiento/necesidad real (SPEC §20). |

Las capacidades de permisos se declaran en `src-tauri/capabilities/` (mínimo necesario, sin privilegios de más).

---

## 4. Stack del frontend (máxima expresión del rendimiento web)

### 4.1 Núcleo

| Componente | Versión | Rol |
|---|---|---|
| **React** | 19.2.8 | Biblioteca de UI. Compilada con el compilador moderno; runtime mínimo y render eficiente. |
| **TypeScript** | **7.0.2** | Type checking. **Compilador nativo (Go)**: ~10× más rápido que las versiones anteriores. Se usa solo para typecheck; el código final lo compila Vite. |
| **Vite** | 8.2.1 | Bundler de desarrollo y build. Basado en **Rolldown** (bundler nativo en Rust): build y HMR ultrarrápidos. |
| **@vitejs/plugin-react** | 6.0.5 | Soporte JSX/Refresh para React. |

**Razones:**
- **TypeScript 7 nativo**: los typechecks de CI son instantáneos, sin sacrificar rigor (`strict`, `noUnusedLocals`, etc.).
- **Vite 8 + Rolldown (Rust)**: el bundling y el servidor de desarrollo corren a velocidad nativa.
- **React 19**: modelo de render eficiente, soporte de acciones, mínima huella para el tamaño de esta app.

### 4.2 Estilos

| Componente | Versión | Rol |
|---|---|---|
| **CSS puro (nativo)** | — | Sistema de diseño cuadrado/plano de DESIGN.md: tokens, reset, base, layout, componentes y utilidades en CSS modular nativo (`src/styles/`). Cero frameworks de CSS. |
| **esbuild** | 0.28.2 | Minificación del CSS/JS en build de producción (Vite lo usa con `minify: "esbuild"`). |

**Razones:**
- CSS puro **sin capa utilitaria de framework**: cada valor visual vive en tokens CSS (`:root`), los componentes se construyen con clases propias y solo se descarga el CSS que la app realmente usa.
- Sin runtime de CSS-in-JS: cero JavaScript ejecutándose para los estilos. Sin dependencia de build extra.

### 4.3 Navegación (deep-linking obligatorio)

| Componente | Versión | Rol |
|---|---|---|
| **react-router** | 8.3.0 | Enrutamiento por páginas, con deep-linking total (DESIGN §5). Cada acción (ver/editar/eliminar/aprobar/anular) es una ruta propia. |

**Razones:**
- DESIGN.md exige **cero modales** y **una ruta por acción**: react-router es el estándar, con `lazy` loading por ruta para dividir el JS y cargar solo lo necesario.

### 4.4 Estado y datos

| Componente | Versión | Rol |
|---|---|---|
| **@tanstack/react-query** | 5.101.4 | Caché de servidor (fetch/caché/reescucha). Evita re-fetchs, agrupa peticiones, mantiene datos frescos en pantalla. |
| **zustand** | 5.0.14 | Estado local/global del cliente (UI). Liviano (~1 KB), sin providers ni boilerplate. |

**Razones:**
- react-query **centraliza y cachea** las consultas al backend: el usuario ve los datos al instante y las re-validaciones son silenciosas.
- zustand solo guarda **estado de UI** (filtros activos, selección, preferencias), no duplica datos de negocio.
- **Regla:** el estado de negocio (productos, movimientos, saldos) **nunca** se almacena duplicado en el cliente; se consulta al backend y se cachea con react-query.

### 4.5 Formularios

| Componente | Versión | Rol |
|---|---|---|
| **react-hook-form** | 7.85.0 | Manejo de formularios sin re-renders innecesarios (refs en vez de state). |
| **zod** | 4.4.3 | Validación de esquemas en frontend (espejo de las reglas del SPEC). |

**Razones:**
- react-hook-form evita los re-renders de cada keystroke; el input de cantidades/códigos (crítico en inventario) es fluido.
- zod valida contra las reglas del SPEC (cantidades > 0, códigos normalizados, motivos obligatorios) antes de enviar al backend.

### 4.6 Listas y tablas de alto volumen

| Componente | Versión | Rol |
|---|---|---|
| **@tanstack/react-virtual** | 3.14.9 | Virtualización de listas/tablas: solo renderiza las filas visibles. Indispensable para inventarios con miles de SKU/ubicaciones. |

**Razones:**
- El listado universal (SPEC §15) puede devolver miles de filas; la virtualización mantiene el render en ~50 filas visibles → navegación y scroll instantáneos.

### 4.7 Iconos y utilidades

| Componente | Versión | Rol |
|---|---|---|
| **lucide-react** | 1.30.0 | **Único** set de iconos permitido (DESIGN §6.13). Iconos lineales, tree-shakeables (solo se incluyen los usados). |
| **date-fns** | 4.4.0 | Formateo/manipulación de fechas liviana y modular. |

**Razones:**
- lucide-react es **tree-shakeable**: solo el CSS/SVG de los iconos realmente usados entra al bundle.
- date-fns es modular e inmutable, sin runtime pesado (vs. alternativas monolíticas).

---

## 5. Capa de datos (persistencia)

### 5.1 Motor de base de datos

| Componente | Versión | Rol |
|---|---|---|
| **rusqlite** (SQLite) | 0.40.2 | Motor de persistencia **embebido**, self-hosted, sin servidor externo. |
| **serde / serde_json** | 1.0.229 / 1.0.151 | Serialización entre Rust y el frontend (IPC). |

**Razones:**
- **SQLite** es la base de datos **más rápida** para una app de escritorio self-hosted: un solo archivo, cero red, cero latencia de conexión.
- Permite **índices reales** en todos los campos consultables (SPEC §15.11): búsqueda, filtros, orden y agregaciones **instantáneas**.
- Sin servicios externos: cumple SPEC "autosuficiente" y STACK "self-hosted, cero servicios".

### 5.2 Convención de datos

- Todo movimiento, producto, ubicación, saldo, lote, usuario → registros en SQLite, con índices sobre los campos usados en `filters`, `sort`, `search` y `group_by`.
- Los saldos se **materializan** en tablas indexadas (SPEC §15.11) para lecturas instantáneas, y se recalculan en transacciones al aprobar movimientos.
- El acceso a datos se hace **exclusivamente desde Rust** mediante comandos Tauri; el frontend nunca toca el archivo de base de datos.

---

## 6. Herramientas y DX

| Herramienta | Versión | Rol |
|---|---|---|
| **Node.js** | 26.4.0 (env) | Runtime del tooling de frontend. |
| **npm** | 12.0.0 (env) | Gestor de paquetes del frontend. |
| **cargo / rustup** | 1.96 / 1.29 (env) | Gestión y toolchain de Rust. |
| **Tauri CLI** (`@tauri-apps/cli`) | 2.11.4 | Comandos `tauri dev/build/android/...` vía npm. |

---

## 7. Instalado vs. declarado (estado real)

> Para no engañar al lector: el repo **ya tiene instalado y verificado** el núcleo; las piezas de datos/navegación/formularios se agregan cuando se implemente la lógica de negocio (SPEC).

**✅ Ya instalado y verificado (compila/build OK):**
- React 19.2.8, TypeScript 7.0.2, Vite 8.2.1, @vitejs/plugin-react 6.0.5
- Fundación de diseño en **CSS puro** (tokens, reset, base, layout, componentes, utilidades, responsive) + esbuild 0.28.2
- Librería UI `src/shared/ui/` (barrel `index.ts`) con todos los componentes de DESIGN §6 + mapa canónico de iconos Lucide (§6.13)
- **react-router 8.3.0** (enrutamiento real + deep-linking, DESIGN §5; layout en `src/app/AppLayout.tsx`, rutas en `src/app/router.tsx`, páginas en `src/pages/`)
- @tauri-apps/api 2.11.1, @tauri-apps/cli 2.11.4, @tauri-apps/plugin-opener 2.5.4
- Rust/Tauri: tauri 2.11.5, tauri-build 2.6.3, serde 1.0.229, serde_json 1.0.151

**📦 Declarado (a instalar al implementar, con estas versiones verificadas):**
- @tanstack/react-query 5.101.4 · zustand 5.0.14
- react-hook-form 7.85.0 · zod 4.4.3 · date-fns 4.4.0
- @tanstack/react-virtual 3.14.9 · lucide-react 1.30.0
- rusqlite 0.40.2 (SQLite embebido, desde Rust)
- *(Los tokens de color/tipografía y las fuentes Open Sans + JetBrains Mono se declaran en DESIGN.md; se instalan como assets locales.)*

---

## 8. Decisiones de rendimiento (reglas de implementación)

1. **Cero JavaScript muerto.** Todo `import` se resuelve con tree-shaking; los iconos, utilidades y componentes solo entran al bundle si se usan.
2. **Code-splitting por ruta.** Cada página de react-router se carga con `lazy`; el usuario solo descarga el código de la pantalla que ve.
3. **Virtualización de listas.** Cualquier tabla potencialmente grande usa `@tanstack/react-virtual` (§4.6). Nunca se renderizan miles de `<tr>`.
4. **Cache de servidor.** Las consultas al backend pasan por react-query; no se re-fetchea lo que ya está fresco y válido.
5. **Estado mínimo.** Solo zustand para UI; los datos de negocio siempre vienen del backend (nunca duplicados).
6. **Índices SQLite.** Todo campo filtrable/ordenable/buscable/agrupable (SPEC §15) tiene índice. El plan de consulta de cada listado debe ser eficiente.
7. **Lógica en Rust, no en JS.** El cálculo de saldos, FIFO/FEFO, validaciones de stock, diferencias de inventario → en Rust. El frontend solo pide y muestra.
8. **Saldos materializados.** El saldo por (ubicación, producto, lote) es una tabla indexada, no un cálculo ad-hoc en cada lectura.
9. **Formularios sin re-render.** react-hook-form con refs; inputs de cantidades/códigos nunca re-renderizan toda la página.
10. **Sin animaciones costosas.** Micro-interacciones solo color/borde/opacidad ≤150ms (DESIGN §8.5). Cero animaciones que roben frames.

---

## 9. Comandos de referencia

| Comando | Uso |
|---|---|
| `npm run dev` | Vite dev server (puerto 1420) |
| `npm run build` | `tsc --noEmit` + `vite build` → `dist/` |
| `npm run typecheck` | Typecheck con TS 7 (instantáneo) |
| `npm run tauri dev` | App de escritorio en modo dev |
| `npm run tauri build` | Release: build frontend + cargo release + bundling (deb/rpm) |
| `cargo check` (en `src-tauri/`) | Check de Rust (dev, rápido) |
| `cargo build --release` (en `src-tauri/`) | Compilación release optimizada (perfil §3.2) |

---

## 10. Versiones verificadas (fuente)

Todas las versiones de este documento fueron verificadas al momento de redactar (agosto 2026):

- **npm registry** para paquetes JS (`npm view <pkg> version`).
- **crates.io API** para crates Rust.
- **Compilación real** para el núcleo ya instalado: `npm run build` + `cargo check` + `npm run tauri build` pasan en este repo.

> Si al implementar existe una versión más reciente **estable** de un componente, se actualiza; la regla es usar la **más moderna verificada**, nunca una versión vieja "porque ya funciona".

---

*Fin del STACK — Rustock v0.1. La lentitud no es una opción.*
