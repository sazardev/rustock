import { useQuery } from "@tanstack/react-query";
import { useParams } from "react-router";
import { obtenerArchivoEmpresa } from "../shared/backend";
import { mensajeError } from "../shared/format";
import { PATH } from "../app/route-paths";
import { ButtonLink, Card, ErrorPanel, PageHeader } from "../shared/ui";

/**
 * Página de visualización de un archivo de la empresa (logo o documento).
 * Los PDFs/imágenes se muestran embebidos; cualquier tipo se puede descargar
 * con el enlace de abajo (data URL generado desde el backend).
 */
export function ArchivoVerPage() {
  const { id } = useParams<{ id: string }>();
  const query = useQuery({
    queryKey: ["archivo-empresa", id],
    queryFn: () => obtenerArchivoEmpresa(id as string),
    enabled: Boolean(id),
  });

  if (query.isLoading) {
    return <PageHeader title="Archivo" description="Cargando…" />;
  }
  const archivo = query.data ?? null;
  if (!archivo) {
    return (
      <>
        <PageHeader title="Archivo" description="No se encontró el archivo." />
        <ErrorPanel title="Archivo no encontrado">
          <ButtonLink variant="link" href={PATH.configuracion}>
            Volver a configuración
          </ButtonLink>
        </ErrorPanel>
      </>
    );
  }

  const dataUrl = `data:${archivo.mime};base64,${archivo.datos_base64}`;
  const esImagen = archivo.mime.startsWith("image/");
  const esPdf = archivo.mime === "application/pdf";

  return (
    <>
      <PageHeader
        title={archivo.nombre}
        description={`${archivo.mime} · ${(archivo.tamano / 1024).toFixed(1)} KB`}
        actions={
          <a
            href={dataUrl}
            download={archivo.nombre}
            className="btn btn--primary"
            aria-label={`Descargar ${archivo.nombre}`}
          >
            Descargar
          </a>
        }
      />

      {query.error ? (
        <ErrorPanel title="No se pudo cargar el archivo">{mensajeError(query.error)}</ErrorPanel>
      ) : null}

      <Card>
        <Card.Body>
          {esImagen ? (
            <img
              src={dataUrl}
              alt={archivo.nombre}
              className="mx-auto max-h-[480px] rounded-lg border border-gray-200"
            />
          ) : esPdf ? (
            <iframe
              title={archivo.nombre}
              src={dataUrl}
              className="h-[560px] w-full rounded-lg border border-gray-200"
              sandbox="allow-scripts"
            />
          ) : (
            <p className="text-sm text-gray-600">
              Este tipo de archivo no se puede previsualizar. Usa el botón Descargar para abrirlo.
            </p>
          )}
        </Card.Body>
      </Card>

      <div className="mt-4">
        <ButtonLink variant="secondary" href={PATH.configuracion}>
          Volver a configuración
        </ButtonLink>
      </div>
    </>
  );
}
