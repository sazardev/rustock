import { useEffect, useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { Matrix4, Quaternion, Vector3, type Camera } from "three";
import type { NodoMapa } from "../../mapa-almacen-datos";
import type { CeldaRack } from "../../mapa/celdas/derivarCeldasRack";
import type { InfoCelda } from "../../mapa/celdas/infoCeldas";
import { M_POR_UNIDAD } from "../../mapa/unidades";
import type { ControlsRef, PosicionXY } from "../tipos";
import { calcularAparicion } from "./aparicion";
import { soltarBloqueo } from "./bloqueoRaton";
import { construirEscenario, moverConColision, resolverPosicion } from "./colisionesCaminata";
import {
  ALCANCE_MIRADA_CM,
  DESCUENTO_OJOS_CM,
  DURACION_SALIDA_S,
  FACTOR_AGACHADO,
  PERIODO_CONSULTA_S,
  RADIO_CUERPO_CM,
  SUAVIZADO_OJOS,
} from "./constantesCaminata";
import { consultarMirada, racksParaConsulta } from "./consultaMirada";
import { leerMando } from "./leerMando";
import {
  acercarVelocidad,
  intencionDe,
  limitarCabeceo,
  velocidadObjetivo,
} from "./movimientoCaminata";
import type { PropsEscenaCaminata, TelemetriaCaminata } from "./tiposCaminata";
import { publicarEscenario } from "./utilidadPruebas";
import { useMiradaRaton } from "./useMiradaRaton";
import { useTecladoCaminata } from "./useTecladoCaminata";

export interface PropsControladorCaminata extends PropsEscenaCaminata {
  nodos: NodoMapa[];
  posicionBase: Map<string, PosicionXY>;
  celdasPorRack: Map<string, CeldaRack[]>;
  infoCeldas: Map<string, InfoCelda>;
  seleccionId: string | null;
  controlsRef: ControlsRef;
}

interface PoseGuardada {
  posicion: Vector3;
  objetivo: Vector3;
}

/** Giro equivalente dentro de (-PI, PI]: el yaw acumulado no crece sin fin. */
const envolver = (a: number) => Math.atan2(Math.sin(a), Math.cos(a));
const suavizar = (u: number) => u * u * (3 - 2 * u);

/** Bucle de la caminata dentro del Canvas: lee la entrada, mueve al caminante
 * con colisión y coloca la cámara a la altura de sus ojos. Al montarse guarda
 * la pose previa; al salir la restaura con una transición. No pinta nada. */
export function ControladorCaminata(p: PropsControladorCaminata) {
  const { camera, gl, invalidate } = useThree();
  const { entrada, telemetria, controlsRef } = p;
  const escenario = useMemo(
    () => construirEscenario(p.nodos, p.posicionBase),
    [p.nodos, p.posicionBase],
  );
  const racks = useMemo(
    () => racksParaConsulta(p.nodos, p.posicionBase, p.celdasPorRack),
    [p.nodos, p.posicionBase, p.celdasPorRack],
  );
  const ojosBase = p.alturaPersonaCm - DESCUENTO_OJOS_CM;

  // Estado del caminante y pose previa, calculados una vez al entrar.
  const inicio = useRef<ReturnType<typeof iniciar> | null>(null);
  inicio.current ??= iniciar(p, camera.position, controlsRef, escenario, ojosBase);
  const s = inicio.current;
  const consulta = useRef(0);

  useEffect(() => {
    publicarEscenario(escenario);
    return () => publicarEscenario(null);
  }, [escenario]);
  useTecladoCaminata(entrada);
  useMiradaRaton(gl.domElement, entrada, p.sensibilidad, p.conBloqueo);

  useFrame((_, delta) => {
    const dt = Math.min(delta, 0.1);
    if (s.saliendo) {
      avanzarSalida(s, dt, camera, controlsRef.current, telemetria, p.onSalio, invalidate);
      return;
    }
    if (entrada.salir) {
      s.saliendo = true;
      s.desde = { posicion: camera.position.clone(), rotacion: camera.quaternion.clone() };
      soltarBloqueo();
      p.onSaliendo();
      return;
    }
    leerMando(entrada, dt);
    s.yaw = envolver(s.yaw + entrada.mirada.yaw);
    s.pitch = limitarCabeceo(s.pitch + entrada.mirada.pitch);
    entrada.mirada.yaw = 0;
    entrada.mirada.pitch = 0;

    const intencion = intencionDe(entrada);
    acercarVelocidad(s.v, velocidadObjetivo(intencion, s.yaw), dt);
    moverConColision(s.pos, s.v.x * dt, s.v.z * dt, RADIO_CUERPO_CM, escenario);
    const ojosMeta = ojosBase * (intencion.agachar ? FACTOR_AGACHADO : 1);
    s.ojos += (ojosMeta - s.ojos) * (1 - Math.exp(-SUAVIZADO_OJOS * dt));

    camera.position.set(s.pos.x * M_POR_UNIDAD, s.ojos * M_POR_UNIDAD, s.pos.z * M_POR_UNIDAD);
    camera.rotation.set(s.pitch, s.yaw, 0, "YXZ");

    telemetria.activa = true;
    telemetria.xCm = s.pos.x;
    telemetria.zCm = s.pos.z;
    telemetria.yaw = s.yaw;
    telemetria.pitch = s.pitch;
    telemetria.alturaOjosCm = s.ojos;
    telemetria.velocidadCms = Math.hypot(s.v.x, s.v.z);
    telemetria.agachado = intencion.agachar;
    telemetria.corriendo = intencion.correr;
    telemetria.bloqueado = document.pointerLockElement === gl.domElement;

    consulta.current += dt;
    if (consulta.current >= PERIODO_CONSULTA_S) {
      consulta.current = 0;
      telemetria.objetivo = consultarMirada(
        rayoDesde(s, camera.position),
        racks,
        p.infoCeldas,
        ALCANCE_MIRADA_CM,
      );
    }
  });
  return null;
}

function iniciar(
  p: PropsControladorCaminata,
  camaraPos: Vector3,
  controlsRef: ControlsRef,
  escenario: ReturnType<typeof construirEscenario>,
  ojosBase: number,
) {
  const controles = controlsRef.current;
  const pose: PoseGuardada = {
    posicion: camaraPos.clone(),
    objetivo: controles ? controles.target.clone() : new Vector3(),
  };
  const ap = calcularAparicion(p.nodos, p.posicionBase, p.seleccionId, {
    x: camaraPos.x / M_POR_UNIDAD,
    z: camaraPos.z / M_POR_UNIDAD,
  });
  const pos = { x: ap.x, z: ap.z };
  resolverPosicion(pos, RADIO_CUERPO_CM, escenario);
  return {
    pose,
    pos,
    v: { x: 0, z: 0 },
    yaw: ap.yaw,
    pitch: 0,
    ojos: ojosBase,
    saliendo: false,
    t: 0,
    desde: null as { posicion: Vector3; rotacion: Quaternion } | null,
  };
}

type EstadoCaminante = ReturnType<typeof iniciar>;

function rayoDesde(s: EstadoCaminante, ojos: Vector3) {
  const c = Math.cos(s.pitch);
  return {
    ox: ojos.x / M_POR_UNIDAD,
    oy: ojos.y / M_POR_UNIDAD,
    oz: ojos.z / M_POR_UNIDAD,
    dx: -Math.sin(s.yaw) * c,
    dy: Math.sin(s.pitch),
    dz: -Math.cos(s.yaw) * c,
  };
}

/** Vuelve la cámara a la pose previa con ease y devuelve el control a la órbita. */
function avanzarSalida(
  s: EstadoCaminante,
  dt: number,
  camera: Camera,
  controles: { target: Vector3; update: () => void } | null,
  telemetria: TelemetriaCaminata,
  onSalio: () => void,
  invalidate: () => void,
) {
  s.t += dt;
  const u = Math.min(1, s.t / DURACION_SALIDA_S);
  const k = suavizar(u);
  const desde = s.desde;
  if (desde) {
    const meta = new Matrix4().lookAt(s.pose.posicion, s.pose.objetivo, new Vector3(0, 1, 0));
    const qMeta = new Quaternion().setFromRotationMatrix(meta);
    camera.position.lerpVectors(desde.posicion, s.pose.posicion, k);
    camera.quaternion.slerpQuaternions(desde.rotacion, qMeta, k);
  }
  telemetria.velocidadCms = 0;
  if (u < 1) {
    return;
  }
  camera.rotation.order = "XYZ";
  camera.position.copy(s.pose.posicion);
  if (controles) {
    controles.target.copy(s.pose.objetivo);
    controles.update();
  }
  telemetria.activa = false;
  invalidate();
  onSalio();
}
