/**
 * Registro de catálogos reales (SPEC §3): un adaptador por entidad que
 * conecta el listado/detalle genérico (`CatalogPages.tsx`) al backend real
 * vía el motor de consulta universal (§15). Solo Almacén y Producto tienen
 * `crearHref`/`editarHref`/`eliminarHref` en esta pasada — el resto queda
 * con listado + detalle reales pero sin formulario propio (alcance
 * documentado en el plan, ver MEMORY.md Hito 8).
 */
import type { Diccionario } from "../shared/i18n";
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
import { formatearFecha, formatearFechaCorta, formatearNumero } from "../shared/format";

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

function badgeActivo(activo: boolean, t: Diccionario) {
  return (
    <Badge tone={activo ? "success" : "neutral"} icon={activo ? "aprobar" : "anular"}>
      {activo ? t.comun.activo : t.comun.inactivo}
    </Badge>
  );
}

/** Filas de posición en el mapa 2D/3D, comunes a Zona/Pasillo/Rack/Ubicación. */
function filasPosicion(
  n: {
    pos_x: number | null;
    pos_y: number | null;
    pos_z: number | null;
    altura: number | null;
  },
  t: Diccionario,
): DetailItem[] {
  return [
    {
      label: t.campos.posicionXY,
      value: n.pos_x !== null && n.pos_y !== null ? `${n.pos_x}, ${n.pos_y}` : "—",
    },
    {
      label: t.campos.alturaZ,
      value:
        n.pos_z !== null || n.altura !== null ? `z=${n.pos_z ?? "—"} · h=${n.altura ?? "—"}` : "—",
    },
  ];
}

function almacenAdapter(t: Diccionario): CatalogAdapter<Almacen> {
  return {
    titulo: t.catalogos.almacenesTitulo,
    descripcion: t.catalogos.almacenesDesc,
    singular: t.catalogos.almacenSingular,
    icon: "almacen",
    listar: backend.listarAlmacenes,
    obtener: obtenerAlmacen,
    columnas: [
      {
        key: "codigo",
        header: t.campos.codigo,
        code: true,
        sortable: true,
        render: (r) => r.codigo,
      },
      { key: "nombre", header: t.campos.nombre, sortable: true, render: (r) => r.nombre },
      { key: "direccion", header: t.campos.direccion, render: (r) => r.direccion ?? "—" },
      { key: "activo", header: t.campos.estado, render: (r) => badgeActivo(r.activo, t) },
    ],
    datosGenerales: (r) => [
      { label: t.campos.codigo, value: r.codigo, code: true },
      { label: t.campos.nombre, value: r.nombre },
      { label: t.campos.descripcion, value: r.descripcion ?? "—" },
      { label: t.campos.direccion, value: r.direccion ?? "—" },
      { label: t.campos.creado, value: formatearFecha(r.created_at) },
      { label: t.campos.ultimaActualizacion, value: formatearFecha(r.updated_at) },
    ],
    tituloDetalle: (r) => `${r.codigo} — ${r.nombre}`,
    activo: (r) => r.activo,
    crearHref: catalogoLista("almacenes") + "/nuevo",
    editarHref: (id) => catalogoEditar("almacenes", id),
    eliminarHref: (id) => catalogoEliminar("almacenes", id),
    desactivar: desactivarAlmacen,
  };
}

