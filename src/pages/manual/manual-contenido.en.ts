// oxlint-disable eslint/max-lines
/**
 * Customer Manual content, in English.
 *
 * TRANSLATION IN PROGRESS. The manual is 52 chapters of long-form prose,
 * translated part by part. Until a part is done, its Spanish text is served:
 * that is visible and documented here, not a silent gap.
 */
import { PATH } from "../../app/route-paths";
import { MANUAL_PARTES_ES } from "./manual-contenido.es";
import type { ManualCapitulo, ManualParte, TerminoManual } from "./manual-tipos";

const CH_VISION: ManualCapitulo = {
  id: "m00-vision",
  titulo: "Rustock’s vision and principles",
  icono: "ayuda",
  resumen: "What Rustock is, what it solves, and which principles are not up for negotiation.",
  paraQueSirve:
    "To understand why Rustock exists and how it thinks about your inventory: accuracy, traceability and complete auditability.",
  cuandoUsarlo: "On your first day with the system, to align your team on how the work is done.",
  terminosClave: ["trazabilidad", "saldo", "movimiento", "auditoria"],
  relacionados: ["m00-roles", "m08-checklist"],
  secciones: [
    {
      titulo: "What Rustock is",
      bloques: [
        {
          tipo: "texto",
          texto:
            "Rustock is a self-hosted, all-included mini-WMS so that one person or a small operation can manage what is stored, where it is, how much there is, who moves it, when and why it happened, and the complete history. It runs entirely on your infrastructure, with no external services or licences.",
        },
        {
          tipo: "lista",
          items: [
            "What: products, lots, quantities (base UOM).",
            "Where: warehouse → zone → rack → section → location → container.",
            "How much: materialised balances, minimums/maximums, capacity.",
            "Who: users, 5 roles, granular resource:action permissions.",
            "When: the fact’s movement date + created_at/approved_at + time zone.",
            "Why: type/sub-type, reason ≥3, comments and reference document.",
            "History: immutable traceability through approved movements.",
          ],
        },
        {
          tipo: "nota",
          texto:
            "If something changes stock and does not go through a movement, it is outside the model. That is the auditability guarantee.",
          tono: "info",
        },
      ],
    },
    {
      titulo: "Goals of the domain",
      bloques: [
        {
          tipo: "tabla",
          cabeceras: ["Goal", "How it is measured"],
          filas: [
            ["Accuracy", "Exact SKUs / counted ×100, by quantity and by location (11.6)."],
            [
              "Full traceability",
              "Every change has a single dated movement with an author and a reason.",
            ],
            ["Auditability", "Immutable who/what/when/where events; nothing is deleted."],
            ["Universal search", "Every listing is filterable/sortable/searchable/pageable (15)."],
            [
              "Role-based control",
              "Nobody does what their role does not allow; sensitive actions require an explicit permission.",
            ],
          ],
        },
      ],
    },
    {
      titulo: "Guiding principles",
      bloques: [
        {
          tipo: "lista",
          items: [
            "One movement, one fact: no change to stock by hand; always through the movement model (6).",
            "The balance is derived: the sum of approved movements; never a magic figure with nothing behind it (5.2).",
            "Nothing is destroyed: deactivating or cancelling never physically deletes something with history (14.5).",
            "Everything queryable: without filters/sorting/search/pagination the endpoint does not exist (15.1).",
          ],
        },
        {
          tipo: "nota",
          texto:
            'A negative balance is forbidden by a global invariant. Any operation that tries is rejected with an exact message: "Insufficient balance in RACK-A1-N2-P3: 5 available, 8 attempted".',
          tono: "warning",
        },
      ],
    },
  ],
};

const CH_INSTALL: ManualCapitulo = {
  id: "m00-instalacion",
  titulo: "Installation and getting started",
  icono: "configuracion",
  resumen: "Requirements, start-up modes, the first admin account and sample data.",
  paraQueSirve:
    "To get Rustock up in minutes, both on the desktop (Tauri) and in the browser (web mode with no window).",
  cuandoUsarlo: "For the initial installation, or when you want a temporary database for testing.",
  terminosClave: ["usuario", "rol"],
  relacionados: ["m00-vision", "m00-roles"],
  secciones: [
    {
      titulo: "Requirements",
      bloques: [
        {
          tipo: "lista",
          items: [
            "Linux with Tauri v2 (WebKitGTK) for desktop mode, or any browser for web mode.",
            "Node 26 + Rust 1.96 (edition 2024) if you build from source.",
            "Default ports: Vite 6821 (frontend) and backend 1421 (local HTTP, configurable).",
          ],
        },
        {
          tipo: "tabla",
          cabeceras: ["Mode", "Command", "When to use it"],
          filas: [
            ["Desktop", "npm run tauri dev", "Normal operation with a native window."],
            [
              "Web, no window (WSL/SSH/CI)",
              "npm run tauri:web  (RUSTOCK_WEB_ONLY=1)",
              "Environments with no X/Wayland: only SQLite + HTTP 127.0.0.1:1421, no GTK.",
            ],
            [
              "Unified script",
              "./scripts/dev.sh --seed  or  npm run dev:web -- --seed",
              "Frees ports 6821/1421, prepares the DB and delegates to web.mjs (recommended day to day).",
            ],
          ],
        },
      ],
    },
    {
      titulo: "dev.sh options",
      bloques: [
        {
          tipo: "tabla",
          cabeceras: ["Flag", "Effect"],
          filas: [
            ["--seed", "Seeds sample data if the database is empty (RUSTOCK_SEED=1, debug only)."],
            ["--reset", "Backs rustock.db up to .backup-<timestamp>, deletes it, then seeds."],
            [
              "--tmpdb",
              "Uses /tmp/opencode/rustock-dev.db (leaving the real one alone). Combinable with --seed.",
            ],
            ["--stop", "Kills instances on 6821/1421 without starting anything."],
            ["--help", "Prints the usage."],
          ],
        },
        {
          tipo: "nota",
          texto:
            "Variables honoured: RUSTOCK_SEED, RUSTOCK_WEB_ONLY, RUSTOCK_DB_PATH, RUSTOCK_HTTP_PORT (backend) and VITE_RUSTOCK_API (frontend, e.g. http://127.0.0.1:1421/api). Default DB: ~/.local/share/com.rustock.app/rustock.db (honouring XDG_DATA_HOME).",
          tono: "info",
        },
      ],
    },
    {
      titulo: "First run: creating the first administrator",
      bloques: [
        {
          tipo: "pasos",
          pasos: [
            "Open the app. If there are no users, you will see /configurar-administrador.",
            "Fill in the username (unique), full name, password (argon2-hashed in Rust, it never leaves for the frontend) and an optional unique email.",
            "Press Create administrator: the system runs bootstrap_admin without a session (the only route without authentication).",
            "You will be redirected to /login: sign in with that user.",
          ],
        },
        {
          tipo: "nota",
          texto:
            "Without at least one warehouse you cannot record movements. After signing in, create your warehouse before anything else.",
          tono: "warning",
        },
      ],
    },
    {
      titulo: "Sample data (seed)",
      bloques: [
        {
          tipo: "texto",
          texto:
            "With RUSTOCK_SEED=1 the system (debug only) populates a realistic operation without breaking any business rule (it uses repo::* — never a direct INSERT):",
        },
        {
          tipo: "lista",
          items: [
            "Admin admin / Admin1234!, 3 UOMs, 2 categories, 1 supplier, 1 customer.",
            "Physical tree: 1 warehouse → 3 zones → 1 rack → 2 sections → 4 locations (a mix of the simplified and strict tree).",
            "4 products (simple, low stock, with lots, with lots + expiry and lots expiring/expired), approved movements (a multi-lot purchase inbound, 2 outbound, a transfer, an adjustment) + a comment + 1 pending approval, 2 sessions (1 closed with discrepancies, 1 in progress and blind).",
            "Idempotent: if warehouses already exist it does nothing; it is safe to leave the variable set between restarts.",
          ],
        },
        {
          tipo: "enlaces",
          items: [{ etiqueta: "Go to Settings (after signing in)", href: PATH.configuracion }],
        },
      ],
    },
    {
      titulo: "Where to find it",
      bloques: [
        {
          tipo: "enlaces",
          items: [
            { etiqueta: "Sign in", href: PATH.login },
            { etiqueta: "Create the first administrator", href: PATH.configurarAdministrador },
            { etiqueta: "Dashboard (after signing in)", href: PATH.dashboard },
          ],
        },
      ],
    },
  ],
};

/**
 * Chapters already translated, by id. The parts array is assembled from the
 * Spanish structure and each chapter is swapped for its English version when
 * one exists — so the manual is never half-built while the translation
 * advances chapter by chapter.
 */

