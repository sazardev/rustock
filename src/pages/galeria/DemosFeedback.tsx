import { Button, EmptyState, ErrorPanel, Skeleton, Text, useToast } from "../../shared/ui";
import { useT } from "../../shared/i18n";

export function DemoEstados() {
  const t = useT();
  const { toast } = useToast();
  return (
    <div className="flex flex-col gap-6">
      <div>
        <Text as="p" size="sm" color="muted" className="mb-2">
          Carga
        </Text>
        <div className="flex flex-col gap-2">
          <Skeleton variant="control" />
          <Skeleton variant="text" />
          <Skeleton variant="block" />
        </div>
      </div>
      <EmptyState
        icon="stock"
        title={t.galeria.sinProductosLargo}
        description={t.galeria.creePrimerProducto}
        action={
          <Button
            variant="primary"
            size="sm"
            icon="agregar"
            onClick={() => toast(t.galeria.toasts.creacionIniciada, "default")}
          >
            Crear producto
          </Button>
        }
      />
      <ErrorPanel
        title={t.galeria.saldoInsuficiente}
        action={
          <Button
            variant="secondary"
            size="sm"
            onClick={() => toast(t.galeria.toasts.consultandoSaldo, "default")}
          >
            Revisar saldo
          </Button>
        }
      >
        No hay stock suficiente en RACK-A1-N2-P3 para completar la salida.
      </ErrorPanel>
    </div>
  );
}

export function DemoToast() {
  const t = useT();
  const { toast } = useToast();
  return (
    <div className="flex flex-wrap items-center gap-4">
      <Button
        variant="primary"
        onClick={() => toast(t.galeria.toasts.movimientoAprobado, "success")}
      >
        Notificación de éxito
      </Button>
      <Button variant="secondary" onClick={() => toast(t.galeria.toasts.campoFaltante, "error")}>
        Notificación de error
      </Button>
      <Button variant="ghost" onClick={() => toast(t.galeria.toasts.cambiosGuardados, "default")}>
        Notificación neutra
      </Button>
    </div>
  );
}
