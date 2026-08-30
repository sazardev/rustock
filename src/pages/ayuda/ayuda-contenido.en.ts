// oxlint-disable eslint/max-lines
/**
 * Help content, in English.
 *
 * Documents the modules AS THEY BEHAVE in the application today (real router
 * routes, form actions and labels, states and behaviours the backend
 * implements). Maintained by hand; when a module changes, update the matching
 * section here and its Spanish counterpart.
 */
import { PATH } from "../../app/route-paths";
import type { AyudaGrupo, AyudaModulo, TerminoGlosario } from "./ayuda-tipos";

const MODULE_WAREHOUSES: AyudaModulo = {
  id: "almacenes",
  titulo: "Warehouses, zones, racks and sections",
  icono: "almacen",
  resumen: "The physical tree: warehouse, zone, rack and section, and how they are created.",
  paraQueSirve:
    "Defines the physical structure of your warehouse: where each thing is kept. Without a well-organised tree, stock has nowhere to live and reports by zone stop making sense.",
  cuandoUsarlo:
    "When first setting Rustock up, and every time you extend or reorganise the physical space of your operation.",
  terminosClave: ["almacen", "zona", "rack", "seccion", "ubicacion-bin", "desactivar"],
  relacionados: ["ubicaciones", "productos", "proceso-recepcion"],
  secciones: [
    {
      titulo: "What it is",
      bloques: [
        {
          tipo: "texto",
          texto:
            "The Warehouse is the root of the physical tree: every operation belongs to exactly one warehouse. Zones are organised inside a warehouse, racks inside zones, and sections inside racks. Locations (where stock lives) hang from a zone, a rack or a section.",
        },
        {
          tipo: "tabla",
          cabeceras: ["Level", "Role", "Example code"],
          filas: [
            ["Warehouse", "Root of the operation", "ALM-PRINCIPAL"],
            ["Zone", "Logical or physical division", "Z-01"],
            ["Rack", "Storage structure", "RACK-A1"],
            ["Section", "Subdivision of a rack", "RACK-A1-N2"],
          ],
        },
      ],
    },
    {
      titulo: "Where to find it",
      bloques: [
        {
          tipo: "enlaces",
          items: [
            { etiqueta: "Warehouse list", href: "/almacenes" },
            { etiqueta: "New warehouse", href: "/almacenes/nuevo" },
            { etiqueta: "New zone", href: "/zonas/nuevo" },
            { etiqueta: "New rack", href: "/racks/nuevo" },
            { etiqueta: "New section", href: "/secciones/nuevo" },
          ],
        },
      ],
    },
    {
      titulo: "Available actions",
      bloques: [
        {
          tipo: "lista",
          items: [
            "Warehouse list with full-text search, 20 per page and ordered by creation date descending. Each row opens the detail.",
            "Warehouse detail: code, name, description, address, creation and last-update dates, and the navigable physical tree (Zone → Rack → Section → Location). Actions: Edit and Delete.",
            "Create warehouse: code (required, cannot be changed afterwards), name (required), address and description.",
            "Edit warehouse: lets you change name, description and address. The code is locked.",
            "Delete warehouse: deactivates the record (logical delete). Nothing is physically deleted; the history and associated movements are kept.",
            "Zones: list, detail (with their warehouse), creation and editing. The code is locked; deleting deactivates (and is rejected if it holds stock).",
            "Racks: list, detail (with their zone), creation and editing. The code is locked; deleting deactivates (and is rejected if it holds stock).",
            "Sections: list, detail (with their rack), creation and editing. The code is locked; deleting deactivates (and is rejected if it holds stock).",
            "Zone, rack and section codes are unique within the whole warehouse (not just under their parent): they cannot repeat even if they hang from different containers.",
          ],
        },
      ],
    },
    {
      titulo: "How to build the physical tree",
      bloques: [
        {
          tipo: "pasos",
          pasos: [
            "Create the warehouse at /almacenes/nuevo (code and name).",
            "Create the warehouse’s zones at /zonas/nuevo, selecting the warehouse.",
            "Create each zone’s racks at /racks/nuevo, selecting the zone.",
            "Create each rack’s sections at /secciones/nuevo, selecting the rack.",
            "Create the locations at /ubicaciones/nuevo, choosing the matching zone, rack or section as the container.",
          ],
        },
      ],
    },
    {
      titulo: "Rules and behaviour",
      bloques: [
        {
          tipo: "lista",
          items: [
            "Zone, rack, section and location each have their own list, detail, creation and editing (routes /zonas, /racks, /secciones and /ubicaciones). The warehouse detail shows the whole navigable physical tree, and containers (inside a location) have their own catalogue at /cajas.",
            "The quick-create forms let you create a warehouse from /zonas/nuevo, a zone from /racks/nuevo, a rack from /secciones/nuevo and any of them from /ubicaciones/nuevo: on returning, the newly created container is already selected.",
            "An inactive warehouse cannot be used in new operations.",
            "On deactivating, the record keeps its data: only the Active state changes to Inactive.",
          ],
        },
      ],
    },
    {
      titulo: "Common mistakes and good practice",
      bloques: [
        {
          tipo: "nota",
          tono: "info",
          texto:
            "Think the tree through before creating it: warehouse → zone → rack → section → location. A well-chosen code (e.g. RACK-A1-N2-P3) explains itself and simplifies the physical count.",
        },
        {
          tipo: "nota",
          tono: "warning",
          texto:
            "You cannot deactivate a warehouse while you still use it in new operations: first move or run down the stock in its locations and stop using it in movements.",
        },
        {
          tipo: "nota",
          tono: "success",
          texto:
            "Use quick create: from a zone’s form you can create the warehouse on the fly and it is selected when you return. It saves interrupting the flow.",
        },
      ],
    },
  ],
};

const MODULE_LOCATIONS: AyudaModulo = {
  id: "ubicaciones",
  titulo: "Locations",
  icono: "ubicacion",
  resumen: "The addressable points where stock lives, and what they hold.",
  paraQueSirve:
    "Locations are the exact points where goods are placed; the balance is recorded per (location, product, lot). They are the operational level where you pick, receive and count.",
  cuandoUsarlo:
    "When defining your warehouse, and to organise the flow: separating receiving, picking, quarantine, returns and damaged goods makes daily work clearer.",
  terminosClave: ["ubicacion-bin", "capacidad-maxima", "saldo", "desactivar"],
  relacionados: ["almacenes", "inventario", "proceso-traslado"],
  secciones: [
    {
      titulo: "What it is",
      bloques: [
        {
          tipo: "texto",
          texto:
            "A location (bin) is the addressable storage point where goods are placed. It is the level of the tree where stock lives: balances are recorded per (location, product, lot). Every location hangs from exactly one zone, rack or section.",
        },
      ],
    },
    {
      titulo: "Where to find it",
      bloques: [
        {
          tipo: "enlaces",
          items: [
            { etiqueta: "Location list", href: "/ubicaciones" },
            { etiqueta: "New location", href: "/ubicaciones/nuevo" },
          ],
        },
      ],
    },
    {
      titulo: "Available actions",
      bloques: [
        {
          tipo: "lista",
          items: [
            "List with full-text search, 20 per page and ordered by creation date descending. Columns: code, name, type, maximum capacity and status.",
            "Detail: code, name, type, maximum capacity and creation date. Actions: Edit and Delete.",
            "Create location: code (required, e.g. RACK-A1-N2-P3), name, type, maximum capacity and parent container (zone, rack or section; required).",
            "Edit location: name, type and maximum capacity. The code and the container cannot be changed.",
            "Delete location: deactivates the record (logical delete). A location holding a balance cannot be deactivated: it must first be emptied or its contents moved.",
          ],
        },
      ],
    },
    {
      titulo: "Location types",
      bloques: [
        {
          tipo: "tabla",
          cabeceras: ["Type", "Suggested use"],
          filas: [
            ["Standard", "General storage"],
            ["Picking", "Order preparation area"],
            ["Reserve", "Reserve stock"],
            ["Receiving", "Goods just received"],
            ["Quarantine", "Goods under review"],
            ["Returns", "Goods returned by customers"],
            ["Damaged", "Damaged or unusable goods"],
            ["Shipping", "Goods ready to dispatch"],
          ],
        },
      ],
    },
    {
      titulo: "Rules and behaviour",
      bloques: [
        {
          tipo: "lista",
          items: [
            "A location can hold several products and several lots at once (mixed stock).",
            "If the location has a maximum capacity, the system blocks inbound movements that would exceed it when they are approved.",
            "The parent container is chosen in the form with a double selector: container type (zone/rack/section) and then the specific element.",
          ],
        },
      ],
    },
    {
      titulo: "Common mistakes and good practice",
      bloques: [
        {
          tipo: "nota",
          tono: "info",
          texto:
            "Tell the location types apart by function: Returns for what comes back from customers, Quarantine for what is under review, Damaged for what will be written off, Shipping for what is ready to dispatch.",
        },
        {
          tipo: "nota",
          tono: "warning",
          texto:
            "A location holding a balance cannot be deactivated: empty it or move its contents first. Plan for this if you intend to reorganise the warehouse.",
        },
        {
          tipo: "nota",
          tono: "success",
          texto:
            "Set the maximum capacity if you want the system to warn you (and block) when a location fills up. With no capacity set, any quantity goes in as long as there is a balance.",
        },
      ],
    },
  ],
};

const MODULE_PRODUCTS: AyudaModulo = {
  id: "productos",
  titulo: "Products (SKUs)",
  icono: "producto",
  resumen: "The catalogue of managed items, with units of measure and controls.",
  paraQueSirve:
    "Each product (SKU) is an item you buy, sell or store. The product catalogue is the heart of the operation: with no products on record you cannot receive or dispatch anything.",
  cuandoUsarlo:
    "Before operating (every product must exist with its base UOM) and whenever you add a new item, change its lot/expiry controls, or change its replenishment minimum.",
  terminosClave: [
    "producto-sku",
    "uom",
    "uom-base",
    "lote",
    "fefo",
    "fifo",
    "stock-minimo",
    "stock-maximo",
    "codigo-barras",
  ],
  relacionados: ["uoms", "lotes", "categorias", "proceso-recepcion", "proceso-despacho"],
  secciones: [
    {
      titulo: "What it is",
      bloques: [
        {
          tipo: "texto",
          texto:
            "A product (SKU) is the managed item. The SKU is the canonical identifier: it is normalised to upper case, it is unique, and it cannot be changed once created. Every product needs a base unit of measure (the smallest manageable unit).",
        },
      ],
    },
    {
      titulo: "Where to find it",
      bloques: [
        {
          tipo: "enlaces",
          items: [
            { etiqueta: "Product list", href: "/productos" },
            { etiqueta: "New product", href: "/productos/nuevo" },
          ],
        },
      ],
    },
    {
      titulo: "Available actions",
      bloques: [
        {
          tipo: "lista",
          items: [
            "List with full-text search, 20 per page and ordered by creation date descending. Columns: SKU, name, controls (Lot, Expiry and Perishable badges) and status.",
            "Detail: all the product data (SKU, name, category, base/sales/purchase UOM, barcode, weight, volume, minimum and maximum stock, controls and dates). Actions: Edit and Delete.",
            "Create product: SKU and name required; base UOM required and immutable afterwards; category, sales and purchase UOM, barcode, weight, volume, minimum and maximum stock optional.",
            "Edit product: name, category, sales/purchase UOM, barcode, weight, volume, minimums/maximums and controls. The SKU and the base UOM are locked.",
            "Delete product: deactivates the record (logical delete). An inactive product cannot take new inbound or outbound movements.",
          ],
        },
      ],
    },
    {
      titulo: "Product controls",
      bloques: [
        {
          tipo: "tabla",
          cabeceras: ["Control", "Effect"],
          filas: [
            ["Tracks lots", "Every movement of this product requires a lot to be given."],
            [
              "Tracks expiry",
              "Implies tracking lots, and requires the lot’s expiry date to be recorded.",
            ],
            [
              "Perishable",
              "Turns on the FEFO policy for outbound movements (the lot expiring soonest leaves first).",
            ],
          ],
        },
      ],
    },
    {
      titulo: "Rules and behaviour",
      bloques: [
        {
          tipo: "lista",
          items: [
            "If you tick “Tracks expiry”, the system turns on “Tracks lots” automatically.",
            "The minimum stock triggers the low-stock alert when the product’s balance (across all its locations) falls to that level or below.",
            "The barcode, if present, must be unique and is used to identify the product by scanning.",
          ],
        },
      ],
    },
    {
      titulo: "Common mistakes and good practice",
      bloques: [
        {
          tipo: "nota",
          tono: "info",
          texto:
            "Create the units of measure first and the products afterwards: without a base UOM you cannot register a product, and that UOM can no longer be changed.",
        },
        {
          tipo: "nota",
          tono: "warning",
          texto:
            "The SKU is immutable once created and must be unique. Normalise it from the start (upper case, no spaces) and avoid duplicating items with near-identical SKUs.",
        },
        {
          tipo: "nota",
          tono: "warning",
          texto:
            "An inactive product cannot take new inbound or outbound movements. Before deactivating, confirm you do not need to operate it.",
        },
        {
          tipo: "nota",
          tono: "success",
          texto:
            "If you sell by the box but buy by the piece, define a sales and a purchase UOM with their factor: the system converts automatically and everything is kept in the base UOM.",
        },
      ],
    },
  ],
};

