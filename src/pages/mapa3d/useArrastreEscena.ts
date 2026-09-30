import { useEffect, useRef, useState } from "react";
import { type ThreeEvent, useThree } from "@react-three/fiber";
import { Plane, Vector2, Vector3 } from "three";
import type { NodoMapa, TipoNodo } from "../mapa-almacen-datos";
import type { MovimientoGrupo } from "../use-historial-mapa";
import { baseNodoCm } from "../mapa/alturas";
import type { IndiceEspacial, OpcionesColocacion } from "../mapa/motor";
import { calcularOverrides, construirGrupo } from "./arrastreCalculo";
import { resolverSoltar } from "./arrastreSoltar";
import { M_POR_UNIDAD } from "../mapa/unidades";
import { UMBRAL_CLIC_PX } from "./constantes";
import type { ControlsRef, EstadoArrastre, PosicionXY } from "./tipos";

export interface OpcionesArrastre {
  nodos: NodoMapa[];
  posicionBase: Map<string, PosicionXY>;
  grupoIds: string[];
  mostrarGrilla: boolean;
  controlsRef: ControlsRef;
  indice: IndiceEspacial;
  opcionesColocacion: OpcionesColocacion;
  onMover: (
    tipo: TipoNodo,
    id: string,
    x: number,
    y: number,
    posZ: number | null,
    altura: number | null,
  ) => void;
  onMoverGrupo: (movimientos: MovimientoGrupo[]) => void;
  /** El drop quedaría bloqueado: `motivo` explica por qué. */
  onBloquear: (motivo: string) => void;
  /** El drop se permite pero con advertencia (pasillo estrecho). */
  onAdvertir: (motivo: string) => void;
  onClicSimple: (id: string) => void;
  onSeleccionar: (id: string | null) => void;
  onAlternarGrupo: (id: string) => void;
}

/** Arrastre de nodos sobre el plano: se resuelve con matemática de rayo/plano
 * directamente (no vía el sistema de eventos de R3F sobre el propio nodo) para
 * que el cálculo sea correcto incluso cuando el cursor sale de la silueta del
 * nodo — el patrón estándar de "arrastrar sobre un plano" en three.js. */
export function useArrastreEscena(o: OpcionesArrastre) {
  const { camera, gl, raycaster } = useThree();
  const [posOverride, setPosOverride] = useState<Record<string, PosicionXY>>({});
  const [arrastrando, setArrastrando] = useState(false);
  const arrastre = useRef<EstadoArrastre | null>(null);
  const { nodos, posicionBase, grupoIds, mostrarGrilla, controlsRef, indice } = o;
  const { opcionesColocacion, onMover, onMoverGrupo, onBloquear, onAdvertir, onClicSimple } = o;

  const posicionDe = (id: string) => posOverride[id] ?? posicionBase.get(id) ?? { x: 0, y: 0 };

  useEffect(() => {
    const dom = gl.domElement;

    const onMove = (e: PointerEvent) => {
      const est = arrastre.current;
      if (!est) {
        return;
      }
      const rect = dom.getBoundingClientRect();
      const ndc = new Vector2(
        ((e.clientX - rect.left) / rect.width) * 2 - 1,
        -((e.clientY - rect.top) / rect.height) * 2 + 1,
      );
      raycaster.setFromCamera(ndc, camera);
      const punto = new Vector3();
      if (!raycaster.ray.intersectPlane(est.plano, punto)) {
        return;
      }
      est.alt = e.altKey;
      est.movidoPx = Math.max(
        est.movidoPx,
        Math.hypot(e.clientX - est.startClientX, e.clientY - est.startClientY),
      );
      const overrides = calcularOverrides(est, punto, mostrarGrilla, indice);
      setPosOverride((prev) => ({ ...prev, ...overrides }));
    };

    const onUp = () => {
      const est = arrastre.current;
      if (!est) {
        return;
      }
      arrastre.current = null;
      setArrastrando(false);
      if (controlsRef.current) {
        controlsRef.current.enabled = true;
      }
      if (est.movidoPx < UMBRAL_CLIC_PX) {
        // Clic simple: la selección queda en un solo nodo (el grupo se reinicia).
        onClicSimple(est.grupo[0].id);
        return;
      }
      const r = resolverSoltar(est, indice, opcionesColocacion);
      if ("motivo" in r) {
        setPosOverride((prev) => {
          const copia = { ...prev };
          for (const id of r.ids) {
            delete copia[id];
          }
          return copia;
        });
        onBloquear(r.motivo);
        return;
      }
      if (r.movimientos.length === 0) {
        return;
      }
      if (r.advertencia) {
        onAdvertir(r.advertencia);
      }
      if (r.movimientos.length === 1) {
        const unico = r.movimientos[0];
        onMover(
          unico.tipo,
          unico.nodoId,
          unico.despues.pos_x ?? 0,
          unico.despues.pos_y ?? 0,
          unico.despues.pos_z,
          unico.despues.altura,
        );
        return;
      }
      onMoverGrupo(r.movimientos);
    };

    dom.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    return () => {
      dom.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };
  }, [
    camera,
    gl,
    raycaster,
    onMover,
    onMoverGrupo,
    onBloquear,
    onAdvertir,
    onClicSimple,
    indice,
    opcionesColocacion,
    mostrarGrilla,
    controlsRef,
  ]);

  const iniciarArrastre = (e: ThreeEvent<PointerEvent>, n: NodoMapa) => {
    e.stopPropagation();
    o.onSeleccionar(n.id);
    // Shift+clic: alternar en la selección múltiple sin arrastrar (Blender).
    if (e.shiftKey) {
      o.onAlternarGrupo(n.id);
      return;
    }
    const pos = posicionDe(n.id);
    const y = baseNodoCm(n) * M_POR_UNIDAD;
    // Plano horizontal a la altura base del nodo (normal +Y, a distancia y del origen).
    const plano = new Plane(new Vector3(0, 1, 0), -y);
    // Punto exacto del plano bajo el cursor al agarrar → offset de agarre.
    const hit0 = new Vector3();
    if (!e.ray.intersectPlane(plano, hit0)) {
      hit0.set(pos.x * M_POR_UNIDAD, y, pos.y * M_POR_UNIDAD);
    }
    arrastre.current = {
      grupo: construirGrupo(n, nodos, grupoIds, hit0, posicionDe),
      plano,
      startClientX: e.nativeEvent.clientX,
      startClientY: e.nativeEvent.clientY,
      movidoPx: 0,
      alt: e.altKey,
      guias: [],
    };
    // Desactivar la órbita SÍNCRONAMENTE: setArrastrando(true) llega con el
    // re-render y los primeros pointermove ya rotaban la cámara — ese giro
    // desplazaba el mapeo píxel→plano y "volver donde estaba" caía desviado.
    if (controlsRef.current) {
      controlsRef.current.enabled = false;
    }
    setArrastrando(true);
  };

  return { arrastre, arrastrando, posicionDe, iniciarArrastre };
}
