import { Button, Card, EmptyState, useToast } from "../shared/ui";
import { useT } from "../shared/i18n";

export function ErrorPage() {
  const t = useT();
  const { toast } = useToast();
  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <Card>
        <Card.Body>
          <EmptyState
            icon="alerta"
            title={t.paginas.errorServidor}
            description={t.paginas.errorInesperado}
            action={
              <Button
                variant="primary"
                icon="refrescar"
                onClick={() => toast(t.paginas.reintentandoConexion, "default")}
              >
                {t.comun.reintentar}
              </Button>
            }
          />
        </Card.Body>
      </Card>
    </div>
  );
}
