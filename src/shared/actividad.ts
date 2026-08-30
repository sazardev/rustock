/**
 * Tracking total de navegación (Hito 25).
 *
 * Registra en el historial de auditoría del backend qué rutas visita el
 * usuario, cuánto tiempo permanece en cada una, desde qué módulo, en qué
 * proceso de negocio y con qué hora/día local — la materia prima del centro
 * de actividad (`/historial`) y del análisis predictivo.
 *
 * La lógica vive en Rust (`registrar_vista`); aquí solo se construye el
 * evento con los datos de la UI y se envía sin bloquear la navegación.
 */
import { useEffect, useRef } from "react";
import { useLocation } from "react-router";
import { registrarVista } from "./backend";
import type { RegistrarVista } from "./audit";
import { useSession } from "./session";
import { API_BASE } from "./api";

interface ReglaModulo {
  prefijo: string;
  modulo: string;
}

/**
 * Mapeo ruta → módulo de la aplicación (nav, DESIGN §4.3).
 *
 * Estos nombres **no se traducen**: se escriben en el registro de auditoría y
 * se leen de vuelta como valores de filtro. Traducirlos partiría el historial
 * en dos —unas filas «Movimientos», otras «Movements»— y dejaría de poder
 * agruparse. Son datos, como los códigos de enum, no texto de interfaz.
 */
const REGLAS_MODULO: ReglaModulo[] = [
  { prefijo: "/dashboard", modulo: "Dashboard" },
  { prefijo: "/movimientos", modulo: "Movimientos" },
  { prefijo: "/inventario", modulo: "Inventario físico" },
  { prefijo: "/alertas", modulo: "Alertas" },
  { prefijo: "/reportes", modulo: "Reportes" },
  { prefijo: "/historial", modulo: "Historial" },
  { prefijo: "/usuarios", modulo: "Usuarios" },
  { prefijo: "/perfil", modulo: "Usuarios" },
  { prefijo: "/sucursales", modulo: "Sucursales" },
  { prefijo: "/configuracion", modulo: "Configuración" },
  { prefijo: "/ayuda", modulo: "Ayuda" },
  { prefijo: "/galeria", modulo: "Galería" },
  { prefijo: "/almacenes", modulo: "Almacenes" },
  { prefijo: "/zonas", modulo: "Almacenes" },
  { prefijo: "/racks", modulo: "Almacenes" },
  { prefijo: "/secciones", modulo: "Almacenes" },
  { prefijo: "/ubicaciones", modulo: "Ubicaciones" },
  { prefijo: "/cajas", modulo: "Ubicaciones" },
  { prefijo: "/productos", modulo: "Productos" },
  { prefijo: "/lotes", modulo: "Lotes" },
  { prefijo: "/categorias", modulo: "Categorías" },
  { prefijo: "/uoms", modulo: "Unidades de medida" },
  { prefijo: "/proveedores", modulo: "Proveedores" },
  { prefijo: "/clientes", modulo: "Clientes" },
];

/** Mapea una ruta del frontend a su módulo de la aplicación. */
export function moduloDeRuta(ruta: string): string {
  const path = ruta.split("?")[0];
  const coincidencia = REGLAS_MODULO.find((regla) => path.startsWith(regla.prefijo));
  return coincidencia?.modulo ?? "Otros";
}

interface ReglaProceso {
  probar: (path: string) => boolean;
  proceso: string;
}

/** Proceso de negocio (SPEC §18) al que pertenece una ruta, si aplica. */
const REGLAS_PROCESO: ReglaProceso[] = [
  { probar: (p) => p === "/movimientos/nuevo", proceso: "registro de movimiento" },
  { probar: (p) => /^\/movimientos\/[^/]+$/.test(p), proceso: "consulta de movimiento" },
  { probar: (p) => p.endsWith("/aprobar"), proceso: "aprobación de movimiento" },
  { probar: (p) => p.endsWith("/anular"), proceso: "anulación de movimiento" },
  { probar: (p) => p.endsWith("/editar"), proceso: "edición de movimiento" },
  { probar: (p) => p === "/inventario/nuevo", proceso: "planeación de inventario" },
  { probar: (p) => p.includes("/conteos"), proceso: "conteo de inventario" },
  { probar: (p) => p.endsWith("/cerrar"), proceso: "cierre de inventario" },
  { probar: (p) => p.startsWith("/inventario"), proceso: "sesión de inventario" },
  { probar: (p) => p.startsWith("/reportes"), proceso: "análisis y reportes" },
  { probar: (p) => p.startsWith("/historial"), proceso: "análisis de actividad" },
];

