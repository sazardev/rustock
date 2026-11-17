import { memo, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { listarRoles } from "../../shared/backend";
import { usePreferencias } from "../../shared/preferencias";
import { useSession } from "../../shared/session";
import { Brand, SelectorIdioma, Sidebar, SidebarCollapseToggle } from "../../shared/ui";
import { useT } from "../../shared/i18n";
import { construirNav, DESIGN_HREF, filtrarNav, type NavGroup } from "../nav";
import { PATH } from "../route-paths";
import type { DispositivoNav } from "../../shared/types";
import { NavModular } from "./drawer/NavModular";

interface MenuLateralProps {
  /** El sidebar de escritorio se dibuja compacto (colapsado). */
  compacto: boolean;
  /** Preferencia del usuario, para el estado del control de colapso. */
  colapsadoPreferido: boolean;
  /** Móvil y tablet usan el drawer modular en vez del sidebar. */
  conDrawer: boolean;
  dispositivo: DispositivoNav;
  onAlternar: () => void;
  onNavegar: () => void;
}

function leerOrden(crudo: string | null | undefined): string[] | null {
  if (!crudo) {
    return null;
  }
  try {
    const parsed: unknown = JSON.parse(crudo);
    return Array.isArray(parsed) ? (parsed as string[]) : null;
  } catch {
    return null;
  }
}

/** Contenido del sidebar: marca, grupos de navegación y control de colapso.
 * Construye sus grupos aquí (orden personal + permisos) y los memoiza, así que
 * solo se recalculan si cambian de verdad. */
export const MenuLateral = memo(function MenuLateral({
  compacto,
  colapsadoPreferido,
  conDrawer,
  dispositivo,
  onAlternar,
  onNavegar,
}: MenuLateralProps) {
  const t = useT();
  const permisos = useSession((s) => s.permisos);
  const usuario = useSession((s) => s.usuario);
  const ordenCrudo = usePreferencias((s) => s.resueltas?.orden_sidebar);
  const { data: roles } = useQuery({
    queryKey: ["roles"],
    queryFn: listarRoles,
    enabled: Boolean(usuario),
    staleTime: 5 * 60_000,
  });
  const rolCodigo = roles?.find((r) => r.id === usuario?.rol_id)?.codigo ?? null;

  const gruposNav = useMemo(
    () => filtrarNav(construirNav(leerOrden(ordenCrudo), t), permisos),
    [ordenCrudo, t, permisos],
  );

  // Grupo fijo del pie del sidebar de escritorio: no depende del colapso, así
  // que no se reconstruye. En el drawer no se muestra (es navegación de sistema,
  // no un módulo de operación).
  const gruposSistema = useMemo<NavGroup[]>(
    () => [
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
    ],
    [t],
  );

  if (conDrawer) {
    const pie = (
      <div className="sidebar__idioma">
        <span className="sidebar__idioma-label">{t.shell.idioma}</span>
        <SelectorIdioma />
      </div>
    );
    return (
      <>
        <div className="sidebar__header">
          <Brand name="Rustock" href={PATH.dashboard} />
        </div>
        <NavModular
          grupos={gruposNav}
          dispositivo={dispositivo}
          rolCodigo={rolCodigo}
          onNavegar={onNavegar}
          pie={pie}
        />
      </>
    );
  }

  return (
    <>
      <div className="sidebar__header">
        <Brand name="Rustock" href={PATH.dashboard} />
      </div>
      <Sidebar groups={gruposNav} collapsed={compacto} onNavigate={onNavegar} />
      <div className="sidebar__spacer" aria-hidden="true" />
      <Sidebar collapsed={compacto} groups={gruposSistema} onNavigate={onNavegar} />
      <SidebarCollapseToggle collapsed={colapsadoPreferido} onClick={onAlternar} />
    </>
  );
});
