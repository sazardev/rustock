import type { ReactNode } from "react";
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
  return (
    <a
      href={onClick ? undefined : href}
      onClick={onClick}
      className={cn("topbar__alerts", className)}
      aria-label={`${count} alertas activas`}
    >
      <Icon name="alerta" size={16} aria-hidden="true" />
      {count > 0 ? <span className="topbar__alerts-badge">{count}</span> : null}
    </a>
  );
}

export interface TopbarUserProps {
  name: string;
  role?: string;
  initials?: string;
  href?: string;
  className?: string;
}

export function TopbarUser({ name, role, initials, href = "/perfil", className }: TopbarUserProps) {
  return (
    <a href={href} className={cn("topbar__user", className)}>
      <span className="topbar__user-avatar" aria-hidden="true">
        {initials ?? name.charAt(0).toUpperCase()}
      </span>
      <span className="topbar__user-name">
        <span className="topbar__user-name-text">{name}</span>
        {role ? <span className="topbar__user-role">{role}</span> : null}
      </span>
    </a>
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
              <a className="breadcrumbs__item" href={item.href}>
                {item.label}
              </a>
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
  active?: boolean;
}

export interface SidebarGroup {
  title: string;
  items: SidebarItem[];
}

export interface SidebarProps {
  groups: SidebarGroup[];
  className?: string;
}

export function Sidebar({ groups, className }: SidebarProps) {
  return (
    <nav className={cn("sidebar", className)} aria-label="Navegación principal">
      {groups.map((group) => (
        <div className="sidebar__group" key={group.title}>
          <h2 className="sidebar__group-title">{group.title}</h2>
          {group.items.map((item) => (
            <a
              key={item.href}
              href={item.href}
              className={cn("sidebar__item", item.active && "sidebar__item--active")}
              aria-current={item.active ? "page" : undefined}
            >
              <span className="sidebar__item-icon">
                <Icon name={item.icon} size={16} aria-hidden="true" />
              </span>
              <span className="sidebar__item-label">{item.label}</span>
            </a>
          ))}
        </div>
      ))}
    </nav>
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