const MODULE_LOTS: AyudaModulo = {
  id: "lotes",
  titulo: "Lots",
  icono: "lote",
  resumen: "Groups of units with a common origin and dates, for traceability.",
  paraQueSirve:
    "A lot groups units of the same product that share an origin and dates, and lets you trace where each unit came from and when it expires. It is the basis of traceability and of FEFO control.",
  cuandoUsarlo:
    "For products with lot tracking (required), especially perishables or those with an expiry: when receiving, dispatching, transferring and counting.",
  terminosClave: ["lote", "fefo", "fifo", "vencimiento", "trazabilidad"],
  relacionados: ["productos", "movimientos", "reportes", "proceso-recepcion", "proceso-merma"],
  secciones: [
    {
      titulo: "What it is",
      bloques: [
        {
          tipo: "texto",
          texto:
            "A lot groups units of a product with a common origin and date. It only makes sense for products that track lots: for those products, every movement (inbound, outbound, transfer, adjustment) must state the lot.",
        },
      ],
    },
    {
      titulo: "Where to find it",
      bloques: [
        {
          tipo: "enlaces",
          items: [
            { etiqueta: "Lot list", href: "/lotes" },
            { etiqueta: "New lot", href: "/lotes/nuevo" },
          ],
        },
      ],
    },
    {
      titulo: "Available actions",
      bloques: [
        {
          tipo: "lista",
          items: [
            "List with full-text search, 20 per page and ordered by creation date descending. Columns: number, product, expiry and origin.",
            "Detail: number, product, manufacturing and expiry dates, origin, notes and creation date.",
            "Create lot: number (required, immutable afterwards), product (only those tracking lots appear), dates, origin and notes.",
            "Edit lot: dates, origin and notes. The number and the product cannot be changed.",
            "Lots have no delete action.",
          ],
        },
      ],
    },
    {
      titulo: "Rules and behaviour",
      bloques: [
        {
          tipo: "lista",
          items: [
            "The lot number is unique within the product.",
            "If the product tracks expiry, the expiry date is required when creating the lot and when recording inbound movements with a new lot.",
            "An expired lot cannot leave as a customer dispatch or a supplier return: only as shrinkage or a negative adjustment.",
            "Lots are listed filtered by product in the movement and count forms (the “Lot” selector).",
          ],
        },
      ],
    },
    {
      titulo: "Common mistakes and good practice",
      bloques: [
        {
          tipo: "nota",
          tono: "warning",
          texto:
            "The expiry date is only required if the product tracks expiry. If you handle perishables, turn it on so the system applies FEFO on outbound movements.",
        },
        {
          tipo: "nota",
          tono: "warning",
          texto:
            "An expired lot does not go out to a customer. To remove it from stock, use an outbound shrinkage movement or a negative adjustment.",
        },
        {
          tipo: "nota",
          tono: "success",
          texto:
            "Use the expiries report and the “Lot expiring soon” alert to issue lots before they expire and avoid shrinkage.",
        },
      ],
    },
  ],
};

const MODULE_CATEGORIES: AyudaModulo = {
  id: "categorias",
  titulo: "Categories",
  icono: "categoria",
  resumen: "Hierarchical classification of products.",
  paraQueSirve:
    "Categories group products by type, family or use, in a tree (with parent categories). They serve to filter stock and reports and to find items quickly.",
  cuandoUsarlo:
    "When building your initial catalogue and whenever you add products: classifying from the start makes reports by category far more useful.",
  terminosClave: ["categoria", "producto-sku"],
  relacionados: ["productos", "reportes"],
  secciones: [
    {
      titulo: "What it is",
      bloques: [
        {
          tipo: "texto",
          texto:
            "A category classifies products and can be organised into a tree hierarchy (a category may have a parent category). A product may reference a category; it is not required.",
        },
      ],
    },
    {
      titulo: "Where to find it",
      bloques: [
        {
          tipo: "enlaces",
          items: [
            { etiqueta: "Category list", href: "/categorias" },
            { etiqueta: "New category", href: "/categorias/nuevo" },
          ],
        },
      ],
    },
    {
      titulo: "Available actions",
      bloques: [
        {
          tipo: "lista",
          items: [
            "List with full-text search, 20 per page and ordered by creation date descending. Columns: name, parent category and status.",
            "Detail: name, description, parent category and creation date. Actions: Edit and Delete.",
            "Create category: name (required), parent category (optional; with no parent it sits at the root of the tree) and description.",
            "Edit category: lets you change the name and description and move the category to another parent or to the root. The parent selector excludes the category itself.",
            "Delete category: deactivates the record (logical delete).",
          ],
        },
      ],
    },
    {
      titulo: "Rules and behaviour",
      bloques: [
        {
          tipo: "lista",
          items: [
            "The system rejects hierarchies with cycles: a category cannot be placed as a descendant of itself.",
            "The Current stock report can be filtered by category.",
          ],
        },
      ],
    },
    {
      titulo: "Common mistakes and good practice",
      bloques: [
        {
          tipo: "nota",
          tono: "info",
          texto:
            "Plan the hierarchy before creating it: you do not need a level per variant. A tree of 2 or 3 levels (Family → Sub-family) is usually enough.",
        },
        {
          tipo: "nota",
          tono: "warning",
          texto:
            "A cycle cannot be created (a category descending from itself): the system rejects it. When editing, the parent selector excludes the category itself.",
        },
      ],
    },
  ],
};

const MODULE_UOMS: AyudaModulo = {
  id: "uoms",
  titulo: "Units of measure (UOM)",
  icono: "uom",
  resumen: "The units products are measured in, and their conversion factors.",
  paraQueSirve:
    "They define how each product is quantified (pieces, kilos, litres, boxes…). The base UOM is the smallest unit; every quantity is stored internally in it so operations stay consistent.",
  cuandoUsarlo:
    "Before creating products: every product needs a base UOM. Also when you buy or sell in units other than the base (e.g. pieces vs. boxes).",
  terminosClave: ["uom", "uom-base", "producto-sku"],
  relacionados: ["productos", "proceso-recepcion", "proceso-despacho"],
  secciones: [
    {
      titulo: "What it is",
      bloques: [
        {
          tipo: "texto",
          texto:
            "The unit of measure (UOM) defines what a product is measured in. The base UOM is the smallest manageable unit of its family; the other UOMs in the same family are expressed as a conversion factor towards the base. Every quantity is stored internally in the base UOM.",
        },
      ],
    },
    {
      titulo: "Where to find it",
      bloques: [
        {
          tipo: "enlaces",
          items: [
            { etiqueta: "Unit of measure list", href: "/uoms" },
            { etiqueta: "New unit of measure", href: "/uoms/nuevo" },
          ],
        },
      ],
    },
    {
      titulo: "Available actions",
      bloques: [
        {
          tipo: "lista",
          items: [
            "List with full-text search, 20 per page and ordered by creation date descending. Columns: code, name, type, factor, whether it is its family’s base, and status.",
            "Detail: code, name, type, conversion factor, whether it is the base, status and creation date.",
            "Create unit of measure: code (required), name (required), type, conversion factor (1 or greater) and the “is the base unit of its family” marker.",
            "Edit unit of measure: name, type, factor and the base marker. The code is locked (it defines identity).",
            "Delete unit of measure: deactivates the record (logical delete). A UOM used by a product as its base, sales or purchase unit cannot be deactivated.",
          ],
        },
      ],
    },
    {
      titulo: "UOM types",
      bloques: [
        {
          tipo: "tabla",
          cabeceras: ["Type", "Examples"],
          filas: [
            ["Unit", "PZA (piece)"],
            ["Weight", "KG, GR"],
            ["Volume", "L, ML"],
            ["Length", "M, CM"],
            ["Area", "M2"],
          ],
        },
      ],
    },
    {
      titulo: "Rules and behaviour",
      bloques: [
        {
          tipo: "lista",
          items: [
            "The factor states how many base units this UOM equals (e.g. BOX with factor 10 over PZA: 1 box = 10 pieces).",
            "A product can only be created if at least one UOM exists: create the UOMs first and the products afterwards.",
          ],
        },
      ],
    },
    {
      titulo: "Common mistakes and good practice",
      bloques: [
        {
          tipo: "nota",
          tono: "info",
          texto:
            "Create each family’s base UOM (e.g. PZA, KG, L) before the derived ones (BOX, GR, ML). That way the conversion factors are clear.",
        },
        {
          tipo: "nota",
          tono: "warning",
          texto:
            "A UOM’s code cannot be edited once created: check the code and the factor carefully before saving. UOMs in use by a product cannot be deactivated.",
        },
        {
          tipo: "nota",
          tono: "success",
          texto:
            "The factor must be 1 or greater. A family’s base UOM is the root of the conversion; the others are expressed towards it.",
        },
      ],
    },
  ],
};

const MODULE_SUPPLIERS: AyudaModulo = {
  id: "proveedores",
  titulo: "Suppliers",
  icono: "proveedor",
  resumen: "The source of purchases: purchase inbound movements reference them.",
  paraQueSirve:
    "They record who you buy goods from. Purchase receipts and supplier returns reference them, leaving traceability for the origin of every inbound movement.",
  cuandoUsarlo:
    "When adding a new supplier or receiving goods: selecting one on the inbound movement is required for the Purchase and Supplier return sub-types.",
  terminosClave: ["proveedor", "entrada", "trazabilidad"],
  relacionados: ["clientes", "movimientos", "reportes", "proceso-recepcion"],
  secciones: [
    {
      titulo: "What it is",
      bloques: [
        {
          tipo: "texto",
          texto:
            "A supplier is the entity goods are received from. Purchase inbound movements and supplier returns reference it as the origin or destination of the operation.",
        },
      ],
    },
    {
      titulo: "Where to find it",
      bloques: [
        {
          tipo: "enlaces",
          items: [
            { etiqueta: "Supplier list", href: "/proveedores" },
            { etiqueta: "New supplier", href: "/proveedores/nuevo" },
          ],
        },
      ],
    },
    {
      titulo: "Available actions",
      bloques: [
        {
          tipo: "lista",
          items: [
            "List with full-text search, 20 per page and ordered by creation date descending. Columns: code, name, phone and status.",
            "Detail: code, name, contact, phone, email, address and creation date. Actions: Edit and Delete.",
            "Create supplier: code (required, immutable afterwards), name (required), contact, phone, email and address.",
            "Edit supplier: name, contact, phone, email and address. The code is locked.",
            "Delete supplier: deactivates the record (logical delete). An inactive supplier cannot be used in new inbound movements.",
          ],
        },
      ],
    },
    {
      titulo: "Rules and behaviour",
      bloques: [
        {
          tipo: "lista",
          items: [
            "In the movement form, the supplier selector appears for the Purchase and Supplier return sub-types.",
            "The Inbound for the period report can be filtered by supplier.",
          ],
        },
      ],
    },
    {
      titulo: "Common mistakes and good practice",
      bloques: [
        {
          tipo: "nota",
          tono: "warning",
          texto:
            "An inactive supplier cannot be used in new inbound movements. Before deactivating, make sure you will not buy from them again.",
        },
        {
          tipo: "nota",
          tono: "success",
          texto:
            "Record the supplier’s contact details: they help identify invoices and handle returning goods.",
        },
      ],
    },
  ],
};

