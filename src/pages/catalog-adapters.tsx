/**
 * Registro de catálogos reales (SPEC §3): un adaptador por entidad que
 * conecta el listado/detalle genérico (`CatalogPages.tsx`) al backend real
 * vía el motor de consulta universal (§15). Solo Almacén y Producto tienen
 * `crearHref`/`editarHref`/`eliminarHref` en esta pasada — el resto queda
 * con listado + detalle reales pero sin formulario propio (alcance
 * documentado en el plan, ver MEMORY.md Hito 8).
 */
import {
  desactivarAlmacen,
  desactivarCaja,
  desactivarCategoria,
  desactivarCliente,
  desactivarPasillo,
  desactivarProducto,
  desactivarProveedor,
  desactivarRack,
  desactivarSeccion,
  desactivarUbicacion,
  desactivarUom,
  desactivarZona,
  listarCajas,
  listarCategorias,
  listarClientes,
  listarLotes,
  listarPasillos,
  listarProveedores,
  listarRacks,
  listarSecciones,
  listarUbicaciones,
  listarUoms,
  listarZonas,
  obtenerAlmacen,
  obtenerCaja,
  obtenerCategoria,
  obtenerCliente,
  obtenerLote,
  obtenerPasillo,
  obtenerProducto,
  obtenerProveedor,
  obtenerRack,
  obtenerSeccion,
  obtenerUbicacion,
  obtenerUom,
  obtenerZona,
} from "../shared/backend";
import * as backend from "../shared/backend";
import {
  AlmacenRef,
  CategoriaRef,
  LoteRef,
  PasilloRef,
  ProductoRef,
  RackRef,
  UbicacionRef,
  UomRef,
  ZonaRef,
} from "../shared/refs";
import type {
  Almacen,
  Caja,
  Categoria,
  Cliente,
  Listado,
  ListParams,
  Lote,
  Pasillo,
  Producto,
  Proveedor,
  Rack,
  Seccion,
  Ubicacion,
  Uom,
  Zona,
} from "../shared/types";
import { Badge, type DetailItem, type IconName, type TableColumn } from "../shared/ui";
import { catalogoEditar, catalogoEliminar, catalogoLista } from "../app/route-paths";
import { formatearFecha, formatearFechaCorta } from "../shared/format";

export interface CatalogAdapter<T extends { id: string }> {
  titulo: string;
  descripcion: string;
  singular: string;
  /** Género gramatical de `singular`, para concordancia en la UI (Nuevo/Nueva,
   * el primer/la primera, desactivado/desactivada). Por defecto masculino. */
  genero?: "F";
  icon: IconName;
  listar: (p?: ListParams) => Promise<Listado<T>>;
  obtener: (id: string) => Promise<T | null>;
  columnas: TableColumn<T>[];
  datosGenerales: (row: T) => DetailItem[];
  tituloDetalle: (row: T) => string;
  /** `undefined` = la entidad no tiene borrado lógico visible (ej. Lote, UOM). */
  activo?: (row: T) => boolean;
  crearHref?: string;
  editarHref?: (id: string) => string;
  eliminarHref?: (id: string) => string;
  /** Ruta "nuevo" precargada con los datos de un registro existente (duplicar). */
  duplicarHref?: (id: string) => string;
  desactivar?: (id: string) => Promise<void>;
}

function badgeActivo(activo: boolean) {
  return (
    <Badge tone={activo ? "success" : "neutral"} icon={activo ? "aprobar" : "anular"}>
      {activo ? "Activo" : "Inactivo"}
    </Badge>
  );
}

/** Filas de posición en el mapa 2D/3D, comunes a Zona/Pasillo/Rack/Ubicación. */
function filasPosicion(n: {
  pos_x: number | null;
  pos_y: number | null;
  pos_z: number | null;
  altura: number | null;
}): DetailItem[] {
  return [
    {
      label: "Posición (X, Y)",
      value: n.pos_x !== null && n.pos_y !== null ? `${n.pos_x}, ${n.pos_y}` : "—",
    },
    {
      label: "Altura (Z)",
      value:
        n.pos_z !== null || n.altura !== null ? `z=${n.pos_z ?? "—"} · h=${n.altura ?? "—"}` : "—",
    },
  ];
}

