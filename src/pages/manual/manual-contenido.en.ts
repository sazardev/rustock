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
const TRADUCIDOS: ManualCapitulo[] = [CH_VISION, CH_INSTALL];

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