function ubicacionAdapter(t: Diccionario): CatalogAdapter<Ubicacion> {
  return {
    titulo: t.catalogos.ubicacionesTitulo,
    descripcion: t.catalogos.ubicacionesDesc,
    singular: t.catalogos.ubicacionSingular,
    genero: "F",
    icon: "ubicacion",
    listar: listarUbicaciones,
    obtener: obtenerUbicacion,
    columnas: [
      {
        key: "codigo",
        header: t.campos.codigo,
        code: true,
        sortable: true,
        render: (r) => r.codigo,
      },
      { key: "nombre", header: t.campos.nombre, render: (r) => r.nombre ?? "—" },
      { key: "tipo", header: t.campos.tipo, render: (r) => r.tipo },
      {
        key: "capacidad_maxima",
        header: t.campos.capacidadMaxima,
        num: true,
        render: (r) =>
          r.capacidad_maxima === null || r.capacidad_maxima === undefined
            ? "—"
            : formatearNumero(r.capacidad_maxima),
      },
      { key: "activo", header: t.campos.estado, render: (r) => badgeActivo(r.activo, t) },
    ],
    datosGenerales: (r) => [
      { label: t.campos.codigo, value: r.codigo, code: true },
      { label: t.campos.nombre, value: r.nombre ?? "—" },
      { label: t.campos.tipo, value: r.tipo },
      {
        label: t.campos.capacidadMaxima,
        value:
          r.capacidad_maxima === null || r.capacidad_maxima === undefined
            ? "—"
            : formatearNumero(r.capacidad_maxima),
      },
      ...filasPosicion(r, t),
      { label: t.campos.creado, value: formatearFecha(r.created_at) },
    ],
    tituloDetalle: (r) => (r.nombre ? `${r.codigo} — ${r.nombre}` : r.codigo),
    activo: (r) => r.activo,
    crearHref: catalogoLista("ubicaciones") + "/nuevo",
    editarHref: (id) => catalogoEditar("ubicaciones", id),
    eliminarHref: (id) => catalogoEliminar("ubicaciones", id),
    duplicarHref: (id) => `${catalogoLista("ubicaciones")}/nuevo?duplicarDe=${id}`,
    desactivar: desactivarUbicacion,
  };
}

function productoAdapter(t: Diccionario): CatalogAdapter<Producto> {
  return {
    titulo: t.catalogos.productosTitulo,
    descripcion: t.catalogos.productosDesc,
    singular: t.catalogos.productoSingular,
    icon: "producto",
    listar: backend.listarProductos,
    obtener: obtenerProducto,
    columnas: [
      { key: "sku", header: t.campos.sku, code: true, sortable: true, render: (r) => r.sku },
      { key: "nombre", header: t.campos.nombre, sortable: true, render: (r) => r.nombre },
      {
        key: "controla_lote",
        header: t.campos.control,
        render: (r) => (
          <div className="flex gap-1">
            {r.controla_lote ? <Badge tone="info">{t.campos.lote}</Badge> : null}
            {r.controla_vencimiento ? <Badge tone="warning">{t.campos.vencimiento}</Badge> : null}
            {r.perecedero ? <Badge tone="danger">{t.campos.perecedero}</Badge> : null}
          </div>
        ),
      },
      { key: "activo", header: t.campos.estado, render: (r) => badgeActivo(r.activo, t) },
    ],
    datosGenerales: (r) => [
      { label: t.campos.sku, value: r.sku, code: true },
      { label: t.campos.nombre, value: r.nombre },
      { label: t.campos.descripcion, value: r.descripcion ?? "—" },
      {
        label: t.campos.categoria,
        value: r.categoria_id ? <CategoriaRef id={r.categoria_id} /> : "—",
      },
      { label: t.campos.uomBase, value: <UomRef id={r.uom_base_id} /> },
      { label: t.campos.uomVenta, value: r.uom_venta_id ? <UomRef id={r.uom_venta_id} /> : "—" },
      { label: t.campos.uomCompra, value: r.uom_compra_id ? <UomRef id={r.uom_compra_id} /> : "—" },
      { label: t.campos.codigoBarras, value: r.codigo_barras ?? "—", code: true },
      { label: t.campos.pesoUnitario, value: r.peso_unitario ?? "—", num: true },
      { label: t.campos.volumenUnitario, value: r.volumen_unitario ?? "—", num: true },
      { label: t.campos.stockMinimo, value: r.stock_minimo ?? "—", num: true },
      { label: t.campos.stockMaximo, value: r.stock_maximo ?? "—", num: true },
      { label: t.campos.controlaLote, value: r.controla_lote ? t.comun.si : t.comun.no },
      {
        label: t.campos.controlaVencimiento,
        value: r.controla_vencimiento ? t.comun.si : t.comun.no,
      },
      { label: t.campos.perecedero, value: r.perecedero ? t.comun.si : t.comun.no },
      { label: t.campos.creado, value: formatearFecha(r.created_at) },
    ],
    tituloDetalle: (r) => `${r.sku} — ${r.nombre}`,
    activo: (r) => r.activo,
    crearHref: catalogoLista("productos") + "/nuevo",
    editarHref: (id) => catalogoEditar("productos", id),
    eliminarHref: (id) => catalogoEliminar("productos", id),
    duplicarHref: (id) => `${catalogoLista("productos")}/nuevo?duplicarDe=${id}`,
    desactivar: desactivarProducto,
  };
}

