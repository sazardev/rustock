import { ButtonLink, Card, EmptyState } from "../shared/ui";

export function NotFoundPage() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <Card>
        <Card.Body>
          <EmptyState
            icon="alerta"
            title="Página no encontrada"
            description="La página que busca no existe o fue movida."
            action={
              <>
                <ButtonLink variant="primary" href="/">
                  Ir al dashboard
                </ButtonLink>
              </>
            }
          />
        </Card.Body>
      </Card>
    </div>
  );
}
