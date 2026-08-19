import { useEffect, useMemo, useRef, useState, type RefObject } from "react";
import { Canvas, type ThreeEvent, useThree } from "@react-three/fiber";
import { Html, OrbitControls } from "@react-three/drei";
import { Plane, Vector2, Vector3 } from "three";
import { useParams, useSearchParams } from "react-router";
import { Button, ButtonLink, PageHeader, Text } from "../shared/ui";
import { almacenMapa } from "../app/route-paths";
import {
  ALTO_NODO,
  ANCHO_NODO,
  colorOcupacion,
  type NodoMapa,
  posicionPorDefecto,
  resolverColorCss,
  type ResumenNodo,
  type TipoNodo,
  useMapaAlmacenDatos,
  useMoverNodoMapa,
} from "./mapa-almacen-datos";
import { NodoSeleccionadoPanel } from "./NodoSeleccionadoPanel";
import type { PosicionValores } from "../shared/posicion-form-card";

/** 1 unidad de escena 3D = 20 unidades de coordenada 2D (mismas proporciones
 * relativas que el mapa 2D, en una escena de tamaño manejable para la cámara). */
const ESCALA_3D = 0.05;
const ALTURA_DEFECTO: Record<TipoNodo, number> = {
  zona: 0.15,
  pasillo: 1.2,
  rack: 1.2,
  ubicacion: 0.4,
};
const UMBRAL_CLIC_PX = 4;
const CAMARA_INICIAL: [number, number, number] = [45, 45, 45];

const ETIQUETA_TIPO: Record<TipoNodo, string> = {
  zona: "Zonas",
  pasillo: "Pasillos",
  rack: "Racks",
  ubicacion: "Ubicaciones",
};
const TODOS_TIPOS: TipoNodo[] = ["zona", "pasillo", "rack", "ubicacion"];

function esCampoDeTexto(el: EventTarget | null): boolean {
  if (!(el instanceof HTMLElement)) return false;
  return el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.tagName === "SELECT";
}

