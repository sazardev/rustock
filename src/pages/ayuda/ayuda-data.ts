// oxlint-disable eslint/max-lines
/**
 * Contenido de la sección Ayuda de Rustock.
 *
 * Este archivo documenta los módulos TAL COMO funcionan en la aplicación hoy
 * (rutas reales del router, acciones y textos de los formularios, estados y
 * comportamientos que implementa el backend). Se mantiene a mano; cuando un
 * módulo cambie, hay que actualizar aquí la sección correspondiente.
 *
 * Estructura: grupos (espejo del sidebar) -> módulos -> secciones -> bloques.
 */
import type { IconName } from "../../shared/ui";
import { PATH } from "../../app/route-paths";

export type AyudaNotaTono = "info" | "warning" | "success";

export type AyudaBloque =
  | { tipo: "texto"; texto: string }
  | { tipo: "lista"; items: string[] }
  | { tipo: "pasos"; pasos: string[] }
  | { tipo: "tabla"; cabeceras: string[]; filas: string[][] }
  | { tipo: "enlaces"; items: Array<{ etiqueta: string; href: string }> }
  | { tipo: "nota"; texto: string; tono?: AyudaNotaTono };

export interface AyudaSeccion {
  titulo: string;
  bloques: AyudaBloque[];
}

export interface AyudaModulo {
  id: string;
  titulo: string;
  icono: IconName;
  /** Descripción corta para el índice de Ayuda. */
  resumen: string;
  /** Para qué sirve el módulo en la operación (contexto de negocio). */
  paraQueSirve?: string;
  /** En qué escenarios del día a día conviene usar este módulo. */
  cuandoUsarlo?: string;
  /** Slugs del glosario que la guía usa (se enlazan en la página del módulo). */
  terminosClave?: string[];
  /** Ids de otras guías (módulos y procesos) relacionadas con esta. */
  relacionados?: string[];
  secciones: AyudaSeccion[];
}

export interface AyudaGrupo {
  titulo: string;
  modulos: AyudaModulo[];
}

export interface TerminoGlosario {
  /** Slug estable usado como ancla (/ayuda/glosario#<id>) y para backlinks. */
  id: string;
  termino: string;
  definicion: string;
}

/** Helper de búsqueda: concatena título, resumen y textos de las secciones. */
export function textoModulo(modulo: AyudaModulo): string {
  const bloques = modulo.secciones.flatMap((s) => s.bloques);
  const fragmentos: string[] = [modulo.titulo, modulo.resumen, modulo.paraQueSirve ?? ""];
  for (const b of bloques) {
    if (b.tipo === "texto" || b.tipo === "nota") fragmentos.push(b.texto);
    else if (b.tipo === "lista") fragmentos.push(b.items.join(" "));
    else if (b.tipo === "pasos") fragmentos.push(b.pasos.join(" "));
    else if (b.tipo === "tabla") fragmentos.push(b.filas.flat().join(" "));
    else fragmentos.push(b.items.map((i) => i.etiqueta).join(" "));
  }
  return fragmentos.join(" ").toLowerCase();
}

const MODULO_ALMACENES: AyudaModulo = {
  id: "almacenes",
  titulo: "Almacenes, zonas, racks y secciones",
  icono: "almacen",
  resumen: "El árbol físico: almacén, zona, rack y sección, y cómo se crean.",
  paraQueSirve:
    "Define la estructura física de tu bodega: dónde se guarda cada cosa. Sin un árbol bien organizado, el stock no tiene dónde vivir y los reportes por zona pierden sentido.",
  cuandoUsarlo:
    "Al poner en marcha Rustock (primera configuración) y cada vez que amplíes o reorganices el espacio físico de tu operación.",
  terminosClave: ["almacen", "zona", "rack", "seccion", "ubicacion-bin", "desactivar"],
  relacionados: ["ubicaciones", "productos", "proceso-recepcion"],
  secciones: [
    {
      titulo: "Qué es",
      bloques: [
        {
          tipo: "texto",
          texto:
            "El Almacén es la raíz del árbol físico: toda la operación pertenece a exactamente un almacén. Dentro de un almacén se organizan zonas, dentro de las zonas los racks, y dentro de los racks las secciones. Las ubicaciones (donde vive el stock) cuelgan de una zona, un rack o una sección.",
        },
        {
          tipo: "tabla",
          cabeceras: ["Nivel", "Rol", "Ejemplo de código"],
          filas: [
            ["Almacén", "Raíz de la operación", "ALM-PRINCIPAL"],
            ["Zona", "División lógica o física", "Z-01"],
            ["Rack", "Estructura de almacenamiento", "RACK-A1"],
            ["Sección", "Subdivisión de un rack", "RACK-A1-N2"],
          ],
        },
      ],
    },
    {
      titulo: "Dónde acceder",
      bloques: [
        {
          tipo: "enlaces",
          items: [
            { etiqueta: "Listado de almacenes", href: "/almacenes" },
            { etiqueta: "Nuevo almacén", href: "/almacenes/nuevo" },
            { etiqueta: "Nueva zona", href: "/zonas/nuevo" },
            { etiqueta: "Nuevo rack", href: "/racks/nuevo" },
            { etiqueta: "Nueva sección", href: "/secciones/nuevo" },
          ],
        },
      ],
    },
    {
      titulo: "Acciones disponibles",
      bloques: [
        {
          tipo: "lista",
          items: [
            "Listado de almacenes con búsqueda por texto, 20 por página y orden por fecha de creación descendente. Cada fila navega al detalle.",
            "Detalle del almacén: código, nombre, descripción, dirección, fechas de creación y última actualización, y el árbol físico navegable (Zona → Rack → Sección → Ubicación). Acciones: Editar y Eliminar.",
            "Crear almacén: código (obligatorio, no se puede modificar después), nombre (obligatorio), dirección y descripción.",
            "Editar almacén: permite cambiar nombre, descripción y dirección. El código queda bloqueado.",
            "Eliminar almacén: desactiva el registro (borrado lógico). No se borra físicamente nada; el historial y los movimientos asociados se conservan.",
            "Zonas: listado, detalle (con su almacén), creación y edición. El código queda bloqueado; eliminar desactiva (rechaza si tiene stock).",
            "Racks: listado, detalle (con su zona), creación y edición. El código queda bloqueado; eliminar desactiva (rechaza si tiene stock).",
            "Secciones: listado, detalle (con su rack), creación y edición. El código queda bloqueado; eliminar desactiva (rechaza si tiene stock).",
            "Los códigos de zona, rack y sección son únicos dentro de su almacén completo (no solo bajo su padre): no pueden repetirse aunque cuelguen de contenedores distintos.",
          ],
        },
      ],
    },
    {
      titulo: "Cómo crear el árbol físico",
      bloques: [
        {
          tipo: "pasos",
          pasos: [
            "Crea el almacén en /almacenes/nuevo (código y nombre).",
            "Crea las zonas del almacén en /zonas/nuevo seleccionando el almacén.",
            "Crea los racks de cada zona en /racks/nuevo seleccionando la zona.",
            "Crea las secciones de cada rack en /secciones/nuevo seleccionando el rack.",
            "Crea las ubicaciones en /ubicaciones/nuevo eligiendo como contenedor la zona, el rack o la sección correspondiente.",
          ],
        },
      ],
    },
    {
      titulo: "Reglas y comportamiento",
      bloques: [
        {
          tipo: "lista",
          items: [
            "Zona, rack, sección y ubicación tienen listado, detalle, creación y edición propios (rutas /zonas, /racks, /secciones y /ubicaciones). El detalle del almacén muestra todo el árbol físico navegable, y las cajas (contenedores dentro de una ubicación) tienen su propio catálogo en /cajas.",
            "Los formularios de creación rápida permiten crear un almacén desde /zonas/nuevo, una zona desde /racks/nuevo, un rack desde /secciones/nuevo y cualquiera de ellos desde /ubicaciones/nuevo: al volver, el contenedor recién creado queda seleccionado.",
            "Un almacén inactivo no se puede usar en operaciones nuevas.",
            "Al desactivar, el registro conserva sus datos: solo cambia el estado Activo a Inactivo.",
          ],
        },
      ],
    },
    {
      titulo: "Errores comunes y buenas prácticas",
      bloques: [
        {
          tipo: "nota",
          tono: "info",
          texto:
            "Piensa el árbol antes de crear: almacén → zona → rack → sección → ubicación. Un código bien pensado (ej. RACK-A1-N2-P3) se entiende solo y simplifica el conteo físico.",
        },
        {
          tipo: "nota",
          tono: "warning",
          texto:
            "No puedes desactivar un almacén si aún lo usas en operaciones nuevas: primero traslada o agota el stock de sus ubicaciones y deja de usarlo en movimientos.",
        },
        {
          tipo: "nota",
          tono: "success",
          texto:
            "Usa la creación rápida: desde el formulario de una zona puedes crear el almacén sobre la marcha y queda seleccionado al volver. Evita interrumpir el flujo.",
        },
      ],
    },
  ],
};

const MODULO_UBICACIONES: AyudaModulo = {
  id: "ubicaciones",
  titulo: "Ubicaciones",
  icono: "ubicacion",
  resumen: "Los puntos direccionables donde vive el stock y su contenido.",
  paraQueSirve:
    "Las ubicaciones son los puntos exactos donde se deposita la mercancía; el saldo se registra por (ubicación, producto, lote). Son el nivel operativo donde haces picking, recepción y conteo.",
  cuandoUsarlo:
    "Al definir tu almacén y para organizar el flujo: separar recepción, picking, cuarentena, devoluciones y mercancía dañada hace el trabajo diario más claro.",
  terminosClave: ["ubicacion-bin", "capacidad-maxima", "saldo", "desactivar"],
  relacionados: ["almacenes", "inventario", "proceso-traslado"],
  secciones: [
    {
      titulo: "Qué es",
      bloques: [
        {
          tipo: "texto",
          texto:
            "Una ubicación (bin) es el punto direccionable de almacenamiento donde se deposita la mercancía. Es el nivel del árbol donde vive el stock: los saldos se registran por (ubicación, producto, lote). Cada ubicación cuelga de exactamente una zona, un rack o una sección.",
        },
      ],
    },
    {
      titulo: "Dónde acceder",
      bloques: [
        {
          tipo: "enlaces",
          items: [
            { etiqueta: "Listado de ubicaciones", href: "/ubicaciones" },
            { etiqueta: "Nueva ubicación", href: "/ubicaciones/nuevo" },
          ],
        },
      ],
    },
    {
      titulo: "Acciones disponibles",
      bloques: [
        {
          tipo: "lista",
          items: [
            "Listado con búsqueda por texto, 20 por página y orden por fecha de creación descendente. Columnas: código, nombre, tipo, capacidad máxima y estado.",
            "Detalle: código, nombre, tipo, capacidad máxima y fecha de creación. Acciones: Editar y Eliminar.",
            "Crear ubicación: código (obligatorio, ej. RACK-A1-N2-P3), nombre, tipo, capacidad máxima y contenedor padre (zona, rack o sección, obligatorio).",
            "Editar ubicación: nombre, tipo y capacidad máxima. El código y el contenedor no se pueden modificar.",
            "Eliminar ubicación: desactiva el registro (borrado lógico). No se puede desactivar una ubicación con saldo: primero hay que vaciarla o trasladar su contenido.",
          ],
        },
      ],
    },
    {
      titulo: "Tipos de ubicación",
      bloques: [
        {
          tipo: "tabla",
          cabeceras: ["Tipo", "Uso sugerido"],
          filas: [
            ["Standard", "Almacenamiento general"],
            ["Picking", "Zona de preparación de pedidos"],
            ["Reserva", "Stock de reserva"],
            ["Recepción", "Mercancía recién recibida"],
            ["Cuarentena", "Mercancía en revisión"],
            ["Devolución", "Mercancía devuelta por clientes"],
            ["Dañado", "Mercancía dañada o en mal estado"],
            ["Expedición", "Mercancía lista para despachar"],
          ],
        },
      ],
    },
    {
      titulo: "Reglas y comportamiento",
      bloques: [
        {
          tipo: "lista",
          items: [
            "Una ubicación puede contener varios productos y varios lotes a la vez (stock mezclado).",
            "Si la ubicación tiene capacidad máxima, el sistema bloquea entradas que la superen al aprobar movimientos.",
            "El contenedor padre se elige en el formulario con un selector doble: tipo de contenedor (zona/rack/sección) y el elemento concreto.",
          ],
        },
      ],
    },
    {
      titulo: "Errores comunes y buenas prácticas",
      bloques: [
        {
          tipo: "nota",
          tono: "info",
          texto:
            "Distingue los tipos de ubicación por función: Devolución para lo que regresa de clientes, Cuarentena para lo que está en revisión, Dañado para lo que se va a dar de baja, Expedición para lo listo para despachar.",
        },
        {
          tipo: "nota",
          tono: "warning",
          texto:
            "No se puede desactivar una ubicación con saldo: primero vacíala o traslada su contenido. Anticipa esto si planeas reorganizar el almacén.",
        },
        {
          tipo: "nota",
          tono: "success",
          texto:
            "Define la capacidad máxima si quieres que el sistema te avise (y bloquee) cuando una ubicación se llena. Sin capacidad definida, cualquier cantidad entra mientras haya saldo.",
        },
      ],
    },
  ],
};

