import { useEffect, useLayoutEffect, useRef, type RefObject } from "react";
import { useThree } from "@react-three/fiber";
import { Color, Matrix4, Quaternion, Vector3, type InstancedMesh } from "three";
import { resolverColorCss } from "../../mapa-almacen-datos";
import type { GrupoCajas } from "./cajas";

/** Esquina minima de un rack en la escena (metros). */
export type Origen = readonly [number, number, number];

const SIN_ROTACION = new Quaternion();

/** Escribe las cajas de un grupo en un `InstancedMesh` desplazadas al origen
 * de su rack. Tras la primera escritura solo reescribe los racks cuyo origen
 * cambio (arrastrar un rack no toca las demas instancias). `colores` (token
 * por caja) se resuelve a color de instancia; `tema` fuerza su refresco. */
export function useCajasInstanciadas(
  ref: RefObject<InstancedMesh | null>,
  grupo: GrupoCajas,
  origenes: Origen[],
  colores?: string[],
  tema?: unknown,
) {
  const invalidate = useThree((s) => s.invalidate);
  const escrito = useRef<Origen[]>([]);
  const grupoEscrito = useRef<GrupoCajas | null>(null);

  // Sin lista de dependencias a proposito: compara origenes cada render
  // (un bucle de N racks) y solo escribe lo que cambio.
  useLayoutEffect(() => {
    const malla = ref.current;
    if (!malla) {
      return;
    }
    const completo = grupoEscrito.current !== grupo;
    if (completo) {
      grupoEscrito.current = grupo;
      escrito.current = [];
    }
    const matriz = new Matrix4();
    const posicion = new Vector3();
    const escala = new Vector3();
    let cambio = completo;
    for (let r = 0; r < origenes.length; r++) {
      const o = origenes[r];
      const previo = escrito.current[r];
      if (previo && previo[0] === o[0] && previo[1] === o[1] && previo[2] === o[2]) {
        continue;
      }
      escrito.current[r] = o;
      cambio = true;
      for (let i = grupo.inicios[r]; i < grupo.inicios[r + 1]; i++) {
        const c = grupo.cajas[i];
        posicion.set(o[0] + c.x, o[1] + c.y, o[2] + c.z);
        escala.set(c.sx, c.sy, c.sz);
        malla.setMatrixAt(i, matriz.compose(posicion, SIN_ROTACION, escala));
      }
    }
    if (cambio) {
      malla.count = grupo.cajas.length;
      malla.instanceMatrix.needsUpdate = true;
      malla.computeBoundingSphere();
      invalidate();
    }
  });

  useEffect(() => {
    const malla = ref.current;
    if (!malla || !colores) {
      return;
    }
    const cache = new Map<string, Color>();
    colores.forEach((token, i) => {
      let color = cache.get(token);
      if (!color) {
        color = new Color(resolverColorCss(token));
        cache.set(token, color);
      }
      malla.setColorAt(i, color);
    });
    if (malla.instanceColor) {
      malla.instanceColor.needsUpdate = true;
    }
    invalidate();
  }, [ref, colores, tema, invalidate]);
}