function loteAdapter(t: Diccionario): CatalogAdapter<Lote> {
  return {
    titulo: t.catalogos.lotesTitulo,
    descripcion: t.catalogos.lotesDesc,
    singular: t.catalogos.loteSingular,
    icon: "lote",
    listar: listarLotes,
    obtener: obtenerLote,
    columnas: [
      {
        key: "numero",
        header: t.campos.numero,
        code: true,
        sortable: true,
        render: (r) => r.numero,
      },
      {
        key: "producto_id",
        header: t.campos.producto,
        render: (r) => <ProductoRef id={r.producto_id} />,
      },
      {
        key: "fecha_vencimiento",
        header: t.campos.vencimiento,
        render: (r) => (r.fecha_vencimiento ? formatearFechaCorta(r.fecha_vencimiento) : "—"),
      },
      { key: "origen", header: t.campos.origen, render: (r) => r.origen ?? "—" },
    ],
    datosGenerales: (r) => [
      { label: t.campos.numero, value: r.numero, code: true },
      { label: t.campos.producto, value: <ProductoRef id={r.producto_id} /> },
      {
        label: t.campos.fechaFabricacion,
        value: r.fecha_fabricacion ? formatearFechaCorta(r.fecha_fabricacion) : "—",
      },
      {
        label: t.campos.fechaVencimiento,
        value: r.fecha_vencimiento ? formatearFechaCorta(r.fecha_vencimiento) : "—",
      },
      { label: t.campos.origen, value: r.origen ?? "—" },
      { label: t.campos.notas, value: r.notas ?? "—" },
      { label: t.campos.creado, value: formatearFecha(r.created_at) },
    ],
    tituloDetalle: (r) => r.numero,
    crearHref: catalogoLista("lotes") + "/nuevo",
    editarHref: (id) => catalogoEditar("lotes", id),
    duplicarHref: (id) => `${catalogoLista("lotes")}/nuevo?duplicarDe=${id}`,
  };
}

function categoriaAdapter(t: Diccionario): CatalogAdapter<Categoria> {
  return {
    titulo: t.catalogos.categoriasTitulo,
    descripcion: t.catalogos.categoriasDesc,
    singular: t.catalogos.categoriaSingular,
    genero: "F",
    icon: "categoria",
    listar: listarCategorias,
    obtener: obtenerCategoria,
    columnas: [
      { key: "nombre", header: t.campos.nombre, sortable: true, render: (r) => r.nombre },
      {
        key: "parent_id",
        header: t.campos.categoriaPadre,
        render: (r) => (r.parent_id ? <CategoriaRef id={r.parent_id} /> : "—"),
      },
      { key: "activo", header: t.campos.estado, render: (r) => badgeActivo(r.activo, t) },
    ],
    datosGenerales: (r) => [
      { label: t.campos.nombre, value: r.nombre },
      { label: t.campos.descripcion, value: r.descripcion ?? "—" },
      {
        label: t.campos.categoriaPadre,
        value: r.parent_id ? <CategoriaRef id={r.parent_id} /> : "—",
      },
      { label: t.campos.creado, value: formatearFecha(r.created_at) },
    ],
    tituloDetalle: (r) => r.nombre,
    activo: (r) => r.activo,
    crearHref: catalogoLista("categorias") + "/nuevo",
    editarHref: (id) => catalogoEditar("categorias", id),
    eliminarHref: (id) => catalogoEliminar("categorias", id),
    desactivar: desactivarCategoria,
  };
}