const CH_ROLES: ManualCapitulo = {
  id: "m00-roles",
  titulo: "Users, roles and permissions",
  icono: "rol",
  resumen: "5 default roles, resource:action permissions and the access matrix. Who can do what.",
  paraQueSirve:
    "To stop anyone doing what is not theirs to do. Sensitive actions require an explicit permission and are audited.",
  cuandoUsarlo:
    "When adding your team, and whenever you assign approve/cancel/close responsibilities.",
  terminosClave: ["usuario", "rol", "permiso", "auditoria", "desactivar"],
  relacionados: ["m00-vision", "m06-historial", "m08-transversales"],
  secciones: [
    {
      titulo: "User: attributes and rules",
      bloques: [
        {
          tipo: "tabla",
          cabeceras: ["Field", "Rule"],
          filas: [
            ["nombre_usuario", "Unique, identifies the login. Immutable after creation (14.7)."],
            ["nombre_completo", "Required, human-readable."],
            ["email", "Optional, unique if present."],
            [
              "password_hash",
              "Argon2 in Rust; never serialised to the frontend (skip_serializing).",
            ],
            ["rol_id", "Exactly one role (v1). Multi-role is a future extension (20)."],
            ["activo", "Defaults to true. An inactive user neither authenticates nor operates."],
            ["ultimo_acceso_at", "Updated on sign-in."],
            ["created_at / updated_at", "Automatic, UTC."],
            ["created_by / updated_by", "Required on every manageable record."],
          ],
        },
        {
          tipo: "lista",
          items: [
            "Every movement or change is attributed to an active user.",
            "The first user is the bootstrap ADMIN with every permission (the only one without a session).",
            "An inactive user cannot authenticate or perform actions.",
          ],
        },
      ],
    },
    {
      titulo: "Default roles (not deletable)",
      bloques: [
        {
          tipo: "tabla",
          cabeceras: ["Role", "Description"],
          filas: [
            [
              "ADMIN",
              "Full control: settings, users, catalogues, movements, stocktaking, reports.",
            ],
            [
              "MANAGER",
              "Sees everything, creates and validates movements, manages catalogues; does not manage users or permissions.",
            ],
            [
              "WAREHOUSE_MANAGER",
              "Manages movements (inbound/outbound/transfers/adjustments) and runs stocktakes.",
            ],
            [
              "OPERATOR",
              "Records inbound/outbound/transfer movements; does not authorise adjustments or close stocktakes.",
            ],
            [
              "READER",
              "Read only: queries, reports, traceability, with no ability to change anything.",
            ],
          ],
        },
        {
          tipo: "nota",
          texto:
            "The default roles exist from installation and cannot be deleted (they can be renamed with the ADMIN permission). A user has exactly one role (v1).",
          tono: "info",
        },
      ],
    },
    {
      titulo: "Granular resource:action permissions",
      bloques: [
        {
          tipo: "texto",
          texto:
            "Each permission protects one specific action in the form resource:action. For example: producto:ver, movimiento:aprobar, inventario:cerrar.",
        },
        {
          tipo: "lista",
          items: [
            "Resources (23): almacen, zona, rack, seccion, ubicacion, caja, producto, categoria, uom, proveedor, cliente, lote, usuario, rol, movimiento, entrada, salida, traslado, ajuste, inventario, comentario, reporte, configuracion.",
            "Actions (11): ver, crear, editar, eliminar (logical delete), desactivar, aprobar, anular, exportar, ejecutar, cerrar, asignar.",
          ],
        },
        {
          tipo: "nota",
          texto:
            "The ver action is the minimum condition for a resource to appear in listings or details. Without it, 403, and it is recorded in the audit. exportar is required independently (you may read without being able to export). anular and aprobar are separate permissions from crear (an operator creates, a warehouse manager approves).",
          tono: "warning",
        },
      ],
    },
    {
      titulo: "Permission matrix (13×5, defaults)",
      bloques: [
        {
          tipo: "tabla",
          cabeceras: ["Permission", "ADMIN", "MANAGER", "WH MANAGER", "OPERATOR", "READER"],
          filas: [
            ["View any record", "Yes", "Yes", "Yes", "Yes", "Yes"],
            [
              "Create/edit catalogues (product, supplier, customer, category, UOM)",
              "Yes",
              "Yes",
              "Yes",
              "No",
              "No",
            ],
            ["Create movements (inbound/outbound/transfer)", "Yes", "Yes", "Yes", "Yes", "No"],
            ["Approve/validate movements", "Yes", "Yes", "Yes", "No", "No"],
            ["Create stock adjustments", "Yes", "Yes", "Yes", "No", "No"],
            ["Approve adjustments (where dual control applies)", "Yes", "Yes", "No", "No", "No"],
            ["Run an inventory session / record counts", "Yes", "Yes", "Yes", "Yes", "No"],
            ["Close an inventory session", "Yes", "Yes", "No", "No", "No"],
            ["Cancel movements", "Yes", "Yes", "No", "No", "No"],
            ["Comment on any record", "Yes", "Yes", "Yes", "Yes", "No"],
            ["Manage users and roles", "Yes", "No", "No", "No", "No"],
            ["System settings", "Yes", "No", "No", "No", "No"],
            ["Export reports", "Yes", "Yes", "Yes", "Yes", "No"],
          ],
        },
        {
          tipo: "nota",
          texto:
            "The matrix is the default (SPEC 4.4); an ADMIN can fine-tune permissions per role in v2. The puedo(resource, action)→bool command queries the matrix without auditing, and is used to show or hide Create and the approve toggle.",
          tono: "info",
        },
      ],
    },
    {
      titulo: "Audit: who did what",
      bloques: [
        {
          tipo: "tabla",
          cabeceras: ["Audit field", "Meaning"],
          filas: [
            ["usuario_id", "Who."],
            ["accion", "What (create, edit, approve, cancel, run, view…)."],
            ["entidad / entidad_id", "On what."],
            ["antes / despues", "The previous/subsequent state where applicable (a JSON diff)."],
            ["timestamp", "When (UTC)."],
            ["ip / origen", "From where (machine/session)."],
            [
              "modulo / proceso / tenant / ruta",
              "Automatic classification of the command or view (H25 full tracking).",
            ],
            ["tipo_evento", "COMMAND or VIEW (page navigation)."],
          ],
        },
        {
          tipo: "lista",
          items: [
            "Events are immutable and cannot be deleted by any role.",
            "Without permission → a 403 recorded in the audit.",
            "The con_auditoria! macro records success or failure with the session’s real actor (SesionState).",
          ],
        },
      ],
    },
    {
      titulo: "Managing users in the app",
      bloques: [
        {
          tipo: "lista",
          items: [
            "The list at /usuarios has a status filter and pagination; the detail shows recent activity via listar_historial with the name resolved.",
            "New: /usuarios/nuevo; edit: /usuarios/:id/editar (the username is immutable, SKU-style).",
            "Delete: /usuarios/:id/eliminar deactivates (it does not delete) with safeguards: you cannot deactivate yourself, nor the last active ADMIN (the UltimoAdmin error).",
            "Change your own password at /perfil (it checks the current one, the PasswordActualIncorrecta error) or have an admin reset it at /usuarios/:id/password.",
            "A single in-memory session (one process, one user at a time): login/logout/quien_soy. Without a session everything requires authentication (puede resolves to NoAutenticado).",
          ],
        },
        {
          tipo: "enlaces",
          items: [
            { etiqueta: "Users and roles", href: PATH.usuarios },
            { etiqueta: "My profile", href: PATH.perfil },
          ],
        },
      ],
    },
  ],
};

const CH_PERSONALISATION: ManualCapitulo = {
  id: "m00-personalizacion",
  titulo: "Personalisation: theme, preferences and shortcuts",
  icono: "configuracion",
  resumen: "6 palettes + light/dark, font size, sidebar order, time zone and quick search.",
  paraQueSirve: "So each person works comfortably without breaking the Rust & Iron identity.",
  cuandoUsarlo: "When setting up your own workstation and when teaching your team the shortcuts.",
  terminosClave: ["usuario"],
  relacionados: ["m00-roles", "m08-atajos"],
  secciones: [
    {
      titulo: "Visual theme: 6 palettes + light/dark mode",
      bloques: [
        {
          tipo: "texto",
          texto:
            "The colour logic lives in Rust (domain/tema.rs): each palette declares its accent; the rest is generated by mode. The frontend only applies the token→value map on :root.",
        },
        {
          tipo: "tabla",
          cabeceras: ["Palette", "Idea"],
          filas: [
            ["Rust", "The base identity, accent #B7410E."],
            ["Forest", "Deep green."],
            ["Ocean", "Technical blue."],
            ["Grape", "Operational violet."],
            ["Honey", "Warm amber."],
            ["Slate", "Blue-grey."],
          ],
        },
        {
          tipo: "lista",
          items: [
            "Global (ADMIN) at /configuracion: choose a palette + mode.",
            "Personal at /perfil: palette/mode, or Inherit from the company.",
            "With no session, the global theme is painted via obtener_tema_global.",
            "The LogoMark is tinted with the accent; the favicon stays fixed rust.",
          ],
        },
      ],
    },
    {
      titulo: "Per-user preferences",
      bloques: [
        {
          tipo: "tabla",
          cabeceras: ["Preference", "Values", "Where"],
          filas: [
            ["Font size", "SMALL (87.5%), MEDIUM (100%), LARGE (112.5%)", "/perfil → :root (rem)."],
            ["Sidebar order", "A JSON array of hrefs", "Up/down arrows per group at /perfil."],
            [
              "Time zone",
              "12 IANA zones (America/Lima by default)",
              "/perfil (Inherit) or /configuracion.",
            ],
          ],
        },
        {
          tipo: "nota",
          texto:
            "PreferenciasResueltas carries the applied fallbacks and the tema_heredado/modo_heredado flags.",
          tono: "success",
        },
      ],
    },
    {
      titulo: "Keyboard shortcuts",
      bloques: [
        {
          tipo: "tabla",
          cabeceras: ["Shortcut", "Action"],
          filas: [
            ["Ctrl/Cmd+K", "Search all of Rustock."],
            ["/", "Focus the global search."],
            ["N", "New record on listings."],
            ["Ctrl/Cmd+Enter", "Save the form."],
          ],
        },
        {
          tipo: "nota",
          texto:
            "The palette (Ctrl+K) is a floating results panel that navigates and never mutates. fzf subsequence matching, synonyms, and a boost from history.",
          tono: "info",
        },
      ],
    },
    {
      titulo: "Where to find it",
      bloques: [
        {
          tipo: "enlaces",
          items: [
            { etiqueta: "My profile", href: PATH.perfil },
            { etiqueta: "Global settings", href: PATH.configuracion },
          ],
        },
      ],
    },
  ],
};

const CH_GLOSSARY_ESSENTIAL: ManualCapitulo = {
  id: "m01-glosario",
  titulo: "Essential glossary",
  icono: "ayuda",
  resumen: "The 15 terms you cannot afford to confuse.",
  paraQueSirve: "To give the team one shared vocabulary.",
  terminosClave: ["producto-sku", "lote", "saldo", "movimiento", "ubicacion-bin"],
  relacionados: ["m01-stock", "m02-almacen"],
  secciones: [
    {
      titulo: "Critical terms",
      bloques: [
        {
          tipo: "tabla",
          cabeceras: ["Term", "In one line"],
          filas: [
            ["SKU", "The product’s canonical identifier, unique and immutable."],
            ["Lot", "A group of units with a common origin and dates; the basis of FEFO."],
            ["Balance", "(Location, Product, Lot) → quantity. Never negative."],
            ["Movement", "The only route to changing stock."],
            ["Location (bin)", "The addressable point where the balance lives."],
            ["FEFO / FIFO", "Outbound policies."],
          ],
        },
        {
          tipo: "enlaces",
          items: [
            { etiqueta: "Full glossary (50 terms)", href: "/manual/m08-glosario" },
            { etiqueta: "Glossary in Help (46 terms)", href: PATH.ayudaGlosario },
          ],
        },
      ],
    },
  ],
};

