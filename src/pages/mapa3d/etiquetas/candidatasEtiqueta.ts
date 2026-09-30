/** Candidatas a etiqueta de la escena: el anclaje y el texto de cada nodo. */
import type { NodoMapa, ResumenNodo } from "../../mapa-almacen-datos";
import { alturaNodoCm, baseNodoCm } from "../../mapa/alturas";
import { formatearLongitud, M_POR_UNIDAD, type UnidadLongitud } from "../../mapa/unidades";
import type { PosicionXY } from "../tipos";
import { tamRealDe } from "../utils";
import type { EtiquetaCandidata } from "./EtiquetaLOD";

/** Que datos lleva la etiqueta (preferencias `etiqueta*`). */
export interface CamposEtiqueta {
  codigo: boolean;
  ocupacion: boolean;
  sku: boolean;
  dimensiones: boolean;
}

/** "240 x 100 x 180 cm": la unidad se escribe una sola vez, al final. */
function medidas(cm: readonly number[], unidad: UnidadLongitud): string {
  const partes = cm.map((v) => formatearLongitud(v, unidad));
  const sufijo = partes[0].slice(partes[0].lastIndexOf(" "));
  return partes.map((p, i) => (i < partes.length - 1 ? p.replace(sufijo, "") : p)).join(" × ");
}

export function candidatasEtiqueta(
  nodos: NodoMapa[],
  posicionDe: (id: string) => PosicionXY,
  resumenPorNodo: Map<string, ResumenNodo>,
  forzados: ReadonlySet<string>,
  unidad: UnidadLongitud,
  campos: CamposEtiqueta,
): EtiquetaCandidata[] {
  if (!campos.codigo && !campos.ocupacion && !campos.sku && !campos.dimensiones) {
    return [];
  }
  return nodos.map((n) => {
    const pos = posicionDe(n.id);
    const tam = tamRealDe(n);
    const cima = (baseNodoCm(n) + alturaNodoCm(n)) * M_POR_UNIDAD;
    const resumen = resumenPorNodo.get(n.id);
    const detalle: string[] = [];
    if (campos.dimensiones) {
      detalle.push(
        n.tipo === "pasillo"
          ? formatearLongitud(Math.min(tam.ancho, tam.profundo), unidad)
          : medidas([tam.ancho, tam.profundo, alturaNodoCm(n)], unidad),
      );
    }
    if (campos.ocupacion && n.ocupacion !== null) {
      detalle.push(`${Math.round(n.ocupacion * 100)}%`);
    }
    if (campos.sku && resumen && resumen.productosDistintos > 0) {
      detalle.push(`${resumen.productosDistintos} SKU`);
    }
    return {
      id: n.id,
      texto: campos.codigo ? n.codigo : "",
      detalle: detalle.join(" · "),
      // Zonas: esquina de entrada (no estorba el contenido); el resto, centro.
      x: (pos.x + (n.tipo === "zona" ? 60 : tam.ancho / 2)) * M_POR_UNIDAD,
      y: cima + 0.12,
      z: (pos.y + (n.tipo === "zona" ? 40 : tam.profundo / 2)) * M_POR_UNIDAD,
      forzada: forzados.has(n.id),
    };
  });
}
