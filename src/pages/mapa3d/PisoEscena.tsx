import { useMemo, useRef } from "react";
import { resolverColorCss, type NodoMapa } from "../mapa-almacen-datos";
import { M_POR_UNIDAD } from "../mapa/unidades";
import { UMBRAL_CLIC_PX } from "./constantes";

const ROTACION_PISO: [number, number, number] = [-Math.PI / 2, 0, 0];

/** Largo del piso/rejilla (m): crece con el layout, en tramos de 4 m. */
function useLargoPiso(nodos: NodoMapa[]): number {
  return useMemo(() => {
    let maxExt = 12;
    for (const n of nodos) {
      if (n.pos_x === null || n.pos_y === null) {
        continue;
      }
      maxExt = Math.max(
        maxExt,
        (n.pos_x + n.ancho) * M_POR_UNIDAD,
        (n.pos_y + n.profundidad) * M_POR_UNIDAD,
      );
    }
    return Math.max(16, Math.ceil((maxExt + 4) / 4) * 4);
  }, [nodos]);
}

/** Piso y rejilla adaptativos. Un clic sin arrastre sobre el piso deselecciona
 * (el drag orbita, como siempre). */
export function PisoEscena({
  nodos,
  mostrarGrilla,
  celdaGrillaM,
  onSeleccionar,
}: {
  nodos: NodoMapa[];
  mostrarGrilla: boolean;
  /** Lado (m) de la celda de la rejilla. */
  celdaGrillaM: number;
  onSeleccionar: (id: string | null) => void;
}) {
  const largoPiso = useLargoPiso(nodos);
  // El piso se extiende 2 m antes del origen para dejar margen al layout.
  const centroPiso = largoPiso / 2 - 2;
  const pisoDown = useRef<{ x: number; y: number } | null>(null);
  const posicion: [number, number, number] = [centroPiso, -0.005, centroPiso];

  return (
    <>
      <mesh
        rotation={ROTACION_PISO}
        receiveShadow
        position={posicion}
        onPointerDown={(e) => {
          pisoDown.current = { x: e.nativeEvent.clientX, y: e.nativeEvent.clientY };
        }}
        onPointerUp={(e) => {
          const p = pisoDown.current;
          pisoDown.current = null;
          if (!p) {
            return;
          }
          if (
            Math.hypot(e.nativeEvent.clientX - p.x, e.nativeEvent.clientY - p.y) < UMBRAL_CLIC_PX
          ) {
            onSeleccionar(null);
          }
        }}
      >
        <planeGeometry args={[largoPiso, largoPiso]} />
        <meshStandardMaterial color={resolverColorCss("--color-gray-200")} />
      </mesh>
      {mostrarGrilla ? (
        <gridHelper
          args={[
            largoPiso,
            Math.round(largoPiso / celdaGrillaM),
            resolverColorCss("--color-gray-300"),
            resolverColorCss("--color-gray-200"),
          ]}
          position={[centroPiso, 0.0005, centroPiso]}
        />
      ) : null}
    </>
  );
}
