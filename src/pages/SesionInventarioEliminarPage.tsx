import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate, useParams } from "react-router";
import { anularSesionInventario, obtenerSesionInventario } from "../shared/backend";
import { Button, Card, DetailList, ErrorPanel, Link, PageHeader } from "../shared/ui";
import { PATH, sesionInventarioDetalle } from "../app/route-paths";
import { mensajeError } from "../shared/format";
import { useT } from "../shared/i18n";

export function SesionInventarioEliminarPage() {
  const t = useT();
  const { id } = useParams<{ id: string }>();
  const sesionId = id as string;
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [error, setError] = useState<string | null>(null);

  const query = useQuery({
    queryKey: ["sesion-inventario", sesionId],
    queryFn: () => obtenerSesionInventario(sesionId),
  });
  const sesion = query.data;

  const anularMut = useMutation({
    mutationFn: () => anularSesionInventario(sesionId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sesion-inventario", sesionId] });
      queryClient.invalidateQueries({ queryKey: ["sesiones-inventario"] });
      navigate(sesionInventarioDetalle(sesionId));
    },
    onError: (err) => setError(mensajeError(err)),
  });

  if (query.isLoading) {
    return <PageHeader title={t.inventarioPagina.anularTitulo} description={t.comun.cargando} />;
  }
  if (!sesion) {
    return (
      <ErrorPanel title={t.inventarioPagina.noEncontrada}>
        <Link href={PATH.inventario}>Volver al listado</Link>
      </ErrorPanel>
    );
  }

  const puedeAnular = sesion.estado === "PLANEADA" || sesion.estado === "EN_CURSO";

  return (
    <>
      <PageHeader
        title={t.inventarioPagina.anularNumero({ numero: sesion.numero })}
        description={t.inventarioPagina.avisoAnular}
      />

      <Card title={t.campos.sesion}>
        <Card.Body>
          <DetailList
            items={[
              { label: t.campos.numero, value: sesion.numero, code: true },
              {
                label: t.comun.tipo,
                value: t.dominio.tipoSesion[sesion.tipo],
              },
              { label: t.inventarioPagina.estadoActual, value: sesion.estado },
            ]}
          />
        </Card.Body>
      </Card>

      {!puedeAnular ? (
        <ErrorPanel title={t.inventarioPagina.noSePuedeAnular} className="mt-4">
          Esta sesión está en estado {sesion.estado}; solo las sesiones PLANEADA o EN_CURSO pueden
          anularse. Si ya tiene conteos y diferencias conciliadas, ciérrala en vez de anularla.
        </ErrorPanel>
      ) : null}

      {error ? (
        <ErrorPanel title={t.inventarioPagina.noSePudoAnular} className="mt-4">
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
          {anularMut.isPending ? "Anulando…" : t.inventarioPagina.anular}
        </Button>
        <Link href={sesionInventarioDetalle(sesionId)}>{t.comun.cancelar}</Link>
      </div>
    </>
  );
}
