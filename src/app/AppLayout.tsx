import { useState } from "react";
import { Outlet } from "react-router";
import {
  AlertsIndicator,
  AppShell,
  Brand,
  Breadcrumbs,
  Search,
  Sidebar,
  Topbar,
  TopbarNavToggle,
  TopbarUser,
} from "../shared/ui";
import { DESIGN_HREF, NAV_GROUPS } from "./nav";

export function AppLayout() {
  const [navOpen, setNavOpen] = useState(false);

  return (
    <AppShell
      navOpen={navOpen}
      onCloseNav={() => setNavOpen(false)}
      topbar={
        <Topbar
          navToggle={<TopbarNavToggle onClick={() => setNavOpen(true)} />}
          brand={<Brand name="Rustock" />}
          breadcrumbs={
            <Breadcrumbs items={[{ label: "Rustock", href: "/" }, { label: "Sistema" }]} />
          }
          search={<Search placeholder="Buscar en todo Rustock" aria-label="Búsqueda global" />}
          alerts={<AlertsIndicator count={0} />}
          user={<TopbarUser name="Jorge Reyes" role="Administrador" />}
        />
      }
      sidebar={
        <>
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
