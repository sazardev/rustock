import type { ReactNode } from "react";
import { cn } from "../lib/cn";

export interface AppShellProps {
  topbar: ReactNode;
  sidebar: ReactNode;
  children: ReactNode;
  navOpen?: boolean;
  onCloseNav?: () => void;
  sidebarCollapsed?: boolean;
  className?: string;
}

export function AppShell({
  topbar,
  sidebar,
  children,
  navOpen = false,
  onCloseNav,
  sidebarCollapsed = false,
  className,
}: AppShellProps) {
  return (
    <div
      className={cn(
        "app-shell",
        navOpen && "app-shell--nav-open",
        sidebarCollapsed && "app-shell--sidebar-collapsed",
        className,
      )}
    >
      <header className="app-shell__topbar">{topbar}</header>
      <div
        className="app-shell__nav-backdrop"
        onClick={onCloseNav}
        aria-hidden="true"
        role="presentation"
      />
      <aside className="app-shell__sidebar">{sidebar}</aside>
      <main className="app-shell__content">
        <div className="content content__inner">{children}</div>
      </main>
    </div>
  );
}
