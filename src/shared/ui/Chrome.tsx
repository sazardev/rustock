import {
  useId,
  useState,
  type FocusEvent as ReactFocusEvent,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from "react";
import { Link as RouterLink, useLocation } from "react-router";
import { cn } from "../lib/cn";
import { Icon, type IconName } from "./Icon";

export interface AlertsIndicatorProps {
  count: number;
  href?: string;
  onClick?: () => void;
  className?: string;
}

export function AlertsIndicator({
  count,
  href = "/alertas",
  onClick,
  className,
}: AlertsIndicatorProps) {
  const content = (
    <>
      <Icon name="alerta" size={16} aria-hidden="true" />
      {count > 0 ? <span className="topbar__alerts-badge">{count}</span> : null}
    </>
  );
  if (onClick) {
    return (
      <button
        type="button"
        className={cn("topbar__alerts", className)}
        onClick={onClick}
        aria-label={`${count} alertas activas`}
      >
        {content}
      </button>
    );
  }
  return (
    <RouterLink
      to={href}
      className={cn("topbar__alerts", className)}
      aria-label={`${count} alertas activas`}
    >
      {content}
    </RouterLink>
  );
}

export interface TopbarScanProps {
  href?: string;
  className?: string;
}

/**
 * Acceso al escáner desde cualquier pantalla (SPEC §14.3).
 *
 * Vive en la barra superior porque escanear no pertenece a ningún módulo: se
 * hace en medio de cualquier tarea, con el teléfono en una mano y la caja en
 * la otra. Solo se muestra a quien tiene `escaneo:usar` — a un LECTOR no se le
 * ofrece un botón que le va a ser denegado.
 */
export function TopbarScan({ href = "/escanear", className }: TopbarScanProps) {
  return (
    <RouterLink
      to={href}
      className={cn("topbar__alerts", className)}
      aria-label="Escanear un código"
      title="Escanear un código"
    >
      <Icon name="codigoBarras" size={16} aria-hidden="true" />
    </RouterLink>
  );
}

export interface TopbarUserProps {
  name: string;
  role?: string;
  initials?: string;
  href?: string;
  className?: string;
  /** Muestra solo el avatar (sin nombre/rol) — el nombre completo queda en el título del enlace. */
  avatarOnly?: boolean;
}

export function TopbarUser({
  name,
  role,
  initials,
  href = "/perfil",
  className,
  avatarOnly = false,
}: TopbarUserProps) {
  return (
    <RouterLink
      to={href}
      className={cn("topbar__user", avatarOnly && "topbar__user--avatar-only", className)}
      title={avatarOnly ? name : undefined}
      aria-label={avatarOnly ? `Mi perfil — ${name}` : undefined}
    >
      <span className="topbar__user-avatar" aria-hidden="true">
        {initials ?? name.charAt(0).toUpperCase()}
      </span>
      {avatarOnly ? null : (
        <span className="topbar__user-name">
          <span className="topbar__user-name-text">{name}</span>
          {role ? <span className="topbar__user-role">{role}</span> : null}
        </span>
      )}
    </RouterLink>
  );
}

export interface BreadcrumbsProps {
  items: { label: ReactNode; href?: string }[];
  className?: string;
}

export function Breadcrumbs({ items, className }: BreadcrumbsProps) {
  return (
    <nav className={cn("breadcrumbs", className)} aria-label="Migas de pan">
      {items.map((item, index) => {
        const isCurrent = index === items.length - 1;
        return (
          <span className="breadcrumbs__item-row" key={index}>
            {index > 0 ? (
              <span className="breadcrumbs__sep" aria-hidden="true">
                /
              </span>
            ) : null}
            {item.href && !isCurrent ? (
              <RouterLink className="breadcrumbs__item" to={item.href}>
                {item.label}
              </RouterLink>
            ) : (
              <span
                className="breadcrumbs__item breadcrumbs__item--current"
                aria-current={isCurrent ? "page" : undefined}
              >
                {item.label}
              </span>
            )}
          </span>
        );
      })}
    </nav>
  );
}

export interface SidebarItem {
  label: string;
  href: string;
  icon: IconName;
  /** Breve descripción del módulo; se muestra en el tooltip del modo compacto. */
  descripcion?: string;
}

export interface SidebarGroup {
  title: string;
  items: SidebarItem[];
}

export interface SidebarProps {
  groups: SidebarGroup[];
  onNavigate?: () => void;
  /** Modo compacto (solo iconos): títulos de grupo como divisores y tooltip en hover/foco. */
  collapsed?: boolean;
  className?: string;
}

interface TooltipPos {
  x: number;
  y: number;
}

/**
 * Ítem de navegación. En modo compacto el label queda oculto visualmente y un
 * tooltip propio (position: fixed, calculado del elemento) aparece en hover y
 * foco con el nombre del módulo y una breve descripción de lo que maneja.
 */
function SidebarNavItem({
  item,
  collapsed,
  activo,
  onNavigate,
}: {
  item: SidebarItem;
  collapsed: boolean;
  /** Lo decide el Sidebar con la regla del prefijo más largo (ver nav.ts). */
  activo: boolean;
  onNavigate?: () => void;
}) {
  const tipId = useId();
  const [tooltip, setTooltip] = useState<TooltipPos | null>(null);

  function showTooltip(
    event: ReactPointerEvent<HTMLAnchorElement> | ReactFocusEvent<HTMLAnchorElement>,
  ) {
    if (!collapsed) {
      return;
    }
    const nav = event.currentTarget.closest(".sidebar");
    const item = event.currentTarget;
    if (!nav || !item) {
      return;
    }
    const navRect = nav.getBoundingClientRect();
    const itemRect = item.getBoundingClientRect();
    setTooltip({
      x: navRect.right + 8,
      y: itemRect.top + itemRect.height / 2,
    });
  }

  function hideTooltip() {
    setTooltip(null);
  }

  const tipStyle = tooltip ? { left: tooltip.x, top: tooltip.y } : undefined;

  return (
    <RouterLink
      to={item.href}
      onPointerEnter={showTooltip}
      onPointerLeave={hideTooltip}
      onFocus={showTooltip}
      onBlur={hideTooltip}
      className={cn("sidebar__item", activo && "sidebar__item--active")}
      aria-current={activo ? "page" : undefined}
      onClick={onNavigate}
      aria-label={collapsed ? item.label : undefined}
      aria-describedby={collapsed && tooltip ? tipId : undefined}
    >
      <span className="sidebar__item-icon">
        <Icon name={item.icon} size={16} aria-hidden="true" />
      </span>
      <span className="sidebar__item-label">{item.label}</span>
      {collapsed && tooltip ? (
        <span id={tipId} role="tooltip" className="sidebar__tooltip" style={tipStyle}>
          <span className="sidebar__tooltip-title">{item.label}</span>
          {item.descripcion ? (
            <span className="sidebar__tooltip-desc">{item.descripcion}</span>
          ) : null}
        </span>
      ) : null}
    </RouterLink>
  );
}

/**
 * Resuelve qué ítem de navegación corresponde a una ruta, con la regla del
 * **prefijo más largo**.
 *
 * Marcar activo por prefijo simple basta mientras ningún módulo cuelgue de
 * otro: `/movimientos/123` debe encender "Movimientos". Pero "Captura rápida"
 * vive en `/movimientos/captura-recepcion`, y el prefijo simple encendía los
 * dos a la vez. Aquí gana el ítem cuyo href es el prefijo más específico de la
 * ruta actual — que es siempre el módulo en el que realmente está el usuario.
 *
 * Devuelve el href ganador, o `null` si la ruta no pertenece a ningún ítem.
 */
export function hrefActivo(pathname: string, hrefs: string[]): string | null {
  let ganador: string | null = null;
  for (const href of hrefs) {
    const coincide = pathname === href || pathname.startsWith(`${href}/`);
    if (coincide && (ganador === null || href.length > ganador.length)) {
      ganador = href;
    }
  }
  return ganador;
}

export function Sidebar({ groups, onNavigate, collapsed = false, className }: SidebarProps) {
  const { pathname } = useLocation();
  // Un solo ítem encendido por ruta: el del prefijo más específico. Sin esto,
  // un módulo que cuelga de otro (Captura rápida bajo /movimientos) encendería
  // también a su padre.
  const activo = hrefActivo(
    pathname,
    groups.flatMap((grupo) => grupo.items.map((item) => item.href)),
  );

  return (
    <nav
      className={cn("sidebar", collapsed && "sidebar--collapsed", className)}
      aria-label="Navegación principal"
    >
      {groups.map((group) => (
        <div className="sidebar__group" key={group.title}>
          <h2 className="sidebar__group-title">{group.title}</h2>
          <span className="sidebar__divider" role="separator" aria-label={group.title} />
          {group.items.map((item) => (
            <SidebarNavItem
              key={item.href}
              item={item}
              collapsed={collapsed}
              activo={item.href === activo}
              onNavigate={onNavigate}
            />
          ))}
        </div>
      ))}
    </nav>
  );
}

export interface SidebarCollapseToggleProps {
  collapsed: boolean;
  onClick?: () => void;
  className?: string;
}

/**
 * Control de colapso del sidebar: vive dentro del propio drawer (borde
 * derecho, centrado verticalmente) en vez de la barra superior — el
 * colapsar/expandir es una acción de la navegación, no de la barra superior.
 * Oculto en móvil (el drawer siempre se muestra expandido ahí).
 */
export function SidebarCollapseToggle({
  collapsed,
  onClick,
  className,
}: SidebarCollapseToggleProps) {
  return (
    <button
      type="button"
      className={cn("sidebar__collapse-toggle", className)}
      onClick={onClick}
      aria-label={collapsed ? "Expandir navegación" : "Colapsar navegación"}
      aria-pressed={collapsed}
    >
      <Icon name={collapsed ? "expandirPanel" : "colapsarPanel"} size={14} aria-hidden="true" />
    </button>
  );
}

export interface SkipLinkProps {
  href?: string;
  className?: string;
}

export function SkipLink({ href = "#contenido", className }: SkipLinkProps) {
  return (
    <a href={href} className={cn("skip-link", className)}>
      Saltar al contenido
    </a>
  );
}
