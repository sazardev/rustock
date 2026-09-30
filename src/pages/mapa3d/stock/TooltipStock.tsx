import { Html } from "@react-three/drei";
import { useT } from "../../../shared/i18n";
import { formatearFecha, formatearNumero } from "../../../shared/format";
import type { CeldaStock } from "./construirDisposicion";

const MAX_FILAS_BLOQUE = 4;

/** Tooltip del stock (solo existe con el puntero encima). Sobre una caja:
 * el producto con su cantidad total en la celda, lote y vencimiento; sobre un
 * bloque lejano: los productos de la celda. */
export function TooltipStock({
  celda,
  item,
  posicion,
}: {
  celda: CeldaStock;
  /** Indice del item de la caja, o null para el bloque resumen. */
  item: number | null;
  posicion: [number, number, number];
}) {
  const t = useT();
  const unico = item !== null ? celda.items[item] : null;
  const totalProducto = unico
    ? celda.items
        .filter((i) => i.productoId === unico.productoId)
        .reduce((s, i) => s + i.cantidad, 0)
    : 0;
  return (
    <Html position={posicion} center style={{ pointerEvents: "none" }}>
      <div className="mapa-almacen-3d__hud mapa-almacen-3d__hud--stock">
        <span className="mapa-almacen-3d__hud-celda">{celda.codigo}</span>
        {unico ? (
          <>
            <strong>{unico.sku}</strong>
            <span>{unico.nombre}</span>
            <span>
              {t.mapa3d.stockCantidad}: {formatearNumero(totalProducto)}
            </span>
            {unico.loteCodigo ? (
              <span>
                {t.mapa3d.stockLote}: {unico.loteCodigo}
              </span>
            ) : null}
            {unico.vencimiento ? (
              <span>
                {t.mapa3d.stockVence}: {formatearFecha(unico.vencimiento)}
              </span>
            ) : null}
            {unico.dimensiones.origen !== "medido" ? (
              <span className="mapa-almacen-3d__hud-aviso">{t.mapa3d.stockEstimada}</span>
            ) : null}
          </>
        ) : (
          <>
            {celda.items.slice(0, MAX_FILAS_BLOQUE).map((it, k) => (
              <span key={`${it.productoId}-${k}`}>
                {it.sku}: {formatearNumero(it.cantidad)}
              </span>
            ))}
            {celda.items.length > MAX_FILAS_BLOQUE ? (
              <span>
                +{celda.items.length - MAX_FILAS_BLOQUE} {t.mapa3d.stockMas}
              </span>
            ) : null}
          </>
        )}
      </div>
    </Html>
  );
}
