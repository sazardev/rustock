import { useMemo, useRef, useState } from "react";
import type { ThreeEvent } from "@react-three/fiber";
import type { InstancedMesh } from "three";
import { useTema } from "../../../shared/tema";
import type { ModoColor } from "../../mapa/personalizacion";
import type { Origen } from "../estructura/useCajasInstanciadas";
import { usePunteroPulsado } from "../usePunteroPulsado";
import type { DisposicionStock } from "./construirDisposicion";
import { crearEstado } from "./estadoStock";
import { raycastBloques, raycastCajas } from "./raycastStock";
import { TooltipStock } from "./TooltipStock";
import { useCategoriasProducto } from "./useCategoriasProducto";
import { useColoresStock } from "./useColoresStock";
import { useMatricesStock } from "./useMatricesStock";

interface Hover {
  celda: number;
  item: number | null;
  posicion: [number, number, number];
}

/** Cajas de producto de todas las celdas: un InstancedMesh de cajas (LOD
 * cerca) y otro de bloques (LOD lejos), 2 draw calls sin importar el stock. */
export function StockInstanciado({
  disposicion: d,
  origenes,
  deshabilitado,
  modoColor,
  radioLod,
}: {
  disposicion: DisposicionStock;
  origenes: Origen[];
  /** Durante un arrastre no hay tooltip. */
  deshabilitado: boolean;
  modoColor: ModoColor;
  /** Distancia (m) a la que las celdas pasan de bloque a cajas. */
  radioLod: number;
}) {
  const oscuro = useTema((s) => s.tema?.modo === "OSCURO");
  const cajasRef = useRef<InstancedMesh>(null);
  const bloquesRef = useRef<InstancedMesh>(null);
  const pulsado = usePunteroPulsado();
  const estado = useMemo(() => crearEstado(d), [d]);
  const [hover, setHover] = useState<Hover | null>(null);
  const raycastC = useMemo(() => raycastCajas(estado, pulsado), [estado, pulsado]);
  const raycastB = useMemo(() => raycastBloques(estado, pulsado), [estado, pulsado]);

  const categoriaDe = useCategoriasProducto(modoColor === "categoria");
  const refrescar = useMatricesStock(cajasRef, bloquesRef, estado, origenes, radioLod);
  useColoresStock(estado, oscuro, modoColor, categoriaDe, refrescar);

  if (d.celdas.length === 0) {
    return null;
  }

  const fijar = (celda: number, item: number | null, m: Float32Array, i: number) => {
    const o = i * 16;
    const x = m[o + 12];
    const y = m[o + 13] + m[o + 5] / 2;
    const z = m[o + 14];
    const p = hover?.posicion;
    if (hover?.celda === celda && hover.item === item && p?.[0] === x && p[1] === y && p[2] === z) {
      return;
    }
    setHover({ celda, item, posicion: [x, y, z] });
  };
  const alMoverCaja = (e: ThreeEvent<PointerEvent>) => {
    if (deshabilitado || e.instanceId === undefined) {
      return;
    }
    const celda = d.cajaCelda[e.instanceId];
    fijar(celda, d.cajaItem[e.instanceId], estado.cajasM, e.instanceId);
  };
  const alMoverBloque = (e: ThreeEvent<PointerEvent>) => {
    if (deshabilitado || e.instanceId === undefined) {
      return;
    }
    fijar(e.instanceId, null, estado.bloquesM, e.instanceId);
  };
  const celdaHover = hover && !deshabilitado ? d.celdas[hover.celda] : undefined;

  return (
    <>
      <instancedMesh
        key={`c${d.nCajas}-${d.celdas.length}`}
        ref={cajasRef}
        args={[undefined, undefined, Math.max(1, d.nCajas)]}
        frustumCulled={false}
        raycast={raycastC}
        onPointerMove={alMoverCaja}
        onPointerOut={() => setHover(null)}
      >
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial roughness={0.7} metalness={0.05} />
      </instancedMesh>
      <instancedMesh
        key={`b${d.celdas.length}`}
        ref={bloquesRef}
        args={[undefined, undefined, d.celdas.length]}
        frustumCulled={false}
        raycast={raycastB}
        onPointerMove={alMoverBloque}
        onPointerOut={() => setHover(null)}
      >
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial roughness={0.7} metalness={0.05} />
      </instancedMesh>
      {celdaHover && hover ? (
        <TooltipStock celda={celdaHover} item={hover.item} posicion={hover.posicion} />
      ) : null}
    </>
  );
}
