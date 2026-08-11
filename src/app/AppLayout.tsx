import { useEffect, useState } from "react";
import { Navigate, Outlet, useNavigate } from "react-router";
import { useQuery } from "@tanstack/react-query";
import { listarAlertas, listarRoles } from "../shared/backend";
import { useSession } from "../shared/session";
import {
  AlertsIndicator,
  AppShell,
  Brand,
  Button,
  Icon,
  Search,
  Sidebar,
  Topbar,
  TopbarNavToggle,
  TopbarSidebarToggle,
  TopbarUser,
} from "../shared/ui";
import { DESIGN_HREF, NAV_GROUPS } from "./nav";
import { PATH } from "./route-paths";
import { SmartBreadcrumbs } from "./SmartBreadcrumbs";
import { useHistorialNavegacion } from "./use-historial-navegacion";

const SIDEBAR_STORAGE_KEY = "rustock.sidebar.collapsed";

function loadSidebarCollapsed(): boolean {
  try {
    return window.localStorage.getItem(SIDEBAR_STORAGE_KEY) === "1";
  } catch {
    return false;
  }
}

const ROL_LABEL: Record<string, string> = {
  ADMIN: "Administrador",
  GERENTE: "Gerente",
  ENCARGADO_ALMACEN: "Encargado de almacén",
  OPERADOR: "Operador",
  LECTOR: "Lector",
};

export function AppLayout() {
  const [navOpen, setNavOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState<boolean>(loadSidebarCollapsed);
  const navigate = useNavigate();
  const usuario = useSession((s) => s.usuario);
  const cargandoSesion = useSession((s) => s.cargando);
  const refrescar = useSession((s) => s.refrescar);
  const cerrarSesion = useSession((s) => s.cerrarSesion);
  useHistorialNavegacion();

  useEffect(() => {
    refrescar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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

  return (
    <AppShell
      navOpen={navOpen}
      onCloseNav={() => setNavOpen(false)}
      sidebarCollapsed={sidebarCollapsed}
      topbar={
        <Topbar
          navToggle={<TopbarNavToggle onClick={() => setNavOpen(true)} />}
          sidebarToggle={
            <TopbarSidebarToggle collapsed={sidebarCollapsed} onClick={toggleSidebar} />
          }
          brand={<Brand name="Rustock" />}
          breadcrumbs={<SmartBreadcrumbs />}
          search={<Search placeholder="Buscar en todo Rustock" aria-label="Búsqueda global" />}
          alerts={<AlertsIndicator count={alertasAbiertas?.length ?? 0} href={PATH.alertas} />}
          user={
            <div className="flex items-center gap-2">
              <TopbarUser
                name={usuario.nombre_completo}
                role={rolCodigo ? (ROL_LABEL[rolCodigo] ?? rolCodigo) : undefined}
                href={PATH.configuracion}
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
          <Sidebar groups={NAV_GROUPS} onNavigate={() => setNavOpen(false)} />
          <div className="sidebar__spacer" aria-hidden="true" />
          <Sidebar
            groups={[
              {
                title: "Sistema",
                items: [
                  { label: "Galería de diseño", href: DESIGN_HREF, icon: "dashboard", end: true },
                  { label: "No encontrado", href: "/no-encontrado", icon: "alerta", end: true },
                ],
              },
            ]}
            onNavigate={() => setNavOpen(false)}
          />
        </>
      }
    >
      <Outlet />
    </AppShell>
  );
}
