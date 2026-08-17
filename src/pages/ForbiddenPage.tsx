import { ButtonLink, Card, EmptyState } from "../shared/ui";
import { PATH } from "../app/route-paths";

export function ForbiddenPage() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <Card>
        <Card.Body>
          <EmptyState
            icon="rol"
            title="Acceso no permitido"
            description="Su rol no tiene permiso para acceder a esta sección."
            action={
              <ButtonLink variant="primary" href={PATH.dashboard}>
                Volver al dashboard
              </ButtonLink>
            }
          />
        </Card.Body>
      </Card>
    </div>
  );
}
