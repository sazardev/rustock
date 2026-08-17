import { ButtonLink, Card, PageHeader } from "../shared/ui";
import { PATH } from "../app/route-paths";

interface Reporte {
  id: string;
  nombre: string;
  descripcion: string;
  href: string;
}

const REPORTES: Reporte[] = [
  {
    id: "stock",
    nombre: "Stock actual",
    descripcion: "Existencias por producto, ubicación y lote, con resumen de unidades.",
    href: PATH.reporteStock,
  },
  {
    id: "movimientos",
    nombre: "Movimientos",
    descripcion: "Historial de movimientos con filtros por tipo, estado y periodo.",
    href: PATH.reporteMovimientos,
  },
  {
    id: "vencimientos",
    nombre: "Vencimientos",
    descripcion: "Lotes próximos a vencer o vencidos, por producto.",
    href: PATH.reporteVencimientos,
  },
  {
    id: "kardex",
    nombre: "Kardex de producto",
    descripcion: "Tarjeta de stock: movimientos y saldo acumulado de un producto.",
    href: PATH.reporteKardex,
  },
  {
    id: "precision",
    nombre: "Precisión de inventario",
    descripcion: "Precisión por SKU, cantidad y ubicación de cada sesión cerrada.",
    href: PATH.reportePrecision,
  },
  {
    id: "auditoria",
    nombre: "Auditoría",
    descripcion: "Quién hizo qué, filtrable por usuario, nivel y rango de fechas.",
    href: PATH.reporteAuditoria,
  },
  {
    id: "entradas",
    nombre: "Entradas del periodo",
    descripcion: "Compras, devoluciones de cliente y ajustes positivos por periodo.",
    href: PATH.reporteEntradas,
  },
  {
    id: "salidas",
    nombre: "Salidas del periodo",
    descripcion: "Despachos a cliente, devoluciones a proveedor y traslados de salida.",
    href: PATH.reporteSalidas,
  },
  {
    id: "mermas",
    nombre: "Mermas y ajustes",
    descripcion: "Mermas y ajustes de stock con su motivo y totales por sub-tipo.",
    href: PATH.reporteMermasAjustes,
  },
  {
    id: "usuarios",
    nombre: "Desempeño de usuarios",
    descripcion: "Número de movimientos registrados por usuario y periodo.",
    href: PATH.reporteUsuarios,
  },
];

export function ReportesPage() {
  return (
    <>
      <PageHeader title="Reportes" description="Informes operativos y de análisis del almacén." />

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
        {REPORTES.map((reporte) => (
          <Card key={reporte.id} title={reporte.nombre}>
            <Card.Body>
              <p className="mb-4 text-sm text-gray-500">{reporte.descripcion}</p>
              <ButtonLink variant="secondary" size="sm" icon="reportes" href={reporte.href}>
                Abrir reporte
              </ButtonLink>
            </Card.Body>
          </Card>
        ))}
      </div>
    </>
  );
}
