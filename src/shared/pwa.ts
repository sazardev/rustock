/**
 * Capa PWA de Rustock (DESIGN §8.3, STACK §8).
 *
 * Tres señales de plataforma que la interfaz necesita mostrar sin bloquear a
 * nadie: si hay conexión, si hay una versión nueva esperando y si la app se
 * puede instalar en el dispositivo. Ninguna de ellas abre un diálogo: se
 * anuncian en la franja de avisos del lienzo y la persona decide cuándo.
 *
 * El service worker solo existe en build de producción fuera de Tauri (la
 * ventana nativa ya trae sus propios artefactos empaquetados).
 */
import { create } from "zustand";
import { isTauri } from "./api";

/** Evento no estándar de instalación (Chromium); tipado local, no hay lib.dom. */
interface EventoInstalacion extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

interface PwaState {
  /** ¿El navegador reporta conexión? */
  enLinea: boolean;
  /** Hay un worker nuevo instalado y en espera de activarse. */
  actualizacionLista: boolean;
  /** El navegador ofreció instalar la aplicación en el dispositivo. */
  instalable: boolean;
  /** La app corre ya como aplicación instalada (standalone). */
  instalada: boolean;
  /** Activa la versión en espera y recarga. */
  aplicarActualizacion: () => void;
  /** Lanza el diálogo nativo de instalación del sistema operativo. */
  instalar: () => Promise<void>;
}

let workerEnEspera: ServiceWorker | null = null;
let promptInstalacion: EventoInstalacion | null = null;

function esStandalone(): boolean {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    window.matchMedia("(display-mode: window-controls-overlay)").matches
  );
}

export const usePwa = create<PwaState>((set) => ({
  enLinea: typeof navigator === "undefined" ? true : navigator.onLine,
  actualizacionLista: false,
  instalable: false,
  instalada: esStandalone(),
  aplicarActualizacion() {
    if (!workerEnEspera) {
      window.location.reload();
      return;
    }
    // El worker en espera se activa y `controllerchange` recarga una sola vez.
    // `ServiceWorker.postMessage` no lleva `targetOrigin` (esa firma es la de
    // `window.postMessage`): la regla del linter no distingue los dos destinos.
    // eslint-disable-next-line unicorn/require-post-message-target-origin
    workerEnEspera.postMessage("SKIP_WAITING");
    set({ actualizacionLista: false });
  },
  async instalar() {
    if (!promptInstalacion) return;
    const evento = promptInstalacion;
    promptInstalacion = null;
    set({ instalable: false });
    await evento.prompt();
    const { outcome } = await evento.userChoice;
    if (outcome === "accepted") {
      set({ instalada: true });
    }
  },
}));

/**
 * Arranca la capa PWA. Idempotente y silenciosa: si algo no está disponible
 * (navegador viejo, Tauri, desarrollo) la app funciona exactamente igual.
 */
export function iniciarPwa(): void {
  if (typeof window === "undefined") return;

  window.addEventListener("online", () => usePwa.setState({ enLinea: true }));
  window.addEventListener("offline", () => usePwa.setState({ enLinea: false }));

  window.addEventListener("beforeinstallprompt", (evento) => {
    // Se pospone el diálogo nativo: la invitación a instalar vive en
    // Configuración, no interrumpiendo la operación (DESIGN §5.1).
    evento.preventDefault();
    promptInstalacion = evento as EventoInstalacion;
    usePwa.setState({ instalable: true });
  });

  window.addEventListener("appinstalled", () => {
    promptInstalacion = null;
    usePwa.setState({ instalable: false, instalada: true });
  });

  if (import.meta.env.DEV || isTauri() || !("serviceWorker" in navigator)) {
    return;
  }

  let recargando = false;
  navigator.serviceWorker.addEventListener("controllerchange", () => {
    if (recargando) return;
    recargando = true;
    window.location.reload();
  });

  void navigator.serviceWorker
    .register("/sw.js", { scope: "/" })
    .then((registro) => {
      function revisar(worker: ServiceWorker | null) {
        if (!worker) return;
        // Solo es "actualización" si ya había un controlador: la primera
        // instalación no tiene nada que anunciar.
        if (worker.state === "installed" && navigator.serviceWorker.controller) {
          workerEnEspera = worker;
          usePwa.setState({ actualizacionLista: true });
        }
      }
      revisar(registro.waiting);
      registro.addEventListener("updatefound", () => {
        const nuevo = registro.installing;
        nuevo?.addEventListener("statechange", () => revisar(nuevo));
      });
    })
    .catch(() => {
      // Sin worker la app sigue siendo completamente funcional en línea.
    });
}
