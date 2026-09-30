import { Badge, Code, PageHeader, Text } from "../shared/ui";
import { useT } from "../shared/i18n";
import { DemoBadges, DemoBotones, DemoCampos, DemoFiltros } from "./galeria/DemosControles";
import { DemoPaginacion, DemoTabla, DemoTarjetas } from "./galeria/DemosDatos";
import { DemoEstados, DemoToast } from "./galeria/DemosFeedback";
import { DemoIconos, DemoPaleta, DemoSombras, DemoTipografia } from "./galeria/DemosFundamentos";
import { ShowcaseSection } from "./galeria/ShowcaseSection";

export function GaleriaPage() {
  const t = useT();
  return (
    <>
      <PageHeader title={t.galeria.titulo} description={t.galeria.descripcion} />

      <ShowcaseSection id="iconos" title={t.galeria.iconografia} description={t.galeria.iconosDesc}>
        <DemoIconos />
      </ShowcaseSection>

      <ShowcaseSection id="paleta" title={t.galeria.colores} description={t.galeria.coloresDesc}>
        <DemoPaleta />
      </ShowcaseSection>

      <ShowcaseSection
        id="sombras"
        title={t.galeria.sombrasElevacion}
        description={t.galeria.sombrasDesc}
      >
        <DemoSombras />
      </ShowcaseSection>

      <ShowcaseSection
        id="tipografia"
        title={t.galeria.tipografia}
        description={t.galeria.tipografiaDesc}
      >
        <DemoTipografia />
      </ShowcaseSection>

      <ShowcaseSection id="botones" title={t.galeria.botones} description={t.galeria.botonesDesc}>
        <DemoBotones />
      </ShowcaseSection>

      <ShowcaseSection id="campos" title={t.galeria.campos} description={t.galeria.camposDesc}>
        <DemoCampos />
      </ShowcaseSection>

      <ShowcaseSection id="tablas" title={t.galeria.tablas} description={t.galeria.tablasDesc}>
        <DemoTabla />
      </ShowcaseSection>

      <ShowcaseSection
        id="paginacion"
        title={t.galeria.paginacion}
        description={t.galeria.paginacionDesc}
      >
        <DemoPaginacion />
      </ShowcaseSection>

      <ShowcaseSection id="estados" title={t.galeria.estados} description={t.galeria.estadosDesc}>
        <DemoEstados />
      </ShowcaseSection>

      <ShowcaseSection
        id="insignias"
        title={t.galeria.insigniasEtiquetas}
        description={t.galeria.badgesDesc}
      >
        <DemoBadges />
      </ShowcaseSection>

      <ShowcaseSection
        id="tarjetas"
        title={t.galeria.tarjetasPaneles}
        description={t.galeria.tarjetasDesc}
      >
        <DemoTarjetas />
      </ShowcaseSection>

      <ShowcaseSection
        id="filtros"
        title={t.galeria.busquedaFiltros}
        description={t.galeria.filtrosDesc}
      >
        <DemoFiltros />
      </ShowcaseSection>

      <ShowcaseSection
        id="toast"
        title={t.galeria.notificaciones}
        description={t.galeria.avisosDesc}
      >
        <DemoToast />
      </ShowcaseSection>

      <div className="flex flex-wrap items-center gap-4">
        <Badge tone="info">Indicador informativo</Badge>
        <Text as="p" size="sm" color="muted">
          Cada componente de esta galería está disponible en <Code>src/shared/ui</Code>.
        </Text>
      </div>
    </>
  );
}
