# DESIGN.md — Rustock

> **Sistema de diseño de la interfaz de Rustock.**
> Complementa al `SPEC.md` (lógica de negocio). Este documento define **cómo se ve y cómo se siente** la aplicación: tokens, layout, navegación, componentes, patrones de página, experiencia y las reglas de consistencia que no admiten excepción.

---

## Tabla de contenido

1. [Filosofía de diseño](#1-filosofía-de-diseño)
   - 1.1 Filosofía de profesionalismo
2. [Principios no negociables](#2-principios-no-negociables)
3. [Tokens de diseño](#3-tokens-de-diseño)
   - 3.1 Color
   - 3.2 Tipografía
   - 3.3 Espaciado
   - 3.4 Bordes y radio
   - 3.5 Sombras y elevación
   - 3.6 Alturas, anchos y medidas
   - 3.7 Densidad y jerarquía visual
   - 3.8 Zonas de estado / color semántico
4. [Layout de la aplicación](#4-layout-de-la-aplicación)
   - 4.1 Estructura general
   - 4.2 Barra superior
   - 4.3 Barra lateral de navegación
   - 4.4 Área de contenido
   - 4.5 Migas de pan (breadcrumbs)
5. [Navegación, deep-linking y rutas](#5-navegación-deep-linking-y-rutas)
   - 5.1 Regla de oro: cero modales
   - 5.2 Principios de rutas
   - 5.3 Arquitectura de rutas (ver / crear / editar / eliminar)
   - 5.4 Mapa de rutas completo
   - 5.5 Reglas de enlaces y navegación
   - 5.6 Estados de ruta (404, sin permisos, pendiente de carga)
6. [Sistema de componentes](#6-sistema-de-componentes)
   - 6.1 Principios de componentes
   - 6.2 Botones
   - 6.3 Enlaces
   - 6.4 Campos de formulario (input, select, textarea, fecha)
   - 6.5 Tablas y listados
   - 6.6 Tarjetas y paneles
   - 6.7 Insignias y etiquetas
   - 6.8 Encabezados de página
   - 6.9 Acciones de fila y de página
   - 6.10 Búsqueda global y barra de filtros
   - 6.11 Estados vacíos
   - 6.12 Notificaciones (toasts)
   - 6.13 Iconografía
7. [Patrones de página](#7-patrones-de-página)
   - 7.1 Página de listado
   - 7.2 Página de detalle (ver)
   - 7.3 Página de creación (nuevo)
   - 7.4 Página de edición
   - 7.5 Página de eliminación (confirmación de borrado)
   - 7.6 Página de anulación de movimiento
   - 7.7 Página de ajuste
   - 7.8 Página de inventario (sesión de conteo)
7.9. [Experiencia de usuario (UX)](#8-experiencia-de-usuario-ux)
   - 8.1 Flujos clave
   - 8.2 Teclado y accesibilidad de acciones
   - 8.3 Retroalimentación
   - 8.4 Manejo de errores
   - 8.5 Consistencia de microinteracciones
9. [Consistencia total](#9-consistencia-total)
   - 9.1 Reglas de copy
   - 9.2 Reglas de datos mostrados
   - 9.3 Reglas de formato
   - 9.4 Prohibiciones
10. [Accesibilidad](#10-accesibilidad)
11. [Checklist de calidad visual](#11-checklist-de-calidad-visual)

---

## 1. Filosofía de diseño

Rustock es una herramienta de trabajo: **precisa, moderna y con personalidad**. El diseño no compite con los datos; los ordena con elegancia.

- **Redondeado** — esquinas suaves (`--radius-md`/`--radius-lg`) en todos los componentes. Nada de bordes duros ni esquinas agresivas; la curva suave es la firma visual.
- **Plano pero vivo** — sin gradientes, sin relieve, sin sombras. La profundidad se comunica con radio, espaciado, color y bordes sutiles de 1px.
- **Moderno y vibrante** — paleta azul intensa y luminosa, tipografía Open Sans legible, mucho espacio en blanco y jerarquía clara.
- **Elegante y sofisticado** — los acentos azules vibrantes se reservan para acciones primarias y elementos activos; los neutros fríos dan calma.
- **Con foco en el dato** — los valores, códigos y cantidades son los protagonistas; se muestran con JetBrains Mono para distinguirlos del texto narrativo.
- **Cero modales** — cada acción (ver, crear, editar, eliminar, aprobar, anular) vive en **su propia página**. No existen ventanas emergentes, diálogos superpuestos ni confirmaciones flotantes.

### 1.1 Filosofía de profesionalismo

Rustock es una herramienta de negocio que representa la **seriedad de la operación logística** que administra, pero con una estética **contemporánea, limpia y amable**. El profesionalismo no está reñido con un diseño moderno: la interfaz es **precisa, técnica y elegante**, sin frivolidad.

Este compromiso se traduce en reglas declaradas e innegociables:

- **Tolerancia cero a los emojis.** ❌ **Emojis prohibidos en toda la interfaz, sin excepción ni justificación**: textos, botones, mensajes de éxito/error, notificaciones, estados, placeholders, documentación visible al usuario o cualquier otro canal de la UI. Un emoji es una expresión informal que rompe la seriedad, la consistencia y el estilo elegante de la aplicación. Donde otro producto usaría un emoji, Rustock usa un **icono del set oficial** (§6.13) o texto plano.
- **Iconografía profesional única y declarada.** Todos los símbolos de la interfaz provienen de **un único paquete de iconos moderno y profesional** diseñado para producto/business: **Lucide** (`lucide-react`). Es el set canónico, cerrado y obligatorio. Queda prohibido mezclar conjuntos de iconos, usar SVGs aislados de otros orígenes o introducir iconos de stock no derivados de Lucide.
- **Semántica de iconos estricta.** Cada icono tiene un significado único y estable en toda la aplicación (ver tabla canónica §6.13). Los iconos nunca se usan como decoración caprichosa: siempre comunican una acción, un estado o un dato.
- **Cero decoración lúdica.** Sin ilustraciones, sin mascotas, sin personajes, sin doodles. La confianza se transmite con datos claros, orden y precisión tipográfica, no con entretenimiento.
- **Tono comunicacional profesional.** Los mensajes son directos, técnicos y respetuosos (ver §9.1). Sin chistes, sin exclamaciones innecesarias, sin lenguaje coloquial ni emotivo.

La "Filosofía de profesionalismo" es parte integral de la identidad visual: cualquier pantalla que no respete estas reglas se considera **defectuosa por diseño** y debe corregirse antes de ser aceptada.

---

## 2. Principios no negociables

1. **Cero modales, cero popovers, cero tooltips de bloqueo, cero confirmaciones flotantes.** Toda decisión que modifique datos ocurre en una página dedicada con URL propia.
2. **Esquinas suaves.** El `border-radius` usa exclusivamente los tokens de radio (§3.4): `--radius-sm/md/lg/xl/full`. Ningún componente usa esquinas a 0 ni radio arbitrario.
3. **Cero gradientes, cero sombras, cero blur, cero efectos 3D.** La elevación se logra con radio, borde de 1px y fondo diferenciado.
4. **Todo es navegable y enlazable.** Cualquier elemento de datos es un enlace a su página de detalle. Cualquier página es alcanzable por URL directa (deep-link) y por enlaces internos.
5. **Una tarea por página.** Ver, crear, editar, eliminar y anular son páginas separadas.
6. **Consistencia absoluta.** El mismo componente se ve idéntico en todas las pantallas. Se usan exclusivamente los tokens y componentes definidos aquí.
7. **Primero legibilidad, después estética.** Contraste suficiente, tipografía clara, datos formateados.
8. **El usuario nunca pierde contexto.** Las rutas "hijas" (editar, eliminar) siempre son navegables hacia la página padre.

---

## 3. Tokens de diseño

> Los tokens son la única fuente de valores visuales. Están declarados como variables de diseño (CSS custom properties) y **nunca** se hardcodea un color, espaciado o medida en un componente.

### 3.1 Color

Paleta base azul **vibrante y luminosa**, de baja a alta saturación. Los azules claros dominan los fondos; los acentos azules intensos y eléctricos se reservan para acciones primarias, enlaces y elementos activos. El resultado es moderno, atractivo y con energía, sin caer en lo estridente.

**Escala de azul (semántica primaria):**

| Token | Valor | Uso |
|---|---|---|
| `--color-blue-50` | `#EFF5FF` | Fondos de paneles sobre azul, resaltados muy suaves |
| `--color-blue-100` | `#DBE8FF` | Fondos de selección ligera, hover de filas |
| `--color-blue-200` | `#B8D0FE` | Bordes de componentes activos, fondos de insignias |
| `--color-blue-300` | `#8FB3FB` | Acentos de información, bordes de foco |
| `--color-blue-400` | `#6090FA` | Enlaces en hover |
| `--color-blue-500` | `#3B71F6` | **Acciones primarias, enlaces, elementos activos** |
| `--color-blue-600` | `#2C57DD` | Hover/pressed de acciones primarias |
| `--color-blue-700` | `#2246B5` | Acentos oscuros sobre fondos claros |
| `--color-blue-800` | `#1D3A91` | Textos azul oscuro, fondos de header sobre oscuro |
| `--color-blue-900` | `#172B6E` | Fondo de barra lateral / superficies oscuras |
| `--color-blue-950` | `#0F1D4D` | Fondo más oscuro (footer, áreas de énfasis) |

**Neutros (grises con tinte azul frío):**

| Token | Valor | Uso |
|---|---|---|
| `--color-gray-50` | `#F7F9FC` | Fondo general de la aplicación |
| `--color-gray-100` | `#EEF2F8` | Fondos alternados de filas, paneles secundarios |
| `--color-gray-200` | `#DFE5EF` | Bordes de componentes, separadores |
| `--color-gray-300` | `#C6CFDD` | Bordes en hover, inputs deshabilitados |
| `--color-gray-400` | `#97A3B5` | Texto secundario, placeholders |
| `--color-gray-500` | `#6B768A` | Texto atenuado, metadatos |
| `--color-gray-600` | `#49556A` | Texto principal secundario |
| `--color-gray-700` | `#333F54` | Texto principal |
| `--color-gray-800` | `#1D2939` | Texto de títulos, cabeceras |
| `--color-gray-900` | `#101828` | Texto más oscuro, contenido crítico |

**Blanco / superficies:**

| Token | Valor | Uso |
|---|---|---|
| `--color-white` | `#FFFFFF` | Fondos de tarjetas, paneles, inputs |
| `--color-surface` | `#FFFFFF` | Superficie por defecto |
| `--color-surface-muted` | `#F7F9FC` | Superficie secundaria |
| `--color-surface-inverse` | `#172B6E` | Superficie oscura (sidebar) |

**Semántico (estados y acciones):**

| Token | Valor | Uso |
|---|---|---|
| `--color-success-500` | `#16A34A` | Entradas, saldo positivo, aprobado |
| `--color-success-600` | `#128A3E` | Hover/pressed de éxito |
| `--color-warning-500` | `#D97706` | Stock bajo, por vencer, pendiente |
| `--color-warning-600` | `#B45309` | Hover/pressed de advertencia |
| `--color-danger-500` | `#E11D48` | Eliminar, anular, error, merma |
| `--color-danger-600` | `#BE123C` | Hover/pressed de peligro |
| `--color-info-500` | `#3B71F6` | Información, enlaces |

**Fondos de estado (superficies tintadas para insignias y paneles de estado):**

| Token | Valor | Uso |
|---|---|---|
| `--color-success-bg` | `#F0FBF4` | Insignia "aprobado / entrada" |
| `--color-warning-bg` | `#FFFBEB` | Insignia "pendiente / bajo" |
| `--color-danger-bg` | `#FFF1F2` | Insignia "anulado / error / merma" |
| `--color-info-bg` | `#EFF5FF` | Insignia "información" |

**Texto sobre fondos tintados:**

| Token | Valor |
|---|---|
| `--color-success-text` | `#166534` |
| `--color-warning-text` | `#92400E` |
| `--color-danger-text` | `#9F1239` |
| `--color-info-text` | `#1D4ED8` |

### 3.2 Tipografía

**Familia sans (UI principal):**

| Token | Valor |
|---|---|
| `--font-sans` | `"Open Sans", "Segoe UI", system-ui, -apple-system, sans-serif` |

**Familia mono (datos):**

| Token | Valor |
|---|---|
| `--font-mono` | `"JetBrains Mono", "SFMono-Regular", Menlo, Consolas, monospace` |

**Escala tipográfica (rem):**

| Token | Tamaño | Línea-alto | Peso | Uso |
|---|---|---|---|---|
| `--text-xs` | `0.75rem` | `1rem` | 400 | Metadatos, códigos de pie, labels de campos |
| `--text-sm` | `0.875rem` | `1.25rem` | 400 | Cuerpo secundario, celdas de tabla |
| `--text-base` | `1rem` | `1.5rem` | 400 | Cuerpo principal |
| `--text-lg` | `1.125rem` | `1.625rem` | 600 | Subtítulos de panel |
| `--text-xl` | `1.375rem` | `1.75rem` | 600 | Títulos de página |
| `--text-2xl` | `1.75rem` | `2.25rem` | 700 | Títulos de sección grandes |

**Reglas tipográficas:**
- Cuerpo y títulos → Open Sans.
- **Solo** códigos, SKU, números de documento, cantidades, fechas ISO, identificadores y valores técnicos → JetBrains Mono.
- Los códigos (SKU, ubicación, lote, número de movimiento) se muestran **siempre** en mono, con `--text-sm`.
- Los títulos usan color `--color-gray-800`; el cuerpo `--color-gray-600`; los metadatos `--color-gray-500`.
- Sin font-weight por debajo de 400 ni por encima de 700 en UI.

### 3.3 Espaciado

Escala base 4px, declarada en múltiplos:

| Token | Valor | Uso típico |
|---|---|---|
| `--space-0` | `0` | — |
| `--space-1` | `0.25rem` (4px) | Gaps mínimos entre iconos y texto |
| `--space-2` | `0.5rem` (8px) | Gap interno de botones, celdas |
| `--space-3` | `0.75rem` (12px) | Padding de inputs, badges |
| `--space-4` | `1rem` (16px) | Padding de tarjetas, gaps de formularios |
| `--space-6` | `1.5rem` (24px) | Gaps entre paneles, padding de página |
| `--space-8` | `2rem` (32px) | Separación entre secciones |
| `--space-12` | `3rem` (48px) | Espaciado de bloques grandes |
| `--space-16` | `4rem` (64px) | Márgenes de página |

Reglas:
- El grid de layout usa múltiplos de 8 para anchos; múltiplos de 4 para espaciados internos.
- Dos niveles de contenido adyacentes se separan con `--space-4`; bloques lógicos con `--space-6` o más.

### 3.4 Bordes y radio

El radio es **la firma visual** del rediseño: esquinas suaves y modernas, nunca duras. Se usan exclusivamente los tokens de radio; ningún componente declara un radio literal.

| Token | Valor | Uso |
|---|---|---|
| `--radius-sm` | `0.375rem` (6px) | Inputs, botones compactos, insignias pequeñas |
| `--radius-md` | `0.5rem` (8px) | **Radio estándar**: botones, inputs, selects, checkbox, foco |
| `--radius-lg` | `0.75rem` (12px) | Tarjetas, paneles, toasts, tablas |
| `--radius-xl` | `1rem` (16px) | Tarjetas de detalle, estados vacíos, avatares |
| `--radius-full` | `9999px` | Píldoras: badges, toggles, avatares, botones de icono |
| `--border-width` | `1px` | Bordes estándar |
| `--border-width-2` | `2px` | Bordes de foco, estado activo |
| `--border-color` | `--color-gray-200` | Borde por defecto |
| `--border-color-strong` | `--color-gray-300` | Borde de inputs en hover |

**Regla absoluta:** todo componente usa radio de los tokens (`--radius-md` como base; `--radius-lg` para contenedores; `--radius-full` para píldoras). Queda prohibido `border-radius: 0` y cualquier valor literal fuera de tokens.

### 3.5 Sombras y elevación

- **No se usan sombras.** `box-shadow` queda prohibido en la UI (excepto en pruebas de accesibilidad de contraste, donde no se aplica).
- La jerarquía espacial se comunica con:
  - Radio suave (`--radius-lg`/`--radius-xl`) que hace "respirar" los contenedores.
  - Fondo diferenciado (`--color-surface-muted`, `--color-blue-50`).
  - Bordes sutiles de 1px.
  - Espaciado.
- No existe elevación "flotante"; los elementos viven en el flujo de la página.

### 3.6 Alturas, anchos y medidas

| Token | Valor | Uso |
|---|---|---|
| `--size-xs` | `1.5rem` (24px) | Iconos pequeños |
| `--size-sm` | `2rem` (32px) | Botones compactos, iconos |
| `--size-md` | `2.5rem` (40px) | **Altura estándar de controles** (input, botón, select) |
| `--size-lg` | `3rem` (48px) | Controles grandes (búsqueda principal, acciones principales) |
| `--width-sidebar` | `16rem` (256px) | Barra lateral |
| `--width-max-content` | `72rem` (1152px) | Ancho máximo del área de contenido |
| `--width-form` | `36rem` (576px) | Ancho máximo de formularios de una columna |
| `--width-detail-column` | `18rem` (288px) | Columna de metadatos en detalle |

Regla: la altura estándar de **todos** los controles es `--size-md` (40px). No se mezclan alturas de controles en la misma fila.

### 3.7 Densidad y jerarquía visual

- Densidad media: cómoda para lectura y suficiente para mostrar muchos registros.
- Jerarquía por: tamaño de fuente → peso → color → espaciado → fondo. (En ese orden de prioridad; primero tipografía, nunca color aislado.)
- Un nivel de jerarquía se comunica con máximo una o dos señales a la vez.

### 3.8 Zonas de estado / color semántico

- `success` → entradas, aprobado, saldo positivo, conciliado.
- `warning` → stock bajo, por vencer, pendiente de aprobación.
- `danger` → anulado, merma, error, eliminar.
- `info` → información, enlaces, ayudas.
- Los estados **nunca** se comunican solo con color: siempre acompañan un ícono y/o texto (ver §10 Accesibilidad).

---

## 4. Layout de la aplicación

### 4.1 Estructura general

```
┌────────────────────────────────────────────────────────────┐
│ Barra superior (breadcrumb + búsqueda global + usuario)      │
├──────────────┬─────────────────────────────────────────────┤
│              │                                              │
│  Sidebar     │   Área de contenido                          │
│  (navegación │   (una sola tarea por página)                │
│  principal)  │                                              │
│              │                                              │
└──────────────┴─────────────────────────────────────────────┘
```

- **Barra superior**: fija, altura `--topbar-height` (56px), fondo `--color-white`, borde inferior `1px --color-gray-200`.
- **Sidebar**: fija, ancho `--width-sidebar`, fondo `--color-white` con borde derecho `1px --color-gray-200`. Items redondeados (`--radius-lg`); el activo usa `--color-blue-500` con texto blanco.
- **Área de contenido**: scroll vertical, padding `--space-6`, ancho máximo `--width-max-content` centrado.
- La barra superior y la sidebar **no** flotan sobre el contenido: ocupan su propio espacio (nada de overlay ni scroll separado sobre ellas en desktop).

### 4.2 Barra superior

Contenido (de izquierda a derecha):
1. **Marca Rustock** (logo cuadrado redondeado de 32px + palabra en Open Sans bold azul). Es un enlace a `/`.
2. **Breadcrumbs** del nivel actual (ver §4.5).
3. **Búsqueda global** (input píldora con ícono, mono para resultados) — ver §6.10.
4. **Indicador de alertas activas** (contador, enlace a página de alertas).
5. **Usuario actual** (avatar circular + nombre + rol, enlace a su página de perfil).

### 4.3 Barra lateral de navegación

Ítems de navegación principal, agrupados:

- **Operación**
  - Dashboard
  - Movimientos
  - Inventario físico
  - Alertas
- **Catálogos**
  - Almacenes
  - Ubicaciones
  - Productos
  - Lotes
  - Proveedores
  - Clientes
- **Análisis**
  - Reportes
- **Administración**
  - Usuarios y roles
  - Configuración

Reglas:
- El sidebar es **claro** (`--color-white`) con borde derecho sutil y títulos de grupo en `--text-xs` mayúsculas gris.
- El ítem activo usa `--color-blue-500` con texto blanco y radio `--radius-lg`. Hover: `--color-blue-50` con texto `--color-blue-700`.
- Cada ítem es un **enlace real** (no un botón).
- En móvil, la navegación se presenta como **drawer** deslizante desde la izquierda con su propia marca en el encabezado.

### 4.4 Área de contenido

- Padding uniforme `--space-6`.
- Contenido máximo `--width-max-content`, centrado con `margin: 0 auto`.
- Las páginas se componen de bloques: encabezado de página + contenido.

### 4.5 Migas de pan (breadcrumbs)

- Ubicadas en la barra superior, justo tras la marca.
- Formato: `Almacenes / Almacén Central / Editar`.
- Cada nivel es un enlace salvo el actual.
- Siempre reflejan la **ruta de profundidad** real (ver §5), lo que garantiza que el usuario siempre pueda volver un nivel arriba.
- Separador: `/` (slashe) en `--color-gray-400`, texto `--text-sm`.

---

## 5. Navegación, deep-linking y rutas

### 5.1 Regla de oro: cero modales

**No existen** en Rustock:
- Ventanas modales / diálogos.
- Popovers de confirmación.
- Toasts de confirmación que reemplacen a una página.
- Paneles deslizantes (drawers) para editar o confirmar.
- Confirmaciones `window.confirm` o equivalentes.

Toda acción que **lea, cree, modifique, elimine o anule** un recurso ocurre en una **página con URL propia**. Esto garantiza:
- **Deep-linking**: cualquier estado es alcanzable por URL (incluso "¿seguro que quieres eliminar X?").
- **Historial**: el usuario puede volver con el botón atrás de forma natural.
- **Recarga segura**: recargar no pierde contexto.
- **Consistencia**: una sola forma de hacer cada cosa.

### 5.2 Principios de rutas

1. Cada recurso tiene **una ruta raíz de listado** y **una ruta de detalle**.
2. Las acciones sobre un recurso son **rutas hijas** del detalle: `/ver`, `/editar`, `/eliminar`.
3. La creación es una ruta hermana del listado: `/nuevo`.
4. Toda ruta con `:id` es **enlazable** desde listados, detalle, búsqueda, breadcrumbs y notificaciones.
5. Las rutas son **legibles y en español** (consistentes con la UI): `/almacenes`, `/productos`, `/movimientos/123`.
6. Las rutas de acción **verifican permisos**; sin permiso se navega a una página de "sin acceso" (no a un modal).

### 5.3 Arquitectura de rutas (ver / crear / editar / eliminar)

Para un recurso genérico `recurso`:

| Ruta | Propósito |
|---|---|
| `/recursos` | Listado (con filtros, orden, búsqueda, paginación) |
| `/recursos/nuevo` | Página de **creación** |
| `/recursos/:id` | Página de **detalle** (ver) |
| `/recursos/:id/editar` | Página de **edición** |
| `/recursos/:id/eliminar` | Página de **confirmación de eliminación** |

**Regla de eliminación:** el borrado **nunca** es instantáneo desde la lista. Se navega a `/recursos/:id/eliminar`, una página que:
- Muestra el objeto (id, código, nombre, datos clave) en mono.
- Explica las **consecuencias** (ej. "tiene 3 movimientos asociados; se desactivará", "no se puede eliminar: tiene stock").
- Muestra un botón primario **peligro** "Eliminar" y un enlace "Cancelar" de vuelta al detalle.
- El botón de peligro solo se habilita si es técnicamente posible y el usuario tiene permiso.

**Regla de anulación (movimientos):** similar a eliminar, en `/movimientos/:id/anular`, con la misma estructura de página de confirmación y explicación del inverso que se generará.

### 5.4 Mapa de rutas completo

**Núcleo / operación:**
- `/` → Dashboard
- `/movimientos` → Listado de movimientos
- `/movimientos/nuevo` → Crear movimiento (selector de tipo)
- `/movimientos/:id` → Detalle de movimiento
- `/movimientos/:id/editar` → Editar movimiento (solo `BORRADOR`/`PENDIENTE_APROBACION`)
- `/movimientos/:id/aprobar` → Aprobar movimiento (página de confirmación)
- `/movimientos/:id/anular` → Anular movimiento (página de confirmación)
- `/inventario` → Listado de sesiones de inventario
- `/inventario/nuevo` → Crear sesión
- `/inventario/:id` → Detalle de sesión (líneas de conteo)
- `/inventario/:id/conteos` → Registrar conteos (página dedicada)
- `/inventario/:id/cerrar` → Cerrar sesión (página de confirmación)
- `/inventario/:id/eliminar` → Eliminar sesión
- `/alertas` → Listado de alertas

**Catálogos:**
- `/almacenes`, `/almacenes/nuevo`, `/almacenes/:id`, `/almacenes/:id/editar`, `/almacenes/:id/eliminar`
- `/zonas`, ... (misma estructura)
- `/racks`, ... (misma estructura)
- `/secciones`, ... (misma estructura)
- `/ubicaciones`, ... (misma estructura)
- `/cajas`, ... (misma estructura)
- `/productos`, `/productos/nuevo`, `/productos/:id`, `/productos/:id/editar`, `/productos/:id/eliminar`
- `/categorias`, ... (misma estructura)
- `/uoms`, ... (misma estructura)
- `/proveedores`, ... (misma estructura)
- `/clientes`, ... (misma estructura)
- `/lotes`, ... (misma estructura)

**Análisis y administración:**
- `/reportes` → Listado de reportes
- `/reportes/stock`, `/reportes/movimientos`, `/reportes/entradas`, `/reportes/salidas`, `/reportes/kardex/:producto_id`, `/reportes/vencimientos`, `/reportes/precision`, `/reportes/auditoria`, `/reportes/usuarios`
- `/usuarios`, `/usuarios/nuevo`, `/usuarios/:id`, `/usuarios/:id/editar`, `/usuarios/:id/eliminar`
- `/roles`, `/roles/:id`, ... 
- `/configuracion` → Configuración general
- `/configuracion/parametros`, `/configuracion/notificaciones`

**Sistema:**
- `/acceso-no-permitido` (403)
- `/no-encontrado` (404)
- `/error` (500)

### 5.5 Reglas de enlaces y navegación

- **Todo** dato identificable es un enlace: SKU → `/productos/:id`, ubicación → `/ubicaciones/:id`, usuario → `/usuarios/:id`, número de movimiento → `/movimientos/:id`.
- Los enlaces dentro de tablas usan el estilo "texto azul, sin subrayado, hover con subrayado" (o se marca la fila entera como clickable con navegación).
- La navegación **nunca** abre pestañas nuevas salvo enlaces externos documentales.
- Al guardar con éxito desde una página de creación → se navega al **detalle** del registro creado.
- Al guardar con éxito desde una página de edición → se navega al **detalle** (o permanece en edición si hay ediciones consecutivas; se define por pantalla y debe ser consistente dentro de la misma pantalla).
- Al cancelar en cualquier página de acción → se vuelve a la página **padre** (detalle para editar/eliminar/anular; listado para crear).

### 5.6 Estados de ruta (404, sin permisos, pendiente de carga)

- **Carga**: la página muestra su skeleton (ver §6.11) sin bloquear el resto.
- **No encontrado**: página dedicada `/no-encontrado` con enlaces sugeridos (al listado padre, al dashboard).
- **Sin permiso**: página dedicada `/acceso-no-permitido` explicando qué permiso falta y un enlace de retorno.
- **Error de servidor**: página `/error` con opción de reintentar y enlace de retorno.

---

## 6. Sistema de componentes

### 6.1 Principios de componentes

- Cada componente es **suave y redondeado** (`--radius-md` o superior), plano, con borde sutil de 1px y fondo liso.
- Los componentes tienen **estados** explícitos: `default`, `hover`, `focus`, `disabled`, `error`, `active`.
- No existen variantes "sombreadas", "elevadas" ni "vidriosas".
- Los componentes de control miden `--size-md` (40px) de alto por defecto.

### 6.2 Botones

**Estructura:** fondo liso, radio `--radius-md`, borde 1px, texto `--text-sm`, padding `0 --space-4`, alto `--size-md`. Icono opcional de 16px a la izquierda. **Sin sombra, sin 3D.**

| Variante | Fondo | Borde | Texto | Uso |
|---|---|---|---|---|
| `primary` | `--color-blue-500` | transparente | blanco | Acción principal de la página |
| `secondary` | `--color-white` | `--color-gray-300` | `--color-gray-700` | Acción secundaria / cancelar |
| `danger` | `--color-danger-500` | transparente | blanco | Eliminar, anular, merma |
| `ghost` | transparente | transparente | `--color-blue-600` | Acciones de bajo énfasis en tablas |
| `link` | transparente | sin borde | `--color-blue-600` | Enlace con apariencia de botón |

**Estados:**
- `hover`: `primary` → `--color-blue-600`; `secondary` → fondo `--color-gray-100`; `danger` → `--color-danger-600`; `ghost` → fondo `--color-blue-50`.
- `focus`: anillo de foco de `2px` en `--color-blue-300` (sin desplazamiento, a ras del borde; no es sombra, es borde).
- `disabled`: opacidad `0.5`, cursor `not-allowed`, sin estados hover.
- `active` (presionado): fondo 1 tono más oscuro que hover.

**Reglas:**
- Una página tiene **un solo** botón `primary` (la acción principal).
- Las acciones destructivas **solo** usan `danger` y viven en la página de confirmación de eliminación/anulación.
- Los botones dentro de tablas se muestran como `ghost`/`link` (acciones ligeras); las acciones fuertes viven en la página de detalle.
- El botón `primary` puede presentarse en píldora (`--radius-full`) cuando es el CTA principal de una página de listado.

### 6.3 Enlaces

- Texto `--color-blue-600`, sin subrayado; `hover` → `--color-blue-500` + subrayado.
- Con foco: borde de foco de 2px a ras del borde.
- Dentro de párrafos pueden subrayarse siempre para ser claramente distinguibles.

### 6.4 Campos de formulario (input, select, textarea, fecha)

**Estructura común:**
- Alto `--size-md`, fondo `--color-white`, radio `--radius-md`, borde `1px --color-gray-300`, texto `--text-base` (`--text-sm` en listas densas), padding `0 --space-3`.
- **Label** `--text-sm` `--color-gray-600`, con `--space-1` de separación.
- **Mensaje de ayuda** `--text-xs` `--color-gray-500` bajo el campo.
- **Mensaje de error** `--text-xs` `--color-danger-600` con ícono.

**Estados:**
- `default` → borde `--color-gray-300`.
- `hover` → borde `--color-gray-400`.
- `focus` → borde `--color-blue-500` + anillo de foco 2px `--color-blue-300`.
- `error` → borde `--color-danger-500` + mensaje de error.
- `disabled` → fondo `--color-gray-100`, borde `--color-gray-200`, opacidad 0.6.
- `readonly` → fondo `--color-gray-50`, sin estado hover.

**Campos específicos:**
- **Input de código/SKU** (códigos de ubicación, SKU, lote): se muestra en **mono**.
- **Select**: mismo estilo; la flecha es un ícono propio, no una pseudo-flecha del navegador.
- **Date**: se usan pickers propios, estilo plano y redondeado, sin calendario flotante que ocupe la pantalla; la selección de fecha se abre en un panel en línea dentro del formulario.
- **Número/cantidad**: texto mono, alineado a la derecha cuando representa cantidad.
- **Textarea**: `--text-base`, min-height `--size-lg`, padding `--space-3`.

### 6.5 Tablas y listados

**Estructura:**
- Contenedor con fondo `--color-white`, borde `1px --color-gray-200`, radio `--radius-lg` (esquinas superiores redondeadas).
- **Header**: `--text-xs` mayúsculas, `--color-gray-500`, fondo `--color-gray-50`, fila con borde inferior `--color-gray-200`.
- **Filas**: `--text-sm`; borde inferior `1px --color-gray-100`.
- **Hover de fila**: fondo `--color-blue-50`.
- **Fila clickeable**: la fila navega al detalle (cursor pointer).
- **Selección múltiple** (cuando aplica): checkbox redondeado a la izquierda; las filas seleccionadas se marcan con fondo `--color-blue-50` y borde izquierdo 2px `--color-blue-500`.

**Columna de acciones:**
- Iconos `ghost`: ver, editar, eliminar (solo si el usuario tiene permiso).
- Cada acción navega a su página dedicada (ver §5).

**Reglas:**
- Toda tabla tiene cabecera de columnas **ordenables** cuando aplica (clic en la columna alterna asc/desc; el orden actual se marca con un chevron plano).
- Las columnas numéricas de cantidad se alinean a la derecha en mono.
- Los códigos/SKU/números se muestran en mono.
- El listado incluye controles de paginación (ver §7.1) y un resumen "Mostrando X–Y de Z".

### 6.6 Tarjetas y paneles

- Fondo `--color-white`, borde `1px --color-gray-200`, radio `--radius-lg`, padding `--space-4`.
- Título del panel: `--text-lg`, `--color-gray-800`, con borde inferior `--color-gray-200` opcional.
- Sin sombra. La elevación se logra con el radio suave y el borde sutil.
- Los paneles pueden ser "secciones" de una página de detalle (ej. "Datos generales", "Saldo por lote", "Historial de movimientos").

### 6.7 Insignias y etiquetas

- Fondo tintado + texto tintado (ver tabla 3.1), padding `0 --space-2`, alto `--size-xs`, `--text-xs`, radio `--radius-full` (píldora), borde `1px` del mismo matiz.
- Se usan para estados: `Aprobado`, `Pendiente`, `Anulado`, `Borrador`, `Entrada`, `Salida`, `Stock bajo`, `Vence pronto`.
- Ícono pequeño opcional (12px) cuando refuerza el estado.

### 6.8 Encabezados de página

Todo encabezado de página sigue la misma estructura:

```
[Título de página — text-xl, gray-800]
[Descripción de 1 línea — text-base, gray-500]      [Botón principal — right]
[Breadcrumb implícito arriba en la barra superior]
```

- Título en `--text-xl`, semibold, `--color-gray-800`.
- Subtexto descriptivo en `--text-base` `--color-gray-500`.
- Acciones principales a la derecha, alineadas a la línea del título.

### 6.9 Acciones de fila y de página

- **Acciones de fila** (tablas): iconos `ghost` ver/editar/eliminar → navegan a las páginas dedicadas.
- **Acciones de página** (detalle): botones `primary`/`secondary`/`danger` según la tarea → navegan a `/.../editar`, `/.../eliminar`, etc.
- Nunca existe una acción que haga dos cosas (ej. "eliminar y volver") en un solo paso sin su página de confirmación.

### 6.10 Búsqueda global y barra de filtros

**Búsqueda global** (barra superior):
- Input con ícono de lupa, radio `--radius-full` (píldora); al escribir, muestra resultados agrupados por tipo (Productos, Ubicaciones, Movimientos, Lotes, Proveedores, Clientes).
- Resultados en **mono** para códigos; navegan al detalle de cada resultado.
- El Enter ejecuta la búsqueda y navega a la página de búsqueda global (listado agregado).

**Barra de filtros (listados):**
- Fila de controles sobre la tabla: campo de búsqueda `q`, selector de campo, operador y valor para filtros avanzados.
- Los filtros activos se muestran como badges píldora removibles bajo la barra.
- Se aplican de inmediato o con botón "Aplicar" (consistente dentro del mismo listado).
- Orden, búsqueda, filtros y paginación se reflejan en la **URL** (query params) para permitir deep-link y compartir estados de filtrado.

### 6.11 Estados vacíos

- Sin datos: ícono redondeado (`--radius-xl`) de 32px + mensaje "No hay X todavía" + botón/enlace para crear el primero.
- Sin resultados con filtros: ícono + "No se encontraron resultados" + botón "Limpiar filtros".
- **Skeleton de carga**: bloques redondeados (`--radius-sm`), grises, sin shimmer ni animación de brillo; se anima solo con opacidad pulsante sutil (o estática).

### 6.12 Notificaciones (toasts)

- **Usados solo para feedback transitorio** (no para confirmaciones de decisión):
  - "Movimiento aprobado" → éxito.
  - "No se pudo guardar: campo obligatorio faltante" → error.
- Se ubican en la esquina inferior derecha, fondo `--color-gray-800` o el color semántico, texto blanco, radio `--radius-lg`, borde 1px del matiz.
- Desaparecen solos (5s) o con botón cerrar.
- **Nunca** sustituyen una página de confirmación (eliminar, anular, aprobar siguen siendo páginas).

### 6.13 Iconografía

**Set oficial (obligatorio y único):**

| Token | Valor |
|---|---|
| `--icons-set` | **Lucide** — paquete `lucide-react` |

**Reglas del set:**
- Todo icono proviene de **Lucide** (`lucide-react`). Es el único set permitido; queda prohibido importar iconos de otros paquetes, SVGs sueltos o iconos custom no derivados de Lucide (§1.1).
- Estilo **lineal** (stroke), grosor de trazo consistente, sin relleno, sin gradiente, sin sombra. Lucide por defecto cumple con la estética plana.
- Tamaño base 16px (`--size-xs`); 20px en controles grandes; 24px máximo solo en estados vacíos/404.
- El trazo hereda `currentColor`; el color del icono proviene siempre del contexto (token de texto del contenedor).
- **Semántica estable**: la misma acción usa siempre el mismo icono en toda la aplicación (tabla canónica abajo). No se cambia un icono por capricho visual.
- Los iconos son decorativos por defecto (`aria-hidden`) salvo que no haya texto que los explique.

**Tabla canónica de iconos (Lucide) — uso único y obligatorio:**

| Concepto | Icono Lucide |
|---|---|
| Dashboard / inicio | `LayoutDashboard` |
| Movimientos | `ArrowLeftRight` |
| Entrada | `ArrowDownToLine` |
| Salida | `ArrowUpFromLine` |
| Traslado | `Move` |
| Ajuste | `SlidersHorizontal` |
| Inventario físico / conteo | `ClipboardList` |
| Alerta | `AlertTriangle` |
| Stock | `Package` |
| Producto / SKU | `Boxes` |
| Caja | `PackageOpen` |
| Lote | `Layers` |
| Almacén | `Warehouse` |
| Zona / Rack / Sección | `LayoutGrid` |
| Ubicación (bin) | `MapPin` |
| Proveedor | `Truck` |
| Cliente | `Users` |
| Usuario | `User` |
| Rol / permiso | `Shield` |
| Categoría | `FolderTree` |
| Unidad de medida | `Ruler` |
| Comentario | `MessageSquare` |
| Historial / trazabilidad | `History` |
| Buscar | `Search` |
| Filtrar | `Filter` |
| Ordenar | `ArrowUpDown` |
| Ver | `Eye` |
| Editar | `Pencil` |
| Eliminar | `Trash2` |
| Aprobar | `CheckCircle2` |
| Anular / rechazar | `XCircle` |
| Cerrar | `Lock` |
| Exportar | `Download` |
| Agregar / nuevo | `Plus` |
| Atrás | `ArrowLeft` |
| Refrescar | `RefreshCw` |
| Calendario / fecha | `CalendarDays` |
| Nota | `FileText` |
| Código de barras | `ScanBarcode` |
| Configuración | `Settings` |
| Reportes / análisis | `BarChart3` |
| Cerrar sesión | `LogOut` |

> Regla de mantenimiento: si una acción necesita un icono nuevo, primero se busca en Lucide; si no existe equivalente, **no se añade** un icono custom salvo aprobación explícita del diseño, y queda documentado aquí.

---

## 7. Patrones de página

### 7.1 Página de listado

Estructura:
1. Encabezado (título + descripción + botón "Nuevo..." primario).
2. Barra de filtros (§6.10).
3. Tabla (§6.5) con columnas ordenables, filas clickeables y columna de acciones.
4. Paginación (Anterior/Página X de Y/Siguiente) + resumen de registros.

Reglas:
- Los filtros/orden/búsqueda viven en la URL.
- El "Nuevo" navega a `/recursos/nuevo`.
- Cada fila navega a `/recursos/:id`.

### 7.2 Página de detalle (ver)

Estructura:
1. Encabezado con el **título** = código/nombre del recurso (mono para códigos) + badges de estado + acciones: `Editar`, `Eliminar` (y acciones específicas: `Aprobar`, `Anular`, `Cerrar` según el recurso).
2. **Panel "Datos generales"**: campos de solo lectura en grid de dos columnas (label `--text-xs` gris, valor `--text-base`, mono para códigos/cantidades).
3. **Paneles específicos del recurso**:
   - Producto: stock total, stock por ubicación, lotes activos, categoría, proveedores.
   - Ubicación: saldo por producto/lote, capacidad, tipo.
   - Movimiento: líneas del movimiento (producto, lote, cantidad, origen, destino), estados, auditoría (creado/aprobado/anulado por), movimiento inverso si fue anulado.
   - Sesión de inventario: resumen, líneas de conteo, diferencias, precisión.
4. **Panel de historial / movimientos** (si aplica): tabla de movimientos del recurso, cada uno enlazado a su detalle.
5. **Panel de comentarios**: lista de comentarios + formulario en línea (no modal) para agregar uno.

Reglas:
- Todo valor identificable es enlazable (producto, ubicación, lote, usuario).
- Los datos de solo lectura **nunca** son editables en esta página (para editar se navega a `/editar`).

### 7.3 Página de creación (nuevo)

Estructura:
1. Encabezado "Nuevo [recurso]".
2. Formulario en tarjeta (`--width-form` máximo), una columna para formularios simples, dos columnas para maestros.
3. Botones al pie: `primary` "Crear" + `secondary` "Cancelar" (vuelve al listado).

Reglas:
- Validación en el cliente + servidor; errores bajo cada campo.
- Al crear con éxito: navegación al **detalle** del nuevo registro + toast de éxito.
- Campos con valores por defecto sensatos; los códigos pueden auto-sugerirse.

### 7.4 Página de edición

Estructura:
1. Encabezado "Editar [recurso] — [código]".
2. Mismo formulario que creación, precargado.
3. Botones: `primary` "Guardar cambios" + `secondary` "Cancelar" (vuelve al detalle).

Reglas:
- Al guardar con éxito: navegación al **detalle** + toast de éxito.
- Campos inmutables (ej. `sku` con permiso insuficiente) aparecen `disabled` o `readonly` con ayuda explicando por qué.
- Para movimientos: solo editables en estado `BORRADOR` o `PENDIENTE_APROBACION`.

### 7.5 Página de eliminación (confirmación de borrado)

Estructura:
1. Encabezado "Eliminar [recurso]".
2. Panel con los **datos del objeto** (código, nombre, ids) en mono.
3. Panel de **consecuencias** (si aplica): "Este registro tiene N movimientos asociados y será desactivado", "No puede eliminarse porque tiene stock".
4. Botón `danger` "Eliminar definitivamente" + enlace "Cancelar" → al detalle.

Reglas:
- El botón peligro solo se habilita si la eliminación es posible y autorizada.
- La eliminación respeta borrado lógico del SPEC (§14.5).
- Al eliminar con éxito: navegación al **listado** + toast.

### 7.6 Página de anulación de movimiento

Estructura idéntica a eliminación pero para movimientos:
- Muestra el movimiento (número, tipo, estado, líneas).
- Explica: "Se generará un movimiento inverso que revierte el efecto sobre el stock."
- Botón `danger` "Anular movimiento" + "Cancelar" → detalle del movimiento.

### 7.7 Página de ajuste

- Formulario dedicado `/movimientos/nuevo` con tipo `AJUSTE` (o sub-ruta `/movimientos/nuevo/ajuste`).
- Campo `motivo` obligatorio, en primer lugar, para reforzar la regla de negocio.
- Selector de ubicación + producto + lote + cantidad (±).
- Resumen en vivo del saldo resultante.

### 7.8 Página de inventario (sesión de conteo)

- **Detalle de sesión**: resumen (tipo, alcance, estado, responsable, fechas) + tabla de líneas de conteo + diferencias + precisión.
- **Registrar conteos** (`/inventario/:id/conteos`): página dedicada de captura, campo a campo (ubicación, producto, lote, cantidad contada), navegación por teclado, **conteo ciego** cuando aplica (el saldo del sistema no se muestra).
- **Cerrar sesión** (`/inventario/:id/cerrar`): página de confirmación que lista las diferencias aceptadas y los ajustes que se generarán.

---

## 8. Experiencia de usuario (UX)

### 8.1 Flujos clave

1. **Buscar un producto → ver detalle**: búsqueda global o listado → clic → detalle (stock por ubicación, lotes, historial enlazado).
2. **Registrar una entrada**: `Movimientos → Nuevo → Entrada → Compra` → formulario → crear → detalle del movimiento → el stock ya está reflejado.
3. **Despachar (salida)**: `Movimientos → Nuevo → Salida → Cliente` → líneas con sugerencia FIFO/FEFO → crear → detalle.
4. **Corregir stock**: desde detalle de producto → "Ajustar stock" (página de ajuste) con motivo obligatorio.
5. **Eliminar un producto sin stock**: listado → detalle → Eliminar (página de confirmación) → listado.
6. **Cerrar inventario**: sesión → registrar conteos → cerrar (página de confirmación con diferencias) → reporte de precisión.

Cada flujo es **completo dentro de la navegación**: no hay paso intermedio que ocurra fuera de una página.

### 8.2 Teclado y accesibilidad de acciones

- **Tab**: recorrido lógico de formularios y enlaces.
- **Enter**: envío de formularios.
- **Esc**: en formularios con selector de fecha en línea, lo cierra (sin acciones destructivas).
- **Atajos** (documentados en la página de configuración/ayuda): `/` enfoca búsqueda global; `N` nueva entidad en listados.
- Foco visible en **todos** los elementos interactivos (anillo 2px `--color-blue-300`).

### 8.3 Retroalimentación

- Toda mutación exitosa → toast de éxito + navegación coherente (ver §5.5).
- Toda mutación fallida → permanece en la misma página, muestra errores bajo los campos y un toast de error con el resumen.
- Las acciones destructivas **siempre** pasan por su página de confirmación.

### 8.4 Manejo de errores

- Validación de formulario: mensajes claros y específicos bajo cada campo.
- Errores de negocio (ej. "Saldo insuficiente", "Lote vencido"): mostrados en un **panel de error** dentro de la página (no en un modal), con el detalle y opciones de corrección.
- Errores de red: página `/error` con reintentar.
- Nunca se usan alertas nativas del navegador.

### 8.5 Consistencia de microinteracciones

- Transiciones: solo `background-color`, `border-color`, `color` y `opacity`, con duración corta (`150ms`) y sin easing exóticos.
- Sin animaciones de entrada/salida de páginas ni de elementos.
- Sin paralaje, sin micro-animaciones decorativas, sin hover que mueva elementos.

---

## 9. Consistencia total

### 9.1 Reglas de copy

- La UI está en **español**; títulos en mayúscula de oración (solo primera letra).
- Botones: verbo en infinitivo (Crear, Guardar, Eliminar, Anular, Aprobar, Cerrar).
- Mensajes claros y cortos, sin jerga técnica salvo los propios del dominio (SKU, lote, ubicación).
- Errores: "Qué pasó + qué hacer", ej. "Saldo insuficiente en RACK-A1-N2-P3: hay 5, se pidieron 8."

### 9.2 Reglas de datos mostrados

- Códigos, SKU, números de documento, ids → **mono**.
- Cantidades → **mono**, alineadas a la derecha, con su UOM abreviada.
- Fechas → formato `DD MMM YYYY` (ej. `08 ago 2026`) en zona configurada.
- Estados → badges con ícono + texto; el ícono proviene de la tabla canónica (§6.13).
- Valores nulos → "—" (guion) en lugar de vacío o "null".

### 9.3 Reglas de formato

- Números: separador de miles `1,234`, decimales según UOM.
- Moneda (si se agrega valorización): `$1,234.50`.
- Porcentajes: `95.3%`.
- Todo formato se centraliza en utilidades; ningún componente formatea por su cuenta.

### 9.4 Prohibiciones

- ❌ `border-radius: 0` ni valores de radio literales fuera de los tokens (§3.4).
- ❌ `box-shadow`, gradientes, `backdrop-filter`, `filter: blur`.
- ❌ Modales, drawers, popovers, confirmaciones flotantes.
- ❌ Alertas nativas (`alert`, `confirm`, `prompt`).
- ❌ Textos con `font-family` distinto a los tokens.
- ❌ Colores fuera de la paleta declarada.
- ❌ Elementos "decorativos" sin función (imágenes, ilustraciones, doodles, mascotas).
- ❌ **Emojis en la UI. Tolerancia cero: ningún carácter emoji en textos, botones, mensajes, estados, placeholders o notificaciones (§1.1).**
- ❌ **Iconos fuera del set Lucide** (`lucide-react`): ningún SVG suelto, icono de otro paquete, icono custom o de stock (§6.13).
- ❌ **Iconos con significado inconsistente**: un icono se usa siempre para la misma acción; no se reutiliza con otro sentido (§6.13).
- ❌ Tono coloquial, emotivo o lúdico en mensajes; sin exclamaciones innecesarias ni chistes (§1.1, §9.1).
- ❌ Animaciones exóticas, parallax, partículas.

---

## 10. Accesibilidad

- Contraste: todo texto cumple WCAG AA (mínimo 4.5:1 en texto normal; 3:1 en texto grande y UI).
- El color nunca es el único canal: estados con ícono + texto.
- Elementos interactivos con área de 40px mínimo (ya cubierto por `--size-md`).
- Etiquetas `label` asociadas a cada campo (`for`/`id`).
- Tablas con `<th scope="col">`, captions donde aporte.
- Iconos decorativos con `aria-hidden`; iconos informativos con `aria-label`.
- Rutas y páginas son navegables solo con teclado; el foco es siempre visible.
- Breadcrumbs y enlaces "skip to content".

---

## 11. Checklist de calidad visual

Antes de dar una pantalla por terminada, debe cumplir:
- [ ] Radio suave en todos los elementos visibles (tokens `--radius-sm/md/lg/xl/full`, nunca 0).
- [ ] Sin sombras, sin gradientes, sin blur, sin 3D.
- [ ] Colores solo de la paleta/tokens.
- [ ] Fuentes solo Open Sans / JetBrains Mono.
- [ ] Códigos/SKU/cantidades en mono.
- [ ] Toda tabla con filtros, orden, búsqueda y paginación.
- [ ] Todo dato identificable es un enlace a su detalle.
- [ ] Ver/Crear/Editar/Eliminar en páginas propias, sin modales.
- [ ] Un solo botón primario por página.
- [ ] Estados vacíos presentes (sin datos / sin resultados).
- [ ] Errores bajo los campos y panel de error, sin alertas nativas.
- [ ] Foco visible en todos los controles.
- [ ] Contraste AA verificado.
- [ ] Sin emojis en ningún texto o mensaje (tolerancia cero).
- [ ] Todos los iconos provienen del set Lucide y usan la semántica canónica (§6.13).
- [ ] Sin iconos custom, SVG sueltos ni sets mezclados.
- [ ] Tono profesional en todo el copy (sin informalidad ni lúdica).

---

*Fin del DESIGN — Rustock v0.1. Este documento es la única fuente de verdad del aspecto y la experiencia de la interfaz.*
