import { useParams } from "react-router";
import { useQuery } from "@tanstack/react-query";
import { obtenerSesionInventario } from "../shared/backend";
import { Card, ErrorPanel, Link, PageHeader } from "../shared/ui";
import { PATH, sesionInventarioDetalle } from "../app/route-paths";

export function SesionInventarioEliminarPage() {
  const { id } = useParams<{ id: string }>();
  const sesionId = id as string;
  const q = useQuery({
    queryKey: ["sesion-inventario", sesionId],
    queryFn: () => obtenerSesionInventario(sesionId),
  });
  const sesion = q.data;
  return (
    <>
      <PageHeader
        title={`Eliminar sesión ${sesion?.numero ?? sesionId.slice(0, 8)}`}
        description="Rustock no borra físicamente sesiones con historial: si la sesión ya tiene conteos o ajustes, solo puede anularse (SPEC §14.5)."
      />
      <Card title="Consecuencias">
        <Card.Body>
          <p className="text-sm text-gray-600">
            {sesion?.estado === "PLANEADA"
              ? "Esta sesión planeada aún no tiene conteos y puede descartarse. Contacta al administrador para anularla vía base de datos."
              : "Esta sesión ya tiene conteos y/o ajustes generados. No se puede eliminar sin perder trazabilidad. Usa el cierre o la anulación del movimiento inverso."}
          </p>
        </Card.Body>
      </Card>
      <div className="mt-6">
        <Link href={sesion ? sesionInventarioDetalle(sesionId) : PATH.inventario}>Volver</Link>
      </div>
      {!sesion && !q.isLoading ? (
        <ErrorPanel title="Sesión no encontrada" className="mt-4">
          <Link href={PATH.inventario}>Volver al listado</Link>
        </ErrorPanel>
      ) : null}
    </>
  );
}
