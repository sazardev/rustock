import { useLayoutEffect, useMemo, useRef } from "react";
import { useThree } from "@react-three/fiber";
import {
  BufferGeometry,
  Euler,
  Float32BufferAttribute,
  Matrix4,
  Quaternion,
  Shape,
  ShapeGeometry,
  Vector3,
  type InstancedMesh,
} from "three";
import { resolverColorCss, type NodoMapa } from "../../mapa-almacen-datos";
import type { PosicionXY } from "../tipos";
import { flechasDePasillo, segmentosCota } from "./geometriaPasillo";

/** Flecha unitaria (largo 1 en +X, ancho 1) tendida sobre el piso (plano XZ). */
function crearGeometriaFlecha(): ShapeGeometry {
  const s = new Shape();
  s.moveTo(-0.5, -0.18);
  s.lineTo(0.1, -0.18);
  s.lineTo(0.1, -0.5);
  s.lineTo(0.5, 0);
  s.lineTo(0.1, 0.5);
  s.lineTo(0.1, 0.18);
  s.lineTo(-0.5, 0.18);
  s.closePath();
  const g = new ShapeGeometry(s);
  g.rotateX(-Math.PI / 2);
  return g;
}

/** Flechas de sentido (un InstancedMesh) y cotas de ancho (un lineSegments)
 * de todos los pasillos: dos draw calls en total. */
export function MarcasPasillo({
  pasillos,
  posicionDe,
}: {
  pasillos: NodoMapa[];
  posicionDe: (id: string) => PosicionXY;
}) {
  const invalidate = useThree((s) => s.invalidate);
  const ref = useRef<InstancedMesh>(null);
  const flechaGeo = useMemo(crearGeometriaFlecha, []);
  const flechas = pasillos.flatMap((n) => flechasDePasillo(n, posicionDe(n.id)));
  const segmentos = pasillos.flatMap((n) => segmentosCota(n, posicionDe(n.id)));
  const cotaGeo = useMemo(() => new BufferGeometry(), []);

  useLayoutEffect(() => {
    const malla = ref.current;
    if (!malla) {
      return;
    }
    const m = new Matrix4();
    const q = new Quaternion();
    const p = new Vector3();
    const e = new Euler();
    const s = new Vector3();
    flechas.forEach((f, i) => {
      q.setFromEuler(e.set(0, f.giro, 0));
      malla.setMatrixAt(i, m.compose(p.set(f.x, f.y, f.z), q, s.set(f.largo, 1, f.ancho)));
    });
    // La cota se actualiza en sitio (mismo buffer) mientras el numero de
    // segmentos no cambia.
    const atributo = cotaGeo.getAttribute("position");
    if (atributo && atributo.array.length === segmentos.length) {
      (atributo.array as Float32Array).set(segmentos);
      atributo.needsUpdate = true;
    } else {
      cotaGeo.setAttribute("position", new Float32BufferAttribute(segmentos, 3));
    }
    malla.count = flechas.length;
    malla.instanceMatrix.needsUpdate = true;
    malla.computeBoundingSphere();
    invalidate();
  });

  if (flechas.length === 0) {
    return null;
  }
  return (
    <>
      <instancedMesh
        key={flechas.length}
        ref={ref}
        args={[flechaGeo, undefined, flechas.length]}
        raycast={() => null}
        frustumCulled={false}
      >
        <meshBasicMaterial
          color={resolverColorCss("--color-warning-600")}
          polygonOffset
          polygonOffsetFactor={-2}
          polygonOffsetUnits={-2}
        />
      </instancedMesh>
      <lineSegments geometry={cotaGeo} raycast={() => null} frustumCulled={false}>
        <lineBasicMaterial color={resolverColorCss("--color-gray-800")} />
      </lineSegments>
    </>
  );
}
