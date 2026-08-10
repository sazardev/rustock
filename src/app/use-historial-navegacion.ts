import { useEffect } from "react";
import { useLocation } from "react-router";
import { isTauri, historialRegistrar } from "../shared/api";

/**
 * Registra cada navegación de página en el historial local (modo web).
 * En modo Tauri la navegación la registra el backend vía comandos; aquí
 * capturamos la navegación del SPA para que el historial refleje también
 * "qué páginas visitó el usuario" (SPEC §4.5).
 */
export function useHistorialNavegacion() {
  const location = useLocation();

  useEffect(() => {
    if (isTauri()) return;
    historialRegistrar({
      usuario_id: "web",
      accion: "navegar",
      entidad: "pagina",
      entidad_id: location.pathname,
      antes: null,
      despues: location.pathname,
      origen: "web",
      comando: "navegar",
      duracion_ms: 0,
      exito: true,
      nivel: "LECTURA",
    });
  }, [location.pathname, location.search]);
}
