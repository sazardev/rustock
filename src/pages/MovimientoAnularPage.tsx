import { useState } from "react";
import { useT } from "../shared/i18n";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate, useParams } from "react-router";
import { anularMovimiento, obtenerMovimiento } from "../shared/backend";
import { Button, Card, DetailList, ErrorPanel, Link, PageHeader } from "../shared/ui";
import { movimientoDetalle, PATH } from "../app/route-paths";
import { mensajeError } from "../shared/format";

export function MovimientoAnularPage() {
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

  const anularMut = useMutation({
    mutationFn: () => anularMovimiento(movimientoId),
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
    return <PageHeader title={t.movimientoAcciones.anularTitulo} description={t.comun.cargando} />;
  }
  if (!movimiento) {
    return (
      <ErrorPanel title={t.movimientoDetalle.noEncontrado}>
        <Link href={PATH.movimientos}>Volver al listado</Link>
      </ErrorPanel>
    );
  }

  const puedeAnular = movimiento.estado === "APROBADO";

  return (
    <>
      <PageHeader
        title={`Anular movimiento ${movimiento.numero}`}
        description={t.movimientoAcciones.anularAviso}
      />

      <Card title={t.campos.movimiento}>
        <Card.Body>
          <DetailList
            items={[
              { label: t.campos.numero, value: movimiento.numero, code: true },
              { label: t.comun.tipo, value: t.dominio.tipoMovimiento[movimiento.tipo] },
              { label: t.campos.subTipo, value: movimiento.sub_tipo, code: true },
              {
                label: t.movimientoAcciones.estadoActual,
                value: t.dominio.estadoMovimiento[movimiento.estado],
              },
            ]}
          />
        </Card.Body>
      </Card>

      {!puedeAnular ? (
        <ErrorPanel title={t.movimientoAcciones.noSePuedeAnular} className="mt-4">
          Este movimiento está en estado {t.dominio.estadoMovimiento[movimiento.estado]}; solo los
          movimientos APROBADOS pueden anularse.
        </ErrorPanel>
      ) : null}

      {error ? (
        <ErrorPanel title={t.movimientoAcciones.noSePudoAnular} className="mt-4">
          {error}
        </ErrorPanel>
      ) : null}

      <div className="mt-6 flex gap-3">
        <Button
          variant="danger"
          icon="anular"
          onClick={() => anularMut.mutate()}
          disabled={!puedeAnular || anularMut.isPending}
        >
          {anularMut.isPending ? "Anulando…" : t.movimientoAcciones.anularTitulo}
        </Button>
        <Link href={movimientoDetalle(movimientoId)}>Cancelar</Link>
      </div>
    </>
  );
}
