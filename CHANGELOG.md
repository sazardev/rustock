# Changelog

Todos los cambios notables de Rustock se documentan en este archivo.

El formato sigue [Keep a Changelog](https://keepachangelog.com/es-ES/1.1.0/)
y el versionado [SemVer](https://semver.org/lang/es/).
## [0.8.1] - 2026-08-31

### Documentación

- **manual:** Guía de DevOps dentro de la aplicación, y arregla la migración


### Refactor

- **sesion:** Un solo constructor de SesionState

## [0.8.0] - 2026-08-31

### Features

- **auditoria:** Cada evento guarda desde dónde se hizo, y los fallidos también

## [0.7.1] - 2026-08-31

### Bug Fixes

- **permisos:** Faltaban por gatear aprobar, anular, cerrar inventario y sucursales

- **landing:** La portada se veía mitad en inglés y mitad en castellano


### CI

- **release:** Saca macOS Intel de la matriz, que bloqueaba la publicación


### Documentación

- **roadmap:** Pon al día lo hecho y quita una promesa que el código no cumple


### Performance

- **server:** Un solo hilo atendía en serie y una copia congelaba a todos

## [0.7.0] - 2026-08-31

### Documentación

- **postgres:** El plan medido para soportar otro motor, y por qué no está hecho


### Features

- **permisos:** La interfaz deja de ofrecer lo que el rol no puede hacer

- **backup:** Copias automáticas con réplica, y binarios para las tres plataformas

## [0.6.0] - 2026-08-31

### Features

- **despliegue:** Configuración, TLS, caducidad de sesión, copias y pool

## [0.5.2] - 2026-08-31

### Bug Fixes

- **seguridad:** Impide dejar el sistema sin administradores por cambio de rol

- **release:** El changelog agrupaba cada versión bajo «Unreleased»


### CI

- Añade GitHub Actions y arregla el falso positivo del auditor


### Documentación

- **changelog:** Agrupa los arreglos bajo 0.5.1

## [0.5.1] - 2026-08-30

### Bug Fixes

- **i18n:** Seis fugas y dos bugs que solo salen usando la app

- Dos fallos de lógica encontrados ejercitando las reglas de negocio

- **i18n:** El aviso de sesión cerrada llevaba el enum en crudo

- Una fuga en Configuración y el Manual decía lo que la app no hace

## [0.5.0] - 2026-08-30

### Bug Fixes

- **tests:** Quita conversiones inútiles que clippy 1.98 rechaza

- **css:** Define las variantes responsivas de rejilla que faltaban


### Chore

- **scripts:** Capturar acepta RUSTOCK_IDIOMA para revisar el inglés


### Features

- **i18n:** Cimientos de internacionalización con diccionarios tipados

- **i18n:** Errores del backend traducibles por código y datos

- **i18n:** Traduce los trece catálogos, listados y componentes compartidos

- **i18n:** Traduce el vocabulario del dominio y la pantalla de movimientos

- **i18n:** Traduce el formulario de movimientos, las reglas y las migas de pan

- **i18n:** Traduce etiquetas, el panel de escaneos y los nueve reportes

- **i18n:** Traduce Configuración y Mi perfil

- **i18n:** Traduce dashboard, historial, captura rápida, detalle de movimiento, sesión de inventario y mapa

- **i18n:** Traduce los quince formularios de catálogo

- **i18n:** Traduce el command palette

- **i18n:** Traduce alertas, inventario, importación, asistente de mapa y detalle de usuario

- **i18n:** Traduce los componentes compartidos y los módulos sin React

- **i18n:** Traduce el mapa 3D, los paneles del mapa, las páginas de estado y los tipos de movimiento

- **i18n:** El SEO sigue al idioma

- **i18n:** Traduce la landing pública completa

- **i18n:** Traduce la galería del sistema de diseño

- **i18n:** Traduce la Ayuda completa y prepara el Manual

- **i18n:** Traduce el marco de la Ayuda y el Manual

- **i18n:** Traduce el glosario del Manual (50 términos)

- **i18n:** Traduce las nueve partes del Manual y sus dos primeros capítulos

- **i18n:** Traduce la Parte 0 del Manual (visión, instalación, roles y personalización)

- **i18n:** Traduce la Parte 1 y los siete primeros capítulos de la Parte 2 del Manual

- **i18n:** Traduce las Partes 2 y 3 del Manual (espacio físico y catálogos maestros)

- **i18n:** Traduce la Parte 4 del Manual (movimientos: modelo, ciclo, tipos, FIFO/FEFO y captura)

- **i18n:** Traduce las Partes 5 y 6 del Manual (inventario, dashboard, reportes, alertas y actividad)

- **i18n:** Traduce la Parte 7 del Manual (seis procesos de extremo a extremo)

- **i18n:** Traduce la Parte 8 y cierra el Manual, con guardia contra deriva

- **i18n:** Cierra la internacionalización — barrido final de la interfaz

## [0.4.0] - 2026-08-29

### Bug Fixes

- **backend:** Elimina campo costo_unitario duplicado en tests

- **backend:** Valida coherencia tipo/sub_tipo y corrige índices de auditoría en DBs existentes

- **backend:** Sincroniza correlativo de movimientos y valida proveedor/cliente inactivo

- **auditoria:** Corrige 42 hallazgos de auditoria integral — a11y, tokens, negocio, datos y perf

- **auditoria:** Cierra cabos sueltos — denormaliza almacen_id, bloquea controla_lote, cajas historial, inventario eliminar, contraste y warnings

- **app:** Auditoria E2E en Chrome — 7 correcciones de backend y frontend

- **mapa:** Auditoria profunda 2D/3D — WebGL, accesibilidad, params y trazabilidad

- **backend:** Cierra brechas de seguridad y consistencia de negocio

- **movimientos:** Restringe edición al creador en la UI


### Chore

- **opencode:** Registra micro-agentes especializados + small_model haiku

- **opencode:** Instala MCP chrome-devtools en repo y global


### Documentación

- Regenera CHANGELOG.md anclado al tag v0.3.0

- **agents:** Sincroniza AGENTS.md con stack real y pipeline actual


### Estilo

- **backend:** Aplica cargo fmt sobre commands.rs y query.rs


### Features

- Initial commit

- **backend:** Completa catalogos del SPEC y avanza reglas de movimientos

- **backend:** Completa movimientos, comentarios, trazabilidad, alertas y reportes del SPEC

- **frontend:** Conecta login, dashboard, alertas, reportes y movimientos al backend real

- **frontend:** Conecta los catálogos al backend real con CRUD completo en Almacén y Producto

- Conecta inventario físico al backend y cierra la conexión frontend-backend completa

- **backend:** Agrega script de datos de ejemplo para explorar la app

- Expone la lógica de negocio real por HTTP para que Rustock funcione en un navegador normal

- Completa la experiencia de Rustock con catalogos, configuracion, reportes, ayuda, temas, command palette y tracking total

- Agrega script de arranque en un solo comando (dev.sh / npm run dev:web)

- Mapas 2D/3D de almacén, entidad Pasillo y navegación completa de catálogos físicos

- **seo:** Sitemap, robots, llms y JSON-LD base + ajuste tipografico fallback

- **landing:** Pule landing a nivel obsesivo — dolores, confianza y stack

- **mapa:** Modo construcción con colisiones, 3D inmersivo y experiencia Blender

- **frontend:** Conecta UI a las correcciones de negocio del backend

- **manual:** Agrega Manual del Cliente con capítulos y glosario

- **docs:** New module

- **rustock:** Rediseño minimal, PWA, escáner, etiquetas y motor de reglas

## [0.3.0] - 2026-08-10

### Bug Fixes

- **release:** Sincroniza version en Cargo.lock al hacer bump


### Documentación

- Regenera CHANGELOG.md anclado al tag v0.2.0


### Features

- **auditoria:** Historial completo de actividad con hora, fecha y metricas del backend

- **web:** Gateway de API con historial funcional en modo navegador

- **ui:** Sidebar colapsable con persistencia y ajustes de layout

## [0.2.0] - 2026-08-09

### Documentación

- Regenera CHANGELOG.md anclado al tag v0.1.0

- Agrega MEMORY.md como memoria de sesion y estado versionado del proyecto


### Features

- **backend:** Capa de datos SQLite en Rust con movimientos, inventario y permisos

- **frontend:** Router react-router con deep-linking, paginas del shell y route-guard

## [0.1.0] - 2026-08-09

### Features

- Initial Rustock WMS app (Tauri v2 + React + Tailwind)

- Sistema de UI en CSS puro, docs (SPEC/DESIGN/STACK) y pipeline de calidad con lefthook

- Guardas de opencode (agente rustock, comandos verify/feature/fix, roadmap y permisos)

- Versionador semver con git-cliff y validacion de conventional commits

<!-- generated by git-cliff -->
