import { cn } from "../lib/cn";

export interface KbdProps {
  children: React.ReactNode;
  className?: string;
}

/** Indicador visual de tecla/atajo (p. ej. "Ctrl K") — clase `.kbd`. */
export function Kbd({ children, className }: KbdProps) {
  return <kbd className={cn("kbd", className)}>{children}</kbd>;
}
