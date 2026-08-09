import type { ReactNode } from "react";
import { cn } from "../lib/cn";

export interface AppShellProps {
  topbar: ReactNode;
  sidebar: ReactNode;
  children: ReactNode;
  navOpen?: boolean;
  onCloseNav?: () => void;
  className?: string;
}

export function AppShell({
  topbar,
  sidebar,
  children,
  navOpen = false,
  onCloseNav,
  className,
}: AppShellProps) {
  return (
    <div className={cn("app-shell", navOpen && "app-shell--nav-open", className)}>
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