const MODULE_CUSTOMERS: AyudaModulo = {
  id: "clientes",
  titulo: "Customers",
  icono: "cliente",
  resumen: "The destination of dispatches: customer outbound movements reference them.",
  paraQueSirve:
    "They record who you dispatch goods to. Customer dispatches and customer returns reference them, keeping the destination of every outbound movement traced.",
  cuandoUsarlo:
    "When adding a new customer or dispatching an order: selecting one on the outbound movement is required for the Customer and Customer return sub-types.",
  terminosClave: ["cliente", "salida", "trazabilidad"],
  relacionados: ["proveedores", "movimientos", "reportes", "proceso-despacho"],
  secciones: [
    {
      titulo: "What it is",
      bloques: [
        {
          tipo: "texto",
          texto:
            "A customer is the entity that receives goods. Customer dispatch outbound movements and customer returns reference it as the destination or origin of the operation.",
        },
      ],
    },
    {
      titulo: "Where to find it",
      bloques: [
        {
          tipo: "enlaces",
          items: [
            { etiqueta: "Customer list", href: "/clientes" },
            { etiqueta: "New customer", href: "/clientes/nuevo" },
          ],
        },
      ],
    },
    {
      titulo: "Available actions",
      bloques: [
        {
          tipo: "lista",
          items: [
            "List with full-text search, 20 per page and ordered by creation date descending. Columns: code, name, phone and status.",
            "Detail: code, name, contact, phone, email, address and creation date. Actions: Edit and Delete.",
            "Create customer: code (required, immutable afterwards), name (required), contact, phone, email and address.",
            "Edit customer: name, contact, phone, email and address. The code is locked.",
            "Delete customer: deactivates the record (logical delete).",
          ],
        },
      ],
    },
    {
      titulo: "Rules and behaviour",
      bloques: [
        {
          tipo: "lista",
          items: [
            "In the movement form, the customer selector appears for the Customer dispatch and Customer return sub-types.",
            "The Outbound for the period report can be filtered by customer.",
          ],
        },
      ],
    },
    {
      titulo: "Common mistakes and good practice",
      bloques: [
        {
          tipo: "nota",
          tono: "warning",
          texto:
            "An inactive customer cannot be used in new outbound movements. Before deactivating, check there are no pending dispatches.",
        },
        {
          tipo: "nota",
          tono: "success",
          texto:
            "Record the contact and address: if a customer returns goods, you will know who from and where to receive them.",
        },
      ],
    },
  ],
};

const MODULE_DASHBOARD: AyudaModulo = {
  id: "dashboard",
  titulo: "Dashboard",
  icono: "dashboard",
  resumen: "Operational indicators: KPIs, alerts and recent movements.",
  paraQueSirve:
    "It is the business at a glance: how much stock you hold, how many alerts are open, what you moved today and how accurate your last count was. It helps spot problems before they escalate.",
  cuandoUsarlo:
    "At the start of the day (to review alerts and today’s movements) and as the starting point for deciding what to deal with first.",
  terminosClave: ["saldo", "alerta", "precision-inventario", "merma", "movimiento"],
  relacionados: ["movimientos", "alertas", "reportes"],
  secciones: [
    {
      titulo: "What it is",
      bloques: [
        {
          tipo: "texto",
          texto:
            "The Dashboard is the application’s home page (route /dashboard). It shows a summary of the operation with key indicators, additional indicators and the most recent movements.",
        },
      ],
    },
    {
      titulo: "Where to find it",
      bloques: [{ tipo: "enlaces", items: [{ etiqueta: "Dashboard", href: PATH.dashboard }] }],
    },
    {
      titulo: "Key indicators",
      bloques: [
        {
          tipo: "tabla",
          cabeceras: ["Indicator", "What it shows"],
          filas: [
            ["Active SKUs", "Number of active products in the catalogue."],
            ["Total units", "Sum of all units in stock (base UOM)."],
            ["Active alerts", "Alerts in the OPEN state."],
            ["Movements today", "Movements whose movement date is today."],
            [
              "Accuracy (last session)",
              "SKU accuracy of the last closed inventory session, or “No closed sessions”.",
            ],
            ["Location occupancy", "Percentage of locations holding stock out of the total."],
          ],
        },
      ],
    },
    {
      titulo: "Additional indicators",
      bloques: [
        {
          tipo: "tabla",
          cabeceras: ["Indicator", "What it shows"],
          filas: [
            ["Shrinkage rate", "Percentage of shrinkage units against inbound units."],
            ["Expired lots not written off", "Lots past their expiry that still hold a balance."],
          ],
        },
      ],
    },
    {
      titulo: "Recent movements",
      bloques: [
        {
          tipo: "texto",
          texto:
            "The “Recent movements” table lists the 5 most recent movements by movement date (number, type, date and status). Each row opens the movement detail.",
        },
        {
          tipo: "texto",
          texto: "The “New movement” button in the header opens the movement creation form.",
        },
      ],
    },
  ],
};

const MODULE_MOVEMENTS: AyudaModulo = {
  id: "movimientos",
  titulo: "Movements",
  icono: "movements",
  resumen: "The core of the system: inbound, outbound, transfers and stock adjustments.",
  paraQueSirve:
    "It is the only way to change stock: every inbound, outbound, transfer or adjustment is recorded with a type, a reason, an author and dates. It is what makes your balance reliable and auditable.",
  cuandoUsarlo:
    "In every daily operation: receiving goods from a supplier, dispatching to a customer, moving stock between locations, correcting balances and writing off shrinkage.",
  terminosClave: [
    "movimiento",
    "entrada",
    "salida",
    "traslado",
    "ajuste",
    "merma",
    "borrador",
    "pendiente-aprobacion",
    "aprobado",
    "anulado",
    "movimiento-inverso",
    "saldo",
    "fefo",
    "fifo",
  ],
  relacionados: [
    "inventario",
    "alertas",
    "proceso-recepcion",
    "proceso-despacho",
    "proceso-traslado",
    "proceso-devolucion",
    "proceso-merma",
  ],
  secciones: [
    {
      titulo: "What it is",
      bloques: [
        {
          tipo: "texto",
          texto:
            "A movement is the only way to change stock. Every movement has a type (Inbound, Outbound, Transfer or Adjustment), a sub-type, a status, one or more lines (product, lot, quantity and locations) and audit data (who created, approved or cancelled it, and when).",
        },
        {
          tipo: "texto",
          texto:
            "Stock is never touched “by hand”: a location’s balance is the sum of its approved movements. An approved movement is immutable; cancelling it generates a reversing movement.",
        },
      ],
    },
    {
      titulo: "Where to find it",
      bloques: [
        {
          tipo: "enlaces",
          items: [
            { etiqueta: "Movement list", href: PATH.movimientos },
            { etiqueta: "New movement", href: PATH.movimientosNuevo },
          ],
        },
      ],
    },
    {
      titulo: "Types and sub-types",
      bloques: [
        {
          tipo: "tabla",
          cabeceras: ["Type", "Sub-types", "Effect"],
          filas: [
            [
              "Inbound",
              "Purchase, Customer return, Opening stock",
              "Increases the balance in the destination location.",
            ],
            [
              "Outbound",
              "Customer, Supplier return, Shrinkage",
              "Decreases the balance in the source location.",
            ],
            [
              "Transfer",
              "(no sub-type applies in the form)",
              "Moves stock from one location to another; the total is unchanged.",
            ],
            [
              "Adjustment",
              "Positive adjustment (surplus), Negative adjustment (shortfall)",
              "Corrects the balance up or down; always requires a reason.",
            ],
          ],
        },
      ],
    },
    {
      titulo: "Movement statuses",
      bloques: [
        {
          tipo: "tabla",
          cabeceras: ["Status", "Meaning"],
          filas: [
            [
              "Draft",
              "Created but with no effect on stock. It can be sent for approval or approved directly.",
            ],
            ["Pending approval", "Sent for approval; no effect on stock."],
            [
              "Approved",
              "The only status that changes the balance: on approval the lines are executed atomically.",
            ],
            [
              "Cancelled",
              "Cancelled. If it had affected stock, a reversing movement was generated.",
            ],
          ],
        },
      ],
    },
    {
      titulo: "How to create a movement",
      bloques: [
        {
          tipo: "pasos",
          pasos: [
            "Go to /movimientos/nuevo and choose the type (Inbound, Outbound, Transfer or Adjustment). The type is reflected in the URL.",
            "Select the sub-type (for example, for Inbound: Purchase, Customer return or Opening stock).",
            "Fill in the general details: reference document (optional), supplier or customer depending on the sub-type, movement date and reason (required, at least 3 characters, for adjustments and shrinkage).",
            "Add one or more lines: product, lot (required if the product tracks lots), quantity, and the source or destination locations depending on the type.",
            "On outbound movements you can use “Suggest FIFO/FEFO”: pick the product and the quantity and the system proposes the lines with the lots and locations the policy dictates.",
            "Press “Create movement”. The movement starts as a Draft and takes you to its detail.",
          ],
        },
      ],
    },
    {
      titulo: "Creating a transfer",
      bloques: [
        {
          tipo: "pasos",
          pasos: [
            "At /movimientos/nuevo choose the Transfer type.",
            "Select the product (and the lot if the product tracks lots), quantity, reference document (optional) and the source and destination locations.",
            "The source and the destination cannot be the same location.",
            "Press “Create transfer”; it takes you to the detail of the outbound movement generated.",
          ],
        },
      ],
    },
    {
      titulo: "Movement detail",
      bloques: [
        {
          tipo: "lista",
          items: [
            "General details: type, sub-type, movement date, reference document, reason, notes and audit (created/approved/cancelled by, and their dates).",
            "Movement lines: product, lot, quantity, source and destination location, each linked to its detail.",
            "Comments: lists the movement’s comments and lets you add one from the form at the foot.",
            "Actions depending on the status: “Edit” (Draft or Pending, at /movimientos/:id/editar), “Send for approval” (Draft only, without leaving the page), “Approve” (Draft or Pending) and “Cancel” (Approved only).",
            "Editing a movement: only its creator, and only while Draft or Pending approval. The operational fields and the lines are updated; the type, sub-type and number are locked.",
            "If the movement was cancelled, a notice appears with a link to the reversing movement.",
          ],
        },
      ],
    },
    {
      titulo: "Approving a movement",
      bloques: [
        {
          tipo: "texto",
          texto:
            "Approval lives on its own page (/movimientos/:id/aprobar). Only a movement in Draft or Pending approval can be approved. On approval the lines are executed atomically: it is the only moment the movement changes the balance of its locations.",
        },
      ],
    },
    {
      titulo: "Cancelling a movement",
      bloques: [
        {
          tipo: "texto",
          texto:
            "Cancellation lives on its own page (/movimientos/:id/anular). Only Approved movements can be cancelled. Cancelling generates a reversing movement that undoes the effect on stock; the original movement is left as Cancelled and its history is never deleted.",
        },
      ],
    },
    {
      titulo: "Rules and behaviour",
      bloques: [
        {
          tipo: "lista",
          items: [
            "An approved movement cannot be edited; only cancelled (generating the reverse).",
            "No balance may go negative: the system validates the available balance before approving and rejects the operation with a clear message if it is not enough.",
            "Products that track lots require a lot on every line, without exception.",
            "An expired lot cannot leave as Customer or Supplier return; only as Shrinkage or a Negative adjustment.",
            "The form keeps the draft if you leave to create a product, lot, location, supplier or customer from the form itself (quick create): on returning, the newly created record is already selected.",
          ],
        },
      ],
    },
    {
      titulo: "Common mistakes and good practice",
      bloques: [
        {
          tipo: "nota",
          tono: "warning",
          texto:
            "Stock is never touched “by hand”: every change must go through a movement. If something does not add up, do not edit balances directly: record the matching adjustment with its reason.",
        },
        {
          tipo: "nota",
          tono: "warning",
          texto:
            "An approved movement is immutable. If you got it wrong, cancel it (the reverse is generated) or create a new one: never try to force an edit.",
        },
        {
          tipo: "nota",
          tono: "warning",
          texto:
            "“Insufficient balance” means the quantity requested exceeds what is available in the location. Check the stock before dispatching, or split the dispatch across several locations.",
        },
        {
          tipo: "nota",
          tono: "info",
          texto:
            "Adjustments and shrinkage require a reason of at least 3 characters: it is mandatory and stays in the history. Do not leave it generic; record the real cause.",
        },
        {
          tipo: "nota",
          tono: "success",
          texto:
            "On outbound movements, use “Suggest FIFO/FEFO” so the system proposes which lots and locations go first: it avoids mistakes and respects the rotation policy.",
        },
      ],
    },
  ],
};

