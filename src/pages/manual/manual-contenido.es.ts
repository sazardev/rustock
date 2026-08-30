// oxlint-disable eslint/max-lines
/**
 * Contenido del Manual del Cliente, en castellano.
 *
 * El manual explica la lógica de negocio con la profundidad que pide un
 * operador nuevo. Se mantiene a mano; al cambiar una regla hay que actualizar
 * aquí el capítulo y su equivalente en inglés.
 */
import { PATH } from "../../app/route-paths";
import type { ManualParte, TerminoManual } from "./manual-tipos";

export const MANUAL_GLOSARIO_ES: TerminoManual[] = [
  {
    id: "almacen",
    termino: "Almacén",
    definicion:
      "Raíz del árbol físico: toda la operación pertenece a exactamente un almacén (ej. ALM-PRINCIPAL). Contiene zonas. Código único, activo/inactivo.",
  },
  {
    id: "zona",
    termino: "Zona",
    definicion:
      "División lógica o física dentro de un almacén (Frío, Picking, Recepción, Cuarentena). Pertenece a exactamente un almacén. Código único dentro del almacén.",
  },
  {
    id: "pasillo",
    termino: "Pasillo",
    definicion:
      "Subdivisión física de una zona que agrupa racks (pasillo transitable). Pertenece a exactamente una zona, código único dentro del almacén. Entidad organizativa: no forma parte del árbol simplificado, pero aplica matriz de colisiones (no puede tener racks/ubicaciones encima).",
  },
  {
    id: "rack",
    termino: "Rack / Estantería",
    definicion:
      "Estructura de almacenamiento dentro de una zona. Pertenece a exactamente una zona, opcionalmente a un pasillo de la misma zona. Código único dentro del almacén.",
  },
  {
    id: "seccion",
    termino: "Sección",
    definicion:
      "Subdivisión de un rack (niveles A/B/C, bahías). Pertenece a exactamente un rack. Código único dentro del almacén.",
  },
  {
    id: "ubicacion-bin",
    termino: "Ubicación (bin)",
    definicion:
      "Punto direccionable donde vive el stock. Pertenece a exactamente una zona, rack o sección (árbol simplificado). Tipos: STANDARD, PICKING, RESERVA, RECEPCION, CUARENTENA, DEVOLUCION, DANADO, EXPEDICION. Capacidad máxima opcional. Código único dentro del almacén.",
  },
  {
    id: "caja",
    termino: "Caja",
    definicion:
      "Contenedor físico opcional dentro de una ubicación que agrupa stock. Puede restringirse a un producto y/o lote. Mover la caja genera traslado.",
  },
  {
    id: "producto-sku",
    termino: "Producto / SKU",
    definicion:
      "Artículo gestionado. SKU canónico único, normalizado a mayúsculas sin espacios, inmutable tras creación. Requiere UOM base. Controles: controla_lote, controla_vencimiento, perecedero.",
  },
  {
    id: "categoria",
    termino: "Categoría",
    definicion:
      "Clasificación jerárquica opcional de productos en árbol con parent_id. Sin ciclos. Filtrable en reportes.",
  },
  {
    id: "uom",
    termino: "Unidad de medida (UOM)",
    definicion:
      "Unidad en que se mide un producto (PZA, KG, CAJA, M...). Tipos: UNIDAD, PESO, VOLUMEN, LONGITUD, SUPERFICIE. Factor ≥1 hacia la UOM base de su familia.",
  },
  {
    id: "uom-base",
    termino: "UOM base",
    definicion:
      "Unidad más pequeña gestionable de su familia. Todas las cantidades se almacenan y operan en UOM base. Un producto exige una UOM base inmutable.",
  },
  {
    id: "proveedor",
    termino: "Proveedor",
    definicion:
      "Origen de compras. Referenciado en entradas COMPRA y devoluciones a proveedor. Proveedor inactivo no se puede usar en entradas nuevas.",
  },
  {
    id: "cliente",
    termino: "Cliente",
    definicion: "Destino de despachos. Referenciado en salidas CLIENTE y devoluciones de cliente.",
  },
  {
    id: "lote",
    termino: "Lote",
    definicion:
      "Agrupación de unidades de un producto con origen y fechas comunes. Número único dentro del producto. Todo movimiento exige lote si el producto controla_lote.",
  },
  {
    id: "vencimiento",
    termino: "Vencimiento",
    definicion:
      "Fecha de caducidad del lote. Obligatoria si el producto controla_vencimiento. Vencido no sale a cliente/devolución proveedor; solo merma/ajuste negativo. Activa FEFO.",
  },
  {
    id: "trazabilidad",
    termino: "Trazabilidad",
    definicion:
      "Capacidad de reconstruir historia completa de producto, lote, ubicación, movimiento y caja (SPEC 13.4: 5 consultas tipo).",
  },
  {
    id: "fefo",
    termino: "FEFO",
    definicion:
      "First Expired, First Out: sale primero lo que vence primero. Activo si producto perecedero o controla_vencimiento.",
  },
  {
    id: "fifo",
    termino: "FIFO",
    definicion:
      "First In, First Out: sale primero lo que entró primero. Activo si producto controla_lote sin vencimiento.",
  },
  {
    id: "saldo",
    termino: "Saldo",
    definicion:
      "Cantidad de un producto (y lote si aplica) en una ubicación. Clave canónica (ubicación, producto, lote) → cantidad. Materializado, nunca negativo, derivado de movimientos aprobados.",
  },
  {
    id: "stock-minimo",
    termino: "Stock mínimo",
    definicion:
      "Umbral por producto (global) y default de empresa. Alerta stock bajo si suma ubicaciones ≤ mínimo.",
  },
  {
    id: "stock-maximo",
    termino: "Stock máximo",
    definicion:
      "Umbral objetivo por producto que no se debe exceder. Informativo; ubicación con capacidad_maxima bloquea entradas que la superen.",
  },
  {
    id: "capacidad-maxima",
    termino: "Capacidad máxima",
    definicion:
      "Tope de unidades (suma en UOM base) que admite una ubicación. Valida al aprobar entradas/traslados destino.",
  },
  {
    id: "codigo-barras",
    termino: "Código de barras",
    definicion:
      "Identificador opcional único por producto para lectura por escáner. Alimenta formularios; no crea datos solo.",
  },
  {
    id: "movimiento",
    termino: "Movimiento",
    definicion:
      "Única forma de alterar stock. Tipos: ENTRADA, SALIDA, TRASLADO, AJUSTE (y CONSUMO). Estados: BORRADOR, PENDIENTE_APROBACION, APROBADO (único que altera saldos), ANULADO (genera inverso). Campos: numero correlativo, tipo/sub_tipo, líneas, origen/destino, proveedor/cliente, documento_referencia, motivo, fechas, auditoría.",
  },
  {
    id: "entrada",
    termino: "Entrada",
    definicion:
      "Movimiento que incrementa stock. Sub-tipos: COMPRA, DEVOLUCION_CLIENTE, AJUSTE_POSITIVO, INICIAL, TRASLADO_ENTRADA.",
  },
  {
    id: "salida",
    termino: "Salida",
    definicion:
      "Movimiento que decrementa stock. Sub-tipos: CLIENTE, DEVOLUCION_PROVEEDOR, MERMA, AJUSTE_NEGATIVO, TRASLADO_SALIDA.",
  },
  {
    id: "traslado",
    termino: "Traslado",
    definicion:
      "Movimiento stock entre ubicaciones (intra-almacén atómico) o entre almacenes (dos movimientos ligados mismo documento_referencia, transaccional).",
  },
  {
    id: "ajuste",
    termino: "Ajuste",
    definicion:
      "Corrección de saldo con motivo obligatorio ≥3 chars. Positivo (sobrante) o negativo (faltante). Nunca automático. Negativo no deja saldo <0.",
  },
  {
    id: "merma",
    termino: "Merma",
    definicion:
      "Salida por pérdida (daño, caducidad, robo). Siempre requiere motivo. Único destino permitido para lotes vencidos con saldo.",
  },
  {
    id: "borrador",
    termino: "Borrador",
    definicion: "Estado inicial de movimiento: sin efecto sobre stock, editable solo por creador.",
  },
  {
    id: "pendiente-aprobacion",
    termino: "Pendiente de aprobación",
    definicion:
      "Movimiento enviado a aprobación: sin efecto sobre stock. Siguiente estado: APROBADO o ANULADO.",
  },
  {
    id: "aprobado",
    termino: "Aprobado",
    definicion:
      "Único estado que altera saldos. Inmutable y solo anulable (genera inverso). Ejecuta líneas atómicamente.",
  },
  {
    id: "anulado",
    termino: "Anulado",
    definicion:
      "Movimiento cancelado. Si había afectado stock, genera movimiento inverso ligado por movimiento_inverso_id. No se puede re-aprobar.",
  },
  {
    id: "movimiento-inverso",
    termino: "Movimiento inverso",
    definicion:
      "Movimiento generado al anular un APROBADO que revierte exactamente el efecto sobre saldos. Referencia mutua en ambos.",
  },
  {
    id: "sesion-inventario",
    termino: "Sesión de inventario",
    definicion:
      "Proceso formal de conteo. Tipos: COMPLETO (todo almacén/alcance) o CICLICO (subconjunto). Estados: PLANEADA→EN_CURSO→CERRADA/ANULADA. Campos: almacen_id, alcance, conteo_ciego, exige_doble_conteo.",
  },
  {
    id: "conteo-ciego",
    termino: "Conteo ciego",
    definicion:
      "Conteo sin mostrar saldo del sistema al contador (evita sesgo). Implementado: en /inventario/:id/conteos nunca se muestra saldo, ciego o no (garantía).",
  },
  {
    id: "doble-conteo",
    termino: "Doble conteo",
    definicion:
      "Exigencia de segundo conteo (conteo_numero 1°/2°) para aceptar diferencias. Si exige_doble_conteo=true, la diferencia solo se acepta si 2° confirma.",
  },
  {
    id: "diferencia-inventario",
    termino: "Diferencia de inventario",
    definicion:
      "Desvío contado vs sistema. 0=conciliado, >0=sobrante→entrada ajuste, <0=faltante→salida ajuste. Persistida al cerrar en sesion_diferencias (snapshot histórico).",
  },
  {
    id: "precision-inventario",
    termino: "Precisión de inventario",
    definicion:
      "Métricas por sesión: por SKU (SKUs exactos/contados×100), por cantidad (unidades correctas/contadas×100), exactitud por ubicación (ubicaciones sin diferencia/contadas×100). Objetivos ≥95/98/90.",
  },
  {
    id: "alerta",
    termino: "Alerta",
    definicion:
      "Aviso derivado de reglas: stock bajo, excedido, sobrecapacidad, por vencer, vencido, diferencia inventario, pendiente aprobación. Severidad INFO/MEDIA/ALTA. Estados ABIERTA/RESUELTA/IGNORADA(archivada). Solo visible con permiso ver sobre entidad. Regeneración perezosa en cada listar.",
  },
  {
    id: "auditoria",
    termino: "Auditoría",
    definicion:
      "Evento inmutable por operación: usuario_id, accion, entidad/entidad_id, antes/despues, timestamp UTC, ip/origen, modulo/proceso/tenant, tipo_evento COMANDO/VISTA, ruta, metadatos JSON. Historia completa filtrable.",
  },
  {
    id: "rol",
    termino: "Rol",
    definicion:
      "ADMIN (todo), GERENTE (todo salvo usuarios/config), ENCARGADO_ALMACEN (movimientos+inventario), OPERADOR (crea movimientos+conteos), LECTOR (solo lectura). Un rol por usuario (v1). Matriz SPEC 4.4.",
  },
  {
    id: "usuario",
    termino: "Usuario",
    definicion:
      "Cuenta con nombre_usuario único, nombre_completo, email opcional único, rol_id, activo, password_hash argon2. Bootstrap primer ADMIN. Inactivo no se autentica.",
  },
  {
    id: "permiso",
    termino: "Permiso",
    definicion:
      "Regla recurso:accion que protege cada operación. Formato recurso:accion (ej. producto:ver, movimiento:aprobar). Ver es mínimo para aparecer en listados. Exportar independiente. Anular/aprobar distintos de crear.",
  },
  {
    id: "kardex",
    termino: "Kardex",
    definicion:
      "Tarjeta de stock por producto/lote: movimientos cronológicos con saldo acumulado. Reporte /reportes/kardex.",
  },
  {
    id: "desactivar",
    termino: "Desactivar (borrado lógico)",
    definicion:
      "En vez de borrar físico, se pone activo=false. Historia y movimientos se conservan. Solo entidades sin historia permiten borrado físico. No se puede desactivar ubicación con saldo o pasillo con stock descendiente.",
  },
  {
    id: "creacion-rapida",
    termino: "Creación rápida",
    definicion:
      "Crear una entidad relacionada sin salir del formulario principal (ej. crear producto desde movimiento). Al volver queda seleccionado; el borrador se preserva.",
  },
  {
    id: "mapa-3d",
    termino: "Mapa 3D",
    definicion:
      "Editor inmersivo fullscreen del almacén (three.js): prismas por tipo, selección múltiple, duplicar, caminar WASD, alambre, HUD coords. Misma validación física que 2D.",
  },
  {
    id: "importar",
    termino: "Importar",
    definicion:
      "Carga masiva de catálogos (productos, ubicaciones...) vía CSV en /configuracion/importar. Valida y reporta ResultadoImportacion con filas OK/errores por línea.",
  },
  {
    id: "sucursal",
    termino: "Sucursal",
    definicion:
      "Punto de operación de la empresa (entidad propia, no SPEC base). Campos: código único, nombre, dirección, coordenadas, país/ciudad, contacto. Configuración.",
  },
  {
    id: "consulta-universal",
    termino: "Consulta universal",
    definicion:
      "Principio SPEC 15: todo listado es filtrable (13 operadores), ordenable, buscable, paginable, seleccionable, agregable y exportable, con filtros combinables y deep-link en URL.",
  },
];

