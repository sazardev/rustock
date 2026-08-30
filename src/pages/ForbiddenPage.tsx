import { ButtonLink, Card, EmptyState } from "../shared/ui";
import { PATH } from "../app/route-paths";
import { useT } from "../shared/i18n";

export function ForbiddenPage() {
  const t = useT();
  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <Card>
        <Card.Body>
          <EmptyState
            icon="rol"
            title={t.paginas.accesoNoPermitido}
            description={t.paginas.accesoNoPermitidoDesc}
            action={
              <ButtonLink variant="primary" href={PATH.dashboard}>
                {t.comun.volverAlDashboard}
              </ButtonLink>
            }
          />
        </Card.Body>
      </Card>
    </div>
  );
}
