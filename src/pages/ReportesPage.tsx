import { ButtonLink, Card, PageHeader } from "../shared/ui";
import { PATH, catalogoLista } from "../app/route-paths";

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
    descripcion: "Existencias por producto; use filtros y agregaciones en el catálogo.",
    href: catalogoLista("productos"),
  },
  {
    id: "movimientos",
    nombre: "Movimientos",
    descripcion: "Historial de entradas, salidas, traslados y ajustes.",
    href: PATH.movimientos,
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
    descripcion: "Precisión por sesión de conteo cerrada.",
    href: PATH.inventario,
  },
  {
    id: "auditoria",
    nombre: "Auditoría",
    descripcion: "Trazabilidad de cambios sobre los registros.",
    href: PATH.historial,
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