const MODULO_PRODUCTOS: AyudaModulo = {
  id: "productos",
  titulo: "Productos (SKU)",
  icono: "producto",
  resumen: "El catálogo de artículos gestionados, con unidades de medida y controles.",
  paraQueSirve:
    "Cada producto (SKU) es un artículo que compras, vendes o almacenas. El catálogo de productos es el corazón de la operación: sin productos registrados no puedes recibir ni despachar nada.",
  cuandoUsarlo:
    "Antes de operar (todo producto debe existir con su UOM base) y cuando incorporas un artículo nuevo, cambias sus controles de lote/vencimiento o su stock mínimo de reposición.",
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
      titulo: "Qué es",
      bloques: [
        {
          tipo: "texto",
          texto:
            "Un producto (SKU) es el artículo gestionado. El SKU es el identificador canónico: se normaliza a mayúsculas, es único y no se puede modificar una vez creado. Todo producto necesita una unidad de medida base (la unidad más pequeña gestionable).",
        },
      ],
    },
    {
      titulo: "Dónde acceder",
      bloques: [
        {
          tipo: "enlaces",
          items: [
            { etiqueta: "Listado de productos", href: "/productos" },
            { etiqueta: "Nuevo producto", href: "/productos/nuevo" },
          ],
        },
      ],
    },
    {
      titulo: "Acciones disponibles",
      bloques: [
        {
          tipo: "lista",
          items: [
            "Listado con búsqueda por texto, 20 por página y orden por fecha de creación descendente. Columnas: SKU, nombre, control (insignias de Lote, Vencimiento y Perecedero) y estado.",
            "Detalle: todos los datos del producto (SKU, nombre, categoría, UOM base/venta/compra, código de barras, peso, volumen, stock mínimo y máximo, controles y fechas). Acciones: Editar y Eliminar.",
            "Crear producto: SKU y nombre obligatorios; UOM base obligatoria e inmutable después; categoría, UOM de venta y de compra, código de barras, peso, volumen, stock mínimo y máximo opcionales.",
            "Editar producto: nombre, categoría, UOM de venta/compra, código de barras, peso, volumen, mínimos/máximos y controles. El SKU y la UOM base quedan bloqueados.",
            "Eliminar producto: desactiva el registro (borrado lógico). Un producto inactivo no puede recibir nuevas entradas ni salidas.",
          ],
        },
      ],
    },
    {
      titulo: "Controles del producto",
      bloques: [
        {
          tipo: "tabla",
          cabeceras: ["Control", "Efecto"],
          filas: [
            ["Controla lote", "Todo movimiento de este producto exige indicar un lote."],
            [
              "Controla vencimiento",
              "Implica controlar lote y obliga a registrar la fecha de vencimiento del lote.",
            ],
            [
              "Perecedero",
              "Activa la política FEFO en las salidas (sale primero el lote que vence antes).",
            ],
          ],
        },
      ],
    },
    {
      titulo: "Reglas y comportamiento",
      bloques: [
        {
          tipo: "lista",
          items: [
            "Si marcas «Controla vencimiento», el sistema activa «Controla lote» automáticamente.",
            "El stock mínimo dispara la alerta de stock bajo cuando el saldo del producto (sumando todas sus ubicaciones) cae a ese nivel o por debajo.",
            "El código de barras, si existe, debe ser único y se usa para identificar el producto por lectura.",
          ],
        },
      ],
    },
    {
      titulo: "Errores comunes y buenas prácticas",
      bloques: [
        {
          tipo: "nota",
          tono: "info",
          texto:
            "Crea primero las unidades de medida y después los productos: sin una UOM base no puedes registrar un producto, y esa UOM ya no se puede cambiar.",
        },
        {
          tipo: "nota",
          tono: "warning",
          texto:
            "El SKU es inmutable una vez creado y debe ser único. Normalízalo desde el inicio (mayúsculas, sin espacios) y evita duplicar artículos con SKU parecidos.",
        },
        {
          tipo: "nota",
          tono: "warning",
          texto:
            "Un producto inactivo no puede recibir entradas ni salidas nuevas. Antes de desactivar, confirma que no necesitas operarlo.",
        },
        {
          tipo: "nota",
          tono: "success",
          texto:
            "Si vendes por cajas pero compras por piezas, define UOM de venta y compra con su factor: el sistema convierte automáticamente y todo queda en UOM base.",
        },
      ],
    },
  ],
};

const MODULO_LOTES: AyudaModulo = {
  id: "lotes",
  titulo: "Lotes",
  icono: "lote",
  resumen: "Agrupaciones de unidades con origen y fechas comunes, para trazabilidad.",
  paraQueSirve:
    "El lote agrupa unidades de un mismo producto que comparten origen y fechas, y permite rastrear de dónde vino cada unidad y cuándo vence. Es la base de la trazabilidad y del control FEFO.",
  cuandoUsarlo:
    "Para productos con control de lote (obligatorio), en especial los perecederos o con vencimiento: al recibir, despachar, trasladar y contar.",
  terminosClave: ["lote", "fefo", "fifo", "vencimiento", "trazabilidad"],
  relacionados: ["productos", "movimientos", "reportes", "proceso-recepcion", "proceso-merma"],
  secciones: [
    {
      titulo: "Qué es",
      bloques: [
        {
          tipo: "texto",
          texto:
            "Un lote agrupa unidades de un producto con origen y fecha comunes. Solo tiene sentido para productos que controlan lote: para esos productos, todo movimiento (entrada, salida, traslado, ajuste) debe indicar el lote.",
        },
      ],
    },
    {
      titulo: "Dónde acceder",
      bloques: [
        {
          tipo: "enlaces",
          items: [
            { etiqueta: "Listado de lotes", href: "/lotes" },
            { etiqueta: "Nuevo lote", href: "/lotes/nuevo" },
          ],
        },
      ],
    },
    {
      titulo: "Acciones disponibles",
      bloques: [
        {
          tipo: "lista",
          items: [
            "Listado con búsqueda por texto, 20 por página y orden por fecha de creación descendente. Columnas: número, producto, vencimiento y origen.",
            "Detalle: número, producto, fechas de fabricación y vencimiento, origen, notas y fecha de creación.",
            "Crear lote: número (obligatorio, inmutable después), producto (solo aparecen los que controlan lote), fechas, origen y notas.",
            "Editar lote: fechas, origen y notas. El número y el producto no se pueden modificar.",
            "Los lotes no tienen acción de eliminar.",
          ],
        },
      ],
    },
    {
      titulo: "Reglas y comportamiento",
      bloques: [
        {
          tipo: "lista",
          items: [
            "El número de lote es único dentro del producto.",
            "Si el producto controla vencimiento, la fecha de vencimiento es obligatoria al crear el lote y al registrar entradas con un lote nuevo.",
            "Un lote vencido no puede salir como despacho a cliente ni devolución a proveedor: solo como merma o ajuste negativo.",
            "Los lotes se listan filtrados por producto en los formularios de movimiento y de conteo (selector «Lote»).",
          ],
        },
      ],
    },
    {
      titulo: "Errores comunes y buenas prácticas",
      bloques: [
        {
          tipo: "nota",
          tono: "warning",
          texto:
            "La fecha de vencimiento se exige solo si el producto controla vencimiento. Si gestionas perecederos, actívalo para que el sistema aplique FEFO en las salidas.",
        },
        {
          tipo: "nota",
          tono: "warning",
          texto:
            "Un lote vencido no sale a cliente. Para retirarlo del stock usa una salida por merma o un ajuste negativo.",
        },
        {
          tipo: "nota",
          tono: "success",
          texto:
            "Usa el reporte de vencimientos y la alerta «Lote por vencer» para dar salida a los lotes antes de que caduquen y evitar mermas.",
        },
      ],
    },
  ],
};

const MODULO_CATEGORIAS: AyudaModulo = {
  id: "categorias",
  titulo: "Categorías",
  icono: "categoria",
  resumen: "Clasificación jerárquica de productos.",
  paraQueSirve:
    "Las categorías agrupan productos por tipo, familia o uso, en árbol (con categorías padre). Sirven para filtrar el stock y los reportes y para encontrar artículos rápido.",
  cuandoUsarlo:
    "Al crear tu catálogo inicial y cuando añadas productos: clasificar desde el principio hace los reportes por categoría mucho más útiles.",
  terminosClave: ["categoria", "producto-sku"],
  relacionados: ["productos", "reportes"],
  secciones: [
    {
      titulo: "Qué es",
      bloques: [
        {
          tipo: "texto",
          texto:
            "Una categoría clasifica productos y puede organizarse en jerarquía de árbol (una categoría puede tener una categoría padre). Un producto puede referenciar una categoría; no es obligatorio.",
        },
      ],
    },
    {
      titulo: "Dónde acceder",
      bloques: [
        {
          tipo: "enlaces",
          items: [
            { etiqueta: "Listado de categorías", href: "/categorias" },
            { etiqueta: "Nueva categoría", href: "/categorias/nuevo" },
          ],
        },
      ],
    },
    {
      titulo: "Acciones disponibles",
      bloques: [
        {
          tipo: "lista",
          items: [
            "Listado con búsqueda por texto, 20 por página y orden por fecha de creación descendente. Columnas: nombre, categoría padre y estado.",
            "Detalle: nombre, descripción, categoría padre y fecha de creación. Acciones: Editar y Eliminar.",
            "Crear categoría: nombre (obligatorio), categoría padre (opcional; sin padre queda en la raíz del árbol) y descripción.",
            "Editar categoría: permite cambiar el nombre, la descripción y mover la categoría a otra padre o a la raíz. En el selector de padre se excluye la propia categoría.",
            "Eliminar categoría: desactiva el registro (borrado lógico).",
          ],
        },
      ],
    },
    {
      titulo: "Reglas y comportamiento",
      bloques: [
        {
          tipo: "lista",
          items: [
            "El sistema rechaza jerarquías con ciclos: no se puede poner una categoría como descendiente de sí misma.",
            "El reporte de Stock actual permite filtrar por categoría.",
          ],
        },
      ],
    },
    {
      titulo: "Errores comunes y buenas prácticas",
      bloques: [
        {
          tipo: "nota",
          tono: "info",
          texto:
            "Planea la jerarquía antes de crear: no hace falta un nivel por cada variante. Un árbol de 2 o 3 niveles (Familia → Subfamilia) suele ser suficiente.",
        },
        {
          tipo: "nota",
          tono: "warning",
          texto:
            "No se puede crear un ciclo (una categoría descendiente de sí misma): el sistema lo rechaza. Al editar, el selector de padre excluye la propia categoría.",
        },
      ],
    },
  ],
};

const MODULO_UOMS: AyudaModulo = {
  id: "uoms",
  titulo: "Unidades de medida (UOM)",
  icono: "uom",
  resumen: "Las unidades en que se miden los productos y sus factores de conversión.",
  paraQueSirve:
    "Definen cómo se cuantifica cada producto (piezas, kilos, litros, cajas…). La UOM base es la unidad más pequeña; todas las cantidades se guardan internamente en ella para que las operaciones sean coherentes.",
  cuandoUsarlo:
    "Antes de crear productos: todo producto necesita una UOM base. También cuando compras o vendes en unidades distintas de la base (ej. piezas vs. cajas).",
  terminosClave: ["uom", "uom-base", "producto-sku"],
  relacionados: ["productos", "proceso-recepcion", "proceso-despacho"],
  secciones: [
    {
      titulo: "Qué es",
      bloques: [
        {
          tipo: "texto",
          texto:
            "La unidad de medida (UOM) define en qué se mide un producto. La UOM base es la unidad más pequeña gestionable de su familia; las demás UOM de la misma familia se expresan como factor de conversión hacia la base. Todas las cantidades se almacenan internamente en UOM base.",
        },
      ],
    },
    {
      titulo: "Dónde acceder",
      bloques: [
        {
          tipo: "enlaces",
          items: [
            { etiqueta: "Listado de unidades de medida", href: "/uoms" },
            { etiqueta: "Nueva unidad de medida", href: "/uoms/nuevo" },
          ],
        },
      ],
    },
    {
      titulo: "Acciones disponibles",
      bloques: [
        {
          tipo: "lista",
          items: [
            "Listado con búsqueda por texto, 20 por página y orden por fecha de creación descendente. Columnas: código, nombre, tipo, factor, si es base de su familia y estado.",
            "Detalle: código, nombre, tipo, factor de conversión, si es base, estado y fecha de creación.",
            "Crear unidad de medida: código (obligatorio), nombre (obligatorio), tipo, factor de conversión (mayor o igual a 1) y el marcador «es la unidad base de su familia».",
            "Editar unidad de medida: nombre, tipo, factor y el marcador de base. El código queda bloqueado (define la identidad).",
            "Eliminar unidad de medida: desactiva el registro (borrado lógico). No se puede desactivar una UOM que algún producto use como base, de venta o de compra.",
          ],
        },
      ],
    },
    {
      titulo: "Tipos de UOM",
      bloques: [
        {
          tipo: "tabla",
          cabeceras: ["Tipo", "Ejemplos"],
          filas: [
            ["Unidad", "PZA (pieza)"],
            ["Peso", "KG, GR"],
            ["Volumen", "L, ML"],
            ["Longitud", "M, CM"],
            ["Superficie", "M2"],
          ],
        },
      ],
    },
    {
      titulo: "Reglas y comportamiento",
      bloques: [
        {
          tipo: "lista",
          items: [
            "El factor indica cuántas unidades base equivale esta UOM (ej. CAJA con factor 10 sobre PZA: 1 caja = 10 piezas).",
            "Un producto solo se puede crear si existe al menos una UOM: crea primero las UOM y después los productos.",
          ],
        },
      ],
    },
    {
      titulo: "Errores comunes y buenas prácticas",
      bloques: [
        {
          tipo: "nota",
          tono: "info",
          texto:
            "Crea la UOM base de cada familia (ej. PZA, KG, L) antes que las derivadas (CAJA, GR, ML). Así los factores de conversión son claros.",
        },
        {
          tipo: "nota",
          tono: "warning",
          texto:
            "El código de una UOM no se puede editar una vez creado: revisa bien el código y el factor antes de guardar. Las UOM en uso por algún producto no se pueden desactivar.",
        },
        {
          tipo: "nota",
          tono: "success",
          texto:
            "El factor debe ser mayor o igual a 1. Una UOM base de familia es la raíz de la conversión; las demás se expresan hacia ella.",
        },
      ],
    },
  ],
};

