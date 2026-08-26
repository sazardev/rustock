import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate, useParams } from "react-router";
import { anularSesionInventario, obtenerSesionInventario } from "../shared/backend";
import { Button, Card, DetailList, ErrorPanel, Link, PageHeader } from "../shared/ui";
import { PATH, sesionInventarioDetalle } from "../app/route-paths";
import { mensajeError } from "../shared/format";

export function SesionInventarioEliminarPage() {
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
    return <PageHeader title="Anular sesión de inventario" description="Cargando…" />;
  }
  if (!sesion) {
    return (
      <ErrorPanel title="Sesión no encontrada">
        <Link href={PATH.inventario}>Volver al listado</Link>
      </ErrorPanel>
    );
  }

  const puedeAnular = sesion.estado === "PLANEADA" || sesion.estado === "EN_CURSO";

  return (
    <>
      <PageHeader
        title={`Anular sesión ${sesion.numero}`}
        description="Rustock no borra físicamente sesiones con historial (SPEC §14.5): una sesión planeada o en curso se anula, dejando rastro de auditoría; una ya cerrada no puede anularse."
      />

      <Card title="Sesión">
        <Card.Body>
          <DetailList
            items={[
              { label: "Número", value: sesion.numero, code: true },
              { label: "Tipo", value: sesion.tipo },
              { label: "Estado actual", value: sesion.estado },
            ]}
          />
        </Card.Body>
      </Card>

      {!puedeAnular ? (
        <ErrorPanel title="No se puede anular" className="mt-4">
          Esta sesión está en estado {sesion.estado}; solo las sesiones PLANEADA o EN_CURSO pueden
          anularse. Si ya tiene conteos y diferencias conciliadas, ciérrala en vez de anularla.
        </ErrorPanel>
      ) : null}

      {error ? (
        <ErrorPanel title="No se pudo anular la sesión" className="mt-4">
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
          {anularMut.isPending ? "Anulando…" : "Anular sesión"}
        </Button>
        <Link href={sesionInventarioDetalle(sesionId)}>Cancelar</Link>
      </div>
    </>
  );
}
