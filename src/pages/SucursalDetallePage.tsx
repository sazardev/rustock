import { useQuery } from "@tanstack/react-query";
import { useParams } from "react-router";
import { obtenerSucursal } from "../shared/backend";
import { formatearFecha } from "../shared/format";
import { PATH } from "../app/route-paths";
import { Badge, ButtonLink, Card, DetailList, ErrorPanel, PageHeader } from "../shared/ui";
import { useT } from "../shared/i18n";

function osmEmbedUrl(lat: number, lng: number): string {
  const d = 0.008;
  const bbox = `${lng - d},${lat - d},${lng + d},${lat + d}`;
  return `https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=mapnik&marker=${lat},${lng}`;
}

export function SucursalDetallePage() {
  const t = useT();
  const { id } = useParams<{ id: string }>();
  const query = useQuery({
    queryKey: ["sucursal", id],
    queryFn: () => obtenerSucursal(id as string),
    enabled: Boolean(id),
  });

  if (query.isLoading) {
    return <PageHeader title="Sucursal" description="Cargando…" />;
  }
  const sucursal = query.data ?? null;
  if (!sucursal) {
    return (
      <>
        <PageHeader title="Sucursal" description={t.sucursales.noEncontradaDesc} />
        <ErrorPanel title={t.sucursales.noEncontrada}>
          La sucursal no existe o fue desactivada.
        </ErrorPanel>
      </>
    );
  }

  const hayCoordenadas = sucursal.latitud !== null && sucursal.longitud !== null;

  return (
    <>
      <PageHeader
        title={sucursal.codigo}
        description={sucursal.nombre}
        actions={
          <>
            <ButtonLink variant="secondary" href={`${PATH.sucursales}/${sucursal.id}/editar`}>
              Editar
            </ButtonLink>
            {sucursal.activo ? (
              <ButtonLink variant="danger" href={`${PATH.sucursales}/${sucursal.id}/eliminar`}>
                Desactivar
              </ButtonLink>
            ) : null}
          </>
        }
      />

      <Card title={t.sucursales.datosGenerales}>
        <Card.Body>
          <DetailList
            items={[
              { label: "Código", value: sucursal.codigo, code: true },
              { label: "Nombre", value: sucursal.nombre },
              { label: "País", value: sucursal.pais ?? "—" },
              { label: "Ciudad", value: sucursal.ciudad ?? "—" },
              { label: "Dirección", value: sucursal.direccion ?? "—" },
              {
                label: "Coordenadas",
                value: hayCoordenadas
                  ? `${sucursal.latitud?.toFixed(6)}, ${sucursal.longitud?.toFixed(6)}`
                  : "—",
                code: true,
              },
              {
                label: "Creada",
                value: formatearFecha(sucursal.created_at),
              },
            ]}
          />
          <div className="mt-2">
            {sucursal.activo ? (
              <Badge tone="success">Activa</Badge>
            ) : (
              <Badge tone="danger">Inactiva</Badge>
            )}
          </div>
        </Card.Body>
      </Card>

      {hayCoordenadas ? (
        <Card title="Mapa" className="mt-6">
          <Card.Body>
            <div className="overflow-hidden rounded-lg border border-gray-200">
              <iframe
                title={`Mapa de ${sucursal.nombre}`}
                src={osmEmbedUrl(sucursal.latitud as number, sucursal.longitud as number)}
                className="h-80 w-full"
                loading="lazy"
                sandbox="allow-scripts allow-popups"
              />
            </div>
            <div className="mt-3">
              <ButtonLink
                variant="ghost"
                href={`https://www.google.com/maps?q=${sucursal.latitud},${sucursal.longitud}`}
              >
                Abrir en Google Maps
              </ButtonLink>
            </div>
          </Card.Body>
        </Card>
      ) : null}
    </>
  );
}
