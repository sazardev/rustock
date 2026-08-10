import { useEffect, useState } from "react";
import { useLocation, useNavigate, useNavigationType } from "react-router";

export interface HistoryEntry {
  pathname: string;
  search: string;
}

const HISTORY_LIMIT = 50;

/**
 * Hook de historial de navegación real (stack de páginas visitadas).
 * Se apoya en `useNavigationType` de react-router para distinguir entre
 * navegaciones PUSH, POP y REPLACE:
 *  - PUSH  -> se agrega la página al stack.
 *  - REPLACE -> se reemplaza la última entrada (ej. al navegar desde un formulario).
 *  - POP   -> el usuario usó atrás/adelante del navegador; se sincroniza el stack
 *             a partir del historial del navegador.
 *
 * Devuelve `back()`/`forward()` que navegan dentro del historial real de la app,
 * manteniendo los crumbs estables (sin depender de window.history lengths).
 */
export function useNavigationHistory() {
  const location = useLocation();
  const navigate = useNavigate();
  const navType = useNavigationType();

  const [stack, setStack] = useState<HistoryEntry[]>([]);
  const [cursor, setCursor] = useState(-1);

  useEffect(() => {
    const entry: HistoryEntry = { pathname: location.pathname, search: location.search };

    if (navType === "REPLACE") {
      // Reemplaza la entrada actual: formularios que redirigen al detalle.
      setStack((prev) => {
        const next = [...prev];
        if (next.length > 0 && cursor >= 0) {
          next[cursor] = entry;
        } else {
          next.push(entry);
        }
        return next.slice(-HISTORY_LIMIT);
      });
      return;
    }

    if (navType === "POP") {
      // Vino del historial del navegador: reconstruir el stack coherente.
      setStack((prev) => {
        const merged = [...prev.slice(0, cursor + 1), entry];
        return merged.slice(-HISTORY_LIMIT);
      });
      setCursor((c) => Math.min(c + 1, HISTORY_LIMIT - 1));
      return;
    }

    // PUSH: nueva página.
    setStack((prev) => {
      const next = [...prev.slice(0, cursor + 1), entry];
      return next.slice(-HISTORY_LIMIT);
    });
    setCursor((c) => Math.min(c + 1, HISTORY_LIMIT - 1));
  }, [location.pathname, location.search, navType, cursor]);

  const canGoBack = cursor > 0;
  const canGoForward = cursor < stack.length - 1;

  const back = () => {
    if (!canGoBack) return;
    const target = stack[cursor - 1];
    if (target) navigate(target.pathname + target.search);
  };

  const forward = () => {
    if (!canGoForward) return;
    const target = stack[cursor + 1];
    if (target) navigate(target.pathname + target.search);
  };

  return { stack, cursor, canGoBack, canGoForward, back, forward };
}
