import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { BufferAttribute, Color, SphereGeometry, type Mesh } from "three";
import { RADIO_CIELO_M } from "./constantesCaminata";

/** Cupula del cielo: esfera interior con color por vertice (horizonte abajo,
 * cenit arriba; sin CSS ni texturas). Sigue a la camara, asi nunca se alcanza. */
export function CupulaCielo({ horizonte, cenit }: { horizonte: Color; cenit: Color }) {
  const malla = useRef<Mesh>(null);
  const geometria = useMemo(() => {
    const g = new SphereGeometry(RADIO_CIELO_M, 24, 14);
    const pos = g.getAttribute("position");
    const colores = new Float32Array(pos.count * 3);
    const c = new Color();
    for (let i = 0; i < pos.count; i++) {
      const t = Math.max(0, pos.getY(i) / RADIO_CIELO_M) ** 0.6;
      c.copy(horizonte)
        .lerp(cenit, t)
        .toArray(colores, i * 3);
    }
    g.setAttribute("color", new BufferAttribute(colores, 3));
    return g;
  }, [horizonte, cenit]);

  useFrame(({ camera }) => {
    malla.current?.position.copy(camera.position);
  });

  return (
    <mesh ref={malla} geometry={geometria} renderOrder={-10} frustumCulled={false}>
      <meshBasicMaterial vertexColors side={1} depthWrite={false} fog={false} />
    </mesh>
  );
}