export const MANUAL_PARTES_ES: ManualParte[] = [
  {
    titulo: "Parte 0 — Primeros pasos",
    descripcion: "Instalación, acceso, roles y personalización.",
    capitulos: [
      {
        id: "m00-vision",
        titulo: "Visión y principios de Rustock",
        icono: "ayuda",
        resumen: "Qué es Rustock, qué resuelve y qué principios no se negocian.",
        paraQueSirve:
          "Entender por qué Rustock existe y cómo piensa tu inventario: precisión, trazabilidad y auditabilidad total.",
        cuandoUsarlo: "El primer día con el sistema, para alinear a tu equipo en cómo se trabaja.",
        terminosClave: ["trazabilidad", "saldo", "movimiento", "auditoria"],
        relacionados: ["m00-roles", "m08-checklist"],
        secciones: [
          {
            titulo: "Qué es Rustock",
            bloques: [
              {
                tipo: "texto",
                texto:
                  "Rustock es un mini-WMS self-hosted, todo incluido, para que una persona o una operación pequeña gestione qué hay almacenado, dónde está, cuánto hay, quién lo mueve, cuándo y por qué ocurrió, y la historia completa. Corre completo en tu infraestructura, sin servicios externos ni licencias.",
              },
              {
                tipo: "lista",
                items: [
                  "Qué: productos, lotes, cantidades (UOM base).",
                  "Dónde: almacén → zona → rack → sección → ubicación → caja.",
                  "Cuánto: saldos materializados, mínimos/máximos, capacidad.",
                  "Quién: usuarios, 5 roles, permisos granulares recurso:accion.",
                  "Cuándo: fecha_movimiento del hecho + created_at/approved_at + zona horaria.",
                  "Por qué: tipo/sub_tipo, motivo ≥3, comentarios y documento_referencia.",
                  "Historial: trazabilidad inmutable por movimientos aprobados.",
                ],
              },
              {
                tipo: "nota",
                texto:
                  "Si algo altera stock y no pasa por un movimiento, está fuera del modelo. Esa es la garantía de auditabilidad.",
                tono: "info",
              },
            ],
          },
          {
            titulo: "Objetivos del dominio",
            bloques: [
              {
                tipo: "tabla",
                cabeceras: ["Objetivo", "Cómo se mide"],
                filas: [
                  [
                    "Precisión",
                    "SKUs exactos / contados ×100, por cantidad y por ubicación (11.6).",
                  ],
                  [
                    "Trazabilidad total",
                    "Todo cambio tiene movimiento único fechado con autor y motivo.",
                  ],
                  ["Auditabilidad", "Eventos inmutables quién/qué/cuándo/dónde; nada se borra."],
                  [
                    "Búsqueda universal",
                    "Todo listado filtrable/ordenable/buscable/paginable (15).",
                  ],
                  [
                    "Control por roles",
                    "Nadie hace lo que su rol no permite; sensible exige permiso explícito.",
                  ],
                ],
              },
            ],
          },
          {
            titulo: "Principios rectores",
            bloques: [
              {
                tipo: "lista",
                items: [
                  "Un movimiento, un hecho: ninguna alteración de stock a mano; siempre por el modelo de movimientos (6).",
                  "El saldo es derivado: suma de movimientos aprobados; nunca cifra mágica sin respaldo (5.2).",
                  "Nada se destruye: desactivar/anular nunca borra físicamente con historia (14.5).",
                  "Todo consultable: sin filtros/orden/búsqueda/paginación no existe el endpoint (15.1).",
                ],
              },
              {
                tipo: "nota",
                texto:
                  'El saldo negativo está prohibido por invariante global. Cualquier operación que lo intente es rechazada con mensaje exacto: "Saldo insuficiente en RACK-A1-N2-P3: 5 disponibles, se intentaron 8".',
                tono: "warning",
              },
            ],
          },
        ],
      },
      {
        id: "m00-instalacion",
        titulo: "Instalación y puesta en marcha",
        icono: "configuracion",
        resumen: "Requisitos, modos de arranque, primera cuenta admin y datos de ejemplo.",
        paraQueSirve:
          "Levantar Rustock en minutos tanto en escritorio (Tauri) como en navegador (modo web sin ventana).",
        cuandoUsarlo: "Instalación inicial o cuando quieras una base temporal para pruebas.",
        terminosClave: ["usuario", "rol"],
        relacionados: ["m00-vision", "m00-roles"],
        secciones: [
          {
            titulo: "Requisitos",
            bloques: [
              {
                tipo: "lista",
                items: [
                  "Linux con Tauri v2 (WebKitGTK) para modo escritorio, o cualquier navegador para modo web.",
                  "Node 26 + Rust 1.96 (edition 2024) si compilas desde fuente.",
                  "Puertos por defecto: Vite 6821 (frontend) y backend 1421 (HTTP local, configurable).",
                ],
              },
              {
                tipo: "tabla",
                cabeceras: ["Modo", "Comando", "Cuándo usarlo"],
                filas: [
                  ["Escritorio", "npm run tauri dev", "Operación normal con ventana nativa."],
                  [
                    "Web sin ventana (WSL/SSH/CI)",
                    "npm run tauri:web  (RUSTOCK_WEB_ONLY=1)",
                    "Entornos sin X/Wayland: solo SQLite + HTTP 127.0.0.1:1421 sin GTK.",
                  ],
                  [
                    "Script unificado",
                    "./scripts/dev.sh --seed  o  npm run dev:web -- --seed",
                    "Limpia puertos 6821/1421, prepara DB y delega a web.mjs (recomendado día a día).",
                  ],
                ],
              },
            ],
          },
          {
            titulo: "Opciones de dev.sh",
            bloques: [
              {
                tipo: "tabla",
                cabeceras: ["Flag", "Efecto"],
                filas: [
                  [
                    "--seed",
                    "Siembra datos de ejemplo si la base está vacía (RUSTOCK_SEED=1, solo debug).",
                  ],
                  [
                    "--reset",
                    "Respalda rustock.db a .backup-<timestamp> y la borra, luego siembra.",
                  ],
                  [
                    "--tmpdb",
                    "Usa /tmp/opencode/rustock-dev.db (no toca la real). Combinable con --seed.",
                  ],
                  ["--stop", "Mata instancias en 6821/1421 sin levantar nada."],
                  ["--help", "Imprime uso."],
                ],
              },
              {
                tipo: "nota",
                texto:
                  "Variables respetadas: RUSTOCK_SEED, RUSTOCK_WEB_ONLY, RUSTOCK_DB_PATH, RUSTOCK_HTTP_PORT (backend) y VITE_RUSTOCK_API (frontend, ej. http://127.0.0.1:1421/api). DB por defecto: ~/.local/share/com.rustock.app/rustock.db (respeta XDG_DATA_HOME).",
                tono: "info",
              },
            ],
          },
          {
            titulo: "Primer arranque: crear el primer administrador",
            bloques: [
              {
                tipo: "pasos",
                pasos: [
                  "Abre la app. Si no hay usuarios, verás /configurar-administrador.",
                  "Completa nombre_usuario (único), nombre_completo, password (hash argon2 en Rust, nunca sale al frontend) y opcional email único.",
                  "Pulsa Crear administrador: el sistema hace bootstrap_admin sin sesión (único camino sin autenticación).",
                  "Serás redirigido a /login: inicia sesión con ese usuario.",
                ],
              },
              {
                tipo: "nota",
                texto:
                  "Sin al menos un almacén no podrás operar movimientos. Tras el login, crea tu almacén antes de cualquier otra cosa.",
                tono: "warning",
              },
            ],
          },
          {
            titulo: "Datos de ejemplo (seed)",
            bloques: [
              {
                tipo: "texto",
                texto:
                  "Con RUSTOCK_SEED=1 el sistema (solo debug) puebla una operación realista sin romper reglas de negocio (usa repo::* — nunca INSERT directo):",
              },
              {
                tipo: "lista",
                items: [
                  "Admin admin / Admin1234!, 3 UOMs, 2 categorías, 1 proveedor, 1 cliente.",
                  "Árbol físico: 1 almacén → 3 zonas → 1 rack → 2 secciones → 4 ubicaciones (mix de árbol simplificado y estricto).",
                  "4 productos (simple, stock bajo, con lote, con lote+vencimiento y lotes por vencer/vencido), movimientos aprobados (entrada compra multi-lote, 2 salidas, traslado, ajuste) + comentario + 1 pendiente de aprobación, 2 sesiones (1 cerrada con diferencias, 1 en curso ciega).",
                  "Idempotente: si ya hay almacenes no hace nada; seguro dejar la variable entre reinicios.",
                ],
              },
              {
                tipo: "enlaces",
                items: [
                  { etiqueta: "Ir a Configuración (tras el login)", href: PATH.configuracion },
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
                  { etiqueta: "Iniciar sesión", href: PATH.login },
                  { etiqueta: "Crear primer administrador", href: PATH.configurarAdministrador },
                  { etiqueta: "Dashboard (tras login)", href: PATH.dashboard },
                ],
              },
            ],
          },
        ],
      },
      {
        id: "m00-roles",
        titulo: "Usuarios, roles y permisos",
        icono: "rol",
        resumen:
          "5 roles por defecto, permisos recurso:accion y matriz de acceso. Quién puede hacer qué.",
        paraQueSirve:
          "Evitar que alguien haga lo que no le corresponde. Las acciones sensibles exigen permiso explícito y quedan auditadas.",
        cuandoUsarlo:
          "Al dar de alta a tu equipo y cada vez que asignes responsabilidades de aprobar/anular/cerrar.",
        terminosClave: ["usuario", "rol", "permiso", "auditoria", "desactivar"],
        relacionados: ["m00-vision", "m06-historial", "m08-transversales"],
        secciones: [
          {
            titulo: "Usuario: atributos y reglas",
            bloques: [
              {
                tipo: "tabla",
                cabeceras: ["Campo", "Regla"],
                filas: [
                  ["nombre_usuario", "Único, identifica el login. Inmutable tras crear (14.7)."],
                  ["nombre_completo", "Requerido, legible."],
                  ["email", "Opcional, único si existe."],
                  [
                    "password_hash",
                    "Argon2 en Rust; nunca se serializa al frontend (skip_serializing).",
                  ],
                  ["rol_id", "Exactamente un rol (v1). Multi-rol es extensión futura (20)."],
                  ["activo", "Default true. Inactivo no se autentica ni opera."],
                  ["ultimo_acceso_at", "Se actualiza al login."],
                  ["created_at / updated_at", "Automáticos, UTC."],
                  ["created_by / updated_by", "Obligatorios en todas las entidades gestionables."],
                ],
              },
              {
                tipo: "lista",
                items: [
                  "Todo movimiento o modificación se atribuye a un usuario activo.",
                  "Primer usuario es ADMIN bootstrap con todos los permisos (único sin sesión).",
                  "Un usuario inactivo no puede autenticarse ni realizar acciones.",
                ],
              },
            ],
          },
          {
            titulo: "Roles por defecto (no eliminables)",
            bloques: [
              {
                tipo: "tabla",
                cabeceras: ["Rol", "Descripción"],
                filas: [
                  [
                    "ADMIN",
                    "Control total: configuración, usuarios, catálogos, movimientos, inventario, reportes.",
                  ],
                  [
                    "GERENTE",
                    "Ve todo, crea y valida movimientos, gestiona catálogos; no gestiona usuarios ni permisos.",
                  ],
                  [
                    "ENCARGADO_ALMACEN",
                    "Gestiona movimientos (entradas/salidas/traslados/ajustes) y ejecuta inventario.",
                  ],
                  [
                    "OPERADOR",
                    "Registra movimientos entrada/salida/traslado; no autoriza ajustes ni cierra inventario.",
                  ],
                  [
                    "LECTOR",
                    "Solo lectura: consultas, reportes, trazabilidad, sin capacidad de modificar nada.",
                  ],
                ],
              },
              {
                tipo: "nota",
                texto:
                  "Los roles por defecto existen al instalar y no pueden eliminarse (sí renombrarse con permiso ADMIN). Un usuario tiene exactamente un rol (v1).",
                tono: "info",
              },
            ],
          },
          {
            titulo: "Permisos granulares recurso:accion",
            bloques: [
              {
                tipo: "texto",
                texto:
                  "Cada permiso protege una acción concreta con formato recurso:accion. Ejemplo: producto:ver, movimiento:aprobar, inventario:cerrar.",
              },
              {
                tipo: "lista",
                items: [
                  "Recursos (23): almacen, zona, rack, seccion, ubicacion, caja, producto, categoria, uom, proveedor, cliente, lote, usuario, rol, movimiento, entrada, salida, traslado, ajuste, inventario, comentario, reporte, configuracion.",
                  "Acciones (11): ver, crear, editar, eliminar (borrado lógico), desactivar, aprobar, anular, exportar, ejecutar, cerrar, asignar.",
                ],
              },
              {
                tipo: "nota",
                texto:
                  "La acción ver es condición mínima para que un recurso aparezca en listados/detalles. Sin permiso 403 y se registra en auditoría. exportar se exige independiente (puedes leer sin poder exportar). anular y aprobar son permisos distintos a crear (operador crea, encargado aprueba).",
                tono: "warning",
              },
            ],
          },
          {
            titulo: "Matriz de permisos (13×5, valores por defecto)",
            bloques: [
              {
                tipo: "tabla",
                cabeceras: ["Permiso", "ADMIN", "GERENTE", "ENCARGADO", "OPERADOR", "LECTOR"],
                filas: [
                  ["Ver cualquier entidad", "Si", "Si", "Si", "Si", "Si"],
                  [
                    "Crear/editar catálogos (producto, proveedor, cliente, categoría, UOM)",
                    "Si",
                    "Si",
                    "Si",
                    "No",
                    "No",
                  ],
                  ["Crear movimientos (entrada/salida/traslado)", "Si", "Si", "Si", "Si", "No"],
                  ["Aprobar/validar movimientos", "Si", "Si", "Si", "No", "No"],
                  ["Crear ajustes de stock", "Si", "Si", "Si", "No", "No"],
                  ["Aprobar ajustes (si aplica doble control)", "Si", "Si", "No", "No", "No"],
                  [
                    "Ejecutar sesión de inventario / registrar conteos",
                    "Si",
                    "Si",
                    "Si",
                    "Si",
                    "No",
                  ],
                  ["Cerrar sesión de inventario", "Si", "Si", "No", "No", "No"],
                  ["Anular movimientos", "Si", "Si", "No", "No", "No"],
                  ["Comentar en cualquier entidad", "Si", "Si", "Si", "Si", "No"],
                  ["Gestionar usuarios y roles", "Si", "No", "No", "No", "No"],
                  ["Configuración del sistema", "Si", "No", "No", "No", "No"],
                  ["Exportar reportes", "Si", "Si", "Si", "Si", "No"],
                ],
              },
              {
                tipo: "nota",
                texto:
                  "Matriz es valor por defecto (SPEC 4.4); ADMIN puede ajustar permisos finos por rol en v2. Comando puedo(recurso,accion)→bool consulta la matriz sin auditar; hoy lo usa el toggle de aprobar de inmediato. El resto de la interfaz no se oculta por rol: la matriz se aplica en el backend, que rechaza con SIN_PERMISO.",
                tono: "info",
              },
            ],
          },
          {
            titulo: "Auditoría: quién hizo qué",
            bloques: [
              {
                tipo: "tabla",
                cabeceras: ["Campo auditoría", "Significado"],
                filas: [
                  ["usuario_id", "Quién."],
                  ["accion", "Qué (crear, editar, aprobar, anular, ejecutar, ver…)."],
                  ["entidad / entidad_id", "Sobre qué."],
                  ["antes / despues", "Estado previo/posterior si aplica (JSON diff)."],
                  ["timestamp", "Cuándo (UTC)."],
                  ["ip / origen", "Desde dónde (equipo/sesión)."],
                  [
                    "modulo / proceso / tenant / ruta",
                    "Clasificación automática del comando/vista (H25 tracking total).",
                  ],
                  ["tipo_evento", "COMANDO o VISTA (navegación página)."],
                ],
              },
              {
                tipo: "lista",
                items: [
                  "Eventos inmutables, no borrables por ningún rol.",
                  "Sin permiso → error 403 registrado en auditoría.",
                  "Macro con_auditoria! registra éxito/fallo con actor real de la sesión (SesionState).",
                ],
              },
            ],
          },
          {
            titulo: "Gestión de usuarios en la app",
            bloques: [
              {
                tipo: "lista",
                items: [
                  "Listado en /usuarios con filtro por estado y paginación; detalle muestra actividad reciente vía listar_historial con nombre resuelto.",
                  "Nuevo: /usuarios/nuevo; editar: /usuarios/:id/editar (nombre_usuario inmutable, SKU-style).",
                  "Eliminar: /usuarios/:id/eliminar desactiva (no borra) con protecciones: no autodesactivarse, no desactivar al último ADMIN activo, y tampoco quitarle el rol ADMIN por edición (error UltimoAdmin en ambos casos: el sistema no puede quedarse sin administración).",
                  "Cambiar password propia en /perfil (verifica actual, error PasswordActualIncorrecta) o reset por admin en /usuarios/:id/password.",
                  "Sesión única en memoria (un proceso, un usuario a la vez): login/logout/quien_soy. Sin sesión todo exige autenticación (puede resuelve a NoAutenticado).",
                ],
              },
              {
                tipo: "enlaces",
                items: [
                  { etiqueta: "Usuarios y roles", href: PATH.usuarios },
                  { etiqueta: "Mi perfil", href: PATH.perfil },
                ],
              },
            ],
          },
        ],
      },
      {
        id: "m00-personalizacion",
        titulo: "Personalización: tema, preferencias y atajos",
        icono: "configuracion",
        resumen:
          "6 paletas + claro/oscuro, tamaño fuente, orden sidebar, zona horaria y búsqueda rápida.",
        paraQueSirve: "Que cada persona trabaje cómodo sin romper la identidad Rust & Iron.",
        cuandoUsarlo: "Al personalizar tu puesto y al enseñar atajos a tu equipo.",
        terminosClave: ["usuario"],
        relacionados: ["m00-roles", "m08-atajos"],
        secciones: [
          {
            titulo: "Tema visual: 6 paletas + modo claro/oscuro",
            bloques: [
              {
                tipo: "texto",
                texto:
                  "La lógica de color vive en Rust (domain/tema.rs): cada paleta declara su acento; el resto se genera por modo. El frontend solo aplica el mapa token→valor en :root.",
              },
              {
                tipo: "tabla",
                cabeceras: ["Paleta", "Idea"],
                filas: [
                  ["Óxido (Rust)", "Identidad base, acento #B7410E."],
                  ["Bosque", "Verde profundo."],
                  ["Océano", "Azul técnico."],
                  ["Uva", "Violeta operativo."],
                  ["Miel", "Ámbar cálido."],
                  ["Pizarra", "Gris azulado."],
                ],
              },
              {
                tipo: "lista",
                items: [
                  "Global (ADMIN) en /configuracion: elige paleta + modo.",
                  "Personal en /perfil: paleta/modo o Heredar de la empresa.",
                  "Sin sesión se pinta con tema global vía obtener_tema_global.",
                  "Logo LogoMark se tiñe con el acento; favicon queda óxido fijo.",
                ],
              },
            ],
          },
          {
            titulo: "Preferencias por usuario",
            bloques: [
              {
                tipo: "tabla",
                cabeceras: ["Preferencia", "Valores", "Dónde"],
                filas: [
                  [
                    "Tamaño fuente",
                    "PEQUENA (87.5%), MEDIA (100%), GRANDE (112.5%)",
                    "/perfil → :root (rem).",
                  ],
                  ["Orden sidebar", "JSON de hrefs", "Flechas subir/bajar por grupo en /perfil."],
                  [
                    "Zona horaria",
                    "12 zonas IANA (America/Lima por defecto)",
                    "/perfil (Heredar) o /configuracion.",
                  ],
                ],
              },
              {
                tipo: "nota",
                texto:
                  "PreferenciasResueltas lleva fallbacks aplicados y flags tema_heredado/modo_heredado.",
                tono: "success",
              },
            ],
          },
          {
            titulo: "Atajos de teclado",
            bloques: [
              {
                tipo: "tabla",
                cabeceras: ["Atajo", "Acción"],
                filas: [
                  ["Ctrl/Cmd+K", "Buscar en todo Rustock."],
                  ["/", "Enfocar búsqueda global."],
                  ["N", "Nueva entidad en listados."],
                  ["Ctrl/Cmd+Enter", "Guardar formulario."],
                ],
              },
              {
                tipo: "nota",
                texto:
                  "El palette (Ctrl+K) es panel flotante de resultados que navega, nunca muta. Subsecuencia fzf, sinónimos, boost por historial.",
                tono: "info",
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
                  { etiqueta: "Configuración global", href: PATH.configuracion },
                ],
              },
            ],
          },
        ],
      },
    ],
  },
  {
    titulo: "Parte 1 — Conceptos y stock",
    descripcion: "Glosario, unidades de medida y cómo Rustock entiende el stock.",
    capitulos: [
      {
        id: "m01-glosario",
        titulo: "Glosario esencial",
        icono: "ayuda",
        resumen: "Los 15 términos que no puedes confundir.",
        paraQueSirve: "Unificar el lenguaje del equipo.",
        terminosClave: ["producto-sku", "lote", "saldo", "movimiento", "ubicacion-bin"],
        relacionados: ["m01-stock", "m02-almacen"],
        secciones: [
          {
            titulo: "Términos críticos",
            bloques: [
              {
                tipo: "tabla",
                cabeceras: ["Término", "En una línea"],
                filas: [
                  ["SKU", "Identificador canónico del producto, único e inmutable."],
                  ["Lote", "Grupo de unidades con origen/fechas comunes; base de FEFO."],
                  ["Saldo", "(Ubicación, Producto, Lote) → cantidad. Nunca negativo."],
                  ["Movimiento", "Único camino para alterar stock."],
                  ["Ubicación (bin)", "Punto direccionable donde vive el saldo."],
                  ["FEFO / FIFO", "Políticas de salida."],
                ],
              },
              {
                tipo: "enlaces",
                items: [
                  { etiqueta: "Glosario completo (50 términos)", href: "/manual/m08-glosario" },
                  { etiqueta: "Glosario en Ayuda (46 términos)", href: PATH.ayudaGlosario },
                ],
              },
            ],
          },
        ],
      },
      {
        id: "m01-stock",
        titulo: "Stock y saldos",
        icono: "stock",
        resumen: "Dónde vive el stock, cómo se calcula, mínimos/máximos y precisión.",
        paraQueSirve:
          "Entender que el saldo es suma de movimientos aprobados, materializada e indexada.",
        cuandoUsarlo: "Al interpretar dashboards, reportes y alertas.",
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
            titulo: "Dónde vive el stock",
            bloques: [
              {
                tipo: "lista",
                items: [
                  "El stock vive en ubicaciones, opcionalmente dentro de cajas.",
                  "Unidad de saldo: UOM base del producto.",
                  "Saldo por ubicación: clave (ubicación, producto, lote) → cantidad.",
                  "Una ubicación puede tener varias filas (producto×lote).",
                ],
              },
              {
                tipo: "nota",
                texto:
                  "Materializado e indexado (15.11): consultas instantáneas sin recalcular. Fuente: movimientos aprobados.",
                tono: "info",
              },
            ],
          },
          {
            titulo: "Mínimos, máximos y capacidad",
            bloques: [
              {
                tipo: "tabla",
                cabeceras: ["Concepto", "Dónde se define", "Qué dispara"],
                filas: [
                  [
                    "stock_minimo (producto)",
                    "Producto + default empresa",
                    "Alerta Stock bajo si suma ≤ mínimo.",
                  ],
                  ["stock_maximo (producto)", "Producto", "Alerta Stock excedido si > máximo."],
                  [
                    "capacidad_maxima (ubicación)",
                    "Ubicación",
                    "Bloqueo al aprobar entrada/traslado destino si supera.",
                  ],
                ],
              },
            ],
          },
          {
            titulo: "Precisión",
            bloques: [
              {
                tipo: "tabla",
                cabeceras: ["Métrica", "Fórmula", "Objetivo"],
                filas: [
                  ["Precisión por SKU", "(SKUs exactos / contados)×100", "≥95%"],
                  ["Precisión por cantidad", "(unidades correctas / contadas)×100", "≥98%"],
                  [
                    "Exactitud por ubicación",
                    "(ubicaciones sin diferencia / contadas)×100",
                    "≥90%",
                  ],
                ],
              },
              {
                tipo: "nota",
                texto: "Se calcula por sesión cerrada y en reportes/precision como evolución.",
                tono: "success",
              },
            ],
          },
        ],
      },
      {
        id: "m01-uom",
        titulo: "Unidades de medida (UOM)",
        icono: "uom",
        resumen: "La familia de unidades, el factor de conversión y la base.",
        paraQueSirve: "Medir todo coherentemente: 1 CAJA = 10 PZA si factor 10 sobre PZA base.",
        cuandoUsarlo: "Antes de crear productos.",
        terminosClave: ["uom", "uom-base", "producto-sku"],
        relacionados: ["m03-producto"],
        secciones: [
          {
            titulo: "Modelo",
            bloques: [
              {
                tipo: "tabla",
                cabeceras: ["Campo", "Regla"],
                filas: [
                  ["codigo", "Único, ej. PZA, KG, CAJA, M, L. Bloqueado tras crear."],
                  ["nombre", "Legible."],
                  ["tipo", "UNIDAD, PESO, VOLUMEN, LONGITUD, SUPERFICIE."],
                  ["factor", "≥1, cuántas base equivale."],
                  ["base", "Boolean: raíz de su familia."],
                  ["activo", "Default true. No desactivable si producto la usa."],
                ],
              },
              {
                tipo: "lista",
                items: [
                  "Listado /uoms con búsqueda, 20/pág, orden created_at desc.",
                  "Crear: /uoms/nuevo. Editar: /uoms/:id/editar. Eliminar: desactiva.",
                ],
              },
            ],
          },
          {
            titulo: "Buenas prácticas",
            bloques: [
              {
                tipo: "nota",
                texto:
                  "Crea primero la base de cada familia (PZA, KG, L) y luego las derivadas (CAJA, GR, ML).",
                tono: "success",
              },
            ],
          },
        ],
      },
    ],
  },
  {
    titulo: "Parte 2 — Espacio físico",
    descripcion: "El árbol Almacén→Caja, simplificación y el mapa 2D/3D constructivo.",
    capitulos: [
      {
        id: "m02-almacen",
        titulo: "Almacén",
        icono: "almacen",
        resumen: "La raíz de toda la operación. Sin almacén no hay stock.",
        paraQueSirve: "Anclar físicamente toda la operación a un sitio.",
        terminosClave: ["almacen", "desactivar"],
        relacionados: ["m02-zona", "m02-arbol"],
        secciones: [
          {
            titulo: "Atributos y reglas",
            bloques: [
              {
                tipo: "tabla",
                cabeceras: ["Campo", "Regla"],
                filas: [
                  [
                    "codigo",
                    "Único, mayúsculas sin espacios, ej. ALM-PRINCIPAL. Requerido, normalizado. Código único entre activos, trim.",
                  ],
                  ["nombre", "Requerido, legible."],
                  ["descripcion", "Opcional, texto libre."],
                  ["direccion", "Opcional, solo contexto, no se usa para envíos en v1."],
                  [
                    "activo",
                    "Default true. Inactivo no admite movimientos nuevos (solo consultas).",
                  ],
                  [
                    "id / created_at / updated_at / created_by / updated_by",
                    "Automáticos/auditoría, inmutables.",
                  ],
                ],
              },
              {
                tipo: "lista",
                items: [
                  "Debe existir al menos un almacén para operar.",
                  "Código no repetible entre almacenes activos; normalizado mayúsculas trim.",
                  "Desactivar conserva historial; no borra físicamente.",
                  "Unicidad de código de hijos (zona/rack/sección/ubicación) validada por almacén completo (no solo bajo padre).",
                ],
              },
            ],
          },
          {
            titulo: "En la app",
            bloques: [
              {
                tipo: "lista",
                items: [
                  "Listado /almacenes, nuevo /almacenes/nuevo (código bloqueado tras crear), detalle con árbol Zona→Rack→Sección→Ubicación navegable (ArbolAlmacen.tsx), editar /almacenes/:id/editar, eliminar desactiva (/almacenes/:id/eliminar).",
                  "Mapa 2D: /almacenes/:id/mapa (lienzo construcción ?modo=construir), Mapa 3D: /almacenes/:id/mapa-3d (fullscreen inmersivo), Asistente: /almacenes/:id/mapa/asistente.",
                ],
              },
            ],
          },
        ],
      },
      {
        id: "m02-zona",
        titulo: "Zona",
        icono: "zona",
        resumen: "División lógica/física del almacén.",
        terminosClave: ["zona", "almacen"],
        relacionados: ["m02-almacen", "m02-rack"],
        secciones: [
          {
            titulo: "Modelo",
            bloques: [
              {
                tipo: "tabla",
                cabeceras: ["Campo", "Regla"],
                filas: [
                  ["codigo", "Único dentro del almacén, ej. Z-01."],
                  ["nombre/descripcion", "Requerido / opcional."],
                  ["almacen_id", "Exactamente un almacén."],
                  ["pos_x/pos_y/ancho/profundidad", "Posición y tamaño reales. Default 150×70."],
                  ["activo", "Default true."],
                ],
              },
              {
                tipo: "lista",
                items: [
                  "Zona sin historia puede eliminarse físico; con historia solo desactiva.",
                  "Rutas: /zonas, /zonas/nuevo, /zonas/:id, /zonas/:id/editar, /zonas/:id/eliminar.",
                ],
              },
            ],
          },
        ],
      },
      {
        id: "m02-pasillo",
        titulo: "Pasillo",
        icono: "zona",
        resumen: "Corredor físico que agrupa racks dentro de una zona.",
        terminosClave: ["pasillo", "zona", "rack"],
        relacionados: ["m02-zona", "m02-rack", "m02-mapa2d"],
        secciones: [
          {
            titulo: "Modelo",
            bloques: [
              {
                tipo: "tabla",
                cabeceras: ["Campo", "Regla"],
                filas: [
                  ["codigo", "Único dentro del almacén, ej. PAS-01."],
                  ["nombre", "Requerido."],
                  ["zona_id", "Exactamente una zona."],
                  ["pos_x/pos_y/ancho/profundidad", "Geometría real; default 130×56."],
                  ["activo", "Default true."],
                ],
              },
              {
                tipo: "lista",
                items: [
                  "No participa del árbol simplificado: rack siempre pertenece a zona.",
                  "No desactivable si rack con stock.",
                  "Rutas: /pasillos* (CRUD).",
                ],
              },
              {
                tipo: "nota",
                texto:
                  "Matriz de colisiones (14.8): pasillo no puede tener racks ni ubicaciones encima.",
                tono: "warning",
              },
            ],
          },
        ],
      },
      {
        id: "m02-rack",
        titulo: "Rack / Estantería",
        icono: "zona",
        resumen: "Estructura dentro de una zona, opcionalmente en un pasillo.",
        terminosClave: ["rack", "zona", "pasillo", "seccion"],
        relacionados: ["m02-zona", "m02-seccion"],
        secciones: [
          {
            titulo: "Modelo",
            bloques: [
              {
                tipo: "tabla",
                cabeceras: ["Campo", "Regla"],
                filas: [
                  ["codigo", "Único dentro del almacén, ej. RACK-A1."],
                  ["nombre/tipo", "Requerido / estantería/pallet/nevera."],
                  ["zona_id", "Exactamente una zona."],
                  ["pasillo_id", "Opcional, misma zona si se informa."],
                  ["pos_x/pos_y/ancho/profundidad", "110×56 default."],
                ],
              },
              {
                tipo: "lista",
                items: ["Puede contener secciones y/o ubicaciones directas. Rutas: /racks*."],
              },
            ],
          },
        ],
      },
      {
        id: "m02-seccion",
        titulo: "Sección",
        icono: "zona",
        resumen: "Nivel/bahía dentro de un rack.",
        terminosClave: ["seccion", "rack"],
        relacionados: ["m02-rack", "m02-ubicacion"],
        secciones: [
          {
            titulo: "Modelo",
            bloques: [
              {
                tipo: "tabla",
                cabeceras: ["Campo", "Regla"],
                filas: [
                  ["codigo", "Único dentro del almacén, ej. RACK-A1-N2. Recomendado jerárquico."],
                  [
                    "nombre",
                    "Requerido, legible (opcional según implementación, pero documentado).",
                  ],
                  ["nivel", "Opcional, texto o entero (ej. 1, A, B)."],
                  ["rack_id", "Exactamente un rack."],
                  ["descripcion", "Opcional, texto libre."],
                  [
                    "activo",
                    "Default true; solo desactiva si sin historia, si no conserva historial.",
                  ],
                  [
                    "id / created_at / updated_at / created_by / updated_by",
                    "Automáticos/auditoría.",
                  ],
                ],
              },
              {
                tipo: "lista",
                items: [
                  "Puede contener ubicaciones. Código preferentemente derivado de la ruta del árbol.",
                  "Rutas: /secciones (listado), /secciones/nuevo, /secciones/:id, /secciones/:id/editar, /secciones/:id/eliminar (desactiva).",
                ],
              },
            ],
          },
        ],
      },
      {
        id: "m02-ubicacion",
        titulo: "Ubicación (bin)",
        icono: "ubicacion",
        resumen: "Punto direccionable donde vive el stock.",
        paraQueSirve: "Poner cada unidad en un sitio exacto y poder contar/pickear por sitio.",
        terminosClave: ["ubicacion-bin", "capacidad-maxima", "saldo"],
        relacionados: ["m02-caja", "m04-modelo"],
        secciones: [
          {
            titulo: "Modelo",
            bloques: [
              {
                tipo: "tabla",
                cabeceras: ["Campo", "Regla"],
                filas: [
                  ["codigo", "Único dentro del almacén, ej. RACK-A1-N2-P3."],
                  ["seccion_id / rack_id / zona_id", "Exactamente un padre (árbol simplificado)."],
                  [
                    "tipo",
                    "STANDARD, PICKING, RESERVA, RECEPCION, CUARENTENA, DEVOLUCION, DANADO, EXPEDICION.",
                  ],
                  ["capacidad_maxima", "Opcional; suma en UOM base."],
                ],
              },
              {
                tipo: "lista",
                items: [
                  "Puede contener múltiples productos×lotes (mezclado permitido).",
                  "Resolver almacen_id camina el ancestro.",
                ],
              },
            ],
          },
          {
            titulo: "Tipos de ubicación",
            bloques: [
              {
                tipo: "tabla",
                cabeceras: ["Tipo", "Uso"],
                filas: [
                  ["STANDARD", "Almacenamiento general."],
                  ["PICKING", "Preparación de pedidos."],
                  ["RESERVA", "Stock de reserva."],
                  ["RECEPCION", "Mercancía recién recibida."],
                  ["CUARENTENA", "En revisión."],
                  ["DEVOLUCION", "Devuelta por cliente."],
                  ["DANADO", "Dañada."],
                  ["EXPEDICION", "Lista para despachar."],
                ],
              },
            ],
          },
          {
            titulo: "En la app",
            bloques: [
              {
                tipo: "lista",
                items: [
                  "Listado /ubicaciones, detalle, nuevo /ubicaciones/nuevo (selector doble), editar, eliminar desactiva (rechaza con saldo).",
                ],
              },
            ],
          },
        ],
      },
      {
        id: "m02-caja",
        titulo: "Caja",
        icono: "caja",
        resumen: "Contenedor opcional dentro de una ubicación que puede restringir producto/lote.",
        terminosClave: ["caja", "ubicacion-bin", "lote", "producto-sku"],
        relacionados: ["m02-ubicacion", "m04-traslados"],
        secciones: [
          {
            titulo: "Modelo",
            bloques: [
              {
                tipo: "tabla",
                cabeceras: ["Campo", "Regla"],
                filas: [
                  ["codigo", "Único dentro del almacén."],
                  ["ubicacion_id", "Exactamente una ubicación."],
                  ["producto_id", "Opcional: solo ese producto."],
                  ["lote_id", "Opcional: solo ese lote."],
                ],
              },
              {
                tipo: "lista",
                items: [
                  "Restringida no admite más de un producto/lote distinto.",
                  "Mover caja = traslado (validar_restriccion_caja).",
                  "Rutas: /cajas*. CRUD.",
                ],
              },
            ],
          },
        ],
      },
      {
        id: "m02-arbol",
        titulo: "Árbol físico y simplificación",
        icono: "almacen",
        resumen: "Cómo cuelga cada nodo y por qué la unicidad es por almacén.",
        terminosClave: ["almacen", "zona", "rack", "seccion", "ubicacion-bin", "caja", "pasillo"],
        relacionados: ["m02-almacen", "m02-ubicacion"],
        secciones: [
          {
            titulo: "Jerarquía estricta",
            bloques: [
              {
                tipo: "texto",
                texto:
                  "Almacén → Zona → Rack → Sección → Ubicación → Caja. Pasillo es organizativo opcional dentro de zona.",
              },
              {
                tipo: "tabla",
                cabeceras: ["Regla", "Detalle"],
                filas: [
                  ["Un solo padre", "Todo nodo tiene exactamente una raíz de almacén."],
                  [
                    "Simplificación",
                    "Ubicación puede colgar de zona, rack o sección (mismo almacén).",
                  ],
                  [
                    "Unicidad por almacén",
                    "Zona/rack/sección/ubicación: código único en TODO el almacén.",
                  ],
                ],
              },
              {
                tipo: "nota",
                texto:
                  "ArbolAlmacen.tsx en detalle de almacén muestra árbol navegable Zona→Rack→Sección→Ubicación.",
                tono: "info",
              },
            ],
          },
        ],
      },
      {
        id: "m02-mapa2d",
        titulo: "Mapa 2D — Modo construcción",
        icono: "ubicacion",
        resumen: "Plano geométrico real: cada elemento es un rectángulo con colisiones.",
        paraQueSirve: "Prototipar la forma real de la bodega antes de cargar stock.",
        cuandoUsarlo: "Al dar de alta o reorganizar un almacén.",
        terminosClave: ["almacen", "zona", "pasillo", "rack", "ubicacion-bin"],
        relacionados: ["m02-mapa3d", "m02-asistente"],
        secciones: [
          {
            titulo: "Geometría real (SPEC 14.8)",
            bloques: [
              {
                tipo: "lista",
                items: [
                  "Todo posicionado ocupa rectángulo (pos_x, pos_y, ancho, profundidad). Ubicación es bin de tamaño fijo; zona/pasillo/rack redimensionables.",
                  "Elemento sin posición no está en el plano.",
                  "Inactivo libera suelo.",
                ],
              },
            ],
          },
          {
            titulo: "Matriz de solapes prohibidos",
            bloques: [
              {
                tipo: "tabla",
                cabeceras: ["Par", "Prohibido"],
                filas: [
                  [
                    "Mismo tipo entre sí",
                    "Sí: zona↔zona, pasillo↔pasillo, rack↔rack, ubicación↔ubicación.",
                  ],
                  ["Pasillo ↔ rack", "Sí"],
                  ["Pasillo ↔ ubicación", "Sí (pasillo es tránsito)."],
                  ["Rack ↔ ubicación", "Sí"],
                  ["Zona contiene hijos", "Permitido, nunca bloqueado."],
                ],
              },
              {
                tipo: "lista",
                items: [
                  "Tocarse por el borde es válido (AABB desigualdad estricta).",
                  "Validación en toda mutación. Rechazo nombra ambos: \"El rack 'RACK-01' se solapa con el pasillo 'PAS-01'\".",
                ],
              },
            ],
          },
          {
            titulo: "Herramientas del lienzo 2D",
            bloques: [
              {
                tipo: "lista",
                items: [
                  "Modo por URL ?modo=construir. Barra: Seleccionar / Zona / Pasillo / Rack + Rejilla (paso 10, Alt desactiva snap) + Rotar 90°.",
                  "Drag con ghost rojo y drop bloqueado con toast si matriz lo prohíbe.",
                  "Crear dibujando: preview verde/rojo + dimensiones en vivo. Código sugerido primer libre (Z-04, PAS-07). Transaccional sin código quemado.",
                  "Teclado: Esc deselecciona, flechas mueven, Enter selecciona, doble clic navega, Ctrl+Z / Ctrl+Shift+Z.",
                ],
              },
              {
                tipo: "enlaces",
                items: [
                  { etiqueta: "Abrir mapa 2D de un almacén", href: "/almacenes/1/mapa" },
                  { etiqueta: "Asistente layout base", href: "/almacenes/1/mapa/asistente" },
                ],
              },
            ],
          },
        ],
      },
      {
        id: "m02-mapa3d",
        titulo: "Mapa 3D inmersivo (estilo Blender/Figma)",
        icono: "ubicacion",
        resumen:
          "Editor fullscreen sobre toda la ventana: órbita, selección múltiple, duplicar, caminar.",
        paraQueSirve:
          "Entender volúmenes, alturas y proximidades; operar con potencia de editor 3D.",
        terminosClave: ["mapa-3d", "almacen"],
        relacionados: ["m02-mapa2d", "m02-asistente"],
        secciones: [
          {
            titulo: "Layout inmersivo",
            bloques: [
              {
                tipo: "lista",
                items: [
                  "Contenedor .mapa3d-full fixed inset 0 z-index 210 (responsive, ocupa toda la ventana). Lienzo absolute inset-0; frameloop demand (61 FPS) / always si auto-rotar.",
                  "UI flotante: barra superior en dos píldoras (surface + shadow-lg) + panel del nodo a la izquierda scrollable. Barra con pointer-events none para no bloquear órbita.",
                  'Detección WebGL previa (tieneWebGL): sin GPU/driver → ErrorPanel claro "El mapa 3D requiere WebGL" con enlace al 2D.',
                ],
              },
            ],
          },
          {
            titulo: "Controles y selección",
            bloques: [
              {
                tipo: "tabla",
                cabeceras: ["Acción", "Cómo"],
                filas: [
                  [
                    "Orbitar",
                    "Arrastrar fondo (OrbitControls, demand, damping 0.08, 61 FPS). Inercia enableDamping.",
                  ],
                  [
                    "Mover nodo",
                    "Arrastrar prisma: rayo→plano horizontal a pos_z (preserva altura), snap paso 10, ghost verde/rojo (emissive) + obstáculos en rojo tenue.",
                  ],
                  [
                    "Selección múltiple",
                    "Shift+clic alterna grupo (grupoIds). Arrastrar cualquier miembro mueve todo el grupo con mismo delta (agarre por miembro), validación todo-o-nada si uno choca.",
                  ],
                  [
                    "Deshacer/Rehacer",
                    "Hook use-historial-mapa (50, kind mover/creacion/grupo). Botones + Ctrl+Z / Ctrl+Shift+Z / Ctrl+Y. Drop bloqueado no registra.",
                  ],
                  [
                    "Sugerencia visual",
                    "Sugerencia verde en piso (y=0.16) + obstáculos brillando en rojo tenue durante el gesto; no heatmap denso de 2D. Semáforo verde/rojo en vivo.",
                  ],
                ],
              },
            ],
          },
          {
            titulo: "Atajos estilo Blender",
            bloques: [
              {
                tipo: "tabla",
                cabeceras: ["Atajo", "Efecto"],
                filas: [
                  [
                    "Flechas",
                    "Nudge seleccionado/grupo en pasos de rejilla (bloqueo todo-o-nada, toast si chocaría).",
                  ],
                  ["R", "Rotar 90° alrededor del centro."],
                  ["F", "Enfocar seleccionado (frame selected conservando dirección cámara)."],
                  [
                    "Shift+D",
                    "Duplicar al hueco libre más cercano (posicionLibreCercana), hereda zona, queda seleccionado; Ctrl+Z la desactiva.",
                  ],
                  ["Z", "Vista alambre (wireframe)."],
                  ["Esc", "Salir de caminar y re-encuadra; limpia grupo/selección."],
                ],
              },
              {
                tipo: "lista",
                items: [
                  "Presets de cámara: Isométrica / Planta (cenital) / Frente (centroYDistancia, encuadrarTodo).",
                  'HUD coords chip mono "x · y" sobre nodo arrastrado.',
                  "Modo caminar: cámara a 1.7 altura ojos, WASD desplaza cámara+target en dirección mirada, arrastrar mira; Esc sale y re-encuadra.",
                ],
              },
            ],
          },
        ],
      },
      {
        id: "m02-asistente",
        titulo: "Asistente de layout base",
        icono: "zona",
        resumen: "Prototipa un almacén vacío en segundos y genera geometría sin solapes.",
        terminosClave: ["almacen", "zona", "pasillo", "rack"],
        relacionados: ["m02-mapa2d", "m02-mapa3d"],
        secciones: [
          {
            titulo: "Cómo funciona",
            bloques: [
              {
                tipo: "lista",
                items: [
                  "Ruta /almacenes/:id/mapa/asistente. Solo si almacén sin zonas activas.",
                  "Formulario: medidas de zona, nº pasillos 1–12, racks por bloque 1–20, preview SVG en vivo.",
                  "Al generar: zona contenedora + columnas alternadas [bloque racks | pasillo], márgenes 20/gap 10, garantizado sin solapes.",
                ],
              },
              {
                tipo: "nota",
                texto:
                  "Flujo recomendado: Asistente → ajustar en 2D → revisar alturas en 3D → cargar catálogos y stock.",
                tono: "success",
              },
            ],
          },
        ],
      },
    ],
  },
  {
    titulo: "Parte 3 — Catálogos maestros",
    descripcion: "Productos, lotes, categorías, UOM, proveedores, clientes y sucursales.",
    capitulos: [
      {
        id: "m03-producto",
        titulo: "Productos (SKU)",
        icono: "producto",
        resumen: "El catálogo corazón: sin productos no hay movimientos.",
        paraQueSirve: "Registrar cada artículo con reglas que evitan errores.",
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
            titulo: "Atributos y reglas",
            bloques: [
              {
                tipo: "tabla",
                cabeceras: ["Campo", "Regla"],
                filas: [
                  [
                    "sku",
                    "Único, mayúsculas, trim, sin espacios, normalizado, inmutable. Solo cambiable por rol con permiso explícito y rastro.",
                  ],
                  ["nombre", "Requerido, legible."],
                  ["descripcion", "Opcional, texto libre."],
                  ["categoria_id", "Opcional, árbol sin ciclos; NULL = sin categoría."],
                  ["uom_base_id", "Requerido, UOM activa. Inmutable tras crear."],
                  [
                    "uom_venta_id / uom_compra_id",
                    "Opcionales, UOM alternativas con factor conversión (ej. CAJA 10×PZA).",
                  ],
                  [
                    "codigo_barras",
                    "Opcional, único si existe; lectura por escáner con prioridad exacta sobre q.",
                  ],
                  ["peso_unitario (kg)", "Opcional, numérico; informativo."],
                  ["volumen_unitario (m³)", "Opcional, numérico; informativo."],
                  [
                    "stock_minimo",
                    "Opcional (UOM base); dispara alerta stock bajo si suma ≤ mínimo.",
                  ],
                  ["stock_maximo", "Opcional (UOM base); dispara alerta excedido si > máximo."],
                  ["controla_lote", "Si true, TODO movimiento exige lote, sin excepción."],
                  [
                    "controla_vencimiento",
                    "Si true, implica controla_lote y obliga fecha_vencimiento en lote y en entrada con lote nuevo.",
                  ],
                  ["perecedero", "Si true, activa FEFO en salidas."],
                  [
                    "activo",
                    "Default true; inactivo no admite entradas/salidas nuevas, solo consultas y ajustes de regularización autorizados (requiere permiso).",
                  ],
                  [
                    "id / created_at / updated_at / created_by / updated_by",
                    "Automáticos/auditoría, inmutables.",
                  ],
                ],
              },
              {
                tipo: "nota",
                texto:
                  "SKU y UOM base quedan bloqueados tras crear. UOM activa validada al crear/editar; UOM en uso no se puede desactivar. Producto inactivo: solo regularización autorizada.",
                tono: "warning",
              },
            ],
          },
          {
            titulo: "En la app",
            bloques: [
              {
                tipo: "lista",
                items: [
                  "Listado /productos (SKU, nombre, insignias Lote/Vencimiento/Perecedero, estado), detalle con stock por ubicación/lote, categoría y proveedores, nuevo /productos/nuevo y editar /productos/:id/editar (SKU y UOM base bloqueados), eliminar desactiva con confirmación. Creación rápida desde movimientos.",
                ],
              },
            ],
          },
        ],
      },
      {
        id: "m03-lote",
        titulo: "Lotes",
        icono: "lote",
        resumen: "Origen y vencimiento por producto. Base de trazabilidad y FEFO.",
        terminosClave: ["lote", "vencimiento", "fefo", "fifo", "trazabilidad"],
        relacionados: ["m03-producto", "m04-fifo", "m04-salidas"],
        secciones: [
          {
            titulo: "Modelo",
            bloques: [
              {
                tipo: "tabla",
                cabeceras: ["Campo", "Regla"],
                filas: [
                  ["numero", "Texto único dentro del producto, inmutable tras crear."],
                  [
                    "producto_id",
                    "Obligatorio; filtro selector: solo productos que controla_lote.",
                  ],
                  ["fecha_fabricacion", "Opcional, fecha de fabricación."],
                  [
                    "fecha_vencimiento",
                    "Opcional; obligatoria si producto controla_vencimiento (en creación de lote y en cada entrada con lote nuevo).",
                  ],
                  ["origen", "Texto libre, ej. proveedor o interna."],
                  ["notas", "Opcional, texto libre."],
                  [
                    "id / created_at / updated_at / created_by / updated_by",
                    "Automáticos/auditoría.",
                  ],
                ],
              },
              {
                tipo: "lista",
                items: [
                  "Solo tiene sentido si producto controla_lote; número único por producto.",
                  "Listado /lotes (número, producto, vencimiento, origen, 20/pág), detalle, nuevo /lotes/nuevo (número inmutable, producto filtado), editar /lotes/:id/editar (solo fechas/origen/notas); lotes no se eliminan (sin borrado).",
                  "Vencido no puede salir a cliente/devolución proveedor; solo merma/ajuste negativo (regla dura 8.6). Los lotes se listan filtrados por producto en formularios de movimiento y conteo.",
                ],
              },
              {
                tipo: "nota",
                texto:
                  "Usa reportes vencimientos 30/60/90 y alerta Lote por vencer (umbral configurable dias_aviso) para rotar a tiempo y evitar mermas.",
                tono: "success",
              },
            ],
          },
        ],
      },
      {
        id: "m03-categoria",
        titulo: "Categorías",
        icono: "categoria",
        resumen: "Jerarquía en árbol para clasificar productos y filtrar reportes.",
        terminosClave: ["categoria", "producto-sku"],
        relacionados: ["m03-producto", "m06-reportes"],
        secciones: [
          {
            titulo: "Modelo",
            bloques: [
              {
                tipo: "tabla",
                cabeceras: ["Campo", "Regla"],
                filas: [
                  ["nombre", "Único, requerido."],
                  ["parent_id", "Opcional; NULL = raíz (mover a raíz con parent_id: null)."],
                  ["descripcion", "Opcional, texto libre."],
                  ["activo", "Default true."],
                  [
                    "id / created_at / updated_at / created_by / updated_by",
                    "Automáticos/auditoría.",
                  ],
                ],
              },
              {
                tipo: "lista",
                items: [
                  "Detección real de ciclos recorre ancestros (no solo existe padre).",
                  "Con hijos o productos no eliminable; solo desactiva (borrado lógico).",
                  "Rutas: /categorias (listado), /categorias/nuevo, /categorias/:id, /categorias/:id/editar, /categorias/:id/eliminar (desactiva).",
                  "Reporte Stock actual permite filtrar por categoría.",
                ],
              },
            ],
          },
        ],
      },
      {
        id: "m03-proveedor-cliente",
        titulo: "Proveedores y clientes",
        icono: "proveedor",
        resumen: "Origen de compras y destino de despachos.",
        terminosClave: ["proveedor", "cliente", "entrada", "salida", "trazabilidad"],
        relacionados: ["m04-entradas", "m04-salidas"],
        secciones: [
          {
            titulo: "Atributos comunes",
            bloques: [
              {
                tipo: "tabla",
                cabeceras: ["Campo", "Regla"],
                filas: [
                  ["codigo", "Único, inmutable."],
                  ["nombre", "Requerido."],
                  ["contacto_* + direccion", "Opcionales."],
                  ["activo", "Default true. Inactivo no usable."],
                ],
              },
              {
                tipo: "lista",
                items: [
                  "Proveedor en entradas COMPRA y DEVOLUCION_PROVEEDOR; cliente en salidas CLIENTE.",
                  "Rutas: /proveedores* y /clientes* . Reportes por proveedor/cliente.",
                ],
              },
            ],
          },
        ],
      },
      {
        id: "m03-sucursal",
        titulo: "Sucursales y empresa",
        icono: "ubicacion",
        resumen:
          "Configuración de empresa (país, fiscales, contacto, logo, archivos) y puntos de operación.",
        terminosClave: ["sucursal", "almacen"],
        relacionados: ["m00-personalizacion"],
        secciones: [
          {
            titulo: "Configuración de empresa",
            bloques: [
              {
                tipo: "lista",
                items: [
                  "Tabla configuracion_empresa fila única id=default con defaults: zona America/Lima, formato DD_MMM_YYYY, 30 días aviso, requiere aprobación 1.",
                  "Campos en /configuracion: datos básicos, país/ciudad/dirección, fiscales, contacto, coordenadas lat/long, zona horaria, formato fecha, días aviso, stock mínimo default, política aprobación, tema global.",
                  "Ubicación y mapa: lat/long + Detectar mi ubicación + iframe OSM + Abrir en Google Maps.",
                  "Logo y documentos: LOGO reemplaza anterior (≤2 MB) y DOCUMENTO (≤10 MB), BLOB en SQLite, base64.",
                ],
              },
            ],
          },
          {
            titulo: "Sucursales",
            bloques: [
              {
                tipo: "lista",
                items: [
                  "Entidad Sucursal CRUD completo (código único, coordenadas validadas). Permiso configuracion:ver/editar.",
                  "Rutas: /sucursales, /sucursales/nuevo, /sucursales/:id, editar, eliminar.",
                ],
              },
            ],
          },
          {
            titulo: "Importación masiva",
            bloques: [
              {
                tipo: "lista",
                items: [
                  "Ruta /configuracion/importar: CSV de catálogos. Valida por fila y reporta ResultadoImportacion.",
                ],
              },
            ],
          },
        ],
      },
    ],
  },
  {
    titulo: "Parte 4 — Movimientos: el núcleo",
    descripcion:
      "La única forma de alterar stock. Tipos, estados, ciclo de vida, FIFO/FEFO y captura con escáner.",
    capitulos: [
      {
        id: "m04-modelo",
        titulo: "Modelo general de movimiento",
        icono: "movements",
        resumen: "Campos, líneas y reglas de auditoría de todo movimiento.",
        terminosClave: ["movimiento", "entrada", "salida", "traslado", "ajuste", "saldo"],
        relacionados: ["m04-ciclo", "m04-fifo"],
        secciones: [
          {
            titulo: "Cabecera",
            bloques: [
              {
                tipo: "tabla",
                cabeceras: ["Campo", "Regla"],
                filas: [
                  ["id", "UUID inmutable, único."],
                  [
                    "numero",
                    "Texto correlativo único por año/almacén, ej. MOV-2026-000123 (o MOV-ALM-PRINCIPAL-2026-000006).",
                  ],
                  ["tipo", "ENTRADA, SALIDA, TRASLADO, AJUSTE, CONSUMO."],
                  [
                    "sub_tipo",
                    "Según tipo: COMPRA, DEVOLUCION_CLIENTE, AJUSTE_POSITIVO, INICIAL, TRASLADO_ENTRADA; CLIENTE, DEVOLUCION_PROVEEDOR, MERMA, AJUSTE_NEGATIVO, TRASLADO_SALIDA.",
                  ],
                  ["estado", "BORRADOR, PENDIENTE_APROBACION, APROBADO, ANULADO."],
                  [
                    "fecha_movimiento",
                    "Fecha-hora del hecho (puede diferir de created_at). Almacenada UTC, mostrada en zona configurada.",
                  ],
                  [
                    "motivo",
                    "Texto; requerido para AJUSTE_POSITIVO/NEGATIVO y MERMA (≥3 chars), opcional otros.",
                  ],
                  [
                    "origen_ubicacion_id",
                    "Referencia ubicación origen; para salidas/traslados/ajustes negativos.",
                  ],
                  [
                    "destino_ubicacion_id",
                    "Referencia ubicación destino; para entradas/traslados/ajustes positivos.",
                  ],
                  [
                    "proveedor_id",
                    "Referencia proveedor; para entradas COMPRA y salidas DEVOLUCION_PROVEEDOR.",
                  ],
                  [
                    "cliente_id",
                    "Referencia cliente; para salidas CLIENTE y entradas DEVOLUCION_CLIENTE.",
                  ],
                  [
                    "sesion_inventario_id",
                    "Referencia sesión inventario si el movimiento proviene de conteo (ajuste auto al cerrar).",
                  ],
                  [
                    "documento_referencia",
                    "Texto opcional: Nº OC, guía, factura, etc. Liga traslados inter-almacén.",
                  ],
                  ["notas", "Texto opcional: observaciones generales."],
                  ["created_by / created_at", "Quién/cuándo lo creó (auditoría)."],
                  ["approved_by / approved_at", "Quién/cuándo lo aprobó (si aplica)."],
                  ["anulado_by / anulado_at", "Quién/cuándo lo anuló (si aplica)."],
                  [
                    "movimiento_inverso_id",
                    "Referencia al movimiento inverso generado al anular un APROBADO (referencia mutua).",
                  ],
                ],
              },
            ],
          },
          {
            titulo: "Líneas",
            bloques: [
              {
                tipo: "tabla",
                cabeceras: ["Campo línea", "Regla"],
                filas: [
                  ["producto_id", "Requerido; producto debe estar activo."],
                  [
                    "lote_id",
                    "Requerido si producto controla_lote; debe existir y no estar vencido si sub_tipo CLIENTE/DEVOLUCION_PROVEEDOR.",
                  ],
                  ["cantidad", "Número >0, en UOM base."],
                  ["origen_ubicacion_id", "Para salidas/traslados; debe tener saldo suficiente."],
                  ["destino_ubicacion_id", "Para entradas/traslados; valida capacidad destino."],
                  [
                    "caja_origen_id / caja_destino_id",
                    "Opcionales; valida restricción caja si caja restringida a producto/lote.",
                  ],
                ],
              },
              {
                tipo: "nota",
                texto:
                  "Un movimiento puede tener N líneas y dividir una cantidad en varios lotes/ubicaciones (múltiples filas). Ejemplo: entrada compra multi-lote con mismo producto en dos lotes distintos.",
                tono: "info",
              },
            ],
          },
          {
            titulo: "Auditoría del movimiento",
            bloques: [
              {
                tipo: "lista",
                items: [
                  "Quién (created_by, approved_by, anulado_by), Qué (tipo, producto, cantidad), Dónde (origen/destino, almacén resuelto por transitividad), Cuándo (fecha_movimiento, created_at, approved_at), Por qué (motivo, documento_referencia, notas).",
                  "Cada transición queda en auditoría con antes/despues y se puede consultar en /historial y /reportes/auditoria.",
                ],
              },
            ],
          },
        ],
      },
      {
        id: "m04-ciclo",
        titulo: "Ciclo de vida y estados",
        icono: "ajuste",
        resumen:
          "BORRADOR → PENDIENTE → APROBADO (único que altera saldo) → ANULADO (genera inverso).",
        terminosClave: [
          "borrador",
          "pendiente-aprobacion",
          "aprobado",
          "anulado",
          "movimiento-inverso",
        ],
        relacionados: ["m04-modelo", "m04-ajustes"],
        secciones: [
          {
            titulo: "Estados y transiciones",
            bloques: [
              {
                tipo: "texto",
                texto:
                  "BORRADOR → PENDIENTE_APROBACION → APROBADO → (aplica efecto). Desde BORRADOR o PENDIENTE se puede ir a ANULADO.",
              },
              {
                tipo: "tabla",
                cabeceras: ["Estado", "Efecto stock", "Editable"],
                filas: [
                  ["BORRADOR", "No", "Sí, solo por creador."],
                  ["PENDIENTE_APROBACION", "No", "Sí, solo por creador."],
                  ["APROBADO", "Sí (atómico)", "No (inmutable; solo anulable)."],
                  ["ANULADO", "No (genera inverso)", "No."],
                ],
              },
              {
                tipo: "lista",
                items: [
                  "Aprobar valida saldo, lote no vencido, capacidad, controla_lote, cajas, sesión no bloqueante y saldo nunca negativo.",
                  "Anular requiere movimiento:anular; si APROBADO genera inverso atómico con referencia mutua movimiento_inverso_id.",
                ],
              },
            ],
          },
          {
            titulo: "Edición de movimientos",
            bloques: [
              {
                tipo: "lista",
                items: [
                  "EditarMovimiento (tipo/sub_tipo/numero estables): solo creador, solo BORRADOR/PENDIENTE.",
                  "Ruta /movimientos/:id/editar + botón Editar en detalle.",
                ],
              },
            ],
          },
          {
            titulo: "Crear y aprobar de inmediato",
            bloques: [
              {
                tipo: "lista",
                items: [
                  "Si requiere_aprobacion = false, formulario ofrece toggle Crear y aprobar de inmediato cuando el usuario puede aprobar.",
                  "Encadena crear + aprobar. Si exige aprobación, no aparece.",
                ],
              },
            ],
          },
        ],
      },
      {
        id: "m04-entradas",
        titulo: "Entradas",
        icono: "entrada",
        resumen: "COMPRA, DEVOLUCION_CLIENTE, AJUSTE_POSITIVO, INICIAL y TRASLADO_ENTRADA.",
        terminosClave: ["entrada", "proveedor", "ajuste"],
        relacionados: ["m04-modelo", "m07-recepcion"],
        secciones: [
          {
            titulo: "Tipos",
            bloques: [
              {
                tipo: "tabla",
                cabeceras: ["Sub-tipo", "Origen", "Destino", "Notas"],
                filas: [
                  [
                    "COMPRA",
                    "Proveedor",
                    "Ubicación (recepción o final)",
                    "Valida producto activo, lote válido sin vencer, capacidad destino. Puede dividir en varios lotes/ubicaciones. Documento OC opcional.",
                  ],
                  [
                    "DEVOLUCION_CLIENTE",
                    "Cliente",
                    "Ubicación DEVOLUCION sugerida",
                    "Si controla_lote, registra lote origen o crea con vencimiento informado. No reabre salida original.",
                  ],
                  [
                    "AJUSTE_POSITIVO",
                    "— (causa justificada)",
                    "Ubicación",
                    "Siempre motivo ≥3. Permiso ajuste:crear. Incrementa stock.",
                  ],
                  [
                    "INICIAL",
                    "— (apertura)",
                    "Ubicación",
                    "Carga inicial antes de operar normal. Requiere configuracion:ejecutar (solo ADMIN/GERENTE). Identificada como stock arranque, opcional sesión inicial.",
                  ],
                  [
                    "TRASLADO_ENTRADA",
                    "Ver traslados (9)",
                    "Ubicación destino",
                    "Mitad destino de traslado intra/inter-almacén. Generada automáticamente al aprobar traslado.",
                  ],
                ],
              },
            ],
          },
        ],
      },
      {
        id: "m04-salidas",
        titulo: "Salidas",
        icono: "salida",
        resumen: "CLIENTE, DEVOLUCION_PROVEEDOR, MERMA y AJUSTE_NEGATIVO.",
        terminosClave: ["salida", "cliente", "merma", "ajuste"],
        relacionados: ["m04-modelo", "m04-fifo", "m07-despacho"],
        secciones: [
          {
            titulo: "Tipos y flujo despacho",
            bloques: [
              {
                tipo: "tabla",
                cabeceras: ["Sub-tipo", "Origen", "Destino", "Requiere"],
                filas: [
                  [
                    "CLIENTE",
                    "Ubicación",
                    "Cliente",
                    "Saldo suficiente, lote no vencido (FEFO/FIFO). Documento guía/pedido opcional.",
                  ],
                  [
                    "DEVOLUCION_PROVEEDOR",
                    "Ubicación",
                    "Proveedor",
                    "Cualquier ubicación con stock; permite lote específico si controla_lote; motivo opcional (recomendado comentario si calidad).",
                  ],
                  [
                    "MERMA",
                    "Ubicación",
                    "— (pérdida)",
                    "Siempre motivo y, según config, aprobar. Decrementa saldo y lote; lote vencido sin restricción.",
                  ],
                  [
                    "AJUSTE_NEGATIVO",
                    "Ubicación",
                    "— (causa justificada)",
                    "Siempre motivo (≥3) y permiso ajuste:crear; no deja saldo <0.",
                  ],
                  [
                    "TRASLADO_SALIDA",
                    "Ubicación origen (ver traslados 9)",
                    "—",
                    "Mitad origen de traslado intra/inter-almacén. Generada automáticamente al aprobar traslado.",
                  ],
                ],
              },
              {
                tipo: "pasos",
                pasos: [
                  "Crea SALIDA / CLIENTE en /movimientos/nuevo?tipo=SALIDA: líneas producto/cantidad/cliente + origen (selector FIFO/FEFO si aplica).",
                  "Usa Sugerir FIFO/FEFO si producto controla_lote (elige producto+cantidad, sistema propone lotes/ubicaciones).",
                  "Valida saldo suficiente, lote no vencido, ubicación con stock; si no, indica dónde hay stock (producto/lote/ubicación).",
                  "Aprobar → decrementa atómico con trazabilidad del origen de cada unidad despachada.",
                ],
              },
            ],
          },
        ],
      },
      {
        id: "m04-traslados",
        titulo: "Traslados",
        icono: "traslado",
        resumen:
          "Mover stock sin alterar el total del almacén (intra) o con dos movimientos ligados (inter).",
        terminosClave: ["traslado", "ubicacion-bin", "caja"],
        relacionados: ["m04-modelo", "m07-traslado"],
        secciones: [
          {
            titulo: "Entre ubicaciones / cajas / almacenes",
            bloques: [
              {
                tipo: "lista",
                items: [
                  "Entre ubicaciones: origen → destino, mismo almacén salvo inter-almacén. Atómico: salida origen + entrada destino en un hecho (insertar_movimiento en transacción). Valida saldo origen, coherencia producto/lote, capacidad destino.",
                  "Entre cajas: especifica caja_origen/destino; si restringida valida coherencia; al mover todo queda vacía.",
                  "Entre almacenes (9.3): dos movimientos ligados mismo numero/documento_referencia (TRASLADO_SALIDA origen + TRASLADO_ENTRADA destino), cada uno BORRADOR y aprobado por separado, transaccional sin huérfanos, no altera total si mismo almacén.",
                  "Ruta: /movimientos/nuevo?tipo=TRASLADO (una sola línea origen/destino distintos, no misma ubicación). Selector tipo vive en query-string, no sub-ruta.",
                ],
              },
              {
                tipo: "nota",
                texto:
                  "Mover caja completa se modela como traslado de su contenido (validar_restriccion_caja al aprobar). No altera total del almacén si mismo almacén.",
                tono: "info",
              },
            ],
          },
        ],
      },
      {
        id: "m04-ajustes",
        titulo: "Ajustes de stock",
        icono: "ajuste",
        resumen: "Corrección, merma y sobrante: siempre con motivo y nunca automático.",
        terminosClave: ["ajuste", "merma", "saldo"],
        relacionados: ["m04-modelo", "m05-diferencias"],
        secciones: [
          {
            titulo: "Reglas de validación",
            bloques: [
              {
                tipo: "tabla",
                cabeceras: ["Regla", "Detalle"],
                filas: [
                  ["Motivo obligatorio", "No vacío, ≥3 chars, siempre."],
                  ["Nunca automático", "Siempre usuario con permiso."],
                  ["Saldo nunca <0", "Negativo rechazado al aprobar."],
                  ["Ejecución", "Solo APROBADO (o directo si rol puede aprobar)."],
                ],
              },
              {
                tipo: "lista",
                items: [
                  "Por corrección: indica saldo esperado o diferencia.",
                  "Merma: ajuste negativo con motivo pérdida. Sobrante: positivo.",
                ],
              },
            ],
          },
        ],
      },
      {
        id: "m04-fifo",
        titulo: "Política de salida: FIFO / FEFO",
        icono: "lote",
        resumen: "Cómo elige el sistema qué lote y ubicación salen primero.",
        terminosClave: ["fifo", "fefo", "lote", "vencimiento"],
        relacionados: ["m03-lote", "m04-salidas"],
        secciones: [
          {
            titulo: "Orden de propuesta",
            bloques: [
              {
                tipo: "tabla",
                cabeceras: ["Condición producto", "Política", "Criterio"],
                filas: [
                  ["perecedero o controla_vencimiento", "FEFO", "fecha_vencimiento menor primero."],
                  [
                    "controla_lote sin vencimiento",
                    "FIFO",
                    "fecha_fabricacion o entrada más antigua.",
                  ],
                  ["no controla lote", "Stock general", "De la ubicación elegida."],
                ],
              },
              {
                tipo: "lista",
                items: [
                  "Excepción lote específico: usuario puede indicar lote_id concreto si tiene saldo y, si perecedero, no está vencido.",
                  "Dentro de ubicación origen; si varias, propone por antigüedad y permite ajuste manual.",
                ],
              },
              {
                tipo: "nota",
                texto:
                  "Regla dura: lote vencido no sale a cliente ni devolución proveedor; solo MERMA o AJUSTE_NEGATIVO.",
                tono: "warning",
              },
            ],
          },
        ],
      },
      {
        id: "m04-captura",
        titulo: "Captura rápida con escáner",
        icono: "codigoBarras",
        resumen: "Recepción y despacho guiados código a código.",
        terminosClave: ["codigo-barras", "entrada", "salida", "lote"],
        relacionados: ["m04-entradas", "m04-salidas"],
        secciones: [
          {
            titulo: "Flujo",
            bloques: [
              {
                tipo: "lista",
                items: [
                  "Rutas: /movimientos/captura-recepcion y /movimientos/captura-despacho.",
                  "Escaneo resuelto a tipo PRODUCTO/UBICACION/LOTE/CAJA con etiqueta; EscaneoResuelto lleva controla_lote desde Rust.",
                  "Líneas con lote obligatorio si controla_lote.",
                  "El escáner alimenta el formulario; nunca crea datos solo. Código desconocido → error + sugerencia.",
                ],
              },
              {
                tipo: "nota",
                texto:
                  "Captura evita errores de tipeo y respeta misma validación que formulario normal.",
                tono: "success",
              },
            ],
          },
        ],
      },
    ],
  },
  {
    titulo: "Parte 5 — Inventario físico y conteo",
    descripcion:
      "Sesiones, conteo ciego, doble conteo, diferencias, precisión y cierre con snapshot.",
    capitulos: [
      {
        id: "m05-sesion",
        titulo: "Sesión de inventario",
        icono: "inventario",
        resumen: "Proceso formal de contar todo o parte del almacén, con estados y alcance.",
        terminosClave: ["sesion-inventario", "conteo-ciego", "doble-conteo"],
        relacionados: ["m05-conteo", "m05-diferencias"],
        secciones: [
          {
            titulo: "Atributos",
            bloques: [
              {
                tipo: "tabla",
                cabeceras: ["Campo", "Regla"],
                filas: [
                  ["id", "UUID inmutable."],
                  ["numero", "Único por año, ej. INV-2026-0001."],
                  [
                    "tipo",
                    "COMPLETO (todo el almacén/alcance) o CICLICO (subconjunto: zona, categoría, vencido pronto, muestreo aleatorio).",
                  ],
                  ["estado", "PLANEADA → EN_CURSO → CERRADA / ANULADA."],
                  ["almacen_id", "Obligatorio, almacén donde se cuenta."],
                  ["alcance", "Criterio texto libre (ej. zona, categoría, ubicación)."],
                  [
                    "fecha_inicio",
                    "Si tiene valor, nace EN_CURSO y admite conteos; vacía queda PLANEADA (requiere iniciar_sesion_inventario).",
                  ],
                  ["fecha_fin", "Opcional, cierre."],
                  ["responsable_id", "Usuario responsable de la sesión."],
                  ["conteo_ciego", "Bool: si true, no muestra saldo al contar."],
                  ["exige_doble_conteo", "Bool: si true, toda diferencia exige 2° conteo."],
                  [
                    "created_by / created_at / closed_by / closed_at / anulado_by / anulado_at",
                    "Auditoría.",
                  ],
                ],
              },
              {
                tipo: "lista",
                items: [
                  "Comando iniciar_sesion_inventario (PLANEADA→EN_CURSO) con botón inline en detalle si PLANEADA.",
                  "Listado /inventario (filtro estado, 20/pág), detalle /inventario/:id, nuevo /inventario/nuevo, eliminar /inventario/:id/eliminar (desactiva si sin historia).",
                ],
              },
            ],
          },
        ],
      },
      {
        id: "m05-conteo",
        titulo: "Registro de conteo",
        icono: "inventario",
        resumen:
          "Captura campo a campo por (ubicación, producto, lote) con cantidad y n.º de conteo.",
        terminosClave: [
          "sesion-inventario",
          "conteo-ciego",
          "doble-conteo",
          "ubicacion-bin",
          "lote",
        ],
        relacionados: ["m05-sesion", "m05-diferencias"],
        secciones: [
          {
            titulo: "Campos por línea",
            bloques: [
              {
                tipo: "tabla",
                cabeceras: ["Campo", "Regla"],
                filas: [
                  ["sesion_id", "Requerido, sesión EN_CURSO."],
                  ["ubicacion_id", "Requerido, ubicación del almacén de la sesión."],
                  ["producto_id", "Requerido."],
                  ["lote_id", "Requerido si producto controla_lote."],
                  ["cantidad_contada", "≥0 (0 = producto ausente en físico)."],
                  ["conteo_numero", "≥1 (1° conteo, 2° recuento si exige_doble_conteo)."],
                  ["usuario_contador_id", "Quién contó (auditoría, del usuario en sesión)."],
                  ["timestamp", "Cuándo se registró (UTC)."],
                  ["nota", "Opcional, texto libre (ej. caja dañada)."],
                ],
              },
              {
                tipo: "lista",
                items: [
                  "Página dedicada /inventario/:id/conteos solo si EN_CURSO. Formulario: ubicación, producto, lote si toca, cantidad, nº conteo, nota; conserva nº al limpiar.",
                  "Conteo ciego garantizado: saldo nunca se muestra en captura, ciego o no.",
                  "Sobrante físico sin saldo → entrada por ajuste. Sesión EN_CURSO bloquea ajustes manuales sobre ese almacén (concurrencia 14.6).",
                  "Validación: producto inactivo no se puede contar si no existe stock? El sistema permite contar cualquier producto/lote con cantidad 0.",
                ],
              },
            ],
          },
        ],
      },
      {
        id: "m05-diferencias",
        titulo: "Diferencias, conciliación y precisión",
        icono: "inventario",
        resumen:
          "Qué pasa con lo contado vs sistema, cómo se cierra y cómo se mide tu precisión histórica.",
        terminosClave: ["diferencia-inventario", "precision-inventario", "ajuste"],
        relacionados: ["m05-conteo", "m06-reportes"],
        secciones: [
          {
            titulo: "Diferencias",
            bloques: [
              {
                tipo: "tabla",
                cabeceras: ["Diferencia", "Significado", "Acción propuesta"],
                filas: [
                  ["0", "Conciliado", "Sin acción."],
                  [">0", "Sobrante", "Entrada por ajuste motivo diferencia de inventario."],
                  ["<0", "Faltante", "Salida por ajuste motivo diferencia de inventario."],
                ],
              },
              {
                tipo: "lista",
                items: [
                  "Si exige_doble_conteo, solo se acepta si 2° confirma.",
                  "Diferencias calculadas en vivo para activas; al cerrar se snapshotizan en sesion_diferencias dentro de misma transacción (H27).",
                  "Cierre: solo permiso inventario:cerrar. Ruta /inventario/:id/cerrar genera ajustes (o PENDIENTE si política). Cerrada no admite más conteos.",
                ],
              },
            ],
          },
          {
            titulo: "Métricas y snapshot (H27)",
            bloques: [
              {
                tipo: "tabla",
                cabeceras: ["Métrica", "Fórmula"],
                filas: [
                  ["Precisión SKU", "(SKUs exactos / contados)×100"],
                  ["Precisión cantidad", "(unidades correctas / contadas)×100"],
                  ["Exactitud ubicación", "(ubicaciones sin diferencia / contadas)×100"],
                ],
              },
              {
                tipo: "nota",
                texto:
                  "Antes del fix, precisión siempre ~100% porque se calculaba contra saldo post-ajuste. Ahora al cerrar se congela. Verificado: 10900 vs 11000 → Faltante -100, SKU 0%, cantidad 99.1%.",
                tono: "warning",
              },
            ],
          },
        ],
      },
    ],
  },
  {
    titulo: "Parte 6 — Métricas, reportes, alertas y actividad",
    descripcion:
      "Dashboard, 10 reportes con gráficas y exportación, alertas con causa raíz y centro de actividad total.",
    capitulos: [
      {
        id: "m06-dashboard",
        titulo: "Dashboard",
        icono: "dashboard",
        resumen: "Foto del negocio en un vistazo: stock, alertas, movimientos de hoy y precisión.",
        terminosClave: ["saldo", "alerta", "precision-inventario", "merma"],
        relacionados: ["m06-reportes", "m06-alertas"],
        secciones: [
          {
            titulo: "Indicadores clave",
            bloques: [
              {
                tipo: "tabla",
                cabeceras: ["Indicador", "Qué muestra"],
                filas: [
                  ["SKUs activos", "Productos activos en catálogo."],
                  ["Unidades totales", "Suma en UOM base de todo el stock."],
                  [
                    "Valor del inventario",
                    "Costo promedio o costo de entrada (configurable, valor financiero informativo).",
                  ],
                  [
                    "Alertas activas",
                    "Alertas en estado ABIERTA (stock bajo, vencimientos, pendientes).",
                  ],
                  ["Movimientos de hoy", "Movimientos con fecha_movimiento de hoy."],
                  [
                    "Precisión última sesión",
                    "Por SKU de última sesión CERRADA o Sin sesiones cerradas.",
                  ],
                  ["Ocupación ubicaciones", "% ubicaciones con stock sobre total ubicaciones."],
                ],
              },
            ],
          },
          {
            titulo: "Indicadores adicionales y KPIs (16.3)",
            bloques: [
              {
                tipo: "tabla",
                cabeceras: ["Indicador", "Qué muestra"],
                filas: [
                  [
                    "Tasa de merma",
                    "% unidades merma sobre entradas (unidades merma / entradas ×100). Informativo.",
                  ],
                  [
                    "Lotes vencidos sin dar de baja",
                    "Con vencimiento pasado y saldo >0. Debe tender a 0.",
                  ],
                  [
                    "Rotación",
                    "Rotación de stock = salidas del periodo / stock promedio. Informativo.",
                  ],
                  [
                    "Días de cobertura",
                    "Días cobertura = stock / consumo diario promedio. Informativo.",
                  ],
                  [
                    "Antigüedad del stock",
                    "Días promedio desde última entrada por lote. Detecta obsolescencia.",
                  ],
                ],
              },
              {
                tipo: "lista",
                items: [
                  "Movimientos recientes: 5 más recientes por fecha_movimiento (número, tipo, fecha, estado), fila navega al detalle. Botón Nuevo movimiento en cabecera.",
                ],
              },
              {
                tipo: "nota",
                texto:
                  "KPIs 16.3 completos: Precisión SKU ≥95%, por cantidad ≥98%, exactitud ubicación ≥90%, Rotación, Días cobertura, Tasa merma, Lotes vencidos sin baja, Antigüedad stock. La precisión se mide por sesión y su evolución en /reportes/precision.",
                tono: "info",
              },
            ],
          },
        ],
      },
      {
        id: "m06-reportes",
        titulo: "Reportes por área (10 informes)",
        icono: "reportes",
        resumen:
          "Stock, movimientos, entradas, salidas, mermas, vencimientos, kardex, precisión, auditoría y usuarios. Filtros, gráficas CSS puras y export.",
        terminosClave: ["kardex", "trazabilidad", "saldo", "auditoria"],
        relacionados: ["m06-dashboard", "m08-consulta"],
        secciones: [
          {
            titulo: "Catálogo de reportes",
            bloques: [
              {
                tipo: "tabla",
                cabeceras: ["Reporte", "Ruta", "Filtros / gráfica típica"],
                filas: [
                  [
                    "Stock actual",
                    "/reportes/stock",
                    "Por producto/categoría/ubicación/lote; tabla agregada + detalle; export.",
                  ],
                  [
                    "Movimientos por periodo",
                    "/reportes/movimientos",
                    "Por tipo/estado/sub_tipo/usuario/proveedor/cliente/fecha; totales group_by tipo; gráfica 30 días; export.",
                  ],
                  ["Entradas del periodo", "/reportes/entradas", "tipo=ENTRADA + proveedor."],
                  ["Salidas del periodo", "/reportes/salidas", "tipo=SALIDA + cliente."],
                  ["Mermas y ajustes", "/reportes/mermas-ajustes", "sub_tipo IN MERMA/AJUSTE."],
                  [
                    "Kardex",
                    "/reportes/kardex",
                    "Por producto/lote: movimientos con saldo acumulado.",
                  ],
                  ["Vencimientos", "/reportes/vencimientos", "30/60/90 días y vencidos."],
                  [
                    "Precisión por sesión",
                    "/reportes/precision",
                    "3 métricas por sesión cerrada + evolución.",
                  ],
                  [
                    "Auditoría",
                    "/reportes/auditoria",
                    "Por usuario/nivel/fechas/comando/entidad; incluye tipo_evento/modulo.",
                  ],
                  [
                    "Desempeño de usuarios",
                    "/reportes/usuarios",
                    "Nº movimientos group_by created_by.",
                  ],
                ],
              },
              {
                tipo: "nota",
                texto:
                  "Gráficas en CSS puro (sin librería pesada): .chart columnas y .chart-row barras horizontales.",
                tono: "info",
              },
            ],
          },
          {
            titulo: "Cómo filtrar y exportar (ver Parte 8)",
            bloques: [
              {
                tipo: "lista",
                items: [
                  "Todo reporte usa motor universal (15) con deep-link en URL.",
                  "Exportar CSV (separador ; + BOM UTF-8 es-ES) o JSON con nombreExportacion. Requiere permiso exportar.",
                ],
              },
            ],
          },
        ],
      },
      {
        id: "m06-alertas",
        titulo: "Alertas y notificaciones",
        icono: "alerta",
        resumen: "7 tipos que se regeneran solos y enlazan a la causa raíz. Archivar sin reabrir.",
        terminosClave: ["alerta", "stock-minimo", "vencimiento"],
        relacionados: ["m06-dashboard", "m05-diferencias"],
        secciones: [
          {
            titulo: "Tipos",
            bloques: [
              {
                tipo: "tabla",
                cabeceras: ["Alerta", "Cuándo"],
                filas: [
                  ["Stock bajo", "Suma ubicaciones ≤ stock_minimo."],
                  ["Stock excedido", "Saldo > stock_maximo."],
                  ["Sobrecapacidad", "Intentar ingresar > capacidad_maxima."],
                  ["Lote por vencer", "Vencimiento en próximos N días (dias_aviso)."],
                  ["Lote vencido", "Vencimiento pasado con saldo >0."],
                  ["Diferencia de inventario", "Sesión con diferencias."],
                  ["Pendiente de aprobación", "Existe movimiento PENDIENTE."],
                ],
              },
            ],
          },
          {
            titulo: "Reglas",
            bloques: [
              {
                tipo: "tabla",
                cabeceras: ["Propiedad", "Valor"],
                filas: [
                  ["Severidad", "INFO, MEDIA, ALTA."],
                  ["Estado", "ABIERTA, RESUELTA, IGNORADA (Archivada)."],
                  ["Visibilidad", "Solo quien tiene ver sobre la entidad."],
                  ["Regeneración", "Perezosa en cada listar. IGNORADA no reabre."],
                  [
                    "Resolución real",
                    "La condición desaparece haciendo la acción de negocio, no pulsando Resolver. Por eso el botón es Archivar.",
                  ],
                ],
              },
              {
                tipo: "lista",
                items: [
                  "Cada alerta tiene entidad/entidad_id para enlazar a detalle: producto→/productos/:id, lote→/lotes/:id, etc.",
                  "En /alertas: columna Entidad enlazada + solo botón Archivar (XCircle) con toast por tipo que explica la acción real. Fila desaparece por optimistic update.",
                ],
              },
            ],
          },
        ],
      },
      {
        id: "m06-historial",
        titulo: "Centro de actividad e historial",
        icono: "historial",
        resumen:
          "Tracking total: comandos + vistas con módulo, proceso, tenant, duración y tiempo local.",
        terminosClave: ["auditoria", "trazabilidad"],
        relacionados: ["m00-roles", "m06-reportes"],
        secciones: [
          {
            titulo: "Qué se registra",
            bloques: [
              {
                tipo: "lista",
                items: [
                  "Todo comando (COMANDO) con actor, módulo, proceso, tenant, duración y metadatos JSON.",
                  "Toda vista de página (VISTA) vía registrar_vista: ruta, módulo, proceso, duración vista (sendBeacon), hora_local 0–23 y día_semana 1–7, metadatos y cliente_info.",
                ],
              },
            ],
          },
          {
            titulo: "Métricas y página /historial",
            bloques: [
              {
                tipo: "lista",
                items: [
                  "Comando metricas_actividad (gate reporte:ver): resumen, desgloses por módulo/día/hora/día semana/usuario/proceso, top rutas e insights automáticos (hora pico, módulo dominante, tendencia 7 días).",
                  "Comando listar_historial paginado (page/page_size máx 200, -1=export tope 5000; filtros combinables) → Paginado<EventoAuditoria>.",
                  "Página /historial como centro de actividad: filtros periodo/usuario/tipo/módulo/resultado/comando, 6 KPIs, tarjeta Perspectiva con insights, gráficas CSS y tabla eventos paginada con export.",
                ],
              },
            ],
          },
        ],
      },
    ],
  },
  {
    titulo: "Parte 7 — Procesos de extremo a extremo",
    descripcion:
      "6 casos de uso completos: qué necesitas, pasos click a click, qué ocurre en el sistema y reglas.",
    capitulos: [
      {
        id: "m07-recepcion",
        titulo: "Recepción de mercancía de proveedor",
        icono: "entrada",
        resumen: "De la OC a stock disponible: crear entrada de compra y aprobar.",
        paraQueSirve: "Registrar fielmente lo que entra y dejar trazado su origen.",
        terminosClave: ["entrada", "proveedor", "lote", "capacidad-maxima"],
        relacionados: ["m04-entradas", "m03-producto"],
        secciones: [
          {
            titulo: "Qué necesitas",
            bloques: [
              {
                tipo: "lista",
                items: [
                  "Producto activo, proveedor activo, ubicación activa con capacidad suficiente, lote (si producto controla_lote, y vencimiento si controla_vencimiento).",
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
                  "Crea movimiento ENTRADA / COMPRA en /movimientos/nuevo: selecciona proveedor y documento_referencia (nº OC).",
                  "Agrega líneas: producto, lote (existente o nuevo), cantidad>0 y ubicación destino. Puedes dividir en varios lotes/ubicaciones.",
                  "Valida: producto activo, lote sin vencer, destino mismo almacén, capacidad, controla_lote.",
                  "Guarda (nace BORRADOR). Envía a aprobación si tu rol no puede aprobar o si requiere_aprobacion.",
                  "ENCARGADO/GERENTE aprueba en /movimientos/:id/aprobar → stock incrementa atómico en destino.",
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
                  "Movimiento pasa a APROBADO (único que altera saldos). Saldos destino incrementan; actualización atómica.",
                ],
              },
            ],
          },
          {
            titulo: "Reglas",
            bloques: [
              {
                tipo: "nota",
                texto:
                  "Compra con producto inactivo o lote vencido se rechaza. Si llega más de lo registrado, ajusta cantidad aún editable (no aprobado) o crea movimiento nuevo.",
                tono: "warning",
              },
            ],
          },
        ],
      },
      {
        id: "m07-despacho",
        titulo: "Despacho a cliente",
        icono: "salida",
        resumen: "De la necesidad a la salida trazable: FIFO/FEFO y validación de saldo.",
        paraQueSirve: "Despachar lo correcto, con rotación sana y sin dejar saldo negativo.",
        terminosClave: ["salida", "cliente", "fifo", "fefo", "saldo"],
        relacionados: ["m04-salidas", "m04-fifo"],
        secciones: [
          {
            titulo: "Pasos",
            bloques: [
              {
                tipo: "pasos",
                pasos: [
                  "Crea SALIDA / CLIENTE en /movimientos/nuevo: líneas producto/cantidad/cliente + origen.",
                  "Usa Sugerir FIFO/FEFO: elige producto+cantidad, el sistema propone lotes/ubicaciones.",
                  "Valida saldo suficiente; si no, indica dónde hay stock.",
                  "Aprobar → decrementa atómico; queda trazado el origen.",
                ],
              },
            ],
          },
          {
            titulo: "Reglas",
            bloques: [
              {
                tipo: "nota",
                texto:
                  "Lote vencido no sale a cliente ni a devolución proveedor; solo MERMA/AJUSTE_NEGATIVO. Política aplica dentro de ubicación origen.",
                tono: "warning",
              },
            ],
          },
        ],
      },
      {
        id: "m07-traslado",
        titulo: "Traslado interno",
        icono: "traslado",
        resumen:
          "Mover entre ubicaciones sin alterar el total del almacén, con validación atómica.",
        terminosClave: ["traslado", "ubicacion-bin", "caja"],
        relacionados: ["m04-traslados", "m02-ubicacion"],
        secciones: [
          {
            titulo: "Pasos",
            bloques: [
              {
                tipo: "pasos",
                pasos: [
                  "Crea TRASLADO en /movimientos/nuevo traslado: producto (+lote), cantidad, origen y destino (no misma ubicación), caja_origen/destino si aplica.",
                  "Valida coherencia, saldo origen, capacidad destino, caja restringida y mismo almacén (o inter-almacén).",
                  "Aprobar → salida origen + entrada destino atómicas. Historial de caja/ubicación refleja nuevo contenido.",
                ],
              },
            ],
          },
          {
            titulo: "Inter-almacén",
            bloques: [
              {
                tipo: "texto",
                texto:
                  "Si origen y destino son almacenes distintos, el sistema registra dos movimientos ligados mismo numero/documento_referencia (TRASLADO_SALIDA origen + TRASLADO_ENTRADA destino, cada uno BORRADOR y aprobado por separado, transaccional sin huérfanos).",
              },
            ],
          },
        ],
      },
      {
        id: "m07-inventario-proc",
        titulo: "Inventario físico cíclico",
        icono: "inventario",
        resumen: "Del plan al cierre con precisión medida: contar, diferencias y ajustes auto.",
        terminosClave: [
          "sesion-inventario",
          "conteo-ciego",
          "diferencia-inventario",
          "precision-inventario",
        ],
        relacionados: ["m05-sesion", "m05-diferencias"],
        secciones: [
          {
            titulo: "Pasos",
            bloques: [
              {
                tipo: "pasos",
                pasos: [
                  "ENCARGADO planea sesión CICLICO en /inventario/nuevo con almacén+alcance, fecha_inicio (vacía→PLANEADA, con valor→EN_CURSO), conteo_ciego y exige_doble_conteo.",
                  "Si PLANEADA, inicia con botón en detalle (iniciar_sesion_inventario → EN_CURSO).",
                  "OPERADORES registran conteos en /inventario/:id/conteos (ubicación/producto/lote/cantidad 0 si ausente/nº/ nota).",
                  "Revisar diferencias en detalle y cerrar en /inventario/:id/cerrar (solo inventario:cerrar). Al cerrar genera ajustes y snapshot.",
                ],
              },
            ],
          },
        ],
      },
      {
        id: "m07-devolucion",
        titulo: "Devolución de cliente",
        icono: "entrada",
        resumen:
          "Entrada por devolución hacia ubicación DEVOLUCION, trazada sin reabrir la salida original.",
        terminosClave: ["entrada", "cliente", "lote", "ubicacion-bin"],
        relacionados: ["m04-entradas", "m07-despacho"],
        secciones: [
          {
            titulo: "Pasos",
            bloques: [
              {
                tipo: "pasos",
                pasos: [
                  "Crea ENTRADA / DEVOLUCION_CLIENTE hacia ubicación tipo DEVOLUCION.",
                  "Si controla lote, registra lote origen o crea con vencimiento informado.",
                  "Referencia salida original vía documento_referencia si quieres (no reabre).",
                  "Aprobar → incrementa en devoluciones, disponible para inspección; si es merma luego se da de baja por MERMA.",
                ],
              },
            ],
          },
        ],
      },
      {
        id: "m07-merma",
        titulo: "Merma por daño",
        icono: "salida",
        resumen: "Salida por pérdida con motivo obligatorio y tasa de merma al día.",
        terminosClave: ["merma", "ajuste", "salida"],
        relacionados: ["m04-salidas", "m06-dashboard"],
        secciones: [
          {
            titulo: "Pasos",
            bloques: [
              {
                tipo: "pasos",
                pasos: [
                  "Detectas caja dañada en ubicación.",
                  "Crea SALIDA / MERMA con motivo obligatorio (daño, humedad…) + comentario.",
                  "ENCARGADO aprueba → decrementa lote/ubicación; suma a tasa de merma.",
                  "El vencido sin dar de baja llega a 0 al darlo de baja por merma.",
                ],
              },
              {
                tipo: "nota",
                texto:
                  "Lote vencido solo puede salir por MERMA o AJUSTE_NEGATIVO. Ver reporte de mermas y dashboard.",
                tono: "info",
              },
            ],
          },
        ],
      },
    ],
  },
  {
    titulo: "Parte 8 — Anexos y reglas transversales",
    descripcion:
      "Consulta universal, trazabilidad, comentarios, fechas, matriz y checklist no negociable.",
    capitulos: [
      {
        id: "m08-consulta",
        titulo: "Consulta universal (SPEC 15)",
        icono: "buscar",
        resumen:
          "Todo listado es filtrable, ordenable, buscable, paginable, seleccionable, agregable y exportable.",
        terminosClave: ["consulta-universal", "producto-sku", "codigo-barras"],
        relacionados: ["m06-reportes", "m08-trazabilidad"],
        secciones: [
          {
            titulo: "Parámetros y combinación",
            bloques: [
              {
                tipo: "tabla",
                cabeceras: ["Parámetro", "Descripción", "Ejemplo"],
                filas: [
                  [
                    "page / page_size",
                    "Paginación 1-indexed; máx 200; -1 = todo con tope.",
                    "page=2&page_size=50",
                  ],
                  [
                    "sort",
                    "Campo ascendente, -campo descendente; múltiple.",
                    "sort=producto.nombre,-created_at",
                  ],
                  [
                    "q",
                    "Texto libre case-insensitive; SKU/codigo_barras prioritario.",
                    "q=REF- tornillo",
                  ],
                  [
                    "filters",
                    "Repetible campo:operador:valor; filter_logic AND/OR.",
                    "producto.categoria_id:eq:ID",
                  ],
                  ["fields", "Proyección: solo esos campos.", "fields=codigo,nombre"],
                  [
                    "group_by + aggregations",
                    "Agregación: sum, count, avg, min, max.",
                    "group_by=tipo&aggregations=count(*)",
                  ],
                  [
                    "export",
                    "true o csv/json; ignora paginación; requiere exportar.",
                    "export=csv",
                  ],
                ],
              },
              {
                tipo: "nota",
                texto:
                  "Todos los parámetros son combinables: filtrar + buscar + ordenar + agrupar en una sola petición.",
                tono: "info",
              },
            ],
          },
          {
            titulo: "Operadores de filtro",
            bloques: [
              {
                tipo: "tabla",
                cabeceras: ["Operador", "Significado", "Ejemplo"],
                filas: [
                  ["eq", "igual", "estado:eq:APROBADO"],
                  ["neq", "distinto", "activo:neq:false"],
                  ["gt / gte", "mayor / mayor o igual", "cantidad:gt:10"],
                  ["lt / lte", "menor / menor o igual", "fecha:lt:2026-01-01"],
                  ["in / nin", "en lista / no en lista", "tipo:in:ENTRADA,SALIDA"],
                  ["contains", "contiene", "nombre:contains:torre"],
                  ["starts / ends", "comienza / termina", "sku:starts:REF-"],
                  ["between", "entre", "fecha:between:2026-01-01,2026-01-31"],
                  ["is_null / not_null", "es nulo / no nulo", "lote_id:is_null:true"],
                ],
              },
              {
                tipo: "lista",
                items: [
                  "Fechas en ISO 8601, interpretadas en zona configurada.",
                  "ResourceSchema allowlist: columna fuera de lista → error FiltroInvalido, valor parametrizado.",
                ],
              },
            ],
          },
          {
            titulo: "Respuestas y rendimiento",
            bloques: [
              {
                tipo: "texto",
                texto:
                  "Colección: { data[], meta{total, page, page_size, total_pages, has_next, has_prev} }. Agregación: { groups[{key, count, sum_cantidad…}], meta }.",
              },
              {
                tipo: "lista",
                items: [
                  "Todo campo en filters/sort/group_by está indexado (instantáneo).",
                  "Saldos materializados para stock instantáneo.",
                ],
              },
            ],
          },
          {
            titulo: "Deep-link y URL",
            bloques: [
              {
                tipo: "lista",
                items: [
                  "Filtros/orden/búsqueda/paginación viven en query params: compartir URL reproduce estado exacto.",
                  "Favoritos de filtros persisten y aplican el conjunto.",
                ],
              },
            ],
          },
        ],
      },
      {
        id: "m08-trazabilidad",
        titulo: "Histórico y trazabilidad",
        icono: "historial",
        resumen: "Líneas de tiempo y las 5 consultas que todo auditor te pedirá.",
        terminosClave: ["trazabilidad", "lote", "movimiento", "kardex"],
        relacionados: ["m08-consulta", "m06-historial"],
        secciones: [
          {
            titulo: "Líneas de tiempo",
            bloques: [
              {
                tipo: "tabla",
                cabeceras: ["De qué", "Qué devuelve"],
                filas: [
                  ["Producto", "Todos los movimientos cronológicos que lo afectaron."],
                  [
                    "Ubicación",
                    "Qué productos/lotes pasaron, cuándo, con qué movimiento/autor; saldo actual.",
                  ],
                  ["Movimiento", "Creado/aprobado/anulado por, historial y movimiento inverso."],
                ],
              },
            ],
          },
          {
            titulo: "5 consultas de trazabilidad (SPEC 13.4)",
            bloques: [
              {
                tipo: "tabla",
                cabeceras: ["Pregunta", "Cómo"],
                filas: [
                  ["¿Dónde está ahora el lote X?", "donde_esta_lote → ubicaciones + cantidades."],
                  [
                    "¿De dónde vino la unidad despachada hoy?",
                    "origen_de_salida → salida → entrada/traslado origen.",
                  ],
                  [
                    "¿Quién tocó el producto Y la semana pasada?",
                    "movimientos_de_producto_en_rango + autores.",
                  ],
                  ["¿Cuánto vence en 30 días?", "lotes_por_vencer + stock."],
                  ["¿Dónde estuvo la caja Z?", "historial_caja → traslados."],
                ],
              },
              {
                tipo: "lista",
                items: [
                  "Todas filtrables/ordenables/buscables/paginables (15). Implementadas en repo/trazabilidad.rs.",
                ],
              },
            ],
          },
        ],
      },
      {
        id: "m08-comentarios",
        titulo: "Comentarios",
        icono: "comentario",
        resumen: "Notas ancladas a cualquier entidad, con historial y ocultado sin borrado.",
        terminosClave: ["auditoria"],
        relacionados: ["m04-modelo", "m08-trazabilidad"],
        secciones: [
          {
            titulo: "Modelo y reglas",
            bloques: [
              {
                tipo: "tabla",
                cabeceras: ["Campo", "Regla"],
                filas: [
                  [
                    "entidad / entidad_id",
                    "Producto, movimiento, ubicación, lote, sesión, proveedor, cliente, caja…",
                  ],
                  ["usuario_id / texto / created_at", "Autor, requerido, fecha."],
                  [
                    "editado / oculto",
                    "Edición guarda anterior en comentario_historial; ocultar pone oculto_by/at.",
                  ],
                  ["allow", "Requiere ver sobre entidad + comentario:crear."],
                ],
              },
              {
                tipo: "lista",
                items: [
                  "Se puede comentar sobre movimiento aprobado o sesión de inventario.",
                  "No se eliminan; solo oculto. Visibles para quien tiene ver.",
                ],
              },
              {
                tipo: "nota",
                texto:
                  "Panel de comentarios en MovimientoDetallePage y SesionInventarioDetallePage: lista + formulario al pie (sin modal).",
                tono: "info",
              },
            ],
          },
        ],
      },
      {
        id: "m08-transversales",
        titulo: "Reglas transversales",
        icono: "alerta",
        resumen:
          "Integridad, saldo nunca negativo, código barras, fechas, borrado lógico, concurrencia y normalización.",
        terminosClave: ["desactivar", "codigo-barras", "saldo"],
        relacionados: ["m01-stock", "m08-consulta"],
        secciones: [
          {
            titulo: "Integridad y saldos",
            bloques: [
              {
                tipo: "lista",
                items: [
                  "Integridad referencial: sin huérfanas; con historia se desactiva, sin historia permite borrado físico con confirmación+auditoría.",
                  "Saldo nunca negativo: validación atómica al aprobar; error claro con ubicación/disponible/intentado.",
                  "Saldo derivado 100% de movimientos aprobados; no existe cifra sin respaldo.",
                ],
              },
            ],
          },
          {
            titulo: "Código de barras y escáner",
            bloques: [
              {
                tipo: "lista",
                items: [
                  "Acepta producto/caja/ubicación etiquetados si tienen código. Desconocido → error + sugerencia búsqueda.",
                  "Nunca crea datos solo; alimenta el formulario.",
                ],
              },
            ],
          },
          {
            titulo: "Fechas y zona horaria",
            bloques: [
              {
                tipo: "lista",
                items: [
                  "Almacenadas en UTC, mostradas en zona configurada.",
                  "fecha_movimiento (hecho) ≠ created_at (registro).",
                  "Reportes diarios/mensuales usan zona configurada como frontera.",
                ],
              },
            ],
          },
          {
            titulo: "Borrado, concurrencia y normalización",
            bloques: [
              {
                tipo: "lista",
                items: [
                  "Borrado lógico por activo/estado; historial nunca se purga automáticamente.",
                  "Concurrencia: validación saldo atómica; segunda operación ve nuevo saldo o falla. Sesión EN_CURSO bloquea ajustes manuales.",
                  "Nomenclatura: codigo/sku normalizados mayúsculas trim, únicos por contexto. Búsqueda case-insensitive con tolerancia acentos.",
                ],
              },
            ],
          },
        ],
      },
      {
        id: "m08-atajos",
        titulo: "Atajos, búsqueda y zero-modals",
        icono: "buscar",
        resumen: "Diseño que exige una página por acción: sin modales, todo deep-link.",
        terminosClave: ["consulta-universal"],
        relacionados: ["m00-personalizacion", "m08-consulta"],
        secciones: [
          {
            titulo: "Zero modals (DESIGN 5)",
            bloques: [
              {
                tipo: "lista",
                items: [
                  "No existen modales/popovers/tooltips de bloqueo/drawers/confirm flotantes ni alert/confirm/prompt.",
                  "Ver/crear/editar/eliminar son páginas con URL propia: /recursos, /recursos/nuevo, /recursos/:id, /recursos/:id/editar, /recursos/:id/eliminar.",
                  "Eliminar/anular/aprobar/cerrar viven en página de confirmación propia con consecuencias y botón peligro solo habilitado si es posible+autorizado.",
                  "Todo dato identificable es enlace a su detalle. Al guardar: nuevo→detalle+toast; edición→detalle; cancelar→padre.",
                ],
              },
              {
                tipo: "nota",
                texto:
                  "Palette Ctrl+K es navegación pura (panel flotante), no modal de edición: por eso convive con la regla.",
                tono: "info",
              },
            ],
          },
          {
            titulo: "Buscar en todo (Ctrl+K)",
            bloques: [
              {
                tipo: "lista",
                items: [
                  "Fuzzy multi-término con sinónimos del dominio, boost por historial e intención, relevancia multi-columna.",
                  "Comandos estáticos: Páginas (NAV_GROUPS + perfil/glosario/10 reportes), Acciones (gatadas por rol), Ayuda (26 guías + 46 términos), Manual (50 capítulos + glosario). Datos en vivo vía comando buscar Rust (permisionado, debounce 250 ms, q≥2).",
                  "Búsqueda q en listados (15.4): case-insensitive, SKU/codigo_barras prioritarios, múltiples términos todos deben coincidir.",
                ],
              },
            ],
          },
        ],
      },
      {
        id: "m08-checklist",
        titulo: "Checklist no negociable (SPEC 19)",
        icono: "aprobar",
        resumen: "14 reglas que hacen que tu inventario sea auditable.",
        terminosClave: ["movimiento", "saldo", "auditoria"],
        relacionados: ["m04-modelo", "m08-transversales"],
        secciones: [
          {
            titulo: "Las 14",
            bloques: [
              {
                tipo: "lista",
                items: [
                  "Toda alteración de stock por movimiento con tipo, motivo y autor.",
                  "Ningún saldo queda negativo.",
                  "Movimiento aprobado inmutable; anular genera inverso (nunca deshace).",
                  "Todo listado filtrable/ordenable/buscable/paginable/seccionable.",
                  "Todo listado tiene agregaciones y exportación.",
                  "Campos consultables indexados para rendimiento.",
                  "Todo cambio queda en auditoría (quién/qué/cuándo/dónde).",
                  "Entidades con historia se desactivan, no se borran.",
                  "Productos controla_lote exigen lote en todos los movimientos.",
                  "Lotes vencidos nunca salen a cliente; solo merma/ajuste.",
                  "Precisión se mide, reporta y es consultable.",
                  "Fechas con zona horaria; fecha_movimiento ≠ created_at.",
                  "Saldo derivado de movimientos: sin cifra sin respaldo.",
                  "Matriz permisos en toda operación sin excepción.",
                  "Conteo ciego no muestra saldos al contador cuando está activo.",
                ],
              },
              {
                tipo: "nota",
                texto:
                  "Si alguna falla, corrige el proceso antes de cargar más stock. Esa es la diferencia entre un inventario creíble y uno que no lo es.",
                tono: "success",
              },
            ],
          },
        ],
      },
      {
        id: "m08-extensiones",
        titulo: "Fuera de alcance (SPEC 20) y roadmap",
        icono: "ayuda",
        resumen: "Qué no hace Rustock hoy a propósito y qué no romperá el modelo cuando llegue.",
        relacionados: ["m08-checklist"],
        secciones: [
          {
            titulo: "8 extensiones documentadas (fuera de alcance v1)",
            bloques: [
              {
                tipo: "tabla",
                cabeceras: ["Extensión", "Estado hoy"],
                filas: [
                  [
                    "Reservas / stock comprometido",
                    "Campo listo; disponible = registrado en v1. Sin reservas reales.",
                  ],
                  [
                    "Pedidos (órdenes venta/compra)",
                    "Agrupan líneas y generan movimientos; aún no existen como entidad.",
                  ],
                  [
                    "Multi-rol por usuario",
                    "Exactamente un rol por usuario; futuro varios roles + permisos finos por recurso.",
                  ],
                  [
                    "Integraciones opcionales",
                    "Hardware escáner, QR, email alertas como plugins opcionales, siempre a elección del dueño.",
                  ],
                  [
                    "Multi-sede completo",
                    "Traslados inter-almacén ya modelados (dos movimientos ligados); falta valorización y reportes consolidados.",
                  ],
                  [
                    "Valorización inventario",
                    "Método configurable (promedio, FIFO, último costo). Hoy sin valorización; solo stock físico.",
                  ],
                  [
                    "API pública externa",
                    "Mismo estándar de consulta universal (15) para consumidores externos, aún no expuesta.",
                  ],
                  [
                    "Auditoría de accesos (quién vio qué)",
                    "Hoy solo se audita lo que altera datos (crear/editar/aprobar/anular/ejecutar) y los intentos denegados (403). La auditoría de lectura (quién vio qué) queda para futuro.",
                  ],
                ],
              },
              {
                tipo: "nota",
                texto:
                  "Todo lo del manual es lo que ya puedes operar hoy, verificado contra código ejecutable y 121 tests. Lo de esta tabla no romperá el modelo cuando se implemente.",
                tono: "info",
              },
            ],
          },
        ],
      },
      {
        id: "m08-glosario",
        titulo: "Glosario completo",
        icono: "ayuda",
        resumen: "50 términos con definición operativa y ancla directa para enlaces.",
        terminosClave: ["producto-sku"],
        relacionados: ["m01-glosario"],
        secciones: [
          {
            titulo: "Cómo usar este glosario",
            bloques: [
              {
                tipo: "texto",
                texto:
                  "Cada término tiene un id estable (ej. saldo, fefo, movimiento-inverso) usable como ancla /manual/m08-glosario#saldo. Las guías del manual enlazan aquí vía terminosClave.",
              },
              {
                tipo: "nota",
                texto:
                  "Definiciones alineadas a SPEC 2 y a la implementación real (tipos en domain). Sin jerga fuera de dominio.",
                tono: "info",
              },
            ],
          },
        ],
      },
    ],
  },
];
