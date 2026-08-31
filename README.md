# Rustock — Tu almacén, bajo control

<p align="center">
  <img src="public/rustock.svg" width="96" height="96" alt="Rustock — caja de almacén en óxido" />
</p>

<p align="center">
  <strong>WMS self-hosted que pone tu inventario bajo control real.</strong><br/>
  Stock en tiempo real · Lotes con FIFO/FEFO · Trazabilidad inmutable · Sin nube, sin suscripciones.
</p>

<p align="center">
  <a href="https://rustock.app"><img alt="Sitio" src="https://img.shields.io/badge/sitio-rustock.app-B7410E?style=flat&labelColor=1F1813" /></a>
  <a href="#instalación"><img alt="Rust" src="https://img.shields.io/badge/Rust-1.96-black?style=flat&logo=rust" /></a>
  <a href="#instalación"><img alt="Tauri" src="https://img.shields.io/badge/Tauri-v2-24C8DB?style=flat&logo=tauri" /></a>
  <a href="#instalación"><img alt="React" src="https://img.shields.io/badge/React-19-61DAFB?style=flat&logo=react&logoColor=black" /></a>
  <img alt="SQLite" src="https://img.shields.io/badge/SQLite-embebido-003B57?style=flat&logo=sqlite" />
  <img alt="Licencia" src="https://img.shields.io/badge/licencia-MIT-B7410E?style=flat" />
</p>

---

## Por qué Rustock es rompedor

**Excel te frena. El SaaS te alquila. Rustock te da la propiedad.**

|  | **Rustock** | Excel | SaaS típico |
|---|---|---|---|
| Costo mensual | **0 — tuyo para siempre** | 0 pero sin control | 29–299 por usuario |
| Datos | **En tu equipo, SQLite** | Archivo frágil | En la nube de otro |
| Trazabilidad | **Inmutable, por movimiento** | No existe | Parcial |
| FIFO / FEFO | **Automático** | Manual y con errores | Algunos, con costo extra |
| Conteo ciego | **Integrado** | Imposible | Raro |
| Offline | **100%** | Sí | No |

> **Una instalación. Un archivo. Control total.** Una aplicación compilada en Rust que corre completa en tu infraestructura. Sin Docker, sin nube, sin sorpresas en la factura.

**Listo para producción:** HTTPS con certificado propio, multiusuario en red, sesiones que caducan, permisos por rol aplicados en el servidor y reflejados en la interfaz, copias de seguridad automáticas con réplica a otro disco. Todo configurable por fichero TOML o variables de entorno — ver [DEPLOYMENT.md](DEPLOYMENT.md).

### Lo que resuelve

- **Descontrol de stock** → saldos por (ubicación, producto, lote) con mínimos, máximos y alertas automáticas.
- **Pérdidas por vencimiento** → FEFO automático; un lote vencido nunca sale a cliente, solo como merma.
- **Falta de trazabilidad** → cada alteración es un movimiento con tipo, motivo y autor. Historial inmutable; anular genera el inverso.
- **Conteos imprecisos** → sesiones completes/cíclicas con conteo ciego, doble conteo y precisión medida por SKU, cantidad y ubicación.
- **Dependencia de SaaS** → self-hosted de verdad. Tus datos nunca salen de tu servidor.

---

## Características que trabajan juntas

- **Stock en tiempo real** por ubicación, producto y lote. Saldos materializados e indexados para consultas instantáneas.
- **Movimientos trazables**: entradas, salidas, traslados y ajustes. Ciclo `BORRADOR → PENDIENTE_APROBACION → APROBADO → ANULADO`.
- **Árbol físico flexible**: Almacén → Zona → Rack → Sección → Ubicación → Caja. Simplificable, con pasillos opcionales.
- **Inventario físico** con sesiones, diferencias, conciliación y cierre que genera ajustes automáticamente.
- **Trazabilidad total**: línea de tiempo de producto, ubicación, lote y caja. “¿De dónde vino esta unidad? ¿Quién la movió?”
- **Roles y permisos granulares** + auditoría inmutable (quién hizo qué, cuándo, dónde y por qué).
- **Búsqueda universal** filtrable, ordenable, paginable y exportable en todo listado (SPEC §15).
- **Command palette** global (`Ctrl+K`): busca en páginas, acciones, reportes, ayuda y datos en vivo con relevancia inteligente.
- **Mapa 2D/3D del almacén**, temas configurables (6 paletas + claro/oscuro), historial de actividad y métricas.

---

## Captura rápida

```
Antes: Excel con pestañas que se rompen al filtrar.
Después: Rustock — 4 SKUs, 13,465 unidades, 4 alertas, 7 movimientos, ocupación 75% — en un dashboard.
```

La landing en `/` y la galería en `/galeria` te muestran el producto sin humo: lo que ves es lo que hay.

---

## Instalación en minutos

### Requisitos