const almacenAdapter: CatalogAdapter<Almacen> = {
  titulo: "Almacenes",
  descripcion: "Catálogo de almacenes y su estado operativo.",
  singular: "Almacén",
  icon: "almacen",
  listar: backend.listarAlmacenes,
  obtener: obtenerAlmacen,
  columnas: [
    { key: "codigo", header: "Código", code: true, sortable: true, render: (r) => r.codigo },
    { key: "nombre", header: "Nombre", sortable: true, render: (r) => r.nombre },
    { key: "direccion", header: "Dirección", render: (r) => r.direccion ?? "—" },
    { key: "activo", header: "Estado", render: (r) => badgeActivo(r.activo) },
  ],
  datosGenerales: (r) => [
    { label: "Código", value: r.codigo, code: true },
    { label: "Nombre", value: r.nombre },
    { label: "Descripción", value: r.descripcion ?? "—" },
    { label: "Dirección", value: r.direccion ?? "—" },
    { label: "Creado", value: formatearFecha(r.created_at) },
    { label: "Última actualización", value: formatearFecha(r.updated_at) },
  ],
  tituloDetalle: (r) => `${r.codigo} — ${r.nombre}`,
  activo: (r) => r.activo,
  crearHref: catalogoLista("almacenes") + "/nuevo",
  editarHref: (id) => catalogoEditar("almacenes", id),
  eliminarHref: (id) => catalogoEliminar("almacenes", id),
  desactivar: desactivarAlmacen,
};

const ubicacionAdapter: CatalogAdapter<Ubicacion> = {
  titulo: "Ubicaciones",
  descripcion: "Ubicaciones de almacenamiento (bins).",
  singular: "Ubicación",
  genero: "F",
  icon: "ubicacion",
  listar: listarUbicaciones,
  obtener: obtenerUbicacion,
  columnas: [
    { key: "codigo", header: "Código", code: true, sortable: true, render: (r) => r.codigo },
    { key: "nombre", header: "Nombre", render: (r) => r.nombre ?? "—" },
    { key: "tipo", header: "Tipo", render: (r) => r.tipo },
    {
      key: "capacidad_maxima",
      header: "Capacidad máxima",
      num: true,
      render: (r) => r.capacidad_maxima?.toLocaleString() ?? "—",
    },
    { key: "activo", header: "Estado", render: (r) => badgeActivo(r.activo) },
  ],
  datosGenerales: (r) => [
    { label: "Código", value: r.codigo, code: true },
    { label: "Nombre", value: r.nombre ?? "—" },
    { label: "Tipo", value: r.tipo },
    { label: "Capacidad máxima", value: r.capacidad_maxima?.toLocaleString() ?? "—" },
    ...filasPosicion(r),
    { label: "Creado", value: formatearFecha(r.created_at) },
  ],
  tituloDetalle: (r) => (r.nombre ? `${r.codigo} — ${r.nombre}` : r.codigo),
  activo: (r) => r.activo,
  crearHref: catalogoLista("ubicaciones") + "/nuevo",
  editarHref: (id) => catalogoEditar("ubicaciones", id),
  eliminarHref: (id) => catalogoEliminar("ubicaciones", id),
  duplicarHref: (id) => `${catalogoLista("ubicaciones")}/nuevo?duplicarDe=${id}`,
  desactivar: desactivarUbicacion,
};

