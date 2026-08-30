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
    return <PageHeader title={t.movimientoAcciones.aprobarTitulo} description={t.comun.cargando} />;
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
        title={t.movimientoAcciones.aprobarNumero({ numero: movimiento.numero })}
        description={t.movimientoAcciones.aprobarAviso}
      />

      <Card title={t.campos.movimiento}>
        <Card.Body>
          <DetailList
            items={[
              { label: t.campos.numero, value: movimiento.numero, code: true },
              { label: t.comun.tipo, value: t.dominio.tipoMovimiento[movimiento.tipo] },
              { label: t.campos.subTipo, value: t.dominio.subTipoMovimiento[movimiento.sub_tipo] },
              {
                label: t.movimientoAcciones.estadoActual,
                value: t.dominio.estadoMovimiento[movimiento.estado],
              },
              {
                label: t.movimientoAcciones.fechaMovimiento,
                value: formatearFecha(movimiento.fecha_movimiento),
              },
              { label: t.campos.motivo, value: movimiento.motivo ?? "—" },
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
        <Link href={movimientoDetalle(movimientoId)}>{t.comun.cancelar}</Link>
      </div>
    </>
  );
}