const MODULE_STOCKTAKE: AyudaModulo = {
  id: "inventario",
  titulo: "Stocktaking",
  icono: "inventario",
  resumen: "Count sessions, discrepancies, accuracy and closing.",
  paraQueSirve:
    "It checks that recorded stock matches the physical stock. By counting regularly (full or cycle counts) you find surpluses and shortfalls, and on closing the session the system adjusts the balances and measures your accuracy.",
  cuandoUsarlo:
    "Periodically (cycle counts by zone or category) or at year-end (full counts). If you suspect discrepancies, this is the right route rather than adjusting by hand.",
  terminosClave: [
    "sesion-inventario",
    "conteo-ciego",
    "doble-conteo",
    "diferencia-inventario",
    "precision-inventario",
    "ajuste",
  ],
  relacionados: ["movimientos", "alertas", "reportes", "proceso-inventario"],
  secciones: [
    {
      titulo: "What it is",
      bloques: [
        {
          tipo: "texto",
          texto:
            "An inventory session formalises the process of counting a warehouse’s physical stock. Counts are recorded per (location, product, lot), and on closing the session the system compares what was counted against the system balance, calculates the discrepancies and generates the corresponding stock adjustments.",
        },
      ],
    },
    {
      titulo: "Where to find it",
      bloques: [
        {
          tipo: "enlaces",
          items: [
            { etiqueta: "Session list", href: PATH.inventario },
            { etiqueta: "New session", href: PATH.inventarioNuevo },
          ],
        },
      ],
    },
    {
      titulo: "Session statuses",
      bloques: [
        {
          tipo: "tabla",
          cabeceras: ["Status", "Meaning"],
          filas: [
            ["Planned", "Created without a start date: it does not accept counts yet."],
            ["In progress", "Accepts counts being recorded, and closing the session."],
            [
              "Closed",
              "No longer accepts counts; it shows the accuracy and generated the discrepancy adjustments.",
            ],
            ["Cancelled", "Cancelled."],
          ],
        },
      ],
    },
    {
      titulo: "How to create a session",
      bloques: [
        {
          tipo: "pasos",
          pasos: [
            "Go to /inventario/nuevo.",
            "Choose the type: Full (counts the whole warehouse) or Cycle (counts a subset defined by the scope).",
            "Select the warehouse (required) and describe the scope of the count (free text, e.g. zone, category).",
            "Set the start date. If you leave a value, the session starts In progress and already accepts counts; if you leave it blank, it stays Planned.",
            "Tick “Blind count” if you do not want the system balance shown while recording, and “Require double count” if every discrepancy needs a second count.",
            "Press “Create session”.",
          ],
        },
      ],
    },
    {
      titulo: "Recording counts",
      bloques: [
        {
          tipo: "texto",
          texto:
            "Recording lives on its own page (/inventario/:id/conteos) and is only available while the session is In progress. The form asks for the location, product, lot (if the product tracks lots), counted quantity (0 = product absent), count number (1, 2…) and an optional note.",
        },
        {
          tipo: "lista",
          items: [
            "The system balance is not shown on the recording page, whether blind counting is on or not.",
            "You can use quick create to add a location, product or lot on the fly.",
            "After recording, the form clears itself while keeping the count number.",
            "The table below shows the counts already recorded in the session.",
          ],
        },
      ],
    },
    {
      titulo: "Discrepancies",
      bloques: [
        {
          tipo: "tabla",
          cabeceras: ["Discrepancy", "Meaning"],
          filas: [
            ["Reconciled", "The counted quantity matches the system balance."],
            [
              "Surplus",
              "There is more in the warehouse than in the system; an inbound adjustment is proposed.",
            ],
            [
              "Shortfall",
              "There is less in the warehouse than in the system; an outbound adjustment is proposed.",
            ],
          ],
        },
      ],
    },
    {
      titulo: "Closing the session",
      bloques: [
        {
          tipo: "pasos",
          pasos: [
            "With the session In progress, press “Close session” from the detail.",
            "On the confirmation page, review the unreconciled discrepancies and the adjustments that will be generated.",
            "Confirm the closing. The session becomes Closed and accepts no further counts.",
          ],
        },
      ],
    },
    {
      titulo: "Session accuracy",
      bloques: [
        {
          tipo: "lista",
          items: [
            "SKU accuracy: percentage of counted SKUs whose balance matches the system.",
            "Quantity accuracy: percentage of correct units out of the units counted.",
            "Location accuracy: percentage of locations with no discrepancy out of those counted.",
          ],
        },
      ],
    },
    {
      titulo: "Rules and behaviour",
      bloques: [
        {
          tipo: "lista",
          items: [
            "The session detail shows the full summary (type, warehouse, scope, owner, flags, dates and audit), the counts and the discrepancies.",
            "If the session is Closed, the detail shows the accuracy panel.",
            "An in-progress inventory session blocks manual adjustments on that session’s warehouse (closing generates its own adjustments).",
          ],
        },
      ],
    },
    {
      titulo: "Common mistakes and good practice",
      bloques: [
        {
          tipo: "nota",
          tono: "info",
          texto:
            "Use blind counting to avoid bias: the counter does not see the system balance while counting. Turn it on for formal sessions.",
        },
        {
          tipo: "nota",
          tono: "warning",
          texto:
            "While a session is In progress, manual adjustments on that warehouse are blocked: discrepancies must be resolved through the session itself. Do not fight it; close the session so it generates the adjustments.",
        },
        {
          tipo: "nota",
          tono: "warning",
          texto:
            "Do not leave the start date blank if you want to operate right away: the session starts In progress only if it has a start date. Left blank, it stays Planned and accepts no counts.",
        },
        {
          tipo: "nota",
          tono: "success",
          texto:
            "The counted quantity can be 0: it means “not present”. A product present with no balance is a surplus that gets regularised on closing.",
        },
      ],
    },
  ],
};

const MODULE_ALERTS: AyudaModulo = {
  id: "alertas",
  titulo: "Alerts",
  icono: "alerta",
  resumen: "Notices about low stock, expiries and pending movements.",
  paraQueSirve:
    "It warns you automatically about what needs action: low stock, stock over maximum, full locations, lots expiring or expired, inventory discrepancies and movements awaiting approval.",
  cuandoUsarlo:
    "Daily: the active-alert counter in the top bar tells you whether there is anything to deal with. Every alert links to its root cause so you can resolve it.",
  terminosClave: [
    "alerta",
    "stock-minimo",
    "stock-maximo",
    "capacidad-maxima",
    "vencimiento",
    "pendiente-aprobacion",
  ],
  relacionados: ["dashboard", "movimientos", "lotes", "inventario"],
  secciones: [
    {
      titulo: "What it is",
      bloques: [
        {
          tipo: "texto",
          texto:
            "The alerts module gathers the automatic notices about the state of the warehouse: low stock, stock over maximum, locations over capacity, lots expiring or expired, inventory discrepancies and movements awaiting approval. Alerts are recalculated when you look at them.",
        },
      ],
    },
    {
      titulo: "Where to find it",
      bloques: [{ tipo: "enlaces", items: [{ etiqueta: "Alerts", href: PATH.alertas }] }],
    },
    {
      titulo: "Alert types",
      bloques: [
        {
          tipo: "tabla",
          cabeceras: ["Alert", "When it fires"],
          filas: [
            [
              "Low stock",
              "The product’s balance (across all locations) falls to its minimum stock or below.",
            ],
            ["Stock over maximum", "The balance exceeds the product’s maximum stock."],
            [
              "Location over capacity",
              "A movement tries to bring in more than the location’s maximum capacity.",
            ],
            [
              "Lot expiring soon",
              "The lot expires within the configured horizon (expiry warning days).",
            ],
            ["Expired lot", "The lot is past its expiry and still holds a balance."],
            ["Inventory discrepancy", "A count session found discrepancies."],
            ["Pending movement", "There is an unresolved movement in Pending approval."],
          ],
        },
      ],
    },
    {
      titulo: "Severities and statuses",
      bloques: [
        {
          tipo: "lista",
          items: [
            "Severity: Info, Medium or High.",
            "Status: Open, Resolved or Archived.",
            "The status filter (Open by default, Resolved, Archived) is in the table header.",
          ],
        },
      ],
    },
    {
      titulo: "Resolving or ignoring",
      bloques: [
        {
          tipo: "texto",
          texto:
            "In the list of open alerts, each row offers two actions: “Resolve” and “Ignore”. Resolving marks the alert as resolved; ignoring marks it as archived (and it does not reopen).",
        },
        {
          tipo: "texto",
          texto:
            "Important: resolving an alert does not fix its root cause. If the condition persists (for example, the movement is still pending or the stock is still low), the alert reopens on the next recalculation. To fix the cause you have to act in the matching module: record an inbound movement, write off shrinkage, approve the movement, and so on.",
        },
      ],
    },
    {
      titulo: "Common mistakes and good practice",
      bloques: [
        {
          tipo: "nota",
          tono: "warning",
          texto:
            "Resolving does not fix the cause: the alert reopens while the condition persists. Go for the root (record an inbound movement, approve the movement, write off the expired lot) and not just the button.",
        },
        {
          tipo: "nota",
          tono: "info",
          texto:
            "Every alert row links to the record that triggers it (product, lot, location, movement or session): use it to go straight to fixing the cause.",
        },
        {
          tipo: "nota",
          tono: "success",
          texto:
            "Set your thresholds properly in the Settings module (expiry warning days and default minimum stock) so alerts reflect your business instead of generating noise.",
        },
      ],
    },
  ],
};

