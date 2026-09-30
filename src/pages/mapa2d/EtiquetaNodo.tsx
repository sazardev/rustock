import { Icon } from "../../shared/ui";
import type { EtiquetaNodo as ModoEtiqueta } from "./capas/capas";
import type { NodoMapa, ResumenNodo } from "./nodo-tipos";
import { ICONO_NODO } from "./trazo";

/** Alto (unidades del plano: el HTML del foreignObject escala con el zoom). */
const ALTO_ARRIBA = 18;

/** Rótulo del nodo dentro de su rectángulo; `modo` decide qué datos muestra
 * (capas). `chip` lo sobrepone con fondo propio cuando hay contenido detrás. */
export function EtiquetaNodo({
  nodo: n,
  resumen,
  modo,
  ancho,
  profundo,
  posicion,
}: {
  nodo: NodoMapa;
  resumen: ResumenNodo | undefined;
  modo: ModoEtiqueta;
  ancho: number;
  profundo: number;
  /** "centro": ocupa el nodo; "chip": pastilla en la esquina (hay dibujo
   * detrás); "arriba": fuera del nodo, sobre su borde superior. */
  posicion: "centro" | "chip" | "arriba";
}) {
  const verOcupacion = (modo === "completa" || modo === "ocupacion") && n.ocupacion !== null;
  const sku = resumen?.productosDistintos ?? 0;
  const verSku = (modo === "completa" || modo === "sku") && sku > 0;
  return (
    <foreignObject
      x={posicion === "arriba" ? 0 : 6}
      y={posicion === "arriba" ? -ALTO_ARRIBA : 4}
      width={Math.max(posicion === "arriba" ? ancho : ancho - 12, 10)}
      height={posicion === "arriba" ? ALTO_ARRIBA : Math.max(profundo - 8, 8)}
      pointerEvents="none"
    >
      <div
        className={`mapa-almacen__etiqueta${posicion === "centro" ? "" : " mapa-almacen__etiqueta--chip"}`}
      >
        <Icon name={ICONO_NODO[n.tipo]} size={12} />
        <span>{n.codigo}</span>
        {verOcupacion && n.ocupacion !== null ? (
          <span className="mapa-almacen__ocupacion">{Math.round(n.ocupacion * 100)}%</span>
        ) : null}
        {verSku ? <span className="mapa-almacen__sku">{sku} SKU</span> : null}
      </div>
    </foreignObject>
  );
}
