/**
 * Conexión del escáner de mano con la aplicación (SPEC §14.3.1).
 *
 * `escaner-global.ts` detecta la ráfaga del lector; este módulo decide qué
 * hacer con ella:
 *
 *  1. Si la pantalla actual instaló un manejador (captura rápida, conteo de
 *     inventario, la propia pantalla del escáner), el código va ahí. La
 *     pantalla sabe mejor que nadie qué significa un código en su contexto.
 *  2. Si no, se resuelve contra el backend y se navega a la acción principal
 *     que él mismo propone según el propósito y los permisos.
 *
 * En ambos casos la lectura queda registrada: no hay camino que resuelva un
 * código sin dejar rastro.
 */
import { useEffect } from "react";
import { useNavigate } from "react-router";
import { escanear } from "./backend";
import { useToast } from "./ui";
import {
  entregarADeLaPantalla,
  escucharEscanerDeMano,
  registrarManejador,
  type ManejadorEscaneo,
} from "./escaner-global";

/**
 * Instala la escucha global. Se llama **una sola vez**, desde el layout.
 */
export function useEscanerDeMano(): void {
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    return escucharEscanerDeMano((codigo) => {
      // La pantalla activa tiene prioridad absoluta.
      if (entregarADeLaPantalla(codigo)) return;

      // Sin pantalla que lo reclame: se resuelve y se va a donde toque.
      void (async () => {
        try {
          const r = await escanear({
            codigo,
            origen: "TECLADO",
            proposito: "CONSULTA",
            ruta: window.location.pathname,
            dispositivo: navigator.userAgent,
          });
          if (!r.resuelto) {
            const alta = r.acciones.find((a) => a.principal);
            toast(`Código «${codigo}» no encontrado.`, "error");
            if (alta) navigate(`${alta.href}?codigo=${encodeURIComponent(codigo)}`);
            return;
          }
          const principal = r.acciones.find((a) => a.principal) ?? r.acciones[0];
          toast(`${r.resuelto.tipo}: ${r.resuelto.etiqueta}`, "success");
          if (principal) navigate(principal.href);
        } catch (e) {
          toast(e instanceof Error ? e.message : "No se pudo procesar el escaneo.", "error");
        }
      })();
    });
  }, [navigate, toast]);
}

/**
 * Declara que esta pantalla se queda con los escaneos del lector de mano
 * mientras esté montada. Manda la última pantalla que lo declare.
 */
export function useCapturaEscaneo(manejar: ManejadorEscaneo, activo = true): void {
  useEffect(() => {
    if (!activo) return;
    return registrarManejador(manejar);
  }, [manejar, activo]);
}