export function AlmacenMapa3DPage() {
  const { id: almacenId } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const resaltarId = searchParams.get("resaltar");
  const { nodos, cargando, resumenPorNodo } = useMapaAlmacenDatos(almacenId);
  const moverMut = useMoverNodoMapa();

  const editorRef = useRef<HTMLDivElement>(null);
  /** Instancia de `OrbitControls` (drei/three-stdlib); se crea dentro del
   * `<Canvas>` pero el `ref` en sí se declara aquí para que la barra de
   * comandos (fuera del Canvas) pueda mover la cámara. */
  const controlsRef = useRef<any>(null);

  const [seleccionadoId, setSeleccionadoId] = useState<string | null>(resaltarId);
  const [tiposVisibles, setTiposVisibles] = useState<Record<TipoNodo, boolean>>({
    zona: true,
    pasillo: true,
    rack: true,
    ubicacion: true,
  });
  const [mostrarGrilla, setMostrarGrilla] = useState(true);
  const [pantallaCompleta, setPantallaCompleta] = useState(false);

  const seleccionado = nodos.find((n) => n.id === seleccionadoId) ?? null;
  const nodosVisibles = nodos.filter((n) => tiposVisibles[n.tipo]);

  const posicionBase = useMemo(() => {
    const indicePorTipo: Record<TipoNodo, number> = { zona: 0, pasillo: 0, rack: 0, ubicacion: 0 };
    const mapa = new Map<string, { x: number; y: number }>();
    for (const n of nodos) {
      const indice = indicePorTipo[n.tipo]++;
      if (n.pos_x !== null && n.pos_y !== null) {
        mapa.set(n.id, { x: n.pos_x, y: n.pos_y });
      } else {
        mapa.set(n.id, posicionPorDefecto(indice, n.tipo));
      }
    }
    return mapa;
  }, [nodos]);

  // Atajos de teclado: solo activos con selección, e ignorados si el foco
  // está en un campo de texto (para no interferir con el formulario de
  // posición del panel).
  useEffect(() => {
    if (!seleccionado) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setSeleccionadoId(null);
        return;
      }
      if (esCampoDeTexto(e.target)) return;
      const paso = 5;
      let dx = 0;
      let dy = 0;
      if (e.key === "ArrowLeft") dx = -paso;
      else if (e.key === "ArrowRight") dx = paso;
      else if (e.key === "ArrowUp") dy = -paso;
      else if (e.key === "ArrowDown") dy = paso;
      else return;
      e.preventDefault();
      const base = posicionBase.get(seleccionado.id);
      const x = (seleccionado.pos_x ?? base?.x ?? 0) + dx;
      const y = (seleccionado.pos_y ?? base?.y ?? 0) + dy;
      moverMut.mutate({
        tipo: seleccionado.tipo,
        nodoId: seleccionado.id,
        pos: { pos_x: x, pos_y: y, pos_z: seleccionado.pos_z, altura: seleccionado.altura },
      });
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [seleccionado, posicionBase, moverMut]);

  useEffect(() => {
    const onFullscreenChange = () =>
      setPantallaCompleta(document.fullscreenElement === editorRef.current);
    document.addEventListener("fullscreenchange", onFullscreenChange);
    return () => document.removeEventListener("fullscreenchange", onFullscreenChange);
  }, []);

  if (!almacenId) {
    return null;
  }

  const alternarPantallaCompleta = () => {
    if (document.fullscreenElement) {
      document.exitFullscreen();
    } else {
      editorRef.current?.requestFullscreen();
    }
  };

  const encuadrarTodo = () => {
    const controls = controlsRef.current;
    if (!controls || posicionBase.size === 0) return;
    const puntos = [...posicionBase.values()];
    const xs = puntos.map((p) => p.x * ESCALA_3D);
    const zs = puntos.map((p) => p.y * ESCALA_3D);
    const centroX = (Math.min(...xs) + Math.max(...xs)) / 2;
    const centroZ = (Math.min(...zs) + Math.max(...zs)) / 2;
    const extension = Math.max(
      Math.max(...xs) - Math.min(...xs),
      Math.max(...zs) - Math.min(...zs),
      10,
    );
    const distancia = extension * 1.2 + 10;
    controls.target.set(centroX, 0, centroZ);
    controls.object.position.set(centroX + distancia, distancia, centroZ + distancia);
    controls.update();
  };

  const resetearVista = () => {
    const controls = controlsRef.current;
    if (!controls) return;
    controls.target.set(0, 0, 0);
    controls.object.position.set(...CAMARA_INICIAL);
    controls.update();
  };

  const guardarPosicionSeleccionado = (pos: PosicionValores) => {
    if (!seleccionado || pos.pos_x === null || pos.pos_y === null) return;
    moverMut.mutate({
      tipo: seleccionado.tipo,
      nodoId: seleccionado.id,
      pos: { pos_x: pos.pos_x, pos_y: pos.pos_y, pos_z: pos.pos_z, altura: pos.altura },
    });
  };

  return (
    <>
      <PageHeader
        title="Mapa 3D"
        description="Arrastra sobre el piso para reposicionar, rota/haz zoom con el mouse, o selecciona un nodo para ver y editar sus detalles."
        actions={
          <ButtonLink variant="ghost" icon="ubicacion" href={almacenMapa(almacenId)}>
            Volver al mapa 2D
          </ButtonLink>
        }
      />
      {cargando ? (
        <Text as="p" size="sm" color="muted">
          Cargando estructura…
        </Text>
      ) : nodos.length === 0 ? (
        <Text as="p" size="sm" color="muted">
          Este almacén aún no tiene zonas, racks o ubicaciones para mostrar en el mapa.
        </Text>
      ) : (
        <div ref={editorRef} className="mapa-almacen-3d__editor">
          <div className="mapa-almacen-3d__toolbar">
            <Button variant="ghost" size="sm" icon="encuadrar" onClick={encuadrarTodo}>
              Encuadrar todo
            </Button>
            <Button variant="ghost" size="sm" icon="refrescar" onClick={resetearVista}>
              Resetear vista
            </Button>
            <Button
              variant={mostrarGrilla ? "secondary" : "ghost"}
              size="sm"
              icon="cuadricula"
              onClick={() => setMostrarGrilla((v) => !v)}
            >
              Cuadrícula
            </Button>
            {TODOS_TIPOS.map((tipo) => (
              <Button
                key={tipo}
                variant={tiposVisibles[tipo] ? "secondary" : "ghost"}
                size="sm"
                icon={tipo === "ubicacion" ? "ubicacion" : "zona"}
                onClick={() => setTiposVisibles((prev) => ({ ...prev, [tipo]: !prev[tipo] }))}
              >
                {ETIQUETA_TIPO[tipo]}
              </Button>
            ))}
            <Button
              variant="ghost"
              size="sm"
              icon={pantallaCompleta ? "salirPantallaCompleta" : "pantallaCompleta"}
              onClick={alternarPantallaCompleta}
              className="ml-auto"
            >
              {pantallaCompleta ? "Salir de pantalla completa" : "Pantalla completa"}
            </Button>
          </div>
          <div className="mapa-almacen-3d__area">
            <div className="mapa-almacen-3d__lienzo">
              <Canvas camera={{ position: CAMARA_INICIAL, fov: 45 }}>
                <ambientLight intensity={0.7} />
                <directionalLight position={[30, 40, 20]} intensity={0.7} />
                <Escena3D
                  nodos={nodosVisibles}
                  posicionBase={posicionBase}
                  resumenPorNodo={resumenPorNodo}
                  resaltarId={resaltarId}
                  mostrarGrilla={mostrarGrilla}
                  controlsRef={controlsRef}
                  onMover={(tipo, id, x, y, posZ, altura) =>
                    moverMut.mutate({
                      tipo,
                      nodoId: id,
                      pos: { pos_x: x, pos_y: y, pos_z: posZ, altura },
                    })
                  }
                  onSeleccionar={(id) => setSeleccionadoId(id)}
                />
              </Canvas>
            </div>
            <NodoSeleccionadoPanel
              nodo={seleccionado}
              onCerrar={() => setSeleccionadoId(null)}
              onGuardarPosicion={guardarPosicionSeleccionado}
              guardandoPosicion={moverMut.isPending}
            />
          </div>
        </div>
      )}
    </>
  );
}

