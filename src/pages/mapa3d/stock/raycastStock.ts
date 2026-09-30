/**
 * Picking propio del stock instanciado. El raycast por defecto de
 * `InstancedMesh` prueba las 20000 instancias en cada movimiento del puntero;
 * aqui se descartan primero las celdas (2400 cajas AABB baratas) y solo se
 * prueban las cajas de las celdas que el rayo atraviesa. Las cajas no rotan,
 * asi que cada AABB sale directo de la matriz (posicion +- escala / 2).
 */
import { Box3, Vector3, type InstancedMesh, type Intersection, type Raycaster } from "three";
import type { EstadoStock } from "./estadoStock";

export type FuncionRaycast = (this: InstancedMesh, rc: Raycaster, hits: Intersection[]) => void;

const caja = new Box3();
const punto = new Vector3();

function ponerCaja(m: Float32Array, i: number): void {
  const o = i * 16;
  const hx = m[o] / 2;
  const hy = m[o + 5] / 2;
  const hz = m[o + 10] / 2;
  caja.min.set(m[o + 12] - hx, m[o + 13] - hy, m[o + 14] - hz);
  caja.max.set(m[o + 12] + hx, m[o + 13] + hy, m[o + 14] + hz);
}

function probar(
  malla: InstancedMesh,
  rc: Raycaster,
  hits: Intersection[],
  m: Float32Array,
  i: number,
): void {
  ponerCaja(m, i);
  if (!rc.ray.intersectBox(caja, punto)) {
    return;
  }
  const distance = rc.ray.origin.distanceTo(punto);
  if (distance < rc.near || distance > rc.far) {
    return;
  }
  hits.push({ distance, point: punto.clone(), object: malla, instanceId: i });
}

/** `pulsado`: con un boton pulsado (orbitar/arrastrar) no se hace picking. */
export function raycastCajas(e: EstadoStock, pulsado: { current: boolean }): FuncionRaycast {
  return function (rc, hits) {
    if (pulsado.current) {
      return;
    }
    const { celdas } = e.d;
    for (let k = 0; k < celdas.length; k++) {
      if (!e.cerca[k]) {
        continue;
      }
      const c = celdas[k];
      const o = k * 3;
      caja.min.set(
        e.centros[o] - c.sx / 2,
        e.centros[o + 1] - c.sy / 2,
        e.centros[o + 2] - c.sz / 2,
      );
      caja.max.set(
        e.centros[o] + c.sx / 2,
        e.centros[o + 1] + c.sy / 2,
        e.centros[o + 2] + c.sz / 2,
      );
      if (!rc.ray.intersectsBox(caja)) {
        continue;
      }
      for (let i = c.cajaIni; i < c.cajaFin; i++) {
        probar(this, rc, hits, e.cajasM, i);
      }
    }
  };
}

export function raycastBloques(e: EstadoStock, pulsado: { current: boolean }): FuncionRaycast {
  return function (rc, hits) {
    if (pulsado.current) {
      return;
    }
    for (let k = 0; k < e.d.celdas.length; k++) {
      if (!e.cerca[k]) {
        probar(this, rc, hits, e.bloquesM, k);
      }
    }
  };
}