const MODULE_REPORTS: AyudaModulo = {
  id: "reportes",
  titulo: "Reports",
  icono: "reportes",
  resumen: "Ten reports: stock, movements, expiries, accuracy and audit.",
  paraQueSirve:
    "It turns warehouse data into management information: how much you hold, what you moved, what is expiring, how accurately you count and who did what. Everything is exportable to CSV or JSON.",
  cuandoUsarlo:
    "To make decisions: reviewing stock by category, analysing movements by period, anticipating expiries, assessing inventory accuracy and auditing the team’s activity.",
  terminosClave: ["saldo", "kardex", "vencimiento", "precision-inventario", "auditoria", "merma"],
  relacionados: ["dashboard", "historial", "inventario", "movimientos"],
  secciones: [
    {
      titulo: "What it is",
      bloques: [
        {
          tipo: "texto",
          texto:
            "The Reports module gathers ten operational reports. All of them can be exported to CSV or JSON with the applied filters (export buttons in each report’s filter bar).",
        },
      ],
    },
    {
      titulo: "Where to find it",
      bloques: [{ tipo: "enlaces", items: [{ etiqueta: "Reports", href: PATH.reportes }] }],
    },
    {
      titulo: "Current stock",
      bloques: [
        {
          tipo: "enlaces",
          items: [{ etiqueta: "Open the stock report", href: PATH.reporteStock }],
        },
        {
          tipo: "lista",
          items: [
            "Summary: products in stock, total units, locations with stock and stock rows.",
            "Filters: search by SKU or product name, category and warehouse.",
            "“Stock by product” table: SKU, product, locations, lots, units, minimum, maximum and status (a Low stock badge if the units fall to the minimum or below).",
            "“Detail by location and lot” table: each balance row with product, location, warehouse, lot, quantity and update date.",
            "The balance is calculated exclusively from approved movements.",
          ],
        },
      ],
    },
    {
      titulo: "Movements by period",
      bloques: [
        {
          tipo: "enlaces",
          items: [{ etiqueta: "Open the movements report", href: PATH.reporteMovimientos }],
        },
        {
          tipo: "lista",
          items: [
            "Filters: type, sub-type, status, user, supplier, customer, source location, destination location and date range.",
            "Totals by type (a real count from the query engine grouped by type).",
            "A chart of movements per day for the last 30 days.",
            "A paginated table of movements; each row opens the detail.",
          ],
        },
      ],
    },
    {
      titulo: "Expiries",
      bloques: [
        {
          tipo: "enlaces",
          items: [{ etiqueta: "Open the expiries report", href: PATH.reporteVencimientos }],
        },
        {
          tipo: "lista",
          items: [
            "Range selector: next 30, 60 or 90 days.",
            "Table: SKU, lot, expiry, quantity and status (Expired or Expiring).",
          ],
        },
      ],
    },
    {
      titulo: "Product stock card",
      bloques: [
        {
          tipo: "enlaces",
          items: [{ etiqueta: "Open the stock card", href: PATH.reporteKardex }],
        },
        {
          tipo: "lista",
          items: [
            "Pick a product in the selector; the URL reflects the chosen product.",
            "Table: movement, type, date, in, out and running balance (the product’s stock card).",
          ],
        },
      ],
    },
    {
      titulo: "Inventory accuracy",
      bloques: [
        {
          tipo: "enlaces",
          items: [{ etiqueta: "Open the accuracy report", href: PATH.reportePrecision }],
        },
        {
          tipo: "lista",
          items: [
            "Averages by SKU, by quantity and by location across every closed session.",
            "SKU accuracy over time, with a bar per session.",
            "A table of closed sessions with their three percentages; each row opens the session detail.",
          ],
        },
      ],
    },
    {
      titulo: "Audit",
      bloques: [
        {
          tipo: "enlaces",
          items: [{ etiqueta: "Open the audit report", href: PATH.reporteAuditoria }],
        },
        {
          tipo: "lista",
          items: [
            "Filters: user, level (Read/Write), date range, command and entity.",
            "Table: date and time, user, command or action, entity, level, result and duration.",
            "Shows up to 200 audit events with the applied filters.",
          ],
        },
      ],
    },
    {
      titulo: "Inbound for the period",
      bloques: [
        {
          tipo: "enlaces",
          items: [{ etiqueta: "Open the inbound report", href: PATH.reporteEntradas }],
        },
        {
          tipo: "lista",
          items: [
            "Inbound movements (purchases, customer returns, positive adjustments and opening stock) filtered by supplier, status and date range.",
            "Totals by sub-type.",
          ],
        },
      ],
    },
    {
      titulo: "Outbound for the period",
      bloques: [
        {
          tipo: "enlaces",
          items: [{ etiqueta: "Open the outbound report", href: PATH.reporteSalidas }],
        },
        {
          tipo: "lista",
          items: [
            "Outbound movements (customer dispatches, supplier returns and outbound transfers) filtered by customer, status and date range.",
            "Totals by sub-type.",
          ],
        },
      ],
    },
    {
      titulo: "Shrinkage and adjustments",
      bloques: [
        {
          tipo: "enlaces",
          items: [
            {
              etiqueta: "Open the shrinkage and adjustments report",
              href: PATH.reporteMermasAjustes,
            },
          ],
        },
        {
          tipo: "lista",
          items: [
            "Shrinkage and stock adjustments (positive and negative) filtered by status and date range.",
            "Totals by sub-type; each movement’s reason is shown in the table.",
          ],
        },
      ],
    },
    {
      titulo: "User activity",
      bloques: [
        {
          tipo: "enlaces",
          items: [{ etiqueta: "Open the user activity report", href: PATH.reporteUsuarios }],
        },
        {
          tipo: "lista",
          items: [
            "Number of movements recorded per user, filtered by movement type and date range.",
            "Columns: user, name, movements and percentage of the total.",
          ],
        },
      ],
    },
  ],
};

const MODULE_ACTIVITY: AyudaModulo = {
  id: "historial",
  titulo: "Activity history",
  icono: "historial",
  resumen:
    "Activity centre: full tracking of routes, modules, executions, processes, users, hours and trends.",
  paraQueSirve:
    "It is the system’s activity centre: it records everything that happens — the pages you visit (routes), the modules you use, every command the backend executes, the business processes, with user, hour, day, duration, result and company (tenant). From that it computes metrics, charts and automatic insights for deep and predictive analysis.",
  cuandoUsarlo:
    "To audit system activity, understand how the application is used (which modules and processes dominate, at what hours), spot errors and measure user activity.",
  terminosClave: ["auditoria", "trazabilidad", "usuario", "rol"],
  relacionados: ["reportes", "usuarios", "movimientos"],
  secciones: [
    {
      titulo: "What it is",
      bloques: [
        {
          tipo: "texto",
          texto:
            "The activity centre is the system’s complete history. Every time you navigate to a page a view is recorded (route, module, duration, local time); every backend command is recorded as an operation (command, duration, result, level). Every event stores who, when, from which module, in which process, and on behalf of which company (tenant).",
        },
      ],
    },
    {
      titulo: "Where to find it",
      bloques: [
        { tipo: "enlaces", items: [{ etiqueta: "Activity history", href: PATH.historial }] },
      ],
    },
    {
      titulo: "What it shows",
      bloques: [
        {
          tipo: "lista",
          items: [
            "Summary (KPIs): total events, page views, operations, success rate, active users and average duration per view.",
            "Period overview: automatic insights (peak hour, busiest day, dominant module, most visited route, most active user, most frequent process and weekly trend).",
            "Views by module: how much each section of the application is used.",
            "Activity by day, by hour of the day and by day of the week: the temporal patterns of use.",
            "Most active users, business processes and most visited routes.",
            "Event log: the full table, filterable by user, type (View/Command), module, result and date range, with pagination and CSV/JSON export.",
          ],
        },
      ],
    },
    {
      titulo: "Filters",
      bloques: [
        {
          tipo: "lista",
          items: [
            "From/To: narrows the period analysed (by default everything recorded is accumulated).",
            "User: isolates one account’s activity.",
            "Event type: page views (navigation) or backend commands (operations).",
            "Module: a specific area (Movements, Products, Reports…).",
            "Result: successes only or errors only.",
            "Command: text search on the command (e.g. aprobar_movimiento).",
          ],
        },
      ],
    },
    {
      titulo: "Rules and behaviour",
      bloques: [
        {
          tipo: "nota",
          tono: "info",
          texto:
            "Audit events are immutable: they are neither deleted nor edited from the interface. Tracking is complete and automatic: there is nothing to turn on.",
        },
        {
          tipo: "lista",
          items: [
            "Route tracking is recorded in the backend (the registrar_vista command) with the user’s session; on closing the tab, the view in progress is sent by beacon so it is not lost.",
            "Views record the route, module, associated business process, duration, local hour and day, browser and screen.",
            "Backend commands are classified automatically by module (Movements, Products…) and business process (movement management, stocktaking…).",
            "The Audit report (/reportes/auditoria) offers the same events with advanced filters and pagination.",
          ],
        },
      ],
    },
  ],
};

const MODULE_USERS: AyudaModulo = {
  id: "usuarios",
  titulo: "Users and roles",
  icono: "rol",
  resumen: "Access accounts, roles and the permission matrix.",
  paraQueSirve:
    "It controls who can sign in and what each person can do according to their role. It is the basis of the audit: every movement is attributed to a user.",
  cuandoUsarlo:
    "When bringing on new staff, when responsibilities change, and to keep access secure. Only the ADMIN manages users.",
  terminosClave: ["rol", "permiso", "auditoria", "desactivar"],
  relacionados: ["configuracion", "perfil", "inicio-sesion"],
  secciones: [
    {
      titulo: "What it is",
      bloques: [
        {
          tipo: "texto",
          texto:
            "Every person who operates Rustock has a user account with a role. The role defines what they can do: only the ADMIN manages users, roles and settings. Deactivated accounts cannot sign in, but their history is kept.",
        },
      ],
    },
    {
      titulo: "Where to find it",
      bloques: [
        {
          tipo: "enlaces",
          items: [
            { etiqueta: "User list", href: PATH.usuarios },
            { etiqueta: "New user", href: `${PATH.usuarios}/nuevo` },
          ],
        },
      ],
    },
    {
      titulo: "Roles",
      bloques: [
        {
          tipo: "tabla",
          cabeceras: ["Role", "Scope"],
          filas: [
            [
              "Administrator",
              "Full control: users, roles, settings, catalogues, movements and stocktaking.",
            ],
            [
              "Manager",
              "Sees everything, creates and validates movements and manages catalogues; does not manage users.",
            ],
            ["Warehouse manager", "Manages movements and runs stocktakes."],
            [
              "Operator",
              "Records inbound/outbound/transfer movements; does not authorise adjustments or close stocktakes.",
            ],
            ["Reader", "Read only: queries and reports."],
          ],
        },
      ],
    },
    {
      titulo: "Available actions",
      bloques: [
        {
          tipo: "lista",
          items: [
            "List with a status filter (all, active, inactive), 20 per page and ordered by username. Columns: username, full name, email, role, status and last sign-in.",
            "New user (ADMIN only): username, full name, email, role and a password of at least 8 characters.",
            "Detail: account data and recent activity (the user’s audit events).",
            "Edit user (ADMIN only): full name, email and role. The username is immutable.",
            "Deactivate / reactivate user (ADMIN only): the confirmation page explains the consequences. You cannot deactivate your own account or the last active administrator.",
            "Change password (ADMIN only, from the detail): sets a new password without knowing the previous one.",
          ],
        },
      ],
    },
    {
      titulo: "Your own account",
      bloques: [
        {
          tipo: "texto",
          texto:
            "From My profile (/perfil) you can see your details, change your password (by confirming the current one) and adjust your display preferences.",
        },
      ],
    },
  ],
};

const MODULE_BRANCHES: AyudaModulo = {
  id: "sucursales",
  titulo: "Branches",
  icono: "ubicacion",
  resumen: "The company’s operating points with their geographic location.",
  paraQueSirve:
    "It documents the company’s physical operating points with their geographic location (country, city, coordinates and map). It is context and organisation information; it takes no part in stock movements.",
  cuandoUsarlo:
    "When setting the company up, and when you open a new operating point you want documented with its map.",
  terminosClave: ["almacen", "ubicacion-bin"],
  relacionados: ["configuracion", "almacenes"],
  secciones: [
    {
      titulo: "What it is",
      bloques: [
        {
          tipo: "texto",
          texto:
            "A branch is one of the company’s operating points with its geographic location. It is a configuration record (it takes no part in stock movements): it serves to document where the company operates.",
        },
      ],
    },
    {
      titulo: "Where to find it",
      bloques: [
        {
          tipo: "enlaces",
          items: [
            { etiqueta: "Branch list", href: PATH.sucursales },
            { etiqueta: "New branch", href: `${PATH.sucursales}/nuevo` },
          ],
        },
      ],
    },
    {
      titulo: "Available actions",
      bloques: [
        {
          tipo: "lista",
          items: [
            "Full list: code, name, country, city, address, coordinates and status.",
            "New branch: code (required, immutable afterwards), name (required), country, city, address, latitude and longitude. The “Detect my location” button fills the coordinates using the browser’s geolocation.",
            "Detail: general data and a map (embedded OpenStreetMap) with an “Open in Google Maps” link.",
            "Edit branch: name, country, city, address and coordinates. The code is locked.",
            "Deactivate branch: the confirmation page explains that the data is kept.",
          ],
        },
      ],
    },
    {
      titulo: "Rules and behaviour",
      bloques: [
        {
          tipo: "lista",
          items: [
            "The embedded map and the Google Maps link require an internet connection.",
            "The main branch (the one in Settings) is a separate record: the settings keep their own address and coordinates.",
          ],
        },
      ],
    },
  ],
};