const productoAdapter: CatalogAdapter<Producto> = {
  titulo: "Productos",
  descripcion: "Catálogo de productos y SKU.",
  singular: "Producto",
  icon: "producto",
  listar: backend.listarProductos,
  obtener: obtenerProducto,
  columnas: [
    { key: "sku", header: "SKU", code: true, sortable: true, render: (r) => r.sku },
    { key: "nombre", header: "Nombre", sortable: true, render: (r) => r.nombre },
    {
      key: "controla_lote",
      header: "Control",
      render: (r) => (
        <div className="flex gap-1">
          {r.controla_lote ? <Badge tone="info">Lote</Badge> : null}
          {r.controla_vencimiento ? <Badge tone="warning">Vencimiento</Badge> : null}
          {r.perecedero ? <Badge tone="danger">Perecedero</Badge> : null}
        </div>
      ),
    },
    { key: "activo", header: "Estado", render: (r) => badgeActivo(r.activo) },
  ],
  datosGenerales: (r) => [
    { label: "SKU", value: r.sku, code: true },
    { label: "Nombre", value: r.nombre },
    { label: "Descripción", value: r.descripcion ?? "—" },
    {
      label: "Categoría",
      value: r.categoria_id ? <CategoriaRef id={r.categoria_id} /> : "—",
    },
    { label: "UOM base", value: <UomRef id={r.uom_base_id} /> },
    { label: "UOM venta", value: r.uom_venta_id ? <UomRef id={r.uom_venta_id} /> : "—" },
    { label: "UOM compra", value: r.uom_compra_id ? <UomRef id={r.uom_compra_id} /> : "—" },
    { label: "Código de barras", value: r.codigo_barras ?? "—", code: true },
    { label: "Peso unitario (kg)", value: r.peso_unitario ?? "—", num: true },
    { label: "Volumen unitario (m³)", value: r.volumen_unitario ?? "—", num: true },
    { label: "Stock mínimo", value: r.stock_minimo ?? "—", num: true },
    { label: "Stock máximo", value: r.stock_maximo ?? "—", num: true },
    { label: "Controla lote", value: r.controla_lote ? "Sí" : "No" },
    { label: "Controla vencimiento", value: r.controla_vencimiento ? "Sí" : "No" },
    { label: "Perecedero", value: r.perecedero ? "Sí" : "No" },
    { label: "Creado", value: formatearFecha(r.created_at) },
  ],
  tituloDetalle: (r) => `${r.sku} — ${r.nombre}`,
  activo: (r) => r.activo,
  crearHref: catalogoLista("productos") + "/nuevo",
  editarHref: (id) => catalogoEditar("productos", id),
  eliminarHref: (id) => catalogoEliminar("productos", id),
  duplicarHref: (id) => `${catalogoLista("productos")}/nuevo?duplicarDe=${id}`,
  desactivar: desactivarProducto,
};

const loteAdapter: CatalogAdapter<Lote> = {
  titulo: "Lotes",
  descripcion: "Lotes de producción y vencimientos.",
  singular: "Lote",
  icon: "lote",
  listar: listarLotes,
  obtener: obtenerLote,
  columnas: [
    { key: "numero", header: "Número", code: true, sortable: true, render: (r) => r.numero },
    { key: "producto_id", header: "Producto", render: (r) => <ProductoRef id={r.producto_id} /> },
    {
      key: "fecha_vencimiento",
      header: "Vencimiento",
      render: (r) => (r.fecha_vencimiento ? formatearFechaCorta(r.fecha_vencimiento) : "—"),
    },
    { key: "origen", header: "Origen", render: (r) => r.origen ?? "—" },
  ],
  datosGenerales: (r) => [
    { label: "Número", value: r.numero, code: true },
    { label: "Producto", value: <ProductoRef id={r.producto_id} /> },
    {
      label: "Fecha de fabricación",
      value: r.fecha_fabricacion ? formatearFechaCorta(r.fecha_fabricacion) : "—",
    },
    {
      label: "Fecha de vencimiento",
      value: r.fecha_vencimiento ? formatearFechaCorta(r.fecha_vencimiento) : "—",
    },
    { label: "Origen", value: r.origen ?? "—" },
    { label: "Notas", value: r.notas ?? "—" },
    { label: "Creado", value: formatearFecha(r.created_at) },
  ],
  tituloDetalle: (r) => r.numero,
  crearHref: catalogoLista("lotes") + "/nuevo",
  editarHref: (id) => catalogoEditar("lotes", id),
  duplicarHref: (id) => `${catalogoLista("lotes")}/nuevo?duplicarDe=${id}`,
};

const categoriaAdapter: CatalogAdapter<Categoria> = {
  titulo: "Categorías",
  descripcion: "Clasificación de productos.",
  singular: "Categoría",
  genero: "F",
  icon: "categoria",
  listar: listarCategorias,
  obtener: obtenerCategoria,
  columnas: [
    { key: "nombre", header: "Nombre", sortable: true, render: (r) => r.nombre },
    {
      key: "parent_id",
      header: "Categoría padre",
      render: (r) => (r.parent_id ? <CategoriaRef id={r.parent_id} /> : "—"),
    },
    { key: "activo", header: "Estado", render: (r) => badgeActivo(r.activo) },
  ],
  datosGenerales: (r) => [
    { label: "Nombre", value: r.nombre },
    { label: "Descripción", value: r.descripcion ?? "—" },
    { label: "Categoría padre", value: r.parent_id ? <CategoriaRef id={r.parent_id} /> : "—" },
    { label: "Creado", value: formatearFecha(r.created_at) },
  ],
  tituloDetalle: (r) => r.nombre,
  activo: (r) => r.activo,
  crearHref: catalogoLista("categorias") + "/nuevo",
  editarHref: (id) => catalogoEditar("categorias", id),
  eliminarHref: (id) => catalogoEliminar("categorias", id),
  desactivar: desactivarCategoria,
};

