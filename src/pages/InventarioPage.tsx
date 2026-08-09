import { Card, EmptyState, PageHeader, ButtonLink } from "../shared/ui";

export function InventarioPage() {
  return (
    <>
      <PageHeader
        title="Inventario físico"
        description="Sesiones de conteo y conciliación de existencias."
        actions={
          <ButtonLink variant="primary" icon="agregar" href="/inventario/nuevo">
            Nueva sesión
          </ButtonLink>
        }
      />

      <Card>
        <Card.Body>
          <EmptyState
            icon="inventario"
            title="No hay sesiones de inventario"
            description="Cree una sesión de conteo para verificar las existencias de un almacén."
            action={
              <ButtonLink variant="primary" size="sm" icon="agregar" href="/inventario/nuevo">
                Crear sesión
              </ButtonLink>
            }
          />
        </Card.Body>
      </Card>
    </>
  );
}
