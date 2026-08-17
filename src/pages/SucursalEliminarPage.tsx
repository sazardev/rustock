import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate, useParams } from "react-router";
import { desactivarSucursal, obtenerSucursal } from "../shared/backend";
import { mensajeError } from "../shared/format";
import { PATH } from "../app/route-paths";
import { Button, ButtonLink, Card, ErrorPanel, PageHeader, useToast } from "../shared/ui";

export function SucursalEliminarPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [error, setError] = useState<string | null>(null);

  const query = useQuery({
    queryKey: ["sucursal", id],
    queryFn: () => obtenerSucursal(id as string),
    enabled: Boolean(id),
  });
  const sucursal = query.data ?? null;

  const mutacion = useMutation({
    mutationFn: () => desactivarSucursal(id as string),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["sucursales"] });
      toast("Sucursal desactivada", "success");
      navigate(PATH.sucursales);
    },
    onError: (err) => setError(mensajeError(err)),
  });

  if (query.isLoading) {
    return <PageHeader title="Sucursal" description="Cargando…" />;
  }
  if (!sucursal) {
    return (
      <>
        <PageHeader title="Sucursal" description="No se encontró la sucursal." />
        <ErrorPanel title="Sucursal no encontrada">
          La sucursal ya no existe o no tienes permiso para verla.
        </ErrorPanel>
      </>
    );
  }

  return (
    <>
      <PageHeader
        title={`Desactivar sucursal — ${sucursal.codigo}`}
        description="La sucursal deja de estar activa; sus datos se conservan."
      />

      <Card title="Datos de la sucursal">
        <Card.Body>
          <p className="text-sm text-gray-700">
            <strong className="font-mono text-sm">{sucursal.codigo}</strong> — {sucursal.nombre}
            {sucursal.direccion ? ` — ${sucursal.direccion}` : ""}
          </p>
          <ul className="mt-3 list-disc pl-5 text-sm text-gray-600">
            <li>La sucursal no aparecerá como activa en el sistema.</li>
            <li>Sus datos y su ubicación se conservan.</li>
          </ul>
          {error ? (
            <ErrorPanel title="No se pudo desactivar la sucursal" className="mt-4">
              {error}
            </ErrorPanel>
          ) : null}
        </Card.Body>
      </Card>

      <div className="mt-6 flex items-center gap-3">
        <Button
          type="button"
          variant="danger"
          disabled={mutacion.isPending}
          onClick={() => mutacion.mutate()}
        >
          {mutacion.isPending ? "Procesando…" : "Desactivar sucursal"}
        </Button>
        <ButtonLink variant="secondary" href={`${PATH.sucursales}/${sucursal.id}`}>
          Cancelar
        </ButtonLink>
      </div>
    </>
  );
}
