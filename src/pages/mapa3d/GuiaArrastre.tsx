import { Html, Line } from "@react-three/drei";
import { resolverColorCss, type NodoMapa } from "../mapa-almacen-datos";
import { alturaNodoCm, baseNodoCm } from "../mapa/alturas";
import {
  posicionLibreCercana,
  type Guia,
  type IndiceEspacial,
  type Resultado,
} from "../mapa/motor";
import { M_POR_UNIDAD } from "../mapa/unidades";
import { UMBRAL_CLIC_PX } from "./constantes";
import type { PosicionXY } from "./tipos";

/** Ayudas visuales durante un arrastre: HUD con coordenadas y motivo del
 * semáforo, guías de alineación y marco verde con la posición válida más
 * cercana si el nodo arrastrado queda bloqueado (mismo motor que el 2D). */
export function GuiaArrastre({
  nodo,
  pos,
  movidoPx,
  resultado,
  guias,
  indice,
  ignorar,
}: {
  nodo: NodoMapa;
  pos: PosicionXY;
  movidoPx: number;
  resultado: Resultado | undefined;
  guias: Guia[];
  indice: IndiceEspacial;
  ignorar: ReadonlySet<string>;
}) {
  const sugerencia =
    resultado?.estado === "bloqueado"
      ? posicionLibreCercana(
          indice,
          {
            id: nodo.id,
            tipo: nodo.tipo,
            ancho: nodo.ancho,
            profundo: nodo.profundidad,
            zonaId: nodo.zona_id,
          },
          { x: pos.x, y: pos.y },
          { ignorar },
        )
      : null;
  const cima = (baseNodoCm(nodo) + alturaNodoCm(nodo)) * M_POR_UNIDAD;
  const colorGuia = resolverColorCss("--color-blue-500");

  return (
    <>
      {movidoPx >= UMBRAL_CLIC_PX ? (
        <Html
          position={[
            (pos.x + nodo.ancho / 2) * M_POR_UNIDAD,
            cima + 0.3,
            (pos.y + nodo.profundidad / 2) * M_POR_UNIDAD,
          ]}
          center
        >
          <div
            className={`mapa-almacen-3d__hud mapa-almacen-3d__hud--${resultado?.estado ?? "libre"}`}
          >
            {Math.round(pos.x)} · {Math.round(pos.y)}
            {resultado?.motivo ? <span>{resultado.motivo}</span> : null}
          </div>
        </Html>
      ) : null}
      {guias.map((g, i) => (
        <Line
          key={i}
          points={
            g.eje === "x"
              ? [
                  [g.valor * M_POR_UNIDAD, 0.14, g.desde * M_POR_UNIDAD],
                  [g.valor * M_POR_UNIDAD, 0.14, g.hasta * M_POR_UNIDAD],
                ]
              : [
                  [g.desde * M_POR_UNIDAD, 0.14, g.valor * M_POR_UNIDAD],
                  [g.hasta * M_POR_UNIDAD, 0.14, g.valor * M_POR_UNIDAD],
                ]
          }
          color={colorGuia}
          lineWidth={1}
        />
      ))}
      {sugerencia ? (
        <mesh
          position={[
            (sugerencia.x + nodo.ancho / 2) * M_POR_UNIDAD,
            0.13,
            (sugerencia.y + nodo.profundidad / 2) * M_POR_UNIDAD,
          ]}
        >
          <boxGeometry args={[nodo.ancho * M_POR_UNIDAD, 0.01, nodo.profundidad * M_POR_UNIDAD]} />
          <meshBasicMaterial
            color={resolverColorCss("--color-success-500")}
            transparent
            opacity={0.55}
          />
        </mesh>
      ) : null}
    </>
  );
}
