export interface Producto {
  id: string;
  sku: string;
  nombre: string;
  stock: number;
  estado: "Disponible" | "Agotado";
}

export const PRODUCTOS: Producto[] = [
  { id: "1", sku: "SKU-1001", nombre: "Tornillo M6", stock: 340, estado: "Disponible" },
  { id: "2", sku: "SKU-1002", nombre: "Arandela 5/16", stock: 0, estado: "Agotado" },
  { id: "3", sku: "SKU-1003", nombre: "Cinta embalaje 48mm", stock: 125, estado: "Disponible" },
];
