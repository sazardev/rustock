import { useMemo } from "react";
import type { ThreeEvent } from "@react-three/fiber";
import { BoxGeometry, EdgesGeometry } from "three";
import { resolverColorCss, type NodoMapa, type TipoNodo } from "../../mapa-almacen-datos";
import { alturaNodoCm, baseNodoCm } from "../../mapa/alturas";
import type { Resultado } from "../../mapa/motor";
import { solapeProhibido } from "../../mapa/reglas";
import { M_POR_UNIDAD } from "../../mapa/unidades";
import type { EstadoArrastre, PosicionXY } from "../tipos";
import { SIN_TINTE, tamRealDe, tinteDe } from "../utils";

/** Caja de seleccion de un rack: invisible (no se dibuja, solo recibe el
 * puntero para arrastre, seleccion y doble clic) y, si el rack esta
 * resaltado, arrastrado o es obstaculo, un contorno con el semaforo. */
export function RackSeleccion({
  nodo: n,
  colocacion,
  pos,
  resaltado,
  arrastre,
  onPointerDown,
  onEnfocar,
}: {
  nodo: NodoMapa;
  colocacion: Resultado | null;
  pos: PosicionXY;
  resaltado: boolean;
  arrastre: EstadoArrastre | null;
  onPointerDown: (e: ThreeEvent<PointerEvent>, n: NodoMapa) => void;
  onEnfocar: (id: string) => void;
}) {
  const tam = tamRealDe(n);
  const ancho = tam.ancho * M_POR_UNIDAD;
  const fondo = tam.profundo * M_POR_UNIDAD;
  const alto = alturaNodoCm(n) * M_POR_UNIDAD;
  const base = baseNodoCm(n) * M_POR_UNIDAD;
  const estado = colocacion?.estado ?? null;
  const tipoArrastre: TipoNodo | undefined = arrastre?.grupo[0]?.tipo;
  const enArrastre = arrastre?.grupo.some((g) => g.id === n.id) ?? false;
  const esObstaculo =
    tipoArrastre !== undefined && !enArrastre && solapeProhibido(tipoArrastre, n.tipo);
  const tinte = tinteDe(resaltado, estado, esObstaculo);
  const tintado = tinte !== SIN_TINTE;
  const centro: [number, number, number] = [
    pos.x * M_POR_UNIDAD + ancho / 2,
    base + alto / 2,
    pos.y * M_POR_UNIDAD + fondo / 2,
  ];
  const bordes = useMemo(() => {
    const caja = new BoxGeometry(ancho, alto, fondo);
    const e = new EdgesGeometry(caja);
    caja.dispose();
    return e;
  }, [ancho, alto, fondo]);

  return (
    <group position={centro}>
      <mesh onPointerDown={(e) => onPointerDown(e, n)} onDoubleClick={() => onEnfocar(n.id)}>
        <boxGeometry args={[ancho, alto, fondo]} />
        {/* visible=false: three no lo dibuja pero el raycaster si lo prueba. */}
        <meshBasicMaterial visible={false} />
      </mesh>
      {tintado ? (
        <>
          <mesh raycast={() => null} renderOrder={3}>
            <boxGeometry args={[ancho, alto, fondo]} />
            <meshBasicMaterial
              color={resolverColorCss(tinte)}
              transparent
              opacity={0.14}
              depthWrite={false}
            />
          </mesh>
          <lineSegments geometry={bordes} raycast={() => null} renderOrder={4}>
            <lineBasicMaterial color={resolverColorCss(tinte)} />
          </lineSegments>
        </>
      ) : null}
    </group>
  );
}
