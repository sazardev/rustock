import { useQuery } from "@tanstack/react-query";
import {
  listarClientes,
  listarProductos,
  listarProveedores,
  listarUbicaciones,
} from "../../shared/backend";
import { esPaginado } from "../../shared/types";

export function useCatalogosBasicos() {
  const productos = useQuery({
    queryKey: ["productos", "selector-movimiento"],
    queryFn: () => listarProductos({ page_size: 200, sort: "nombre" }),
  });
  const ubicaciones = useQuery({
    queryKey: ["ubicaciones", "selector-movimiento"],
    queryFn: () => listarUbicaciones({ page_size: 200, sort: "codigo" }),
  });
  const proveedores = useQuery({
    queryKey: ["proveedores", "selector-movimiento"],
    queryFn: () => listarProveedores({ page_size: 200, sort: "nombre" }),
  });
  const clientes = useQuery({
    queryKey: ["clientes", "selector-movimiento"],
    queryFn: () => listarClientes({ page_size: 200, sort: "nombre" }),
  });

  return {
    productos: productos.data && esPaginado(productos.data) ? productos.data.data : [],
    ubicaciones: ubicaciones.data && esPaginado(ubicaciones.data) ? ubicaciones.data.data : [],
    proveedores: proveedores.data && esPaginado(proveedores.data) ? proveedores.data.data : [],
    clientes: clientes.data && esPaginado(clientes.data) ? clientes.data.data : [],
  };
}
