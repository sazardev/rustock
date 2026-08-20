import { Suspense, useEffect, useMemo, useState } from "react";
import { Navigate, Outlet, useNavigate } from "react-router";
import { useQuery } from "@tanstack/react-query";
import { listarAlertas, listarRoles } from "../shared/backend";
import { usePreferencias } from "../shared/preferencias";
import { useSession } from "../shared/session";
import {
  AlertsIndicator,
  AppShell,
  Brand,
  Button,
  Icon,
  Kbd,
  Sidebar,
  Skeleton,
  SkipLink,
  Topbar,
  TopbarNavToggle,
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

const ROL_LABEL: Record<string, string> = {
  ADMIN: "Administrador",
  GERENTE: "Gerente",
  ENCARGADO_ALMACEN: "Encargado de almacén",
  OPERADOR: "Operador",
  LECTOR: "Lector",
};

/** Píldora de la topbar que abre el command palette (DESIGN §4.2, §6.10). */
function PaletteTrigger() {
  const abrir = usePalette((s) => s.abrir);
  return (
    <button
      type="button"
      className="palette-trigger"
      onClick={abrir}
      aria-label="Buscar en todo Rustock (Ctrl+K)"
    >
      <Icon name="buscar" size={16} className="palette-trigger__icono" aria-hidden="true" />
      <span className="palette-trigger__texto">Buscar en todo Rustock</span>
      <Kbd className="palette-trigger__kbd">Ctrl K</Kbd>
    </button>
  );
}

export function AppLayout() {
  const [navOpen, setNavOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState<boolean>(loadSidebarCollapsed);
  const isMobile = useMediaQuery(MOBILE_QUERY);
  const isTablet = useMediaQuery(TABLET_QUERY);
  const navigate = useNavigate();
  const usuario = useSession((s) => s.usuario);
  const cargandoSesion = useSession((s) => s.cargando);
  const refrescar = useSession((s) => s.refrescar);
  const cerrarSesion = useSession((s) => s.cerrarSesion);
  useTrackVista();
  useAtajosGlobales();

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
  const gruposNav = useMemo(() => construirNav(ordenSidebar), [ordenSidebar]);
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

  async function handleLogout() {
    await cerrarSesion();
    navigate(PATH.login, { replace: true });
  }

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

  function handleNavToggle() {
    if (isMobile) {
      setNavOpen(true);
    } else {
      toggleSidebar();
    }
  }

  return (
    <>
      <SeoManager />
      <SkipLink />
      <AppShell
        navOpen={navOpen}
        onCloseNav={() => setNavOpen(false)}
        sidebarCollapsed={sidebarCollapsed}
        topbar={
          <Topbar
            navToggle={
              <TopbarNavToggle
                expanded={isMobile ? navOpen : !sidebarCollapsed}
                onClick={handleNavToggle}
              />
            }
            breadcrumbs={<SmartBreadcrumbs />}
            search={<PaletteTrigger />}
            alerts={<AlertsIndicator count={alertasAbiertas?.length ?? 0} href={PATH.alertas} />}
            user={
              <div className="flex items-center gap-2">
                <TopbarUser
                  name={usuario.nombre_completo}
                  role={rolCodigo ? (ROL_LABEL[rolCodigo] ?? rolCodigo) : undefined}
                  href={PATH.perfil}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  aria-label="Cerrar sesión"
                  onClick={handleLogout}
                >
                  <Icon name="cerrarSesion" size={16} aria-hidden="true" />
                </Button>
              </div>
            }
          />
        }
        sidebar={
          <>
            <div className="sidebar__header">
              <Brand name="Rustock" />
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
                  title: "Sistema",
                  items: [
                    {
                      label: "Galería de diseño",
                      href: DESIGN_HREF,
                      icon: "dashboard",
                      end: true,
                      descripcion: "Componentes y tokens del sistema de diseño",
                    },
                    {
                      label: "No encontrado",
                      href: "/no-encontrado",
                      icon: "alerta",
                      end: true,
                      descripcion: "Página de error de ejemplo",
                    },
                  ],
                },
              ]}
              onNavigate={() => setNavOpen(false)}
            />
          </>
        }
      >
        <Suspense
          fallback={
            <div className="p-6">
              <Skeleton variant="text" className="mb-2" />
              <Skeleton variant="text" className="mb-2" />
              <Skeleton variant="block" className="h-48" />
            </div>
          }
        >
          <Outlet />
        </Suspense>
      </AppShell>
      <CommandPalette />
    </>
  );
}