const MODULO_PROVEEDORES: AyudaModulo = {
  id: "proveedores",
  titulo: "Proveedores",
  icono: "proveedor",
  resumen: "Origen de las compras: las entradas de compra los referencian.",
  paraQueSirve:
    "Registran de quién compras mercancía. Las recepciones de compra y las devoluciones a proveedor lo referencian, dejando la trazabilidad del origen de cada entrada.",
  cuandoUsarlo:
    "Al incorporar un nuevo proveedor o al recibir mercancía: seleccionarlo en el movimiento de entrada es obligatorio para los sub-tipos Compra y Devolución a proveedor.",
  terminosClave: ["proveedor", "entrada", "trazabilidad"],
  relacionados: ["clientes", "movimientos", "reportes", "proceso-recepcion"],
  secciones: [
    {
      titulo: "Qué es",
      bloques: [
        {
          tipo: "texto",
          texto:
            "Un proveedor es la entidad de la que se recibe mercancía. Las entradas de tipo compra y las devoluciones a proveedor lo referencian como origen o destino de la operación.",
        },
      ],
    },
    {
      titulo: "Dónde acceder",
      bloques: [
        {
          tipo: "enlaces",
          items: [
            { etiqueta: "Listado de proveedores", href: "/proveedores" },
            { etiqueta: "Nuevo proveedor", href: "/proveedores/nuevo" },
          ],
        },
      ],
    },
    {
      titulo: "Acciones disponibles",
      bloques: [
        {
          tipo: "lista",
          items: [
            "Listado con búsqueda por texto, 20 por página y orden por fecha de creación descendente. Columnas: código, nombre, teléfono y estado.",
            "Detalle: código, nombre, contacto, teléfono, email, dirección y fecha de creación. Acciones: Editar y Eliminar.",
            "Crear proveedor: código (obligatorio, inmutable después), nombre (obligatorio), contacto, teléfono, email y dirección.",
            "Editar proveedor: nombre, contacto, teléfono, email y dirección. El código queda bloqueado.",
            "Eliminar proveedor: desactiva el registro (borrado lógico). Un proveedor inactivo no puede usarse en entradas nuevas.",
          ],
        },
      ],
    },
    {
      titulo: "Reglas y comportamiento",
      bloques: [
        {
          tipo: "lista",
          items: [
            "En el formulario de movimiento, el selector de proveedor aparece para los sub-tipos Compra y Devolución a proveedor.",
            "El reporte de Entradas del periodo permite filtrar por proveedor.",
          ],
        },
      ],
    },
    {
      titulo: "Errores comunes y buenas prácticas",
      bloques: [
        {
          tipo: "nota",
          tono: "warning",
          texto:
            "Un proveedor inactivo no se puede usar en entradas nuevas. Antes de desactivar, asegúrate de no volver a comprarle.",
        },
        {
          tipo: "nota",
          tono: "success",
          texto:
            "Registra los datos de contacto del proveedor: sirven para identificar facturas y para la devolución de mercancía.",
        },
      ],
    },
  ],
};

const MODULO_CLIENTES: AyudaModulo = {
  id: "clientes",
  titulo: "Clientes",
  icono: "cliente",
  resumen: "Destino de los despachos: las salidas a cliente los referencian.",
  paraQueSirve:
    "Registran a quién despachas mercancía. Las salidas a cliente y las devoluciones de cliente lo referencian, dejando trazado el destino de cada salida.",
  cuandoUsarlo:
    "Al incorporar un nuevo cliente o al despachar un pedido: seleccionarlo en el movimiento de salida es obligatorio para los sub-tipos Cliente y Devolución de cliente.",
  terminosClave: ["cliente", "salida", "trazabilidad"],
  relacionados: ["proveedores", "movimientos", "reportes", "proceso-despacho"],
  secciones: [
    {
      titulo: "Qué es",
      bloques: [
        {
          tipo: "texto",
          texto:
            "Un cliente es la entidad que recibe mercancía. Las salidas de tipo despacho a cliente y las devoluciones de cliente lo referencian como destino u origen de la operación.",
        },
      ],
    },
    {
      titulo: "Dónde acceder",
      bloques: [
        {
          tipo: "enlaces",
          items: [
            { etiqueta: "Listado de clientes", href: "/clientes" },
            { etiqueta: "Nuevo cliente", href: "/clientes/nuevo" },
          ],
        },
      ],
    },
    {
      titulo: "Acciones disponibles",
      bloques: [
        {
          tipo: "lista",
          items: [
            "Listado con búsqueda por texto, 20 por página y orden por fecha de creación descendente. Columnas: código, nombre, teléfono y estado.",
            "Detalle: código, nombre, contacto, teléfono, email, dirección y fecha de creación. Acciones: Editar y Eliminar.",
            "Crear cliente: código (obligatorio, inmutable después), nombre (obligatorio), contacto, teléfono, email y dirección.",
            "Editar cliente: nombre, contacto, teléfono, email y dirección. El código queda bloqueado.",
            "Eliminar cliente: desactiva el registro (borrado lógico).",
          ],
        },
      ],
    },
    {
      titulo: "Reglas y comportamiento",
      bloques: [
        {
          tipo: "lista",
          items: [
            "En el formulario de movimiento, el selector de cliente aparece para los sub-tipos Despacho a cliente y Devolución de cliente.",
            "El reporte de Salidas del periodo permite filtrar por cliente.",
          ],
        },
      ],
    },
    {
      titulo: "Errores comunes y buenas prácticas",
      bloques: [
        {
          tipo: "nota",
          tono: "warning",
          texto:
            "Un cliente inactivo no se puede usar en salidas nuevas. Antes de desactivar, verifica que no haya despachos pendientes.",
        },
        {
          tipo: "nota",
          tono: "success",
          texto:
            "Registra contacto y dirección: si un cliente devuelve mercancía, sabrás a quién y de dónde recibirla.",
        },
      ],
    },
  ],
};

const MODULO_DASHBOARD: AyudaModulo = {
  id: "dashboard",
  titulo: "Dashboard",
  icono: "dashboard",
  resumen: "Indicadores de la operación: KPIs, alertas y movimientos recientes.",
  paraQueSirve:
    "Es la foto del negocio en un vistazo: cuánto stock tienes, cuántas alertas hay, qué moviste hoy y con qué precisión contaste por última vez. Ayuda a detectar problemas antes de que escalen.",
  cuandoUsarlo:
    "Al iniciar el día (revisar alertas y movimientos de hoy) y como punto de partida para decidir qué atender primero.",
  terminosClave: ["saldo", "alerta", "precision-inventario", "merma", "movimiento"],
  relacionados: ["movimientos", "alertas", "reportes"],
  secciones: [
    {
      titulo: "Qué es",
      bloques: [
        {
          tipo: "texto",
          texto:
            "El Dashboard es la página de inicio de la aplicación (ruta /dashboard). Muestra un resumen de la operación con indicadores clave, indicadores adicionales y los movimientos más recientes.",
        },
      ],
    },
    {
      titulo: "Dónde acceder",
      bloques: [{ tipo: "enlaces", items: [{ etiqueta: "Dashboard", href: PATH.dashboard }] }],
    },
    {
      titulo: "Indicadores clave",
      bloques: [
        {
          tipo: "tabla",
          cabeceras: ["Indicador", "Qué muestra"],
          filas: [
            ["SKUs activos", "Número de productos activos en el catálogo."],
            ["Unidades totales", "Suma de todas las unidades en stock (UOM base)."],
            ["Alertas activas", "Alertas en estado ABIERTA."],
            ["Movimientos de hoy", "Movimientos con fecha de movimiento del día de hoy."],
            [
              "Precisión (última sesión)",
              "Precisión por SKU de la última sesión de inventario cerrada, o «Sin sesiones cerradas».",
            ],
            ["Ocupación de ubicaciones", "Porcentaje de ubicaciones con stock sobre el total."],
          ],
        },
      ],
    },
    {
      titulo: "Indicadores adicionales",
      bloques: [
        {
          tipo: "tabla",
          cabeceras: ["Indicador", "Qué muestra"],
          filas: [
            ["Tasa de merma", "Porcentaje de unidades de merma sobre las unidades de entrada."],
            [
              "Lotes vencidos sin dar de baja",
              "Lotes con vencimiento pasado que aún conservan saldo.",
            ],
          ],
        },
      ],
    },
    {
      titulo: "Movimientos recientes",
      bloques: [
        {
          tipo: "texto",
          texto:
            "La tabla «Movimientos recientes» lista los 5 movimientos más recientes por fecha de movimiento (número, tipo, fecha y estado). Cada fila navega al detalle del movimiento.",
        },
        {
          tipo: "texto",
          texto:
            "El botón «Nuevo movimiento» de la cabecera abre el formulario de creación de movimientos.",
        },
      ],
    },
  ],
};

const MODULO_MOVIMIENTOS: AyudaModulo = {
  id: "movimientos",
  titulo: "Movimientos",
  icono: "movements",
  resumen: "El núcleo del sistema: entradas, salidas, traslados y ajustes de stock.",
  paraQueSirve:
    "Es la única forma de cambiar el stock: cada entrada, salida, traslado o ajuste queda registrado con tipo, motivo, autor y fechas. Es lo que hace que tu saldo sea fiable y auditable.",
  cuandoUsarlo:
    "En toda operación diaria: recibir mercancía de un proveedor, despachar a un cliente, mover stock entre ubicaciones, corregir saldos y dar de baja mermas.",
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
      titulo: "Qué es",
      bloques: [
        {
          tipo: "texto",
          texto:
            "Un movimiento es la única forma de alterar el stock. Cada movimiento tiene un tipo (Entrada, Salida, Traslado o Ajuste), un sub-tipo, un estado, una o más líneas (producto, lote, cantidad y ubicaciones) y datos de auditoría (quién lo creó, aprobó o anuló y cuándo).",
        },
        {
          tipo: "texto",
          texto:
            "El stock nunca se toca «a mano»: el saldo de una ubicación es la suma de los movimientos aprobados. Un movimiento aprobado es inmutable; anularlo genera un movimiento inverso.",
        },
      ],
    },
    {
      titulo: "Dónde acceder",
      bloques: [
        {
          tipo: "enlaces",
          items: [
            { etiqueta: "Listado de movimientos", href: PATH.movimientos },
            { etiqueta: "Nuevo movimiento", href: PATH.movimientosNuevo },
          ],
        },
      ],
    },
    {
      titulo: "Tipos y sub-tipos",
      bloques: [
        {
          tipo: "tabla",
          cabeceras: ["Tipo", "Sub-tipos", "Efecto"],
          filas: [
            [
              "Entrada",
              "Compra, Devolución de cliente, Inicial (apertura)",
              "Incrementa el saldo en la ubicación destino.",
            ],
            [
              "Salida",
              "Cliente, Devolución a proveedor, Merma",
              "Decrementa el saldo en la ubicación origen.",
            ],
            [
              "Traslado",
              "(no aplica sub-tipo en el formulario)",
              "Mueve stock de una ubicación a otra; no altera el total.",
            ],
            [
              "Ajuste",
              "Ajuste positivo (sobrante), Ajuste negativo (faltante)",
              "Corrige el saldo hacia arriba o hacia abajo; siempre exige motivo.",
            ],
          ],
        },
      ],
    },
    {
      titulo: "Estados de un movimiento",
      bloques: [
        {
          tipo: "tabla",
          cabeceras: ["Estado", "Significado"],
          filas: [
            [
              "Borrador",
              "Creado pero sin efecto sobre el stock. Se puede enviar a aprobación o aprobar directamente.",
            ],
            ["Pendiente de aprobación", "Enviado a aprobación; sin efecto sobre el stock."],
            [
              "Aprobado",
              "Único estado que altera el saldo: al aprobarse se ejecutan las líneas de forma atómica.",
            ],
            ["Anulado", "Cancelado. Si había afectado el stock, se generó un movimiento inverso."],
          ],
        },
      ],
    },
    {
      titulo: "Cómo crear un movimiento",
      bloques: [
        {
          tipo: "pasos",
          pasos: [
            "Entra a /movimientos/nuevo y elige el tipo (Entrada, Salida, Traslado o Ajuste). El tipo queda reflejado en la URL.",
            "Selecciona el sub-tipo (por ejemplo, para Entrada: Compra, Devolución de cliente o Inicial).",
            "Completa los datos generales: documento de referencia (opcional), proveedor o cliente según el sub-tipo, fecha del movimiento y motivo (obligatorio y de al menos 3 caracteres para ajustes y mermas).",
            "Agrega una o más líneas: producto, lote (obligatorio si el producto controla lote), cantidad y las ubicaciones de origen o destino según el tipo.",
            "En salidas puedes usar «Sugerir FIFO/FEFO»: elige el producto y la cantidad y el sistema propone las líneas con los lotes y ubicaciones según la política.",
            "Pulsa «Crear movimiento». El movimiento nace en Borrador y te lleva a su detalle.",
          ],
        },
      ],
    },
    {
      titulo: "Crear un traslado",
      bloques: [
        {
          tipo: "pasos",
          pasos: [
            "En /movimientos/nuevo elige el tipo Traslado.",
            "Selecciona producto (y lote si el producto controla lote), cantidad, documento de referencia (opcional) y las ubicaciones de origen y destino.",
            "El origen y el destino no pueden ser la misma ubicación.",
            "Pulsa «Crear traslado»; te lleva al detalle del movimiento de salida generado.",
          ],
        },
      ],
    },
    {
      titulo: "Detalle de un movimiento",
      bloques: [
        {
          tipo: "lista",
          items: [
            "Datos generales: tipo, sub-tipo, fecha del movimiento, documento de referencia, motivo, notas y auditoría (creado/aprobado/anulado por y sus fechas).",
            "Líneas del movimiento: producto, lote, cantidad, ubicación de origen y de destino, cada una enlazada a su detalle.",
            "Comentarios: lista los comentarios del movimiento y permite agregar uno desde el formulario al pie.",
            "Acciones según el estado: «Editar» (Borrador o Pendiente, en /movimientos/:id/editar), «Enviar a aprobación» (solo Borrador, sin salir de la página), «Aprobar» (Borrador o Pendiente) y «Anular» (solo Aprobado).",
            "Editar movimiento: solo su creador y solo en Borrador o Pendiente de aprobación. Se actualizan los campos operativos y las líneas; el tipo, sub-tipo y número quedan bloqueados.",
            "Si el movimiento fue anulado, aparece un aviso con el enlace al movimiento inverso.",
          ],
        },
      ],
    },
    {
      titulo: "Aprobar un movimiento",
      bloques: [
        {
          tipo: "texto",
          texto:
            "La aprobación vive en su propia página (/movimientos/:id/aprobar). Solo se puede aprobar un movimiento en estado Borrador o Pendiente de aprobación. Al aprobar se ejecutan las líneas de forma atómica: es el único momento en que el movimiento altera el saldo de sus ubicaciones.",
        },
      ],
    },
    {
      titulo: "Anular un movimiento",
      bloques: [
        {
          tipo: "texto",
          texto:
            "La anulación vive en su propia página (/movimientos/:id/anular). Solo se pueden anular movimientos Aprobados. Al anular se genera un movimiento inverso que revierte el efecto sobre el stock; el movimiento original queda como Anulado y su historial nunca se borra.",
        },
      ],
    },
    {
      titulo: "Reglas y comportamiento",
      bloques: [
        {
          tipo: "lista",
          items: [
            "Un movimiento aprobado no se puede editar; solo anular (generando el inverso).",
            "Ningún saldo puede quedar negativo: el sistema valida el saldo disponible antes de aprobar y rechaza la operación con un mensaje claro si no alcanza.",
            "Los productos que controlan lote exigen lote en todas sus líneas, sin excepción.",
            "Un lote vencido no puede salir como Cliente ni Devolución a proveedor; solo como Merma o Ajuste negativo.",
            "El formulario conserva el borrador si sales a crear un producto, lote, ubicación, proveedor o cliente desde el propio formulario (creación rápida): al volver, el registro recién creado queda seleccionado.",
          ],
        },
      ],
    },
    {
      titulo: "Errores comunes y buenas prácticas",
      bloques: [
        {
          tipo: "nota",
          tono: "warning",
          texto:
            "El stock nunca se toca «a mano»: todo cambio debe pasar por un movimiento. Si algo no cuadra, no edites saldos directamente: registra el ajuste correspondiente con su motivo.",
        },
        {
          tipo: "nota",
          tono: "warning",
          texto:
            "Un movimiento aprobado es inmutable. Si te equivocaste, anúlalo (se genera el inverso) o crea uno nuevo: nunca intentes forzar una edición.",
        },
        {
          tipo: "nota",
          tono: "warning",
          texto:
            "«Saldo insuficiente» significa que la cantidad pedida excede lo disponible en la ubicación. Revisa el stock antes de despachar o divide el despacho entre varias ubicaciones.",
        },
        {
          tipo: "nota",
          tono: "info",
          texto:
            "Los ajustes y las mermas exigen un motivo de al menos 3 caracteres: es obligatorio y queda en el historial. No lo dejes genérico; registra la causa real.",
        },
        {
          tipo: "nota",
          tono: "success",
          texto:
            "En salidas, usa «Sugerir FIFO/FEFO» para que el sistema proponga qué lotes y ubicaciones salen primero: ahorra errores y respeta la política de rotación.",
        },
      ],
    },
  ],
};