function uomAdapter(t: Diccionario): CatalogAdapter<Uom> {
  return {
    titulo: t.catalogos.uomsTitulo,
    descripcion: t.catalogos.uomsDesc,
    singular: t.catalogos.uomSingular,
    genero: "F",
    icon: "uom",
    listar: listarUoms,
    obtener: obtenerUom,
    columnas: [
      {
        key: "codigo",
        header: t.campos.codigo,
        code: true,
        sortable: true,
        render: (r) => r.codigo,
      },
      { key: "nombre", header: t.campos.nombre, sortable: true, render: (r) => r.nombre },
      { key: "tipo", header: t.campos.tipo, render: (r) => r.tipo },
      { key: "factor", header: t.campos.factor, num: true, render: (r) => r.factor },
      {
        key: "base",
        header: t.campos.baseDeFamilia,
        render: (r) => (r.base ? <Badge tone="info">Base</Badge> : "—"),
      },
      { key: "activo", header: t.campos.estado, render: (r) => badgeActivo(r.activo, t) },
    ],
    datosGenerales: (r) => [
      { label: t.campos.codigo, value: r.codigo, code: true },
      { label: t.campos.nombre, value: r.nombre },
      { label: t.campos.tipo, value: r.tipo },
      { label: t.campos.factorConversion, value: r.factor, num: true },
      { label: t.campos.esBaseDeFamilia, value: r.base ? t.comun.si : t.comun.no },
      { label: t.campos.creado, value: formatearFecha(r.created_at) },
    ],
    tituloDetalle: (r) => `${r.codigo} — ${r.nombre}`,
    activo: (r) => r.activo,
    crearHref: catalogoLista("uoms") + "/nuevo",
    editarHref: (id) => catalogoEditar("uoms", id),
    eliminarHref: (id) => catalogoEliminar("uoms", id),
    desactivar: desactivarUom,
  };
}

function contactoColumnas<T extends { contacto_telefono: string | null; activo: boolean }>(
  t: Diccionario,
): Array<TableColumn<T>> {
  return [
    {
      key: "contacto_telefono",
      header: t.campos.telefono,
      code: true,
      render: (r) => r.contacto_telefono ?? "—",
    },
    { key: "activo", header: t.campos.estado, render: (r) => badgeActivo(r.activo, t) },
  ];
}

function contactoDatos(r: Proveedor | Cliente, t: Diccionario): DetailItem[] {
  return [
    { label: t.campos.codigo, value: r.codigo, code: true },
    { label: t.campos.nombre, value: r.nombre },
    { label: t.campos.contacto, value: r.contacto_nombre ?? "—" },
    { label: t.campos.telefono, value: r.contacto_telefono ?? "—", code: true },
    { label: t.campos.email, value: r.contacto_email ?? "—" },
    { label: t.campos.direccion, value: r.direccion ?? "—" },
    { label: t.campos.creado, value: formatearFecha(r.created_at) },
  ];
}

function proveedorAdapter(t: Diccionario): CatalogAdapter<Proveedor> {
  return {
    titulo: t.catalogos.proveedoresTitulo,
    descripcion: t.catalogos.proveedoresDesc,
    singular: t.catalogos.proveedorSingular,
    icon: "proveedor",
    listar: listarProveedores,
    obtener: obtenerProveedor,
    columnas: [
      {
        key: "codigo",
        header: t.campos.codigo,
        code: true,
        sortable: true,
        render: (r) => r.codigo,
      },
      { key: "nombre", header: t.campos.nombre, sortable: true, render: (r) => r.nombre },
      ...contactoColumnas<Proveedor>(t),
    ],
    datosGenerales: (r) => contactoDatos(r, t),
    tituloDetalle: (r) => `${r.codigo} — ${r.nombre}`,
    activo: (r) => r.activo,
    crearHref: catalogoLista("proveedores") + "/nuevo",
    editarHref: (id) => catalogoEditar("proveedores", id),
    eliminarHref: (id) => catalogoEliminar("proveedores", id),
    desactivar: desactivarProveedor,
  };
}

