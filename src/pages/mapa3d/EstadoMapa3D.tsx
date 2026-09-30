import { ButtonLink, ErrorPanel, Link, PageHeader, Text } from "../../shared/ui";
import { useT } from "../../shared/i18n";
import { almacenMapa } from "../../app/route-paths";

/** Estados previos al editor (carga, vacío, sin WebGL): página normal dentro
 * del shell, con vuelta al mapa 2D. */
export function EstadoMapa3D({
  almacenId,
  cargando,
  vacio,
}: {
  almacenId: string;
  cargando: boolean;
  vacio: boolean;
}) {
  const t = useT();
  const volver = (
    <ButtonLink variant="ghost" icon="ubicacion" href={almacenMapa(almacenId)}>
      {t.comun.volverAlMapa2D}
    </ButtonLink>
  );
  return (
    <>
      <PageHeader title={t.mapa3d.mapa3D} description={t.mapa3d.descripcion} actions={volver} />
      {cargando ? (
        <Text as="p" size="sm" color="muted">
          {t.comun.cargandoEstructura}
        </Text>
      ) : vacio ? (
        <Text as="p" size="sm" color="muted">
          Este almacén aún no tiene zonas, racks o ubicaciones para mostrar en el mapa.
        </Text>
      ) : (
        <ErrorPanel title={t.mapa3d.requiereWebGL}>
          Este equipo o navegador no pudo crear un contexto WebGL (sin aceleración gráfica o driver
          sin soporte). El mapa 2D ofrece las mismas posiciones y ediciones:{" "}
          <Link href={almacenMapa(almacenId)}>abrir el mapa 2D</Link>.
        </ErrorPanel>
      )}
    </>
  );
}
