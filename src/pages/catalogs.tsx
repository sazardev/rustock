import { useParams } from "react-router";
import { CatalogDetailPage, CatalogListPage } from "./CatalogPages";
import type { CatalogConfig } from "./CatalogPages";

export const CATALOGOS: Record<string, CatalogConfig> = {
  almacenes: {
    title: "Almacenes",
    description: "Catálogo de almacenes y su estado operativo.",
    singular: "Almacén",
    createHref: "/almacenes",
    rows: [
      { id: "1", codigo: "ALM-001", nombre: "Almacén Central", estado: "Activo" },
      { id: "2", codigo: "ALM-002", nombre: "Almacén Sur", estado: "Activo" },
      { id: "3", codigo: "ALM-003", nombre: "Depósito Frío", estado: "Inactivo" },
    ],
  },
  ubicaciones: {
    title: "Ubicaciones",
    description: "Ubicaciones de almacenamiento (bins).",
    singular: "Ubicación",
    createHref: "/ubicaciones",
    rows: [
      { id: "1", codigo: "RACK-A1-N2-P3", nombre: "Rack A1 Nivel 2 Posición 3", estado: "Activo" },
      { id: "2", codigo: "RACK-B2-N1-P1", nombre: "Rack B2 Nivel 1 Posición 1", estado: "Activo" },
    ],
  },
  productos: {
    title: "Productos",
    description: "Catálogo de productos y SKU.",
    singular: "Producto",
    createHref: "/productos",
    rows: [
      { id: "1", codigo: "SKU-1001", nombre: "Tornillo M6", estado: "Activo" },
      { id: "2", codigo: "SKU-1002", nombre: "Arandela 5/16", estado: "Activo" },
      { id: "3", codigo: "SKU-1003", nombre: "Cinta embalaje 48mm", estado: "Inactivo" },
    ],
  },
  lotes: {
    title: "Lotes",
    description: "Lotes de producción y vencimientos.",
    singular: "Lote",
    createHref: "/lotes",
    rows: [
      { id: "1", codigo: "LOTE-2026-04", nombre: "Producción abril 2026", estado: "Activo" },
      { id: "2", codigo: "LOTE-2026-03", nombre: "Producción marzo 2026", estado: "Activo" },
    ],
  },
  categorias: {
    title: "Categorías",
    description: "Clasificación de productos.",
    singular: "Categoría",
    createHref: "/categorias",
    rows: [
      { id: "1", codigo: "CAT-FIJ", nombre: "Fijaciones", estado: "Activo" },
      { id: "2", codigo: "CAT-EMP", nombre: "Embalaje", estado: "Activo" },
    ],
  },
  uoms: {
    title: "Unidades de medida",
    description: "Unidades de medida de los productos.",
    singular: "Unidad",
    createHref: "/uoms",
    rows: [
      { id: "1", codigo: "pza", nombre: "Pieza", estado: "Activo" },
      { id: "2", codigo: "kg", nombre: "Kilogramo", estado: "Activo" },
      { id: "3", codigo: "caja", nombre: "Caja", estado: "Activo" },
    ],
  },
  proveedores: {
    title: "Proveedores",
    description: "Proveedores de productos y materiales.",
    singular: "Proveedor",
    createHref: "/proveedores",
    rows: [
      { id: "1", codigo: "PROV-001", nombre: "Ferretería Industrial SAC", estado: "Activo" },
      { id: "2", codigo: "PROV-002", nombre: "Embalajes del Pacífico", estado: "Activo" },
    ],
  },
  clientes: {
    title: "Clientes",
    description: "Clientes que reciben despachos.",
    singular: "Cliente",
    createHref: "/clientes",
    rows: [
      { id: "1", codigo: "CLI-001", nombre: "Constructora Andina", estado: "Activo" },
      { id: "2", codigo: "CLI-002", nombre: "Talleres Mecánicos Lima", estado: "Inactivo" },
    ],
  },
};

export function CatalogListRoute({ catalog }: { catalog: keyof typeof CATALOGOS }) {
  return <CatalogListPage config={CATALOGOS[catalog]} />;
}

export function CatalogDetailRoute({ catalog }: { catalog: keyof typeof CATALOGOS }) {
  const { id = "" } = useParams();
  return <CatalogDetailPage config={CATALOGOS[catalog]} id={id} />;
}