export function procesoDeRuta(ruta: string): string | undefined {
  const path = ruta.split("?")[0];
  return REGLAS_PROCESO.find((regla) => regla.probar(path))?.proceso;
}

/** Info del cliente (navegador, plataforma, pantalla) para los metadatos. */
function infoCliente(): Record<string, unknown> {
  const nav = typeof navigator !== "undefined" ? navigator : undefined;
  const userAgentData = (
    nav as unknown as
      | {
          userAgentData?: { platform?: string };
        }
      | undefined
  )?.userAgentData;
  return {
    navegador: nav?.userAgent,
    plataforma: nav?.platform ?? userAgentData?.platform ?? undefined,
    idioma: nav?.language,
    pantalla:
      typeof window !== "undefined" ? `${window.screen.width}x${window.screen.height}` : undefined,
  };
}

/** Hora local (0-23) y día de la semana local (1=lunes ... 7=domingo). */
function tiempoLocal(): { hora: number; dia: number } {
  const ahora = new Date();
  return {
    hora: ahora.getHours(),
    dia: ((ahora.getDay() + 6) % 7) + 1,
  };
}

function construirVista(ruta: string, duracionMs: number | undefined): RegistrarVista {
  const [pathname, busqueda] = ruta.split("?");
  const proceso = procesoDeRuta(ruta);
  return {
    ruta,
    modulo: moduloDeRuta(ruta),
    ...(proceso ? { proceso } : {}),
    ...(duracionMs !== undefined ? { duracion_vista_ms: duracionMs } : {}),
    ...tiempoLocal(),
    metadatos: {
      pathname,
      ...(busqueda ? { busqueda: `?${busqueda}` } : {}),
      ...(document.referrer ? { referer: document.referrer } : {}),
    },
    cliente_info: infoCliente(),
  };
}

/** Envía el evento por beacon (fiable en beforeunload/pagehide). */
function enviarPorBeacon(vista: RegistrarVista): void {
  try {
    if (typeof navigator !== "undefined" && navigator.sendBeacon) {
      const blob = new Blob([JSON.stringify({ vista })], {
        type: "text/plain;charset=UTF-8",
      });
      navigator.sendBeacon(`${API_BASE}/registrar_vista`, blob);
    }
  } catch {
    // El beacon es best-effort; nunca rompe la navegación.
  }
}

/**
 * Rastrea cada visita de página: al cambiar de ruta registra la vista que
 * termina (con su duración) y, al desmontar o cerrar la pestaña, vacía la
 * vista actual por beacon. Solo actúa con sesión activa (el shell ya exige
 * login, pero el hook se monta antes de que se resuelva la sesión).
 */
export function useTrackVista(): void {
  const location = useLocation();
  const usuario = useSession((s) => s.usuario);
  const actual = useRef<{ ruta: string; inicio: number } | null>(null);
  const usuarioRef = useRef(usuario);
  usuarioRef.current = usuario;

  // Flush de la vista en curso al cerrar la pestaña / desmontar.
  useEffect(() => {
    const flush = () => {
      const cur = actual.current;
      if (!cur || !usuarioRef.current) return;
      const vista = construirVista(cur.ruta, Date.now() - cur.inicio);
      enviarPorBeacon(vista);
      actual.current = null;
    };
    window.addEventListener("beforeunload", flush);
    window.addEventListener("pagehide", flush);
    return () => {
      window.removeEventListener("beforeunload", flush);
      window.removeEventListener("pagehide", flush);
      // Desmontaje: registra la vista actual si quedó abierta.
      flush();
    };
  }, []);

  // Cambio de ruta: registra la vista anterior con su duración y arranca la nueva.
  useEffect(() => {
    const ruta = location.pathname + location.search;
    const prev = actual.current;
    actual.current = { ruta, inicio: Date.now() };
    if (!usuarioRef.current) return;
    if (prev && prev.ruta !== ruta) {
      void registrarVista(construirVista(prev.ruta, Date.now() - prev.inicio)).catch(
        () => undefined,
      );
    }
  }, [location.pathname, location.search]);
}