function clienteAdapter(t: Diccionario): CatalogAdapter<Cliente> {
  return {
    titulo: t.catalogos.clientesTitulo,
    descripcion: t.catalogos.clientesDesc,
    singular: t.catalogos.clienteSingular,
    icon: "cliente",
    listar: listarClientes,
    obtener: obtenerCliente,
    columnas: [
      {
        key: "codigo",
        header: t.campos.codigo,
        code: true,
        sortable: true,
        render: (r) => r.codigo,
      },
      { key: "nombre", header: t.campos.nombre, sortable: true, render: (r) => r.nombre },
      ...contactoColumnas<Cliente>(t),
    ],
    datosGenerales: (r) => contactoDatos(r, t),
    tituloDetalle: (r) => `${r.codigo} — ${r.nombre}`,
    activo: (r) => r.activo,
    crearHref: catalogoLista("clientes") + "/nuevo",
    editarHref: (id) => catalogoEditar("clientes", id),
    eliminarHref: (id) => catalogoEliminar("clientes", id),
    desactivar: desactivarCliente,
  };
}

function zonaAdapter(t: Diccionario): CatalogAdapter<Zona> {
  return {
    titulo: t.catalogos.zonasTitulo,
    descripcion: t.catalogos.zonasDesc,
    singular: t.catalogos.zonaSingular,
    genero: "F",
    icon: "zona",
    listar: listarZonas,
    obtener: obtenerZona,
    columnas: [
      {
        key: "codigo",
        header: t.campos.codigo,
        code: true,
        sortable: true,
        render: (r) => r.codigo,
      },
      { key: "nombre", header: t.campos.nombre, sortable: true, render: (r) => r.nombre },
      {
        key: "almacen_id",
        header: t.campos.almacen,
        render: (r) => <AlmacenRef id={r.almacen_id} />,
      },
      { key: "activo", header: t.campos.estado, render: (r) => badgeActivo(r.activo, t) },
    ],
    datosGenerales: (r) => [
      { label: t.campos.codigo, value: r.codigo, code: true },
      { label: t.campos.nombre, value: r.nombre },
      { label: t.campos.descripcion, value: r.descripcion ?? "—" },
      { label: t.campos.almacen, value: <AlmacenRef id={r.almacen_id} /> },
      ...filasPosicion(r, t),
      { label: t.campos.creado, value: formatearFecha(r.created_at) },
    ],
    tituloDetalle: (r) => `${r.codigo} — ${r.nombre}`,
    activo: (r) => r.activo,
    crearHref: catalogoLista("zonas") + "/nuevo",
    editarHref: (id) => catalogoEditar("zonas", id),
    eliminarHref: (id) => catalogoEliminar("zonas", id),
    desactivar: desactivarZona,
  };
}

function pasilloAdapter(t: Diccionario): CatalogAdapter<Pasillo> {
  return {
    titulo: t.catalogos.pasillosTitulo,
    descripcion: t.catalogos.pasillosDesc,
    singular: t.catalogos.pasilloSingular,
    icon: "zona",
    listar: listarPasillos,
    obtener: obtenerPasillo,
    columnas: [
      {
        key: "codigo",
        header: t.campos.codigo,
        code: true,
        sortable: true,
        render: (p) => p.codigo,
      },
      { key: "nombre", header: t.campos.nombre, render: (p) => p.nombre ?? "—" },
      { key: "zona_id", header: t.campos.zona, render: (p) => <ZonaRef id={p.zona_id} /> },
      { key: "activo", header: t.campos.estado, render: (p) => badgeActivo(p.activo, t) },
    ],
    datosGenerales: (p) => [
      { label: t.campos.codigo, value: p.codigo, code: true },
      { label: t.campos.nombre, value: p.nombre ?? "—" },
      { label: t.campos.zona, value: <ZonaRef id={p.zona_id} /> },
      ...filasPosicion(p, t),
      { label: t.campos.creado, value: formatearFecha(p.created_at) },
    ],
    tituloDetalle: (p) => (p.nombre ? `${p.codigo} — ${p.nombre}` : p.codigo),
    activo: (p) => p.activo,
    crearHref: catalogoLista("pasillos") + "/nuevo",
    editarHref: (id) => catalogoEditar("pasillos", id),
    eliminarHref: (id) => catalogoEliminar("pasillos", id),
    desactivar: desactivarPasillo,
  };
}

