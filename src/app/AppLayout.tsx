import { memo, Suspense, useCallback, useEffect, useState } from "react";
import { Navigate, Outlet } from "react-router";
import { usePreferencias } from "../shared/preferencias";
import { useSession } from "../shared/session";
import { AppShell, AvisoSistema, SkipLink } from "../shared/ui";
import { CommandPalette } from "../shared/palette/CommandPalette";
import { PATH } from "./route-paths";
import { SeoManager } from "../shared/seo";
import { useTrackVista } from "../shared/actividad";
import { useAtajosGlobales } from "../shared/atajos";
import { useEscanerDeMano } from "../shared/useEscanerGlobal";
import { BarraSuperior } from "./shell/BarraSuperior";
import { EsqueletoDePagina } from "./shell/EsqueletoDePagina";
import { MenuLateral } from "./shell/MenuLateral";
import { useMediaQuery } from "./shell/useMediaQuery";
import { useSidebarColapsable } from "./shell/useSidebarColapsable";

const MOBILE_QUERY = "(max-width: 47.99rem)";
const TABLET_QUERY = "(max-width: 63.99rem)";

// Sin props y con estado propio: memoizados para que un cambio del shell
// (colapsar el sidebar, abrir el drawer) no los vuelva a renderizar.
const PaletaDeComandos = memo(CommandPalette);
const GestorSeo = memo(SeoManager);

/** Shell autenticado: decide la forma del layout y compone sus piezas. Los
 * datos de cada pieza (alertas, menú, permisos) viven en la pieza, no aquí. */
export function AppLayout() {
  const [navOpen, setNavOpen] = useState(false);
  const { colapsado, alternar } = useSidebarColapsable();
  const isMobile = useMediaQuery(MOBILE_QUERY);
  const isTablet = useMediaQuery(TABLET_QUERY);
  const usuario = useSession((s) => s.usuario);
  const cargandoSesion = useSession((s) => s.cargando);
  const refrescar = useSession((s) => s.refrescar);
  useTrackVista();
  useAtajosGlobales();
  // Escucha del lector de mano en toda la aplicación: se puede escanear desde
  // cualquier pantalla sin ir antes a ninguna (SPEC §14.3.1).
  useEscanerDeMano();

  useEffect(() => {
    refrescar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Preferencias personales: cargan el tamaño de fuente y el orden del
  // sidebar apenas hay sesión (SPEC §14.4). El store aplica la fuente al root.
  useEffect(() => {
    if (usuario) {
      void usePreferencias.getState().refrescar();
    }
  }, [usuario]);

  const abrirNavegacion = useCallback(() => setNavOpen(true), []);
  const cerrarNavegacion = useCallback(() => setNavOpen(false), []);

  if (cargandoSesion) {
    return null;
  }
  if (!usuario) {
    return <Navigate to={PATH.login} replace />;
  }

  // El modo compacto aplica en escritorio colapsado o en tablet (nunca en el
  // drawer móvil, que siempre se muestra expandido).
  const sidebarCompact = !isMobile && (colapsado || isTablet);

  return (
    <>
      <GestorSeo />
      <SkipLink />
      <AppShell
        navOpen={navOpen}
        onCloseNav={cerrarNavegacion}
        sidebarCollapsed={sidebarCompact}
        topbar={<BarraSuperior navAbierta={navOpen} onAbrirNavegacion={abrirNavegacion} />}
        sidebar={
          <MenuLateral
            compacto={sidebarCompact}
            colapsadoPreferido={colapsado}
            esMovil={isMobile}
            onAlternar={alternar}
            onNavegar={cerrarNavegacion}
          />
        }
      >
        <AvisoSistema />
        <Suspense fallback={<EsqueletoDePagina />}>
          <Outlet />
        </Suspense>
      </AppShell>
      <PaletaDeComandos />
    </>
  );
}