const CH_STOCK: ManualCapitulo = {
  id: "m01-stock",
  titulo: "Stock and balances",
  icono: "stock",
  resumen: "Where stock lives, how it is calculated, minimums/maximums and accuracy.",
  paraQueSirve:
    "To understand that the balance is the sum of approved movements, materialised and indexed.",
  cuandoUsarlo: "When reading dashboards, reports and alerts.",
  terminosClave: [
    "saldo",
    "stock-minimo",
    "stock-maximo",
    "capacidad-maxima",
    "uom-base",
    "precision-inventario",
  ],
  relacionados: ["m02-ubicacion", "m04-fifo", "m06-dashboard"],
  secciones: [
    {
      titulo: "Where stock lives",
      bloques: [
        {
          tipo: "lista",
          items: [
            "Stock lives in locations, optionally inside containers.",
            "The balance unit: the product’s base UOM.",
            "Balance per location: the key (location, product, lot) → quantity.",
            "One location can hold several rows (product×lot).",
          ],
        },
        {
          tipo: "nota",
          texto:
            "Materialised and indexed (15.11): instant queries with no recalculation. Source: approved movements.",
          tono: "info",
        },
      ],
    },
    {
      titulo: "Minimums, maximums and capacity",
      bloques: [
        {
          tipo: "tabla",
          cabeceras: ["Concept", "Where it is set", "What it triggers"],
          filas: [
            [
              "stock_minimo (product)",
              "Product + company default",
              "The Low stock alert if the sum is ≤ the minimum.",
            ],
            ["stock_maximo (product)", "Product", "The Stock over maximum alert if > the maximum."],
            [
              "capacidad_maxima (location)",
              "Location",
              "Blocks approval of an inbound movement or a transfer in if it would exceed it.",
            ],
          ],
        },
      ],
    },
    {
      titulo: "Accuracy",
      bloques: [
        {
          tipo: "tabla",
          cabeceras: ["Metric", "Formula", "Target"],
          filas: [
            ["SKU accuracy", "(exact SKUs / counted)×100", "≥95%"],
            ["Quantity accuracy", "(correct units / counted)×100", "≥98%"],
            ["Location accuracy", "(locations with no discrepancy / counted)×100", "≥90%"],
          ],
        },
        {
          tipo: "nota",
          texto:
            "Calculated per closed session, and shown in reportes/precision as a trend over time.",
          tono: "success",
        },
      ],
    },
  ],
};

const CH_UOM: ManualCapitulo = {
  id: "m01-uom",
  titulo: "Units of measure (UOM)",
  icono: "uom",
  resumen: "The unit family, the conversion factor and the base.",
  paraQueSirve:
    "To measure everything consistently: 1 BOX = 10 PZA if the factor is 10 over the PZA base.",
  cuandoUsarlo: "Before creating products.",
  terminosClave: ["uom", "uom-base", "producto-sku"],
  relacionados: ["m03-producto"],
  secciones: [
    {
      titulo: "Model",
      bloques: [
        {
          tipo: "tabla",
          cabeceras: ["Field", "Rule"],
          filas: [
            ["codigo", "Unique, e.g. PZA, KG, BOX, M, L. Locked after creation."],
            ["nombre", "Human-readable."],
            ["tipo", "UNIT, WEIGHT, VOLUME, LENGTH, AREA."],
            ["factor", "≥1, how many base units it equals."],
            ["base", "Boolean: the root of its family."],
            ["activo", "Defaults to true. Not deactivable while a product uses it."],
          ],
        },
        {
          tipo: "lista",
          items: [
            "The /uoms list has search, 20 per page, ordered by created_at desc.",
            "Create: /uoms/nuevo. Edit: /uoms/:id/editar. Delete: deactivates.",
          ],
        },
      ],
    },
    {
      titulo: "Good practice",
      bloques: [
        {
          tipo: "nota",
          texto:
            "Create each family’s base first (PZA, KG, L) and the derived ones afterwards (BOX, GR, ML).",
          tono: "success",
        },
      ],
    },
  ],
};

const CH_WAREHOUSE: ManualCapitulo = {
  id: "m02-almacen",
  titulo: "Warehouse",
  icono: "almacen",
  resumen: "The root of the whole operation. Without a warehouse there is no stock.",
  paraQueSirve: "To anchor the entire operation physically to a place.",
  terminosClave: ["almacen", "desactivar"],
  relacionados: ["m02-zona", "m02-arbol"],
  secciones: [
    {
      titulo: "Attributes and rules",
      bloques: [
        {
          tipo: "tabla",
          cabeceras: ["Field", "Rule"],
          filas: [
            [
              "codigo",
              "Unique, upper case with no spaces, e.g. ALM-PRINCIPAL. Required, normalised. Code unique among active records, trimmed.",
            ],
            ["nombre", "Required, human-readable."],
            ["descripcion", "Optional, free text."],
            ["direccion", "Optional, context only; not used for shipping in v1."],
            ["activo", "Defaults to true. An inactive one takes no new movements (queries only)."],
            [
              "id / created_at / updated_at / created_by / updated_by",
              "Automatic/audit, immutable.",
            ],
          ],
        },
        {
          tipo: "lista",
          items: [
            "At least one warehouse must exist to operate.",
            "The code cannot repeat among active warehouses; normalised to upper case and trimmed.",
            "Deactivating keeps the history; it does not physically delete.",
            "Uniqueness of child codes (zone/rack/section/location) is validated across the whole warehouse (not just under the parent).",
          ],
        },
      ],
    },
    {
      titulo: "In the app",
      bloques: [
        {
          tipo: "lista",
          items: [
            "List /almacenes, new /almacenes/nuevo (the code is locked after creation), detail with a navigable Zone→Rack→Section→Location tree (ArbolAlmacen.tsx), edit /almacenes/:id/editar, delete deactivates (/almacenes/:id/eliminar).",
            "2D map: /almacenes/:id/mapa (build canvas ?modo=construir), 3D map: /almacenes/:id/mapa-3d (immersive fullscreen), Assistant: /almacenes/:id/mapa/asistente.",
          ],
        },
      ],
    },
  ],
};

const CH_ZONE: ManualCapitulo = {
  id: "m02-zona",
  titulo: "Zone",
  icono: "zona",
  resumen: "A logical or physical division of the warehouse.",
  terminosClave: ["zona", "almacen"],
  relacionados: ["m02-almacen", "m02-rack"],
  secciones: [
    {
      titulo: "Model",
      bloques: [
        {
          tipo: "tabla",
          cabeceras: ["Field", "Rule"],
          filas: [
            ["codigo", "Unique within the warehouse, e.g. Z-01."],
            ["nombre/descripcion", "Required / optional."],
            ["almacen_id", "Exactly one warehouse."],
            ["pos_x/pos_y/ancho/profundidad", "Real position and size. Default 150×70."],
            ["activo", "Defaults to true."],
          ],
        },
        {
          tipo: "lista",
          items: [
            "A zone with no history can be physically deleted; with history it is only deactivated.",
            "Routes: /zonas, /zonas/nuevo, /zonas/:id, /zonas/:id/editar, /zonas/:id/eliminar.",
          ],
        },
      ],
    },
  ],
};

const CH_AISLE: ManualCapitulo = {
  id: "m02-pasillo",
  titulo: "Aisle",
  icono: "zona",
  resumen: "A physical corridor that groups racks within a zone.",
  terminosClave: ["pasillo", "zona", "rack"],
  relacionados: ["m02-zona", "m02-rack", "m02-mapa2d"],
  secciones: [
    {
      titulo: "Model",
      bloques: [
        {
          tipo: "tabla",
          cabeceras: ["Field", "Rule"],
          filas: [
            ["codigo", "Unique within the warehouse, e.g. PAS-01."],
            ["nombre", "Required."],
            ["zona_id", "Exactly one zone."],
            ["pos_x/pos_y/ancho/profundidad", "Real geometry; default 130×56."],
            ["activo", "Defaults to true."],
          ],
        },
        {
          tipo: "lista",
          items: [
            "It takes no part in the simplified tree: a rack always belongs to a zone.",
            "Not deactivable while a rack holds stock.",
            "Routes: /pasillos* (CRUD).",
          ],
        },
        {
          tipo: "nota",
          texto: "Collision matrix (14.8): an aisle cannot have racks or locations on top of it.",
          tono: "warning",
        },
      ],
    },
  ],
};

const CH_RACK: ManualCapitulo = {
  id: "m02-rack",
  titulo: "Rack / Shelving",
  icono: "zona",
  resumen: "A structure within a zone, optionally inside an aisle.",
  terminosClave: ["rack", "zona", "pasillo", "seccion"],
  relacionados: ["m02-zona", "m02-seccion"],
  secciones: [
    {
      titulo: "Model",
      bloques: [
        {
          tipo: "tabla",
          cabeceras: ["Field", "Rule"],
          filas: [
            ["codigo", "Unique within the warehouse, e.g. RACK-A1."],
            ["nombre/tipo", "Required / shelving, pallet, fridge."],
            ["zona_id", "Exactly one zone."],
            ["pasillo_id", "Optional; must be in the same zone if given."],
            ["pos_x/pos_y/ancho/profundidad", "110×56 default."],
          ],
        },
        {
          tipo: "lista",
          items: ["It can hold sections and/or locations directly. Routes: /racks*."],
        },
      ],
    },
  ],
};

const CH_SECTION: ManualCapitulo = {
  id: "m02-seccion",
  titulo: "Section",
  icono: "zona",
  resumen: "A level or bay within a rack.",
  terminosClave: ["seccion", "rack"],
  relacionados: ["m02-rack", "m02-ubicacion"],
  secciones: [
    {
      titulo: "Model",
      bloques: [
        {
          tipo: "tabla",
          cabeceras: ["Field", "Rule"],
          filas: [
            [
              "codigo",
              "Unique within the warehouse, e.g. RACK-A1-N2. A hierarchical code is recommended.",
            ],
            [
              "nombre",
              "Required, human-readable (optional depending on the implementation, but documented).",
            ],
            ["nivel", "Optional, text or integer (e.g. 1, A, B)."],
            ["rack_id", "Exactly one rack."],
            ["descripcion", "Optional, free text."],
            [
              "activo",
              "Defaults to true; it is only deactivated if it has no history, otherwise the history is kept.",
            ],
            ["id / created_at / updated_at / created_by / updated_by", "Automatic/audit."],
          ],
        },
        {
          tipo: "lista",
          items: [
            "It can hold locations. The code is preferably derived from the tree path.",
            "Routes: /secciones (list), /secciones/nuevo, /secciones/:id, /secciones/:id/editar, /secciones/:id/eliminar (deactivates).",
          ],
        },
      ],
    },
  ],
};