- Rust stable (`rustup.rs`)
- Node.js LTS
- Dependencias de Tauri: [prerrequisitos por plataforma](https://tauri.app/start/prerequisites)

### Desarrollo (un solo comando)

```bash
# Clona y entra
git clone https://github.com/tu-org/rustock && cd rustock
npm install

# Opción A: app de escritorio (Tauri)
npm run tauri dev

# Opción B: modo web sin ventana (ideal para WSL/SSH/CI — sin GTK)
npm run tauri:web
# abre http://localhost:6821

# Datos de ejemplo (idempotente, solo debug)
RUSTOCK_SEED=1 npm run tauri:web
# usuario: admin / Admin1234!

# Script todo-en-uno (limpia puertos, seed, db temporal)
./scripts/dev.sh --seed
# o
npm run dev:web -- --seed
```

### Producción

```bash
npm run tauri build
# instaladores en src-tauri/target/release/bundle/ (deb/rpm)
```

---

## Documentación

- **Ayuda en la app** (`/ayuda`): 26 guías por módulo + 6 procesos de negocio + glosario de 46 términos, con búsqueda y cruces módulo↔glosario.
- **SPEC.md** — lógica de negocio completa (fuente de verdad).
- **DESIGN.md** — sistema de diseño “Rust & Iron” (paleta, tokens, layout, componentes).
- **STACK.md** — stack y reglas de rendimiento.
- **INSTALACION.md** — guía detallada de instalación.
- **DEPLOYMENT.md** — puesta en producción: configuración, red y TLS, copias de seguridad, systemd.

Para agentes de IA y crawlers:

- `https://rustock.app/llms.txt` — guía para modelos (llmstxt.org)
- `https://rustock.app/sitemap.xml` — 30 URLs indexables
- `https://rustock.app/robots.txt` — políticas para GPTBot, Claude, Perplexity, etc.
- `https://rustock.app/opensearch.xml` — búsqueda desde el navegador

---

## SEO y marketing al máximo

Rustock está optimizado para ser descubierto y comprendido por humanos y por IA:

- **Meta** completa: title 50–60, description 150–160, canonical, hreflang, robots con max-snippet, Open Graph 1200×630 y Twitter large image.
- **JSON-LD** enriquecido: `Organization`, `SoftwareApplication` (con offers, rating y featureList), `WebSite` con `SearchAction`, `BreadcrumbList` y `FAQPage` en la landing (8 preguntas).
- **Infraestructura**: `robots.txt` con Allow para IA, `sitemap.xml` con 30 URLs, `manifest.webmanifest` con screenshots y shortcuts, `browserconfig.xml`, `humans.txt`, `security.txt`.
- **AI-first**: `llms.txt` + `ai.txt` + `.well-known/security.txt` + etiquetas `ai-content-declaration`.
- **Performance**: code-splitting por ruta (lazy), virtualización de tablas, saldos materializados, índices en todo lo consultable, build con `sourcemap:false` y `minify:esbuild`.
- **Conversión**: landing con comparativa honesta, pricing de 3 planes (“0 para siempre”), prueba social de 3 testimonios, FAQ con JSON-LD y CTA con urgencia profesional.

Referencia: audita con Lighthouse, Rich Results Test y `npm run verify`.

---

## Stack (resumen)

| Capa | Tecnología | Por qué |
|---|---|---|
| Backend | **Rust 1.96 + Tauri v2.11** | Binario nativo, sin GC, IPC mínimo |
| Frontend | **React 19 + TypeScript 7 + Vite 8** | Typecheck instantáneo, HMR nativo |
| Estilos | **CSS puro modular** | Tokens, sin runtime de CSS-in-JS |
| Datos | **SQLite + rusqlite 0.40 (bundled)** | Un archivo, índices en todo, 0 latencia |
| Estado | **react-query + zustand** | Caché de servidor + estado de UI mínimo |

Toda la lógica de negocio vive en Rust. El frontend solo consulta y muestra (STACK §1).

---

## Comandos

```bash
npm run dev          # Vite en 6821
npm run build        # typecheck + vite build → dist/
npm run typecheck    # tsc --noEmit
npm run lint         # oxlint src
npm run design       # design-guard (DESIGN §1.1)
npm run routes       # route-guard (DESIGN §5.4)
npm run verify       # typecheck + lint + design + routes + audit + build
npm run tauri dev    # escritorio (requiere X/Wayland)
npm run tauri:web    # web sin ventana (sin GTK) → :6821 + :1421
npm run dev:web      # todo-en-uno (scripts/dev.sh)
```

---

## Licencia

**MIT** © 2026 Omar Sazar — ver [LICENSE](LICENSE).

Hazlo tuyo: úsalo, modifícalo y véndelo si quieres. Lo único que se pide es
conservar el aviso de copyright. Tus datos, tu servidor, tu control.

<p align="center">
  <em>Tu almacén, bajo control.</em><br/>
  <a href="https://rustock.app">rustock.app</a> · <a href="https://rustock.app/ayuda">Ayuda</a> · <a href="https://rustock.app/ayuda/glosario">Glosario</a>
</p>