const MODULE_SETTINGS: AyudaModulo = {
  id: "configuracion",
  titulo: "Settings",
  icono: "configuracion",
  resumen: "Company details, location, files and global parameters.",
  paraQueSirve:
    "It centralises your company’s data (basic, tax, contact, location with a map, logo and documents) and the global parameters that define the behaviour of the whole app (time zone, date format, thresholds and approval policy).",
  cuandoUsarlo:
    "When installing Rustock, and whenever a company detail or an operational parameter changes. Only the ADMIN can edit it.",
  terminosClave: ["stock-minimo", "vencimiento", "alerta"],
  relacionados: ["perfil", "usuarios", "sucursales", "alertas"],
  secciones: [
    {
      titulo: "What it is",
      bloques: [
        {
          tipo: "texto",
          texto:
            "Settings gather the company’s data, its location, files (logo and documents) and the system’s global parameters. Only the ADMIN can see and edit them; other roles see a notice with a link to their profile.",
        },
      ],
    },
    {
      titulo: "Where to find it",
      bloques: [{ tipo: "enlaces", items: [{ etiqueta: "Settings", href: PATH.configuracion }] }],
    },
    {
      titulo: "Form sections",
      bloques: [
        {
          tipo: "tabla",
          cabeceras: ["Section", "Fields"],
          filas: [
            ["Company details", "Name, code, country, city, address, postcode and description."],
            ["Tax details", "Legal name, tax ID (VAT number, EIN, RFC) and registered address."],
            ["Contact", "Phone, contact email and website."],
            [
              "Location and map",
              "Latitude and longitude with “Detect my location”, an OpenStreetMap map and a Google Maps link.",
            ],
            [
              "General parameters",
              "Time zone, date format, expiry warning days and default minimum stock.",
            ],
            [
              "Operating policy",
              "“Require movement approval”: with this on, movements start as drafts and go through approval.",
            ],
          ],
        },
      ],
    },
    {
      titulo: "Logo and documents",
      bloques: [
        {
          tipo: "lista",
          items: [
            "Logo: PNG, JPG or SVG up to 2 MB. Uploading a new one replaces the previous one.",
            "Documents: any file up to 10 MB (invoices, certificates). They are listed with their size and can be viewed (images and PDFs are shown embedded) or deleted.",
            "Files are stored in the database (not on the file system).",
          ],
        },
      ],
    },
    {
      titulo: "Rules and behaviour",
      bloques: [
        {
          tipo: "lista",
          items: [
            "The company’s time zone and date format are the default for dates across the whole app; each user can inherit them or set their own in their profile.",
            "The expiry warning days define the horizon of the “Lot expiring soon” alert.",
            "The default minimum stock applies to products that have no minimum stock of their own.",
            "Branches and Users and roles are reachable from the header.",
          ],
        },
      ],
    },
  ],
};

const MODULE_PROFILE: AyudaModulo = {
  id: "perfil",
  titulo: "My profile",
  icono: "usuario",
  resumen: "Your details, password, preferences and the sidebar order.",
  paraQueSirve:
    "It tailors the experience to how you work: font size, time zone and date format, sidebar order, and your own password. Your preferences do not affect other users.",
  cuandoUsarlo:
    "On your first day (set the font and time zone) and whenever you want to reorder your navigation or change your password.",
  terminosClave: ["usuario", "rol"],
  relacionados: ["usuarios", "configuracion", "inicio-sesion"],
  secciones: [
    {
      titulo: "What it is",
      bloques: [
        {
          tipo: "texto",
          texto:
            "My profile gathers the information about your own account: your details, the password change, your display preferences and the order of the sidebar items.",
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
            { etiqueta: "User list", href: PATH.usuarios },
          ],
        },
      ],
    },
    {
      titulo: "Sections",
      bloques: [
        {
          tipo: "tabla",
          cabeceras: ["Section", "Contents"],
          filas: [
            ["Details", "Username, full name, email and role (read only)."],
            [
              "Password",
              "Change your password by confirming the current one (at least 8 characters).",
            ],
            [
              "Preferences",
              "Font size, time zone and date format (inherited from the company or your own).",
            ],
            [
              "Sidebar order",
              "Reorder each group’s items with the arrows; it applies when you save.",
            ],
          ],
        },
      ],
    },
    {
      titulo: "Rules and behaviour",
      bloques: [
        {
          tipo: "lista",
          items: [
            "The font size scales the whole interface (the styles use rem): Small, Medium or Large.",
            "If you choose “Inherit from the company” for time zone or date format, the value from Settings is used.",
            "The sidebar order is persisted per user; new items appear at the end of their group.",
            "Editing your details (name, email, role) is done by the ADMIN from the user detail; your own profile is read only.",
          ],
        },
      ],
    },
  ],
};

const MODULE_SIGN_IN: AyudaModulo = {
  id: "inicio-sesion",
  titulo: "Signing in and first-time setup",
  icono: "rol",
  resumen: "The public landing page, sign-in and creating the first administrator.",
  paraQueSirve:
    "It is the way into the system: the public presentation, signing in, and creating the first administrator on a fresh installation. The whole application requires a session.",
  cuandoUsarlo:
    "On the first installation (setting up the administrator) and every time a user signs in or out.",
  terminosClave: ["usuario", "rol", "permiso"],
  relacionados: ["usuarios", "perfil", "dashboard"],
  secciones: [
    {
      titulo: "What it is",
      bloques: [
        {
          tipo: "texto",
          texto:
            "There are three public screens before you get into the application: the presentation page (the root /), signing in (/login) and setting up the administrator (/configurar-administrador). The whole application requires a session: without one, routes redirect to the sign-in page.",
        },
      ],
    },
    {
      titulo: "Presentation page",
      bloques: [
        {
          tipo: "texto",
          texto:
            "The application’s root (/) shows the product presentation: features, how it works and integrity. If you already have a session, going there redirects you straight to the Dashboard.",
        },
      ],
    },
    {
      titulo: "Signing in",
      bloques: [
        {
          tipo: "pasos",
          pasos: [
            "Go to /login.",
            "Type your username and password.",
            "Press “Sign in”. With a valid session it takes you to the Dashboard.",
          ],
        },
        {
          tipo: "texto",
          texto:
            "If this is the first time the installation is used, the “Set up the administrator” link takes you to the bootstrap form.",
        },
      ],
    },
    {
      titulo: "Setting up the administrator",
      bloques: [
        {
          tipo: "pasos",
          pasos: [
            "Go to /configurar-administrador.",
            "Fill in username, full name, password (at least 8 characters) and confirmation.",
            "Press “Create administrator and sign in”: it creates the first user with the Administrator role and signs in.",
          ],
        },
        {
          tipo: "texto",
          texto:
            "The command is idempotent: if an administrator already exists, the form creates nothing new and tries to sign in with the credentials given. It never reveals whether an administrator already exists.",
        },
      ],
    },
    {
      titulo: "Rules and behaviour",
      bloques: [
        {
          tipo: "lista",
          items: [
            "Deactivated accounts cannot sign in.",
            "The session is unique per installation (one operator at a time).",
            "You can sign out from the top bar with the exit button.",
          ],
        },
      ],
    },
  ],
};

const MODULE_FIRST_STEPS: AyudaModulo = {
  id: "primeros-pasos",
  titulo: "First steps",
  icono: "agregar",
  resumen: "The recommended order for getting Rustock running and operating from day one.",
  paraQueSirve:
    "It guides you through the setup in the right order: first the base catalogues (UOMs and products), then the physical space (warehouse and locations), then the opening stock, and finally daily operation.",
  cuandoUsarlo:
    "If you have just installed Rustock or are starting to load your inventory. It is also a good reference for training a new user.",
  terminosClave: [
    "uom",
    "producto-sku",
    "almacen",
    "ubicacion-bin",
    "entrada",
    "movimiento",
    "saldo",
  ],
  relacionados: [
    "uoms",
    "productos",
    "almacenes",
    "ubicaciones",
    "movimientos",
    "configuracion",
    "usuarios",
    "inventario",
  ],
  secciones: [
    {
      titulo: "Step 1: Set up the company and the users",
      bloques: [
        {
          tipo: "texto",
          texto:
            "Go to Settings to record your company details (name, tax data, contact, location and global parameters such as time zone and expiry threshold). Create the team’s users with their role in Users.",
        },
        {
          tipo: "enlaces",
          items: [
            { etiqueta: "Settings", href: "/configuracion" },
            { etiqueta: "Users and roles", href: "/usuarios" },
          ],
        },
      ],
    },
    {
      titulo: "Step 2: Create the units of measure",
      bloques: [
        {
          tipo: "texto",
          texto:
            "No product can exist without a base UOM. Create your operation’s units first (PZA, KG, L, BOX, M…) and their conversion factors.",
        },
        {
          tipo: "enlaces",
          items: [{ etiqueta: "New unit of measure", href: "/uoms/nuevo" }],
        },
      ],
    },
    {
      titulo: "Step 3: Create the products",
      bloques: [
        {
          tipo: "texto",
          texto:
            "Register every item you buy, sell or store: SKU, name, category, base UOM and the lot/expiry controls as appropriate. Set the minimum stock to turn on replenishment alerts.",
        },
        {
          tipo: "enlaces",
          items: [{ etiqueta: "New product", href: "/productos/nuevo" }],
        },
      ],
    },
    {
      titulo: "Step 4: Define the physical space",
      bloques: [
        {
          tipo: "texto",
          texto:
            "Create the warehouse and then the tree: zones, racks, sections and locations. Stock lives in the locations, so they are essential to operate.",
        },
        {
          tipo: "enlaces",
          items: [
            { etiqueta: "New warehouse", href: "/almacenes/nuevo" },
            { etiqueta: "New location", href: "/ubicaciones/nuevo" },
          ],
        },
      ],
    },
    {
      titulo: "Step 5: Load the opening stock",
      bloques: [
        {
          tipo: "texto",
          texto:
            "If you already hold goods, record them as an Opening stock inbound movement so the system starts with your real balances. It requires the settings permission (ADMIN/MANAGER).",
        },
        {
          tipo: "enlaces",
          items: [{ etiqueta: "New movement", href: "/movimientos/nuevo" }],
        },
      ],
    },
    {
      titulo: "Step 6: Run the day to day",
      bloques: [
        {
          tipo: "texto",
          texto:
            "With the catalogue and the stock loaded, normal operation begins: receive purchases, dispatch orders, transfer goods and correct balances. Check the business processes for each flow.",
        },
        {
          tipo: "enlaces",
          items: [
            { etiqueta: "Process: purchase receipt", href: "/ayuda/proceso-recepcion" },
            { etiqueta: "Process: customer dispatch", href: "/ayuda/proceso-despacho" },
          ],
        },
      ],
    },
    {
      titulo: "Step 7: Validate with a stocktake",
      bloques: [
        {
          tipo: "texto",
          texto:
            "Once you are operating, schedule an inventory session to check that recorded stock matches the physical stock and measure your accuracy.",
        },
        {
          tipo: "enlaces",
          items: [{ etiqueta: "New inventory session", href: "/inventario/nuevo" }],
        },
      ],
    },
    {
      titulo: "Keyboard shortcuts",
      bloques: [
        {
          tipo: "lista",
          items: [
            "Ctrl+K: opens “Search all of Rustock” (the command palette) from any screen.",
            "/: focuses the command palette’s global search.",
            "N: opens the current module’s “new record” page (new product, new movement, new location, and so on). It does not apply in forms or on edit pages.",
            "Ctrl+Enter: submits the visible form (saving without clicking).",
          ],
        },
      ],
    },
    {
      titulo: "Good practice when starting out",
      bloques: [
        {
          tipo: "nota",
          tono: "success",
          texto:
            "Think your catalogue through before loading it: clear, normalised codes (SKUs, locations) make the whole flow that follows faster and less error-prone.",
        },
        {
          tipo: "nota",
          tono: "warning",
          texto:
            "A product’s base UOM cannot be changed after it is created. Check the choice carefully before saving.",
        },
        {
          tipo: "nota",
          tono: "warning",
          texto:
            "The SKU and a location’s code are immutable. Design a readable code scheme (e.g. RACK-A1-N2-P3) from day one.",
        },
      ],
    },
  ],
};