const MODULO_INVENTARIO: AyudaModulo = {
  id: "inventario",
  titulo: "Inventario físico",
  icono: "inventario",
  resumen: "Sesiones de conteo, diferencias, precisión y cierre.",
  paraQueSirve:
    "Verifica que el stock registrado coincida con el físico. Contando de forma periódica (completa o cíclica) detectas sobrantes y faltantes, y al cerrar la sesión el sistema ajusta los saldos y mide tu precisión.",
  cuandoUsarlo:
    "Periódicamente (cíclico por zona o categoría) o en cierres de año (completo). Si sospechas diferencias, es el camino correcto en vez de ajustar a mano.",
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
      titulo: "Qué es",
      bloques: [
        {
          tipo: "texto",
          texto:
            "Una sesión de inventario formaliza el proceso de contar el stock físico de un almacén. Los conteos se registran por (ubicación, producto, lote) y al cerrar la sesión el sistema compara lo contado contra el saldo del sistema, calcula las diferencias y genera los ajustes de stock correspondientes.",
        },
      ],
    },
    {
      titulo: "Dónde acceder",
      bloques: [
        {
          tipo: "enlaces",
          items: [
            { etiqueta: "Listado de sesiones", href: PATH.inventario },
            { etiqueta: "Nueva sesión", href: PATH.inventarioNuevo },
          ],
        },
      ],
    },
    {
      titulo: "Estados de una sesión",
      bloques: [
        {
          tipo: "tabla",
          cabeceras: ["Estado", "Significado"],
          filas: [
            ["Planeada", "Creada sin fecha de inicio: aún no admite conteos."],
            ["En curso", "Admite registrar conteos y cerrar la sesión."],
            [
              "Cerrada",
              "Ya no admite conteos; muestra la precisión y generó los ajustes de diferencias.",
            ],
            ["Anulada", "Cancelada."],
          ],
        },
      ],
    },
    {
      titulo: "Cómo crear una sesión",
      bloques: [
        {
          tipo: "pasos",
          pasos: [
            "Entra a /inventario/nuevo.",
            "Elige el tipo: Completo (cuenta todo el almacén) o Cíclico (cuenta un subconjunto definido por el alcance).",
            "Selecciona el almacén (obligatorio) y describe el alcance del conteo (texto libre, ej. zona, categoría).",
            "Define la fecha de inicio. Si la dejas con valor, la sesión nace En curso y ya admite conteos; si la dejas vacía, queda Planeada.",
            "Marca «Conteo ciego» si no quieres que se muestre el saldo del sistema durante la captura, y «Exige doble conteo» si toda diferencia requiere un segundo conteo.",
            "Pulsa «Crear sesión».",
          ],
        },
      ],
    },
    {
      titulo: "Registrar conteos",
      bloques: [
        {
          tipo: "texto",
          texto:
            "La captura vive en su propia página (/inventario/:id/conteos) y solo está disponible mientras la sesión está En curso. El formulario pide ubicación, producto, lote (si el producto controla lote), cantidad contada (0 = producto ausente), número de conteo (1, 2…) y una nota opcional.",
        },
        {
          tipo: "lista",
          items: [
            "El saldo del sistema no se muestra en la página de captura, con conteo ciego activo o no.",
            "Puedes usar la creación rápida para crear una ubicación, producto o lote sobre la marcha.",
            "Después de registrar, el formulario se limpia conservando el número de conteo.",
            "La tabla inferior muestra los conteos ya registrados de la sesión.",
          ],
        },
      ],
    },
    {
      titulo: "Diferencias",
      bloques: [
        {
          tipo: "tabla",
          cabeceras: ["Diferencia", "Significado"],
          filas: [
            ["Conciliado", "La cantidad contada coincide con el saldo del sistema."],
            ["Sobrante", "Hay más en físico que en el sistema; se propone una entrada por ajuste."],
            [
              "Faltante",
              "Hay menos en físico que en el sistema; se propone una salida por ajuste.",
            ],
          ],
        },
      ],
    },
    {
      titulo: "Cerrar la sesión",
      bloques: [
        {
          tipo: "pasos",
          pasos: [
            "Con la sesión En curso, pulsa «Cerrar sesión» desde el detalle.",
            "En la página de confirmación revisa las diferencias no conciliadas y los ajustes que se generarán.",
            "Confirma el cierre. La sesión pasa a Cerrada y ya no admite más conteos.",
          ],
        },
      ],
    },
    {
      titulo: "Precisión de la sesión",
      bloques: [
        {
          tipo: "lista",
          items: [
            "Precisión por SKU: porcentaje de SKU contados cuyo saldo coincide con el sistema.",
            "Precisión por cantidad: porcentaje de unidades correctas sobre las unidades contadas.",
            "Exactitud por ubicación: porcentaje de ubicaciones sin diferencia sobre las contadas.",
          ],
        },
      ],
    },
    {
      titulo: "Reglas y comportamiento",
      bloques: [
        {
          tipo: "lista",
          items: [
            "El detalle de la sesión muestra el resumen completo (tipo, almacén, alcance, responsable, flags, fechas y auditoría), los conteos y las diferencias.",
            "Si la sesión está Cerrada, el detalle muestra el panel de precisión.",
            "Una sesión de inventario en curso bloquea los ajustes manuales sobre el almacén de la sesión (el cierre genera sus propios ajustes).",
          ],
        },
      ],
    },
    {
      titulo: "Errores comunes y buenas prácticas",
      bloques: [
        {
          tipo: "nota",
          tono: "info",
          texto:
            "Usa el conteo ciego para evitar sesgos: el contador no ve el saldo del sistema mientras cuenta. Actívalo en sesiones formales.",
        },
        {
          tipo: "nota",
          tono: "warning",
          texto:
            "Si una sesión está En curso, los ajustes manuales sobre ese almacén quedan bloqueados: las diferencias deben resolverse a través de la propia sesión. No luches contra esto; cierra la sesión para que genere los ajustes.",
        },
        {
          tipo: "nota",
          tono: "warning",
          texto:
            "No dejes la fecha de inicio vacía si quieres operar ya: la sesión nace En curso solo si tiene fecha de inicio. Con ella vacía queda Planeada y no admite conteos.",
        },
        {
          tipo: "nota",
          tono: "success",
          texto:
            "La cantidad contada puede ser 0: significa «no está presente». Un producto presente sin saldo es un sobrante que se regulariza al cerrar.",
        },
      ],
    },
  ],
};

const MODULO_ALERTAS: AyudaModulo = {
  id: "alertas",
  titulo: "Alertas",
  icono: "alerta",
  resumen: "Avisos de stock bajo, vencimientos y movimientos pendientes.",
  paraQueSirve:
    "Te avisa automáticamente de lo que necesita acción: stock bajo, stock excedido, ubicaciones llenas, lotes por vencer o vencidos, diferencias de inventario y movimientos pendientes de aprobación.",
  cuandoUsarlo:
    "A diario: el contador de alertas activas en la barra superior te indica si hay algo que atender. Cada alerta enlaza a la causa raíz para resolverla.",
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
      titulo: "Qué es",
      bloques: [
        {
          tipo: "texto",
          texto:
            "El módulo de alertas reúne los avisos automáticos sobre el estado del almacén: stock bajo, stock excedido, ubicaciones sobrecapacidad, lotes por vencer o vencidos, diferencias de inventario y movimientos pendientes de aprobación. Las alertas se recalculan al consultarlas.",
        },
      ],
    },
    {
      titulo: "Dónde acceder",
      bloques: [{ tipo: "enlaces", items: [{ etiqueta: "Alertas", href: PATH.alertas }] }],
    },
    {
      titulo: "Tipos de alerta",
      bloques: [
        {
          tipo: "tabla",
          cabeceras: ["Alerta", "Cuándo se dispara"],
          filas: [
            [
              "Stock bajo",
              "El saldo del producto (suma de ubicaciones) cae a su stock mínimo o por debajo.",
            ],
            ["Stock excedido", "El saldo supera el stock máximo del producto."],
            [
              "Ubicación sobrecapacidad",
              "Un movimiento intenta ingresar más de la capacidad máxima de la ubicación.",
            ],
            [
              "Lote por vencer",
              "El lote vence dentro del horizonte configurado (días de aviso de vencimiento).",
            ],
            ["Lote vencido", "El lote tiene vencimiento pasado y aún conserva saldo."],
            ["Diferencia de inventario", "Una sesión de conteo detectó diferencias."],
            [
              "Movimiento pendiente",
              "Existe un movimiento en Pendiente de aprobación sin resolver.",
            ],
          ],
        },
      ],
    },
    {
      titulo: "Severidades y estados",
      bloques: [
        {
          tipo: "lista",
          items: [
            "Severidad: Info, Media o Alta.",
            "Estado: Abierta, Resuelta o Ignorada.",
            "El filtro por estado (Abiertas por defecto, Resueltas, Ignoradas) está en la cabecera de la tabla.",
          ],
        },
      ],
    },
    {
      titulo: "Resolver o ignorar",
      bloques: [
        {
          tipo: "texto",
          texto:
            "En el listado de alertas abiertas, cada fila ofrece dos acciones: «Resolver» y «Ignorar». Resolver marca la alerta como resuelta; ignorar la marca como ignorada (y no se vuelve a abrir).",
        },
        {
          tipo: "texto",
          texto:
            "Importante: resolver una alerta no corrige su causa raíz. Si la condición persiste (por ejemplo, el movimiento sigue pendiente o el stock sigue bajo), la alerta se vuelve a abrir en el siguiente recálculo. Para resolver la causa hay que actuar en el módulo correspondiente: registrar una entrada, dar de baja una merma, aprobar el movimiento, etc.",
        },
      ],
    },
    {
      titulo: "Errores comunes y buenas prácticas",
      bloques: [
        {
          tipo: "nota",
          tono: "warning",
          texto:
            "Resolver no arregla la causa: la alerta se vuelve a abrir mientras la condición persista. Ataca la raíz (registrar una entrada, aprobar el movimiento, dar de baja el vencido) y no solo el botón.",
        },
        {
          tipo: "nota",
          tono: "info",
          texto:
            "Cada fila de alerta enlaza a la entidad que la dispara (producto, lote, ubicación, movimiento o sesión): úsalo para llegar directo a resolver la causa.",
        },
        {
          tipo: "nota",
          tono: "success",
          texto:
            "Configura bien tus umbrales en el módulo de Configuración (días de aviso de vencimiento y stock mínimo por defecto) para que las alertas reflejen tu negocio y no generen ruido.",
        },
      ],
    },
  ],
};