const CH_LOCATION: ManualCapitulo = {
  id: "m02-ubicacion",
  titulo: "Location (bin)",
  icono: "ubicacion",
  resumen: "The addressable point where stock lives.",
  paraQueSirve: "To put every unit in an exact place, so you can count and pick by place.",
  terminosClave: ["ubicacion-bin", "capacidad-maxima", "saldo"],
  relacionados: ["m02-caja", "m04-modelo"],
  secciones: [
    {
      titulo: "Model",
      bloques: [
        {
          tipo: "tabla",
          cabeceras: ["Field", "Rule"],
          filas: [
            ["codigo", "Unique within the warehouse, e.g. RACK-A1-N2-P3."],
            ["seccion_id / rack_id / zona_id", "Exactly one parent (the simplified tree)."],
            [
              "tipo",
              "STANDARD, PICKING, RESERVE, RECEIVING, QUARANTINE, RETURNS, DAMAGED, SHIPPING.",
            ],
            ["capacidad_maxima", "Optional; summed in base UOM."],
          ],
        },
        {
          tipo: "lista",
          items: [
            "It can hold multiple products×lots (mixing is allowed).",
            "Resolving almacen_id walks up the ancestors.",
          ],
        },
      ],
    },
    {
      titulo: "Location types",
      bloques: [
        {
          tipo: "tabla",
          cabeceras: ["Type", "Use"],
          filas: [
            ["STANDARD", "General storage."],
            ["PICKING", "Order preparation."],
            ["RESERVE", "Reserve stock."],
            ["RECEIVING", "Goods just received."],
            ["QUARANTINE", "Under review."],
            ["RETURNS", "Returned by a customer."],
            ["DAMAGED", "Damaged."],
            ["SHIPPING", "Ready to dispatch."],
          ],
        },
      ],
    },
    {
      titulo: "In the app",
      bloques: [
        {
          tipo: "lista",
          items: [
            "List /ubicaciones, detail, new /ubicaciones/nuevo (double selector), edit, delete deactivates (rejected while it holds a balance).",
          ],
        },
      ],
    },
  ],
};

const CH_CONTAINER: ManualCapitulo = {
  id: "m02-caja",
  titulo: "Container",
  icono: "caja",
  resumen: "An optional container inside a location that can restrict the product or lot.",
  terminosClave: ["caja", "ubicacion-bin", "lote", "producto-sku"],
  relacionados: ["m02-ubicacion", "m04-traslados"],
  secciones: [
    {
      titulo: "Model",
      bloques: [
        {
          tipo: "tabla",
          cabeceras: ["Field", "Rule"],
          filas: [
            ["codigo", "Unique within the warehouse."],
            ["ubicacion_id", "Exactly one location."],
            ["producto_id", "Optional: that product only."],
            ["lote_id", "Optional: that lot only."],
          ],
        },
        {
          tipo: "lista",
          items: [
            "A restricted container accepts no more than one distinct product/lot.",
            "Moving a container = a transfer (validar_restriccion_caja).",
            "Routes: /cajas*. CRUD.",
          ],
        },
      ],
    },
  ],
};

const CH_TREE: ManualCapitulo = {
  id: "m02-arbol",
  titulo: "The physical tree and its simplification",
  icono: "almacen",
  resumen: "How each node hangs, and why uniqueness is per warehouse.",
  terminosClave: ["almacen", "zona", "rack", "seccion", "ubicacion-bin", "caja", "pasillo"],
  relacionados: ["m02-almacen", "m02-ubicacion"],
  secciones: [
    {
      titulo: "Strict hierarchy",
      bloques: [
        {
          tipo: "texto",
          texto:
            "Warehouse → Zone → Rack → Section → Location → Container. The aisle is an optional organisational level inside a zone.",
        },
        {
          tipo: "tabla",
          cabeceras: ["Rule", "Detail"],
          filas: [
            ["A single parent", "Every node has exactly one warehouse root."],
            [
              "Simplification",
              "A location can hang from a zone, a rack or a section (in the same warehouse).",
            ],
            [
              "Uniqueness per warehouse",
              "Zone/rack/section/location: the code is unique across the WHOLE warehouse.",
            ],
          ],
        },
        {
          tipo: "nota",
          texto:
            "ArbolAlmacen.tsx on the warehouse detail shows a navigable Zone→Rack→Section→Location tree.",
          tono: "info",
        },
      ],
    },
  ],
};

const CH_MAP2D: ManualCapitulo = {
  id: "m02-mapa2d",
  titulo: "2D map — build mode",
  icono: "ubicacion",
  resumen: "A real geometric plan: every element is a rectangle with collisions.",
  paraQueSirve: "To prototype the warehouse’s real shape before loading stock.",
  cuandoUsarlo: "When setting up or reorganising a warehouse.",
  terminosClave: ["almacen", "zona", "pasillo", "rack", "ubicacion-bin"],
  relacionados: ["m02-mapa3d", "m02-asistente"],
  secciones: [
    {
      titulo: "Real geometry (SPEC 14.8)",
      bloques: [
        {
          tipo: "lista",
          items: [
            "Everything positioned occupies a rectangle (pos_x, pos_y, ancho, profundidad). A location is a fixed-size bin; zones, aisles and racks are resizable.",
            "An element with no position is not on the plan.",
            "An inactive one frees its floor space.",
          ],
        },
      ],
    },
    {
      titulo: "Matrix of forbidden overlaps",
      bloques: [
        {
          tipo: "tabla",
          cabeceras: ["Pair", "Forbidden"],
          filas: [
            ["Same type with itself", "Yes: zone↔zone, aisle↔aisle, rack↔rack, location↔location."],
            ["Aisle ↔ rack", "Yes"],
            ["Aisle ↔ location", "Yes (an aisle is transit space)."],
            ["Rack ↔ location", "Yes"],
            ["A zone containing its children", "Allowed, never blocked."],
          ],
        },
        {
          tipo: "lista",
          items: [
            "Touching along an edge is valid (AABB with strict inequality).",
            "Validated on every mutation. The rejection names both: \"The rack 'RACK-01' overlaps the aisle 'PAS-01'\".",
          ],
        },
      ],
    },
    {
      titulo: "Canvas tools in 2D",
      bloques: [
        {
          tipo: "lista",
          items: [
            "Mode via the URL ?modo=construir. Toolbar: Select / Zone / Aisle / Rack + Grid (step 10, Alt disables snapping) + Rotate 90°.",
            "Dragging shows a red ghost, and the drop is blocked with a toast if the matrix forbids it.",
            "Create by drawing: a green/red preview with live dimensions. The suggested code is the first free one (Z-04, PAS-07). Transactional, with no hard-coded code.",
            "Keyboard: Esc deselects, arrows move, Enter selects, double click navigates, Ctrl+Z / Ctrl+Shift+Z.",
          ],
        },
        {
          tipo: "enlaces",
          items: [
            { etiqueta: "Open a warehouse’s 2D map", href: "/almacenes/1/mapa" },
            { etiqueta: "Base layout assistant", href: "/almacenes/1/mapa/asistente" },
          ],
        },
      ],
    },
  ],
};

const CH_MAP3D: ManualCapitulo = {
  id: "m02-mapa3d",
  titulo: "Immersive 3D map (Blender/Figma style)",
  icono: "ubicacion",
  resumen:
    "A fullscreen editor across the whole window: orbit, multiple selection, duplicate, walk.",
  paraQueSirve:
    "To understand volumes, heights and proximity; to work with the power of a 3D editor.",
  terminosClave: ["mapa-3d", "almacen"],
  relacionados: ["m02-mapa2d", "m02-asistente"],
  secciones: [
    {
      titulo: "Immersive layout",
      bloques: [
        {
          tipo: "lista",
          items: [
            "The .mapa3d-full container is fixed inset 0 at z-index 210 (responsive, filling the whole window). The canvas is absolute inset-0; frameloop demand (61 FPS) / always while auto-rotating.",
            "Floating UI: a top bar in two pills (surface + shadow-lg) plus a scrollable node panel on the left. The bar uses pointer-events none so it does not block orbiting.",
            'A prior WebGL check (tieneWebGL): with no GPU or driver → a clear ErrorPanel, "The 3D map requires WebGL", with a link to the 2D one.',
          ],
        },
      ],
    },
    {
      titulo: "Controls and selection",
      bloques: [
        {
          tipo: "tabla",
          cabeceras: ["Action", "How"],
          filas: [
            [
              "Orbit",
              "Drag the background (OrbitControls, demand, damping 0.08, 61 FPS). Inertia via enableDamping.",
            ],
            [
              "Move a node",
              "Drag the prism: a ray onto the horizontal plane at pos_z (keeping the height), snapping at step 10, a green/red ghost (emissive) plus obstacles in dim red.",
            ],
            [
              "Multiple selection",
              "Shift+click toggles the group (grupoIds). Dragging any member moves the whole group by the same delta (grabbed by a member), with all-or-nothing validation if one collides.",
            ],
            [
              "Undo/Redo",
              "The use-historial-mapa hook (50, kind mover/creacion/grupo). Buttons + Ctrl+Z / Ctrl+Shift+Z / Ctrl+Y. A blocked drop is not recorded.",
            ],
            [
              "Visual hint",
              "A green hint on the floor (y=0.16) plus obstacles glowing dim red during the gesture; not 2D’s dense heatmap. A live green/red signal.",
            ],
          ],
        },
      ],
    },
    {
      titulo: "Blender-style shortcuts",
      bloques: [
        {
          tipo: "tabla",
          cabeceras: ["Shortcut", "Effect"],
          filas: [
            [
              "Arrows",
              "Nudge the selection or group by grid steps (all-or-nothing blocking, with a toast if it would collide).",
            ],
            ["R", "Rotate 90° around the centre."],
            ["F", "Focus the selection (frame selected, keeping the camera direction)."],
            [
              "Shift+D",
              "Duplicate into the nearest free gap (posicionLibreCercana), inheriting the zone and staying selected; Ctrl+Z undoes it.",
            ],
            ["Z", "Wireframe view."],
            ["Esc", "Exit walking and reframe; clears the group and the selection."],
          ],
        },
        {
          tipo: "lista",
          items: [
            "Camera presets: Isometric / Plan (top-down) / Front (centroYDistancia, encuadrarTodo).",
            'A coordinate HUD chip in mono, "x · y", over the node being dragged.',
            "Walking mode: the camera sits at 1.7 eye height, WASD moves camera and target along the view direction, dragging looks around; Esc exits and reframes.",
          ],
        },
      ],
    },
  ],
};

