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
  desactivarProducto,
  listarCategorias,
  listarClientes,
  listarLotes,
  listarProveedores,
  listarUbicaciones,
  listarUoms,
  obtenerAlmacen,
  obtenerCategoria,
  obtenerCliente,
  obtenerLote,
  obtenerProducto,
  obtenerProveedor,
  obtenerUbicacion,
  obtenerUom,
} from "../shared/backend";
import * as backend from "../shared/backend";
import { CategoriaRef, ProductoRef, UomRef } from "../shared/refs";
import type {
  Almacen,
  Categoria,
  Cliente,
  Listado,
  ListParams,
  Lote,
  Producto,
  Proveedor,
  Ubicacion,
  Uom,
} from "../shared/types";
import { Badge, type DetailItem, type IconName, type TableColumn } from "../shared/ui";
import { catalogoEditar, catalogoEliminar, catalogoLista } from "../app/route-paths";
import { formatearFecha, formatearFechaCorta } from "../shared/format";

export interface CatalogAdapter<T extends { id: string }> {
  titulo: string;
  descripcion: string;
  singular: string;
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
  desactivar?: (id: string) => Promise<void>;
}

function badgeActivo(activo: boolean) {
  return (
    <Badge tone={activo ? "success" : "neutral"} icon={activo ? "aprobar" : "anular"}>
      {activo ? "Activo" : "Inactivo"}
    </Badge>
  );
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
    { label: "Creado", value: formatearFecha(r.created_at) },
  ],
  tituloDetalle: (r) => (r.nombre ? `${r.codigo} — ${r.nombre}` : r.codigo),
  activo: (r) => r.activo,
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
};

const categoriaAdapter: CatalogAdapter<Categoria> = {
  titulo: "Categorías",
  descripcion: "Clasificación de productos.",
  singular: "Categoría",
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
};

const uomAdapter: CatalogAdapter<Uom> = {
  titulo: "Unidades de medida",
  descripcion: "Unidades de medida de los productos.",
  singular: "Unidad",
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
};

export const CATALOGOS: Record<string, CatalogAdapter<any>> = {
  almacenes: almacenAdapter,
  ubicaciones: ubicacionAdapter,
  productos: productoAdapter,
  lotes: loteAdapter,
  categorias: categoriaAdapter,
  uoms: uomAdapter,
  proveedores: proveedorAdapter,
  clientes: clienteAdapter,
};
