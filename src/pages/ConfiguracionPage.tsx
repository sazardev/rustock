import { useState } from "react";
import { PATH } from "../app/route-paths";
import { usePuede } from "../shared/session";
import { useT } from "../shared/i18n";
import { Button, ButtonLink, ErrorPanel, FormActions, Icon, PageHeader } from "../shared/ui";
import { AplicacionCard } from "./configuracion/AplicacionCard";
import { DocumentosCard } from "./configuracion/DocumentosCard";
import { LogoCard } from "./configuracion/LogoCard";
import { SeccionApariencia } from "./configuracion/SeccionApariencia";
import { SeccionIdentidad } from "./configuracion/SeccionIdentidad";
import { SeccionParametros } from "./configuracion/SeccionParametros";
import { SeccionUbicacion } from "./configuracion/SeccionUbicacion";
import { useArchivosEmpresa } from "./configuracion/useArchivosEmpresa";
import { useConfiguracionFormulario } from "./configuracion/useConfiguracionFormulario";

/**
 * Configuración de la empresa (SPEC §4.3, §14.4, §17.1): datos generales,
 * fiscales, contacto, ubicación con mapa y los archivos (logo + documentos).
 * Todo lo edita el ADMIN (`configuracion:ver/editar`).
 */
export function ConfiguracionPage() {
  const t = useT();
  const [error, setError] = useState<string | null>(null);
  const puedeEditar = usePuede("configuracion", "editar");
  const { config, isLoading, form, guardarMut } = useConfiguracionFormulario(setError);
  const archivos = useArchivosEmpresa(Boolean(config), setError);

  if (isLoading) {
    return <PageHeader title={t.configuracion.titulo} description={t.comun.cargando} />;
  }
  // Antes esta rama solo saltaba si la *consulta* fallaba, así que quien podía
  // leer la configuración veía el formulario entero aunque no pudiera guardar
  // nada. Ahora se pregunta por el permiso que hace falta de verdad.
  if (!puedeEditar || (!config && !isLoading)) {
    return (
      <>
        <PageHeader title={t.configuracion.titulo} description={t.configuracion.intro} />
        <ErrorPanel title={t.configuracion.sinPermiso}>
          {t.configuracion.gestionadaPorAdmin}{" "}
          <ButtonLink variant="link" href={PATH.perfil}>
            {t.configuracion.miPerfil}
          </ButtonLink>
          .
        </ErrorPanel>
      </>
    );
  }

  return (
    <>
      <PageHeader
        title={t.configuracion.titulo}
        description={t.configuracion.descripcion}
        actions={
          <div className="flex items-center gap-2">
            <ButtonLink variant="secondary" href="/configuracion/importar">
              <Icon name="exportar" size={16} aria-hidden="true" /> Importar datos
            </ButtonLink>
            <ButtonLink variant="secondary" href={PATH.sucursales}>
              <Icon name="ubicacion" size={16} aria-hidden="true" /> Sucursales
            </ButtonLink>
            <ButtonLink variant="primary" href={PATH.usuarios}>
              <Icon name="usuario" size={16} aria-hidden="true" /> Usuarios y roles
            </ButtonLink>
          </div>
        }
      />

      <form onSubmit={form.handleSubmit((v) => guardarMut.mutate(v))} noValidate>
        {error ? (
          <ErrorPanel title={t.configuracion.noSePudoGuardar} className="mb-4">
            {error}
          </ErrorPanel>
        ) : null}

        <SeccionIdentidad form={form} />
        <SeccionUbicacion form={form} setError={setError} />
        <SeccionParametros form={form} />
        <SeccionApariencia form={form} />

        <FormActions>
          <Button
            type="submit"
            variant="primary"
            disabled={form.formState.isSubmitting || guardarMut.isPending}
          >
            {guardarMut.isPending ? t.comun.guardando : t.configuracion.guardar}
          </Button>
          <ButtonLink variant="secondary" href={PATH.dashboard}>
            {t.comun.cancelar}
          </ButtonLink>
        </FormActions>
      </form>

      <LogoCard
        logo={archivos.logoQuery.data}
        inputRef={archivos.logoInputRef}
        subida={archivos.logoSubida}
      />
      <DocumentosCard
        documentos={archivos.documentos}
        inputRef={archivos.docInputRef}
        subida={archivos.docSubida}
        eliminar={archivos.docEliminar}
      />
      <AplicacionCard />
    </>
  );
}