const PROCESS_RECEIVING: AyudaModulo = {
  id: "proceso-recepcion",
  titulo: "Process: purchase receipt",
  icono: "entrada",
  resumen: "How to record goods arriving from a supplier, step by step.",
  paraQueSirve:
    "It documents the full receiving flow: creating the inbound movement, validating it and approving it so stock rises in the destination location, leaving the origin (supplier and document) traced.",
  cuandoUsarlo:
    "Every time goods arrive from a supplier: ordinary purchases, replenishments and any receipt that should increase your balance.",
  terminosClave: ["entrada", "lote", "saldo", "movimiento", "proveedor", "aprobado", "fefo"],
  relacionados: ["movimientos", "productos", "lotes", "proveedores", "uoms"],
  secciones: [
    {
      titulo: "What you need before you start",
      bloques: [
        {
          tipo: "lista",
          items: [
            "A registered supplier (or create one with quick create from the form itself).",
            "The products (SKUs) already existing, with their base UOM defined.",
            "An active destination location, preferably of the Receiving type.",
            "If the product tracks lots, have the lots identified or the details to create them.",
          ],
        },
      ],
    },
    {
      titulo: "Steps",
      bloques: [
        {
          tipo: "pasos",
          pasos: [
            "Go to /movimientos/nuevo and choose the Inbound type and the Purchase sub-type.",
            "Fill in the general details: reference document (e.g. the PO number), supplier, movement date and notes if needed.",
            "Add one line per product: product, lot (required if it tracks lots), quantity and destination location.",
            "Press “Create movement”: it starts as a Draft and takes you to its detail.",
            "From the detail, press “Send for approval” (if your policy requires it) or “Approve” directly.",
            "On approval, the destination location’s balance is increased atomically.",
          ],
        },
      ],
    },
    {
      titulo: "What happens in the system",
      bloques: [
        {
          tipo: "lista",
          items: [
            "The inbound movement increases the balance in the destination location.",
            "If the product tracks lots, each line is tied to its lot (a new one is created if needed, with its expiry date).",
            "The author, the date and the reference document are recorded: the traceability of the origin is complete.",
            "The Dashboard reflects today’s movement and the product’s current stock.",
          ],
        },
      ],
    },
    {
      titulo: "Rules and warnings",
      bloques: [
        {
          tipo: "nota",
          tono: "warning",
          texto:
            "You cannot receive an inactive product or exceed the destination location’s maximum capacity: the system rejects it on approval.",
        },
        {
          tipo: "nota",
          tono: "warning",
          texto:
            "If the product tracks expiry, the expiry date is required when creating the lot. An expired lot cannot come in as a purchase.",
        },
        {
          tipo: "nota",
          tono: "success",
          texto:
            "If more or less arrives than expected, adjust the movement’s quantity while it is still a Draft; once approved, create another movement or cancel and redo it.",
        },
      ],
    },
  ],
};

const PROCESS_DISPATCH: AyudaModulo = {
  id: "proceso-despacho",
  titulo: "Process: customer dispatch",
  icono: "salida",
  resumen: "How to record goods going out to a customer, step by step.",
  paraQueSirve:
    "It documents the dispatch flow: creating the outbound movement, using the FIFO/FEFO suggestion to pick which lots leave, and approving so stock falls at the source, with the customer and document traced.",
  cuandoUsarlo:
    "Every time you dispatch goods to a customer: orders, sales and any outbound movement that should decrease your balance.",
  terminosClave: ["salida", "lote", "fefo", "fifo", "saldo", "movimiento", "cliente", "aprobado"],
  relacionados: ["movimientos", "productos", "lotes", "clientes"],
  secciones: [
    {
      titulo: "What you need before you start",
      bloques: [
        {
          tipo: "lista",
          items: [
            "A registered customer (or create one with quick create).",
            "Products with enough balance in some location.",
            "If the product has lots, stock available in them (not expired, for a customer dispatch).",
          ],
        },
      ],
    },
    {
      titulo: "Steps",
      bloques: [
        {
          tipo: "pasos",
          pasos: [
            "Go to /movimientos/nuevo and choose the Outbound type and the Customer sub-type.",
            "Fill in the general details: reference document (e.g. the delivery note), customer, movement date and notes.",
            "Add one line per product with the quantity to dispatch.",
            "Use “Suggest FIFO/FEFO” so the system proposes the lines with the lots and locations the rotation policy dictates.",
            "Review the proposed lines and adjust them if you need another lot that has a balance.",
            "Press “Create movement” and then “Send for approval” or “Approve”.",
            "On approval, the source locations’ balance is decreased atomically.",
          ],
        },
      ],
    },
    {
      titulo: "What happens in the system",
      bloques: [
        {
          tipo: "lista",
          items: [
            "The outbound movement decreases the balance of the source locations and of the lots given.",
            "The FEFO policy sends out the lot expiring soonest first; FIFO, the one that came in earliest.",
            "It stays traced which unit left which location and lot: you can reconstruct the origin of what was dispatched.",
            "The Dashboard and the outbound reports reflect the dispatch.",
          ],
        },
      ],
    },
    {
      titulo: "Rules and warnings",
      bloques: [
        {
          tipo: "nota",
          tono: "warning",
          texto:
            "The balance never goes negative: if the quantity requested exceeds what is available, the system rejects it and tells you where the stock is.",
        },
        {
          tipo: "nota",
          tono: "warning",
          texto:
            "An expired lot cannot leave as a customer dispatch. To remove it, use an outbound shrinkage movement or a negative adjustment.",
        },
        {
          tipo: "nota",
          tono: "success",
          texto:
            "Use the FIFO/FEFO suggestion whenever you can: it respects rotation and reduces the risk of being left with old or expired lots.",
        },
      ],
    },
  ],
};

const PROCESS_TRANSFER: AyudaModulo = {
  id: "proceso-traslado",
  titulo: "Process: internal transfer",
  icono: "traslado",
  resumen: "How to move goods between locations without changing the warehouse total.",
  paraQueSirve:
    "It documents how to move stock from one location to another (for example, from receiving to picking) while keeping the warehouse total intact and leaving the movement traced.",
  cuandoUsarlo:
    "When you reorganise the warehouse, move goods to shipping or picking areas, or need to free up a location.",
  terminosClave: ["traslado", "saldo", "movimiento", "ubicacion-bin", "aprobado"],
  relacionados: ["movimientos", "ubicaciones", "almacenes"],
  secciones: [
    {
      titulo: "What you need before you start",
      bloques: [
        {
          tipo: "lista",
          items: [
            "A source location with enough balance.",
            "An active destination location with capacity.",
            "The product (and the lot if it tracks lots) you are going to move.",
          ],
        },
      ],
    },
    {
      titulo: "Steps",
      bloques: [
        {
          tipo: "pasos",
          pasos: [
            "Go to /movimientos/nuevo and choose the Transfer type.",
            "Select the product (and the lot if applicable), the quantity and the source and destination locations.",
            "The source and the destination cannot be the same location.",
            "Press “Create transfer”: it takes you to the detail of the movement generated.",
            "Approve the movement so the stock moves from source to destination atomically.",
          ],
        },
      ],
    },
    {
      titulo: "What happens in the system",
      bloques: [
        {
          tipo: "lista",
          items: [
            "An outbound movement at the source and an inbound one at the destination are executed as a single atomic fact.",
            "The warehouse total does not change: only where the stock lives changes.",
            "The movement stays traced: you can reconstruct where the goods have been.",
            "If the source and destination are in different warehouses, two linked movements are generated (an outbound and an inbound transfer).",
          ],
        },
      ],
    },
    {
      titulo: "Rules and warnings",
      bloques: [
        {
          tipo: "nota",
          tono: "warning",
          texto:
            "The source must have enough balance for the quantity transferred; if not, the system rejects it.",
        },
        {
          tipo: "nota",
          tono: "warning",
          texto:
            "If the destination location has a maximum capacity, the transfer is blocked if it would exceed it.",
        },
        {
          tipo: "nota",
          tono: "success",
          texto: "Transfers are the right way to reorganise stock: never move balances “by hand”.",
        },
      ],
    },
  ],
};

const PROCESS_STOCKTAKE: AyudaModulo = {
  id: "proceso-inventario",
  titulo: "Process: stocktaking",
  icono: "inventario",
  resumen: "How to plan, count and close a full or cycle inventory session.",
  paraQueSirve:
    "It documents the full stocktaking cycle: creating the session, recording the counts, reviewing the discrepancies and closing so the system adjusts the balances and measures your accuracy.",
  cuandoUsarlo:
    "Regularly (cycle counts by zone or category), at year-end (full counts), or whenever you suspect differences between what is recorded and what is physically there.",
  terminosClave: [
    "sesion-inventario",
    "conteo-ciego",
    "doble-conteo",
    "diferencia-inventario",
    "precision-inventario",
    "ajuste",
    "saldo",
  ],
  relacionados: ["inventario", "movimientos", "alertas", "reportes"],
  secciones: [
    {
      titulo: "What you need before you start",
      bloques: [
        {
          tipo: "lista",
          items: [
            "A warehouse defined and holding recorded stock.",
            "A decision on the scope: full (the whole warehouse) or cycle (a subset: zone, category…).",
            "People to count and, if applicable, blind counting and double counting configured.",
          ],
        },
      ],
    },
    {
      titulo: "Steps",
      bloques: [
        {
          tipo: "pasos",
          pasos: [
            "Go to /inventario/nuevo and create the session: type, warehouse, scope, start date, blind count and double count.",
            "With the session In progress, go to /inventario/:id/conteos and record each line: location, product, lot, counted quantity and count number.",
            "If double counting is on, record the second count for the lines that show a discrepancy.",
            "Review the session detail: counts and discrepancies (reconciled, surplus, shortfall).",
            "Press “Close session” from the detail.",
            "On the confirmation page, review the discrepancies and the adjustments that will be generated.",
            "Confirm the closing: the session becomes Closed and the automatic stock adjustments are generated.",
          ],
        },
      ],
    },
    {
      titulo: "What happens in the system",
      bloques: [
        {
          tipo: "lista",
          items: [
            "Each reconciled discrepancy becomes an adjustment (an inbound one for a surplus, an outbound one for a shortfall) tied to the session.",
            "The session shows its accuracy by SKU, by quantity and by location.",
            "The accuracy report records the historical evolution of your counts.",
            "Inventory discrepancies raise alerts while they remain unresolved.",
          ],
        },
      ],
    },
    {
      titulo: "Rules and warnings",
      bloques: [
        {
          tipo: "nota",
          tono: "warning",
          texto:
            "While the session is In progress, manual adjustments on that warehouse are blocked: resolve the discrepancies through the session.",
        },
        {
          tipo: "nota",
          tono: "warning",
          texto:
            "With blind counting on, the system balance is not shown while recording: count for real, without bias.",
        },
        {
          tipo: "nota",
          tono: "success",
          texto:
            "The counted quantity can be 0 (product absent). That generates the corresponding shortfall and is regularised on closing.",
        },
      ],
    },
  ],
};

const PROCESS_RETURN: AyudaModulo = {
  id: "proceso-devolucion",
  titulo: "Process: a customer return",
  icono: "entrada",
  resumen: "How to record goods coming back from a customer, step by step.",
  paraQueSirve:
    "It documents the customer-return flow: receiving the goods as an inbound movement into a returns location, listing them for inspection and deciding whether they go back into stock or are written off.",
  cuandoUsarlo:
    "Every time a customer returns goods: by mistake, because of a defect, a rejection or an exchange.",
  terminosClave: ["entrada", "saldo", "lote", "movimiento", "cliente", "merma"],
  relacionados: ["movimientos", "clientes", "ubicaciones", "proceso-merma"],
  secciones: [
    {
      titulo: "What you need before you start",
      bloques: [
        {
          tipo: "lista",
          items: [
            "A registered customer.",
            "A Returns location to receive the goods into.",
            "The returned products in the catalogue (and their lots if they track lots).",
          ],
        },
      ],
    },
    {
      titulo: "Steps",
      bloques: [
        {
          tipo: "pasos",
          pasos: [
            "Go to /movimientos/nuevo and choose the Inbound type and the Customer return sub-type.",
            "Select the customer and fill in the reference document and the notes.",
            "Add the lines: product, lot if applicable, quantity and the returns location as the destination.",
            "Press “Create movement” and approve so stock rises in the returns location.",
            "Inspect the goods: if they are damaged or expired, write them off as shrinkage rather than leaving them in stock.",
          ],
        },
      ],
    },
    {
      titulo: "What happens in the system",
      bloques: [
        {
          tipo: "lista",
          items: [
            "The return increases the balance in the returns location.",
            "It is a fact independent of the original outbound movement: the dispatch movement is not reopened.",
            "If the product tracks lots, the source lot is recorded, or one is created with the date given.",
          ],
        },
      ],
    },
    {
      titulo: "Rules and warnings",
      bloques: [
        {
          tipo: "nota",
          tono: "warning",
          texto:
            "If the returned product is damaged, do not leave it in general stock: write it off as shrinkage (a reason is required) so it does not contaminate your available balance.",
        },
        {
          tipo: "nota",
          tono: "success",
          texto:
            "Always use a Returns location to receive into: it separates what comes back from sellable stock until you decide what to do with it.",
        },
      ],
    },
  ],
};

