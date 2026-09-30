import { Edges } from "@react-three/drei";
import type { ThreeEvent } from "@react-three/fiber";
import {
  colorOcupacion,
  resolverColorCss,
  type NodoMapa,
  type TipoNodo,
} from "../mapa-almacen-datos";
import type { ModoColor } from "../mapa/personalizacion";
import { alturaNodoCm, baseNodoCm } from "../mapa/alturas";
import type { Resultado } from "../mapa/motor";
import { solapeProhibido } from "../mapa/reglas";
import { M_POR_UNIDAD } from "../mapa/unidades";
import type { EstadoArrastre, PosicionXY } from "./tipos";
import { intensidadDe, SIN_TINTE, tamRealDe, tinteDe } from "./utils";

/** Un nodo de piso (zona, pasillo o ubicacion de piso) como prisma bajo:
 * color por tipo u ocupacion y semaforo en vivo (resaltado, arrastre, choque,
 * obstaculo). Los racks no pasan por aqui: ver `estructura/`. */
export function NodoMesh({
  nodo: n,
  colocacion,
  pos,
  resaltado,
  arrastre,
  colorTipo,
  modoColor,
  alambre,
  sombras,
  onPointerDown,
  onEnfocar,
}: {
  nodo: NodoMapa;
  /** Semáforo de colocación si el nodo está en arrastre; null si no. */
  colocacion: Resultado | null;
  pos: PosicionXY;
  resaltado: boolean;
  arrastre: EstadoArrastre | null;
  colorTipo: string;
  modoColor: ModoColor;
  alambre: boolean;
  sombras: boolean;
  onPointerDown: (e: ThreeEvent<PointerEvent>, n: NodoMapa) => void;
  onEnfocar: (id: string) => void;
}) {
  const tam = tamRealDe(n);
  const ancho = tam.ancho * M_POR_UNIDAD;
  const profundidad = tam.profundo * M_POR_UNIDAD;
  const altura = alturaNodoCm(n) * M_POR_UNIDAD;
  const base = baseNodoCm(n) * M_POR_UNIDAD;
  const estado = colocacion?.estado ?? null;
  const tipoArrastre: TipoNodo | undefined = arrastre?.grupo[0]?.tipo;
  const enArrastre = arrastre?.grupo.some((g) => g.id === n.id) ?? false;
  const esObstaculo =
    tipoArrastre !== undefined && !enArrastre && solapeProhibido(tipoArrastre, n.tipo);
  const tinte = tinteDe(resaltado, estado, esObstaculo);
  const centro: [number, number, number] = [
    pos.x * M_POR_UNIDAD + ancho / 2,
    base + altura / 2,
    pos.y * M_POR_UNIDAD + profundidad / 2,
  ];
  return (
    <mesh
      position={centro}
      castShadow={sombras && n.tipo === "ubicacion"}
      receiveShadow={sombras}
      onPointerDown={(e) => onPointerDown(e, n)}
      onDoubleClick={() => onEnfocar(n.id)}
    >
      <boxGeometry args={[ancho, altura, profundidad]} />
      <meshStandardMaterial
        wireframe={alambre}
        color={
          n.tipo === "ubicacion" && modoColor !== "tipo"
            ? resolverColorCss(colorOcupacion(n.ocupacion))
            : colorTipo
        }
        emissive={tinte === SIN_TINTE ? SIN_TINTE : resolverColorCss(tinte)}
        emissiveIntensity={intensidadDe(resaltado, estado, esObstaculo)}
      />
      {n.tipo === "zona" && !alambre ? (
        <Edges color={resolverColorCss("--color-gray-400")} raycast={() => null} />
      ) : null}
    </mesh>
  );
}