function rackAdapter(t: Diccionario): CatalogAdapter<Rack> {
  return {
    titulo: t.catalogos.racksTitulo,
    descripcion: t.catalogos.racksDesc,
    singular: t.catalogos.rackSingular,
    icon: "zona",
    listar: listarRacks,
    obtener: obtenerRack,
    columnas: [
      {
        key: "codigo",
        header: t.campos.codigo,
        code: true,
        sortable: true,
        render: (r) => r.codigo,
      },
      { key: "nombre", header: t.campos.nombre, render: (r) => r.nombre ?? "—" },
      { key: "tipo", header: t.campos.tipo, render: (r) => r.tipo ?? "—" },
      { key: "zona_id", header: t.campos.zona, render: (r) => <ZonaRef id={r.zona_id} /> },
      {
        key: "pasillo_id",
        header: t.campos.pasillo,
        render: (r) => (r.pasillo_id ? <PasilloRef id={r.pasillo_id} /> : "—"),
      },
      { key: "activo", header: t.campos.estado, render: (r) => badgeActivo(r.activo, t) },
    ],
    datosGenerales: (r) => [
      { label: t.campos.codigo, value: r.codigo, code: true },
      { label: t.campos.nombre, value: r.nombre ?? "—" },
      { label: t.campos.tipo, value: r.tipo ?? "—" },
      { label: t.campos.zona, value: <ZonaRef id={r.zona_id} /> },
      {
        label: t.campos.pasillo,
        value: r.pasillo_id ? <PasilloRef id={r.pasillo_id} /> : "—",
      },
      ...filasPosicion(r, t),
      { label: t.campos.creado, value: formatearFecha(r.created_at) },
    ],
    tituloDetalle: (r) => (r.nombre ? `${r.codigo} — ${r.nombre}` : r.codigo),
    activo: (r) => r.activo,
    crearHref: catalogoLista("racks") + "/nuevo",
    editarHref: (id) => catalogoEditar("racks", id),
    eliminarHref: (id) => catalogoEliminar("racks", id),
    desactivar: desactivarRack,
  };
}

function seccionAdapter(t: Diccionario): CatalogAdapter<Seccion> {
  return {
    titulo: t.catalogos.seccionesTitulo,
    descripcion: t.catalogos.seccionesDesc,
    singular: t.catalogos.seccionSingular,
    genero: "F",
    icon: "zona",
    listar: listarSecciones,
    obtener: obtenerSeccion,
    columnas: [
      {
        key: "codigo",
        header: t.campos.codigo,
        code: true,
        sortable: true,
        render: (r) => r.codigo,
      },
      { key: "nombre", header: t.campos.nombre, render: (r) => r.nombre ?? "—" },
      { key: "nivel", header: t.campos.nivel, render: (r) => r.nivel ?? "—" },
      { key: "rack_id", header: t.campos.rack, render: (r) => <RackRef id={r.rack_id} /> },
      { key: "activo", header: t.campos.estado, render: (r) => badgeActivo(r.activo, t) },
    ],
    datosGenerales: (r) => [
      { label: t.campos.codigo, value: r.codigo, code: true },
      { label: t.campos.nombre, value: r.nombre ?? "—" },
      { label: t.campos.nivel, value: r.nivel ?? "—" },
      { label: t.campos.rack, value: <RackRef id={r.rack_id} /> },
      { label: t.campos.descripcion, value: r.descripcion ?? "—" },
      { label: t.campos.creado, value: formatearFecha(r.created_at) },
    ],
    tituloDetalle: (r) => (r.nombre ? `${r.codigo} — ${r.nombre}` : r.codigo),
    activo: (r) => r.activo,
    crearHref: catalogoLista("secciones") + "/nuevo",
    editarHref: (id) => catalogoEditar("secciones", id),
    eliminarHref: (id) => catalogoEliminar("secciones", id),
    desactivar: desactivarSeccion,
  };
}

