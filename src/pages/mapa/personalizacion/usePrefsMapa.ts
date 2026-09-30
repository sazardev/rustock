/**
 * Preferencias compartidas del mapa (2D y 3D).
 *
 * API
 *   const { prefs, cambiarPref } = usePrefsMapa();
 *     prefs        PrefsMapa validada y completa (nunca parcial). Mismo objeto
 *                  entre renders mientras nada cambie.
 *     cambiarPref  (parcial: Partial<PrefsMapa>) => void. Fusiona, persiste y
 *                  avisa a todos los componentes y pestanas.
 *   leerPrefsMapa()     lectura puntual fuera de React (handlers, utilidades).
 *   guardarPrefsMapa()  escritura fuera de React.
 *   PERFILES_CALIDAD[prefs.calidad]  dpr, sombras y distancias LOD del nivel.
 *
 * Almacenamiento: localStorage "rustock.mapa3d", un objeto JSON plano. Cada
 * clave se valida al leer, asi que prefs antiguas (sin las claves nuevas) o
 * corruptas caen a los defectos sin romper nada. `leerUnidadMapa()` de
 * `unidades.ts` sigue leyendo la clave `unidad` de este mismo objeto.
 *
 * Sincronizacion: el hook se suscribe al evento `storage` (otras pestanas) y a
 * un evento propio (misma pestana), de modo que 2D y 3D ven el cambio al
 * instante. Claves: ver `PrefsMapa` en `tiposPrefs.ts`.
 */
import { useCallback, useSyncExternalStore } from "react";
import { guardarPrefsMapa, leerPrefsMapa, suscribirPrefsMapa } from "./almacenPrefs";
import { PREFS_DEFECTO, type PrefsMapa } from "./tiposPrefs";

const prefsServidor = () => PREFS_DEFECTO;

export function usePrefsMapa() {
  const prefs = useSyncExternalStore(suscribirPrefsMapa, leerPrefsMapa, prefsServidor);
  const cambiarPref = useCallback((parcial: Partial<PrefsMapa>) => guardarPrefsMapa(parcial), []);
  return { prefs, cambiarPref };
}