const CH_ASSISTANT: ManualCapitulo = {
  id: "m02-asistente",
  titulo: "Base layout assistant",
  icono: "zona",
  resumen: "Prototype an empty warehouse in seconds and generate geometry with no overlaps.",
  terminosClave: ["almacen", "zona", "pasillo", "rack"],
  relacionados: ["m02-mapa2d", "m02-mapa3d"],
  secciones: [
    {
      titulo: "How it works",
      bloques: [
        {
          tipo: "lista",
          items: [
            "Route /almacenes/:id/mapa/asistente. Only while the warehouse has no active zones.",
            "Form: zone dimensions, 1–12 aisles, 1–20 racks per block, with a live SVG preview.",
            "On generating: a containing zone plus alternating columns [rack block | aisle], margins 20/gap 10, guaranteed free of overlaps.",
          ],
        },
        {
          tipo: "nota",
          texto:
            "Recommended flow: Assistant → adjust in 2D → check the heights in 3D → load catalogues and stock.",
          tono: "success",
        },
      ],
    },
  ],
};

const CH_PRODUCT: ManualCapitulo = {
  id: "m03-producto",
  titulo: "Products (SKUs)",
  icono: "producto",
  resumen: "The catalogue at the heart: with no products there are no movements.",
  paraQueSirve: "To register each item with rules that prevent mistakes.",
  terminosClave: [
    "producto-sku",
    "uom",
    "uom-base",
    "categoria",
    "codigo-barras",
    "stock-minimo",
    "stock-maximo",
    "lote",
  ],
  relacionados: ["m01-uom", "m03-lote", "m04-entradas"],
  secciones: [
    {
      titulo: "Attributes and rules",
      bloques: [
        {
          tipo: "tabla",
          cabeceras: ["Field", "Rule"],
          filas: [
            [
              "sku",
              "Unique, upper case, trimmed, no spaces, normalised, immutable. Changeable only by a role with an explicit permission, and it leaves a trail.",
            ],
            ["nombre", "Required, human-readable."],
            ["descripcion", "Optional, free text."],
            ["categoria_id", "Optional, a tree with no cycles; NULL = no category."],
            ["uom_base_id", "Required, an active UOM. Immutable after creation."],
            [
              "uom_venta_id / uom_compra_id",
              "Optional, alternative UOMs with a conversion factor (e.g. BOX 10×PZA).",
            ],
            [
              "codigo_barras",
              "Optional, unique if present; scanner reading takes exact priority over q.",
            ],
            ["peso_unitario (kg)", "Optional, numeric; informational."],
            ["volumen_unitario (m³)", "Optional, numeric; informational."],
            [
              "stock_minimo",
              "Optional (base UOM); raises the low-stock alert if the sum is ≤ the minimum.",
            ],
            [
              "stock_maximo",
              "Optional (base UOM); raises the over-maximum alert if > the maximum.",
            ],
            ["controla_lote", "If true, EVERY movement requires a lot, without exception."],
            [
              "controla_vencimiento",
              "If true, it implies controla_lote and requires fecha_vencimiento on the lot and on any inbound movement with a new lot.",
            ],
            ["perecedero", "If true, it turns on FEFO for outbound movements."],
            [
              "activo",
              "Defaults to true; an inactive one takes no new inbound or outbound movements, only queries and authorised regularisation adjustments (which require a permission).",
            ],
            [
              "id / created_at / updated_at / created_by / updated_by",
              "Automatic/audit, immutable.",
            ],
          ],
        },
        {
          tipo: "nota",
          texto:
            "The SKU and the base UOM are locked after creation. The UOM is validated as active on create and edit; a UOM in use cannot be deactivated. An inactive product: authorised regularisation only.",
          tono: "warning",
        },
      ],
    },
    {
      titulo: "In the app",
      bloques: [
        {
          tipo: "lista",
          items: [
            "List /productos (SKU, name, Lot/Expiry/Perishable badges, status), detail with stock by location/lot, category and suppliers, new /productos/nuevo and edit /productos/:id/editar (the SKU and base UOM are locked), delete deactivates with a confirmation. Quick create from movements.",
          ],
        },
      ],
    },
  ],
};

const CH_LOT: ManualCapitulo = {
  id: "m03-lote",
  titulo: "Lots",
  icono: "lote",
  resumen: "Origin and expiry per product. The basis of traceability and FEFO.",
  terminosClave: ["lote", "vencimiento", "fefo", "fifo", "trazabilidad"],
  relacionados: ["m03-producto", "m04-fifo", "m04-salidas"],
  secciones: [
    {
      titulo: "Model",
      bloques: [
        {
          tipo: "tabla",
          cabeceras: ["Field", "Rule"],
          filas: [
            ["numero", "Text, unique within the product, immutable after creation."],
            ["producto_id", "Required; the selector filters to products that track lots only."],
            ["fecha_fabricacion", "Optional, the manufacturing date."],
            [
              "fecha_vencimiento",
              "Optional; required if the product tracks expiry (when creating the lot and on every inbound movement with a new lot).",
            ],
            ["origen", "Free text, e.g. a supplier or internal."],
            ["notas", "Optional, free text."],
            ["id / created_at / updated_at / created_by / updated_by", "Automatic/audit."],
          ],
        },
        {
          tipo: "lista",
          items: [
            "It only makes sense if the product tracks lots; the number is unique per product.",
            "List /lotes (number, product, expiry, origin, 20 per page), detail, new /lotes/nuevo (the number is immutable, the product filtered), edit /lotes/:id/editar (dates/origin/notes only); lots are not deleted (no delete action).",
            "An expired lot cannot go out to a customer or as a supplier return; only as shrinkage or a negative adjustment (hard rule 8.6). Lots are listed filtered by product in the movement and count forms.",
          ],
        },
        {
          tipo: "nota",
          texto:
            "Use the 30/60/90-day expiries reports and the Lot expiring soon alert (with the configurable dias_aviso threshold) to rotate in time and avoid shrinkage.",
          tono: "success",
        },
      ],
    },
  ],
};

const CH_CATEGORY: ManualCapitulo = {
  id: "m03-categoria",
  titulo: "Categories",
  icono: "categoria",
  resumen: "A tree hierarchy for classifying products and filtering reports.",
  terminosClave: ["categoria", "producto-sku"],
  relacionados: ["m03-producto", "m06-reportes"],
  secciones: [
    {
      titulo: "Model",
      bloques: [
        {
          tipo: "tabla",
          cabeceras: ["Field", "Rule"],
          filas: [
            ["nombre", "Unique, required."],
            ["parent_id", "Optional; NULL = root (move to the root with parent_id: null)."],
            ["descripcion", "Optional, free text."],
            ["activo", "Defaults to true."],
            ["id / created_at / updated_at / created_by / updated_by", "Automatic/audit."],
          ],
        },
        {
          tipo: "lista",
          items: [
            "Real cycle detection walks the ancestors (not just whether a parent exists).",
            "With children or products it cannot be deleted; only deactivated (logical delete).",
            "Routes: /categorias (list), /categorias/nuevo, /categorias/:id, /categorias/:id/editar, /categorias/:id/eliminar (deactivates).",
            "The Current stock report can be filtered by category.",
          ],
        },
      ],
    },
  ],
};

const CH_SUPPLIER_CUSTOMER: ManualCapitulo = {
  id: "m03-proveedor-cliente",
  titulo: "Suppliers and customers",
  icono: "proveedor",
  resumen: "The source of purchases and the destination of dispatches.",
  terminosClave: ["proveedor", "cliente", "entrada", "salida", "trazabilidad"],
  relacionados: ["m04-entradas", "m04-salidas"],
  secciones: [
    {
      titulo: "Common attributes",
      bloques: [
        {
          tipo: "tabla",
          cabeceras: ["Field", "Rule"],
          filas: [
            ["codigo", "Unique, immutable."],
            ["nombre", "Required."],
            ["contacto_* + direccion", "Optional."],
            ["activo", "Defaults to true. An inactive one is unusable."],
          ],
        },
        {
          tipo: "lista",
          items: [
            "The supplier appears on PURCHASE and SUPPLIER_RETURN inbound movements; the customer on CUSTOMER outbound movements.",
            "Routes: /proveedores* and /clientes*. Reports by supplier/customer.",
          ],
        },
      ],
    },
  ],
};

const CH_BRANCH: ManualCapitulo = {
  id: "m03-sucursal",
  titulo: "Branches and the company",
  icono: "ubicacion",
  resumen: "Company settings (country, tax details, contact, logo, files) and operating points.",
  terminosClave: ["sucursal", "almacen"],
  relacionados: ["m00-personalizacion"],
  secciones: [
    {
      titulo: "Company settings",
      bloques: [
        {
          tipo: "lista",
          items: [
            "The configuracion_empresa table holds a single row id=default with defaults: zone America/Lima, format DD_MMM_YYYY, 30 warning days, requires approval 1.",
            "Fields at /configuracion: basic details, country/city/address, tax details, contact, lat/long coordinates, time zone, date format, warning days, default minimum stock, approval policy, global theme.",
            "Location and map: lat/long + Detect my location + an OSM iframe + Open in Google Maps.",
            "Logo and documents: LOGO replaces the previous one (≤2 MB) and DOCUMENT (≤10 MB), as BLOBs in SQLite, base64.",
          ],
        },
      ],
    },
    {
      titulo: "Branches",
      bloques: [
        {
          tipo: "lista",
          items: [
            "The Sucursal record has full CRUD (unique code, validated coordinates). Permission configuracion:ver/editar.",
            "Routes: /sucursales, /sucursales/nuevo, /sucursales/:id, edit, delete.",
          ],
        },
      ],
    },
    {
      titulo: "Bulk import",
      bloques: [
        {
          tipo: "lista",
          items: [
            "Route /configuracion/importar: CSV of catalogues. It validates row by row and reports a ResultadoImportacion.",
          ],
        },
      ],
    },
  ],
};