const uomAdapter: CatalogAdapter<Uom> = {
  titulo: "Unidades de medida",
  descripcion: "Unidades de medida de los productos.",
  singular: "Unidad",
  genero: "F",
  icon: "uom",
  listar: listarUoms,
  obtener: obtenerUom,
  columnas: [
    { key: "codigo", header: "Código", code: true, sortable: true, render: (r) => r.codigo },
    { key: "nombre", header: "Nombre", sortable: true, render: (r) => r.nombre },
    { key: "tipo", header: "Tipo", render: (r) => r.tipo },
    { key: "factor", header: "Factor", num: true, render: (r) => r.factor },
    {
      key: "base",
      header: "Base de familia",
      render: (r) => (r.base ? <Badge tone="info">Base</Badge> : "—"),
    },
    { key: "activo", header: "Estado", render: (r) => badgeActivo(r.activo) },
  ],
  datosGenerales: (r) => [
    { label: "Código", value: r.codigo, code: true },
    { label: "Nombre", value: r.nombre },
    { label: "Tipo", value: r.tipo },
    { label: "Factor de conversión", value: r.factor, num: true },
    { label: "Es base de su familia", value: r.base ? "Sí" : "No" },
    { label: "Creado", value: formatearFecha(r.created_at) },
  ],
  tituloDetalle: (r) => `${r.codigo} — ${r.nombre}`,
  activo: (r) => r.activo,
  crearHref: catalogoLista("uoms") + "/nuevo",
  editarHref: (id) => catalogoEditar("uoms", id),
  eliminarHref: (id) => catalogoEliminar("uoms", id),
  desactivar: desactivarUom,
};

function contactoColumnas<T extends { contacto_telefono: string | null; activo: boolean }>(): Array<
  TableColumn<T>
> {
  return [
    {
      key: "contacto_telefono",
      header: "Teléfono",
      code: true,
      render: (r) => r.contacto_telefono ?? "—",
    },
    { key: "activo", header: "Estado", render: (r) => badgeActivo(r.activo) },
  ];
}

function contactoDatos(r: Proveedor | Cliente): DetailItem[] {
  return [
    { label: "Código", value: r.codigo, code: true },
    { label: "Nombre", value: r.nombre },
    { label: "Contacto", value: r.contacto_nombre ?? "—" },
    { label: "Teléfono", value: r.contacto_telefono ?? "—", code: true },
    { label: "Email", value: r.contacto_email ?? "—" },
    { label: "Dirección", value: r.direccion ?? "—" },
    { label: "Creado", value: formatearFecha(r.created_at) },
  ];
}

const proveedorAdapter: CatalogAdapter<Proveedor> = {
  titulo: "Proveedores",
  descripcion: "Proveedores de productos y materiales.",
  singular: "Proveedor",
  icon: "proveedor",
  listar: listarProveedores,
  obtener: obtenerProveedor,
  columnas: [
    { key: "codigo", header: "Código", code: true, sortable: true, render: (r) => r.codigo },
    { key: "nombre", header: "Nombre", sortable: true, render: (r) => r.nombre },
    ...contactoColumnas<Proveedor>(),
  ],
  datosGenerales: contactoDatos,
  tituloDetalle: (r) => `${r.codigo} — ${r.nombre}`,
  activo: (r) => r.activo,
  crearHref: catalogoLista("proveedores") + "/nuevo",
  editarHref: (id) => catalogoEditar("proveedores", id),
  eliminarHref: (id) => catalogoEliminar("proveedores", id),
  desactivar: desactivarProveedor,
};

const clienteAdapter: CatalogAdapter<Cliente> = {
  titulo: "Clientes",
  descripcion: "Clientes que reciben despachos.",
  singular: "Cliente",
  icon: "cliente",
  listar: listarClientes,
  obtener: obtenerCliente,
  columnas: [
    { key: "codigo", header: "Código", code: true, sortable: true, render: (r) => r.codigo },
    { key: "nombre", header: "Nombre", sortable: true, render: (r) => r.nombre },
    ...contactoColumnas<Cliente>(),
  ],
  datosGenerales: contactoDatos,
  tituloDetalle: (r) => `${r.codigo} — ${r.nombre}`,
  activo: (r) => r.activo,
  crearHref: catalogoLista("clientes") + "/nuevo",
  editarHref: (id) => catalogoEditar("clientes", id),
  eliminarHref: (id) => catalogoEliminar("clientes", id),
  desactivar: desactivarCliente,
};

