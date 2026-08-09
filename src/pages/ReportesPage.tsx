import { ButtonLink, Card, PageHeader } from "../shared/ui";

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
    descripcion: "Existencias por producto, ubicación y lote.",
    href: "/reportes/stock",
  },
  {
    id: "movimientos",
    nombre: "Movimientos",
    descripcion: "Historial de entradas, salidas, traslados y ajustes.",
    href: "/reportes/movimientos",
  },
  {
    id: "vencimientos",
    nombre: "Vencimientos",
    descripcion: "Lotes próximos a vencer por ubicación.",
    href: "/reportes/vencimientos",
  },
  {
    id: "precision",
    nombre: "Precisión de inventario",
    descripcion: "Precisión por sesión de conteo cerrada.",
    href: "/reportes/precision",
  },
  {
    id: "auditoria",
    nombre: "Auditoría",
    descripcion: "Trazabilidad de cambios sobre los registros.",
    href: "/reportes/auditoria",
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
