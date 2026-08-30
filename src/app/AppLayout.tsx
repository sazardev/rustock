import { Suspense, useEffect, useMemo, useState } from "react";
import { Navigate, Outlet } from "react-router";
import { useQuery } from "@tanstack/react-query";
import { listarAlertas, listarRoles } from "../shared/backend";
import { usePreferencias } from "../shared/preferencias";
import { useSession } from "../shared/session";
import {
  AlertsIndicator,
  AppShell,
  AvisoSistema,
  Brand,
  Icon,
  Kbd,
  Sidebar,
  SidebarCollapseToggle,
  Skeleton,
  SelectorIdioma,
  SkipLink,
  Topbar,
  TopbarNavToggle,
  TopbarScan,
  TopbarUser,
} from "../shared/ui";
import { usePalette } from "../shared/palette/palette-store";
import { CommandPalette } from "../shared/palette/CommandPalette";
import { construirNav, DESIGN_HREF } from "./nav";
import { PATH } from "./route-paths";
import { SeoManager } from "../shared/seo";
import { SmartBreadcrumbs } from "./SmartBreadcrumbs";
import { useTrackVista } from "../shared/actividad";
import { useAtajosGlobales } from "../shared/atajos";
import { useT } from "../shared/i18n";
import { useEscanerDeMano } from "../shared/useEscanerGlobal";

const SIDEBAR_STORAGE_KEY = "rustock.sidebar.collapsed";
const MOBILE_QUERY = "(max-width: 47.99rem)";
const TABLET_QUERY = "(max-width: 63.99rem)";

function loadSidebarCollapsed(): boolean {
  try {
    return window.localStorage.getItem(SIDEBAR_STORAGE_KEY) === "1";
  } catch {
    return false;
  }
}

function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(() => window.matchMedia(query).matches);
  useEffect(() => {
    const mq = window.matchMedia(query);
    const handleChange = (event: MediaQueryListEvent) => setMatches(event.matches);
    mq.addEventListener("change", handleChange);
    return () => mq.removeEventListener("change", handleChange);
  }, [query]);
  return matches;
}

/** Píldora de la topbar que abre el command palette (DESIGN §4.2, §6.10). */
function PaletteTrigger() {
  const t = useT();
  const abrir = usePalette((s) => s.abrir);
  return (
    <button
      type="button"
      className="palette-trigger"
      onClick={abrir}
      aria-label={t.shell.buscarGlobalAria}
    >
      <Icon name="buscar" size={16} className="palette-trigger__icono" aria-hidden="true" />
      <span className="palette-trigger__texto">{t.shell.buscarGlobal}</span>
      <Kbd className="palette-trigger__kbd" aria-hidden="true">
        Ctrl K
      </Kbd>
    </button>
  );
}

/**
 * Silueta de la ruta mientras se descarga su fragmento. Reproduce la forma
 * real de una página — bloque de título, franja de filtros, tabla — para que
 * la transición no cambie de composición al llegar el contenido: lo que se
 * mueve es el detalle, no el esqueleto (DESIGN §5.6, §8.5).
 */
function EsqueletoDePagina() {
  return (
    <div aria-hidden="true">
      <Skeleton variant="title" className="mb-2" />
      <Skeleton variant="text" />
      <Skeleton variant="panel" className="mt-8" />
    </div>
  );
}

