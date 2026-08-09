import { Card, DetailList, PageHeader } from "../shared/ui";

export function ConfiguracionPage() {
  return (
    <>
      <PageHeader
        title="Configuración"
        description="Parámetros generales de la aplicación y notificaciones."
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card title="Parámetros generales">
          <Card.Body>
            <DetailList
              items={[
                { label: "Zona horaria", value: "America/Lima" },
                { label: "Formato de fecha", value: "DD MMM YYYY" },
                { label: "Umbral de stock bajo", value: "10", num: true },
                { label: "Requiere aprobación", value: "Sí" },
              ]}
            />
          </Card.Body>
        </Card>

        <Card title="Notificaciones">
          <Card.Body>
            <DetailList
              items={[
                { label: "Alertas de stock bajo", value: "Activadas" },
                { label: "Alertas de vencimiento", value: "Activadas" },
                { label: "Movimientos por aprobar", value: "Desactivadas" },
              ]}
            />
          </Card.Body>
        </Card>
      </div>
    </>
  );
}
