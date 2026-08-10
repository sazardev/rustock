import { useState } from "react";
import { Outlet } from "react-router";
import {
  AlertsIndicator,
  AppShell,
  Brand,
  Search,
  Sidebar,
  Topbar,
  TopbarNavToggle,
  TopbarSidebarToggle,
  TopbarUser,
} from "../shared/ui";
import { DESIGN_HREF, NAV_GROUPS } from "./nav";
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

export function AppLayout() {
  const [navOpen, setNavOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState<boolean>(loadSidebarCollapsed);
  useHistorialNavegacion();

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
          alerts={<AlertsIndicator count={0} />}
          user={<TopbarUser name="Jorge Reyes" role="Administrador" />}
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
