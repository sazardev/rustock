// oxlint-disable eslint/max-lines
/**
 * Customer Manual content, in English.
 *
 * TRANSLATION IN PROGRESS. The manual is 52 chapters of long-form prose,
 * translated part by part. Until a part is done, its Spanish text is served:
 * that is visible and documented here, not a silent gap.
 */
import { MANUAL_PARTES_ES } from "./manual-contenido.es";
import type { ManualParte, TerminoManual } from "./manual-tipos";

export const MANUAL_PARTES_EN: ManualParte[] = MANUAL_PARTES_ES;

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