const PROCESS_SHRINKAGE: AyudaModulo = {
  id: "proceso-merma",
  titulo: "Process: writing off shrinkage",
  icono: "alerta",
  resumen: "How to write off lost or damaged goods, with a mandatory reason.",
  paraQueSirve:
    "It documents how to remove lost, damaged or expired goods from stock through an outbound shrinkage movement, leaving the loss traced and reflected in the shrinkage rate.",
  cuandoUsarlo:
    "When you find damaged, expired, stolen or lost product in any location. It is also the only way to get expired lots out of stock.",
  terminosClave: ["merma", "salida", "lote", "saldo", "movimiento", "vencimiento"],
  relacionados: ["movimientos", "lotes", "alertas", "reportes"],
  secciones: [
    {
      titulo: "What you need before you start",
      bloques: [
        {
          tipo: "lista",
          items: [
            "To identify the location and the product (and lot if it tracks lots) holding the balance to write off.",
            "The real reason for the shrinkage: damage, damp, expiry, theft, and so on.",
          ],
        },
      ],
    },
    {
      titulo: "Steps",
      bloques: [
        {
          tipo: "pasos",
          pasos: [
            "Go to /movimientos/nuevo and choose the Outbound type and the Shrinkage sub-type.",
            "Write the reason: it is required and at least 3 characters long.",
            "Add the line: product, lot if applicable, quantity and the source location.",
            "Press “Create movement” and approve so the stock is decreased.",
            "Optional: add a comment on the movement detail explaining the shrinkage in more depth.",
          ],
        },
      ],
    },
    {
      titulo: "What happens in the system",
      bloques: [
        {
          tipo: "lista",
          items: [
            "The shrinkage decreases the balance of the affected location and lot.",
            "It stays traced with its reason, author and date: it adds to the Dashboard’s shrinkage rate.",
            "An expired lot can be written off as shrinkage with no restriction.",
            "The shrinkage and adjustments report lets you analyse losses by reason.",
          ],
        },
      ],
    },
    {
      titulo: "Rules and warnings",
      bloques: [
        {
          tipo: "nota",
          tono: "warning",
          texto:
            "The reason is required and stays in the history: record the real cause, not a generic line of text.",
        },
        {
          tipo: "nota",
          tono: "warning",
          texto:
            "If you found the shrinkage during a stocktake, resolve it through the session (as a shortfall) rather than a manual adjustment while it is in progress.",
        },
        {
          tipo: "nota",
          tono: "success",
          texto:
            "Watch the shrinkage rate on the Dashboard: if it rises, review the shrinkage report to find the pattern (by reason, by location, by product).",
        },
      ],
    },
  ],
};

export const AYUDA_GRUPOS_EN: AyudaGrupo[] = [
  {
    titulo: "Getting started",
    modulos: [MODULE_FIRST_STEPS],
  },
  {
    titulo: "Business processes",
    modulos: [
      PROCESS_RECEIVING,
      PROCESS_DISPATCH,
      PROCESS_TRANSFER,
      PROCESS_STOCKTAKE,
      PROCESS_RETURN,
      PROCESS_SHRINKAGE,
    ],
  },
  {
    titulo: "Operations",
    modulos: [MODULE_DASHBOARD, MODULE_MOVEMENTS, MODULE_STOCKTAKE, MODULE_ALERTS],
  },
  {
    titulo: "Catalogues",
    modulos: [
      MODULE_WAREHOUSES,
      MODULE_LOCATIONS,
      MODULE_PRODUCTS,
      MODULE_LOTS,
      MODULE_CATEGORIES,
      MODULE_UOMS,
      MODULE_SUPPLIERS,
      MODULE_CUSTOMERS,
    ],
  },
  {
    titulo: "Analytics",
    modulos: [MODULE_REPORTS, MODULE_ACTIVITY],
  },
  {
    titulo: "Administration",
    modulos: [MODULE_USERS, MODULE_BRANCHES, MODULE_SETTINGS, MODULE_PROFILE],
  },
  {
    titulo: "System",
    modulos: [MODULE_SIGN_IN],
  },
];

export const GLOSARIO_EN: TerminoGlosario[] = [
  {
    id: "almacen",
    termino: "Warehouse",
    definicion:
      "The root record of the physical tree. Every operation belongs to exactly one warehouse; an inactive warehouse takes no new movements.",
  },
  {
    id: "zona",
    termino: "Zone",
    definicion:
      "A logical or physical division within a warehouse (e.g. Cold, Picking, Receiving).",
  },
  {
    id: "rack",
    termino: "Rack",
    definicion: "A storage structure within a zone (shelving, pallet, fridge…).",
  },
  {
    id: "seccion",
    termino: "Section",
    definicion: "A subdivision of a rack: levels, aisles or bays.",
  },
  {
    id: "ubicacion-bin",
    termino: "Location (bin)",
    definicion:
      "The addressable point where stock lives. Balances are recorded per (location, product, lot). It hangs from a zone, a rack or a section.",
  },
  {
    id: "caja",
    termino: "Container",
    definicion:
      "An optional physical container inside a location. It can be restricted to a single product or lot.",
  },
  {
    id: "producto-sku",
    termino: "Product / SKU",
    definicion:
      "The managed item. The SKU is the canonical identifier: unique, normalised to upper case and immutable once created.",
  },
  {
    id: "categoria",
    termino: "Category",
    definicion: "An optional classification of products, organisable into a tree hierarchy.",
  },
  {
    id: "uom",
    termino: "UOM (unit of measure)",
    definicion:
      "The unit a product is measured in. The base is the smallest unit of its family; the others are expressed as a conversion factor.",
  },
  {
    id: "uom-base",
    termino: "Base UOM",
    definicion:
      "A product’s smallest manageable unit of measure. Every quantity is stored internally in the base UOM.",
  },
  {
    id: "proveedor",
    termino: "Supplier",
    definicion: "The entity goods are received from; purchase inbound movements reference it.",
  },
  {
    id: "cliente",
    termino: "Customer",
    definicion: "The entity that receives goods; customer dispatches reference it.",
  },
  {
    id: "lote",
    termino: "Lot",
    definicion:
      "A set of units of a product with a common origin and dates. Required on every movement of a product that tracks lots.",
  },
  {
    id: "vencimiento",
    termino: "Expiry",
    definicion:
      "A lot’s use-by date. Required for products with expiry tracking; an expired lot cannot go out to a customer.",
  },
  {
    id: "trazabilidad",
    termino: "Traceability",
    definicion:
      "The ability to reconstruct the complete history of a product, lot or location: where each unit came from, who moved it and when.",
  },
  {
    id: "fefo",
    termino: "FEFO",
    definicion:
      "The “first expired, first out” outbound policy: on a dispatch, the lots with the earliest expiry date leave first. It applies to perishable products or those with expiry tracking.",
  },
  {
    id: "fifo",
    termino: "FIFO",
    definicion:
      "The “first in, first out” outbound policy: the lots with the earliest manufacture or arrival date leave first. It applies to products with lots that do not track expiry.",
  },
  {
    id: "saldo",
    termino: "Balance",
    definicion:
      "The quantity of a product’s stock at a specific point. It is derived: the sum of the approved movements, and is never edited by hand.",
  },
  {
    id: "stock-minimo",
    termino: "Minimum stock",
    definicion: "The quantity below which the low-stock alert fires.",
  },
  {
    id: "stock-maximo",
    termino: "Maximum stock",
    definicion:
      "The target quantity that should not be exceeded; going over it fires the stock-over-maximum alert.",
  },
  {
    id: "capacidad-maxima",
    termino: "Maximum capacity",
    definicion:
      "The maximum number of units a location accepts; exceeding it blocks the inbound movement.",
  },
  {
    id: "codigo-barras",
    termino: "Barcode",
    definicion:
      "An optional product identifier read with a scanner to resolve the product instantly in forms and searches. It must be unique if present.",
  },
  {
    id: "movimiento",
    termino: "Movement",
    definicion:
      "An immutable record of a change to stock, with a type, sub-type, status, lines, reason and author. It is the only way to change stock.",
  },
  {
    id: "entrada",
    termino: "Inbound movement",
    definicion: "A movement that increases the balance in the destination location.",
  },
  {
    id: "salida",
    termino: "Outbound movement",
    definicion: "A movement that decreases the balance in the source location.",
  },
  {
    id: "traslado",
    termino: "Transfer",
    definicion:
      "A movement that moves stock from one location to another without changing the total.",
  },
  {
    id: "ajuste",
    termino: "Adjustment",
    definicion: "A movement that corrects the balance (up or down) and always requires a reason.",
  },
  {
    id: "merma",
    termino: "Shrinkage",
    definicion:
      "An outbound movement for lost or damaged goods. It requires a reason; an expired lot can only leave as shrinkage or an adjustment.",
  },
  {
    id: "borrador",
    termino: "Draft",
    definicion: "A movement’s initial status: no effect on stock, and editable.",
  },
  {
    id: "pendiente-aprobacion",
    termino: "Pending approval",
    definicion: "A movement sent for approval: no effect on stock.",
  },
  {
    id: "aprobado",
    termino: "Approved",
    definicion:
      "The only status that changes the balance: on approval, the lines are executed atomically.",
  },
  {
    id: "anulado",
    termino: "Cancelled",
    definicion:
      "A cancelled movement. If it had affected stock, the cancellation generated a reversing movement; the original history is kept.",
  },
  {
    id: "movimiento-inverso",
    termino: "Reversing movement",
    definicion:
      "A movement generated automatically when an approved one is cancelled: it undoes the effect on stock in the opposite direction.",
  },
  {
    id: "sesion-inventario",
    termino: "Inventory session",
    definicion:
      "The formal process of counting all or part of a warehouse, with statuses and a closing step.",
  },
  {
    id: "conteo-ciego",
    termino: "Blind count",
    definicion:
      "A session setting that hides the system balance from the counter while they record.",
  },
  {
    id: "doble-conteo",
    termino: "Double count",
    definicion: "A session setting that requires a second count before a discrepancy is accepted.",
  },
  {
    id: "diferencia-inventario",
    termino: "Inventory discrepancy",
    definicion:
      "The result of comparing what was counted against the system balance: reconciled (equal), surplus (more physically present) or shortfall (less physically present).",
  },
  {
    id: "precision-inventario",
    termino: "Inventory accuracy",
    definicion:
      "The percentage match between what is recorded and what is physically there, measured by SKU, by quantity and by location in each closed session.",
  },
  {
    id: "alerta",
    termino: "Alert",
    definicion:
      "An automatic notice about the state of the warehouse (low stock, expiries, pending items) with a severity and a status.",
  },
  {
    id: "auditoria",
    termino: "Audit",
    definicion: "An immutable record of who did what, when and with what result.",
  },
  {
    id: "rol",
    termino: "Role",
    definicion:
      "The profile that defines what a user can do in the system (Administrator, Manager, Warehouse manager, Operator or Reader).",
  },
  {
    id: "usuario",
    termino: "User",
    definicion:
      "The access account of a person who operates Rustock, with a username, a password and an assigned role. Every movement is attributed to its author.",
  },
  {
    id: "permiso",
    termino: "Permission",
    definicion:
      "A specific protected action in the system, in the form “resource:action” (e.g. movimiento:aprobar). Roles grant or deny permissions.",
  },
  {
    id: "kardex",
    termino: "Stock card",
    definicion: "A product’s stock card: its movement history with in, out and a running balance.",
  },
  {
    id: "desactivar",
    termino: "Deactivate (logical delete)",
    definicion:
      "How Rustock “deletes” a record with history: the record becomes inactive but its data and movements are kept.",
  },
  {
    id: "creacion-rapida",
    termino: "Quick create",
    definicion:
      "The form action that lets you create a dependent catalogue record (product, lot, location, supplier…) and return to the form with the new record selected, keeping the draft intact.",
  },
];
