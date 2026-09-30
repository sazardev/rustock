import { useCallback, useState } from "react";

const SIDEBAR_STORAGE_KEY = "rustock.sidebar.collapsed";

function cargarColapsado(): boolean {
  try {
    return window.localStorage.getItem(SIDEBAR_STORAGE_KEY) === "1";
  } catch {
    return false;
  }
}

/** Preferencia de sidebar colapsado, persistida en localStorage. */
export function useSidebarColapsable(): { colapsado: boolean; alternar: () => void } {
  const [colapsado, setColapsado] = useState<boolean>(cargarColapsado);
  const alternar = useCallback(() => {
    setColapsado((actual) => {
      const siguiente = !actual;
      try {
        window.localStorage.setItem(SIDEBAR_STORAGE_KEY, siguiente ? "1" : "0");
      } catch {
        // Almacenamiento no disponible: el estado sigue vivo en memoria.
      }
      return siguiente;
    });
  }, []);
  return { colapsado, alternar };
}
