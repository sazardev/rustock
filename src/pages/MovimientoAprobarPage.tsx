import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate, useParams } from "react-router";
import { aprobarMovimiento, obtenerMovimiento } from "../shared/backend";
import { Button, Card, DetailList, ErrorPanel, Link, PageHeader } from "../shared/ui";
import { movimientoDetalle, PATH } from "../app/route-paths";
import {
  ESTADO_MOVIMIENTO_LABEL,
  TIPO_MOVIMIENTO_LABEL,
  formatearFecha,
  mensajeError,
} from "../shared/format";

export function MovimientoAprobarPage() {
  const { id } = useParams<{ id: string }>();
  const movimientoId = id as string;
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [error, setError] = useState<string | null>(null);

  const query = useQuery({
    queryKey: ["movimiento", movimientoId],
    queryFn: () => obtenerMovimiento(movimientoId),
  });

  const aprobarMut = useMutation({
    mutationFn: () => aprobarMovimiento(movimientoId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["movimiento", movimientoId] });
      queryClient.invalidateQueries({ queryKey: ["movimientos"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      navigate(movimientoDetalle(movimientoId));
    },
    onError: (err) => setError(mensajeError(err)),
  });

  const movimiento = query.data;

  if (query.isLoading) {
    return <PageHeader title="Aprobar movimiento" description="Cargando…" />;
  }
  if (!movimiento) {
    return (
      <ErrorPanel title="Movimiento no encontrado">
        <Link href={PATH.movimientos}>Volver al listado</Link>
      </ErrorPanel>
    );
  }

  const puedeAprobar =
    movimiento.estado === "BORRADOR" || movimiento.estado === "PENDIENTE_APROBACION";

  return (
    <>
      <PageHeader
        title={`Aprobar movimiento ${movimiento.numero}`}
        description="Al aprobar se ejecutan las líneas de forma atómica: este es el único momento en que un movimiento altera el saldo de sus ubicaciones."
      />

      <Card title="Movimiento">
        <Card.Body>
          <DetailList
            items={[
              { label: "Número", value: movimiento.numero, code: true },
              { label: "Tipo", value: TIPO_MOVIMIENTO_LABEL[movimiento.tipo] },
              { label: "Sub-tipo", value: movimiento.sub_tipo, code: true },
              { label: "Estado actual", value: ESTADO_MOVIMIENTO_LABEL[movimiento.estado] },
              { label: "Fecha del movimiento", value: formatearFecha(movimiento.fecha_movimiento) },
              { label: "Motivo", value: movimiento.motivo ?? "—" },
            ]}
          />
        </Card.Body>
      </Card>

      {!puedeAprobar ? (
        <ErrorPanel title="No se puede aprobar" className="mt-4">
          Este movimiento está en estado {ESTADO_MOVIMIENTO_LABEL[movimiento.estado]} y no admite
          aprobación.
        </ErrorPanel>
      ) : null}

      {error ? (
        <ErrorPanel title="No se pudo aprobar el movimiento" className="mt-4">
          {error}
        </ErrorPanel>
      ) : null}

      <div className="mt-6 flex gap-3">
        <Button
          variant="primary"
          icon="aprobar"
          onClick={() => aprobarMut.mutate()}
          disabled={!puedeAprobar || aprobarMut.isPending}
        >
          {aprobarMut.isPending ? "Aprobando…" : "Aprobar movimiento"}
        </Button>
        <Link href={movimientoDetalle(movimientoId)}>Cancelar</Link>
      </div>
    </>
  );
}
