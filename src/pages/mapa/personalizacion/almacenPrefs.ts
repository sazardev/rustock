/** Persistencia de las preferencias del mapa en localStorage ("rustock.mapa3d").
 * Formato: un objeto JSON plano. Lo leido se valida clave a clave (un valor
 * invalido o ausente vuelve al defecto), asi las preferencias guardadas por
 * versiones anteriores siguen funcionando. */
import {
  DISTANCIA_ETIQUETA_MAX_M,
  DISTANCIA_ETIQUETA_MIN_M,
  MODOS_COLOR,
  NIVELES_CALIDAD,
  PREFS_DEFECTO,
  TAMANOS_REJILLA_M,
  UNIDADES_LONGITUD,
  type PrefsMapa,
} from "./tiposPrefs";

export const CLAVE_PREFS_MAPA = "rustock.mapa3d";
/** Evento de la pestana actual (`storage` solo avisa a OTRAS pestanas). */
export const EVENTO_PREFS_MAPA = "rustock:mapa-prefs";

function enLista<T>(valor: unknown, lista: readonly T[], defecto: T): T {
  return lista.includes(valor as T) ? (valor as T) : defecto;
}

function booleano(valor: unknown, defecto: boolean): boolean {
  return typeof valor === "boolean" ? valor : defecto;
}

function numeroEn(valor: unknown, min: number, max: number, defecto: number): number {
  return typeof valor === "number" && Number.isFinite(valor)
    ? Math.min(max, Math.max(min, valor))
    : defecto;
}

/** Valida un objeto cualquiera y lo completa con los defectos. */
export function normalizarPrefs(crudo: unknown): PrefsMapa {
  const r = (typeof crudo === "object" && crudo !== null ? crudo : {}) as Record<string, unknown>;
  const d = PREFS_DEFECTO;
  return {
    etiquetas: booleano(r.etiquetas, d.etiquetas),
    etiquetaCodigo: booleano(r.etiquetaCodigo, d.etiquetaCodigo),
    etiquetaOcupacion: booleano(r.etiquetaOcupacion, d.etiquetaOcupacion),
    etiquetaSku: booleano(r.etiquetaSku, d.etiquetaSku),
    etiquetaDimensiones: booleano(r.etiquetaDimensiones, d.etiquetaDimensiones),
    etiquetaDistanciaM: numeroEn(
      r.etiquetaDistanciaM,
      DISTANCIA_ETIQUETA_MIN_M,
      DISTANCIA_ETIQUETA_MAX_M,
      d.etiquetaDistanciaM,
    ),
    autoRotar: booleano(r.autoRotar, d.autoRotar),
    sombras: booleano(r.sombras, d.sombras),
    stock: booleano(r.stock, d.stock),
    sensibilidadMirada: numeroEn(r.sensibilidadMirada, 0.2, 3, d.sensibilidadMirada),
    unidad: enLista(r.unidad, UNIDADES_LONGITUD, d.unidad),
    colorModo: enLista(r.colorModo, MODOS_COLOR, d.colorModo),
    rejilla: booleano(r.rejilla, d.rejilla),
    rejillaM: enLista(r.rejillaM, TAMANOS_REJILLA_M, d.rejillaM),
    calidad: enLista(r.calidad, NIVELES_CALIDAD, d.calidad),
  };
}

function leerCrudo(): string | null {
  try {
    return window.localStorage.getItem(CLAVE_PREFS_MAPA);
  } catch {
    return null;
  }
}

let cacheCrudo: string | null | undefined;
let cachePrefs: PrefsMapa = PREFS_DEFECTO;

/** Preferencias actuales. Devuelve el MISMO objeto mientras el texto guardado
 * no cambie (requisito de `useSyncExternalStore`). */
export function leerPrefsMapa(): PrefsMapa {
  if (typeof window === "undefined") {
    return PREFS_DEFECTO;
  }
  const crudo = leerCrudo();
  if (crudo !== cacheCrudo) {
    cacheCrudo = crudo;
    try {
      cachePrefs = crudo ? normalizarPrefs(JSON.parse(crudo)) : PREFS_DEFECTO;
    } catch {
      cachePrefs = PREFS_DEFECTO;
    }
  }
  return cachePrefs;
}

/** Fusiona el cambio parcial con lo guardado y avisa a los suscriptores. */
export function guardarPrefsMapa(parcial: Partial<PrefsMapa>): void {
  const siguiente = normalizarPrefs({ ...leerPrefsMapa(), ...parcial });
  try {
    window.localStorage.setItem(CLAVE_PREFS_MAPA, JSON.stringify(siguiente));
  } catch {
    // Con localStorage lleno/bloqueado: la preferencia vive solo en la sesion.
    cacheCrudo = leerCrudo();
    cachePrefs = siguiente;
  }
  window.dispatchEvent(new Event(EVENTO_PREFS_MAPA));
}

export function suscribirPrefsMapa(avisar: () => void): () => void {
  const alCambiar = (e: Event) => {
    if (e.type === EVENTO_PREFS_MAPA || (e as StorageEvent).key === CLAVE_PREFS_MAPA) {
      avisar();
    }
  };
  window.addEventListener(EVENTO_PREFS_MAPA, alCambiar);
  window.addEventListener("storage", alCambiar);
  return () => {
    window.removeEventListener(EVENTO_PREFS_MAPA, alCambiar);
    window.removeEventListener("storage", alCambiar);
  };
}