const CH_MOVEMENT_MODEL: ManualCapitulo = {
  id: "m04-modelo",
  titulo: "The general movement model",
  icono: "movements",
  resumen: "The fields, lines and audit rules of every movement.",
  terminosClave: ["movimiento", "entrada", "salida", "traslado", "ajuste", "saldo"],
  relacionados: ["m04-ciclo", "m04-fifo"],
  secciones: [
    {
      titulo: "Header",
      bloques: [
        {
          tipo: "tabla",
          cabeceras: ["Field", "Rule"],
          filas: [
            ["id", "An immutable, unique UUID."],
            [
              "numero",
              "A sequential text, unique per year and warehouse, e.g. MOV-2026-000123 (or MOV-ALM-PRINCIPAL-2026-000006).",
            ],
            ["tipo", "INBOUND, OUTBOUND, TRANSFER, ADJUSTMENT, CONSUMPTION."],
            [
              "sub_tipo",
              "Depending on the type: PURCHASE, CUSTOMER_RETURN, POSITIVE_ADJUSTMENT, OPENING, TRANSFER_IN; CUSTOMER, SUPPLIER_RETURN, SHRINKAGE, NEGATIVE_ADJUSTMENT, TRANSFER_OUT.",
            ],
            ["estado", "DRAFT, PENDING_APPROVAL, APPROVED, CANCELLED."],
            [
              "fecha_movimiento",
              "The date and time of the fact (it may differ from created_at). Stored in UTC, displayed in the configured zone.",
            ],
            [
              "motivo",
              "Text; required for POSITIVE/NEGATIVE_ADJUSTMENT and SHRINKAGE (≥3 characters), optional otherwise.",
            ],
            [
              "origen_ubicacion_id",
              "A reference to the source location; for outbound movements, transfers and negative adjustments.",
            ],
            [
              "destino_ubicacion_id",
              "A reference to the destination location; for inbound movements, transfers and positive adjustments.",
            ],
            [
              "proveedor_id",
              "A reference to the supplier; for PURCHASE inbound and SUPPLIER_RETURN outbound movements.",
            ],
            [
              "cliente_id",
              "A reference to the customer; for CUSTOMER outbound and CUSTOMER_RETURN inbound movements.",
            ],
            [
              "sesion_inventario_id",
              "A reference to the inventory session if the movement comes from a count (an automatic adjustment on closing).",
            ],
            [
              "documento_referencia",
              "Optional text: a PO number, delivery note, invoice, and so on. It links inter-warehouse transfers.",
            ],
            ["notas", "Optional text: general observations."],
            ["created_by / created_at", "Who created it and when (audit)."],
            ["approved_by / approved_at", "Who approved it and when (where applicable)."],
            ["anulado_by / anulado_at", "Who cancelled it and when (where applicable)."],
            [
              "movimiento_inverso_id",
              "A reference to the reversing movement generated when an APPROVED one is cancelled (a mutual reference).",
            ],
          ],
        },
      ],
    },
    {
      titulo: "Lines",
      bloques: [
        {
          tipo: "tabla",
          cabeceras: ["Line field", "Rule"],
          filas: [
            ["producto_id", "Required; the product must be active."],
            [
              "lote_id",
              "Required if the product tracks lots; it must exist and must not be expired for the CUSTOMER/SUPPLIER_RETURN sub-types.",
            ],
            ["cantidad", "A number >0, in base UOM."],
            [
              "origen_ubicacion_id",
              "For outbound movements and transfers; it must have enough balance.",
            ],
            [
              "destino_ubicacion_id",
              "For inbound movements and transfers; the destination capacity is validated.",
            ],
            [
              "caja_origen_id / caja_destino_id",
              "Optional; the container restriction is validated if the container is restricted to a product/lot.",
            ],
          ],
        },
        {
          tipo: "nota",
          texto:
            "A movement can have N lines and split one quantity across several lots or locations (multiple rows). For example: a multi-lot purchase inbound with the same product in two different lots.",
          tono: "info",
        },
      ],
    },
    {
      titulo: "Movement audit",
      bloques: [
        {
          tipo: "lista",
          items: [
            "Who (created_by, approved_by, anulado_by), What (type, product, quantity), Where (source/destination, with the warehouse resolved transitively), When (fecha_movimiento, created_at, approved_at), Why (reason, reference document, notes).",
            "Every transition is recorded in the audit with before/after, and can be queried at /historial and /reportes/auditoria.",
          ],
        },
      ],
    },
  ],
};

const CH_LIFECYCLE: ManualCapitulo = {
  id: "m04-ciclo",
  titulo: "Lifecycle and statuses",
  icono: "ajuste",
  resumen:
    "DRAFT → PENDING → APPROVED (the only one that changes the balance) → CANCELLED (generates the reverse).",
  terminosClave: ["borrador", "pendiente-aprobacion", "aprobado", "anulado", "movimiento-inverso"],
  relacionados: ["m04-modelo", "m04-ajustes"],
  secciones: [
    {
      titulo: "Statuses and transitions",
      bloques: [
        {
          tipo: "texto",
          texto:
            "DRAFT → PENDING_APPROVAL → APPROVED → (the effect is applied). From DRAFT or PENDING you can go to CANCELLED.",
        },
        {
          tipo: "tabla",
          cabeceras: ["Status", "Effect on stock", "Editable"],
          filas: [
            ["DRAFT", "No", "Yes, by its creator only."],
            ["PENDING_APPROVAL", "No", "Yes, by its creator only."],
            ["APPROVED", "Yes (atomically)", "No (immutable; only cancellable)."],
            ["CANCELLED", "No (generates the reverse)", "No."],
          ],
        },
        {
          tipo: "lista",
          items: [
            "Approving validates the balance, that the lot is not expired, capacity, lot tracking, containers, that no session blocks it, and that the balance never goes negative.",
            "Cancelling requires movimiento:anular; if APPROVED it generates an atomic reverse with a mutual movimiento_inverso_id reference.",
          ],
        },
      ],
    },
    {
      titulo: "Editing movements",
      bloques: [
        {
          tipo: "lista",
          items: [
            "EditarMovimiento (type/sub-type/number stay fixed): the creator only, and only while DRAFT/PENDING.",
            "Route /movimientos/:id/editar, plus the Edit button on the detail.",
          ],
        },
      ],
    },
    {
      titulo: "Create and approve at once",
      bloques: [
        {
          tipo: "lista",
          items: [
            "If requiere_aprobacion = false, the form offers a Create and approve at once toggle when the user can approve.",
            "It chains create + approve. If approval is required, it does not appear.",
          ],
        },
      ],
    },
  ],
};

const CH_INBOUND: ManualCapitulo = {
  id: "m04-entradas",
  titulo: "Inbound movements",
  icono: "entrada",
  resumen: "PURCHASE, CUSTOMER_RETURN, POSITIVE_ADJUSTMENT, OPENING and TRANSFER_IN.",
  terminosClave: ["entrada", "proveedor", "ajuste"],
  relacionados: ["m04-modelo", "m07-recepcion"],
  secciones: [
    {
      titulo: "Types",
      bloques: [
        {
          tipo: "tabla",
          cabeceras: ["Sub-type", "Source", "Destination", "Notes"],
          filas: [
            [
              "PURCHASE",
              "Supplier",
              "Location (receiving or final)",
              "Validates that the product is active, the lot valid and unexpired, and the destination capacity. It can split across several lots or locations. The PO document is optional.",
            ],
            [
              "CUSTOMER_RETURN",
              "Customer",
              "A RETURNS location is suggested",
              "If it tracks lots, it records the source lot or creates one with the expiry given. It does not reopen the original outbound movement.",
            ],
            [
              "POSITIVE_ADJUSTMENT",
              "— (a justified cause)",
              "Location",
              "Always a reason of ≥3. Permission ajuste:crear. It increases stock.",
            ],
            [
              "OPENING",
              "— (opening stock)",
              "Location",
              "The initial load before normal operation. It requires configuracion:ejecutar (ADMIN/MANAGER only). Identified as start-up stock, with an optional initial session.",
            ],
            [
              "TRANSFER_IN",
              "See transfers (9)",
              "Destination location",
              "The destination half of an intra- or inter-warehouse transfer. Generated automatically when the transfer is approved.",
            ],
          ],
        },
      ],
    },
  ],
};

const CH_OUTBOUND: ManualCapitulo = {
  id: "m04-salidas",
  titulo: "Outbound movements",
  icono: "salida",
  resumen: "CUSTOMER, SUPPLIER_RETURN, SHRINKAGE and NEGATIVE_ADJUSTMENT.",
  terminosClave: ["salida", "cliente", "merma", "ajuste"],
  relacionados: ["m04-modelo", "m04-fifo", "m07-despacho"],
  secciones: [
    {
      titulo: "Types and the dispatch flow",
      bloques: [
        {
          tipo: "tabla",
          cabeceras: ["Sub-type", "Source", "Destination", "Requires"],
          filas: [
            [
              "CUSTOMER",
              "Location",
              "Customer",
              "Enough balance, an unexpired lot (FEFO/FIFO). The delivery note or order document is optional.",
            ],
            [
              "SUPPLIER_RETURN",
              "Location",
              "Supplier",
              "Any location with stock; it allows a specific lot if lots are tracked; the reason is optional (a comment is recommended for quality issues).",
            ],
            [
              "SHRINKAGE",
              "Location",
              "— (a loss)",
              "Always a reason and, depending on the settings, approval. It decreases the balance and the lot; an expired lot has no restriction.",
            ],
            [
              "NEGATIVE_ADJUSTMENT",
              "Location",
              "— (a justified cause)",
              "Always a reason (≥3) and the ajuste:crear permission; it never leaves a balance below 0.",
            ],
            [
              "TRANSFER_OUT",
              "Source location (see transfers, 9)",
              "—",
              "The source half of an intra- or inter-warehouse transfer. Generated automatically when the transfer is approved.",
            ],
          ],
        },
        {
          tipo: "pasos",
          pasos: [
            "Create an OUTBOUND / CUSTOMER movement at /movimientos/nuevo?tipo=SALIDA: product/quantity/customer lines plus the source (with the FIFO/FEFO selector where applicable).",
            "Use Suggest FIFO/FEFO if the product tracks lots (pick the product and the quantity, and the system proposes the lots and locations).",
            "It validates enough balance, an unexpired lot and a location with stock; if not, it tells you where the stock is (product/lot/location).",
            "Approve → an atomic decrease, with traceability of the origin of every unit dispatched.",
          ],
        },
      ],
    },
  ],
};

