import { ButtonLink, Card, EmptyState } from "../shared/ui";
import { PATH } from "../app/route-paths";
import { useT } from "../shared/i18n";

export function NotFoundPage() {
  const t = useT();
  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <Card>
        <Card.Body>
          <EmptyState
            icon="alerta"
            title={t.paginas.noEncontrada}
            description={t.paginas.noEncontradaDesc}
            action={
              <ButtonLink variant="primary" href={PATH.dashboard}>
                Ir al dashboard
              </ButtonLink>
            }
          />
        </Card.Body>
      </Card>
    </div>
  );
}
