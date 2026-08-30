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
    return <PageHeader title={t.campos.sucursal} description={t.comun.cargando} />;
  }
  const sucursal = query.data ?? null;
  if (!sucursal) {
    return (
      <>
        <PageHeader title={t.campos.sucursal} description={t.sucursales.noEncontradaDesc} />
        <ErrorPanel title={t.sucursales.noEncontrada}>{t.comun.sucursalNoExiste}</ErrorPanel>
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
              {t.comun.editar}
            </ButtonLink>
            {sucursal.activo ? (
              <ButtonLink variant="danger" href={`${PATH.sucursales}/${sucursal.id}/eliminar`}>
                {t.comun.desactivar}
              </ButtonLink>
            ) : null}
          </>
        }
      />

      <Card title={t.sucursales.datosGenerales}>
        <Card.Body>
          <DetailList
            items={[
              { label: t.comun.codigo, value: sucursal.codigo, code: true },
              { label: t.comun.nombre, value: sucursal.nombre },
              { label: t.campos.pais, value: sucursal.pais ?? "—" },
              { label: t.campos.ciudad, value: sucursal.ciudad ?? "—" },
              { label: t.campos.direccion, value: sucursal.direccion ?? "—" },
              {
                label: t.campos.coordenadas,
                value: hayCoordenadas
                  ? `${sucursal.latitud?.toFixed(6)}, ${sucursal.longitud?.toFixed(6)}`
                  : "—",
                code: true,
              },
              {
                label: t.campos.creada,
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
        <Card title={t.campos.mapa} className="mt-6">
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
                {t.comun.abrirGoogleMaps}
              </ButtonLink>
            </div>
          </Card.Body>
        </Card>
      ) : null}
    </>
  );
}
