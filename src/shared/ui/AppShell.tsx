import { useState, type ReactNode, type UIEvent } from "react";
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
  const [scrolled, setScrolled] = useState(false);

  function handleContentScroll(event: UIEvent<HTMLElement>) {
    setScrolled(event.currentTarget.scrollTop > 4);
  }

  return (
    <div
      className={cn(
        "app-shell",
        navOpen && "app-shell--nav-open",
        sidebarCollapsed && "app-shell--sidebar-collapsed",
        className,
      )}
    >
      <header className={cn("app-shell__topbar", scrolled && "app-shell__topbar--scrolled")}>
        {topbar}
      </header>
      <div
        className="app-shell__nav-backdrop"
        onClick={onCloseNav}
        aria-hidden="true"
        role="presentation"
      />
      <aside className="app-shell__sidebar">{sidebar}</aside>
      <main id="contenido" className="app-shell__content" onScroll={handleContentScroll}>
        <div className="content content__inner">{children}</div>
      </main>
    </div>
  );
}