const CH_TRANSFERS: ManualCapitulo = {
  id: "m04-traslados",
  titulo: "Transfers",
  icono: "traslado",
  resumen:
    "Moving stock without changing the warehouse total (intra) or with two linked movements (inter).",
  terminosClave: ["traslado", "ubicacion-bin", "caja"],
  relacionados: ["m04-modelo", "m07-traslado"],
  secciones: [
    {
      titulo: "Between locations / containers / warehouses",
      bloques: [
        {
          tipo: "lista",
          items: [
            "Between locations: source → destination, the same warehouse unless it is inter-warehouse. Atomic: an outbound at the source plus an inbound at the destination as one fact (insertar_movimiento inside a transaction). It validates the source balance, product/lot coherence and destination capacity.",
            "Between containers: give the source/destination container; if restricted, coherence is validated; on moving everything, it is left empty.",
            "Between warehouses (9.3): two linked movements with the same number/reference document (TRANSFER_OUT at the source + TRANSFER_IN at the destination), each a DRAFT approved separately, transactional with no orphans, and no change to the total if it is the same warehouse.",
            "Route: /movimientos/nuevo?tipo=TRASLADO (a single line with different source and destination, never the same location). The type selector lives in the query string, not a sub-route.",
          ],
        },
        {
          tipo: "nota",
          texto:
            "Moving a whole container is modelled as a transfer of its contents (validar_restriccion_caja on approval). It does not change the warehouse total if it is the same warehouse.",
          tono: "info",
        },
      ],
    },
  ],
};

const CH_ADJUSTMENTS: ManualCapitulo = {
  id: "m04-ajustes",
  titulo: "Stock adjustments",
  icono: "ajuste",
  resumen: "Corrections, shrinkage and surpluses: always with a reason, and never automatic.",
  terminosClave: ["ajuste", "merma", "saldo"],
  relacionados: ["m04-modelo", "m05-diferencias"],
  secciones: [
    {
      titulo: "Validation rules",
      bloques: [
        {
          tipo: "tabla",
          cabeceras: ["Rule", "Detail"],
          filas: [
            ["A reason is required", "Not empty, ≥3 characters, always."],
            ["Never automatic", "Always a user with the permission."],
            ["The balance is never <0", "A negative one is rejected on approval."],
            ["Execution", "APPROVED only (or directly if the role can approve)."],
          ],
        },
        {
          tipo: "lista",
          items: [
            "For a correction: state the expected balance or the difference.",
            "Shrinkage: a negative adjustment with a loss reason. Surplus: a positive one.",
          ],
        },
      ],
    },
  ],
};

const CH_FIFO: ManualCapitulo = {
  id: "m04-fifo",
  titulo: "Outbound policy: FIFO / FEFO",
  icono: "lote",
  resumen: "How the system chooses which lot and location leave first.",
  terminosClave: ["fifo", "fefo", "lote", "vencimiento"],
  relacionados: ["m03-lote", "m04-salidas"],
  secciones: [
    {
      titulo: "Order of the suggestion",
      bloques: [
        {
          tipo: "tabla",
          cabeceras: ["Product condition", "Policy", "Criterion"],
          filas: [
            ["Perishable or tracks expiry", "FEFO", "The earliest expiry date first."],
            ["Tracks lots without expiry", "FIFO", "The earliest manufacture or arrival date."],
            ["Does not track lots", "General stock", "From the chosen location."],
          ],
        },
        {
          tipo: "lista",
          items: [
            "Specific-lot exception: the user can give a specific lot_id if it has a balance and, for a perishable, is not expired.",
            "Within the source location; if there are several, it suggests by age and allows manual adjustment.",
          ],
        },
        {
          tipo: "nota",
          texto:
            "Hard rule: an expired lot does not go out to a customer or as a supplier return; only SHRINKAGE or a NEGATIVE_ADJUSTMENT.",
          tono: "warning",
        },
      ],
    },
  ],
};

const CH_QUICK_CAPTURE: ManualCapitulo = {
  id: "m04-captura",
  titulo: "Quick capture with a scanner",
  icono: "codigoBarras",
  resumen: "Receiving and dispatching, guided code by code.",
  terminosClave: ["codigo-barras", "entrada", "salida", "lote"],
  relacionados: ["m04-entradas", "m04-salidas"],
  secciones: [
    {
      titulo: "Flow",
      bloques: [
        {
          tipo: "lista",
          items: [
            "Routes: /movimientos/captura-recepcion and /movimientos/captura-despacho.",
            "A scan resolves to a PRODUCT/LOCATION/LOT/CONTAINER type with a label; EscaneoResuelto carries controla_lote straight from Rust.",
            "Lines require a lot if the product tracks lots.",
            "The scanner feeds the form; it never creates data on its own. An unknown code → an error plus a suggestion.",
          ],
        },
        {
          tipo: "nota",
          texto:
            "Quick capture avoids typing mistakes and honours the same validation as the ordinary form.",
          tono: "success",
        },
      ],
    },
  ],
};

const TRADUCIDOS: ManualCapitulo[] = [
  CH_VISION,
  CH_INSTALL,
  CH_ROLES,
  CH_PERSONALISATION,
  CH_GLOSSARY_ESSENTIAL,
  CH_STOCK,
  CH_UOM,
  CH_WAREHOUSE,
  CH_ZONE,
  CH_AISLE,
  CH_RACK,
  CH_SECTION,
  CH_LOCATION,
  CH_CONTAINER,
  CH_TREE,
  CH_MAP2D,
  CH_MAP3D,
  CH_ASSISTANT,
  CH_PRODUCT,
  CH_LOT,
  CH_CATEGORY,
  CH_SUPPLIER_CUSTOMER,
  CH_BRANCH,
  CH_MOVEMENT_MODEL,
  CH_LIFECYCLE,
  CH_INBOUND,
  CH_OUTBOUND,
  CH_TRANSFERS,
  CH_ADJUSTMENTS,
  CH_FIFO,
  CH_QUICK_CAPTURE,
];

const POR_ID = new Map(TRADUCIDOS.map((cap) => [cap.id, cap]));

/** Títulos y descripciones de las partes, que no son capítulos. */
const PARTES: Record<string, { titulo: string; descripcion: string }> = {
  "Parte 0 — Primeros pasos": {
    titulo: "Part 0 — First steps",
    descripcion: "Installation, access, roles and personalisation.",
  },
  "Parte 1 — Conceptos y stock": {
    titulo: "Part 1 — Concepts and stock",
    descripcion: "The vocabulary of the domain and how the balance works.",
  },
  "Parte 2 — Espacio físico": {
    titulo: "Part 2 — Physical space",
    descripcion: "The warehouse tree, the map and the layout assistant.",
  },
  "Parte 3 — Catálogos maestros": {
    titulo: "Part 3 — Master catalogues",
    descripcion: "Products, lots, categories, suppliers, customers and branches.",
  },
  "Parte 4 — Movimientos: el núcleo": {
    titulo: "Part 4 — Movements: the core",
    descripcion: "The model, the lifecycle and every type of movement.",
  },
  "Parte 5 — Inventario físico y conteo": {
    titulo: "Part 5 — Stocktaking and counting",
    descripcion: "Sessions, counts, discrepancies and accuracy.",
  },
  "Parte 6 — Métricas, reportes, alertas y actividad": {
    titulo: "Part 6 — Metrics, reports, alerts and activity",
    descripcion: "Everything the system measures and how to read it.",
  },
  "Parte 7 — Procesos de extremo a extremo": {
    titulo: "Part 7 — End-to-end processes",
    descripcion: "The complete daily flows, step by step.",
  },
  "Parte 8 — Anexos y reglas transversales": {
    titulo: "Part 8 — Appendices and cross-cutting rules",
    descripcion: "Queries, traceability, shortcuts, checklists and the glossary.",
  },
};

export const MANUAL_PARTES_EN: ManualParte[] = MANUAL_PARTES_ES.map((parte) => ({
  ...parte,
  titulo: PARTES[parte.titulo]?.titulo ?? parte.titulo,
  descripcion: PARTES[parte.titulo]?.descripcion ?? parte.descripcion,
  capitulos: parte.capitulos.map((cap) => POR_ID.get(cap.id) ?? cap),
}));

