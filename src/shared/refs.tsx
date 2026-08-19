/**
 * Enlaces reutilizables a entidades por id (DESIGN §5.5: "todo dato
 * identificable es un enlace"). Cada uno resuelve la etiqueta legible vía
 * react-query (cacheado por id) y enlaza al detalle del catálogo.
 */
import { useQuery } from "@tanstack/react-query";
import {
  obtenerAlmacen,
  obtenerCaja,
  obtenerCategoria,
  obtenerCliente,
  obtenerLote,
  obtenerMovimiento,
  obtenerPasillo,
  obtenerProducto,
  obtenerProveedor,
  obtenerRack,
  obtenerSeccion,
  obtenerSesionInventario,
  obtenerUbicacion,
  obtenerUom,
  obtenerZona,
} from "./backend";
import { catalogoDetalle, movimientoDetalle, sesionInventarioDetalle } from "../app/route-paths";
import { Link } from "./ui";

function Ref({ id }: { id: string }) {
  return <span>{id}</span>;
}

export function ProductoRef({ id }: { id: string }) {
  const query = useQuery({ queryKey: ["producto", id], queryFn: () => obtenerProducto(id) });
  if (!query.data) return query.isLoading ? <Ref id="…" /> : <Ref id={id} />;
  return <Link href={catalogoDetalle("productos", id)}>{query.data.sku}</Link>;
}

export function UbicacionRef({ id }: { id: string }) {
  const query = useQuery({ queryKey: ["ubicacion", id], queryFn: () => obtenerUbicacion(id) });
  if (!query.data) return query.isLoading ? <Ref id="…" /> : <Ref id={id} />;
  return <Link href={catalogoDetalle("ubicaciones", id)}>{query.data.codigo}</Link>;
}

export function LoteRef({ id }: { id: string }) {
  const query = useQuery({ queryKey: ["lote", id], queryFn: () => obtenerLote(id) });
  if (!query.data) return query.isLoading ? <Ref id="…" /> : <Ref id={id} />;
  return <Link href={catalogoDetalle("lotes", id)}>{query.data.numero}</Link>;
}

export function CategoriaRef({ id }: { id: string }) {
  const query = useQuery({ queryKey: ["categoria", id], queryFn: () => obtenerCategoria(id) });
  if (!query.data) return query.isLoading ? <Ref id="…" /> : <Ref id={id} />;
  return <Link href={catalogoDetalle("categorias", id)}>{query.data.nombre}</Link>;
}

export function UomRef({ id }: { id: string }) {
  const query = useQuery({ queryKey: ["uom", id], queryFn: () => obtenerUom(id) });
  if (!query.data) return query.isLoading ? <Ref id="…" /> : <Ref id={id} />;
  return <Link href={catalogoDetalle("uoms", id)}>{query.data.codigo}</Link>;
}

export function ProveedorRef({ id }: { id: string }) {
  const query = useQuery({ queryKey: ["proveedor", id], queryFn: () => obtenerProveedor(id) });
  if (!query.data) return query.isLoading ? <Ref id="…" /> : <Ref id={id} />;
  return <Link href={catalogoDetalle("proveedores", id)}>{query.data.nombre}</Link>;
}

export function ClienteRef({ id }: { id: string }) {
  const query = useQuery({ queryKey: ["cliente", id], queryFn: () => obtenerCliente(id) });
  if (!query.data) return query.isLoading ? <Ref id="…" /> : <Ref id={id} />;
  return <Link href={catalogoDetalle("clientes", id)}>{query.data.nombre}</Link>;
}

export function AlmacenRef({ id }: { id: string }) {
  const query = useQuery({ queryKey: ["almacen", id], queryFn: () => obtenerAlmacen(id) });
  if (!query.data) return query.isLoading ? <Ref id="…" /> : <Ref id={id} />;
  return <Link href={catalogoDetalle("almacenes", id)}>{query.data.codigo}</Link>;
}

export function ZonaRef({ id }: { id: string }) {
  const query = useQuery({ queryKey: ["zona", id], queryFn: () => obtenerZona(id) });
  if (!query.data) return query.isLoading ? <Ref id="…" /> : <Ref id={id} />;
  return <Link href={catalogoDetalle("zonas", id)}>{query.data.codigo}</Link>;
}

export function RackRef({ id }: { id: string }) {
  const query = useQuery({ queryKey: ["rack", id], queryFn: () => obtenerRack(id) });
  if (!query.data) return query.isLoading ? <Ref id="…" /> : <Ref id={id} />;
  return <Link href={catalogoDetalle("racks", id)}>{query.data.codigo}</Link>;
}

export function PasilloRef({ id }: { id: string }) {
  const query = useQuery({ queryKey: ["pasillo", id], queryFn: () => obtenerPasillo(id) });
  if (!query.data) return query.isLoading ? <Ref id="…" /> : <Ref id={id} />;
  return <Link href={catalogoDetalle("pasillos", id)}>{query.data.codigo}</Link>;
}

export function SeccionRef({ id }: { id: string }) {
  const query = useQuery({ queryKey: ["seccion", id], queryFn: () => obtenerSeccion(id) });
  if (!query.data) return query.isLoading ? <Ref id="…" /> : <Ref id={id} />;
  return <Link href={catalogoDetalle("secciones", id)}>{query.data.codigo}</Link>;
}

export function CajaRef({ id }: { id: string }) {
  const query = useQuery({ queryKey: ["caja", id], queryFn: () => obtenerCaja(id) });
  if (!query.data) return query.isLoading ? <Ref id="…" /> : <Ref id={id} />;
  return <Link href={catalogoDetalle("cajas", id)}>{query.data.codigo}</Link>;
}

export function MovimientoRef({ id }: { id: string }) {
  const query = useQuery({
    queryKey: ["movimiento", id],
    queryFn: () => obtenerMovimiento(id),
  });
  if (!query.data) return query.isLoading ? <Ref id="…" /> : <Ref id={id} />;
  return <Link href={movimientoDetalle(id)}>{query.data.numero}</Link>;
}

export function SesionInventarioRef({ id }: { id: string }) {
  const query = useQuery({
    queryKey: ["sesion-inventario", id],
    queryFn: () => obtenerSesionInventario(id),
  });
  if (!query.data) return query.isLoading ? <Ref id="…" /> : <Ref id={id} />;
  return <Link href={sesionInventarioDetalle(id)}>{query.data.numero}</Link>;
}
