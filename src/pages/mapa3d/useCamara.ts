import { useRef } from "react";
import type { NodoMapa } from "../mapa-almacen-datos";
import { M_POR_UNIDAD } from "../mapa/unidades";
import { CAMARA_INICIAL } from "./constantes";
import type { ControlsRef, PosicionXY, VistaCamara } from "./tipos";

/** Cámara del editor 3D: encuadre, presets y enfocar (la caminata vive en `caminata/`). El ref de
 * `OrbitControls` se crea dentro del `<Canvas>` pero se declara aquí para que
 * la barra (fuera del Canvas) pueda mover la cámara. */
export function useCamara(nodos: NodoMapa[], posicionBase: Map<string, PosicionXY>) {
  const controlsRef: ControlsRef = useRef(null);

  /** Centro y distancia de encuadre del layout (metros de escena), con el
   * tamaño de cada nodo incluido y márgenes de 2 m. */
  const centroYDistancia = () => {
    if (!controlsRef.current || posicionBase.size === 0) {
      return null;
    }
    let x0 = Infinity;
    let z0 = Infinity;
    let x1 = -Infinity;
    let z1 = -Infinity;
    for (const n of nodos) {
      const p = posicionBase.get(n.id);
      if (!p) {
        continue;
      }
      x0 = Math.min(x0, p.x * M_POR_UNIDAD);
      z0 = Math.min(z0, p.y * M_POR_UNIDAD);
      x1 = Math.max(x1, (p.x + n.ancho) * M_POR_UNIDAD);
      z1 = Math.max(z1, (p.y + n.profundidad) * M_POR_UNIDAD);
    }
    if (!Number.isFinite(x0)) {
      return null;
    }
    const d = Math.max(x1 - x0, z1 - z0, 2) * 0.8 + 2.5;
    return { cx: (x0 + x1) / 2, cz: (z0 + z1) / 2, d };
  };

  const encuadrarTodo = () => {
    const c = centroYDistancia();
    const controls = controlsRef.current;
    if (!c || !controls) {
      return;
    }
    controls.target.set(c.cx, 0, c.cz);
    controls.object.position.set(c.cx + c.d, c.d, c.cz + c.d);
    controls.update();
  };

  /** Presets de cámara: isométrica 3/4, planta (cenital) y frente. */
  const irAVista = (vista: VistaCamara) => {
    const c = centroYDistancia();
    const controls = controlsRef.current;
    if (!c || !controls) {
      return;
    }
    controls.target.set(c.cx, 0, c.cz);
    if (vista === "planta") {
      controls.object.position.set(c.cx, c.d, c.cz + 0.001);
    } else if (vista === "frente") {
      controls.object.position.set(c.cx, c.d * 0.15, c.cz + c.d);
    } else {
      controls.object.position.set(c.cx + c.d, c.d, c.cz + c.d);
    }
    controls.update();
  };

  const resetearVista = () => {
    const controls = controlsRef.current;
    if (!controls) {
      return;
    }
    controls.target.set(0, 0, 0);
    controls.object.position.set(...CAMARA_INICIAL);
    controls.update();
  };

  /** Enfocar (tecla F / doble clic): centra el target en el nodo conservando
   * la dirección de la cámara — el equivalente a "frame selected". */
  const enfocarNodo = (id: string) => {
    const controls = controlsRef.current;
    const n = nodos.find((x) => x.id === id);
    if (!controls || !n || n.pos_x === null || n.pos_y === null) {
      return;
    }
    const cx = (n.pos_x + n.ancho / 2) * M_POR_UNIDAD;
    const cz = (n.pos_y + n.profundidad / 2) * M_POR_UNIDAD;
    const diag = Math.max(n.ancho, n.profundidad) * M_POR_UNIDAD;
    const d = Math.max(diag * 3, 2.8);
    const direccion = controls.object.position.clone().sub(controls.target).normalize();
    controls.target.set(cx, 0, cz);
    controls.object.position.set(
      cx + direccion.x * d,
      Math.max(direccion.y * d, d * 0.35),
      cz + direccion.z * d,
    );
    controls.update();
  };

  return {
    controlsRef,
    encuadrarTodo,
    irAVista,
    resetearVista,
    enfocarNodo,
  };
}
