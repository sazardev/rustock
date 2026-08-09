import { ButtonLink, Card, DetailList, PageHeader } from "../shared/ui";

interface Kpi {
  label: string;
  value: string;
  code?: boolean;
}

const KPIS: Kpi[] = [
  { label: "Productos activos", value: "1,248", code: true },
  { label: "Ubicaciones", value: "364", code: true },
  { label: "Movimientos del mes", value: "2,103", code: true },
  { label: "Alertas activas", value: "3", code: true },
];

export function DashboardPage() {
  return (
    <>
      <PageHeader
        title="Dashboard"
        description="Resumen de la operación del almacén."
        actions={
          <ButtonLink variant="primary" icon="agregar" href="/movimientos/nuevo">
            Nuevo movimiento
          </ButtonLink>
        }
      />

      <Card title="Indicadores clave">
        <Card.Body>
          <DetailList items={KPIS} />
        </Card.Body>
      </Card>

      <div className="mt-6 grid grid-cols-1 gap-6 md:grid-cols-2">
        <Card title="Movimientos recientes">
          <Card.Body>
            <p className="text-base text-gray-500">
              Los últimos movimientos se muestran aquí una vez que exista historial.
            </p>
          </Card.Body>
        </Card>
        <Card title="Stock por ubicación">
          <Card.Body>
            <p className="text-base text-gray-500">
              El detalle de saldos por ubicación y lote aparece en esta sección.
            </p>
          </Card.Body>
        </Card>
      </div>
    </>
  );
}
