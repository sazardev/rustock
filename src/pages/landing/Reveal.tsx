import { useEffect, useRef, useState, type HTMLAttributes, type ReactNode } from "react";
import { cn } from "../../shared/lib/cn";

const REVEAL_OPTIONS: IntersectionObserverInit = {
  threshold: 0.12,
  rootMargin: "0px 0px -48px 0px",
};

interface RevealProps extends HTMLAttributes<HTMLDivElement> {
  /** Retraso en ms antes de comenzar la transición (para apariciones escalonadas). */
  delay?: number;
  children: ReactNode;
}

/**
 * Reveal — revela su contenido al entrar en el viewport (scroll suave, sin parallax).
 * Respeta prefers-reduced-motion: en ese caso el contenido se muestra de inmediato.
 */
export function Reveal({ delay = 0, className, children, ...rest }: RevealProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) {
      return;
    }
    if (typeof IntersectionObserver === "undefined") {
      setVisible(true);
      return;
    }
    const observer = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      }
    }, REVEAL_OPTIONS);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      className={cn("landing__reveal", visible && "landing__reveal--visible", className)}
      style={delay > 0 ? { transitionDelay: `${delay}ms` } : undefined}
      {...rest}
    >
      {children}
    </div>
  );
}
