import { useCallback, useEffect, useRef, type ReactNode } from "react";
import { useLocation, useSearchParams } from "react-router";
import { useQueryClient } from "@tanstack/react-query";
import { ButtonLink } from "./ui";

/**
 * Creación rápida de catálogos dependientes (DESIGN §5, cero modales).
 *
 * Un formulario que depende de un catálogo (ej. un producto necesita una UOM)
 * ofrece un enlace "+ Nueva X" junto al select. El enlace abre la página de
 * creación DEDICADA (deep-link, sin drawers ni modales) y, al guardar, vuelve
 * al formulario de origen con el registro recién creado ya seleccionado.
 *
 * Mecanismo, todo por URL (nada de estado en memoria):
 *   1. El formulario A enlaza a `/uoms/nuevo?volver=<A>&campo=uom_base_id`.
 *   2. La página de creación, al guardar, navega a `<A>&uom_base_id=<id>`.
 *      Al cancelar, navega a `<A>&regreso=1`.
 *   3. El formulario A, al montar, restaura su borrador (si venía de este
 *      flujo), aplica la selección y refresca el catálogo para que la opción
 *      nueva aparezca en el select.
 *
 * El borrador del formulario A se conserva en sessionStorage (por ruta) y solo
 * se restaura cuando la URL indica un retorno de creación rápida (`volver`,
 * un parámetro de selección o `regreso=1`); una visita limpia lo descarta.
 *
 * El encadenado funciona igual (lote → producto → uom): cada página de
 * creación propaga su propio `volver` en la URL, así que el retorno salta
 * cada nivel sin perder el contexto del nivel anterior.
 */

/** Parámetros que identifican una selección hecha por creación rápida.
 *  Al añadir un formulario nuevo con creación rápida, registrar aquí el nombre
 *  del parámetro de selección para que la restauración de borrador lo detecte. */
const PARAMS_SELECCION = new Set([
  "uom_base_id",
  "uom_venta_id",
  "uom_compra_id",
  "categoria_id",
  "parent_id",
  "producto_id",
  "lote_id",
  "proveedor_id",
  "cliente_id",
  "origen_ubicacion_id",
  "destino_ubicacion_id",
  "ubicacion_id",
  "zona_id",
  "rack_id",
  "seccion_id",
  "almacen_id",
]);

/** Prefijo de las claves de sessionStorage que conservan borradores. */
const PREFIJO_SNAPSHOT = "rustock:formulario:";

/** Solo rutas internas del SPA (evita volver a URLs externas o `//host`). */
const VOLVER_SEGURO = /^\/(?!\/)/;

/** ¿La URL indica que volvimos de una página de creación rápida? */
export function esRetornoDeCreacion(searchParams: URLSearchParams): boolean {
  if (searchParams.has("volver") || searchParams.has("regreso")) return true;
  for (const clave of searchParams.keys()) {
    if (PARAMS_SELECCION.has(clave)) return true;
  }
  return false;
}

/**
 * Botón "+" (solo icono) junto a un select que abre la página de creación
 * dedicada y vuelve con `campo` seleccionado. El texto recibido como hijo se
 * usa como `aria-label`: el select al lado ya comunica el contexto (DESIGN §9.4:
 * sin redundancia visual, un solo icono y texto accesible).
 */
export function CrearRapido({
  campo,
  rutaNueva,
  children,
}: {
  /** Nombre del campo/parámetro con el que volverá seleccionado el registro creado. */
  campo: string;
  /** Ruta de la página de creación dedicada (ej. "/uoms/nuevo"). */
  rutaNueva: string;
  /** Texto descriptivo para accesibilidad (ej. "Nueva UOM"). */
  children: ReactNode;
}) {
  const location = useLocation();
  const params = new URLSearchParams();
  params.set("volver", `${location.pathname}${location.search}`);
  params.set("campo", campo);
  return (
    <ButtonLink
      variant="ghost"
      size="icon"
      icon="agregar"
      href={`${rutaNueva}?${params.toString()}`}
      ariaLabel={String(children)}
    />
  );
}

/**
 * Lee la petición de creación (volver + campo) desde la URL actual.
 * `volver` solo se acepta si es una ruta interna del SPA.
 */
export function usePeticionCreacion(): { volver: string | null; campo: string | null } {
  const [searchParams] = useSearchParams();
  const volverCrudo = searchParams.get("volver");
  const volver = volverCrudo && VOLVER_SEGURO.test(volverCrudo) ? volverCrudo : null;
  return { volver, campo: searchParams.get("campo") };
}

