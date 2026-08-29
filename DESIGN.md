# DESIGN.md — Rustock

> **Sistema de diseño de la interfaz de Rustock — "Rust & Iron".**
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
   - 3.9 Movimiento
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
   - 6.4.1 Controles con panel propio (select, fecha, hora)
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
   - 7.1.1 Pantallas de acceso (login y alta del administrador)
   - 7.2 Página de detalle (ver)
   - 7.3 Página de creación (nuevo)
   - 7.4 Página de edición
   - 7.5 Página de eliminación (confirmación de borrado)
   - 7.6 Página de anulación de movimiento
   - 7.7 Página de ajuste
   - 7.8 Página de inventario (sesión de conteo)
8. [Experiencia de usuario (UX)](#8-experiencia-de-usuario-ux)
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
12. [Multiplataforma y aplicación instalable](#12-multiplataforma-y-aplicación-instalable)
    - 12.1 Zonas seguras
    - 12.2 Superposición de controles de ventana
    - 12.3 Service worker y arranque
    - 12.4 Avisos de plataforma

---

## 1. Filosofía de diseño

Rustock es una herramienta de trabajo: **precisa, moderna y con carácter**. El diseño no compite con los datos; los ordena con elegancia y les da un escenario a la altura de la operación que representan.

La identidad se llama **"Rust & Iron"**: superficies claras y cálidas en toda la aplicación — incluida la navegación —, y un acento de óxido (`rust`) que marca exactamente lo que importa: **la acción principal, el foco y los enlaces**. Todo lo demás se queda en calma. La escala `iron` (superficies oscuras) queda reservada para el landing y bloques de énfasis puntuales.

El principio rector es la **economía de chrome**: la interfaz aporta la menor cantidad posible de marco. Lo que se ve en pantalla es el dato; los bordes, las cajas y las sombras solo aparecen cuando comunican una capa real. Una pantalla de Rustock debe poder leerse como un documento — títulos, secciones y tablas — no como una rejilla de recuadros.

- **El aire es el separador** — dos bloques se separan con espacio (`--section-gap`, `--page-gap`), no con un borde ni una caja. Un borde solo aparece cuando dos superficies distintas se tocan (cabecera de tabla, franja de filtros) o cuando algo es pulsable y se levanta del lienzo.
- **Profundidad por superficie, no por línea** — la navegación es un lienzo *recesado* (`--color-gray-50`) frente al contenido en blanco (`--color-surface`). La jerarquía la marca el escalón de superficie; no hace falta un borde para anunciarla.
- **El acento no pinta superficies** — el óxido viste la acción primaria, el anillo de foco, los enlaces y la fila seleccionada. Nunca un hover, nunca un elemento de navegación activo, nunca una cabecera. Lo activo se marca con un neutro más contrastado (`--color-gray-200` + texto `--color-gray-900`), que es más legible y no gasta la única señal fuerte del sistema.
- **Redondeado con precisión** — esquinas suaves (`--radius-md`/`--radius-lg`) en todos los componentes, pero comedidas: ni agresivas ni infantiles. La curva es una firma, no un capricho.
- **Elevación deliberada, nunca decorativa** — se permite una **sombra suave, difusa y de tinte cálido** (§3.5) para separar capas (tarjetas, menús, toasts) de su fondo. La sombra siempre comunica jerarquía real (esto flota sobre esto); nunca se usa para "decorar".
- **Un acento, una función** — el óxido `--color-blue-500` (escala Rust) se reserva exclusivamente para: acción primaria, elemento activo, foco y enlaces. Si algo no es la acción principal ni un enlace, no lleva el acento.
- **Tipografía como sistema, no como decoración** — una sola familia para interfaz (**Geist Sans**) y una sola familia mono para datos (**Geist Mono**), de la misma fundición, con métricas armónicas entre sí. Los números tabulares se alinean siempre en columna.
- **Con foco en el dato** — códigos, SKU, cantidades y fechas técnicas se muestran en mono con cifras tabulares; son el protagonista visual de cada pantalla.
- **Microdetalle sin ruido** — transiciones cortas, un leve desplazamiento vertical al entrar en una ruta o al apuntar un mosaico pulsable, un hundimiento mínimo al pulsar. Elegancia hecha de detalles casi imperceptibles, no de efectos. El movimiento es constante y barato: **todo cambio de estado se interpola**, ninguno salta.
- **La misma app en cualquier dispositivo** — el layout no tiene una "versión móvil" aparte: la densidad, el aire y el tamaño de los destinos táctiles se derivan de tokens que cambian por breakpoint y por tipo de puntero. Las zonas seguras del dispositivo (notch, barra de gestos, controles de ventana) se respetan en todo el shell.
- **Cero modales** — cada acción (ver, crear, editar, eliminar, aprobar, anular) vive en **su propia página**. No existen ventanas emergentes, diálogos superpuestos ni confirmaciones flotantes.

### 1.1 Filosofía de profesionalismo

Rustock es una herramienta de negocio que representa la **seriedad de la operación logística** que administra, con una estética **contemporánea, precisa y con carácter propio**. El profesionalismo no está reñido con un diseño moderno y con personalidad: la interfaz es **técnica y elegante**, sin frivolidad.

Este compromiso se traduce en reglas declaradas e innegociables:

- **Tolerancia cero a los emojis.** ❌ **Emojis prohibidos en toda la interfaz, sin excepción ni justificación**: textos, botones, mensajes de éxito/error, notificaciones, estados, placeholders, documentación visible al usuario o cualquier otro canal de la UI. Un emoji es una expresión informal que rompe la seriedad, la consistencia y el estilo elegante de la aplicación. Donde otro producto usaría un emoji, Rustock usa un **icono del set oficial** (§6.13) o texto plano.
- **Iconografía profesional única y declarada.** Todos los símbolos de la interfaz provienen de **un único paquete de iconos moderno y profesional** diseñado para producto/business: **Lucide** (`lucide-react`). Es el set canónico, cerrado y obligatorio. Queda prohibido mezclar conjuntos de iconos, usar SVGs aislados de otros orígenes o introducir iconos de stock no derivados de Lucide.
- **Semántica de iconos estricta.** Cada icono tiene un significado único y estable en toda la aplicación (ver tabla canónica §6.13). Los iconos nunca se usan como decoración caprichosa: siempre comunican una acción, un estado o un dato.
- **Cero decoración lúdica.** Sin ilustraciones, sin mascotas, sin personajes, sin doodles. La confianza se transmite con datos claros, orden, precisión tipográfica y una elevación medida — no con entretenimiento.
- **Tono comunicacional profesional.** Los mensajes son directos, técnicos y respetuosos (ver §9.1). Sin chistes, sin exclamaciones innecesarias, sin lenguaje coloquial ni emotivo.

La "Filosofía de profesionalismo" es parte integral de la identidad visual: cualquier pantalla que no respete estas reglas se considera **defectuosa por diseño** y debe corregirse antes de ser aceptada.

---

## 2. Principios no negociables

1. **Cero modales, cero confirmaciones flotantes.** Toda decisión que modifique datos ocurre en una página dedicada con URL propia. La única superposición permitida es el **panel de un control de formulario** (lista del `Select`, calendario, reloj) y el panel de búsqueda global: no bloquean la página, pertenecen al control que los abrió y no mutan datos por sí mismos (§6.4.1).
2. **Esquinas suaves.** El `border-radius` usa exclusivamente los tokens de radio (§3.4): `--radius-sm/md/lg/xl/full`. Ningún componente usa esquinas a 0 ni radio arbitrario.
3. **Elevación solo con los tokens de sombra.** `box-shadow` se usa **exclusivamente** con `--shadow-xs/sm/md/lg` (§3.5); ninguna sombra literal, ningún efecto 3D, ningún `filter: blur` decorativo. El **único** uso permitido de `backdrop-filter` es el desenfoque de cristal en la barra superior al hacer scroll (§4.2) — en ningún otro lugar.
4. **Cero gradientes.** El color es plano en toda superficie; la profundidad se logra con `--shadow-*`, no con degradados.
5. **Todo es navegable y enlazable.** Cualquier elemento de datos es un enlace a su página de detalle. Cualquier página es alcanzable por URL directa (deep-link) y por enlaces internos.
6. **Una tarea por página.** Ver, crear, editar, eliminar y anular son páginas separadas.
7. **Consistencia absoluta.** El mismo componente se ve idéntico en todas las pantallas. Se usan exclusivamente los tokens y componentes definidos aquí.
8. **Primero legibilidad, después estética.** Contraste suficiente, tipografía clara, datos formateados.
9. **El usuario nunca pierde contexto.** Las rutas "hijas" (editar, eliminar) siempre son navegables hacia la página padre.

---

## 3. Tokens de diseño

> Los tokens son la única fuente de valores visuales. Están declarados como variables de diseño (CSS custom properties) y **nunca** se hardcodea un color, espaciado, sombra o medida en un componente.

### 3.1 Color

La paleta tiene tres familias con roles distintos y no intercambiables: **Iron** (superficies oscuras puntuales — landing, bloques de énfasis), **Rust** (el único acento de óxido) y **Gray** (neutros de contenido, con tinte tierra cálido, incluida la navegación). Esta separación es lo que da coherencia: el acento nunca se usa como fondo grande, y los neutros nunca cargan significado por sí mismos. La paleta evoca una caja de almacén de metal a medio oxidar.

**Escala Iron (superficies oscuras puntuales — landing, encabezados de énfasis; el sidebar ya no la usa, ver §4.3):**

| Token | Valor | Uso |
|---|---|---|
| `--color-ink-950` | `#150F0B` | Fondo de énfasis máximo (raro; solo bloques destacados) |
| `--color-ink-900` | `#1F1813` | Bandas oscuras del landing, bloques de énfasis puntuales |
| `--color-ink-800` | `#2C231B` | Hover sobre superficie oscura puntual |
| `--color-ink-700` | `#3D3226` | Bordes y separadores sobre superficie oscura |
| `--color-ink-600` | `#554635` | Bordes activos, iconos secundarios sobre oscuro |
| `--color-ink-400` | `#A18C78` | Texto secundario sobre superficie oscura |
| `--color-ink-200` | `#C9BCAB` | Texto secundario sobre superficie oscura puntual |
| `--color-ink-50` | `#F5F0E9` | Texto activo/hover sobre superficie oscura puntual |

**Escala Rust (acento único — óxido):**

| Token | Valor | Uso |
|---|---|---|
| `--color-blue-50` | `#FDF2EC` | Fondos de resaltado muy suave, insignias de información |
| `--color-blue-100` | `#FBE2D4` | Fondos de selección ligera, hover de filas |
| `--color-blue-200` | `#F6C7AB` | Bordes de componentes activos |
| `--color-blue-300` | `#EEA276` | Anillo de foco, acentos de información |
| `--color-blue-400` | `#DD7143` | Enlaces en hover |
| `--color-blue-500` | `#B7410E` | **Acción primaria, enlaces, elemento activo — el único acento** |
| `--color-blue-600` | `#9C370C` | Hover/pressed de acciones primarias |
| `--color-blue-700` | `#7C2C0A` | Acentos oscuros sobre fondos claros |
| `--color-blue-800` | `#5E2108` | Textos de énfasis en óxido oscuro |
| `--color-blue-900` | `#401605` | Reservado — no usar como fondo grande |

**Neutros (grises con tinte tierra cálido — contenido):**

| Token | Valor | Uso |
|---|---|---|
| `--color-gray-50` | `#FBFAF8` | Fondo general del área de contenido |
| `--color-gray-100` | `#F4F2EE` | Fondos alternados de filas, paneles secundarios |
| `--color-gray-200` | `#E8E4DD` | Bordes de componentes, separadores |
| `--color-gray-300` | `#D1CBC1` | Bordes en hover, inputs deshabilitados |
| `--color-gray-400` | `#AAA096` | Texto secundario, placeholders |
| `--color-gray-500` | `#81776B` | Texto atenuado, metadatos |
| `--color-gray-600` | `#5F574D` | Texto principal secundario |
| `--color-gray-700` | `#463F37` | Texto principal |
| `--color-gray-800` | `#302B25` | Texto de títulos, cabeceras |
| `--color-gray-900` | `#201C17` | Texto más oscuro, contenido crítico |

**Blanco / superficies:**

| Token | Valor | Uso |
|---|---|---|
| `--color-white` | `#FFFFFF` | Fondos de tarjetas, paneles, inputs |
| `--color-surface` | `#FFFFFF` | Superficie por defecto |
| `--color-surface-muted` | `#FBFAF8` | Superficie secundaria, fondo de página |
| `--color-surface-sunken` | `#F4F2EE` | Superficie hundida (bloques de código, celdas de resumen) |
| `--color-surface-inverse` | `#1F1813` | Superficie oscura (sidebar) — alias de `--color-ink-900` |

**Semántico (estados y acciones):**

| Token | Valor | Uso |
|---|---|---|
| `--color-success-500` | `#16A34A` | Entradas, saldo positivo, aprobado |
| `--color-success-600` | `#128A3E` | Hover/pressed de éxito |
| `--color-warning-500` | `#D97706` | Stock bajo, por vencer, pendiente |
| `--color-warning-600` | `#B45309` | Hover/pressed de advertencia |
| `--color-danger-500` | `#E11D48` | Eliminar, anular, error, merma |
| `--color-danger-600` | `#BE123C` | Hover/pressed de peligro |
| `--color-info-500` | `#B7410E` | Información, enlaces — alias de `--color-blue-500` |

**Fondos de estado (superficies tintadas para insignias y paneles de estado):**

| Token | Valor | Uso |
|---|---|---|
| `--color-success-bg` | `#EFFBF3` | Insignia "aprobado / entrada" |
| `--color-warning-bg` | `#FFF8EB` | Insignia "pendiente / bajo" |
| `--color-danger-bg` | `#FFF0F2` | Insignia "anulado / error / merma" |
| `--color-info-bg` | `#FDF2EC` | Insignia "información" |

**Texto sobre fondos tintados:**

| Token | Valor |
|---|---|
| `--color-success-text` | `#166534` |
| `--color-warning-text` | `#92400E` |
| `--color-danger-text` | `#9F1239` |
| `--color-info-text` | `#7C2C0A` |

**Regla de uso de familias:** `Iron` solo aparece en el landing y en bloques de énfasis puntuales explícitamente definidos en este documento — ya no en el sidebar (§4.3). `Rust` solo aparece en elementos activos, foco, enlaces y el botón primario. Ningún otro componente usa estas dos familias como fondo extenso.

> **Paleta configurable (Hito 21):** la paleta de tokens es **dinámica**. El
> backend expone 6 paletas predefinidas (Óxido, Bosque, Océano, Uva, Miel,
> Pizarra) y un modo claro/oscuro; la elección vive en la configuración de la
> empresa (global, ADMIN) y en las preferencias de cada usuario (con
> "heredar"). El tema activo se aplica en runtime sobrescribiendo las
> variables de `:root` (mapa token→valor generado en Rust); los componentes
> siguen consumiendo **solo** tokens. La identidad base "Rust & Iron"
> (neutros y superficies) se mantiene por modo; la paleta cambia el acento.
> El logo (`LogoMark`) se tiñe con el acento activo; el favicon
> (`public/rustock.svg`) conserva el óxido fijo porque no puede usar
> variables CSS del documento.

### 3.2 Tipografía

Una sola pareja tipográfica, de la misma fundición, para que UI y datos compartan altura de x, proporciones y ritmo — la coherencia tipográfica es en sí misma una señal de elegancia.

**Familia sans (UI principal):**

| Token | Valor |
|---|---|
| `--font-sans` | `"Geist", "Inter", "Segoe UI", system-ui, -apple-system, sans-serif` |

**Familia mono (datos):**

| Token | Valor |
|---|---|
| `--font-mono` | `"Geist Mono", "JetBrains Mono", "SFMono-Regular", Menlo, Consolas, monospace` |

**Escala tipográfica (rem):**

| Token | Tamaño | Línea-alto | Peso | Tracking | Uso |
|---|---|---|---|---|---|
| `--text-xs` | `0.75rem` | `1rem` | 400–500 | `--tracking-normal` | Metadatos, cabeceras de tabla, labels auxiliares |
| `--text-sm` | `0.875rem` | `1.25rem` | 400 | `--tracking-normal` | **Cuerpo por defecto de la aplicación**: celdas, campos, navegación |
| `--text-base` | `1rem` | `1.5rem` | 400–600 | `--tracking-snug` | Títulos de sección (`h3`), texto de lectura larga |
| `--text-lg` | `1.125rem` | `1.625rem` | 600 | `--tracking-snug` | Títulos de panel (`h2`) |
| `--text-xl` | `1.375rem` | `1.75rem` | 600 | `--tracking-tight` | Título de página en pantallas pequeñas |
| `--text-2xl` | `1.75rem` | `2.25rem` | 600 | `--tracking-tight` | **Título de página** (`h1`) |
| `--text-3xl` | `2.125rem` | `2.5rem` | 600 | `--tracking-tight` | Cifras destacadas y titulares del landing |

**Tokens de interletraje:** `--tracking-tight` (`-0.022em`, titulares), `--tracking-snug` (`-0.012em`, subtítulos), `--tracking-normal` (`0`, cuerpo), `--tracking-wide` / `--tracking-caps` (micro-texto que necesita respirar). Nunca se escribe un valor literal de `letter-spacing`.

**Reglas tipográficas:**
- Cuerpo y títulos → Geist Sans.
- **Solo** códigos, SKU, números de documento, cantidades, fechas ISO, identificadores y valores técnicos → Geist Mono.
- Todo número mostrado en mono usa cifras tabulares (`font-variant-numeric: tabular-nums`) para que las columnas de cantidades alineen perfectamente entre filas.
- Los títulos (`--text-lg` en adelante) llevan un tracking negativo sutil — nunca perceptible como "apretado", solo más afilado.
- Los códigos (SKU, ubicación, lote, número de movimiento) se muestran **siempre** en mono, con `--text-sm`.
- Los títulos usan color `--color-gray-900`; el cuerpo `--color-gray-700`; los metadatos `--color-gray-500`.
- **El peso máximo de la interfaz es `--fw-semibold` (600).** El 700 queda reservado al landing. Un título no necesita gritar: lo distingue el tamaño y el color, no la negrita.
- El cuerpo por defecto del documento es `--text-sm`: es la densidad que permite ver una operación completa sin desplazarse, y la que usan todas las herramientas de trabajo del sector. Los bloques de lectura larga (ayuda, manual) suben a `--text-base`.
- Las cifras tabulares están activas en `body`: cualquier columna numérica alinea sin depender de la clase del componente.
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
| `--space-5` | `1.25rem` (20px) | Ritmo de página en pantallas pequeñas |
| `--space-6` | `1.5rem` (24px) | Gaps entre paneles, padding de página |
| `--space-8` | `2rem` (32px) | Separación entre secciones |
| `--space-10` | `2.5rem` (40px) | Ritmo de página en pantallas muy anchas |
| `--space-12` | `3rem` (48px) | Espaciado de bloques grandes |
| `--space-16` | `4rem` (64px) | Márgenes de página |
| `--space-20` | `5rem` (80px) | Bandas del landing |

**Ritmo de página (tokens derivados).** Ninguna página declara su propio padding ni sus propios márgenes entre secciones: los hereda de estos cuatro tokens, que `responsive.css` redefine una sola vez por breakpoint.

| Token | Uso |
|---|---|
| `--page-padding-x` / `--page-padding-y` | Padding del lienzo de contenido, de la barra de filtros y de la barra superior |
| `--page-gap` | Salto entre el encabezado de página y su contenido |
| `--section-gap` | Salto entre secciones hermanas de una misma página |
| `--stack-gap` | Salto entre elementos dentro de una sección |

Reglas:
- El grid de layout usa múltiplos de 8 para anchos; múltiplos de 4 para espaciados internos.
- **Una página nunca declara su propio margen entre bloques**: el lienzo (`.content__inner > * + *`) aplica `--section-gap` a todos los hermanos y `--page-gap` después del encabezado. Escribir `mt-*` entre secciones es un defecto.
- Las zonas seguras del dispositivo (`--safe-top/right/bottom/left`) se suman siempre al padding del shell con `max()`; nunca se asume que valen cero.

### 3.4 Bordes y radio

El radio es **la firma visual** del sistema: esquinas suaves, medidas y consistentes, nunca duras ni exageradas. Se usan exclusivamente los tokens de radio; ningún componente declara un radio literal.

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

La elevación es un lenguaje deliberado: cada nivel de sombra corresponde a una distancia real entre capas, nunca a un capricho decorativo. Las sombras son siempre **suaves, difusas y con un tinte cálido** (nunca negro puro) para que se sientan como luz ambiental de taller, no como un recorte pegado encima.

| Token | Valor | Uso |
|---|---|---|
| `--shadow-xs` | `0 1px 2px rgba(21, 15, 11, 0.05)` | Inputs y botones en reposo (apenas perceptible) |
| `--shadow-sm` | `0 1px 3px rgba(21, 15, 11, 0.07), 0 1px 2px rgba(21, 15, 11, 0.04)` | Tarjetas y paneles en reposo |
| `--shadow-md` | `0 6px 16px -4px rgba(21, 15, 11, 0.12), 0 2px 4px -2px rgba(21, 15, 11, 0.06)` | Tarjetas en hover, filas seleccionadas, dropdowns |
| `--shadow-lg` | `0 16px 32px -8px rgba(21, 15, 11, 0.16), 0 4px 8px -4px rgba(21, 15, 11, 0.07)` | Toasts, menús flotantes de bajo compromiso (búsqueda global) |
| `--shadow-focus-ring` | `0 0 0 2px var(--color-white), 0 0 0 4px var(--color-blue-300)` | Anillo de foco de dos capas sobre cualquier fondo |
| `--shadow-glow-primary` | `0 0 0 1px rgba(183, 65, 14, 0.18), 0 6px 16px -2px rgba(183, 65, 14, 0.25)` | Reservado para énfasis puntual del landing. **No se usa en la aplicación**: ni el ítem activo del sidebar ni el botón primario llevan resplandor |
| `--topbar-scroll-bg` | `rgba(255, 255, 255, 0.85)` | Fondo de la barra superior al hacer scroll (única concesión de transparencia, §4.2) |
| `--scrim-overlay` | `rgba(21, 15, 11, 0.4)` | Velo de superposición del nav móvil |

> Los cuatro últimos tokens los redefine el tema activo en runtime (Hito 21):
> las sombras se atenúan y oscurecen en modo oscuro, y los fondos
> translúcidos cambian de tono con el modo.

**Reglas:**
- `box-shadow` **solo** con estos tokens. Prohibido cualquier valor de sombra literal o `box-shadow` negro puro.
- Cada componente declara **un** nivel de sombra en reposo y, como máximo, **un** nivel superior en hover/activo (nunca salta más de un nivel).
- Los elementos que viven "en el flujo" de la página sin jerarquía especial (celdas de tabla, texto, badges, tarjetas de sección, tablas) **no** llevan sombra. En la aplicación solo elevan: los mosaicos pulsables en hover, los toasts, el panel de búsqueda global, los tooltips y el drawer móvil.
- `backdrop-filter: blur(8px)` está permitido **únicamente** en la barra superior cuando el contenido hace scroll debajo de ella (§4.2); en cualquier otro lugar queda prohibido.
- Sin gradientes en ningún caso: la profundidad es sombra + superficie, nunca degradado de color.

### 3.6 Alturas, anchos y medidas

| Token | Valor | Uso |
|---|---|---|
| `--size-xs` | `1.5rem` (24px) | Iconos pequeños |
| `--size-sm` | `2rem` (32px) | Botones compactos, iconos |
| `--size-md` | `2.5rem` (40px) | Medidas de bloque (avatares grandes, iconos de estado vacío) |
| `--size-lg` | `3rem` (48px) | Medidas de bloque grandes |
| `--control-height-sm` | `1.75rem` (28px) | Controles compactos (`btn--sm`, acciones de fila) |
| `--control-height` | `2.125rem` (34px) | **Altura estándar de controles**: botones, acciones de la barra superior, ítems de navegación |
| `--control-height-lg` | `2.5rem` (40px) | Campos de formulario (input, select, textarea) |
| `--tap-target` | `2.75rem` (44px) | Destino táctil mínimo (drawer móvil, listas en pantalla táctil) |
| `--topbar-height` | `3rem` (48px) | Barra superior |
| `--width-sidebar` | `15rem` (240px) | Barra lateral |
| `--width-sidebar-compact` | `4rem` (64px) | Barra lateral en modo compacto |
| `--width-max-content` | `78rem` (1248px) | Ancho máximo del área de contenido |
| `--width-prose` | `46rem` (736px) | Ancho máximo de un párrafo de lectura |
| `--width-form` | `36rem` (576px) | Ancho máximo de formularios de una columna |
| `--width-detail-column` | `18rem` (288px) | Columna de metadatos en detalle |

Reglas:
- La altura estándar de los controles de acción es `--control-height`; la de los campos de formulario es `--control-height-lg`. No se mezclan alturas distintas en la misma fila.
- Con puntero grueso (`@media (pointer: coarse)`) `--control-height` y `--control-height-sm` crecen automáticamente: la misma hoja de estilos sirve para ratón y para dedo, sin componentes duplicados.

### 3.7 Densidad y jerarquía visual

- Densidad media: cómoda para lectura y suficiente para mostrar muchos registros.
- Jerarquía por: tamaño de fuente → peso → color → elevación → espaciado → fondo. (En ese orden de prioridad; primero tipografía, la sombra se usa antes que el color aislado, nunca al revés.)
- Un nivel de jerarquía se comunica con máximo dos señales a la vez.

### 3.8 Zonas de estado / color semántico

- `success` → entradas, aprobado, saldo positivo, conciliado.
- `warning` → stock bajo, por vencer, pendiente de aprobación.
- `danger` → anulado, merma, error, eliminar.
- `info` → información, enlaces, ayudas (comparte hue con `signal`).
- Los estados **nunca** se comunican solo con color: siempre acompañan un ícono y/o texto (ver §10 Accesibilidad).

### 3.9 Movimiento

El movimiento no decora: **explica continuidad**. Su trabajo es que un cambio de estado o de ruta se lea como una transformación de lo que ya estaba, no como un salto a otra pantalla.

| Token | Valor | Uso |
|---|---|---|
| `--duration-instant` | `90ms` | Hover y `:active` de ítems de navegación, filas y botones |
| `--duration-fast` | `150ms` | Cambios de color, borde y opacidad de controles |
| `--duration-base` | `220ms` | Entradas de elementos: toasts, avisos, drawer, colapso del sidebar |
| `--duration-page` | `260ms` | Entrada del lienzo al cambiar de ruta |
| `--duration-slow` | `380ms` | Entrada escalonada de los grupos de navegación |
| `--ease-standard` | `cubic-bezier(0.2, 0, 0, 1)` | Curva por defecto de transiciones de estado |
| `--ease-out` | `cubic-bezier(0.16, 1, 0.3, 1)` | Curva de entrada: rápida al aparecer, suave al asentarse |
| `--ease-in-out` | `cubic-bezier(0.65, 0, 0.35, 1)` | Movimientos que van y vuelven |

**Reglas:**
- Cada navegación anima el lienzo una sola vez (`.page-enter`, aplicado por `AppShell` con la ruta como clave). Un cambio de filtro **no** reanima nada: solo cambia la URL, no la página.
- La animación nunca es el canal principal de una información: `prefers-reduced-motion: reduce` desactiva globalmente animaciones y transiciones, y la interfaz sigue siendo completa y legible.
- Nada se mueve más de 8px ni dura más de 400ms. No hay rebotes, ni rotaciones decorativas, ni escalas mayores a 1.
- El único desplazamiento en hover permitido es el de un mosaico pulsable (`-2px`). Los botones no se desplazan: se hunden `scale(0.975)` al pulsarse.

---

## 4. Layout de la aplicación

### 4.1 Estructura general

```
┌──────────────┬─────────────────────────────────────────────┐
│              │  Barra superior (breadcrumb + búsqueda + usuario) │
│  Sidebar     ├─────────────────────────────────────────────┤
│  lienzo claro│                                              │
│  (navegación │   Área de contenido — lienzo claro           │
│  principal)  │   (una sola tarea por página)                │
│              │                                              │
└──────────────┴─────────────────────────────────────────────┘
```

- **Barra superior**: fija, altura `--topbar-height` (48px), fondo `--color-surface`, sin borde en reposo (se funde con el contenido). Al hacer scroll, adopta `backdrop-filter: blur(12px)` sobre `--topbar-scroll-bg` con una hairline inferior — el único uso de blur permitido en toda la interfaz.
- **Sidebar**: fija, ancho `--width-sidebar`, fondo `--color-gray-50` — un lienzo **recesado** frente al contenido. **No lleva borde derecho**: el escalón de superficie ya declara la separación, y una línea encima sería redundante.
- **Área de contenido**: fondo `--color-surface` (blanco), scroll vertical, padding `--page-padding-*`, ancho máximo `--width-max-content` centrado.
- La barra superior y la sidebar **no** flotan sobre el contenido: ocupan su propio espacio (nada de overlay ni scroll separado sobre ellas en desktop).
- El sidebar ocupa **todo el alto de la ventana** (de arriba a abajo); la barra superior **no** cruza por encima de él — solo cubre el ancho del área de contenido, a la derecha del sidebar (patrón de grid: `"sidebar topbar" / "sidebar content"`, no `"topbar topbar" / "sidebar content"`).

### 4.2 Barra superior

La marca no vive aquí: vive en la cabecera del sidebar, donde ancla la navegación. La barra superior es **solo orientación y acceso**, y por eso está casi vacía.

Contenido (de izquierda a derecha):
1. **Botón de navegación** (solo en móvil: abre el drawer).
2. **Breadcrumbs** del nivel actual (ver §4.5), con los controles de historial atrás/adelante.
3. **Búsqueda global** (disparador del command palette, `Ctrl+K`) — ver §6.10.
4. **Indicador de alertas activas** (contador en insignia `--color-danger-500`, enlace a página de alertas).
5. **Usuario actual** (avatar circular, enlace a su página de perfil).

Las acciones de la barra (alertas, usuario, historial) comparten **un solo lenguaje**: cuadrado de `--control-height`, sin fondo ni borde en reposo, fondo `--color-gray-100` y texto `--color-gray-900` al apuntarlas. Ninguna lleva acento de color en reposo.

Al hacer scroll en el contenido, la barra adopta el efecto de cristal descrito en §4.1: es la única concesión de transparencia de todo el sistema, y su función es puramente de legibilidad (separar el contenido que se desliza debajo).

Cuando la aplicación corre con superposición de controles de ventana (PWA instalada o ventana Tauri sin decoración), la barra superior se convierte en la **zona de arrastre** de la ventana y reserva el área de los botones nativos vía `env(titlebar-area-*)`; sus controles quedan marcados como `no-drag` (ver §12).

### 4.3 Barra lateral de navegación

Ítems de navegación principal, agrupados:

- **Operación**
  - Dashboard
  - Movimientos
  - Captura rápida
  - Inventario físico
  - Alertas
- **Catálogos**
  - Almacenes
  - Zonas
  - Pasillos
  - Racks
  - Secciones
  - Ubicaciones
  - Cajas
  - Productos
  - Lotes
  - Categorías
  - Unidades de medida
  - Proveedores
  - Clientes
- **Análisis**
  - Reportes
- **Administración**
  - Usuarios y roles
  - Configuración

Reglas:
- El sidebar es un lienzo **recesado** (`--color-gray-50`) sobre el contenido blanco, **sin borde derecho**. Títulos de grupo en `--text-xs`, peso medio, `--color-gray-400`, en caja normal — no en mayúsculas: un rótulo de grupo no necesita gritar.
- Los ítems inactivos usan texto `--color-gray-600` y el icono `--color-gray-400`: el icono acompaña, no compite con la palabra.
- **El ítem activo no lleva acento de color.** Usa fondo `--color-gray-200`, texto `--color-gray-900` y peso medio: es el mismo lenguaje que el hover, un escalón más marcado. El óxido queda íntegro para la acción primaria y el foco (§1).
- Hover de un ítem inactivo: fondo `--color-gray-100`, texto `--color-gray-900` — sin sombra, solo cambio de superficie, en `--duration-instant`.
- Alto de ítem `--control-height`, radio `--radius-md`, gap interno `--space-2`. Los ítems de un mismo grupo casi se tocan (1px); los grupos se separan con `--space-4`.
- Cada ítem es un **enlace real** (no un botón).
- El control de colapso vive en el borde derecho del propio drawer y **aparece al apuntar la navegación** (o al recibir foco de teclado): en reposo no hay ningún control flotando sobre el lienzo.
- En móvil, la navegación se presenta como **drawer** deslizante desde la izquierda (máx. 84vw) con elevación `--shadow-lg` y velo `--scrim-overlay`. Ahí los ítems crecen a `--tap-target` y a `--text-base`: el drawer se maneja con el pulgar, no con un cursor.

### 4.4 Área de contenido

- Fondo `--color-surface` (blanco), padding `--page-padding-y` / `--page-padding-x`, más las zonas seguras del dispositivo.
- Contenido máximo `--width-max-content`, centrado con `margin: 0 auto`.
- Las páginas se componen de bloques en flujo — encabezado de página, avisos, secciones, paginación — **sin envoltorio propio y sin márgenes propios**: el lienzo aplica `--section-gap` entre hermanos y `--page-gap` tras el encabezado (§3.3).
- El lienzo se anima una vez por navegación (`.page-enter`, §3.9) y reserva `--space-16` de aire al final para que la última fila de una tabla nunca quede pegada al borde inferior de la ventana.

### 4.5 Migas de pan (breadcrumbs)

- Ubicadas en la barra superior, justo tras la marca.
- Formato: `Almacenes / Almacén Central / Editar`.
- Cada nivel es un enlace salvo el actual.
- Siempre reflejan la **ruta de profundidad** real (ver §5), lo que garantiza que el usuario siempre pueda volver un nivel arriba.
- Separador: `/` (slash) en `--color-gray-400`, texto `--text-sm`.

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
- Los enlaces dentro de tablas usan el estilo "texto óxido, sin subrayado, hover con subrayado" (o se marca la fila entera como clickable con navegación).
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

- Cada componente es **suave y redondeado** (`--radius-md` o superior), con borde sutil de 1px, fondo liso y, cuando corresponde a una capa elevada, un nivel de `--shadow-*` (§3.5).
- Los componentes tienen **estados** explícitos: `default`, `hover`, `focus`, `disabled`, `error`, `active`.
- No existen variantes "vidriosas" ni con degradado; la única concesión de transparencia del sistema es la barra superior en scroll (§4.2).
- Los componentes de control miden `--size-md` (40px) de alto por defecto.

### 6.2 Botones

**Estructura:** fondo liso, radio `--radius-md`, borde 1px, texto `--text-sm` peso medio, padding `0 --space-3`, alto `--control-height`. Icono opcional de 16px a la izquierda. **Ningún botón lleva sombra**: la jerarquía la marca el relleno, no la elevación.

| Variante | Fondo | Borde | Texto | Uso |
|---|---|---|---|---|
| `primary` | `--color-blue-500` | transparente | blanco | Acción principal de la página |
| `secondary` | `--color-surface` | `--color-gray-200` | `--color-gray-700` | Acción secundaria / cancelar |
| `danger` | `--color-danger-500` | transparente | blanco | Eliminar, anular, merma |
| `ghost` | transparente | transparente | `--color-gray-600` | Acciones de fila y de bajo énfasis |
| `link` | transparente | sin borde | `--color-blue-500` | Enlace con apariencia de botón |

La variante `ghost` es **neutra en reposo**: no gasta acento en una acción terciaria. El color solo aparece bajo el cursor.

**Estados:**
- `hover`: `primary` → `--color-blue-600`; `secondary` → fondo `--color-gray-100` + borde `--color-gray-300`; `danger` → `--color-danger-600`; `ghost` → fondo `--color-gray-100` y texto `--color-gray-900`. El hover es **solo de superficie**: el botón nunca se desplaza y su texto nunca cambia de color (salvo `ghost`, que pasa de gris medio a gris fuerte, y `link`).
- `focus`: `--shadow-focus-ring` (anillo de dos capas, §3.5), sin desplazamiento.
- `disabled`: opacidad `0.45`, cursor `not-allowed`, sin estados hover.
- `active` (presionado): `transform: scale(0.975)` en `--duration-instant`. Es la única confirmación física del sistema y es idéntica con ratón y con dedo.

**Reglas:**
- Una página tiene **un solo** botón `primary` (la acción principal).
- Las acciones destructivas **solo** usan `danger` y viven en la página de confirmación de eliminación/anulación.
- Los botones dentro de tablas se muestran como `ghost`/`link` (acciones ligeras); las acciones fuertes viven en la página de detalle.
- Los botones de icono usan `--radius-md`, no píldora: la forma de un botón es siempre la misma, cambie o no su contenido.
- El texto del botón **nunca** cambia de color ni se subraya en hover en ninguna variante (salvo `link`). Esto aplica también a `ButtonLink`: al renderizar un `<a>`, su estilo de hover propio tiene prioridad sobre el `a:hover` global (§6.3) para conservar el color del texto — p. ej. blanco sobre `primary`/`danger`.

### 6.3 Enlaces

- Texto `--color-blue-600`, sin subrayado; `hover` → `--color-blue-500` + subrayado.
- Con foco: `--shadow-focus-ring` a ras del texto.
- Dentro de párrafos pueden subrayarse siempre para ser claramente distinguibles.

### 6.4 Campos de formulario (input, select, textarea, fecha)

**Estructura común:**
- Alto `--control-height-lg`, fondo `--color-surface`, radio `--radius-md`, borde `1px --color-gray-200`, texto `--text-sm`, padding `0 --space-3`.
- **Label** `--text-sm` peso medio `--color-gray-700`, con `--space-1` de separación.
- **Mensaje de ayuda** `--text-xs` `--color-gray-500` bajo el campo.
- **Mensaje de error** `--text-xs` `--color-danger-600` con ícono.

**Estados:**
- `default` → borde `--color-gray-200`, sin sombra.
- `hover` → borde `--color-gray-300`.
- `focus` → borde `--color-blue-500` + `--shadow-focus-ring`.
- `error` → borde `--color-danger-500` + mensaje de error.
- `disabled` → fondo `--color-gray-100`, borde `--color-gray-200`, opacidad 0.6.
- `readonly` → fondo `--color-surface-sunken`, sin estado hover.

**Campos específicos:**
- **Input de código/SKU** (códigos de ubicación, SKU, lote): se muestra en **mono** con cifras tabulares.
- **Select**: mismo estilo; la flecha es un ícono propio, no una pseudo-flecha del navegador.
- **Date**: se usan pickers propios, estilo plano y redondeado con `--shadow-sm`, sin calendario flotante que ocupe la pantalla; la selección de fecha se abre en un panel en línea dentro del formulario.
- **Número/cantidad**: texto mono con cifras tabulares, alineado a la derecha cuando representa cantidad.
- **Textarea**: `--text-sm`, min-height `--space-16`, padding vertical `--space-2`, redimensionable solo en vertical.

### 6.4.1 Controles con panel propio (select, fecha, hora)

El menú de un `<select>`, el calendario de un `<input type="date">` y la rueda de un `<input type="time">` son el único fragmento de interfaz que el navegador no deja vestir: tipografía, colores, densidad e idioma los decide el sistema operativo, y cambian entre Linux, Windows, macOS, Android e iOS. En una aplicación cuya identidad es la consistencia absoluta, eso es un agujero.

Rustock los sustituye por tres controles propios — `Select`, `DatePicker`, `TimePicker` — construidos con los mismos tokens que el resto del sistema.

**El control nativo no desaparece.** Queda oculto (fuera de vista y fuera del orden de tabulación, nunca con `display: none`) como **fuente de verdad**:

- Conserva el valor en el formato que espera el backend (`value` del select, ISO en fecha y hora).
- Mantiene intacto el registro de `react-hook-form`: `{...register()}`, `reset()` y `setValue()` siguen funcionando sin que la página sepa nada del panel.
- Mantiene el envío nativo del formulario y el autocompletado del navegador.
- En el `Select`, además, es la fuente de la **lista de opciones**: el panel se construye leyendo sus `<option>`, vengan de la prop `options` o de `children`.

El panel visible es una capa de presentación sobre un control real, no un reemplazo.

**El desvío vive en `Input`, no en las páginas.** `<Input type="date">`, `type="time"` y `type="datetime-local"` se enrutan solos a `DatePicker` / `TimePicker`. Así ninguna pantalla puede olvidarse y acabar mostrando el control del sistema operativo.

**Reglas del panel flotante** (`.panel-flotante`):
- Anclado al control que lo abrió, con posición fija recalculada al desplazar o redimensionar la ventana; se voltea hacia arriba cuando no cabe debajo.
- No bloquea la página: no hay velo, el resto sigue visible y utilizable.
- Se cierra con `Escape` o al pulsar fuera, y **devuelve el foco al disparador**.
- **Un panel flotante nunca abre otro dentro.** Por eso el calendario de `datetime-local` incrusta las columnas de hora en línea (`ColumnasHora`) en vez de abrir el `TimePicker`.
- El disparador usa `role="combobox"` con `aria-expanded` / `aria-controls`; la lista usa `role="listbox"` con `aria-activedescendant`. Teclado completo: flechas, `Home`/`End`, `Enter`, `Escape`, `Tab` y salto por escritura.
- Con puntero grueso los destinos del panel crecen a `--tap-target`.

### 6.5 Tablas y listados

Una tabla **no es una caja**: es texto alineado sobre el lienzo. No lleva marco exterior, ni fondo propio, ni sombra, ni esquinas redondeadas. Lo único que dibuja son las hairlines que guían el ojo por las filas.

**Estructura:**
- Sin contenedor visible: la tabla se apoya directamente sobre el lienzo de la página.
- **Header**: `--text-xs` peso medio en caja normal (**nunca mayúsculas**), `--color-gray-500`, fondo `--color-surface`, borde inferior `1px --color-gray-200`.
- **Cabecera fija — solo en la tabla virtualizada.** `.table-wrap` declara `overflow-x: auto` para el desbordamiento horizontal, y por especificación eso hace que `overflow-y` compute a `auto`: ese contenedor pasa a ser el *scrollport* de cualquier `position: sticky` de su interior. En la tabla normal ese contenedor no tiene scroll vertical propio (crece con su contenido), así que una cabecera pegajosa ahí no se ancla al lienzo — se queda flotando sobre las filas. Solo `.table-wrap--virtual` tiene scroll vertical propio y ahí la cabecera sí se fija (`top: 0`). **No se debe reintroducir `sticky` en `.table th` sin quitar antes el `overflow` del contenedor.**
- **Filas**: `--text-sm`, texto `--color-gray-700`; borde inferior `1px --color-gray-100`.
- **Hover de fila**: fondo `--color-gray-50` — **neutro**. El acento de óxido no se gasta en un hover.
- **Fila clickeable**: la fila navega al detalle (cursor pointer).
- **Selección múltiple** (cuando aplica): checkbox a la izquierda; las filas seleccionadas se marcan con fondo `--color-blue-50` y borde izquierdo 2px `--color-blue-500` — esa sí es una decisión del usuario y merece el acento.

**Columna de acciones:**
- Iconos `ghost`: ver, editar, eliminar (solo si el usuario tiene permiso).
- Las acciones están **siempre presentes**, atenuadas al 65%, y ganan opacidad completa cuando la fila recibe cursor o foco. Con puntero grueso se muestran siempre al 100%: en una pantalla táctil no existe el hover, y una acción que solo aparece al pasar el ratón es una acción invisible.
- Cada acción navega a su página dedicada (ver §5).

**Reglas:**
- Toda tabla tiene cabecera de columnas **ordenables** cuando aplica (clic en la columna alterna asc/desc; el orden actual se marca con un chevron plano).
- Las columnas numéricas de cantidad se alinean a la derecha en mono con cifras tabulares.
- Los códigos/SKU/números se muestran en mono.
- El listado incluye controles de paginación (ver §7.1) y un resumen "Mostrando X–Y de Z".

### 6.6 Tarjetas y paneles

Por defecto una `Card` **no es una caja**: es una **sección del documento**, separada de sus hermanas por aire y presentada por su título. Sin fondo, sin borde, sin padding, sin sombra. La caja se reserva para lo que de verdad se levanta del lienzo.

| Variante | Aspecto | Uso |
|---|---|---|
| por defecto | transparente, sin borde ni padding | Secciones de una página ("Datos generales", "Saldo por lote", "Historial") |
| `muted` | `--color-surface-muted` + borde `1px --color-gray-200` + padding `--space-4` | Bloques de contexto, notas y resúmenes que acompañan sin interrumpir |
| `interactive` | `--color-surface` + borde `1px --color-gray-200` + padding `--space-4` | Mosaicos pulsables que llevan a otra página |

- Título de sección: `--text-base` semibold `--color-gray-900`, con `--space-3` de aire debajo y **sin borde inferior** — el espacio ya separa el título de su contenido.
- Solo la variante `interactive` eleva: sube a `--shadow-md` y se desplaza `-2px` en hover, y vuelve a `--shadow-xs` al pulsarse. La sombra aparece únicamente como respuesta a la interacción, nunca en reposo.

### 6.7 Insignias y etiquetas

- Fondo tintado + texto tintado (ver tabla 3.1), padding `0 --space-2`, alto `--size-xs`, `--text-xs`, radio `--radius-sm`, **sin borde**: la superficie tintada ya declara el estado y el contorno solo añadiría ruido en una columna de veinte filas.
- Se usan para estados: `Aprobado`, `Pendiente`, `Anulado`, `Borrador`, `Entrada`, `Salida`, `Stock bajo`, `Vence pronto`.
- Ícono pequeño opcional (12px) cuando refuerza el estado.

### 6.8 Encabezados de página

Cada página abre con su **bloque de título**, como un documento. No es una repetición del breadcrumb: el breadcrumb es *chrome* de navegación —desaparece en móvil y vive fuera del lienzo—, mientras que el título es el ancla de lectura de la página y el punto de referencia al volver de una ruta hija.

**Estructura:**
- `h1` visible en `--text-2xl` semibold `--color-gray-900`, con `--tracking-tight` (`--text-xl` en móvil).
- `description` opcional: una línea en `--text-sm` `--color-gray-500`, acotada a `--width-prose`, que explica qué administra la página.
- `actions` alineadas a la derecha en la misma línea; en móvil el bloque se apila y la acción principal ocupa el ancho completo — es el destino del pulgar.
- Tras el bloque, el lienzo aplica `--page-gap` (§3.3): el encabezado nunca declara su propio margen.

Para listados, la acción de "crear" vive en la barra de filtros pegajosa (§7.1) y no se duplica aquí.

### 6.9 Acciones de fila y de página

- **Acciones de fila** (tablas): iconos `ghost` ver/editar/eliminar → navegan a las páginas dedicadas.
- **Acciones de página** (detalle): botones `primary`/`secondary`/`danger` según la tarea → navegan a `/.../editar`, `/.../eliminar`, etc.
- Nunca existe una acción que haga dos cosas (ej. "eliminar y volver") en un solo paso sin su página de confirmación.

### 6.10 Búsqueda global y barra de filtros

**Búsqueda global** (barra superior):
- Input con ícono de lupa, radio `--radius-full` (píldora); al escribir, despliega un panel de resultados con `--shadow-lg` agrupados por tipo (Productos, Ubicaciones, Movimientos, Lotes, Proveedores, Clientes).
- Resultados en **mono** para códigos; navegan al detalle de cada resultado.
- El Enter ejecuta la búsqueda y navega a la página de búsqueda global (listado agregado).

> **Implementación (command palette):** la búsqueda global se materializa como
> el **command palette "Buscar en todo Rustock"** (`Ctrl/Cmd+K` o clic en la
> píldora): un panel flotante sobre la app que busca **todo** — páginas, rutas,
> acciones de creación (por rol), reportes, ayuda/glosario y datos de negocio
> en vivo (catálogos, movimientos, sesiones, alertas), cada resultado con su
> ruta de detalle. Es navegación pura (nunca muta datos), así que convive con
> la regla de cero modales (§5.1): no es un diálogo de confirmación ni de
> edición, es el panel de resultados que esta sección ya especificaba.


**Barra de filtros (listados):**
- Fila de controles sobre la tabla: campo de búsqueda `q`, selector de campo, operador y valor para filtros avanzados.
- Los filtros activos se muestran como badges píldora removibles bajo la barra.
- Se aplican de inmediato o con botón "Aplicar" (consistente dentro del mismo listado).
- Orden, búsqueda, filtros y paginación se reflejan en la **URL** (query params) para permitir deep-link y compartir estados de filtrado.

### 6.11 Estados vacíos

- Sin datos: ícono redondeado (`--radius-xl`) de 32px sobre `--color-blue-50` + mensaje "No hay X todavía" + botón/enlace para crear el primero.
- Sin resultados con filtros: ícono + "No se encontraron resultados" + botón "Limpiar filtros".
- **Skeleton de carga**: bloques redondeados (`--radius-sm`), `--color-gray-100`, sin shimmer ni brillo; se anima solo con opacidad pulsante sutil (o estática).

### 6.12 Notificaciones (toasts)

- **Usados solo para feedback transitorio** (no para confirmaciones de decisión):
  - "Movimiento aprobado" → éxito.
  - "No se pudo guardar: campo obligatorio faltante" → error.
- Se ubican en la esquina inferior derecha, fondo `--color-gray-800` o el color semántico, texto blanco, radio `--radius-lg`, `--shadow-lg`.
- Desaparecen solos (5s) o con botón cerrar.
- **Nunca** sustituyen una página de confirmación (eliminar, anular, aprobar siguen siendo páginas).

### 6.13 Iconografía

**Set oficial (obligatorio y único):**

| Token | Valor |
|---|---|
| `--icons-set` | **Lucide** — paquete `lucide-react` |

**Reglas del set:**
- Todo icono proviene de **Lucide** (`lucide-react`). Es el único set permitido; queda prohibido importar iconos de otros paquetes, SVGs sueltos o iconos custom no derivados de Lucide (§1.1).
- Estilo **lineal** (stroke), grosor de trazo consistente, sin relleno, sin gradiente. Lucide por defecto cumple con la estética del sistema.
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
| Menú (navegación) | `Menu` |
| Cerrar panel / dismiss | `X` |
| Subir (reordenar) | `ChevronUp` |
| Bajar (reordenar) | `ChevronDown` |
| Pantalla completa | `Maximize2` |
| Salir de pantalla completa | `Minimize2` |
| Cuadrícula (mapa) | `Grid3x3` |
| Encuadrar (mapa) | `Scan` |

> Regla de mantenimiento: si una acción necesita un icono nuevo, primero se busca en Lucide; si no existe equivalente, **no se añade** un icono custom salvo aprobación explícita del diseño, y queda documentado aquí.

---

## 7. Patrones de página

### 7.1 Página de listado

Estructura (§6.8 — sin título/descripción visibles, el breadcrumb de la topbar ya identifica la página):
1. Toolbar único bajo la barra superior: búsqueda/filtros a la izquierda + botón "Nuevo..." primario a la derecha (una sola fila, `FilterBar` con `action`).
2. Tabla (§6.5) con columnas ordenables, filas clickeables y columna de acciones.
3. Paginación (Anterior/Página X de Y/Siguiente) + resumen de registros.

Reglas:
- Los filtros/orden/búsqueda viven en la URL.
- El "Nuevo" navega a `/recursos/nuevo`.
- Cada fila navega a `/recursos/:id`.

### 7.1.1 Pantallas de acceso (login y alta del administrador)

Sin tarjeta y sin caja: una columna estrecha (`22rem`) centrada sobre el lienzo blanco. En esta pantalla no existe ninguna otra tarea que pueda competir con el formulario, así que no hace falta encerrarlo en un recuadro para señalarlo — encerrarlo solo añadiría un borde que no separa nada.

Composición, de arriba a abajo: marca (enlace al landing) · título `h1` · una línea de descripción · formulario en `.form-stack` · panel de error si lo hay · acción principal a ancho completo (`size="lg"`) · pie con la otra ruta de acceso, separado por una hairline.

- El aire entre campos lo pone `.form-stack`, nunca un margen en cada `Field`.
- Las contraseñas usan `PasswordInput`: campo con interruptor de visibilidad, porque escribir a ciegas es la causa más común de un acceso fallido, sobre todo en un teclado táctil de almacén.
- El primer campo recibe el foco al montar.

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
- **Atajos** (documentados en la página de configuración/ayuda): `Ctrl/Cmd+K` abre el command palette "Buscar en todo Rustock" (§6.10); `/` enfoca la búsqueda global; `N` nueva entidad en listados.
- Foco visible en **todos** los elementos interactivos (`--shadow-focus-ring`).

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

- Transiciones: `background-color`, `border-color`, `color`, `opacity` y `box-shadow`, con duración `150–180ms` y easing `cubic-bezier(0.2, 0, 0, 1)` — entrada rápida, salida suave, sin rebote.
- El único desplazamiento permitido es el de **tarjetas interactivas** al hacer hover (§6.6, `translateY` de 1–2px); los **botones nunca se desplazan** (§6.2).
- Sin animaciones de entrada/salida de páginas.
- Sin paralaje, sin partículas, sin easing con rebote ("bounce") ni efectos elásticos.

---

## 9. Consistencia total

### 9.1 Reglas de copy

- La UI está en **español**; títulos en mayúscula de oración (solo primera letra).
- Botones: verbo en infinitivo (Crear, Guardar, Eliminar, Anular, Aprobar, Cerrar).
- Mensajes claros y cortos, sin jerga técnica salvo los propios del dominio (SKU, lote, ubicación).
- Errores: "Qué pasó + qué hacer", ej. "Saldo insuficiente en RACK-A1-N2-P3: hay 5, se pidieron 8."

### 9.2 Reglas de datos mostrados

- Códigos, SKU, números de documento, ids → **mono**.
- Cantidades → **mono**, cifras tabulares, alineadas a la derecha, con su UOM abreviada.
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
- ❌ `box-shadow` fuera de los tokens `--shadow-*` (§3.5); ningún valor literal ni sombra negra pura.
- ❌ Gradientes en cualquier superficie.
- ❌ `backdrop-filter`/`filter: blur` en cualquier lugar salvo la barra superior en scroll (§4.2).
- ❌ Modales, drawers, popovers, confirmaciones flotantes.
- ❌ Alertas nativas (`alert`, `confirm`, `prompt`).
- ❌ Textos con `font-family` distinto a los tokens (`--font-sans`/`--font-mono`).
- ❌ Colores fuera de la paleta declarada; uso de `--color-ink-*` o `--color-blue-*` como fondo extenso fuera del landing/acento (§3.1).
- ❌ Elementos "decorativos" sin función (imágenes, ilustraciones, doodles, mascotas).
- ❌ **Emojis en la UI. Tolerancia cero: ningún carácter emoji en textos, botones, mensajes, estados, placeholders o notificaciones (§1.1).**
- ❌ **Iconos fuera del set Lucide** (`lucide-react`): ningún SVG suelto, icono de otro paquete, icono custom o de stock (§6.13).
- ❌ **Iconos con significado inconsistente**: un icono se usa siempre para la misma acción; no se reutiliza con otro sentido (§6.13).
- ❌ Tono coloquial, emotivo o lúdico en mensajes; sin exclamaciones innecesarias ni chistes (§1.1, §9.1).
- ❌ Animaciones exóticas, parallax, partículas, easing con rebote.

---

## 10. Accesibilidad

- Contraste: todo texto cumple WCAG AA (mínimo 4.5:1 en texto normal; 3:1 en texto grande y UI) — incluyendo el texto blanco del ítem activo del sidebar sobre `--color-blue-500`.
- El color nunca es el único canal: estados con ícono + texto.
- Elementos interactivos con área de 40px mínimo (ya cubierto por `--size-md`).
- Etiquetas `label` asociadas a cada campo (`for`/`id`).
- Tablas con `<th scope="col">`, captions donde aporte.
- Iconos decorativos con `aria-hidden`; iconos informativos con `aria-label`.
- Rutas y páginas son navegables solo con teclado; el foco es siempre visible (`--shadow-focus-ring`).
- Breadcrumbs y enlaces "skip to content".
- `prefers-reduced-motion: reduce` desactiva el desplazamiento de hover (§8.5); las transiciones de color permanecen.

---

## 11. Checklist de calidad visual

Antes de dar una pantalla por terminada, debe cumplir:
- [ ] Radio suave en todos los elementos visibles (tokens `--radius-sm/md/lg/xl/full`, nunca 0).
- [ ] Sombras solo de los tokens `--shadow-*`; sin gradientes, sin blur fuera de la barra superior.
- [ ] Ninguna sombra en reposo: solo elevan mosaicos pulsables en hover, toasts, palette, tooltips y drawer.
- [ ] El acento de óxido aparece **solo** en acción primaria, foco, enlaces y fila seleccionada — nunca en un hover ni en la navegación activa.
- [ ] Ninguna sección declara márgenes propios: el ritmo lo pone el lienzo (`--section-gap` / `--page-gap`).
- [ ] Bloque de título visible en toda página (`PageHeader` con `title` y, cuando aporte, `description`).
- [ ] Zonas seguras del dispositivo respetadas con `max(..., var(--safe-*))` en todo elemento pegado a un borde.
- [ ] Destinos táctiles de al menos `--tap-target` con puntero grueso; ninguna acción depende del hover para ser descubierta.
- [ ] Todo cambio de estado transiciona con un token de `--duration-*` y funciona igual con `prefers-reduced-motion`.
- [ ] Colores solo de la paleta/tokens; `ink` y `signal` usados únicamente en sus roles definidos.
- [ ] Fuentes solo Geist Sans / Geist Mono (con sus fallbacks declarados).
- [ ] Códigos/SKU/cantidades en mono con cifras tabulares.
- [ ] Toda tabla con filtros, orden, búsqueda y paginación.
- [ ] Todo dato identificable es un enlace a su detalle.
- [ ] Ver/Crear/Editar/Eliminar en páginas propias, sin modales.
- [ ] Un solo botón primario por página.
- [ ] Estados vacíos presentes (sin datos / sin resultados).
- [ ] Errores bajo los campos y panel de error, sin alertas nativas.
- [ ] Ningún control del sistema operativo a la vista: los desplegables, fechas y horas usan los controles propios (§6.4.1).
- [ ] Todo panel flotante se cierra con Escape y devuelve el foco a su disparador.
- [ ] Foco visible en todos los controles (`--shadow-focus-ring`).
- [ ] Contraste AA verificado, incluyendo el ítem activo del sidebar.
- [ ] Sin emojis en ningún texto o mensaje (tolerancia cero).
- [ ] Todos los iconos provienen del set Lucide y usan la semántica canónica (§6.13).
- [ ] Sin iconos custom, SVG sueltos ni sets mezclados.
- [ ] Tono profesional en todo el copy (sin informalidad ni lúdica).

---

## 12. Multiplataforma y aplicación instalable

Rustock se usa en tres sitios: una ventana nativa (Tauri), un navegador de escritorio y un teléfono o tableta en el piso del almacén. **No hay tres diseños.** Hay uno, cuyas medidas se derivan de tokens que cambian por breakpoint y por tipo de puntero (§3.3, §3.6), de modo que la misma hoja de estilos sirve a los tres sin componentes duplicados ni ramas de código por dispositivo.

### 12.1 Zonas seguras

Todo elemento pegado a un borde de la ventana — barra superior, sidebar, contenido, barra de filtros, toasts, skip-link — suma la zona segura correspondiente con `max()`:

```css
padding-right: max(var(--page-padding-x), var(--safe-right));
```

Nunca se asume que `env(safe-area-inset-*)` vale cero: en un teléfono con notch, en una tableta con barra de gestos o en una ventana sin decoración, vale algo.

### 12.2 Superposición de controles de ventana

Con `display-mode: window-controls-overlay` (PWA instalada o ventana Tauri sin decoración) la barra superior pasa a ser la barra de título del sistema:

- Reserva el área nativa con `env(titlebar-area-x)` / `env(titlebar-area-height)`.
- La barra completa es zona de arrastre (`-webkit-app-region: drag`); sus enlaces, botones y campos quedan marcados `no-drag`.

### 12.3 Service worker y arranque

El service worker (`src/pwa/sw-template.js`, materializado en `dist/sw.js` por el plugin `rustock-pwa` de `vite.config.ts`) solo existe en build de producción fuera de Tauri. Sus reglas son innegociables:

- **El API de negocio nunca se cachea.** El backend Rust vive en otro origen (`127.0.0.1:1421`) y el worker no lo intercepta: los datos que se muestran son siempre datos vivos del backend (STACK.md).
- **Solo se precachea el shell de arranque**: HTML, el chunk de entrada y sus importaciones estáticas, hojas de estilo, fuentes e iconos. Los fragmentos de cada ruta se guardan la primera vez que se visitan — instalar la aplicación no descarga el producto entero.
- **Navegación**: red primero, shell cacheado como red de seguridad. Un despliegue nuevo se ve al instante; una caída de red no deja la pantalla en blanco.
- **Estáticos con hash**: caché primero. Son inmutables, así que la aplicación arranca sin tocar la red.

### 12.4 Avisos de plataforma

Dos hechos del entorno — y solo dos — se comunican al usuario, en la **franja de avisos** que vive en el flujo del lienzo, encima del contenido de la ruta (`AvisoSistema`):

| Aviso | Tono | Acción |
|---|---|---|
| Sin conexión con el servidor | `warning` | Ninguna: informa que los datos son los últimos cargados y que no se guardará nada hasta recuperar la conexión |
| Hay una versión nueva lista | `info` | "Actualizar ahora" — activa el worker en espera y recarga |

Reglas:
- La franja **no flota**: no es un modal, no es un popover, no tapa nada y no exige respuesta (§5.1).
- **Una versión nueva nunca se activa sola.** Espera a que la persona lo acepte, para no recargar la aplicación a mitad de un movimiento sin guardar.
- La invitación a **instalar** Rustock no interrumpe: vive en Configuración › Aplicación, una página que la persona abre por decisión propia.

*Fin del DESIGN — Rustock v0.3 "Rust & Iron". Este documento es la única fuente de verdad del aspecto y la experiencia de la interfaz.*
