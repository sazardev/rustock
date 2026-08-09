import { Button, Card, EmptyState, useToast } from "../shared/ui";

export function ErrorPage() {
  const { toast } = useToast();
  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <Card>
        <Card.Body>
          <EmptyState
            icon="alerta"
            title="Error del servidor"
            description="Ocurrió un error inesperado. Intente nuevamente."
            action={
              <Button
                variant="primary"
                icon="refrescar"
                onClick={() => toast("Reintentando conexión", "default")}
              >
                Reintentar
              </Button>
            }
          />
        </Card.Body>
      </Card>
    </div>
  );
}