const zonaAdapter: CatalogAdapter<Zona> = {
  titulo: "Zonas",
  descripcion: "Divisiones lógicas o físicas dentro de un almacén.",
  singular: "Zona",
  genero: "F",
  icon: "zona",
  listar: listarZonas,
  obtener: obtenerZona,
  columnas: [
    { key: "codigo", header: "Código", code: true, sortable: true, render: (r) => r.codigo },
    { key: "nombre", header: "Nombre", sortable: true, render: (r) => r.nombre },
    { key: "almacen_id", header: "Almacén", render: (r) => <AlmacenRef id={r.almacen_id} /> },
    { key: "activo", header: "Estado", render: (r) => badgeActivo(r.activo) },
  ],
  datosGenerales: (r) => [
    { label: "Código", value: r.codigo, code: true },
    { label: "Nombre", value: r.nombre },
    { label: "Descripción", value: r.descripcion ?? "—" },
    { label: "Almacén", value: <AlmacenRef id={r.almacen_id} /> },
    ...filasPosicion(r),
    { label: "Creado", value: formatearFecha(r.created_at) },
  ],
  tituloDetalle: (r) => `${r.codigo} — ${r.nombre}`,
  activo: (r) => r.activo,
  crearHref: catalogoLista("zonas") + "/nuevo",
  editarHref: (id) => catalogoEditar("zonas", id),
  eliminarHref: (id) => catalogoEliminar("zonas", id),
  desactivar: desactivarZona,
};

const pasilloAdapter: CatalogAdapter<Pasillo> = {
  titulo: "Pasillos",
  descripcion: "Pasillos físicos que agrupan racks dentro de una zona.",
  singular: "Pasillo",
  icon: "zona",
  listar: listarPasillos,
  obtener: obtenerPasillo,
  columnas: [
    { key: "codigo", header: "Código", code: true, sortable: true, render: (p) => p.codigo },
    { key: "nombre", header: "Nombre", render: (p) => p.nombre ?? "—" },
    { key: "zona_id", header: "Zona", render: (p) => <ZonaRef id={p.zona_id} /> },
    { key: "activo", header: "Estado", render: (p) => badgeActivo(p.activo) },
  ],
  datosGenerales: (p) => [
    { label: "Código", value: p.codigo, code: true },
    { label: "Nombre", value: p.nombre ?? "—" },
    { label: "Zona", value: <ZonaRef id={p.zona_id} /> },
    ...filasPosicion(p),
    { label: "Creado", value: formatearFecha(p.created_at) },
  ],
  tituloDetalle: (p) => (p.nombre ? `${p.codigo} — ${p.nombre}` : p.codigo),
  activo: (p) => p.activo,
  crearHref: catalogoLista("pasillos") + "/nuevo",
  editarHref: (id) => catalogoEditar("pasillos", id),
  eliminarHref: (id) => catalogoEliminar("pasillos", id),
  desactivar: desactivarPasillo,
};

const rackAdapter: CatalogAdapter<Rack> = {
  titulo: "Racks",
  descripcion: "Estructuras de almacenamiento dentro de una zona.",
  singular: "Rack",
  icon: "zona",
  listar: listarRacks,
  obtener: obtenerRack,
  columnas: [
    { key: "codigo", header: "Código", code: true, sortable: true, render: (r) => r.codigo },
    { key: "nombre", header: "Nombre", render: (r) => r.nombre ?? "—" },
    { key: "tipo", header: "Tipo", render: (r) => r.tipo ?? "—" },
    { key: "zona_id", header: "Zona", render: (r) => <ZonaRef id={r.zona_id} /> },
    {
      key: "pasillo_id",
      header: "Pasillo",
      render: (r) => (r.pasillo_id ? <PasilloRef id={r.pasillo_id} /> : "—"),
    },
    { key: "activo", header: "Estado", render: (r) => badgeActivo(r.activo) },
  ],
  datosGenerales: (r) => [
    { label: "Código", value: r.codigo, code: true },
    { label: "Nombre", value: r.nombre ?? "—" },
    { label: "Tipo", value: r.tipo ?? "—" },
    { label: "Zona", value: <ZonaRef id={r.zona_id} /> },
    {
      label: "Pasillo",
      value: r.pasillo_id ? <PasilloRef id={r.pasillo_id} /> : "—",
    },
    ...filasPosicion(r),
    { label: "Creado", value: formatearFecha(r.created_at) },
  ],
  tituloDetalle: (r) => (r.nombre ? `${r.codigo} — ${r.nombre}` : r.codigo),
  activo: (r) => r.activo,
  crearHref: catalogoLista("racks") + "/nuevo",
  editarHref: (id) => catalogoEditar("racks", id),
  eliminarHref: (id) => catalogoEliminar("racks", id),
  desactivar: desactivarRack,
};

