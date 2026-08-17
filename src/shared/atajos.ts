/**
 * Atajos de teclado globales (DESIGN §8.2).
 *
 * - `Ctrl+Enter`: envía el formulario visible (el que tiene el foco, o el
 *   primero visible de la página). Los formularios de react-hook-form lo
 *   capturan vía `requestSubmit()` sin cambiar su comportamiento normal.
 * - `n`: navega a la página de "nueva entidad" del módulo actual (productos,
 *   movimientos, ubicaciones, …). No dispara dentro de campos de texto ni en
 *   páginas de edición/eliminar/aprobar.
 *
 * `Ctrl+K` y `/` (command palette) los gestiona el palette en AppLayout.
 */
import { useEffect } from "react";
import { useLocation, useNavigate } from "react-router";

/** Prefijos de ruta → ruta "nueva entidad". El prefijo más largo gana. */
const PREFIJOS_NUEVO: Array<[string, string]> = [
  ["/movimientos", "/movimientos/nuevo"],
  ["/inventario", "/inventario/nuevo"],
  ["/productos", "/productos/nuevo"],
  ["/ubicaciones", "/ubicaciones/nuevo"],
  ["/almacenes", "/almacenes/nuevo"],
  ["/zonas", "/zonas/nuevo"],
  ["/racks", "/racks/nuevo"],
  ["/secciones", "/secciones/nuevo"],
  ["/cajas", "/cajas/nuevo"],
  ["/lotes", "/lotes/nuevo"],
  ["/categorias", "/categorias/nuevo"],
  ["/uoms", "/uoms/nuevo"],
  ["/proveedores", "/proveedores/nuevo"],
  ["/clientes", "/clientes/nuevo"],
  ["/usuarios", "/usuarios/nuevo"],
  ["/sucursales", "/sucursales/nuevo"],
];

/** Rutas sin "nueva entidad" (no tienen listado de catálogo). */
const EXCLUIDAS =
  /^\/(login|configurar-administrador|dashboard|perfil|configuracion|reportes|historial|alertas|ayuda|galeria|no-encontrado|acceso-no-permitido)(\/|$)/;

/** Sub-rutas de acción donde `n` no debe abrir una entidad nueva. */
const SUBRUTAS_ACCION =
  /(\/editar|\/eliminar|\/aprobar|\/anular|\/conteos|\/cerrar|\/password|\/nuevo)$/;

function enCampoTexto(target: EventTarget | null): boolean {
  const el = target as HTMLElement | null;
  if (!el) return false;
  const etiqueta = el.tagName;
  return (
    etiqueta === "INPUT" || etiqueta === "TEXTAREA" || etiqueta === "SELECT" || el.isContentEditable
  );
}

/** Monta los atajos globales. Úsalo una vez en el shell (AppLayout). */
export function useAtajosGlobales(): void {
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      // Ctrl+Enter → enviar el formulario activo.
      if (event.ctrlKey && event.key === "Enter") {
        const activo = event.target as HTMLElement | null;
        const form =
          activo?.closest<HTMLFormElement>("form") ??
          document.querySelector<HTMLFormElement>("form:not([hidden])");
        if (form && typeof form.requestSubmit === "function") {
          event.preventDefault();
          form.requestSubmit();
        }
        return;
      }

      // `n` → nueva entidad del módulo actual.
      if (
        (event.key === "n" || event.key === "N") &&
        !event.ctrlKey &&
        !event.altKey &&
        !event.metaKey &&
        !enCampoTexto(event.target)
      ) {
        const path = location.pathname;
        if (EXCLUIDAS.test(path) || SUBRUTAS_ACCION.test(path)) return;
        for (const [prefijo, nueva] of PREFIJOS_NUEVO) {
          if (path === prefijo || path.startsWith(`${prefijo}/`)) {
            event.preventDefault();
            navigate(nueva);
            return;
          }
        }
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [location.pathname, navigate]);
}
