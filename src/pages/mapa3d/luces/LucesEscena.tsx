import { useEffect, useRef } from "react";
import type { DirectionalLight } from "three";
import { resolverColorCss } from "../../mapa-almacen-datos";

/** Luz hemisferica (cielo/suelo) + direccional con sombra suave: un solo mapa
 * de sombras (lado segun la calidad) cuyo frustum ortografico cubre el almacen. */
export function LucesEscena({
  sombras,
  centro,
  radio,
  mapaSombras,
}: {
  sombras: boolean;
  /** Centro del almacen en el plano (metros) y radio que lo abarca. */
  centro: [number, number];
  radio: number;
  /** Lado (px) del mapa de sombras. */
  mapaSombras: number;
}) {
  const luz = useRef<DirectionalLight>(null);
  useEffect(() => {
    const l = luz.current;
    if (l) {
      l.target.position.set(centro[0], 0, centro[1]);
      l.target.updateMatrixWorld();
    }
  }, [centro]);

  return (
    <>
      <hemisphereLight
        args={[resolverColorCss("--color-white"), resolverColorCss("--color-gray-400"), 0.9]}
      />
      <directionalLight
        ref={luz}
        position={[centro[0] + radio * 0.7, radio * 1.3, centro[1] + radio * 0.5]}
        intensity={1.5}
        castShadow={sombras}
        shadow-mapSize={[mapaSombras, mapaSombras]}
        shadow-camera-left={-radio}
        shadow-camera-right={radio}
        shadow-camera-top={radio}
        shadow-camera-bottom={-radio}
        shadow-camera-near={0.5}
        shadow-camera-far={radio * 5}
        shadow-bias={-0.0004}
        shadow-normalBias={0.03}
        shadow-radius={4}
      />
    </>
  );
}