function cajaAdapter(t: Diccionario): CatalogAdapter<Caja> {
  return {
    titulo: t.catalogos.cajasTitulo,
    descripcion: t.catalogos.cajasDesc,
    singular: t.catalogos.cajaSingular,
    genero: "F",
    icon: "caja",
    listar: listarCajas,
    obtener: obtenerCaja,
    columnas: [
      {
        key: "codigo",
        header: t.campos.codigo,
        code: true,
        sortable: true,
        render: (r) => r.codigo,
      },
      { key: "nombre", header: t.campos.nombre, render: (r) => r.nombre ?? "—" },
      {
        key: "ubicacion_id",
        header: t.campos.ubicacion,
        render: (r) => <UbicacionRef id={r.ubicacion_id} />,
      },
      {
        key: "producto_id",
        header: t.campos.producto,
        render: (r) => (r.producto_id ? <ProductoRef id={r.producto_id} /> : "—"),
      },
      { key: "activo", header: t.campos.estado, render: (r) => badgeActivo(r.activo, t) },
    ],
    datosGenerales: (r) => [
      { label: t.campos.codigo, value: r.codigo, code: true },
      { label: t.campos.nombre, value: r.nombre ?? "—" },
      { label: t.campos.ubicacion, value: <UbicacionRef id={r.ubicacion_id} /> },
      {
        label: t.campos.productoRestringido,
        value: r.producto_id ? <ProductoRef id={r.producto_id} /> : "—",
      },
      { label: t.campos.loteRestringido, value: r.lote_id ? <LoteRef id={r.lote_id} /> : "—" },
      { label: t.campos.etiqueta, value: r.etiqueta ?? "—", code: true },
      { label: t.campos.creado, value: formatearFecha(r.created_at) },
    ],
    tituloDetalle: (r) => (r.nombre ? `${r.codigo} — ${r.nombre}` : r.codigo),
    activo: (r) => r.activo,
    crearHref: catalogoLista("cajas") + "/nuevo",
    editarHref: (id) => catalogoEditar("cajas", id),
    eliminarHref: (id) => catalogoEliminar("cajas", id),
    desactivar: desactivarCaja,
  };
}

/**
 * Slugs de los catálogos, en el orden en que aparecen en la navegación.
 *
 * No dependen del idioma —las URL no se traducen (SPEC §17.4)—, así que se
 * declaran aparte: el enrutador y las migas de pan los necesitan sin tener
 * que construir los trece adaptadores.
 */
/**
 * Recurso de permisos de cada catálogo (`security.rs::PERMISOS`).
 *
 * El slug va en plural porque es una URL; el recurso en singular porque es una
 * entidad. Este mapa es el único sitio donde se cruzan, para que las páginas
 * de catálogo puedan preguntar «¿puede crear esto?» sin repetir la traducción
 * en cada una.
 */
export const RECURSO_DE_CATALOGO: Record<string, string> = {
  almacenes: "almacen",
  zonas: "zona",
  pasillos: "pasillo",
  racks: "rack",
  secciones: "seccion",
  ubicaciones: "ubicacion",
  cajas: "caja",
  productos: "producto",
  lotes: "lote",
  categorias: "categoria",
  uoms: "uom",
  proveedores: "proveedor",
  clientes: "cliente",
};

export const SLUGS_CATALOGO = [
  "almacenes",
  "zonas",
  "pasillos",
  "racks",
  "secciones",
  "ubicaciones",
  "cajas",
  "productos",
  "lotes",
  "categorias",
  "uoms",
  "proveedores",
  "clientes",
] as const;

/**
 * Adaptadores de catálogo en el idioma activo (SPEC §17).
 *
 * Se construyen a partir del diccionario en vez de ser constantes: los trece
 * catálogos comparten las mismas etiquetas de columna, así que traducirlos
 * aquí traduce de una vez sus listados, sus fichas y sus páginas de borrado.
 */
export function catalogosDe(t: Diccionario): Record<string, CatalogAdapter<any>> {
  return {
    almacenes: almacenAdapter(t),
    zonas: zonaAdapter(t),
    pasillos: pasilloAdapter(t),
    racks: rackAdapter(t),
    secciones: seccionAdapter(t),
    ubicaciones: ubicacionAdapter(t),
    cajas: cajaAdapter(t),
    productos: productoAdapter(t),
    lotes: loteAdapter(t),
    categorias: categoriaAdapter(t),
    uoms: uomAdapter(t),
    proveedores: proveedorAdapter(t),
    clientes: clienteAdapter(t),
  };
}