export function AppLayout() {
  const [navOpen, setNavOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState<boolean>(loadSidebarCollapsed);
  const isMobile = useMediaQuery(MOBILE_QUERY);
  const isTablet = useMediaQuery(TABLET_QUERY);
  const usuario = useSession((s) => s.usuario);
  const cargandoSesion = useSession((s) => s.cargando);
  const refrescar = useSession((s) => s.refrescar);
  const t = useT();
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
  const preferenciasResueltas = usePreferencias((s) => s.resueltas);
  useEffect(() => {
    if (usuario) {
      void usePreferencias.getState().refrescar();
    }
  }, [usuario]);

  const ordenSidebar = useMemo(() => {
    if (!preferenciasResueltas?.orden_sidebar) return null;
    try {
      const parsed: unknown = JSON.parse(preferenciasResueltas.orden_sidebar);
      return Array.isArray(parsed) ? (parsed as string[]) : null;
    } catch {
      return null;
    }
  }, [preferenciasResueltas?.orden_sidebar]);
  const gruposNav = useMemo(() => construirNav(ordenSidebar, t), [ordenSidebar, t]);
  // El modo compacto aplica en escritorio colapsado o en tablet (nunca en el
  // drawer móvil, que siempre se muestra expandido).
  const sidebarCompact = !isMobile && (sidebarCollapsed || isTablet);

  const { data: alertasAbiertas } = useQuery({
    queryKey: ["alertas", "ABIERTA"],
    queryFn: () => listarAlertas("ABIERTA"),
    enabled: Boolean(usuario),
    refetchInterval: 60_000,
  });

  const { data: roles } = useQuery({
    queryKey: ["roles"],
    queryFn: listarRoles,
    enabled: Boolean(usuario),
    staleTime: 5 * 60_000,
  });
  const rolCodigo = roles?.find((r) => r.id === usuario?.rol_id)?.codigo;
  // Espejo en la UI del permiso `escaneo:usar` de `security.rs`. El backend
  // sigue siendo la autoridad —- niega y registra el intento igual—, pero no
  // se ofrece un botón a quien va a recibir un "sin permiso" al pulsarlo.
  const puedeEscanear = rolCodigo !== undefined && rolCodigo !== "LECTOR";

  if (cargandoSesion) {
    return null;
  }
  if (!usuario) {
    return <Navigate to={PATH.login} replace />;
  }

  function toggleSidebar() {
    setSidebarCollapsed((current) => {
      const next = !current;
      try {
        window.localStorage.setItem(SIDEBAR_STORAGE_KEY, next ? "1" : "0");
      } catch {
        // almacenamiento no disponible: el estado sigue vivo en memoria
      }
      return next;
    });
  }

  return (
    <>
      <SeoManager />
      <SkipLink />
      <AppShell
        navOpen={navOpen}
        onCloseNav={() => setNavOpen(false)}
        sidebarCollapsed={sidebarCompact}
        topbar={
          <Topbar
            navToggle={
              <TopbarNavToggle
                expanded={navOpen}
                ariaLabel={t.shell.abrirNavegacion}
                onClick={() => setNavOpen(true)}
              />
            }
            breadcrumbs={<SmartBreadcrumbs />}
            search={<PaletteTrigger />}
            scan={
              <>
                <SelectorIdioma />
                {puedeEscanear ? <TopbarScan href={PATH.escanear} /> : null}
              </>
            }
            alerts={<AlertsIndicator count={alertasAbiertas?.length ?? 0} href={PATH.alertas} />}
            user={
              <TopbarUser
                name={usuario.nombre_completo}
                role={
                  rolCodigo ? (t.roles[rolCodigo as keyof typeof t.roles] ?? rolCodigo) : undefined
                }
                href={PATH.perfil}
                avatarOnly
              />
            }
          />
        }
        sidebar={
          <>
            <div className="sidebar__header">
              <Brand name="Rustock" href={PATH.dashboard} />
            </div>
            <Sidebar
              groups={gruposNav}
              collapsed={sidebarCompact}
              onNavigate={() => setNavOpen(false)}
            />
            <div className="sidebar__spacer" aria-hidden="true" />
            <Sidebar
              collapsed={sidebarCompact}
              groups={[
                {
                  title: t.nav.grupos.sistema,
                  items: [
                    {
                      label: t.paginas.galeriaDiseno,
                      href: DESIGN_HREF,
                      icon: "dashboard",
                      descripcion: t.paginas.galeriaDisenoDesc,
                    },
                    {
                      label: t.paginas.noEncontrada,
                      href: "/no-encontrado",
                      icon: "alerta",
                      descripcion: t.paginas.paginaDeError,
                    },
                  ],
                },
              ]}
              onNavigate={() => setNavOpen(false)}
            />
            {!isMobile ? (
              <SidebarCollapseToggle collapsed={sidebarCollapsed} onClick={toggleSidebar} />
            ) : null}
          </>
        }
      >
        <AvisoSistema />
        <Suspense fallback={<EsqueletoDePagina />}>
          <Outlet />
        </Suspense>
      </AppShell>
      <CommandPalette />
    </>
  );
}