const MODULO_REPORTES: AyudaModulo = {
  id: "reportes",
  titulo: "Reportes",
  icono: "reportes",
  resumen: "Diez informes: stock, movimientos, vencimientos, precisión y auditoría.",
  paraQueSirve:
    "Convierte los datos del almacén en información de gestión: cuánto tienes, qué moviste, qué vence, con qué precisión cuentas y quién hizo qué. Todo es exportable a CSV o JSON.",
  cuandoUsarlo:
    "Para tomar decisiones: revisar stock por categoría, analizar movimientos por periodo, anticipar vencimientos, evaluar la precisión del inventario y auditar la actividad del equipo.",
  terminosClave: ["saldo", "kardex", "vencimiento", "precision-inventario", "auditoria", "merma"],
  relacionados: ["dashboard", "historial", "inventario", "movimientos"],
  secciones: [
    {
      titulo: "Qué es",
      bloques: [
        {
          tipo: "texto",
          texto:
            "El módulo de Reportes agrupa diez informes operativos. Todos pueden exportarse a CSV o JSON con los filtros aplicados (botones de exportación en la barra de filtros de cada reporte).",
        },
      ],
    },
    {
      titulo: "Dónde acceder",
      bloques: [{ tipo: "enlaces", items: [{ etiqueta: "Reportes", href: PATH.reportes }] }],
    },
    {
      titulo: "Stock actual",
      bloques: [
        {
          tipo: "enlaces",
          items: [{ etiqueta: "Abrir reporte de stock", href: PATH.reporteStock }],
        },
        {
          tipo: "lista",
          items: [
            "Resumen: productos con stock, unidades totales, ubicaciones con stock y filas de stock.",
            "Filtros: búsqueda por SKU o nombre de producto, categoría y almacén.",
            "Tabla «Stock por producto»: SKU, producto, ubicaciones, lotes, unidades, mínimo, máximo y estado (insignia Stock bajo si las unidades caen al mínimo o por debajo).",
            "Tabla «Detalle por ubicación y lote»: cada fila de saldo con producto, ubicación, almacén, lote, cantidad y fecha de actualización.",
            "El saldo se calcula exclusivamente desde movimientos aprobados.",
          ],
        },
      ],
    },
    {
      titulo: "Movimientos por periodo",
      bloques: [
        {
          tipo: "enlaces",
          items: [{ etiqueta: "Abrir reporte de movimientos", href: PATH.reporteMovimientos }],
        },
        {
          tipo: "lista",
          items: [
            "Filtros: tipo, sub-tipo, estado, usuario, proveedor, cliente, ubicación de origen, ubicación de destino y rango de fechas.",
            "Totales por tipo (conteo real del motor de consulta agrupado por tipo).",
            "Gráfica de movimientos por día para los últimos 30 días.",
            "Tabla paginada de movimientos; cada fila navega al detalle.",
          ],
        },
      ],
    },
    {
      titulo: "Vencimientos",
      bloques: [
        {
          tipo: "enlaces",
          items: [{ etiqueta: "Abrir reporte de vencimientos", href: PATH.reporteVencimientos }],
        },
        {
          tipo: "lista",
          items: [
            "Selector de rango: próximos 30, 60 o 90 días.",
            "Tabla: SKU, lote, vencimiento, cantidad y estado (Vencido o Por vencer).",
          ],
        },
      ],
    },
    {
      titulo: "Kardex de producto",
      bloques: [
        {
          tipo: "enlaces",
          items: [{ etiqueta: "Abrir kardex", href: PATH.reporteKardex }],
        },
        {
          tipo: "lista",
          items: [
            "Selecciona un producto en el selector; la URL refleja el producto elegido.",
            "Tabla: movimiento, tipo, fecha, entrada, salida y saldo acumulado (la tarjeta de stock del producto).",
          ],
        },
      ],
    },
    {
      titulo: "Precisión de inventario",
      bloques: [
        {
          tipo: "enlaces",
          items: [{ etiqueta: "Abrir reporte de precisión", href: PATH.reportePrecision }],
        },
        {
          tipo: "lista",
          items: [
            "Promedios por SKU, por cantidad y por ubicación entre todas las sesiones cerradas.",
            "Evolución de la precisión por SKU con barras por sesión.",
            "Tabla de sesiones cerradas con sus tres porcentajes; cada fila navega al detalle de la sesión.",
          ],
        },
      ],
    },
    {
      titulo: "Auditoría",
      bloques: [
        {
          tipo: "enlaces",
          items: [{ etiqueta: "Abrir reporte de auditoría", href: PATH.reporteAuditoria }],
        },
        {
          tipo: "lista",
          items: [
            "Filtros: usuario, nivel (Lectura/Escritura), rango de fechas, comando y entidad.",
            "Tabla: fecha y hora, usuario, comando o acción, entidad, nivel, resultado y duración.",
            "Muestra hasta 200 eventos de auditoría con los filtros aplicados.",
          ],
        },
      ],
    },
    {
      titulo: "Entradas del periodo",
      bloques: [
        {
          tipo: "enlaces",
          items: [{ etiqueta: "Abrir reporte de entradas", href: PATH.reporteEntradas }],
        },
        {
          tipo: "lista",
          items: [
            "Movimientos de tipo Entrada (compras, devoluciones de cliente, ajustes positivos e iniciales) con filtro por proveedor, estado y rango de fechas.",
            "Totales por sub-tipo.",
          ],
        },
      ],
    },
    {
      titulo: "Salidas del periodo",
      bloques: [
        {
          tipo: "enlaces",
          items: [{ etiqueta: "Abrir reporte de salidas", href: PATH.reporteSalidas }],
        },
        {
          tipo: "lista",
          items: [
            "Movimientos de tipo Salida (despachos a cliente, devoluciones a proveedor y traslados de salida) con filtro por cliente, estado y rango de fechas.",
            "Totales por sub-tipo.",
          ],
        },
      ],
    },
    {
      titulo: "Mermas y ajustes",
      bloques: [
        {
          tipo: "enlaces",
          items: [
            { etiqueta: "Abrir reporte de mermas y ajustes", href: PATH.reporteMermasAjustes },
          ],
        },
        {
          tipo: "lista",
          items: [
            "Mermas y ajustes de stock (positivos y negativos) con filtro por estado y rango de fechas.",
            "Totales por sub-tipo; el motivo de cada movimiento se muestra en la tabla.",
          ],
        },
      ],
    },
    {
      titulo: "Desempeño de usuarios",
      bloques: [
        {
          tipo: "enlaces",
          items: [{ etiqueta: "Abrir reporte de desempeño", href: PATH.reporteUsuarios }],
        },
        {
          tipo: "lista",
          items: [
            "Número de movimientos registrados por usuario, con filtro por tipo de movimiento y rango de fechas.",
            "Columnas: usuario, nombre, movimientos y porcentaje del total.",
          ],
        },
      ],
    },
  ],
};

const MODULO_HISTORIAL: AyudaModulo = {
  id: "historial",
  titulo: "Historial de actividad",
  icono: "historial",
  resumen:
    "Centro de actividad: tracking total de rutas, módulos, ejecuciones, procesos, usuarios, horas y tendencias.",
  paraQueSirve:
    "Es el centro de actividad del sistema: registra todo lo que ocurre — las páginas que visitas (rutas), los módulos que usas, cada comando que ejecuta el backend, los procesos de negocio, con usuario, hora, día, duración, resultado y la empresa (tenant). Con esa información calcula métricas, gráficas e insights automáticos para análisis profundo y predictivo.",
  cuandoUsarlo:
    "Para auditar la actividad del sistema, entender cómo se usa la aplicación (qué módulos y procesos dominan, a qué horas), detectar errores y medir el desempeño de los usuarios.",
  terminosClave: ["auditoria", "trazabilidad", "usuario", "rol"],
  relacionados: ["reportes", "usuarios", "movimientos"],
  secciones: [
    {
      titulo: "Qué es",
      bloques: [
        {
          tipo: "texto",
          texto:
            "El centro de actividad es el historial total del sistema. Cada vez que navegas a una página se registra una vista (ruta, módulo, duración, hora local); cada comando del backend se registra como una operación (comando, duración, resultado, nivel). Todo evento guarda quién, cuándo, desde qué módulo, en qué proceso y a nombre de qué empresa (tenant).",
        },
      ],
    },
    {
      titulo: "Dónde acceder",
      bloques: [
        { tipo: "enlaces", items: [{ etiqueta: "Historial de actividad", href: PATH.historial }] },
      ],
    },
    {
      titulo: "Qué muestra",
      bloques: [
        {
          tipo: "lista",
          items: [
            "Resumen (KPIs): eventos totales, vistas de página, operaciones, tasa de éxito, usuarios activos y duración media por vista.",
            "Perspectiva del periodo: insights automáticos (hora pico, día de mayor uso, módulo dominante, ruta más visitada, usuario más activo, proceso más frecuente y tendencia semanal).",
            "Vistas por módulo: cuánto se usa cada sección de la aplicación.",
            "Actividad por día, por hora del día y por día de la semana: los patrones temporales de uso.",
            "Usuarios más activos, procesos de negocio y rutas más visitadas.",
            "Registro de eventos: la tabla completa filtrable por usuario, tipo (Vista/Comando), módulo, resultado y rango de fechas, con paginación y exportación CSV/JSON.",
          ],
        },
      ],
    },
    {
      titulo: "Filtros",
      bloques: [
        {
          tipo: "lista",
          items: [
            "Desde/Hasta: acota el periodo analizado (por defecto se acumula todo lo registrado).",
            "Usuario: aísla la actividad de una cuenta.",
            "Tipo de evento: vistas de página (navegación) o comandos del backend (operaciones).",
            "Módulo: un área concreta (Movimientos, Productos, Reportes...).",
            "Resultado: solo éxitos o solo errores.",
            "Comando: búsqueda textual del comando (ej. aprobar_movimiento).",
          ],
        },
      ],
    },
    {
      titulo: "Reglas y comportamiento",
      bloques: [
        {
          tipo: "nota",
          tono: "info",
          texto:
            "Los eventos de auditoría son inmutables: no se borran ni se editan desde la interfaz. El tracking es total y automático: no hay que activarlo.",
        },
        {
          tipo: "lista",
          items: [
            "El tracking de rutas se registra en el backend (comando registrar_vista) con la sesión del usuario; al cerrar la pestaña la vista en curso se envía por beacon para no perderla.",
            "Las vistas registran ruta, módulo, proceso de negocio asociado, duración, hora y día local, navegador y pantalla.",
            "Los comandos del backend se clasifican automáticamente por módulo (Movimientos, Productos...) y proceso de negocio (gestión de movimientos, inventario físico...).",
            "El reporte de Auditoría (/reportes/auditoria) ofrece los mismos eventos con filtros avanzados y paginación.",
          ],
        },
      ],
    },
  ],
};

const MODULO_USUARIOS: AyudaModulo = {
  id: "usuarios",
  titulo: "Usuarios y roles",
  icono: "rol",
  resumen: "Cuentas de acceso, roles y la matriz de permisos.",
  paraQueSirve:
    "Controla quién puede entrar y qué puede hacer cada persona según su rol. Es la base de la auditoría: cada movimiento queda atribuido a un usuario.",
  cuandoUsarlo:
    "Al incorporar personal nuevo, al cambiar de responsabilidades y para mantener la seguridad del acceso. Solo el ADMIN gestiona usuarios.",
  terminosClave: ["rol", "permiso", "auditoria", "desactivar"],
  relacionados: ["configuracion", "perfil", "inicio-sesion"],
  secciones: [
    {
      titulo: "Qué es",
      bloques: [
        {
          tipo: "texto",
          texto:
            "Cada persona que opera Rustock tiene una cuenta de usuario con un rol. El rol define qué puede hacer: solo el ADMIN gestiona usuarios, roles y configuración. Las cuentas desactivadas no pueden iniciar sesión, pero su historial se conserva.",
        },
      ],
    },
    {
      titulo: "Dónde acceder",
      bloques: [
        {
          tipo: "enlaces",
          items: [
            { etiqueta: "Listado de usuarios", href: PATH.usuarios },
            { etiqueta: "Nuevo usuario", href: `${PATH.usuarios}/nuevo` },
          ],
        },
      ],
    },
    {
      titulo: "Roles",
      bloques: [
        {
          tipo: "tabla",
          cabeceras: ["Rol", "Alcance"],
          filas: [
            [
              "Administrador",
              "Control total: usuarios, roles, configuración, catálogos, movimientos e inventario.",
            ],
            [
              "Gerente",
              "Ve todo, crea y valida movimientos y gestiona catálogos; no gestiona usuarios.",
            ],
            ["Encargado de almacén", "Gestiona movimientos y ejecuta inventario."],
            [
              "Operador",
              "Registra movimientos de entrada/salida/traslado; no autoriza ajustes ni cierra inventario.",
            ],
            ["Lector", "Solo lectura: consultas y reportes."],
          ],
        },
      ],
    },
    {
      titulo: "Acciones disponibles",
      bloques: [
        {
          tipo: "lista",
          items: [
            "Listado con filtro por estado (todos, activos, inactivos), 20 por página y orden por nombre de usuario. Columnas: usuario, nombre completo, email, rol, estado y último acceso.",
            "Nuevo usuario (solo ADMIN): usuario, nombre completo, email, rol y contraseña de al menos 8 caracteres.",
            "Detalle: datos de la cuenta y actividad reciente (eventos de auditoría del usuario).",
            "Editar usuario (solo ADMIN): nombre completo, email y rol. El nombre de usuario es inmutable.",
            "Desactivar / reactivar usuario (solo ADMIN): la página de confirmación explica las consecuencias. No puedes desactivar tu propia cuenta ni al último administrador activo.",
            "Cambiar contraseña (solo ADMIN, desde el detalle): asigna una nueva contraseña sin conocer la anterior.",
          ],
        },
      ],
    },
    {
      titulo: "Tu propia cuenta",
      bloques: [
        {
          tipo: "texto",
          texto:
            "Desde Mi perfil (/perfil) puedes ver tus datos, cambiar tu contraseña (verificando la actual) y ajustar tus preferencias de presentación.",
        },
      ],
    },
  ],
};

const MODULO_SUCURSALES: AyudaModulo = {
  id: "sucursales",
  titulo: "Sucursales",
  icono: "ubicacion",
  resumen: "Los puntos de operación de la empresa con su ubicación geográfica.",
  paraQueSirve:
    "Documenta los puntos físicos de operación de la empresa con su ubicación geográfica (país, ciudad, coordenadas y mapa). Es información de contexto y organización, no participa de los movimientos de stock.",
  cuandoUsarlo:
    "Al configurar la empresa y cuando abras un punto de operación nuevo que quieras dejar documentado con su mapa.",
  terminosClave: ["almacen", "ubicacion-bin"],
  relacionados: ["configuracion", "almacenes"],
  secciones: [
    {
      titulo: "Qué es",
      bloques: [
        {
          tipo: "texto",
          texto:
            "Una sucursal es un punto de operación de la empresa con su ubicación geográfica. Es un registro de configuración (no participa de los movimientos de stock): sirve para documentar dónde opera la empresa.",
        },
      ],
    },
    {
      titulo: "Dónde acceder",
      bloques: [
        {
          tipo: "enlaces",
          items: [
            { etiqueta: "Listado de sucursales", href: PATH.sucursales },
            { etiqueta: "Nueva sucursal", href: `${PATH.sucursales}/nuevo` },
          ],
        },
      ],
    },
    {
      titulo: "Acciones disponibles",
      bloques: [
        {
          tipo: "lista",
          items: [
            "Listado completo: código, nombre, país, ciudad, dirección, coordenadas y estado.",
            "Nueva sucursal: código (obligatorio, inmutable después), nombre (obligatorio), país, ciudad, dirección, latitud y longitud. El botón «Detectar mi ubicación» rellena las coordenadas con la geolocalización del navegador.",
            "Detalle: datos generales y mapa (OpenStreetMap embebido) con enlace «Abrir en Google Maps».",
            "Editar sucursal: nombre, país, ciudad, dirección y coordenadas. El código queda bloqueado.",
            "Desactivar sucursal: la página de confirmación explica que los datos se conservan.",
          ],
        },
      ],
    },
    {
      titulo: "Reglas y comportamiento",
      bloques: [
        {
          tipo: "lista",
          items: [
            "El mapa embebido y el enlace de Google Maps requieren conexión a internet.",
            "La sucursal principal (la de la Configuración) es un registro aparte: la configuración guarda su propia dirección y coordenadas.",
          ],
        },
      ],
    },
  ],
};

