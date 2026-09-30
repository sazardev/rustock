import { useCallback, useEffect, useLayoutEffect, type RefObject } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import type { InstancedMesh } from "three";
import type { Origen } from "../estructura/useCajasInstanciadas";
import { actualizarLod, escribirRack, reconstruirVivas, type EstadoStock } from "./estadoStock";

/** Distancia (m) a la que una celda pasa de bloque a cajas individuales. */
export const RADIO_LOD_M = 12;
const HISTERESIS_M = 1.5;
/** La camara debe moverse esto (m) para reevaluar el LOD (no por fotograma). */
const PASO_CAMARA_M = 0.5;

/** Escribe las matrices del stock cuando cambian los datos o el origen de un
 * rack (arrastrarlo) y reevalua el LOD por cambios significativos de camara.
 * Devuelve `refrescar`, que reconstruye los buffers vivos (tras pintar). */
export function useMatricesStock(
  cajasRef: RefObject<InstancedMesh | null>,
  bloquesRef: RefObject<InstancedMesh | null>,
  estado: EstadoStock,
  origenes: Origen[],
  radio: number = RADIO_LOD_M,
): () => void {
  const camara = useThree((s) => s.camera);
  const invalidate = useThree((s) => s.invalidate);

  const refrescar = useCallback(() => {
    const cajas = cajasRef.current;
    const bloques = bloquesRef.current;
    if (cajas && bloques) {
      reconstruirVivas(estado, cajas, bloques);
      invalidate();
    }
  }, [cajasRef, bloquesRef, estado, invalidate]);

  // Sin dependencias a proposito: compara origenes en cada render (un bucle de
  // N racks) y solo reescribe lo que cambio.
  useLayoutEffect(() => {
    let cambio = false;
    for (let r = 0; r < origenes.length; r++) {
      const o = origenes[r];
      const previo = estado.escrito[r];
      if (previo && previo[0] === o[0] && previo[1] === o[1] && previo[2] === o[2]) {
        continue;
      }
      estado.escrito[r] = o;
      escribirRack(estado, r, o);
      cambio = true;
    }
    if (cambio) {
      actualizarLod(estado, camara.position.toArray(), radio, HISTERESIS_M);
      refrescar();
    }
  });

  // Otro radio (cambio de calidad): forzar la reevaluacion en el proximo fotograma.
  useEffect(() => {
    estado.camara = null;
    invalidate();
  }, [estado, radio, invalidate]);

  useFrame(() => {
    const previa = estado.camara;
    const p = camara.position;
    if (
      previa &&
      (p.x - previa[0]) ** 2 + (p.y - previa[1]) ** 2 + (p.z - previa[2]) ** 2 < PASO_CAMARA_M ** 2
    ) {
      return;
    }
    if (actualizarLod(estado, p.toArray(), radio, HISTERESIS_M).length > 0) {
      const cajas = cajasRef.current;
      const bloques = bloquesRef.current;
      if (cajas && bloques) {
        reconstruirVivas(estado, cajas, bloques);
      }
    }
  });

  return refrescar;
}