const seccionAdapter: CatalogAdapter<Seccion> = {
  titulo: "Secciones",
  descripcion: "Subdivisiones de un rack (niveles, bahías).",
  singular: "Sección",
  genero: "F",
  icon: "zona",
  listar: listarSecciones,
  obtener: obtenerSeccion,
  columnas: [
    { key: "codigo", header: "Código", code: true, sortable: true, render: (r) => r.codigo },
    { key: "nombre", header: "Nombre", render: (r) => r.nombre ?? "—" },
    { key: "nivel", header: "Nivel", render: (r) => r.nivel ?? "—" },
    { key: "rack_id", header: "Rack", render: (r) => <RackRef id={r.rack_id} /> },
    { key: "activo", header: "Estado", render: (r) => badgeActivo(r.activo) },
  ],
  datosGenerales: (r) => [
    { label: "Código", value: r.codigo, code: true },
    { label: "Nombre", value: r.nombre ?? "—" },
    { label: "Nivel", value: r.nivel ?? "—" },
    { label: "Rack", value: <RackRef id={r.rack_id} /> },
    { label: "Descripción", value: r.descripcion ?? "—" },
    { label: "Creado", value: formatearFecha(r.created_at) },
  ],
  tituloDetalle: (r) => (r.nombre ? `${r.codigo} — ${r.nombre}` : r.codigo),
  activo: (r) => r.activo,
  crearHref: catalogoLista("secciones") + "/nuevo",
  editarHref: (id) => catalogoEditar("secciones", id),
  eliminarHref: (id) => catalogoEliminar("secciones", id),
  desactivar: desactivarSeccion,
};

const cajaAdapter: CatalogAdapter<Caja> = {
  titulo: "Cajas",
  descripcion: "Contenedores dentro de una ubicación que agrupan stock.",
  singular: "Caja",
  genero: "F",
  icon: "caja",
  listar: listarCajas,
  obtener: obtenerCaja,
  columnas: [
    { key: "codigo", header: "Código", code: true, sortable: true, render: (r) => r.codigo },
    { key: "nombre", header: "Nombre", render: (r) => r.nombre ?? "—" },
    {
      key: "ubicacion_id",
      header: "Ubicación",
      render: (r) => <UbicacionRef id={r.ubicacion_id} />,
    },
    {
      key: "producto_id",
      header: "Producto",
      render: (r) => (r.producto_id ? <ProductoRef id={r.producto_id} /> : "—"),
    },
    { key: "activo", header: "Estado", render: (r) => badgeActivo(r.activo) },
  ],
  datosGenerales: (r) => [
    { label: "Código", value: r.codigo, code: true },
    { label: "Nombre", value: r.nombre ?? "—" },
    { label: "Ubicación", value: <UbicacionRef id={r.ubicacion_id} /> },
    {
      label: "Producto restringido",
      value: r.producto_id ? <ProductoRef id={r.producto_id} /> : "—",
    },
    { label: "Lote restringido", value: r.lote_id ? <LoteRef id={r.lote_id} /> : "—" },
    { label: "Etiqueta", value: r.etiqueta ?? "—", code: true },
    { label: "Creado", value: formatearFecha(r.created_at) },
  ],
  tituloDetalle: (r) => (r.nombre ? `${r.codigo} — ${r.nombre}` : r.codigo),
  activo: (r) => r.activo,
  crearHref: catalogoLista("cajas") + "/nuevo",
  editarHref: (id) => catalogoEditar("cajas", id),
  eliminarHref: (id) => catalogoEliminar("cajas", id),
  desactivar: desactivarCaja,
};

export const CATALOGOS: Record<string, CatalogAdapter<any>> = {
  almacenes: almacenAdapter,
  zonas: zonaAdapter,
  pasillos: pasilloAdapter,
  racks: rackAdapter,
  secciones: seccionAdapter,
  ubicaciones: ubicacionAdapter,
  cajas: cajaAdapter,
  productos: productoAdapter,
  lotes: loteAdapter,
  categorias: categoriaAdapter,
  uoms: uomAdapter,
  proveedores: proveedorAdapter,
  clientes: clienteAdapter,
};
