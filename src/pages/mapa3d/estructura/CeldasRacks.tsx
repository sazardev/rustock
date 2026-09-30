import { useMemo, useRef, useState } from "react";
import { Html } from "@react-three/drei";
import type { ThreeEvent } from "@react-three/fiber";
import { InstancedMesh as MallaInstanciada, type Intersection, type Raycaster } from "three";
import { COLOR_NODO, colorOcupacion } from "../../mapa-almacen-datos";
import type { ModoColor } from "../../mapa/personalizacion";
import { useT } from "../../../shared/i18n";
import { usePunteroPulsado } from "../usePunteroPulsado";
import type { GruposRacks } from "./construirRack";
import { partirCeldas, type CeldasConMetas } from "./partirCeldas";
import { useCajasInstanciadas, type Origen } from "./useCajasInstanciadas";

const OPACIDAD_CELDA = 0.32;
/** Con stock dibujado dentro, el volumen casi desaparece para ver las cajas. */
const OPACIDAD_CON_STOCK = 0.1;

/** Un InstancedMesh translucido de celdas, coloreado por ocupacion. Las
 * celdas con stock (`conStock`) no hacen picking: su tooltip es el del stock. */
function MallaCeldas({
  datos,
  origenes,
  tema,
  deshabilitado,
  opacidad,
  picking,
  modoColor,
}: {
  datos: CeldasConMetas;
  origenes: Origen[];
  tema: unknown;
  deshabilitado: boolean;
  opacidad: number;
  picking: boolean;
  modoColor: ModoColor;
}) {
  const t = useT();
  const ref = useRef<MallaInstanciada>(null);
  const pulsado = usePunteroPulsado();
  const [hover, setHover] = useState<number | null>(null);
  // "Por tipo": todas las celdas del color de una ubicacion; en el resto, por ocupacion.
  const colores = useMemo(
    () =>
      datos.metas.map((meta) =>
        modoColor === "tipo" ? COLOR_NODO.ubicacion : colorOcupacion(meta.ocupacion),
      ),
    [datos.metas, modoColor],
  );
  // Con el boton pulsado (orbitar o arrastrar) no se hace picking de celdas.
  const raycast = function (this: MallaInstanciada, rc: Raycaster, hits: Intersection[]) {
    if (picking && !pulsado.current) {
      MallaInstanciada.prototype.raycast.call(this, rc, hits);
    }
  };
  useCajasInstanciadas(ref, datos.celdas, origenes, colores, tema);
  const n = datos.celdas.cajas.length;
  if (n === 0) {
    return null;
  }

  const alMover = (e: ThreeEvent<PointerEvent>) => {
    if (deshabilitado || e.instanceId === undefined) {
      return;
    }
    setHover(e.instanceId);
  };

  const celda = hover !== null && !deshabilitado ? datos.celdas.cajas[hover] : undefined;
  const meta = hover !== null ? datos.metas[hover] : undefined;
  const o = meta ? origenes[meta.rackIdx] : undefined;

  return (
    <>
      <instancedMesh
        key={n}
        ref={ref}
        args={[undefined, undefined, n]}
        frustumCulled={false}
        renderOrder={2}
        raycast={raycast}
        onPointerMove={alMover}
        onPointerOut={() => setHover(null)}
      >
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial transparent opacity={opacidad} depthWrite={false} />
      </instancedMesh>
      {celda && meta && o ? (
        <Html
          position={[o[0] + celda.x, o[1] + celda.y + celda.sy / 2, o[2] + celda.z]}
          center
          style={{ pointerEvents: "none" }}
        >
          <div className="mapa-almacen-3d__hud">
            {meta.codigo}
            <span>
              {meta.ocupacion === null
                ? t.mapa3d.celdaSinCapacidad
                : `${Math.round(meta.ocupacion * 100)}%`}
            </span>
          </div>
        </Html>
      ) : null}
    </>
  );
}

const SIN_STOCK: ReadonlySet<string> = new Set();

/** Celdas de ubicacion de todos los racks: las vacias conservan su color de
 * ocupacion; las que muestran stock bajan la opacidad para verlo. */
export function CeldasRacks({
  grupos,
  origenes,
  tema,
  deshabilitado,
  conStock = SIN_STOCK,
  modoColor,
}: {
  grupos: GruposRacks;
  origenes: Origen[];
  tema: unknown;
  /** Durante un arrastre no se muestra tooltip. */
  deshabilitado: boolean;
  /** Ubicaciones con stock dibujado. */
  conStock?: ReadonlySet<string>;
  modoColor: ModoColor;
}) {
  const { vacias, llenas } = useMemo(() => partirCeldas(grupos, conStock), [grupos, conStock]);
  return (
    <>
      <MallaCeldas
        datos={vacias}
        origenes={origenes}
        tema={tema}
        deshabilitado={deshabilitado}
        opacidad={OPACIDAD_CELDA}
        picking
        modoColor={modoColor}
      />
      <MallaCeldas
        datos={llenas}
        origenes={origenes}
        tema={tema}
        deshabilitado={deshabilitado}
        opacidad={OPACIDAD_CON_STOCK}
        picking={false}
        modoColor={modoColor}
      />
    </>
  );
}
