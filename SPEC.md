# SPEC.md — Rustock

> **Sistema de gestión de inventario / mini-WMS self-hosted, todo incluido.**
> Este documento define **exclusivamente la lógica de negocio** de Rustock. No contiene detalles de implementación técnica (framework, base de datos, arquitectura interna), salvo lo mínimo necesario para dejar innegociables las reglas de comportamiento del dominio.

---

## Tabla de contenido

1. [Visión general](#1-visión-general)
2. [Glosario de términos](#2-glosario-de-términos)
3. [Entidades maestras](#3-entidades-maestras)
   - 3.1 Almacén
   - 3.2 Zona
   - 3.3 Rack / Estantería
   - 3.4 Sección
   - 3.5 Ubicación (bin)
   - 3.6 Caja
   - 3.7 Producto / SKU
   - 3.8 Categoría
   - 3.9 Unidad de medida (UOM)
   - 3.10 Proveedor
   - 3.11 Cliente
   - 3.12 Lote
   - 3.13 Reglas de jerarquía y composición
4. [Usuarios, roles y permisos](#4-usuarios-roles-y-permisos)
   - 4.1 Usuario
   - 4.2 Roles por defecto
   - 4.3 Permisos granulares
   - 4.4 Matriz de permisos
   - 4.5 Auditoría de quién hace qué
5. [Stock y saldos](#5-stock-y-saldos)
   - 5.1 Concepto de stock
   - 5.2 Saldo por ubicación
   - 5.3 Stock disponible vs. stock físico
   - 5.4 Mínimos y máximos
   - 5.5 Precisión de inventario
6. [Movimientos (núcleo del sistema)](#6-movimientos-núcleo-del-sistema)
   - 6.1 Modelo general de movimiento
   - 6.2 Ciclo de vida / estados
   - 6.3 Inmutabilidad y registro histórico
   - 6.4 Atributos de auditoría de cada movimiento
7. [Entradas](#7-entradas)
   - 7.1 Tipos de entrada
   - 7.2 Recepción de compra
   - 7.3 Entrada por devolución
   - 7.4 Entrada por ajuste positivo
   - 7.5 Entrada inicial (apertura de inventario)
8. [Salidas](#8-salidas)
   - 8.1 Tipos de salida
   - 8.2 Despacho a cliente
   - 8.3 Devolución a proveedor
   - 8.4 Salida por merma
   - 8.5 Salida por ajuste negativo
   - 8.6 Política de salida (FIFO / FEFO / lote específico)
9. [Traslados](#9-traslados)
   - 9.1 Traslado entre ubicaciones
   - 9.2 Traslado entre cajas
   - 9.3 Traslado entre almacenes
10. [Ajustes de stock](#10-ajustes-de-stock)
    - 10.1 Ajuste por corrección
    - 10.2 Ajuste por merma / sobrante
    - 10.3 Reglas de validación
11. [Inventario físico y conteo](#11-inventario-físico-y-conteo)
    - 11.1 Sesión de inventario
    - 11.2 Conteo completo vs. cíclico
    - 11.3 Doble conteo / recuento
    - 11.4 Registro de conteo
    - 11.5 Diferencias y conciliación
    - 11.6 Precisión del inventario (métricas)
12. [Comentarios](#12-comentarios)
    - 12.1 Modelo de comentario
    - 12.2 Comentarios anclados a entidades
    - 12.3 Reglas de comentarios
13. [Histórico y trazabilidad](#13-histórico-y-trazabilidad)
    - 13.1 Línea de tiempo de un producto
    - 13.2 Línea de tiempo de una ubicación
    - 13.3 Línea de tiempo de un movimiento
    - 13.4 Consultas de trazabilidad
14. [Reglas de negocio transversales](#14-reglas-de-negocio-transversales)
    - 14.1 Integridad referencial
    - 14.2 Consistencia de saldos (el saldo nunca puede ser negativo)
    - 14.3 Código de barras / lectura
    - 14.4 Fechas y zona horaria
    - 14.5 Borrado lógico
    - 14.6 Concurrencia
    - 14.7 Nomenclatura / normalización
15. [Estándar universal de consulta (Endpoints)](#15-estándar-universal-de-consulta-endpoints)
    - 15.1 Principio: todo listado es filtrable, ordenable, buscable, paginable y seccionable
    - 15.2 Paginación
    - 15.3 Ordenamiento
    - 15.4 Búsqueda
    - 15.5 Filtros
    - 15.6 Selección de campos (projection)
    - 15.7 Agregaciones
    - 15.8 Exportación
    - 15.9 Parámetros comunes y combinación
    - 15.10 Formato de respuesta unificado
16. [Métricas, reportes y análisis](#16-métricas-reportes-y-análisis)
    - 16.1 Dashboard
    - 16.2 Reportes por área
    - 16.3 KPI definidos
17. [Alertas y notificaciones](#17-alertas-y-notificaciones)
    - 17.1 Tipos de alertas
    - 17.2 Reglas de alertas
18. [Reglas de negocio de extremo a extremo (casos de uso)](#18-reglas-de-negocio-de-extremo-a-extremo-casos-de-uso)
    - 18.1 Recepción de mercancía de un proveedor
    - 18.2 Despacho de un pedido a cliente
    - 18.3 Traslado interno de mercancía
    - 18.4 Inventario físico cíclico
    - 18.5 Devolución de un cliente
    - 18.6 Merma detectada por daño
19. [Reglas de negocio no negociables (checklist)](#19-reglas-de-negocio-no-negociables-checklist)
20. [Futuras extensiones (fuera de alcance actual)](#20-futuras-extensiones-fuera-de-alcance-actual)

---

## 1. Visión general

**Rustock** es un sistema de gestión de inventario y almacén (mini-WMS) **self-hosted, todo incluido**, pensado para que una persona o una pequeña operación logística administre:

- **Qué** hay almacenado (productos, lotes, cantidades).
- **Dónde** está almacenado (almacén, zona, rack, sección, ubicación, caja).
- **Cuánto** hay (saldos, disponibles, mínimos, máximos).
- **Quién** lo mueve y **quién** lo gestiona (usuarios, roles, permisos).
- **Cuándo** ocurre cada cosa (marca de tiempo de cada evento).
- **Por qué** ocurre (tipos de movimiento, comentarios, motivos).
- **El historial completo** de todo (trazabilidad inmutable).

El sistema es **autosuficiente**: no requiere servicios externos, integraciones de terceros ni licencias. Corre completo en la infraestructura del dueño.

### 1.1 Objetivos del dominio

1. **Precisión**: el saldo registrado del sistema debe reflejar el stock físico real; se mide, se reporta y se persigue mejorar continuamente.
2. **Trazabilidad total**: cada cambio de stock tiene un movimiento único, fechado, atribuido a un usuario y con motivo explícito.
3. **Auditabilidad**: quién hizo qué, cuándo y dónde; nada se borra, todo queda registrado.
4. **Búsqueda universal**: cualquier lista es filtrable, ordenable, buscable, paginable y seccionable, con índices de alto rendimiento.
5. **Control por roles**: nadie puede hacer lo que su rol no le permite; las acciones sensibles exigen permisos específicos.

### 1.2 Principios rectores

- **Un movimiento, un hecho**: ninguna operación que altere stock se registra "a mano"; siempre pasa por el modelo de movimientos.
- **El saldo es derivado**: el saldo de una ubicación es la suma de sus movimientos; nunca existe una cifra "mágica" que no tenga respaldo en un movimiento.
- **Nada se destruye**: las entidades se desactivan o anulan, nunca se eliminan físicamente del historial.
- **Todo consultable**: no existe una pantalla o endpoint de datos sin filtros, orden, búsqueda y paginación.

---

## 2. Glosario de términos

| Término | Definición |
|---|---|
| **Almacén** | Entidad de nivel superior que contiene toda la operación de un sitio físico de almacenamiento. |
| **Zona** | División lógica o física dentro de un almacén (ej. "Frío", "Picking", "Recepción", "Cuarentena"). |
| **Rack / Estantería** | Estructura de almacenamiento dentro de una zona, identificada de forma única. |
| **Sección** | Subdivisión de un rack (ej. niveles A/B/C, pasillos). |
| **Ubicación (bin)** | Punto de almacenamiento concreto, direccionable, donde se deposita mercancía. |
| **Caja** | Contenedor físico dentro de una ubicación que agrupa stock de un producto/lote. |
| **Producto / SKU** | Artículo gestionado; unidad única de identificación de producto. |
| **Lote** | Conjunto de unidades de un producto con origen y fecha comunes (permite FEFO y trazabilidad). |
| **UOM** | Unidad de medida (pieza, caja, kg, m, litro, pallet...). |
| **Saldo** | Cantidad de stock de un producto en un punto concreto del sistema. |
| **Movimiento** | Registro inmutable de una alteración de stock, con tipo, cantidad, origen, destino, autor y fecha. |
| **Entrada** | Movimiento que incrementa stock. |
| **Salida** | Movimiento que decrementa stock. |
| **Traslado** | Movimiento que mueve stock de un punto a otro sin alterar el total del almacén. |
| **Ajuste** | Movimiento de corrección de saldo por causa justificada (merma, sobrante, error). |
| **Conteo** | Registro del inventario físico observado en una sesión de inventario. |
| **Sesión de inventario** | Proceso formal de conteo de todo o parte del almacén. |
| **Precisión de inventario** | Porcentaje de coincidencia entre stock registrado y stock físico. |
| **Stock físico** | Lo que realmente existe (observado por conteo). |
| **Stock en sistema** | Lo que el sistema cree que existe (saldo). |
| **Mínimo** | Cantidad por debajo de la cual se considera stock bajo. |
| **Máximo** | Cantidad objetivo que no se debe exceder en una ubicación/producto. |
| **Trazabilidad** | Capacidad de reconstruir la historia completa de un producto o ubicación. |
| **Conteo ciego** | Conteo sin mostrar el saldo del sistema al que cuenta (evita sesgo). |
| **FIFO** | First In, First Out: sale primero lo que entró primero. |
| **FEFO** | First Expired, First Out: sale primero lo que vence primero. |
| **SKU** | Stock Keeping Unit: identificador único del producto. |

---

## 3. Entidades maestras

### 3.1 Almacén

Un **Almacén** es la raíz del árbol físico. Toda la operación pertenece a exactamente un almacén.

**Atributos:**

| Campo | Tipo | Reglas |
|---|---|---|
| `id` | identificador | Único, inmutable. |
| `codigo` | texto | Único, requerido, normalizado a mayúsculas, sin espacios (ej. `ALM-PRINCIPAL`). |
| `nombre` | texto | Requerido, legible (ej. "Almacén Central"). |
| `descripcion` | texto | Opcional. |
| `activo` | booleano | Por defecto `true`. Un almacén inactivo no admite nuevos movimientos (salvo consultas). |
| `direccion` | texto | Opcional (contexto, no se usará para envíos en v1). |
| `created_at` | fecha-hora | Automático. |
| `updated_at` | fecha-hora | Automático. |
| `created_by` | referencia a usuario | Quién lo creó. |
| `updated_by` | referencia a usuario | Quién lo modificó por última vez. |

**Reglas:**
- Debe existir **al menos un almacén** para operar.
- El `codigo` no puede repetirse entre almacenes activos.
- Desactivar un almacén no elimina su historial.

### 3.2 Zona

Subdivisión lógica/física del almacén.

**Atributos:** `id`, `codigo` (único dentro del almacén, ej. `Z-01`), `nombre`, `descripcion`, `almacen_id`, `activo`, `created_at`, `updated_at`, `created_by`, `updated_by`.

**Reglas:**
- Pertenece a **exactamente un** almacén.
- `codigo` único dentro del mismo almacén.
- Una zona sin racks se puede eliminar solo si no tiene histórico de movimientos; si tiene, se desactiva.

### 3.3 Rack / Estantería

Estructura física dentro de una zona.

**Atributos:** `id`, `codigo` (único dentro del almacén, ej. `RACK-A1`), `nombre`, `tipo` (estantería, pallet, nevera, cajón...), `zona_id`, `pasillo_id` (opcional), `activo`, `created_at`, `updated_at`, `created_by`, `updated_by`.

**Reglas:**
- Pertenece a **exactamente una** zona.
- `codigo` único dentro del almacén.
- Un rack puede contener secciones y/o ubicaciones directas.
- Opcionalmente puede etiquetarse con un **pasillo** de esa misma zona (`pasillo_id`, §3.3b) para agrupación física; si se informa, debe pertenecer a la misma zona del rack. Esto es solo organizativo — no forma parte del árbol simplificado (§3.13), el rack siempre pertenece a su `zona_id`.

### 3.3b Pasillo

Subdivisión física de una zona que agrupa racks (un pasillo transitable entre estanterías).

**Atributos:** `id`, `codigo` (único dentro del almacén, ej. `PAS-01`), `nombre`, `zona_id`, `activo`, `created_at`, `updated_at`, `created_by`, `updated_by`.

**Reglas:**
- Pertenece a **exactamente una** zona.
- `codigo` único dentro del almacén.
- No participa del árbol simplificado (§3.13): un rack puede o no tener pasillo asignado, pero siempre pertenece a una zona.
- No se puede desactivar un pasillo si algún rack asignado a él tiene stock vigente en sus ubicaciones descendientes.

### 3.4 Sección

Subdivisión de un rack (niveles, bahías).

**Atributos:** `id`, `codigo` (único dentro del almacén, ej. `RACK-A1-N2`), `nombre`, `nivel` (opcional, texto/entero), `rack_id`, `descripcion`, `activo`, `created_at`, `updated_at`, `created_by`, `updated_by`.

**Reglas:**
- Pertenece a **exactamente un** rack.
- Puede contener ubicaciones.
- `codigo` único dentro del almacén (preferentemente derivado de la ruta del árbol).

### 3.5 Ubicación (bin)

Punto direccionable de almacenamiento. Es el nivel donde vive el stock.

**Atributos:**

| Campo | Tipo | Reglas |
|---|---|---|
| `id` | identificador | Único, inmutable. |
| `codigo` | texto | Único dentro del almacén, requerido (ej. `RACK-A1-N2-P3`). |
| `nombre` | texto | Opcional. |
| `seccion_id` | referencia | La sección a la que pertenece (o rack o zona si se simplifica el árbol). |
| `tipo` | enum | `STANDARD`, `PICKING`, `RESERVA`, `RECEPCION`, `CUARENTENA`, `DEVOLUCION`, `DANADO`, `EXPEDICION`. |
| `capacidad_maxima` | número | Opcional; cantidad máxima de unidades que admite (suma de UOM base). |
| `activo` | booleano | Por defecto `true`. |
| `created_at` / `updated_at` | fecha-hora | Automáticos. |
| `created_by` / `updated_by` | referencia a usuario | Auditoría. |

**Reglas:**
- Pertenece a **exactamente una** sección (o rack/zona si se usa árbol simplificado).
- El `codigo` debe ser **único y direccionable**; se recomienda codificación jerárquica.
- Una ubicación puede contener **múltiples productos y múltiples lotes** (stock mezclado permitido) salvo que `tipo` indique lo contrario.
- No se puede desactivar una ubicación con saldo > 0. Primero debe quedar en cero o trasladarse su contenido.

### 3.6 Caja

Contenedor físico opcional dentro de una ubicación que agrupa unidades.

**Atributos:** `id`, `codigo` (único dentro del almacén), `nombre`, `ubicacion_id`, `producto_id` (opcional; si se define, solo admite ese producto), `lote_id` (opcional; si se define, solo admite ese lote), `etiqueta` (texto, ej. código de barras), `activo`, `created_at`, `updated_at`, `created_by`, `updated_by`.

**Reglas:**
- Pertenece a **exactamente una** ubicación.
- Si `producto_id` está definido, **solo** puede contener ese producto.
- Si `lote_id` está definido, **solo** puede contener ese lote.
- Una caja no puede tener stock de más de un producto/lote si está "restringida".
- Mover una caja completa se modela como traslado de su contenido (o como cambio de `ubicacion_id` si es un "mover caja", que a su vez genera el movimiento de traslado).

### 3.7 Producto / SKU

El artículo gestionado.

**Atributos:**

| Campo | Tipo | Reglas |
|---|---|---|
| `id` | identificador | Único, inmutable. |
| `sku` | texto | Único, requerido, normalizado (mayúsculas, sin espacios). Es el identificador canónico. |
| `nombre` | texto | Requerido. |
| `descripcion` | texto | Opcional. |
| `categoria_id` | referencia | Opcional. |
| `uom_base_id` | referencia | Requerido; unidad de medida base (la más pequeña gestionable). |
| `uom_venta_id` / `uom_compra_id` | referencia | Opcionales; unidades alternativas con factor de conversión. |
| `codigo_barras` | texto | Opcional; si existe, único; soporta lectura por escáner. |
| `peso_unitario` | número | Opcional (kg). |
| `volumen_unitario` | número | Opcional (m³). |
| `stock_minimo` | número | Opcional; global para alertas (en UOM base). |
| `stock_maximo` | número | Opcional. |
| `controla_lote` | booleano | Si `true`, obliga a gestionar lote para todo movimiento de este producto. |
| `controla_vencimiento` | booleano | Si `true`, obliga a registrar fecha de vencimiento (implica `controla_lote`). |
| `perecedero` | booleano | Si `true`, activa FEFO en salidas. |
| `activo` | booleano | Por defecto `true`. |
| `created_at` / `updated_at` | fecha-hora | Automáticos. |
| `created_by` / `updated_by` | referencia a usuario | Auditoría. |

**Reglas:**
- El `sku` es único e inmutable una vez creado (o solo cambiable por un rol con permiso explícito y quedando rastro).
- Un producto inactivo no puede recibir nuevas entradas ni salidas (solo consultas y ajustes de regularización autorizados).
- Si `controla_lote = true`, **todo** movimiento (entrada, salida, traslado, ajuste) debe indicar lote; sin excepción.
- El `codigo_barras` admite lectura rápida: al escanear un código de barras, el sistema resuelve el producto.

### 3.8 Categoría

Clasificación opcional de productos.

**Atributos:** `id`, `nombre` (único), `parent_id` (categoría padre, permite jerarquía de árbol), `descripcion`, `activo`, `created_at`, `updated_at`, `created_by`, `updated_by`.

**Reglas:**
- No puede haber ciclos en la jerarquía de categorías.
- Una categoría con hijos no puede eliminarse si tiene productos o hijos; se desactiva.

### 3.9 Unidad de medida (UOM)

**Atributos:** `id`, `codigo` (único, ej. `PZA`, `KG`, `CAJA`, `M`, `L`), `nombre`, `tipo` (`UNIDAD`, `PESO`, `VOLUMEN`, `LONGITUD`, `SUPERFICIE`), `factor` (número; factor de conversión hacia la UOM base de la familia), `base` (booleano; si es la UOM raíz de su familia), `created_at`, `updated_at`.

**Reglas:**
- Conversiones: 1 UOM = `factor` × UOM base de su familia.
- Ejemplo: `CAJA` (factor 10, base `PZA`) ⇒ 1 caja = 10 piezas.
- Todas las cantidades se almacenan internamente en UOM base para permitir operaciones y reportes coherentes.

### 3.10 Proveedor

**Atributos:** `id`, `codigo` (único), `nombre` (requerido), `contacto_nombre`, `contacto_telefono`, `contacto_email`, `direccion`, `activo`, `created_at`, `updated_at`, `created_by`, `updated_by`.

**Reglas:**
- Un proveedor inactivo no puede usarse en nuevas entradas.
- Las entradas pueden referenciar proveedor (traza de origen).

### 3.11 Cliente

**Atributos:** `id`, `codigo` (único), `nombre` (requerido), `contacto_nombre`, `contacto_telefono`, `contacto_email`, `direccion`, `activo`, `created_at`, `updated_at`, `created_by`, `updated_by`.

**Reglas:**
- Las salidas pueden referenciar cliente (traza de destino).

### 3.12 Lote

**Atributos:** `id`, `numero` (texto; único dentro del producto), `producto_id`, `fecha_fabricacion` (opcional), `fecha_vencimiento` (opcional), `origen` (texto libre, ej. proveedor o interna), `notas`, `created_at`, `updated_at`, `created_by`, `updated_by`.

**Reglas:**
- Solo tiene sentido si el producto `controla_lote`.
- `numero` único por producto.
- Si `controla_vencimiento = true`, `fecha_vencimiento` es obligatoria en creación de lote y en cada entrada con lote nuevo.
- Un lote vencido no puede salir a cliente (regla FEFO; ver 8.6). Puede salir como merma.

### 3.13 Reglas de jerarquía y composición

- El árbol físico es estricto: **Almacén → Zona → Rack → Sección → Ubicación → Caja**.
- **Pasillo** (§3.3b) es una entidad organizativa opcional dentro de una zona: agrupa racks (`rack.pasillo_id`) pero no es un eslabón obligatorio de la cadena anterior ni participa de la "simplificación" del siguiente punto — un rack siempre pertenece a su zona, tenga o no pasillo asignado.
- El sistema **permite simplificación**: una ubicación puede colgar de una sección, de un rack o de una zona (siempre bajo el mismo almacén). La regla invariante: **todo nodo físico tiene exactamente una única raíz de almacén**.
- Toda ubicación con stock pertenece a exactamente un almacén por transitividad.
- Las operaciones de inventario siempre resuelven el `almacen_id` de la ubicación origen/destino automáticamente.

---

## 4. Usuarios, roles y permisos

### 4.1 Usuario

**Atributos:** `id`, `nombre_usuario` (único), `nombre_completo`, `email` (opcional, único), `password_hash`, `rol_id`, `activo`, `ultimo_acceso_at`, `created_at`, `updated_at`, `created_by`, `updated_by`.

**Reglas:**
- Todo movimiento o modificación de entidad debe atribuirse a un usuario activo.
- Un usuario inactivo no puede autenticarse ni realizar acciones.
- El primer usuario (bootstrap) es el **Administrador**, creado en la instalación, con todos los permisos.
- Los campos de auditoría (`created_by`, `updated_by`) son obligatorios en todas las entidades gestionables.

### 4.2 Roles por defecto

| Rol | Descripción |
|---|---|
| `ADMIN` | Control total: configuración, usuarios, catálogos, movimientos, inventario, reportes. |
| `GERENTE` | Ve todo, crea y valida movimientos, gestiona catálogos; no gestiona usuarios ni permisos. |
| `ENCARGADO_ALMACEN` | Gestiona movimientos (entradas, salidas, traslados, ajustes) y ejecuta inventario. |
| `OPERADOR` | Registra movimientos de entrada/salida/traslado; no autoriza ajustes ni cierra inventario. |
| `LECTOR` | Solo lectura: consultas, reportes, trazabilidad, sin capacidad de modificar nada. |

**Reglas:**
- Los roles por defecto existen al instalar y **no pueden eliminarse** (sí renombrarse con permiso de ADMIN).
- Un usuario tiene **exactamente un** rol (v1). La escalabilidad a múltiples roles por usuario queda documentada como extensión.

### 4.3 Permisos granulares

Cada permiso protege una acción concreta. Formato: `recurso:accion`.

**Recursos:** `almacen`, `zona`, `rack`, `seccion`, `ubicacion`, `caja`, `producto`, `categoria`, `uom`, `proveedor`, `cliente`, `lote`, `usuario`, `rol`, `movimiento`, `entrada`, `salida`, `traslado`, `ajuste`, `inventario`, `comentario`, `reporte`, `configuracion`.

**Acciones (por recurso aplicable):** `ver`, `crear`, `editar`, `eliminar` (borrado lógico), `desactivar`, `aprobar`, `anular`, `exportar`, `ejecutar`, `cerrar`, `asignar`.

**Reglas:**
- La acción `ver` es condición mínima para que un recurso aparezca en listados/detalles.
- Una acción sin permiso devuelve error de autorización (403) y se registra en auditoría.
- `exportar` se exige de forma independiente (puede leerse sin poder exportar).
- `anular` y `aprobar` son permisos distintos a `crear` (un operador crea, un encargado aprueba).

### 4.4 Matriz de permisos (resumen)

| Permiso | ADMIN | GERENTE | ENCARGADO | OPERADOR | LECTOR |
|---|---|---|---|---|---|
| Ver cualquier entidad | ✔ | ✔ | ✔ | ✔ | ✔ |
| Crear/editar catálogos (producto, proveedor, cliente, categoría, uom) | ✔ | ✔ | ✔ | ✖ | ✖ |
| Crear movimientos (entrada/salida/traslado) | ✔ | ✔ | ✔ | ✔ | ✖ |
| Aprobar/validar movimientos | ✔ | ✔ | ✔ | ✖ | ✖ |
| Crear ajustes de stock | ✔ | ✔ | ✔ | ✖ | ✖ |
| Aprobar ajustes (si aplica doble control) | ✔ | ✔ | ✖ | ✖ | ✖ |
| Ejecutar sesión de inventario / registrar conteos | ✔ | ✔ | ✔ | ✔ | ✖ |
| Cerrar sesión de inventario | ✔ | ✔ | ✖ | ✖ | ✖ |
| Anular movimientos | ✔ | ✔ | ✖ | ✖ | ✖ |
| Comentar en cualquier entidad | ✔ | ✔ | ✔ | ✔ | ✖ |
| Gestionar usuarios y roles | ✔ | ✖ | ✖ | ✖ | ✖ |
| Configuración del sistema | ✔ | ✖ | ✖ | ✖ | ✖ |
| Exportar reportes | ✔ | ✔ | ✔ | ✔ | ✖ |

> La matriz es el **valor por defecto**; el ADMIN puede ajustar permisos finos por rol en v2 (ver §20).

### 4.5 Auditoría de quién hace qué

Cada operación que altera datos registra un **evento de auditoría** con:

| Campo | Significado |
|---|---|
| `usuario_id` | Quién lo hizo. |
| `accion` | Qué se hizo (crear, editar, aprobar, anular, ejecutar, ver...). |
| `entidad` / `entidad_id` | Sobre qué. |
| `antes` | Estado previo (si aplica). |
| `despues` | Estado posterior (si aplica). |
| `timestamp` | Cuándo. |
| `ip` / `origen` | Desde dónde (self-hosted: equipo/sesión). |

Reglas: los eventos de auditoría son **inmutables** y no son borrables por ningún rol.

---

## 5. Stock y saldos

### 5.1 Concepto de stock

- El stock vive en **ubicaciones** (y opcionalmente dentro de **cajas**).
- La unidad de saldo es la **UOM base** del producto.
- El saldo de un producto en un punto = suma de todos sus movimientos netos hacia ese punto.

### 5.2 Saldo por ubicación

Consulta canónica: `(ubicación, producto, lote) → cantidad`.

- Si el producto no controla lote, el saldo se agrega ignorando lote.
- Una ubicación puede tener varias filas de stock (producto × lote).
- El saldo se calcula en tiempo real desde movimientos (fuente de verdad) y se mantiene indexado para consultas instantáneas.

### 5.3 Stock disponible vs. físico

- **Stock físico (registrado)**: saldo en sistema.
- **Stock comprometido** (extensión futura): reservas para pedidos.
- En v1 no existen reservas; el "disponible" = stock registrado. El modelo deja el campo listo para futura expansión.

### 5.4 Mínimos y máximos

- Un producto y/o ubicación puede tener `stock_minimo` y `stock_maximo`.
- Cuando el saldo de un producto (sumando todas sus ubicaciones) cae por debajo del mínimo global, se dispara alerta de **stock bajo**.
- Cuando una ubicación supera su `capacidad_maxima`, se impide la entrada (o exige confirmación explícita de un rol con permiso).

### 5.5 Precisión de inventario

La precisión mide la fidelidad entre lo registrado y lo físico. Se define en §11.6.

---

## 6. Movimientos (núcleo del sistema)

### 6.1 Modelo general de movimiento

Un **movimiento** es la única forma de alterar stock. Cada movimiento:

| Campo | Tipo | Reglas |
|---|---|---|
| `id` | identificador | Único, inmutable. |
| `tipo` | enum | `ENTRADA`, `SALIDA`, `TRASLADO`, `AJUSTE`, `CONSUMO`. |
| `sub_tipo` | enum | Según tipo (ver secciones 7-10). |
| `numero` | texto | Número correlativo único por año/almacén (ej. `MOV-2026-000123`). |
| `estado` | enum | `BORRADOR`, `PENDIENTE_APROBACION`, `APROBADO`, `ANULADO`. |
| `fecha_movimiento` | fecha-hora | Cuándo ocurre el hecho (puede diferir de `created_at`). |
| `motivo` | texto | Requerido para ajustes y mermas; opcional para otros. |
| `origen_ubicacion_id` | referencia | Para salidas/traslados/ajustes negativos. |
| `destino_ubicacion_id` | referencia | Para entradas/traslados/ajustes positivos. |
| `proveedor_id` | referencia | Para entradas de compra. |
| `cliente_id` | referencia | Para salidas a cliente. |
| `sesion_inventario_id` | referencia | Si el movimiento proviene de un conteo. |
| `documento_referencia` | texto | Nº de OC, guía, factura, etc. (opcional). |
| `notas` | texto | Observaciones generales. |
| `created_by` / `created_at` | | Quién/cuándo lo creó. |
| `approved_by` / `approved_at` | | Quién/cuándo lo aprobó (si aplica). |
| `anulado_by` / `anulado_at` | | Quién/cuándo lo anuló. |

Cada movimiento tiene **una o más líneas**:

| Campo de línea | Reglas |
|---|---|
| `producto_id` | Requerido. |
| `lote_id` | Requerido si el producto controla lote. |
| `cantidad` | Número > 0, en UOM base. |
| `origen_ubicacion_id` | Para salidas/traslados. |
| `destino_ubicacion_id` | Para entradas/traslados. |
| `caja_origen_id` / `caja_destino_id` | Opcionales. |

### 6.2 Ciclo de vida / estados

```
BORRADOR → PENDIENTE_APROBACION → APROBADO → (aplica efecto sobre stock)
   │            │                    │
   └────────────┴────────────→ ANULADO
```

- **BORRADOR**: sin efecto sobre stock; editable por su creador.
- **PENDIENTE_APROBACION**: enviado a aprobación (solo si la configuración o el tipo lo exige); sin efecto sobre stock.
- **APROBADO**: **único estado que altera saldos**. Al pasar a aprobado se ejecutan las líneas de forma atómica.
- **ANULADO**: cancela el movimiento. Si el movimiento **ya afectó** stock, la anulación genera automáticamente un movimiento inverso (nuevo registro) — nunca se "deshace" el histórico.

**Reglas de transición:**
- Un movimiento aprobado **no puede editarse**.
- Un movimiento aprobado solo puede anularse por quien tenga permiso `anular`; la anulación deja constancia y, si había afectado stock, crea el inverso.
- Un movimiento anulado no puede re-aprobarse.

### 6.3 Inmutabilidad y registro histórico

- Los movimientos aprobados son **inmutables** en cantidad, producto, lote, origen y destino.
- El historial de stock se reconstruye 100% desde movimientos aprobados.
- Anular ≠ borrar: el movimiento original permanece con su estado `ANULADO` y referencia al inverso.

### 6.4 Atributos de auditoría de cada movimiento

Todo movimiento responde a las preguntas: **quién** (`created_by`, `approved_by`, `anulado_by`), **qué** (tipo, producto, cantidad), **dónde** (origen/destino, almacén resuelto), **cuándo** (`fecha_movimiento`, `created_at`, `approved_at`), **por qué** (`motivo`, `documento_referencia`, `notas`).

---

## 7. Entradas

### 7.1 Tipos de entrada

| Sub-tipo | Efecto | Origen | Destino |
|---|---|---|---|
| `COMPRA` | + stock | Proveedor | Ubicación de recepción |
| `DEVOLUCION_CLIENTE` | + stock | Cliente | Ubicación de devoluciones |
| `AJUSTE_POSITIVO` | + stock | — (causa justificada) | Ubicación |
| `INICIAL` | + stock | — (apertura) | Ubicación |
| `TRASLADO_ENTRADA` | + stock (en destino) | Ver traslados §9 | Ubicación |

### 7.2 Recepción de compra

**Flujo de negocio:**
1. (Opcional) Se referencia un documento (`documento_referencia`, ej. número de OC).
2. Se selecciona el proveedor.
3. Se registran las líneas: producto, lote (si aplica), cantidad, ubicación destino (recepción o destino final).
4. Se valida: producto activo, lote válido y sin vencer, destino dentro del mismo almacén, capacidad de destino.
5. Se aprueba (según política de aprobación).
6. Al aprobarse: **incrementa** saldo en destino; si el producto controla vencimiento, se crea/usa el lote con su fecha.

**Reglas específicas:**
- Si el producto `controla_lote`, cada línea debe indicar lote (existente o crear nuevo).
- La cantidad debe ser > 0.
- La entrada puede dividir una cantidad en varios lotes/ubicaciones (múltiples líneas).
- Una entrada de compra con producto inactivo se rechaza.

### 7.3 Entrada por devolución

- El destino sugerido es una ubicación de tipo `DEVOLUCION`.
- Si el producto no controla lote, se asigna al stock general de la ubicación.
- Si controla lote, se registra el lote de origen (o se crea uno con la fecha de vencimiento informada).
- La devolución no reabre el movimiento de salida original; es un hecho independiente (aunque se puede referenciar por `documento_referencia`).

### 7.4 Entrada por ajuste positivo

- **Siempre requiere** `motivo` explícito.
- Requiere permiso `ajuste:crear`.
- Incrementa stock en la ubicación indicada.

### 7.5 Entrada inicial (apertura de inventario)

- Se usa para cargar el stock existente al poner el sistema en marcha.
- Requiere permiso `configuracion:ejecutar` (solo ADMIN/GERENTE).
- Debe ejecutarse antes de operar movimientos normales; el sistema lo identifica como stock de arranque.
- Opcionalmente puede vincularse a una sesión de inventario inicial.

---

## 8. Salidas

### 8.1 Tipos de salida

| Sub-tipo | Efecto | Origen | Destino |
|---|---|---|---|
| `CLIENTE` | − stock | Ubicación | Cliente |
| `DEVOLUCION_PROVEEDOR` | − stock | Ubicación | Proveedor |
| `MERMA` | − stock | Ubicación | — (destrucción/pérdida) |
| `AJUSTE_NEGATIVO` | − stock | Ubicación | — (causa justificada) |
| `TRASLADO_SALIDA` | − stock (en origen) | Ver traslados §9 | Ubicación |

### 8.2 Despacho a cliente

**Flujo de negocio:**
1. (Opcional) Referencia de documento (guía, pedido).
2. Selección del cliente.
3. Líneas: producto, cantidad, ubicación(es) origen.
4. Validación: producto activo, **saldo suficiente**, lote válido (no vencido), ubicación con stock.
5. Aprobación (si aplica).
6. Al aprobarse: **decrementa** saldo en origen; el sistema aplica la política de selección de lote (FIFO/FEFO).

### 8.3 Devolución a proveedor

- Origen: cualquier ubicación con stock.
- Permite devolver por lote específico si el producto controla lote.
- Motivo opcional; si es por calidad, se recomienda un comentario.

### 8.4 Salida por merma

- **Siempre requiere** `motivo` y, según configuración, `aprobar`.
- Representa stock perdido (daño, caducidad, robo).
- Decrementa el saldo de la ubicación y del lote afectado.
- El lote vencido se puede dar de baja como merma sin restricción.

### 8.5 Salida por ajuste negativo

- **Siempre requiere** `motivo`.
- Requiere permiso `ajuste:crear`.
- Corrige hacia abajo un saldo.

### 8.6 Política de salida (FIFO / FEFO / lote específico)

Al despachar un producto con lotes:
1. Si el producto `perecedero` o `controla_vencimiento` → **FEFO**: salen primero los lotes con `fecha_vencimiento` menor.
2. Si no controla vencimiento pero sí lote → **FIFO**: salen primero los lotes con `fecha_fabricacion` o de entrada más antigua.
3. Si no controla lote → sale del stock general de la ubicación elegida.
4. **Excepción explícita**: el usuario puede indicar `lote_id` concreto, siempre que tenga saldo disponible y, si el producto es perecedero, el lote no esté vencido.
5. La política aplica **dentro de la ubicación origen**. Si el usuario define varias ubicaciones, el sistema propone el orden por ubicación (la que tenga el lote más antiguo primero) y permite ajuste manual con confirmación.

**Regla dura:** un lote con `fecha_vencimiento` pasada **no puede** salir como `CLIENTE` ni `DEVOLUCION_PROVEEDOR`; solo como `MERMA` o `AJUSTE_NEGATIVO`.

---

## 9. Traslados

### 9.1 Traslado entre ubicaciones

- Mueve stock (producto, lote, cantidad) de `origen_ubicacion` → `destino_ubicacion`.
- No altera el total del almacén (si origen y destino están en el mismo almacén).
- Al aprobarse, se ejecutan **dos registros ligados** en un solo hecho atómico: salida en origen + entrada en destino.
- Validaciones: saldo suficiente en origen; producto/lote coherentes; capacidad en destino; mismo almacén salvo que sea traslado inter-almacén.

### 9.2 Traslado entre cajas

- Se especifican `caja_origen_id` y `caja_destino_id`.
- Si la caja origen está restringida a producto/lote, se valida coherencia con lo movido.
- Al mover todo el contenido, queda vacía.

### 9.3 Traslado entre almacenes

- Origen y destino en almacenes distintos.
- El sistema exige registro de **dos movimientos ligados**: `TRASLADO_SALIDA` (almacén origen) y `TRASLADO_ENTRADA` (almacén destino), con el mismo `numero`/referencia común.
- Permite mover stock entre sedes sin perder trazabilidad.

---

## 10. Ajustes de stock

### 10.1 Ajuste por corrección

- Corrige un saldo para alinearlo a la realidad observada (no por conteo formal).
- Requiere `motivo`.
- El usuario indica el saldo esperado o la diferencia; el sistema calcula el movimiento de ajuste (positivo o negativo).

### 10.2 Ajuste por merma / sobrante

- **Merma**: ajuste negativo con motivo de pérdida.
- **Sobrante**: ajuste positivo con motivo de sobra.

### 10.3 Reglas de validación

- Todo ajuste requiere `motivo` obligatorio (no vacío, mínimo 3 caracteres).
- Los ajustes **nunca son automáticos**; siempre los crea un usuario con permiso.
- Un ajuste negativo nunca puede dejar el saldo < 0.
- El ajuste se ejecuta solo en estado `APROBADO` (si la política de aprobación lo exige) o directamente al crearse por un rol con permiso de aprobar.

---

## 11. Inventario físico y conteo

### 11.1 Sesión de inventario

Una **sesión de inventario** formaliza el proceso de contar.

**Atributos:** `id`, `numero` (único por año), `tipo` (`COMPLETO` | `CICLICO`), `estado` (`PLANEADA` | `EN_CURSO` | `CERRADA` | `ANULADA`), `almacen_id`, `alcance` (criterio: producto/categoría/zona/ubicación), `fecha_inicio`, `fecha_fin`, `responsable_id`, `conteo_ciego` (bool), `exige_doble_conteo` (bool), `created_by`, `created_at`, `closed_by`, `closed_at`.

### 11.2 Conteo completo vs. cíclico

- **COMPLETO**: cuenta todas las ubicaciones/productos del almacén (o del alcance).
- **CICLICO**: cuenta un subconjunto definido (por zona, por categoría, por "vencido pronto", por muestreo aleatorio).

### 11.3 Doble conteo / recuento

- Si `exige_doble_conteo = true`, toda diferencia exige un segundo conteo antes de aceptarse.
- El sistema registra `conteo_numero` (1°, 2°) por línea.

### 11.4 Registro de conteo

Cada línea de conteo:

| Campo | Reglas |
|---|---|
| `sesion_id` | Requerido. |
| `ubicacion_id` | Requerido. |
| `producto_id` | Requerido. |
| `lote_id` | Requerido si el producto controla lote. |
| `cantidad_contada` | Número ≥ 0 (0 = no está presente). |
| `conteo_numero` | Entero ≥ 1. |
| `usuario_contador_id` | Quién contó. |
| `timestamp` | Cuándo. |
| `nota` | Opcional (ej. "caja dañada"). |

Reglas:
- Si `conteo_ciego = true`, al registrar el conteo **no se muestra** el saldo del sistema.
- La cantidad contada puede ser 0 (producto ausente).
- Un producto presente físicamente pero sin saldo en sistema es un **sobrante**; se regulariza con entrada por ajuste.

### 11.5 Diferencias y conciliación

Al comparar `cantidad_contada` vs. saldo en sistema:
- **Diferencia = 0** → conciliado, sin acción.
- **Diferencia > 0** → sobrante → se propone **entrada por ajuste** (motivo: "diferencia de inventario").
- **Diferencia < 0** → faltante → se propone **salida por ajuste** (motivo: "diferencia de inventario").
- Si `exige_doble_conteo`, la diferencia solo se acepta si el segundo conteo confirma la cantidad.

**Cierre:**
- Solo quien tenga permiso `inventario:cerrar` puede cerrar.
- Al cerrar, se generan automáticamente los ajustes de las diferencias aceptadas (o quedan en `PENDIENTE_APROBACION` si la política lo exige).
- Una vez cerrada, la sesión no admite más conteos.

### 11.6 Precisión del inventario (métricas)

- **Precisión por SKU** = (SKUs con saldo exacto ÷ SKUs contados) × 100.
- **Precisión por cantidad** = (unidades correctas ÷ unidades contadas) × 100.
- **Exactitud por ubicación** = (ubicaciones sin diferencia ÷ ubicaciones contadas) × 100.
- Estas métricas se calculan por sesión y en reportes históricos (evolución de precisión).

---

## 12. Comentarios

### 12.1 Modelo de comentario

| Campo | Reglas |
|---|---|
| `id` | Único. |
| `entidad` | A qué tipo de entidad se ancla (producto, movimiento, ubicación, lote, sesión, proveedor, cliente, caja...). |
| `entidad_id` | Id del registro. |
| `usuario_id` | Autor. |
| `texto` | Requerido. |
| `created_at` | Fecha. |
| `editado` | Booleano; el texto original no se pierde. |

### 12.2 Comentarios anclados a entidades

Cualquier entidad del dominio puede recibir comentarios. Reglas de anclaje:
- El autor debe tener al menos `ver` sobre la entidad y permiso `comentario:crear`.
- Se puede comentar sobre un movimiento aprobado (ej. explicar una merma).
- Se puede comentar sobre una sesión de inventario (ej. incidencias de conteo).

### 12.3 Reglas de comentarios

- No se eliminan los comentarios; solo se permite marcar `oculto` (por el autor o un rol con permiso).
- La edición guarda el historial del texto.
- Los comentarios son visibles para quienes tienen `ver` de la entidad.

---

## 13. Histórico y trazabilidad

### 13.1 Línea de tiempo de un producto

Consulta que devuelve, en orden cronológico, **todos** los movimientos que afectaron a un producto:
- Fecha, tipo, cantidad (±), ubicación origen/destino, lote, documento, autor, estado, motivo, comentarios.

### 13.2 Línea de tiempo de una ubicación

Consulta que devuelve la historia de una ubicación:
- Qué productos/lotes pasaron por ahí, cuándo, con qué movimiento y autor.
- Saldo actual por producto/lote y su desglose por movimiento.

### 13.3 Línea de tiempo de un movimiento

- Estado del movimiento, quién lo creó/aprobó/anuló, y **movimiento inverso** generado en caso de anulación.

### 13.4 Consultas de trazabilidad

El sistema debe poder responder:
1. "¿Dónde está ahora el lote X?" → ubicaciones + cantidades.
2. "¿De dónde vino la unidad que despaché hoy?" → movimiento de salida → movimiento de entrada/traslado de origen.
3. "¿Quién tocó el stock del producto Y la semana pasada?" → lista de movimientos + autores.
4. "¿Cuánto vence en 30 días?" → lotes con vencimiento próximo y su stock.
5. "¿Dónde estuvo la caja Z?" → historial de traslados de la caja.

Todas estas consultas son filtrables/ordenables/buscables/paginables (§15).

---

## 14. Reglas de negocio transversales

### 14.1 Integridad referencial

- Ninguna operación deja referencias huérfanas.
- Las entidades se desactivan (no se eliminan) cuando tienen historia.
- El borrado físico solo se permite en entidades **sin ningún** movimiento/evento asociado y siempre con confirmación y auditoría.

### 14.2 Consistencia de saldos (el saldo nunca puede ser negativo)

- Todo movimiento se valida contra el saldo de la ubicación/lote origen.
- **Invariante global**: ningún saldo (ubicación × producto × lote) puede quedar negativo tras un movimiento aprobado.
- El sistema bloquea la operación y devuelve error claro (ej. "Saldo insuficiente en RACK-A1-N2-P3: 5 disponibles, se intentaron 8").

### 14.3 Código de barras / lectura

- El sistema acepta entrada por código de barras (producto, caja, ubicación si están etiquetados).
- Al escanear un código desconocido, muestra error y sugiere búsqueda manual.
- **El escaneo nunca crea ni modifica datos por sí solo.** Resuelve el código, deja constancia de la lectura y ofrece a dónde ir; toda escritura ocurre después, en el formulario de su propia página y con su propio permiso.

#### 14.3.1 Orígenes de lectura

Dos, con el mismo comando detrás:

- **Lector de mano** (`TECLADO`): se comporta como un teclado. No requiere driver ni configuración.
- **Cámara** (`CAMARA`): se enciende solo a petición explícita de la persona, nunca al abrir la pantalla, y se apaga al salir de ella.

**El lector funciona en cualquier pantalla.** No hay que ir antes a ninguna página: la aplicación escucha el teclado en todo el documento y reconoce la ráfaga del lector por su ritmo. Se trabaja con una caja en las manos, no navegando.

**Cómo se distingue del tecleo humano.** Un lector emite entre 5 y 20 ms por carácter con regularidad de máquina; una persona, incluso rápida, tarda 100-200 ms y con ritmo irregular. Con el umbral en **40 ms de media** y un mínimo de **3 caracteres** los dos casos no se solapan (verificado en `scripts/verificar-escaner.mjs` con ritmos reales, incluida una mecanógrafa muy rápida y una tecla mantenida).

**Cuándo NO se interviene:** si el foco está en un campo de texto. Ahí el lector escribe en el campo, que es lo que la persona quiere si acaba de hacer clic en él — y así nunca se le roba una pulsación a quien está escribiendo de verdad.

**Quién se queda con el código.** Manda la pantalla visible: si hay una de captura o de conteo abierta, el código va a ella, porque sabe mejor que nadie qué significa ahí. Si ninguna lo reclama, se resuelve y se navega a la acción principal que propone el backend (§14.3.6).

**Acuse de recibo.** Toda lectura por cámara confirma con un pitido y una vibración: agudo si resolvió, grave si no. En el piso nadie mira la pantalla mientras escanea, y sin confirmación audible se vuelve a pasar el código "por si acaso", generando duplicados.

#### 14.3.2 Resolución

Un código se resuelve contra el catálogo en este orden, y gana el primero que coincida: código de barras de producto → SKU → código de ubicación → número de lote → código de caja.

**Una sola puerta de entrada.** El comando `escanear` es la **única** forma de resolver un código: no existe ninguna que lo haga sin dejar rastro. Cualquier pantalla que lea un código aparece en el panel — por construcción, no por disciplina.

#### 14.3.3 Permisos

| Permiso | Quién | Para qué |
|---|---|---|
| `escaneo:usar` | ADMIN, GERENTE, ENCARGADO_ALMACEN, OPERADOR | Ejecutar una lectura |
| `escaneo:ver` | ADMIN, GERENTE | Leer el registro de escaneos |

El LECTOR no tiene ninguno de los dos: `escaneo:usar` es una acción de piso y `escaneo:ver` es auditoría. Ambos se deniegan **explícitamente**, porque la regla general de su rol (`accion == "ver"`) se los concedería sin querer.

#### 14.3.4 Registro de escaneos (`eventos_escaneo`)

Toda lectura deja una fila, **incluidas las que fallan**. Un código que nadie logra resolver es una etiqueta rota o mal impresa; una racha de denegados es alguien operando fuera de su rol. Ninguna de las dos señales existiría si solo se registraran los aciertos.

**Desenlaces:** `RESUELTO` · `NO_ENCONTRADO` · `DENEGADO`.

**Atributos:** `id`, `codigo`, `codigo_normalizado`, `resultado`, `motivo`, `tipo_entidad`, `entidad_id`, `entidad_etiqueta`, `origen`, `formato`, `proposito`, `ruta`, `usuario_id`, `rol_codigo`, `ubicacion_contexto_id`, `latitud`, `longitud`, `dispositivo`, `duracion_ms`, `tenant`, `hora_local`, `dia_semana`, `created_at`.

Reglas:

- **El intento denegado se registra antes de devolver el error.** Sería el evento más interesante de vigilar y, si el permiso cortara antes, el único que no quedaría escrito.
- **`rol_codigo` es una copia del momento, no una referencia.** Si mañana cambia el rol del usuario, el registro debe seguir diciendo con qué permiso actuó entonces.
- El sistema devuelve en cada lectura los **fallos consecutivos** del usuario en los últimos 10 minutos, para poder avisar de una etiqueta ilegible antes de que la persona insista diez veces.

#### 14.3.5 Etiquetas imprimibles

Rustock imprime lo que después va a leer. **El código impreso es exactamente el código con el que `resolver_escaneo` encuentra la entidad** (§14.3.2): por eso la generación vive en Rust junto a la resolución — si el formato lo decidiera el frontend, nada garantizaría que lo impreso y lo buscado coincidan.

**Qué se imprime en cada tipo:**

| Tipo | Código impreso |
|---|---|
| PRODUCTO | Su código de barras comercial si lo tiene; si no, el SKU |
| UBICACION | Su código |
| LOTE | Su número |
| CAJA | Su código |

Una entidad sin código imprimible **no se ofrece** para etiquetar: una etiqueta sin código no se puede escanear, y ofrecerla solo llevaría a gastar papel.

**Simbologías:**

- **Code128** por defecto: es la simbología lineal que cualquier lector de mano lee sin configurar nada. Admite ASCII imprimible (32–126). Lleva siempre el código en texto legible debajo — cuando la etiqueta se raya y el lector falla, alguien tiene que poder teclearlo.
- **QR** para etiquetas pequeñas, códigos largos o códigos con caracteres que Code128 no admite (acentos, eñes). Corrección de errores media (15%).

**Legibilidad.** El sistema devuelve el ancho de la barra estrecha en milímetros (`modulo_mm`) y avisa cuando cae por debajo de **0,25 mm** (mínimo seguro a 203 dpi) o de **0,19 mm** (por debajo, casi ningún lector lee). Es el fallo operativo más caro de esta función: un código largo en una etiqueta pequeña produce cien etiquetas que no leen, y el error solo se descubre cuando ya están pegadas en las cajas. Por eso se avisa **antes** de imprimir.

**Disposiciones:** hoja A4 con varias etiquetas por página, y rollo con una por página para impresora térmica. Las medidas van en milímetros reales, de modo que imprimir al 100 % da el tamaño físico pedido.

#### 14.3.8 Formatos de salida y conexión con impresoras

Un almacén no imprime de una sola forma, y hay que tolerarlas todas.

| Formato | Para qué | Quién lo entiende |
|---|---|---|
| **SVG** | Ver en pantalla e imprimir desde el navegador | Cualquier navegador |
| **PDF** | El denominador común: cualquier impresora y cualquier sistema, además archivable y enviable por correo | Todos, incluidos los drivers propios de Dymo y Brother |
| **ZPL** | Envío en crudo a térmica, sin driver ni diálogo de impresión | Zebra y la mayoría de las genéricas (Honeywell, TSC, Godex) |
| **EPL** | Igual que ZPL, para modelos antiguos y térmicas económicas | Zebra/Eltron antiguas y muchas genéricas |
| **PNG** | Pegar la etiqueta en otro sistema | Todo |

Reglas:

- **El PDF se genera a mano en Rust** con las fuentes base del formato (Helvetica y Courier, presentes en todo lector desde 1993). No incrusta tipografías ni añade una dependencia de terceros, y el resultado es determinista.
- **ZPL y EPL dejan que la impresora dibuje el código** (`^BC`/`^BQ` en ZPL) en vez de mandarle una imagen: sale más nítido —la impresora dibuja sobre su rejilla real de puntos— y el trabajo pesa cientos de bytes en lugar de megas.
- **La resolución (dpi) es obligatoria en ZPL y EPL**, que miden en puntos y no en milímetros. Con el valor equivocado la etiqueta sale de otro tamaño: 50 mm son 400 puntos a 203 dpi y 591 a 300 dpi.
- Los caracteres de control de ZPL (`^`, `~`) se sustituyen antes de enviar: un código que los contenga rompería el trabajo.
- **El PNG lo rasteriza el frontend** desde el SVG con un lienzo. Es presentación pura y el navegador ya trae el motor; traer una librería de imagen a Rust por un botón sería una dependencia desproporcionada.

**Impresión directa por red.** Prácticamente toda térmica de etiquetas acepta trabajos en crudo por TCP en el **puerto 9100** (estándar de facto heredado de HP JetDirect). Rustock envía ahí el ZPL o el EPL:

- Sin driver, sin instalar nada en el equipo del operador.
- Sin pasar por el diálogo del navegador, **que reescala y estrecha las barras** — la causa más común de que una etiqueta impresa no se lea.
- Igual desde un teléfono del almacén que desde el servidor.

Se rechaza enviar PDF o SVG por ese puerto: una térmica imprimiría el código fuente como texto y gastaría la etiqueta.

Lo que **no** cubre esta vía: impresoras USB atadas a un equipo concreto, y las de protocolo propio (Dymo, Brother). Para esas el camino es el **PDF a tamaño real**, que su propio driver imprime sin reescalar.

`probar_impresora` comprueba que el puerto responde sin gastar etiqueta. Solo dice eso: una térmica sin papel o con el cabezal levantado acepta la conexión igualmente.

#### 14.3.9 Dónde se imprime desde

Etiquetar no es un módulo aparte al que haya que ir: es una acción sobre algo que ya se tiene delante. Por eso el punto de partida es siempre el registro, no la pantalla de etiquetas:

| Desde dónde | Cómo |
|---|---|
| Ficha de producto, ubicación, lote o caja | Botón **Etiqueta** en las acciones de la ficha |
| Resultado de un escaneo | Acción **Imprimir etiqueta** — cubre el caso más común: el código costó leerlo y hay que reponerlo |
| Pantalla de etiquetas | Selección manual, para tandas grandes |

Todos llevan a `/etiquetas?tipo=<TIPO>&ids=<a,b,c>`, que **genera la vista previa sola** al llegar con una selección: quien pulsó "Etiqueta" en una ficha ya dijo lo que quería, y pedirle además que pulse "Generar" es un paso de más.

**Los ajustes se recuerdan** en el equipo (simbología, tamaño, disposición, resolución y dirección de la impresora). Se guardan por equipo y no por persona a propósito: la impresora está físicamente al lado del equipo desde el que se imprime, y el mismo operador usa una distinta según el muelle en el que esté. Recordarlo por persona sería recordarlo mal.

**Permisos.** Imprimir la etiqueta de algo exige poder **verlo** (`producto:ver`, `ubicacion:ver`, `lote:ver`, `caja:ver`): no es una acción nueva sobre la entidad, es una forma de leerla.

#### 14.3.6 Acciones desde la lectura

Al resolver un código, el sistema devuelve **qué se puede hacer ahora**. Las decide el backend, no la pantalla: es el único que sabe qué existe, qué permisos tiene quien escanea y a qué ruta lleva cada acción. Si las decidiera el frontend, acabaría ofreciendo acciones que luego se deniegan.

El `proposito` de la lectura decide cuál es la **acción principal**: `CONSULTA` sugiere ver la ficha, `CAPTURA` sugiere registrar el movimiento, `INVENTARIO` sugiere contar.

**Código desconocido.** La única acción posible es darlo de alta, y lleva al formulario de creación **con el código precargado**. Esto no contradice §14.3: el escaneo sigue sin crear nada por sí solo — crea una persona, en un formulario, con su propio permiso. Solo se ofrece el alta de los tipos que esa persona puede crear.

#### 14.3.7 Panel de escaneos

Auditoría, no operación: exige `escaneo:ver` (GERENTE y ADMIN). Responde tres preguntas concretas:

| Pregunta | Cómo se responde |
|---|---|
| ¿Qué etiquetas hay que reimprimir? | Códigos que fallan **más de una vez**. Un fallo suelto es un tropiezo; lo que señala una etiqueta rota es la repetición. Se muestra cuántas personas distintas tropezaron: si son varias, el problema es de la etiqueta y no de quien escanea. |
| ¿Quién opera fuera de su rol? | Intentos `DENEGADO` agrupados por persona, con el rol con el que actuó. |
| ¿Cuándo se opera de verdad? | Volumen por hora local, con las 24 horas siempre presentes. |

Además: acierto global, reparto entre cámara y lector de mano, tiempo medio de resolución y actividad por persona. **Todo el cálculo vive en Rust**; la interfaz no deriva ni una métrica (STACK.md).

### 14.4 Fechas y zona horaria

- Todas las fechas se almacenan con zona horaria (UTC) y se muestran en la zona configurada.
- `fecha_movimiento` es la fecha del hecho; no se confunde con `created_at`.
- Reportes diarios/mensuales usan la zona horaria configurada como frontera del día.

### 14.5 Borrado lógico

- `activo`/`estado` gobiernan visibilidad y operación.
- El historial nunca se purga de forma automática.

### 14.6 Concurrencia

- Dos usuarios no pueden mover la misma línea de stock simultáneamente sin control: la validación de saldo es atómica (si el primero consume, el segundo ve el nuevo saldo o falla).
- Una sesión de inventario con conteo en curso bloquea ajustes manuales sobre las ubicaciones del alcance (o exige que se apliquen como diferencias de la sesión).

### 14.7 Nomenclatura / normalización

- `codigo`/`sku` se normalizan: mayúsculas, sin espacios al inicio/fin, únicos dentro de su contexto.
- La búsqueda es **case-insensitive** y tolera acentos/espacios extra.

### 14.8 Layout físico del mapa (modo construcción)

El plano del almacén (mapa 2D/3D) representa la geometría real de la operación; por eso el solape físico es una regla de negocio, no un detalle visual:

- Todo elemento posicionado en el mapa (zona, pasillo, rack) ocupa un **rectángulo propio** (`pos_x`, `pos_y`, `ancho`, `profundidad`). Las ubicaciones son bins de tamaño fijo.
- **Matriz de solapes prohibidos**: ningún elemento puede coincidir en el plano con otro del mismo tipo; un pasillo no puede tener racks ni ubicaciones encima (es espacio de tránsito); una ubicación no puede flotar sobre un rack ajeno. Tocarse por el borde es válido (elementos adyacentes).
- **Contención permitida**: las zonas contienen a sus pasillos/racks/ubicaciones; esa coincidencia nunca se bloquea ni se exige.
- La validación se aplica en **toda** mutación de posición/tamaño y en toda creación desde el mapa; el rechazo nombra los dos elementos involucrados ("El rack 'RACK-01' se solapa con el pasillo 'PAS-01'").
- Los elementos sin posición asignada aún no están en el plano: no participan hasta colocarse.
- Un elemento inactivo libera su espacio: solo los activos reservan suelo.


---

## 15. Estándar universal de consulta (Endpoints)

### 15.1 Principio: todo listado es filtrable, ordenable, buscable, paginable y seccionable

**Regla absoluta de Rustock**: cualquier endpoint que devuelva una colección de datos debe soportar, sin excepción:

1. **Paginación** (`page`, `page_size` o cursor).
2. **Ordenamiento** (`sort`) por uno o varios campos, ascendente/descendente.
3. **Búsqueda** (`q`) texto libre sobre campos relevantes.
4. **Filtros** estructurados (`filters`) por cualquier campo del recurso, incluidos rangos, listas y por relación.
5. **Selección de campos** (`fields`) para proyección.
6. **Agregaciones** (`group_by`, métricas) para análisis.
7. **Exportación** (`export`) del resultado completo.

Los parámetros son **combinables** entre sí. Ejemplo válido: filtrar + buscar + ordenar + agrupar en una sola petición.

### 15.2 Paginación

- `page`: número de página (1-indexed). Por defecto 1.
- `page_size`: tamaño de página. Máximo permitido: 200. Por defecto 50.
- La respuesta incluye: `total`, `page`, `page_size`, `total_pages`, `has_next`, `has_prev`.
- Si el cliente pide `page_size = -1`, se devuelven todos los registros (limitado a un tope de seguridad configurable) — pensado para exportaciones.

### 15.3 Ordenamiento

- `sort=campo` → ascendente.
- `sort=-campo` → descendente.
- `sort=campo,-otro` → múltiples criterios (el signo precede a cada campo).
- Los campos ordenables son los campos del recurso y campos de relación directa (ej. `sort=producto.nombre`).
- Si no se indica, el orden por defecto es el más estable: `created_at` descendente (los más recientes primero) y desempate por `id` descendente.

### 15.4 Búsqueda

- `q=texto`: búsqueda de texto libre, **case-insensitive**, sobre campos de texto del recurso.
- Para productos, también busca por `sku` y `codigo_barras` (búsqueda exacta de SKU/barras tiene prioridad).
- La búsqueda admite múltiples términos separados por espacio (todos deben coincidir, en cualquier orden).
- Los campos buscados por defecto se definen por recurso en la tabla de §15.9.

### 15.5 Filtros

Cada filtro se expresa como `campo:operador:valor` (repetible), agrupable.

**Operadores soportados (universales):**

| Operador | Significado | Ejemplo |
|---|---|---|
| `eq` | igual | `estado:eq:APROBADO` |
| `neq` | distinto | `activo:neq:false` |
| `gt` | mayor que | `cantidad:gt:10` |
| `gte` | mayor o igual | `cantidad:gte:10` |
| `lt` | menor que | `fecha_movimiento:lt:2026-01-01` |
| `lte` | menor o igual | `stock:lte:5` |
| `in` | en lista | `tipo:in:ENTRADA,SALIDA` |
| `nin` | no en lista | `estado:nin:ANULADO` |
| `contains` | contiene (texto) | `nombre:contains:torre` |
| `starts` | comienza con | `sku:starts:REF-` |
| `ends` | termina con | `codigo:ends:-N2` |
| `between` | entre (rangos, fechas o números) | `fecha_movimiento:between:2026-01-01,2026-01-31` |
| `is_null` | es nulo | `lote_id:is_null:true` |
| `not_null` | no es nulo | `lote_id:not_null:true` |

**Reglas:**
- Los filtros por campos de relación usan el id (ej. `producto_id:eq:...`) y también pueden anidarse por campos del relacionado (ej. `producto.categoria_id:eq:...`).
- Múltiples filtros del mismo campo se combinan según la lógica del grupo (ver abajo).
- Las fechas se aceptan en ISO 8601 y se interpretan en la zona configurada.

### 15.6 Selección de campos (projection)

- `fields=campo1,campo2` → devuelve solo esos campos (menor payload, mayor velocidad).
- Admite anidación: `fields=producto.nombre,producto.sku`.
- Si no se indica, se devuelven todos los campos del recurso.

### 15.7 Agregaciones

- `group_by=campo` agrupa los registros filtrados.
- Métricas agregables: `sum(campo)`, `count(*)`, `avg(campo)`, `min(campo)`, `max(campo)`.
- `aggregations=sum(cantidad),count(*)` junto a `group_by=producto_id`.
- La respuesta de agregación incluye `groups[]` con `key`, `count` y las métricas pedidas.
- Las agregaciones son el motor de los reportes (§16) y deben estar **indexadas** para rendimiento.

### 15.8 Exportación

- `export=true` (o formato `export=csv|xlsx|json`) devuelve el resultado completo de la consulta (ignorando paginación, aplicando filtros/orden/búsqueda).
- Requiere permiso `exportar` del recurso.
- El archivo conserva el mismo conjunto de campos (o `fields` si se indicó).

### 15.9 Parámetros comunes y combinación

| Parámetro | Descripción |
|---|---|
| `page`, `page_size` | Paginación. |
| `sort` | Orden. |
| `q` | Búsqueda libre. |
| `filters` | Filtros estructurados (repetibles). |
| `filter_logic` | `AND` (defecto) o `OR` entre filtros; admite paréntesis simples de agrupación. |
| `fields` | Proyección. |
| `group_by`, `aggregations` | Agregación. |
| `export` | Exportación. |
| `include` | Expansión de relaciones (ej. `include=producto,lote`) opcional. |

Todos los parámetros se pueden combinar en una misma petición. La combinación de `group_by` con paginación devuelve las páginas de grupos.

### 15.10 Formato de respuesta unificado

Todo endpoint de colección responde:

```json
{
  "data": [ ... ],
  "meta": {
    "total": 1234,
    "page": 1,
    "page_size": 50,
    "total_pages": 25,
    "has_next": true,
    "has_prev": false
  }
}
```

Y para agregaciones:

```json
{
  "groups": [
    { "key": "PRODUCTO-A", "count": 12, "sum_cantidad": 480 }
  ],
  "meta": { "total": 12 }
}
```

Los errores de consulta (filtro inválido, campo inexistente, página fuera de rango) devuelven un mensaje claro y específico, sin romper la petición completa.

### 15.11 Rendimiento e indexación (regla de negocio)

- Todo campo usado en `filters`, `sort` o `group_by` debe estar **indexado** para consultas instantáneas.
- Las búsquedas de texto (`q`) y de `sku`/`codigo_barras` deben resolverse con índices de alto rendimiento.
- El sistema debe mantener materializados los saldos por (ubicación, producto, lote) para que las consultas de stock y las agregaciones de reportes sean instantáneas sin recalcular movimientos.
- Las consultas de trazabilidad profunda (histórico completo) pueden ser más lentas, pero deben responder dentro de límites razonables y están optimizadas por índices de (entidad_id, timestamp).

---

## 16. Métricas, reportes y análisis

### 16.1 Dashboard

Indicadores de cabecera:
- **Total de SKUs** activos y total de unidades.
- **Valor del inventario** (costo promedio o costo de entrada, configurable).
- **Alertas activas** (stock bajo, lotes por vencer, vencidos).
- **Precisión de inventario** (última sesión cerrada).
- **Movimientos de hoy** (entradas/salidas/traslados/ajustes).
- **Ubicaciones con stock** y ocupación (% de ubicaciones con stock vs. capacidad).

### 16.2 Reportes por área

| Reporte | Campos / filtros / agrupación típica |
|---|---|
| **Stock actual** | Por producto, categoría, ubicación, lote; filtrable por cualquier campo; exportable. |
| **Movimientos por periodo** | Por tipo, sub_tipo, usuario, ubicación, producto, fecha; totales por grupo. |
| **Entradas del periodo** | Por proveedor, producto, documento; sumas. |
| **Salidas del periodo** | Por cliente, producto, lote, documento; sumas. |
| **Kardex / tarjeta de stock** | Por producto/lote: todos los movimientos con saldo acumulado (entradas/salidas/saldo). |
| **Mermas y ajustes** | Por motivo, usuario, ubicación, periodo. |
| **Vencimientos** | Próximos 30/60/90 días y vencidos, por producto/lote/ubicación. |
| **Precisión por sesión** | Histórico de sesiones: exactitud por SKU/cantidad/ubicación, evolución. |
| **Auditoría** | Quién hizo qué, filtrable por usuario, acción, entidad, rango de fechas. |
| **Desempeño de usuarios** | Nº de movimientos por usuario/periodo. |

### 16.3 KPI definidos

1. **Precisión de inventario (SKU)** — objetivo ≥ 95%.
2. **Precisión por cantidad** — objetivo ≥ 98%.
3. **Exactitud por ubicación** — objetivo ≥ 90%.
4. **Rotación de stock** (salidas del periodo ÷ stock promedio) — informativo.
5. **Días de cobertura** (stock ÷ consumo diario promedio) — informativo.
6. **Tasa de merma** (unidades de merma ÷ unidades de entrada) × 100.
7. **Lotes vencidos sin dar de baja** — debe tender a 0.
8. **Antigüedad del stock** (días promedio desde la última entrada, por lote) — para detectar obsolescencia.

---

## 17. Alertas y notificaciones

### 17.1 Tipos de alertas

| Alerta | Cuándo se dispara |
|---|---|
| **Stock bajo** | Saldo de un producto (suma de ubicaciones) ≤ `stock_minimo`. |
| **Stock excedido** | Saldo > `stock_maximo`. |
| **Ubicación sobrecapacidad** | Intentar ingresar más de `capacidad_maxima`. |
| **Lote por vencer** | Lote con vencimiento en los próximos N días (configurable). |
| **Lote vencido** | Lote con vencimiento pasado y saldo > 0. |
| **Diferencia de inventario** | Sesión de conteo con diferencia detectada. |
| **Movimiento pendiente de aprobación** | Existe un movimiento en `PENDIENTE_APROBACION` sin resolver. |

### 17.2 Reglas de alertas

- Las alertas se calculan sobre datos indexados (saldos, vencimientos) y se pueden consultar/filtrar como cualquier recurso.
- Cada alerta tiene: tipo, severidad (`INFO`, `MEDIA`, `ALTA`), entidad asociada, fecha de detección, estado (`ABIERTA`, `RESUELTA`, `IGNORADA`).
- Resolver una alerta de stock bajo = registrar una entrada o subir el mínimo; resolver un vencido = merma o ajuste.
- Las alertas visibles dependen del permiso `ver` sobre el recurso involucrado.

---

## 18. Reglas de negocio de extremo a extremo (casos de uso)

### 18.1 Recepción de mercancía de un proveedor

1. El OPERADOR crea un movimiento `ENTRADA` / `COMPRA`, selecciona proveedor y documento de referencia.
2. Agrega líneas: producto, lote (si controla), cantidad, ubicación destino (debe estar activa y con capacidad).
3. Valida que no existan vencidos ni productos inactivos.
4. Guarda en `PENDIENTE_APROBACION` (política) o `APROBADO` si su rol lo permite.
5. ENCARGADO/GERENTE aprueba → el stock incrementa atómicamente en destino.
6. El sistema registra auditoría (quién creó, quién aprobó, cuándo).
7. Si llega más de lo recibido, se ajusta la cantidad del movimiento (aún editable si no está aprobado) o se crea uno nuevo.

### 18.2 Despacho de un pedido a cliente

1. El OPERADOR crea `SALIDA` / `CLIENTE`.
2. Líneas: producto, cantidad, cliente.
3. El sistema sugiere ubicaciones/lotes por FIFO/FEFO.
4. Valida saldo suficiente; si no, indica dónde hay stock.
5. Aprueba → el stock decrementa atómicamente; se registra auditoría.
6. La mercancía queda trazada: se puede reconstruir el origen de cada unidad despachada.

### 18.3 Traslado interno de mercancía

1. El OPERADOR crea `TRASLADO` con origen y destino.
2. Valida coherencia, saldo, capacidad y mismo almacén.
3. Aprueba → salida en origen + entrada en destino, atómico.
4. Queda trazado: la caja/ubicación muestra su nuevo contenido y su historial.

### 18.4 Inventario físico cíclico

1. ENCARGADO planea sesión `CICLICO` con alcance (zona X).
2. OPERADORES registran conteos (conteo ciego si aplica).
3. Diferencias detectadas; si `exige_doble_conteo`, se hace 2.º conteo.
4. ENCARGADO revisa diferencias → aprueba ajustes propuestos.
5. Cierra sesión → se generan los ajustes y se actualizan métricas de precisión.
6. Los ajustes quedan como movimientos trazables ligados a la sesión.

### 18.5 Devolución de un cliente

1. OPERADOR crea `ENTRADA` / `DEVOLUCION_CLIENTE` hacia ubicación de tipo `DEVOLUCION`.
2. Si el producto controla lote, registra lote (o crea uno con vencimiento informado).
3. Aprueba → incrementa stock en la ubicación de devoluciones.
4. El stock queda disponible para inspección; si es merma, luego se da de baja por `MERMA`.

### 18.6 Merma detectada por daño

1. OPERADOR detecta caja dañada en la ubicación.
2. Crea `SALIDA` / `MERMA` con motivo obligatorio ("daño", "humedad", etc.).
3. Agrega comentario en el movimiento explicando el detalle.
4. ENCARGADO aprueba → el stock decrementa; la merma queda trazada y suma a la tasa de merma.

---

## 19. Reglas de negocio no negociables (checklist)

- [ ] Toda alteración de stock pasa por un movimiento con tipo, motivo y autor.
- [ ] Ningún saldo puede quedar negativo.
- [ ] Todo movimiento aprobado es inmutable; anular crea el inverso, nunca "deshace".
- [ ] Todo listado de datos es filtrable, ordenable, buscable, paginable y seccionable.
- [ ] Todo listado de datos tiene agregaciones y exportación disponibles.
- [ ] Todos los campos consultables están indexados para rendimiento.
- [ ] Todo cambio de entidad queda en auditoría (quién, qué, cuándo, dónde).
- [ ] Las entidades con historia se desactivan, no se borran.
- [ ] Los productos con `controla_lote` exigen lote en todos sus movimientos.
- [ ] Los lotes vencidos nunca salen a cliente; solo a merma o ajuste.
- [ ] La precisión del inventario se mide, se reporta y es consultable.
- [ ] Las fechas se manejan con zona horaria; `fecha_movimiento` ≠ `created_at`.
- [ ] El saldo es derivado de movimientos: no existe cifra de stock sin respaldo.
- [ ] La matriz de permisos se aplica en toda operación, sin excepción.
- [ ] El conteo ciego no muestra saldos al contador cuando está activo.

---

## 20. Futuras extensiones (fuera de alcance actual)

Documentadas para no romper el modelo cuando se implementen:

1. **Reservas / stock comprometido**: campo de stock reservado para pedidos (solo lectura en v1).
2. **Pedidos (órdenes de venta/compra)**: entidad que agrupe líneas y genere los movimientos.
3. **Multi-rol por usuario**: asignación de varios roles y permisos finos por recurso.
4. **Integraciones opcionales** (decisión explícita del dueño): escáneres con hardware, impresión de etiquetas QR, email de alertas. Siempre como plugins opcionales.
5. **Múltiples almacenes multi-sede** ya modelado en el árbol (traslados inter-almacén).
6. **Valorización de inventario** con método configurable (promedio, FIFO, último costo).
7. **API pública para consumidores externos**, exponiendo el mismo estándar de consulta (§15).
8. **Auditoría de accesos** (quién vio qué) — en v1 solo se audita lo que altera datos y los intentos de acceso denegado.

---

*Fin del SPEC — Rustock v0.1. Este documento es la única fuente de verdad de la lógica de negocio.*

---

## 16. Reglas de negocio configurables

El almacén de cada cliente tiene restricciones que no caben en el modelo general: un rack que no aguanta más de 800 kg, un pasillo de refrigerados donde no puede entrar química, una zona de picking donde cada ubicación admite un solo SKU. Codificarlas en Rust obligaría a recompilar por cliente; dejarlas fuera obliga a confiar en que nadie se equivoque.

### 16.1 Anatomía de una regla

Una regla es **una frase con tres partes**:

> En **el RACK-A1** (dónde), el peso total no puede pasar de **800 kg** (qué), y si se pasa **no se aprueba el movimiento** (severidad).

**Dónde — ámbito.** `ALMACEN` · `ZONA` · `PASILLO` · `RACK` · `SECCION` · `UBICACION`. Con elemento concreto o sin él: sin elemento, la regla vale para **todos** los de ese nivel («ninguna ubicación admite más de un SKU» es una sola fila).

**Qué — tipo:**

| Tipo | Limita |
|---|---|
| `PESO_MAXIMO` | Kilos acumulados en el ámbito |
| `CANTIDAD_MAXIMA` | Unidades acumuladas |
| `VOLUMEN_MAXIMO` | Volumen acumulado |
| `PRODUCTOS_DISTINTOS_MAXIMO` | Cuántos SKU conviven; con valor 1 fuerza homogeneidad |
| `CATEGORIA_PROHIBIDA` | Una categoría que no entra |
| `CATEGORIA_EXCLUSIVA` | Solo esa categoría entra |
| `PRODUCTO_PROHIBIDO` | Un producto concreto que no entra |
| `REQUIERE_LOTE` | Nada entra sin lote, aunque el producto no lo exija |
| `PROHIBIR_VENCIDO` | Ningún lote vencido entra, ni en un ajuste |

**Severidad.** `BLOQUEA` detiene el movimiento; `ADVIERTE` deja pasar y registra — sirve para estrenar una regla sin frenar la operación mientras se comprueba que está bien puesta.

### 16.2 Cómo se evalúan

- **Se evalúa el estado resultante, no el actual.** La pregunta no es «¿el rack está por debajo de 800 kg?» sino «¿seguiría estándolo *después* de meter esto?». Comprobar el estado actual dejaría entrar siempre la última caja, que es justo la que rompe el límite.
- **La regla del ámbito superior alcanza a todo lo que cuelga de él.** Una regla de zona protege sus racks y ubicaciones sin repetirla. Sin esto habría que escribirla ubicación por ubicación, y la primera que se olvidara sería el agujero.
- **Se evalúan en la aprobación y dentro de la misma transacción** que mueve el saldo. Comprobarlas antes dejaría una ventana en la que otro movimiento aprobado en paralelo llenaría el rack entre la comprobación y el apunte.
- **Una regla que no puede evaluarse avisa en vez de callar.** Si un tope de peso encuentra un producto sin peso unitario, lo dice y deja pasar: una protección que el cliente cree tener y no tiene debe decirse en voz alta, pero no puede frenar la operación por un dato que falta en el catálogo.
- **El mensaje del cliente gana** sobre el que redacta el sistema: sabe explicar su propia regla mejor que una frase genérica.

`simular_reglas` evalúa una línea **antes** de registrarla, para avisar mientras se llena el formulario en vez de dejar que la persona termine el movimiento y descubra al aprobar que no cabía.

### 16.3 Permisos

`regla:ver` lo tienen todos los roles salvo LECTOR — hace falta para que la interfaz explique por qué se bloqueó un movimiento. `regla:crear`, `regla:editar` y `regla:eliminar` son de GERENTE y ADMIN: las restricciones de la operación las define quien responde de ella.

---

## 17. Internacionalización

Rustock habla **castellano e inglés**. El idioma no es una capa de barniz sobre una interfaz escrita en castellano: es una propiedad del sistema, y por eso alcanza también a los mensajes de error del backend (§17.3).

### 17.1 Diccionarios tipados

Los diccionarios son **objetos de TypeScript**, no archivos de datos. `es` es la fuente de verdad y el resto de idiomas se declaran con el tipo derivado de él:

```ts
export const en: Diccionario = { … };  // falta una clave → no compila
```

Esto es deliberado y es la diferencia con los `.json` de traducción al uso: allí una clave olvidada se descubre en producción, como un hueco vacío o una clave cruda en pantalla. Aquí no llega a compilar.

Las entradas con datos son **funciones**, no plantillas con marcadores:

```ts
mostrando: (p: { desde: number; hasta: number; total: number }) => `Mostrando ${p.desde}–${p.hasta} de ${p.total}`
```

Dos ventajas: olvidar un parámetro es un error de compilación, y cada idioma ordena la frase como le corresponde en vez de rellenar huecos en el orden que impuso el castellano.

### 17.2 Dónde se guarda la elección

| Dónde | Para qué |
|---|---|
| En el equipo (`localStorage`) | Pintar el **primer frame** en el idioma correcto. La preferencia del perfil llega por red; sin copia local, la pantalla de acceso saldría siempre en castellano y cambiaría de golpe al entrar. |
| En el perfil (backend) | Que la persona encuentre su idioma en cualquier equipo del almacén. |

Una elección explícita hecha en el equipo **manda** sobre la del perfil: quien acaba de cambiar el idioma no espera que la siguiente carga lo revierta.

Sin elección previa se usa el del navegador, y si no lo hablamos, castellano.

### 17.3 Errores del backend

El backend **no redacta mensajes**: devuelve un código y sus datos, y la interfaz compone la frase en el idioma activo.

```
backend → { codigo: "SALDO_INSUFICIENTE", datos: { ubicacion: "RACK-A1", disponible: 5, intentado: 8 } }
es      → "Saldo insuficiente en RACK-A1: 5 disponibles, se intentaron 8"
en      → "Insufficient stock in RACK-A1: 5 available, 8 attempted"
```

Es la única forma de que añadir un idioma no obligue a tocar Rust ni a recompilar. Y evita lo peor de las alternativas: que quien use la aplicación en inglés reciba los mensajes de error en castellano, justo cuando más importa entender.

**Limitación conocida.** Dos variantes genéricas —`CAMPO_REQUERIDO` y `CAMPO_INVALIDO`— reciben hoy el nombre del campo como **frase en castellano** (`"límite en kg para la regla 'Sin tope'"`). Traducir el envoltorio no basta si el relleno sigue en castellano: hay 104 puntos de llamada que deben pasar a claves de campo estables para cerrar el círculo.

### 17.4 Reglas

- **Las URL no se traducen.** Un enlace compartido tiene que abrir lo mismo para todo el mundo.
- `<html lang>` refleja el idioma activo: de él dependen el lector de pantalla, el corrector y la separación silábica del navegador.
- El selector vive en la barra superior, no enterrado en Configuración: quien abre la aplicación en un idioma que no entiende necesita encontrarlo **sin leer nada**. Por eso cada opción se muestra en su propia lengua («English», no «Inglés»).
- Fechas, horas y números se formatean con `Intl` y la etiqueta BCP-47 del idioma activo, respetando la zona horaria de las preferencias (§14.4).