const MODULO_CONFIGURACION: AyudaModulo = {
  id: "configuracion",
  titulo: "Configuración",
  icono: "configuracion",
  resumen: "Datos de la empresa, ubicación, archivos y parámetros globales.",
  paraQueSirve:
    "Centraliza los datos de tu empresa (básicos, fiscales, contacto, ubicación con mapa, logo y documentos) y los parámetros globales que definen el comportamiento de toda la app (zona horaria, formato de fecha, umbrales y política de aprobación).",
  cuandoUsarlo:
    "Al instalar Rustock y cuando cambie algún dato de la empresa o los parámetros operativos. Solo el ADMIN puede editarla.",
  terminosClave: ["stock-minimo", "vencimiento", "alerta"],
  relacionados: ["perfil", "usuarios", "sucursales", "alertas"],
  secciones: [
    {
      titulo: "Qué es",
      bloques: [
        {
          tipo: "texto",
          texto:
            "La configuración reúne los datos de la empresa, su ubicación, archivos (logo y documentos) y los parámetros globales del sistema. Solo el ADMIN puede verla y editarla; el resto de roles ve un aviso con enlace a su perfil.",
        },
      ],
    },
    {
      titulo: "Dónde acceder",
      bloques: [
        { tipo: "enlaces", items: [{ etiqueta: "Configuración", href: PATH.configuracion }] },
      ],
    },
    {
      titulo: "Secciones del formulario",
      bloques: [
        {
          tipo: "tabla",
          cabeceras: ["Sección", "Campos"],
          filas: [
            [
              "Datos de la empresa",
              "Nombre, código, país, ciudad, dirección, código postal y descripción.",
            ],
            [
              "Datos fiscales",
              "Razón social, documento fiscal (RUC, NIT, RFC) y dirección fiscal.",
            ],
            ["Contacto", "Teléfono, email de contacto y sitio web."],
            [
              "Ubicación y mapa",
              "Latitud y longitud con «Detectar mi ubicación», mapa OpenStreetMap y enlace a Google Maps.",
            ],
            [
              "Parámetros generales",
              "Zona horaria, formato de fecha, días de aviso de vencimiento y stock mínimo por defecto.",
            ],
            [
              "Política de operación",
              "«Requerir aprobación de movimientos»: con esto activado los movimientos nacen en borrador y pasan por aprobación.",
            ],
          ],
        },
      ],
    },
    {
      titulo: "Logo y documentos",
      bloques: [
        {
          tipo: "lista",
          items: [
            "Logo: PNG, JPG o SVG de hasta 2 MB. Subir uno nuevo reemplaza al anterior.",
            "Documentos: cualquier archivo de hasta 10 MB (facturas, certificados). Se listan con su tamaño y permiten verlos (imágenes y PDF se muestran embebidos) o eliminarlos.",
            "Los archivos se guardan en la base de datos (no en el sistema de archivos).",
          ],
        },
      ],
    },
    {
      titulo: "Reglas y comportamiento",
      bloques: [
        {
          tipo: "lista",
          items: [
            "La zona horaria y el formato de fecha de la empresa son el valor por defecto de las fechas en toda la app; cada usuario puede heredarlos o definir los suyos en su perfil.",
            "Los días de aviso de vencimiento definen el horizonte de la alerta «Lote por vencer».",
            "El stock mínimo por defecto se aplica a los productos que no tienen stock mínimo propio.",
            "Desde la cabecera se accede a Sucursales y a Usuarios y roles.",
          ],
        },
      ],
    },
  ],
};

const MODULO_PERFIL: AyudaModulo = {
  id: "perfil",
  titulo: "Mi perfil",
  icono: "usuario",
  resumen: "Tus datos, contraseña, preferencias y el orden del panel lateral.",
  paraQueSirve:
    "Personaliza la experiencia según tu forma de trabajar: tamaño de fuente, zona horaria y formato de fecha, orden del panel lateral, y tu propia contraseña. Tus preferencias no afectan a otros usuarios.",
  cuandoUsarlo:
    "En tu primer día (ajusta fuente y zona horaria) y siempre que quieras reordenar tu navegación o cambiar tu contraseña.",
  terminosClave: ["usuario", "rol"],
  relacionados: ["usuarios", "configuracion", "inicio-sesion"],
  secciones: [
    {
      titulo: "Qué es",
      bloques: [
        {
          tipo: "texto",
          texto:
            "Mi perfil agrupa la información de tu propia cuenta: tus datos, el cambio de contraseña, tus preferencias de presentación y el orden de los ítems del panel lateral.",
        },
      ],
    },
    {
      titulo: "Dónde acceder",
      bloques: [
        {
          tipo: "enlaces",
          items: [
            { etiqueta: "Mi perfil", href: PATH.perfil },
            { etiqueta: "Listado de usuarios", href: PATH.usuarios },
          ],
        },
      ],
    },
    {
      titulo: "Secciones",
      bloques: [
        {
          tipo: "tabla",
          cabeceras: ["Sección", "Contenido"],
          filas: [
            ["Datos", "Usuario, nombre completo, email y rol (solo lectura)."],
            ["Contraseña", "Cambia tu contraseña verificando la actual (mínimo 8 caracteres)."],
            [
              "Preferencias",
              "Tamaño de fuente, zona horaria y formato de fecha (heredar de la empresa o propio).",
            ],
            [
              "Orden del panel lateral",
              "Reordena los ítems de cada grupo con las flechas; se aplica al guardar.",
            ],
          ],
        },
      ],
    },
    {
      titulo: "Reglas y comportamiento",
      bloques: [
        {
          tipo: "lista",
          items: [
            "El tamaño de fuente escala toda la interfaz (los estilos usan rem): Pequeña, Media o Grande.",
            "Si eliges «Heredar de la empresa» para zona horaria o formato de fecha, se usa el valor de la Configuración.",
            "El orden del panel lateral se persiste por usuario; los ítems nuevos aparecen al final de su grupo.",
            "La edición de tus datos (nombre, email, rol) la hace el ADMIN desde el detalle del usuario; el perfil propio es de solo lectura.",
          ],
        },
      ],
    },
  ],
};

const MODULO_INICIO_SESION: AyudaModulo = {
  id: "inicio-sesion",
  titulo: "Inicio de sesión y primera configuración",
  icono: "rol",
  resumen: "La landing pública, el login y la creación del primer administrador.",
  paraQueSirve:
    "Es la puerta de entrada al sistema: la presentación pública, el inicio de sesión y la creación del primer administrador en una instalación nueva. Toda la aplicación exige sesión.",
  cuandoUsarlo:
    "En la primera instalación (configurar administrador) y cada vez que un usuario entra o sale del sistema.",
  terminosClave: ["usuario", "rol", "permiso"],
  relacionados: ["usuarios", "perfil", "dashboard"],
  secciones: [
    {
      titulo: "Qué es",
      bloques: [
        {
          tipo: "texto",
          texto:
            "Antes de entrar a la aplicación hay tres pantallas públicas: la página de presentación (raíz /), el inicio de sesión (/login) y la configuración del administrador (/configurar-administrador). Toda la aplicación exige sesión: sin sesión, las rutas redirigen al login.",
        },
      ],
    },
    {
      titulo: "Página de presentación",
      bloques: [
        {
          tipo: "texto",
          texto:
            "La raíz de la aplicación (/) muestra la presentación del producto: características, cómo funciona e integridad. Si ya tienes sesión iniciada, al entrar te redirige automáticamente al Dashboard.",
        },
      ],
    },
    {
      titulo: "Iniciar sesión",
      bloques: [
        {
          tipo: "pasos",
          pasos: [
            "Entra a /login.",
            "Escribe tu usuario y contraseña.",
            "Pulsa «Ingresar». Con sesión correcta te lleva al Dashboard.",
          ],
        },
        {
          tipo: "texto",
          texto:
            "Si es la primera vez que se usa la instalación, el enlace «Configurar el administrador» lleva al formulario de bootstrap.",
        },
      ],
    },
    {
      titulo: "Configurar el administrador",
      bloques: [
        {
          tipo: "pasos",
          pasos: [
            "Entra a /configurar-administrador.",
            "Completa usuario, nombre completo, contraseña (mínimo 8 caracteres) y confirmación.",
            "Pulsa «Crear administrador e ingresar»: crea el primer usuario con rol Administrador e inicia sesión.",
          ],
        },
        {
          tipo: "texto",
          texto:
            "El comando es idempotente: si ya existe un administrador, el formulario no crea nada nuevo e intenta iniciar sesión con las credenciales indicadas. Nunca revela si un administrador ya existe.",
        },
      ],
    },
    {
      titulo: "Reglas y comportamiento",
      bloques: [
        {
          tipo: "lista",
          items: [
            "Las cuentas desactivadas no pueden iniciar sesión.",
            "La sesión es única por instalación (un solo operador a la vez).",
            "Desde la barra superior puedes cerrar sesión con el botón de salir.",
          ],
        },
      ],
    },
  ],
};

const MODULO_PRIMEROS_PASOS: AyudaModulo = {
  id: "primeros-pasos",
  titulo: "Primeros pasos",
  icono: "agregar",
  resumen: "El orden recomendado para poner Rustock en marcha y operar desde el día uno.",
  paraQueSirve:
    "Te guía en la puesta en marcha en el orden correcto: primero los catálogos base (UOM y productos), luego el espacio físico (almacén y ubicaciones), después el stock inicial y finalmente la operación diaria.",
  cuandoUsarlo:
    "Si acabas de instalar Rustock o estás empezando a cargar tu inventario. También es una buena referencia para capacitar a un usuario nuevo.",
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
      titulo: "Paso 1: Configura la empresa y los usuarios",
      bloques: [
        {
          tipo: "texto",
          texto:
            "Entra a Configuración para registrar los datos de tu empresa (nombre, fiscales, contacto, ubicación y parámetros globales como zona horaria y umbral de vencimiento). Crea los usuarios del equipo con su rol en Usuarios.",
        },
        {
          tipo: "enlaces",
          items: [
            { etiqueta: "Configuración", href: "/configuracion" },
            { etiqueta: "Usuarios y roles", href: "/usuarios" },
          ],
        },
      ],
    },
    {
      titulo: "Paso 2: Crea las unidades de medida",
      bloques: [
        {
          tipo: "texto",
          texto:
            "Ningún producto puede existir sin una UOM base. Crea primero las unidades de tu operación (PZA, KG, L, CAJA, M…) y sus factores de conversión.",
        },
        {
          tipo: "enlaces",
          items: [{ etiqueta: "Nueva unidad de medida", href: "/uoms/nuevo" }],
        },
      ],
    },
    {
      titulo: "Paso 3: Crea los productos",
      bloques: [
        {
          tipo: "texto",
          texto:
            "Registra cada artículo que compras, vendes o almacenas: SKU, nombre, categoría, UOM base y los controles de lote/vencimiento según corresponda. Define el stock mínimo para activar alertas de reposición.",
        },
        {
          tipo: "enlaces",
          items: [{ etiqueta: "Nuevo producto", href: "/productos/nuevo" }],
        },
      ],
    },
    {
      titulo: "Paso 4: Define el espacio físico",
      bloques: [
        {
          tipo: "texto",
          texto:
            "Crea el almacén y luego el árbol: zonas, racks, secciones y ubicaciones. El stock vive en las ubicaciones, así que son imprescindibles para operar.",
        },
        {
          tipo: "enlaces",
          items: [
            { etiqueta: "Nuevo almacén", href: "/almacenes/nuevo" },
            { etiqueta: "Nueva ubicación", href: "/ubicaciones/nuevo" },
          ],
        },
      ],
    },
    {
      titulo: "Paso 5: Carga el stock inicial",
      bloques: [
        {
          tipo: "texto",
          texto:
            "Si ya tienes mercancía, regístrala como entrada de tipo Inicial (apertura de inventario) para que el sistema arranque con tus saldos reales. Requiere permiso de configuración (ADMIN/GERENTE).",
        },
        {
          tipo: "enlaces",
          items: [{ etiqueta: "Nuevo movimiento", href: "/movimientos/nuevo" }],
        },
      ],
    },
    {
      titulo: "Paso 6: Opera el día a día",
      bloques: [
        {
          tipo: "texto",
          texto:
            "Con el catálogo y el stock cargados, empieza la operación normal: recibe compras, despacha pedidos, traslada mercancía y corrige saldos. Consulta los procesos del negocio para cada flujo.",
        },
        {
          tipo: "enlaces",
          items: [
            { etiqueta: "Proceso: recepción de compra", href: "/ayuda/proceso-recepcion" },
            { etiqueta: "Proceso: despacho a cliente", href: "/ayuda/proceso-despacho" },
          ],
        },
      ],
    },
    {
      titulo: "Paso 7: Valida con un inventario",
      bloques: [
        {
          tipo: "texto",
          texto:
            "Cuando tengas operación, programa una sesión de inventario para verificar que el stock registrado coincide con el físico y medir tu precisión.",
        },
        {
          tipo: "enlaces",
          items: [{ etiqueta: "Nueva sesión de inventario", href: "/inventario/nuevo" }],
        },
      ],
    },
    {
      titulo: "Atajos de teclado",
      bloques: [
        {
          tipo: "lista",
          items: [
            "Ctrl+K: abre «Buscar en todo Rustock» (command palette) desde cualquier pantalla.",
            "/: enfoca la búsqueda global del command palette.",
            "N: abre la página de «nueva entidad» del módulo actual (nuevo producto, nuevo movimiento, nueva ubicación, etc.). No aplica en formularios ni en páginas de edición.",
            "Ctrl+Enter: envía el formulario visible (guardar sin hacer clic).",
          ],
        },
      ],
    },
    {
      titulo: "Buenas prácticas de arranque",
      bloques: [
        {
          tipo: "nota",
          tono: "success",
          texto:
            "Piensa tu catálogo antes de cargarlo: códigos claros y normalizados (SKU, ubicaciones) hacen que todo el flujo posterior sea más rápido y con menos errores.",
        },
        {
          tipo: "nota",
          tono: "warning",
          texto:
            "La UOM base de un producto no se puede cambiar después de creado. Revisa bien la elección antes de guardar.",
        },
        {
          tipo: "nota",
          tono: "warning",
          texto:
            "El SKU y el código de una ubicación son inmutables. Diseña un esquema de códigos legible (ej. RACK-A1-N2-P3) desde el día uno.",
        },
      ],
    },
  ],
};