export const MANUAL_GLOSARIO_EN: TerminoManual[] = [
  {
    id: "almacen",
    termino: "Warehouse",
    definicion:
      "The root of the physical tree: every operation belongs to exactly one warehouse (e.g. ALM-PRINCIPAL). It contains zones. Unique code, active/inactive.",
  },
  {
    id: "zona",
    termino: "Zone",
    definicion:
      "A logical or physical division within a warehouse (Cold, Picking, Receiving, Quarantine). It belongs to exactly one warehouse. Code unique within the warehouse.",
  },
  {
    id: "pasillo",
    termino: "Aisle",
    definicion:
      "A physical subdivision of a zone that groups racks (a walkable aisle). It belongs to exactly one zone, with a code unique within the warehouse. An organisational record: it is not part of the simplified tree, but the collision matrix applies (it cannot have racks or locations on top of it).",
  },
  {
    id: "rack",
    termino: "Rack / Shelving",
    definicion:
      "A storage structure within a zone. It belongs to exactly one zone, and optionally to an aisle of the same zone. Code unique within the warehouse.",
  },
  {
    id: "seccion",
    termino: "Section",
    definicion:
      "A subdivision of a rack (levels A/B/C, bays). It belongs to exactly one rack. Code unique within the warehouse.",
  },
  {
    id: "ubicacion-bin",
    termino: "Location (bin)",
    definicion:
      "The addressable point where stock lives. It belongs to exactly one zone, rack or section (the simplified tree). Types: STANDARD, PICKING, RESERVE, RECEIVING, QUARANTINE, RETURNS, DAMAGED, SHIPPING. Optional maximum capacity. Code unique within the warehouse.",
  },
  {
    id: "caja",
    termino: "Container",
    definicion:
      "An optional physical container inside a location that groups stock. It can be restricted to one product and/or lot. Moving the container generates a transfer.",
  },
  {
    id: "producto-sku",
    termino: "Product / SKU",
    definicion:
      "The managed item. A unique canonical SKU, normalised to upper case with no spaces, immutable after creation. It requires a base UOM. Controls: tracks lots, tracks expiry, perishable.",
  },
  {
    id: "categoria",
    termino: "Category",
    definicion:
      "An optional hierarchical classification of products, as a tree with a parent_id. No cycles. Filterable in reports.",
  },
  {
    id: "uom",
    termino: "Unit of measure (UOM)",
    definicion:
      "The unit a product is measured in (PZA, KG, BOX, M…). Types: UNIT, WEIGHT, VOLUME, LENGTH, AREA. Factor ≥1 towards its family’s base UOM.",
  },
  {
    id: "uom-base",
    termino: "Base UOM",
    definicion:
      "The smallest manageable unit of its family. Every quantity is stored and operated on in the base UOM. A product requires an immutable base UOM.",
  },
  {
    id: "proveedor",
    termino: "Supplier",
    definicion:
      "The source of purchases. Referenced in PURCHASE inbound movements and supplier returns. An inactive supplier cannot be used in new inbound movements.",
  },
  {
    id: "cliente",
    termino: "Customer",
    definicion:
      "The destination of dispatches. Referenced in CUSTOMER outbound movements and customer returns.",
  },
  {
    id: "lote",
    termino: "Lot",
    definicion:
      "A grouping of units of a product with a common origin and dates. Number unique within the product. Every movement requires a lot if the product tracks lots.",
  },
  {
    id: "vencimiento",
    termino: "Expiry",
    definicion:
      "The lot’s use-by date. Required if the product tracks expiry. An expired lot does not go out to a customer or as a supplier return; only as shrinkage or a negative adjustment. It turns on FEFO.",
  },
  {
    id: "trazabilidad",
    termino: "Traceability",
    definicion:
      "The ability to reconstruct the complete history of a product, lot, location, movement and container (SPEC 13.4: 5 query types).",
  },
  {
    id: "fefo",
    termino: "FEFO",
    definicion:
      "First Expired, First Out: what expires first leaves first. Active if the product is perishable or tracks expiry.",
  },
  {
    id: "fifo",
    termino: "FIFO",
    definicion:
      "First In, First Out: what came in first leaves first. Active if the product tracks lots without expiry.",
  },
  {
    id: "saldo",
    termino: "Balance",
    definicion:
      "The quantity of a product (and lot if applicable) in a location. Canonical key (location, product, lot) → quantity. Materialised, never negative, derived from approved movements.",
  },
  {
    id: "stock-minimo",
    termino: "Minimum stock",
    definicion:
      "A threshold per product (global) and a company default. It raises the low-stock alert if the sum across locations is ≤ the minimum.",
  },
  {
    id: "stock-maximo",
    termino: "Maximum stock",
    definicion:
      "A target threshold per product that should not be exceeded. Informational; a location with a maximum capacity blocks inbound movements that would exceed it.",
  },
  {
    id: "capacidad-maxima",
    termino: "Maximum capacity",
    definicion:
      "The unit ceiling (summed in base UOM) a location accepts. Validated when approving inbound movements and transfers into it.",
  },
  {
    id: "codigo-barras",
    termino: "Barcode",
    definicion:
      "An optional identifier, unique per product, for scanner reading. It feeds the forms; it does not create data on its own.",
  },
  {
    id: "movimiento",
    termino: "Movement",
    definicion:
      "The only way to change stock. Types: INBOUND, OUTBOUND, TRANSFER, ADJUSTMENT (and CONSUMPTION). Statuses: DRAFT, PENDING_APPROVAL, APPROVED (the only one that changes balances), CANCELLED (generates the reverse). Fields: sequential number, type/sub-type, lines, source/destination, supplier/customer, reference document, reason, dates, audit.",
  },
  {
    id: "entrada",
    termino: "Inbound movement",
    definicion:
      "A movement that increases stock. Sub-types: PURCHASE, CUSTOMER_RETURN, POSITIVE_ADJUSTMENT, OPENING, TRANSFER_IN.",
  },
  {
    id: "salida",
    termino: "Outbound movement",
    definicion:
      "A movement that decreases stock. Sub-types: CUSTOMER, SUPPLIER_RETURN, SHRINKAGE, NEGATIVE_ADJUSTMENT, TRANSFER_OUT.",
  },
  {
    id: "traslado",
    termino: "Transfer",
    definicion:
      "Movement of stock between locations (atomic within a warehouse) or between warehouses (two linked movements sharing a reference document, transactional).",
  },
  {
    id: "ajuste",
    termino: "Adjustment",
    definicion:
      "A balance correction with a mandatory reason of ≥3 characters. Positive (surplus) or negative (shortfall). Never automatic. A negative one never leaves a balance below 0.",
  },
  {
    id: "merma",
    termino: "Shrinkage",
    definicion:
      "An outbound movement for loss (damage, expiry, theft). Always requires a reason. The only permitted destination for expired lots holding a balance.",
  },
  {
    id: "borrador",
    termino: "Draft",
    definicion: "A movement’s initial status: no effect on stock, editable only by its creator.",
  },
  {
    id: "pendiente-aprobacion",
    termino: "Pending approval",
    definicion:
      "A movement sent for approval: no effect on stock. Next status: APPROVED or CANCELLED.",
  },
  {
    id: "aprobado",
    termino: "Approved",
    definicion:
      "The only status that changes balances. Immutable and only cancellable (which generates the reverse). It executes the lines atomically.",
  },
  {
    id: "anulado",
    termino: "Cancelled",
    definicion:
      "A cancelled movement. If it had affected stock, it generates a reversing movement linked by movimiento_inverso_id. It cannot be re-approved.",
  },
  {
    id: "movimiento-inverso",
    termino: "Reversing movement",
    definicion:
      "A movement generated when an APPROVED one is cancelled, which undoes its effect on balances exactly. Both hold a mutual reference.",
  },
  {
    id: "sesion-inventario",
    termino: "Inventory session",
    definicion:
      "The formal counting process. Types: FULL (the whole warehouse/scope) or CYCLE (a subset). Statuses: PLANNED→IN_PROGRESS→CLOSED/CANCELLED. Fields: almacen_id, scope, blind count, requires double count.",
  },
  {
    id: "conteo-ciego",
    termino: "Blind count",
    definicion:
      "Counting without showing the counter the system balance (to avoid bias). As implemented: at /inventario/:id/conteos the balance is never shown, blind or not (a guarantee).",
  },
  {
    id: "doble-conteo",
    termino: "Double count",
    definicion:
      "A requirement for a second count (count number 1st/2nd) before a discrepancy is accepted. If double count is required, the discrepancy is only accepted when the 2nd confirms it.",
  },
  {
    id: "diferencia-inventario",
    termino: "Inventory discrepancy",
    definicion:
      "The deviation of counted against system. 0 = reconciled, >0 = surplus → inbound adjustment, <0 = shortfall → outbound adjustment. Persisted on closing in sesion_diferencias (a historical snapshot).",
  },
  {
    id: "precision-inventario",
    termino: "Inventory accuracy",
    definicion:
      "Metrics per session: by SKU (exact SKUs/counted×100), by quantity (correct units/counted×100), location accuracy (locations with no discrepancy/counted×100). Targets ≥95/98/90.",
  },
  {
    id: "alerta",
    termino: "Alert",
    definicion:
      "A notice derived from rules: low stock, over maximum, over capacity, expiring soon, expired, inventory discrepancy, pending approval. Severity INFO/MEDIUM/HIGH. Statuses OPEN/RESOLVED/ARCHIVED. Visible only with view permission on the record. Lazily regenerated on each listing.",
  },
  {
    id: "auditoria",
    termino: "Audit",
    definicion:
      "An immutable event per operation: usuario_id, action, entity/entity_id, before/after, UTC timestamp, ip/origin, module/process/tenant, event type COMMAND/VIEW, route, JSON metadata. A complete, filterable history.",
  },
  {
    id: "rol",
    termino: "Role",
    definicion:
      "ADMIN (everything), MANAGER (everything except users/settings), WAREHOUSE MANAGER (movements + stocktaking), OPERATOR (creates movements + counts), READER (read only). One role per user (v1). Matrix in SPEC 4.4.",
  },
  {
    id: "usuario",
    termino: "User",
    definicion:
      "An account with a unique username, full name, optional unique email, rol_id, active flag and an argon2 password hash. The first ADMIN is created by bootstrap. An inactive account does not authenticate.",
  },
  {
    id: "permiso",
    termino: "Permission",
    definicion:
      "A resource:action rule that protects each operation. Format resource:action (e.g. producto:ver, movimiento:aprobar). View is the minimum to appear in listings. Export is independent. Cancel/approve are distinct from create.",
  },
  {
    id: "kardex",
    termino: "Stock card",
    definicion:
      "A stock card per product/lot: chronological movements with a running balance. Report at /reportes/kardex.",
  },
  {
    id: "desactivar",
    termino: "Deactivate (logical delete)",
    definicion:
      "Instead of a physical delete, activo is set to false. History and movements are kept. Only records with no history allow a physical delete. A location holding a balance, or an aisle with stock beneath it, cannot be deactivated.",
  },
  {
    id: "creacion-rapida",
    termino: "Quick create",
    definicion:
      "Creating a related record without leaving the main form (e.g. creating a product from a movement). On returning it is already selected; the draft is preserved.",
  },
  {
    id: "mapa-3d",
    termino: "3D map",
    definicion:
      "An immersive fullscreen editor for the warehouse (three.js): prisms by type, multiple selection, duplicate, WASD walking, wireframe, coordinate HUD. The same physical validation as 2D.",
  },
  {
    id: "importar",
    termino: "Import",
    definicion:
      "Bulk loading of catalogues (products, locations…) via CSV at /configuracion/importar. It validates and reports a ResultadoImportacion with OK rows and errors per line.",
  },
  {
    id: "sucursal",
    termino: "Branch",
    definicion:
      "An operating point of the company (a record of its own, not in the base SPEC). Fields: unique code, name, address, coordinates, country/city, contact. Settings.",
  },
  {
    id: "consulta-universal",
    termino: "Universal query",
    definicion:
      "SPEC 15’s principle: every listing is filterable (13 operators), sortable, searchable, pageable, selectable, aggregatable and exportable, with combinable filters and a deep link in the URL.",
  },
];
