import { memo, useMemo } from "react";
import { usePreferencias } from "../../shared/preferencias";
import { useSession } from "../../shared/session";
import { Brand, Sidebar, SidebarCollapseToggle } from "../../shared/ui";
import { useT } from "../../shared/i18n";
import { construirNav, DESIGN_HREF, filtrarNav, type NavGroup } from "../nav";
import { PATH } from "../route-paths";

interface MenuLateralProps {
  /** El sidebar se dibuja compacto (colapsado en escritorio, o tablet). */
  compacto: boolean;
  /** Preferencia del usuario, para el estado del control de colapso. */
  colapsadoPreferido: boolean;
  esMovil: boolean;
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
  esMovil,
  onAlternar,
  onNavegar,
}: MenuLateralProps) {
  const t = useT();
  const permisos = useSession((s) => s.permisos);
  const ordenCrudo = usePreferencias((s) => s.resueltas?.orden_sidebar);

  const gruposNav = useMemo(
    () => filtrarNav(construirNav(leerOrden(ordenCrudo), t), permisos),
    [ordenCrudo, t, permisos],
  );

  // Grupo fijo del pie: no depende del colapso, así que no se reconstruye.
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

  return (
    <>
      <div className="sidebar__header">
        <Brand name="Rustock" href={PATH.dashboard} />
      </div>
      <Sidebar groups={gruposNav} collapsed={compacto} onNavigate={onNavegar} />
      <div className="sidebar__spacer" aria-hidden="true" />
      <Sidebar collapsed={compacto} groups={gruposSistema} onNavigate={onNavegar} />
      {esMovil ? null : (
        <SidebarCollapseToggle collapsed={colapsadoPreferido} onClick={onAlternar} />
      )}
    </>
  );
});