const MODULO_PROCESO_RECEPCION: AyudaModulo = {
  id: "proceso-recepcion",
  titulo: "Proceso: recepción de compra",
  icono: "entrada",
  resumen: "Cómo registrar la mercancía que llega de un proveedor, paso a paso.",
  paraQueSirve:
    "Documenta el flujo completo de una recepción: crear el movimiento de entrada, validarlo y aprobarlo para que el stock suba en la ubicación destino, dejando trazado el origen (proveedor y documento).",
  cuandoUsarlo:
    "Cada vez que llega mercancía de un proveedor: compras normales, reposiciones y cualquier recepción que deba incrementar tu saldo.",
  terminosClave: ["entrada", "lote", "saldo", "movimiento", "proveedor", "aprobado", "fefo"],
  relacionados: ["movimientos", "productos", "lotes", "proveedores", "uoms"],
  secciones: [
    {
      titulo: "Qué necesitas antes de empezar",
      bloques: [
        {
          tipo: "lista",
          items: [
            "Un proveedor registrado (o créalo con la creación rápida desde el propio formulario).",
            "Los productos (SKU) existentes, con su UOM base definida.",
            "Una ubicación destino activa, preferentemente de tipo Recepción.",
            "Si el producto controla lote, ten identificados los lotes o los datos para crearlos.",
          ],
        },
      ],
    },
    {
      titulo: "Pasos",
      bloques: [
        {
          tipo: "pasos",
          pasos: [
            "Entra a /movimientos/nuevo y elige el tipo Entrada y el sub-tipo Compra.",
            "Completa los datos generales: documento de referencia (ej. número de OC), proveedor, fecha del movimiento y notas si hace falta.",
            "Agrega una línea por producto: producto, lote (obligatorio si controla lote), cantidad y ubicación destino.",
            "Pulsa «Crear movimiento»: nace en Borrador y te lleva a su detalle.",
            "Desde el detalle, pulsa «Enviar a aprobación» (si tu política lo exige) o «Aprobar» directamente.",
            "Al aprobarse, el saldo de la ubicación destino se incrementa de forma atómica.",
          ],
        },
      ],
    },
    {
      titulo: "Qué ocurre en el sistema",
      bloques: [
        {
          tipo: "lista",
          items: [
            "La entrada incrementa el saldo en la ubicación destino.",
            "Si el producto controla lote, cada línea queda ligada a su lote (se crea uno nuevo si hace falta con su fecha de vencimiento).",
            "Quedan registrados el autor, la fecha y el documento de referencia: la trazabilidad del origen queda completa.",
            "El Dashboard refleja el movimiento de hoy y el stock actual del producto.",
          ],
        },
      ],
    },
    {
      titulo: "Reglas y advertencias",
      bloques: [
        {
          tipo: "nota",
          tono: "warning",
          texto:
            "No puedes recibir un producto inactivo ni superar la capacidad máxima de la ubicación destino: el sistema lo rechaza al aprobar.",
        },
        {
          tipo: "nota",
          tono: "warning",
          texto:
            "Si el producto controla vencimiento, la fecha de vencimiento es obligatoria al crear el lote. Un lote vencido no puede entrar como compra.",
        },
        {
          tipo: "nota",
          tono: "success",
          texto:
            "Si llega más o menos de lo esperado, ajusta la cantidad del movimiento mientras esté en Borrador; una vez aprobado, crea otro movimiento o anula y rehaz.",
        },
      ],
    },
  ],
};

const MODULO_PROCESO_DESPACHO: AyudaModulo = {
  id: "proceso-despacho",
  titulo: "Proceso: despacho a cliente",
  icono: "salida",
  resumen: "Cómo registrar la salida de mercancía hacia un cliente, paso a paso.",
  paraQueSirve:
    "Documenta el flujo de un despacho: crear la salida, usar la sugerencia FIFO/FEFO para elegir qué lotes salen y aprobar para que el stock baje en origen, con el cliente y documento trazados.",
  cuandoUsarlo:
    "Cada vez que despachas mercancía a un cliente: pedidos, ventas y cualquier salida que deba decrementar tu saldo.",
  terminosClave: ["salida", "lote", "fefo", "fifo", "saldo", "movimiento", "cliente", "aprobado"],
  relacionados: ["movimientos", "productos", "lotes", "clientes"],
  secciones: [
    {
      titulo: "Qué necesitas antes de empezar",
      bloques: [
        {
          tipo: "lista",
          items: [
            "Un cliente registrado (o créalo con la creación rápida).",
            "Productos con saldo suficiente en alguna ubicación.",
            "Si el producto tiene lotes, stock disponible en ellos (no vencido para despacho a cliente).",
          ],
        },
      ],
    },
    {
      titulo: "Pasos",
      bloques: [
        {
          tipo: "pasos",
          pasos: [
            "Entra a /movimientos/nuevo y elige el tipo Salida y el sub-tipo Cliente.",
            "Completa los datos generales: documento de referencia (ej. guía), cliente, fecha del movimiento y notas.",
            "Agrega una línea por producto con la cantidad a despachar.",
            "Usa «Sugerir FIFO/FEFO» para que el sistema proponga las líneas con los lotes y ubicaciones según la política de rotación.",
            "Revisa las líneas propuestas y ajústalas si necesitas otro lote con saldo.",
            "Pulsa «Crear movimiento» y luego «Enviar a aprobación» o «Aprobar».",
            "Al aprobarse, el saldo de las ubicaciones origen se decrementa de forma atómica.",
          ],
        },
      ],
    },
    {
      titulo: "Qué ocurre en el sistema",
      bloques: [
        {
          tipo: "lista",
          items: [
            "La salida decrementa el saldo de las ubicaciones origen y de los lotes indicados.",
            "La política FEFO sale primero el lote que vence antes; la FIFO, el de entrada más antigua.",
            "Queda trazado qué unidad salió de qué ubicación y lote: puedes reconstruir el origen de lo despachado.",
            "El Dashboard y los reportes de salidas reflejan el despacho.",
          ],
        },
      ],
    },
    {
      titulo: "Reglas y advertencias",
      bloques: [
        {
          tipo: "nota",
          tono: "warning",
          texto:
            "El saldo nunca queda negativo: si la cantidad pedida supera lo disponible, el sistema lo rechaza e indica dónde hay stock.",
        },
        {
          tipo: "nota",
          tono: "warning",
          texto:
            "Un lote vencido no puede salir como despacho a cliente. Para retirarlo, usa una salida por merma o un ajuste negativo.",
        },
        {
          tipo: "nota",
          tono: "success",
          texto:
            "Usa la sugerencia FIFO/FEFO siempre que puedas: respeta la rotación y reduce el riesgo de quedarte con lotes viejos o vencidos.",
        },
      ],
    },
  ],
};

const MODULO_PROCESO_TRASLADO: AyudaModulo = {
  id: "proceso-traslado",
  titulo: "Proceso: traslado interno",
  icono: "traslado",
  resumen: "Cómo mover mercancía entre ubicaciones sin alterar el total del almacén.",
  paraQueSirve:
    "Documenta cómo mover stock de una ubicación a otra (por ejemplo, de recepción a picking) manteniendo el total del almacén intacto y dejando el movimiento trazado.",
  cuandoUsarlo:
    "Cuando reorganizas el almacén, mueves mercancía a zonas de expedición o picking, o necesitas liberar una ubicación.",
  terminosClave: ["traslado", "saldo", "movimiento", "ubicacion-bin", "aprobado"],
  relacionados: ["movimientos", "ubicaciones", "almacenes"],
  secciones: [
    {
      titulo: "Qué necesitas antes de empezar",
      bloques: [
        {
          tipo: "lista",
          items: [
            "Ubicación de origen con saldo suficiente.",
            "Ubicación de destino activa y con capacidad.",
            "Producto (y lote si controla lote) que vas a mover.",
          ],
        },
      ],
    },
    {
      titulo: "Pasos",
      bloques: [
        {
          tipo: "pasos",
          pasos: [
            "Entra a /movimientos/nuevo y elige el tipo Traslado.",
            "Selecciona el producto (y el lote si corresponde), la cantidad y las ubicaciones de origen y destino.",
            "El origen y el destino no pueden ser la misma ubicación.",
            "Pulsa «Crear traslado»: te lleva al detalle del movimiento generado.",
            "Aprueba el movimiento para que el stock se mueva de origen a destino de forma atómica.",
          ],
        },
      ],
    },
    {
      titulo: "Qué ocurre en el sistema",
      bloques: [
        {
          tipo: "lista",
          items: [
            "Se ejecuta una salida en origen y una entrada en destino en un solo hecho atómico.",
            "El total del almacén no cambia: solo cambia dónde vive el stock.",
            "Queda trazado el movimiento: puedes reconstruir dónde estuvo la mercancía.",
            "Si origen y destino están en almacenes distintos, se generan dos movimientos ligados (traslado de salida y de entrada).",
          ],
        },
      ],
    },
    {
      titulo: "Reglas y advertencias",
      bloques: [
        {
          tipo: "nota",
          tono: "warning",
          texto:
            "El origen debe tener saldo suficiente para la cantidad trasladada; si no, el sistema lo rechaza.",
        },
        {
          tipo: "nota",
          tono: "warning",
          texto:
            "Si la ubicación destino tiene capacidad máxima, el traslado se bloquea si la supera.",
        },
        {
          tipo: "nota",
          tono: "success",
          texto:
            "Los traslados son la forma correcta de reorganizar stock: nunca muevas saldos «a mano».",
        },
      ],
    },
  ],
};

const MODULO_PROCESO_INVENTARIO: AyudaModulo = {
  id: "proceso-inventario",
  titulo: "Proceso: inventario físico",
  icono: "inventario",
  resumen: "Cómo planear, contar y cerrar una sesión de inventario completa o cíclica.",
  paraQueSirve:
    "Documenta el ciclo completo del inventario físico: crear la sesión, registrar los conteos, revisar las diferencias y cerrar para que el sistema ajuste los saldos y mida tu precisión.",
  cuandoUsarlo:
    "De forma periódica (cíclico por zona o categoría), en cierres de ejercicio (completo) o cuando sospeches diferencias entre lo registrado y lo físico.",
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
      titulo: "Qué necesitas antes de empezar",
      bloques: [
        {
          tipo: "lista",
          items: [
            "Un almacén definido y con stock registrado.",
            "Decidir el alcance: completo (todo el almacén) o cíclico (un subconjunto: zona, categoría…).",
            "Personal para contar y, si aplica, configurar conteo ciego y doble conteo.",
          ],
        },
      ],
    },
    {
      titulo: "Pasos",
      bloques: [
        {
          tipo: "pasos",
          pasos: [
            "Entra a /inventario/nuevo y crea la sesión: tipo, almacén, alcance, fecha de inicio, conteo ciego y doble conteo.",
            "Con la sesión En curso, entra a /inventario/:id/conteos y registra cada línea: ubicación, producto, lote, cantidad contada y número de conteo.",
            "Si está activo el doble conteo, registra el segundo conteo de las líneas con diferencia.",
            "Revisa el detalle de la sesión: conteos y diferencias (conciliado, sobrante, faltante).",
            "Pulsa «Cerrar sesión» desde el detalle.",
            "En la página de confirmación revisa las diferencias y los ajustes que se generarán.",
            "Confirma el cierre: la sesión pasa a Cerrada y se generan los ajustes de stock automáticos.",
          ],
        },
      ],
    },
    {
      titulo: "Qué ocurre en el sistema",
      bloques: [
        {
          tipo: "lista",
          items: [
            "Cada diferencia conciliada se convierte en un ajuste (entrada por sobrante, salida por faltante) ligado a la sesión.",
            "La sesión muestra su precisión por SKU, por cantidad y por ubicación.",
            "El reporte de precisión registra la evolución histórica de tus conteos.",
            "Las diferencias de inventario generan alertas mientras estén sin resolver.",
          ],
        },
      ],
    },
    {
      titulo: "Reglas y advertencias",
      bloques: [
        {
          tipo: "nota",
          tono: "warning",
          texto:
            "Mientras la sesión está En curso, los ajustes manuales sobre ese almacén quedan bloqueados: resuelve las diferencias a través de la sesión.",
        },
        {
          tipo: "nota",
          tono: "warning",
          texto:
            "Con el conteo ciego activo no se muestra el saldo del sistema durante la captura: cuenta de verdad, sin sesgo.",
        },
        {
          tipo: "nota",
          tono: "success",
          texto:
            "La cantidad contada puede ser 0 (producto ausente). Eso genera el faltante correspondiente y se regulariza al cerrar.",
        },
      ],
    },
  ],
};

const MODULO_PROCESO_DEVOLUCION: AyudaModulo = {
  id: "proceso-devolucion",
  titulo: "Proceso: devolución de un cliente",
  icono: "entrada",
  resumen: "Cómo registrar mercancía que regresa de un cliente, paso a paso.",
  paraQueSirve:
    "Documenta el flujo de una devolución de cliente: recibir la mercancía como entrada hacia una ubicación de devoluciones, listarla para inspección y decidir si vuelve a stock o se da de baja.",
  cuandoUsarlo:
    "Cada vez que un cliente devuelve mercancía: por error, por defecto, por rechazo o por cambios.",
  terminosClave: ["entrada", "saldo", "lote", "movimiento", "cliente", "merma"],
  relacionados: ["movimientos", "clientes", "ubicaciones", "proceso-merma"],
  secciones: [
    {
      titulo: "Qué necesitas antes de empezar",
      bloques: [
        {
          tipo: "lista",
          items: [
            "Un cliente registrado.",
            "Una ubicación de tipo Devolución donde recibir la mercancía.",
            "Los productos devueltos en el catálogo (y los lotes si controlan lote).",
          ],
        },
      ],
    },
    {
      titulo: "Pasos",
      bloques: [
        {
          tipo: "pasos",
          pasos: [
            "Entra a /movimientos/nuevo y elige el tipo Entrada y el sub-tipo Devolución de cliente.",
            "Selecciona el cliente y completa el documento de referencia y las notas.",
            "Agrega las líneas: producto, lote si corresponde, cantidad y la ubicación de devoluciones como destino.",
            "Pulsa «Crear movimiento» y aprueba para que el stock suba en la ubicación de devoluciones.",
            "Inspecciona la mercancía: si está dañada o vencida, dala de baja por merma en lugar de dejarla en stock.",
          ],
        },
      ],
    },
    {
      titulo: "Qué ocurre en el sistema",
      bloques: [
        {
          tipo: "lista",
          items: [
            "La devolución incrementa el saldo en la ubicación de devoluciones.",
            "Es un hecho independiente de la salida original: no se reabre el movimiento de despacho.",
            "Si el producto controla lote, se registra el lote de origen o se crea uno con la fecha informada.",
          ],
        },
      ],
    },
    {
      titulo: "Reglas y advertencias",
      bloques: [
        {
          tipo: "nota",
          tono: "warning",
          texto:
            "Si el producto devuelto está dañado, no lo dejes en stock general: dálo de baja por merma (exige motivo) para no contaminar tu saldo disponible.",
        },
        {
          tipo: "nota",
          tono: "success",
          texto:
            "Usa siempre una ubicación de tipo Devolución para recibir: separa lo que vuelve del stock vendible hasta que decidas qué hacer con ello.",
        },
      ],
    },
  ],
};

