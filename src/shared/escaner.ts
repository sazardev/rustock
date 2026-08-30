import { traducir } from "./i18n";
/**
 * Lectura de códigos por cámara (SPEC §14.3, DESIGN §12).
 *
 * Dos decodificadores, un solo comportamiento:
 *
 *  1. `BarcodeDetector`, el decodificador nativo del navegador. Está en
 *     Chromium y en el WebView de Android — que es exactamente el terminal
 *     que se usa en el piso del almacén — y no cuesta ni un byte de descarga.
 *  2. `zxing-wasm` como respaldo, cargado **solo** cuando el nativo no existe
 *     (Firefox, Safari/iOS). Quien no lo necesita no lo descarga.
 *
 * El `.wasm` se sirve desde el propio bundle, nunca desde un CDN: Rustock es
 * self-hosted y tiene que funcionar en una red sin salida a internet.
 */

/** Formatos que interesan en almacén: producto comercial, etiqueta interna y QR. */
const FORMATOS = [
  "qr_code",
  "code_128",
  "code_39",
  "ean_13",
  "ean_8",
  "upc_a",
  "upc_e",
  "itf",
  "data_matrix",
] as const;

export interface CodigoLeido {
  /** Texto decodificado. */
  valor: string;
  /** Simbología, normalizada a mayúsculas con guion bajo (`EAN_13`). */
  formato: string;
}

/** `BarcodeDetector` no está en las librerías de TS; se declara lo que se usa. */
interface DetectorNativo {
  detect: (fuente: CanvasImageSource) => Promise<{ rawValue: string; format: string }[]>;
}
interface ConstructorDetector {
  new (opciones: { formats: string[] }): DetectorNativo;
  getSupportedFormats: () => Promise<string[]>;
}

function detectorNativo(): ConstructorDetector | null {
  const g = globalThis as unknown as { BarcodeDetector?: ConstructorDetector };
  return g.BarcodeDetector ?? null;
}

/** ¿Puede este navegador abrir la cámara? (No dice si hay uno conectado.) */
export function soportaCamara(): boolean {
  return (
    typeof navigator !== "undefined" &&
    typeof navigator.mediaDevices?.getUserMedia === "function" &&
    typeof window !== "undefined" &&
    typeof window.isSecureContext === "boolean" &&
    window.isSecureContext
  );
}

export type MotorEscaner = "nativo" | "wasm";

/** Decodifica un fotograma. Devuelve el primer código legible, o `null`. */
export interface Decodificador {
  motor: MotorEscaner;
  leer: (lienzo: HTMLCanvasElement) => Promise<CodigoLeido | null>;
}

/**
 * Prepara el decodificador disponible. Intenta el nativo; si no está, carga
 * `zxing-wasm` bajo demanda. Lanza si ninguno de los dos funciona.
 */
export async function crearDecodificador(): Promise<Decodificador> {
  const Nativo = detectorNativo();
  if (Nativo) {
    // `getSupportedFormats` filtra los que este navegador no sabe leer: pedir
    // uno no soportado hace que el constructor lance.
    const soportados = await Nativo.getSupportedFormats().catch(() => [] as string[]);
    const formatos = FORMATOS.filter((f) => soportados.includes(f));
    if (formatos.length > 0) {
      const detector = new Nativo({ formats: formatos });
      return {
        motor: "nativo",
        async leer(lienzo) {
          const encontrados = await detector.detect(lienzo);
          const primero = encontrados[0];
          return primero
            ? { valor: primero.rawValue, formato: primero.format.toUpperCase() }
            : null;
        },
      };
    }
  }

  // Respaldo: solo aquí se paga la descarga del WASM.
  const [{ readBarcodes, prepareZXingModule }, { default: urlWasm }] = await Promise.all([
    import("zxing-wasm/reader"),
    import("zxing-wasm/reader/zxing_reader.wasm?url"),
  ]);
  prepareZXingModule({ overrides: { locateFile: () => urlWasm } });

  return {
    motor: "wasm",
    async leer(lienzo) {
      const contexto = lienzo.getContext("2d", { willReadFrequently: true });
      if (!contexto) return null;
      const imagen = contexto.getImageData(0, 0, lienzo.width, lienzo.height);
      const encontrados = await readBarcodes(imagen, {
        tryHarder: false,
        formats: [
          "QRCode",
          "Code128",
          "Code39",
          "EAN-13",
          "EAN-8",
          "UPC-A",
          "UPC-E",
          "ITF",
          "DataMatrix",
        ],
        maxNumberOfSymbols: 1,
      });
      const primero = encontrados[0];
      return primero?.text
        ? { valor: primero.text, formato: primero.format.replaceAll("-", "_").toUpperCase() }
        : null;
    },
  };
}

/** Abre la cámara trasera. El llamador es responsable de cerrar el stream. */
export async function abrirCamara(): Promise<MediaStream> {
  return navigator.mediaDevices.getUserMedia({
    video: {
      // En un teléfono la cámara útil es la trasera: es la que apunta a la caja.
      facingMode: { ideal: "environment" },
      width: { ideal: 1280 },
      height: { ideal: 720 },
    },
    audio: false,
  });
}

export function cerrarCamara(stream: MediaStream | null): void {
  for (const pista of stream?.getTracks() ?? []) {
    pista.stop();
  }
}

/** Traduce el fallo de `getUserMedia` a algo que una persona pueda accionar. */
export function mensajeCamara(error: unknown): string {
  const nombre = (error as { name?: string } | null)?.name ?? "";
  switch (nombre) {
    case "NotAllowedError":
    case "SecurityError":
      return traducir().ui.camara.denegada;
    case "NotFoundError":
    case "OverconstrainedError":
      return traducir().ui.camara.inexistente;
    case "NotReadableError":
      return traducir().ui.camara.ocupada;
    default:
      return traducir().ui.camara.generico;
  }
}

/**
 * Confirmación física de una lectura: un pitido corto y una vibración.
 *
 * En el piso del almacén nadie mira la pantalla mientras escanea — se mira la
 * caja. El único acuse de recibo que sirve es el que se oye o se siente, igual
 * que el de un lector de mano. Sin esto, quien escanea vuelve a pasar el
 * código "por si acaso" y genera lecturas duplicadas.
 */
export function confirmarLectura(exito: boolean): void {
  // Vibración: la reconoce al instante quien tiene el teléfono en la mano.
  try {
    navigator.vibrate?.(exito ? 40 : [30, 60, 30]);
  } catch {
    // Sin soporte: el pitido basta.
  }

  // Pitido sintetizado: no se descarga ningún audio y funciona sin conexión.
  try {
    const Contexto =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Contexto) return;
    const contexto = new Contexto();
    const oscilador = contexto.createOscillator();
    const volumen = contexto.createGain();
    oscilador.type = "square";
    // Agudo para el acierto, grave para el fallo: se distinguen sin mirar.
    oscilador.frequency.value = exito ? 1760 : 320;
    volumen.gain.value = 0.04;
    oscilador.connect(volumen).connect(contexto.destination);
    oscilador.start();
    oscilador.stop(contexto.currentTime + (exito ? 0.06 : 0.16));
    // El contexto se cierra al terminar: dejar uno abierto por lectura agotaría
    // el límite del navegador en una jornada de escaneo.
    oscilador.addEventListener("ended", () => void contexto.close(), { once: true });
  } catch {
    // El audio puede estar bloqueado hasta la primera interacción del usuario;
    // no es motivo para interrumpir el escaneo.
  }
}
