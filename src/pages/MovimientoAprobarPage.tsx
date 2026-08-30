import { useState } from "react";
import { useT } from "../shared/i18n";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate, useParams } from "react-router";
import { aprobarMovimiento, obtenerMovimiento } from "../shared/backend";
import { Button, Card, DetailList, ErrorPanel, Link, PageHeader } from "../shared/ui";
import { movimientoDetalle, PATH } from "../app/route-paths";
import { formatearFecha, mensajeError } from "../shared/format";

export function MovimientoAprobarPage() {
  const t = useT();
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
    return <PageHeader title={t.movimientoAcciones.aprobarTitulo} description="Cargando…" />;
  }
  if (!movimiento) {
    return (
      <ErrorPanel title={t.movimientoDetalle.noEncontrado}>
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
        description={t.movimientoAcciones.aprobarAviso}
      />

      <Card title="Movimiento">
        <Card.Body>
          <DetailList
            items={[
              { label: "Número", value: movimiento.numero, code: true },
              { label: "Tipo", value: t.dominio.tipoMovimiento[movimiento.tipo] },
              { label: "Sub-tipo", value: movimiento.sub_tipo, code: true },
              {
                label: t.movimientoAcciones.estadoActual,
                value: t.dominio.estadoMovimiento[movimiento.estado],
              },
              {
                label: t.movimientoAcciones.fechaMovimiento,
                value: formatearFecha(movimiento.fecha_movimiento),
              },
              { label: "Motivo", value: movimiento.motivo ?? "—" },
            ]}
          />
        </Card.Body>
      </Card>

      {!puedeAprobar ? (
        <ErrorPanel title={t.movimientoAcciones.noSePuedeAprobar} className="mt-4">
          Este movimiento está en estado {t.dominio.estadoMovimiento[movimiento.estado]} y no admite
          aprobación.
        </ErrorPanel>
      ) : null}

      {error ? (
        <ErrorPanel title={t.movimientoAcciones.noSePudoAprobar} className="mt-4">
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
          {aprobarMut.isPending ? "Aprobando…" : t.movimientoAcciones.aprobarTitulo}
        </Button>
        <Link href={movimientoDetalle(movimientoId)}>Cancelar</Link>
      </div>
    </>
  );
}