const MODULO_PROCESO_MERMA: AyudaModulo = {
  id: "proceso-merma",
  titulo: "Proceso: baja por merma",
  icono: "alerta",
  resumen: "Cómo dar de baja mercancía perdida o dañada, con motivo obligatorio.",
  paraQueSirve:
    "Documenta cómo retirar del stock la mercancía perdida, dañada o vencida mediante una salida por merma, dejando la pérdida trazada y reflejada en la tasa de merma.",
  cuandoUsarlo:
    "Cuando detectas producto dañado, vencido, robado o perdido en cualquier ubicación. También es la única vía para sacar lotes vencidos del stock.",
  terminosClave: ["merma", "salida", "lote", "saldo", "movimiento", "vencimiento"],
  relacionados: ["movimientos", "lotes", "alertas", "reportes"],
  secciones: [
    {
      titulo: "Qué necesitas antes de empezar",
      bloques: [
        {
          tipo: "lista",
          items: [
            "Identificar la ubicación y el producto (y lote si controla lote) con el saldo a dar de baja.",
            "El motivo real de la merma: daño, humedad, vencimiento, robo, etc.",
          ],
        },
      ],
    },
    {
      titulo: "Pasos",
      bloques: [
        {
          tipo: "pasos",
          pasos: [
            "Entra a /movimientos/nuevo y elige el tipo Salida y el sub-tipo Merma.",
            "Escribe el motivo: es obligatorio y de al menos 3 caracteres.",
            "Agrega la línea: producto, lote si corresponde, cantidad y la ubicación de origen.",
            "Pulsa «Crear movimiento» y aprueba para que el stock se decremente.",
            "Opcional: agrega un comentario en el detalle del movimiento explicando la merma con más detalle.",
          ],
        },
      ],
    },
    {
      titulo: "Qué ocurre en el sistema",
      bloques: [
        {
          tipo: "lista",
          items: [
            "La merma decrementa el saldo de la ubicación y del lote afectado.",
            "Queda trazada con su motivo, autor y fecha: suma a la tasa de merma del Dashboard.",
            "Un lote vencido puede darse de baja por merma sin restricción.",
            "El reporte de mermas y ajustes permite analizar las pérdidas por motivo.",
          ],
        },
      ],
    },
    {
      titulo: "Reglas y advertencias",
      bloques: [
        {
          tipo: "nota",
          tono: "warning",
          texto:
            "El motivo es obligatorio y queda en el historial: registra la causa real, no un texto genérico.",
        },
        {
          tipo: "nota",
          tono: "warning",
          texto:
            "Si detectaste la merma durante un inventario, resuélvela a través de la sesión (faltante) en lugar de un ajuste manual mientras esté en curso.",
        },
        {
          tipo: "nota",
          tono: "success",
          texto:
            "Controla la tasa de merma desde el Dashboard: si sube, revisa el reporte de mermas para encontrar el patrón (por motivo, por ubicación, por producto).",
        },
      ],
    },
  ],
};

export const AYUDA_GRUPOS: AyudaGrupo[] = [
  {
    titulo: "Empezar",
    modulos: [MODULO_PRIMEROS_PASOS],
  },
  {
    titulo: "Procesos del negocio",
    modulos: [
      MODULO_PROCESO_RECEPCION,
      MODULO_PROCESO_DESPACHO,
      MODULO_PROCESO_TRASLADO,
      MODULO_PROCESO_INVENTARIO,
      MODULO_PROCESO_DEVOLUCION,
      MODULO_PROCESO_MERMA,
    ],
  },
  {
    titulo: "Operación",
    modulos: [MODULO_DASHBOARD, MODULO_MOVIMIENTOS, MODULO_INVENTARIO, MODULO_ALERTAS],
  },
  {
    titulo: "Catálogos",
    modulos: [
      MODULO_ALMACENES,
      MODULO_UBICACIONES,
      MODULO_PRODUCTOS,
      MODULO_LOTES,
      MODULO_CATEGORIAS,
      MODULO_UOMS,
      MODULO_PROVEEDORES,
      MODULO_CLIENTES,
    ],
  },
  {
    titulo: "Análisis",
    modulos: [MODULO_REPORTES, MODULO_HISTORIAL],
  },
  {
    titulo: "Administración",
    modulos: [MODULO_USUARIOS, MODULO_SUCURSALES, MODULO_CONFIGURACION, MODULO_PERFIL],
  },
  {
    titulo: "Sistema",
    modulos: [MODULO_INICIO_SESION],
  },
];

export const GLOSARIO: TerminoGlosario[] = [
  {
    id: "almacen",
    termino: "Almacén",
    definicion:
      "Entidad raíz del árbol físico. Toda la operación pertenece a exactamente un almacén; un almacén inactivo no admite movimientos nuevos.",
  },
  {
    id: "zona",
    termino: "Zona",
    definicion: "División lógica o física dentro de un almacén (ej. Frío, Picking, Recepción).",
  },
  {
    id: "rack",
    termino: "Rack",
    definicion: "Estructura de almacenamiento dentro de una zona (estantería, pallet, nevera…).",
  },
  {
    id: "seccion",
    termino: "Sección",
    definicion: "Subdivisión de un rack: niveles, pasillos o bahías.",
  },
  {
    id: "ubicacion-bin",
    termino: "Ubicación (bin)",
    definicion:
      "Punto direccionable donde vive el stock. Los saldos se registran por (ubicación, producto, lote). Cuelga de una zona, un rack o una sección.",
  },
  {
    id: "caja",
    termino: "Caja",
    definicion:
      "Contenedor físico opcional dentro de una ubicación. Puede estar restringida a un solo producto o lote.",
  },
  {
    id: "producto-sku",
    termino: "Producto / SKU",
    definicion:
      "Artículo gestionado. El SKU es el identificador canónico: único, normalizado a mayúsculas e inmutable una vez creado.",
  },
  {
    id: "categoria",
    termino: "Categoría",
    definicion: "Clasificación opcional de productos, organizable en jerarquía de árbol.",
  },
  {
    id: "uom",
    termino: "UOM (unidad de medida)",
    definicion:
      "Unidad en que se mide un producto. La base es la unidad más pequeña de su familia; las demás se expresan como factor de conversión.",
  },
  {
    id: "uom-base",
    termino: "UOM base",
    definicion:
      "Unidad de medida más pequeña gestionable de un producto. Todas las cantidades se almacenan internamente en la UOM base.",
  },
  {
    id: "proveedor",
    termino: "Proveedor",
    definicion: "Entidad de la que se recibe mercancía; las entradas de compra lo referencian.",
  },
  {
    id: "cliente",
    termino: "Cliente",
    definicion: "Entidad que recibe mercancía; los despachos a cliente lo referencian.",
  },
  {
    id: "lote",
    termino: "Lote",
    definicion:
      "Conjunto de unidades de un producto con origen y fechas comunes. Obligatorio en todo movimiento de un producto que controla lote.",
  },
  {
    id: "vencimiento",
    termino: "Vencimiento",
    definicion:
      "Fecha límite de consumo de un lote. Obligatoria en productos con control de vencimiento; un lote vencido no puede salir a cliente.",
  },
  {
    id: "trazabilidad",
    termino: "Trazabilidad",
    definicion:
      "Capacidad de reconstruir la historia completa de un producto, lote o ubicación: de dónde vino cada unidad, quién la movió y cuándo.",
  },
  {
    id: "fefo",
    termino: "FEFO",
    definicion:
      "Política de salida «primero en vencer, primero en salir»: en un despacho salen primero los lotes con fecha de vencimiento menor. Se aplica a productos perecederos o con control de vencimiento.",
  },
  {
    id: "fifo",
    termino: "FIFO",
    definicion:
      "Política de salida «primero en entrar, primero en salir»: salen primero los lotes con fabricación o entrada más antigua. Se aplica a productos con lote que no controlan vencimiento.",
  },
  {
    id: "saldo",
    termino: "Saldo",
    definicion:
      "Cantidad de stock de un producto en un punto concreto. Es derivado: suma de los movimientos aprobados, nunca se edita a mano.",
  },
  {
    id: "stock-minimo",
    termino: "Stock mínimo",
    definicion: "Cantidad por debajo de la cual se dispara la alerta de stock bajo.",
  },
  {
    id: "stock-maximo",
    termino: "Stock máximo",
    definicion:
      "Cantidad objetivo que no se debe exceder; superarla dispara la alerta de stock excedido.",
  },
  {
    id: "capacidad-maxima",
    termino: "Capacidad máxima",
    definicion:
      "Cantidad máxima de unidades que admite una ubicación; excederla bloquea la entrada.",
  },
  {
    id: "codigo-barras",
    termino: "Código de barras",
    definicion:
      "Identificador opcional del producto que se lee con escáner para resolver el producto al instante en formularios y búsquedas. Debe ser único si existe.",
  },
  {
    id: "movimiento",
    termino: "Movimiento",
    definicion:
      "Registro inmutable de una alteración de stock, con tipo, sub-tipo, estado, líneas, motivo y autor. Es la única forma de cambiar el stock.",
  },
  {
    id: "entrada",
    termino: "Entrada",
    definicion: "Movimiento que incrementa el saldo en la ubicación destino.",
  },
  {
    id: "salida",
    termino: "Salida",
    definicion: "Movimiento que decrementa el saldo en la ubicación origen.",
  },
  {
    id: "traslado",
    termino: "Traslado",
    definicion: "Movimiento que mueve stock de una ubicación a otra sin alterar el total.",
  },
  {
    id: "ajuste",
    termino: "Ajuste",
    definicion:
      "Movimiento de corrección del saldo (positivo o negativo) que siempre exige motivo.",
  },
  {
    id: "merma",
    termino: "Merma",
    definicion:
      "Salida por pérdida o daño de mercancía. Exige motivo; un lote vencido solo puede salir como merma o ajuste.",
  },
  {
    id: "borrador",
    termino: "Borrador",
    definicion: "Estado inicial de un movimiento: sin efecto sobre el stock y editable.",
  },
  {
    id: "pendiente-aprobacion",
    termino: "Pendiente de aprobación",
    definicion: "Movimiento enviado a aprobación: sin efecto sobre el stock.",
  },
  {
    id: "aprobado",
    termino: "Aprobado",
    definicion:
      "Único estado que altera el saldo: al aprobarse, las líneas se ejecutan de forma atómica.",
  },
  {
    id: "anulado",
    termino: "Anulado",
    definicion:
      "Movimiento cancelado. Si había afectado el stock, la anulación generó un movimiento inverso; el historial original se conserva.",
  },
  {
    id: "movimiento-inverso",
    termino: "Movimiento inverso",
    definicion:
      "Movimiento generado automáticamente al anular uno aprobado: revierte el efecto sobre el stock en sentido contrario.",
  },
  {
    id: "sesion-inventario",
    termino: "Sesión de inventario",
    definicion: "Proceso formal de conteo de todo o parte de un almacén, con estados y cierre.",
  },
  {
    id: "conteo-ciego",
    termino: "Conteo ciego",
    definicion:
      "Configuración de la sesión para que el contador no vea el saldo del sistema durante la captura.",
  },
  {
    id: "doble-conteo",
    termino: "Doble conteo",
    definicion:
      "Configuración de la sesión que exige un segundo conteo para aceptar una diferencia.",
  },
  {
    id: "diferencia-inventario",
    termino: "Diferencia de inventario",
    definicion:
      "Resultado de comparar lo contado contra el saldo del sistema: conciliado (igual), sobrante (más en físico) o faltante (menos en físico).",
  },
  {
    id: "precision-inventario",
    termino: "Precisión de inventario",
    definicion:
      "Porcentaje de coincidencia entre lo registrado y lo físico, medida por SKU, por cantidad y por ubicación en cada sesión cerrada.",
  },
  {
    id: "alerta",
    termino: "Alerta",
    definicion:
      "Aviso automático sobre el estado del almacén (stock bajo, vencimientos, pendientes) con severidad y estado.",
  },
  {
    id: "auditoria",
    termino: "Auditoría",
    definicion: "Registro inmutable de quién hizo qué, cuándo y con qué resultado.",
  },
  {
    id: "rol",
    termino: "Rol",
    definicion:
      "Perfil que define qué puede hacer un usuario en el sistema (Administrador, Gerente, Encargado de almacén, Operador o Lector).",
  },
  {
    id: "usuario",
    termino: "Usuario",
    definicion:
      "Cuenta de acceso de una persona que opera Rustock, con nombre de usuario, contraseña y un rol asignado. Todo movimiento queda atribuido a su autor.",
  },
  {
    id: "permiso",
    termino: "Permiso",
    definicion:
      "Acción concreta protegida en el sistema, con formato «recurso:acción» (ej. movimiento:aprobar). Los roles otorgan o deniegan permisos.",
  },
  {
    id: "kardex",
    termino: "Kardex",
    definicion:
      "Tarjeta de stock de un producto: su historial de movimientos con entrada, salida y saldo acumulado.",
  },
  {
    id: "desactivar",
    termino: "Desactivar (borrado lógico)",
    definicion:
      "Forma en que Rustock «elimina» una entidad con historial: el registro queda inactivo pero sus datos y movimientos se conservan.",
  },
  {
    id: "creacion-rapida",
    termino: "Creación rápida",
    definicion:
      "Acción de los formularios que permite crear un catálogo dependiente (producto, lote, ubicación, proveedor…) y volver al formulario con el registro recién creado seleccionado, conservando el borrador.",
  },
];