interface EstadoArrastre {
  id: string;
  tipo: TipoNodo;
  posZ: number | null;
  altura: number | null;
  plano: Plane;
  startClientX: number;
  startClientY: number;
  movidoPx: number;
  actualX: number;
  actualY: number;
}

function Escena3D({
  nodos,
  posicionBase,
  resumenPorNodo,
  resaltarId,
  mostrarGrilla,
  controlsRef,
  onMover,
  onSeleccionar,
}: {
  nodos: NodoMapa[];
  posicionBase: Map<string, { x: number; y: number }>;
  resumenPorNodo: Map<string, ResumenNodo>;
  resaltarId?: string | null;
  mostrarGrilla: boolean;
  /** Tipo interno de drei/three-stdlib; no vale la pena importarlo solo para el ref. */
  controlsRef: RefObject<any>;
  onMover: (
    tipo: TipoNodo,
    id: string,
    x: number,
    y: number,
    posZ: number | null,
    altura: number | null,
  ) => void;
  onSeleccionar: (id: string) => void;
}) {
  const { camera, gl, raycaster } = useThree();
  const [posOverride, setPosOverride] = useState<Record<string, { x: number; y: number }>>({});
  const [arrastrando, setArrastrando] = useState(false);
  const arrastre = useRef<EstadoArrastre | null>(null);
  const centradoHecho = useRef(false);

  const posicionDe = (id: string) => posOverride[id] ?? posicionBase.get(id) ?? { x: 0, y: 0 };

  // Centra la cámara sobre el nodo de `?resaltar=<id>` una sola vez.
  useEffect(() => {
    if (!resaltarId || centradoHecho.current) return;
    const pos = posicionBase.get(resaltarId);
    if (!pos || !controlsRef.current) return;
    centradoHecho.current = true;
    controlsRef.current.target.set(pos.x * ESCALA_3D, 0, pos.y * ESCALA_3D);
    controlsRef.current.update();
  }, [resaltarId, posicionBase, controlsRef]);

  // Arrastre: se resuelve con matemática de rayo/plano directamente (no vía
  // el sistema de eventos de R3F sobre el propio nodo) para que el cálculo
  // sea correcto incluso cuando el cursor se mueve fuera de la silueta del
  // nodo en pantalla — el patrón estándar de "arrastrar sobre un plano" en
  // three.js.
  useEffect(() => {
    const dom = gl.domElement;

    const onMove = (e: PointerEvent) => {
      const est = arrastre.current;
      if (!est) return;
      const rect = dom.getBoundingClientRect();
      const ndc = new Vector2(
        ((e.clientX - rect.left) / rect.width) * 2 - 1,
        -((e.clientY - rect.top) / rect.height) * 2 + 1,
      );
      raycaster.setFromCamera(ndc, camera);
      const punto = new Vector3();
      if (!raycaster.ray.intersectPlane(est.plano, punto)) return;
      est.movidoPx = Math.max(
        est.movidoPx,
        Math.hypot(e.clientX - est.startClientX, e.clientY - est.startClientY),
      );
      est.actualX = punto.x / ESCALA_3D;
      est.actualY = punto.z / ESCALA_3D;
      setPosOverride((prev) => ({ ...prev, [est.id]: { x: est.actualX, y: est.actualY } }));
    };

    const onUp = () => {
      const est = arrastre.current;
      if (!est) return;
      arrastre.current = null;
      setArrastrando(false);
      if (est.movidoPx >= UMBRAL_CLIC_PX) {
        onMover(
          est.tipo,
          est.id,
          Math.round(est.actualX),
          Math.round(est.actualY),
          est.posZ,
          est.altura,
        );
      }
    };

    dom.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    return () => {
      dom.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };
  }, [camera, gl, raycaster, onMover]);

  const iniciarArrastre = (e: ThreeEvent<PointerEvent>, n: NodoMapa) => {
    e.stopPropagation();
    onSeleccionar(n.id);
    const pos = posicionDe(n.id);
    const y = n.pos_z ?? 0;
    arrastre.current = {
      id: n.id,
      tipo: n.tipo,
      posZ: n.pos_z,
      altura: n.altura,
      // Plano horizontal a la altura base del nodo (normal +Y, a distancia y del origen).
      plano: new Plane(new Vector3(0, 1, 0), -y),
      startClientX: e.nativeEvent.clientX,
      startClientY: e.nativeEvent.clientY,
      movidoPx: 0,
      actualX: pos.x,
      actualY: pos.y,
    };
    setArrastrando(true);
  };

  return (
    <>
      <OrbitControls ref={controlsRef} enabled={!arrastrando} makeDefault />
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[30, -0.01, 30]}>
        <planeGeometry args={[80, 80]} />
        <meshStandardMaterial color="#e8e4dd" />
      </mesh>
      {mostrarGrilla ? (
        <gridHelper args={[80, 40, "#c9c2b8", "#e2ddd3"]} position={[30, 0.001, 30]} />
      ) : null}
      {nodos.map((n) => {
        const pos = posicionDe(n.id);
        const ancho = ANCHO_NODO[n.tipo] * ESCALA_3D;
        const profundidad = ALTO_NODO[n.tipo] * ESCALA_3D;
        const altura = n.altura ?? ALTURA_DEFECTO[n.tipo];
        const base = n.pos_z ?? 0;
        const resaltado = n.id === resaltarId;
        const resumen = resumenPorNodo.get(n.id);
        const centro: [number, number, number] = [
          pos.x * ESCALA_3D + ancho / 2,
          base + altura / 2,
          pos.y * ESCALA_3D + profundidad / 2,
        ];
        return (
          <mesh key={n.id} position={centro} onPointerDown={(e) => iniciarArrastre(e, n)}>
            <boxGeometry args={[ancho, altura, profundidad]} />
            <meshStandardMaterial
              color={resolverColorCss(colorOcupacion(n.ocupacion))}
              emissive={resaltado ? "#B7410E" : "#000000"}
              emissiveIntensity={resaltado ? 0.5 : 0}
            />
            <Html position={[0, altura / 2 + 0.12, 0]} center distanceFactor={18} sprite>
              <div className="mapa-almacen-3d__etiqueta">
                <span>{n.codigo}</span>
                {resumen && resumen.productosDistintos > 0 ? (
                  <span className="mapa-almacen-3d__sku">{resumen.productosDistintos} SKU</span>
                ) : null}
              </div>
            </Html>
          </mesh>
        );
      })}
    </>
  );
}
