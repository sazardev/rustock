import { useRef } from "react";
import type { InstancedMesh } from "three";
import { resolverColorCss } from "../../mapa-almacen-datos";
import type { GruposRacks } from "./construirRack";
import { useCajasInstanciadas, type Origen } from "./useCajasInstanciadas";

/** Una caja unitaria instanciada con material de un token de color. */
function Instancias({
  grupo,
  origenes,
  color,
  sombras,
  rugosidad = 0.6,
}: {
  grupo: GruposRacks["postes"];
  origenes: Origen[];
  color: string;
  sombras: boolean;
  rugosidad?: number;
}) {
  const ref = useRef<InstancedMesh>(null);
  useCajasInstanciadas(ref, grupo, origenes);
  const n = grupo.cajas.length;
  const hex = resolverColorCss(color);
  if (n === 0) {
    return null;
  }
  return (
    <instancedMesh
      key={n}
      ref={ref}
      args={[undefined, undefined, n]}
      castShadow={sombras}
      receiveShadow={sombras}
      frustumCulled={false}
    >
      <boxGeometry args={[1, 1, 1]} />
      <meshStandardMaterial color={hex} roughness={rugosidad} metalness={0.15} />
    </instancedMesh>
  );
}

/** Montantes, largueros y bandejas de TODOS los racks: tres InstancedMesh en
 * total, sin importar cuantos racks haya (tres draw calls). */
export function EstructuraRacks({
  grupos,
  origenes,
  sombras,
}: {
  grupos: GruposRacks;
  origenes: Origen[];
  sombras: boolean;
}) {
  return (
    <>
      <Instancias
        grupo={grupos.postes}
        origenes={origenes}
        color="--color-blue-600"
        sombras={sombras}
      />
      <Instancias
        grupo={grupos.vigas}
        origenes={origenes}
        color="--color-blue-400"
        sombras={sombras}
      />
      <Instancias
        grupo={grupos.bandejas}
        origenes={origenes}
        color="--color-gray-400"
        sombras={sombras}
        rugosidad={0.85}
      />
    </>
  );
}