/** URL a la que navegar tras crear: `volver` + selección del nuevo registro. */
export function urlConSeleccion(volver: string, campo: string, id: string): string {
  const [base, ...resto] = volver.split("?");
  const params = new URLSearchParams(resto.length > 0 ? resto.join("?") : "");
  params.set(campo, id);
  const qs = params.toString();
  return qs ? `${base}?${qs}` : base;
}

/**
 * URL a la que navegar al CANCELAR en la página de creación: `volver` marcado
 * como retorno para que el formulario de origen restaure su borrador.
 */
export function urlConRegreso(volver: string): string {
  const [base, ...resto] = volver.split("?");
  const params = new URLSearchParams(resto.length > 0 ? resto.join("?") : "");
  params.set("regreso", "1");
  return `${base}?${params.toString()}`;
}

/**
 * Conserva el borrador de un formulario entre la salida a una página de
 * creación rápida y el retorno (crear o cancelar). El borrador vive en
 * sessionStorage, keyed por `clave` (normalmente `location.pathname`):
 *   - Al montar: si la URL indica retorno de creación rápida, restaura el
 *     borrador; si no, descarta cualquier borrador viejo (visita limpia).
 *   - Al desmontar: guarda el borrador (salvo que se haya llamado `descartar`).
 *   - `descartar()`: impide guardar el borrador (llamar tras guardar con
 *     éxito, para que el historial del navegador no restaure un formulario
 *     ya enviado).
 */
export function usePreservarFormulario(
  clave: string,
  getValores: () => unknown,
  restablecer: (valores: unknown) => void,
  habilitado = true,
): { descartar: () => void } {
  const [searchParams] = useSearchParams();
  // El bucket del borrador es la ruta + el `volver` que dio origen al nivel:
  // en un encadenado de la MISMA ruta (ej. categoría → padre) cada nivel
  // guarda su borrador por separado y no se pisan entre sí. La clave es
  // estable entre la salida y el retorno (el `volver` no cambia al volver).
  const claveNivelRef = useRef(`${clave}|${searchParams.get("volver") ?? ""}`);
  claveNivelRef.current = `${clave}|${searchParams.get("volver") ?? ""}`;
  const getValoresRef = useRef(getValores);
  getValoresRef.current = getValores;
  const restablecerRef = useRef(restablecer);
  restablecerRef.current = restablecer;
  const omitirGuardadoRef = useRef(false);

  const descartar = useCallback(() => {
    omitirGuardadoRef.current = true;
  }, []);

  useEffect(() => {
    omitirGuardadoRef.current = false;
    if (!habilitado) return;
    const storageKey = PREFIJO_SNAPSHOT + claveNivelRef.current;
    if (!esRetornoDeCreacion(searchParams)) {
      sessionStorage.removeItem(storageKey);
      return;
    }
    const crudo = sessionStorage.getItem(storageKey);
    if (crudo) {
      try {
        restablecerRef.current(JSON.parse(crudo));
      } catch {
        // Borrador corrupto: se descarta y el formulario arranca limpio.
      }
    }
    sessionStorage.removeItem(storageKey);
  }, [clave, habilitado, searchParams]);

  useEffect(() => {
    return () => {
      if (!habilitado || omitirGuardadoRef.current) return;
      try {
        sessionStorage.setItem(
          PREFIJO_SNAPSHOT + claveNivelRef.current,
          JSON.stringify(getValoresRef.current()),
        );
      } catch {
        // Valores no serializables o almacenamiento lleno: se ignora.
      }
    };
  }, [clave, habilitado]);

  return { descartar };
}

/**
 * Aplica al montar la selección de un registro creado en el flujo de creación
 * rápida y refresca la query del catálogo para que la opción nueva aparezca
 * en el select del formulario.
 *
 * @param campo      Nombre del parámetro a leer en la URL.
 * @param aplicar    Recibe el id recién creado para fijarlo en el formulario.
 * @param invalidar  QueryKey (prefijo) del catálogo a refrescar; `[]` no refresca.
 * @param habilitado Solo aplica cuando es `true` (evitar en edición).
 */
export function useSeleccionCreada(
  campo: string,
  aplicar: (id: string) => void,
  invalidar: readonly unknown[] = [],
  habilitado = true,
): void {
  const [searchParams] = useSearchParams();
  const queryClient = useQueryClient();
  const aplicarRef = useRef(aplicar);
  aplicarRef.current = aplicar;
  useEffect(() => {
    if (!habilitado) return;
    const id = searchParams.get(campo);
    if (!id) return;
    aplicarRef.current(id);
    if (invalidar.length > 0) {
      void queryClient.invalidateQueries({ queryKey: [...invalidar] });
    }
  }, [campo, habilitado, invalidar, queryClient, searchParams]);
}
