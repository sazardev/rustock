import { useCallback, useEffect, useMemo, useRef, useState, type RefObject } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Canvas, type ThreeEvent, useThree } from "@react-three/fiber";
import { Html, OrbitControls } from "@react-three/drei";
import { Plane, Vector2, Vector3 } from "three";
import { useParams, useSearchParams } from "react-router";
import {
  crearEnMapa,
  desactivarPasillo,
  desactivarRack,
  desactivarZona,
  obtenerAlmacen,
  type NodoCreado,
} from "../shared/backend";
import { Button, ButtonLink, ErrorPanel, Link, PageHeader, Text, useToast } from "../shared/ui";
import { mensajeError } from "../shared/format";
import { almacenMapa } from "../app/route-paths";
import {
  ALTO_NODO,
  ANCHO_NODO,
  COLOR_NODO,
  colorOcupacion,
  type NodoMapa,
  otrosParaChoque,
  posicionPorDefecto,
  resolverColorCss,
  type ResumenNodo,
  type TipoNodo,
  useMapaAlmacenDatos,
  useMoverNodoMapa,
} from "./mapa-almacen-datos";
import {
  PASO_REJILLA,
  posicionLibreCercana,
  primerChoque,
  snap,
  solapeProhibido,
  sugerirPosicion,
} from "./mapa-geometria";
import {
  snapshotDe,
  useHistorialMapa,
  type MovimientoGrupo,
  type SnapshotPos,
} from "./use-historial-mapa";
import { useTema } from "../shared/tema";
import { NodoSeleccionadoPanel } from "./NodoSeleccionadoPanel";
import type { PosicionValores } from "../shared/posicion-form-card";

/** Preferencias de vista del 3D, por navegador (patrón de recientes del
 * command palette): qué etiquetas se ven y si la escena auto-rota. */
const PREFS_KEY = "rustock.mapa3d";
interface PrefsMapa3D {
  etiquetas: boolean;
  autoRotar: boolean;
}
const PREFS_DEFECTO: PrefsMapa3D = { etiquetas: true, autoRotar: false };

function leerPrefs(): PrefsMapa3D {
  if (typeof window === "undefined") return PREFS_DEFECTO;
  try {
    const crudo = window.localStorage.getItem(PREFS_KEY);
    return crudo ? { ...PREFS_DEFECTO, ...JSON.parse(crudo) } : PREFS_DEFECTO;
  } catch {
    return PREFS_DEFECTO;
  }
}

function guardarPrefs(prefs: PrefsMapa3D) {
  try {
    window.localStorage.setItem(PREFS_KEY, JSON.stringify(prefs));
  } catch {
    // localStorage lleno/bloqueado: la preferencia vive solo en la sesión.
  }
}

/** 1 unidad de escena 3D = 20 unidades de coordenada 2D (mismas proporciones
 * relativas que el mapa 2D, en una escena de tamaño manejable para la cámara). */
const ESCALA_3D = 0.05;
const UMBRAL_CLIC_PX = 4;
const CAMARA_INICIAL: [number, number, number] = [45, 45, 45];

/** Alturas por tipo (unidades de escena): la zona es plataforma delgada, el
 * pasillo un marcador de piso apenas más alto que la plataforma (es espacio
 * de tránsito, no una pared) y el rack la estructura alta. */
const ALTURA_DEFECTO: Record<TipoNodo, number> = {
  zona: 0.1,
  pasillo: 0.14,
  rack: 1.2,
  ubicacion: 0.4,
};

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

/** Detecta soporte WebGL ANTES de montar el `<Canvas>`: sin GPU/driver (VMs,
 * servidores, navegadores viejos) three.js no puede crear contexto y R3F
 * falla en silencio dejando un lienzo vacío — se avisa con error claro
 * (DESIGN §8.4) en vez de una página que parece rota. */
function tieneWebGL(): boolean {
  try {
    const prueba = document.createElement("canvas");
    return Boolean(prueba.getContext("webgl2") ?? prueba.getContext("webgl"));
  } catch {
    return false;
  }
}

export function AlmacenMapa3DPage() {
  const { id: almacenId } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const resaltarId = searchParams.get("resaltar");
  // Una sola detección por montaje: la capacidad WebGL no cambia en caliente.
  const [webglDisponible] = useState(tieneWebGL);
  const { nodos, cargando, resumenPorNodo } = useMapaAlmacenDatos(almacenId);
  const moverMut = useMoverNodoMapa();
  const hist = useHistorialMapa();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const crearMut = useMutation({
    mutationFn: crearEnMapa,
    onSuccess: (creado: NodoCreado) => {
      queryClient.invalidateQueries({ queryKey: ["mapa-almacen"] });
      setSeleccionadoId(creado.id);
      hist.registrar({
        kind: "creacion",
        tipo: creado.tipo,
        nodoId: creado.id,
        codigo: creado.codigo,
      });
      toast(`Duplicado como ${creado.codigo}.`, "success");
    },
    onError: (err) => toast(mensajeError(err), "error"),
  });

  const desactivarMut = useMutation({
    mutationFn: async ({ tipo, nodoId }: { tipo: TipoNodo; nodoId: string; codigo?: string }) => {
      if (tipo === "zona") await desactivarZona(nodoId);
      else if (tipo === "pasillo") await desactivarPasillo(nodoId);
      else await desactivarRack(nodoId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["mapa-almacen"] });
      setSeleccionadoId(null);
      toast("Elemento desactivado.", "success");
    },
    onError: (err) => toast(mensajeError(err), "error"),
  });
  const almacenQ = useQuery({
    queryKey: ["mapa-almacen", "almacen", almacenId],
    queryFn: () => obtenerAlmacen(almacenId!),
    enabled: !!almacenId,
  });

  const editorRef = useRef<HTMLDivElement>(null);
  /** Instancia de `OrbitControls` (drei/three-stdlib); se crea dentro del
   * `<Canvas>` pero el `ref` en sí se declara aquí para que la barra de
   * comandos (fuera del Canvas) pueda mover la cámara. */
  const controlsRef = useRef<any>(null);

  const [seleccionadoId, setSeleccionadoId] = useState<string | null>(resaltarId);
  /** Selección múltiple (Shift+clic): se mueven juntos con el mismo delta. */
  const [grupoIds, setGrupoIds] = useState<string[]>([]);

  const alternarGrupo = (id: string) => {
    setGrupoIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  /** Clic simple: selección de un nodo (reinicia el grupo) — estable para
   * efectos que lo consumen. */
  const alClicSimple = useCallback((id: string) => {
    setSeleccionadoId(id);
    setGrupoIds([id]);
  }, []);
  const [tiposVisibles, setTiposVisibles] = useState<Record<TipoNodo, boolean>>({
    zona: true,
    pasillo: true,
    rack: true,
    ubicacion: true,
  });
  const [mostrarGrilla, setMostrarGrilla] = useState(true);
  const [pantallaCompleta, setPantallaCompleta] = useState(false);
  const [prefs, setPrefs] = useState<PrefsMapa3D>(leerPrefs);
  const [alambre, setAlambre] = useState(false);
  const [caminando, setCaminando] = useState(false);
  const cambiarPref = (parcial: Partial<PrefsMapa3D>) => {
    setPrefs((prev) => {
      const siguiente = { ...prev, ...parcial };
      guardarPrefs(siguiente);
      return siguiente;
    });
  };

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

  /** Centro y distancia de encuadre del layout (en unidades de escena). */
  const centroYDistancia = (): { cx: number; cz: number; d: number } | null => {
    if (!controlsRef.current || posicionBase.size === 0) return null;
    const puntos = [...posicionBase.values()];
    const xs = puntos.map((p) => p.x * ESCALA_3D);
    const zs = puntos.map((p) => p.y * ESCALA_3D);
    const cx = (Math.min(...xs) + Math.max(...xs)) / 2;
    const cz = (Math.min(...zs) + Math.max(...zs)) / 2;
    const d =
      Math.max(Math.max(...xs) - Math.min(...xs), Math.max(...zs) - Math.min(...zs), 10) * 1.2 + 10;
    return { cx, cz, d };
  };

  const encuadrarTodo = () => {
    const c = centroYDistancia();
    const controls = controlsRef.current;
    if (!c || !controls) return;
    controls.target.set(c.cx, 0, c.cz);
    controls.object.position.set(c.cx + c.d, c.d, c.cz + c.d);
    controls.update();
  };

  /** Presets de cámara: isométrica 3/4, planta (cenital) y frente. */
  const irAVista = (vista: "iso" | "planta" | "frente") => {
    const c = centroYDistancia();
    const controls = controlsRef.current;
    if (!c || !controls) return;
    controls.target.set(c.cx, 0, c.cz);
    if (vista === "planta") {
      controls.object.position.set(c.cx, c.d, c.cz + 0.001);
    } else if (vista === "frente") {
      controls.object.position.set(c.cx, c.d * 0.15, c.cz + c.d);
    } else {
      controls.object.position.set(c.cx + c.d, c.d, c.cz + c.d);
    }
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
    const entry = {
      kind: "mover" as const,
      tipo: seleccionado.tipo,
      nodoId: seleccionado.id,
      antes: snapshotDe(seleccionado),
      despues: {
        pos_x: pos.pos_x,
        pos_y: pos.pos_y,
        pos_z: pos.pos_z,
        altura: pos.altura,
        ancho: pos.ancho ?? seleccionado.ancho,
        profundidad: pos.profundidad ?? seleccionado.profundidad,
      },
    };
    moverMut.mutate(
      {
        tipo: seleccionado.tipo,
        nodoId: seleccionado.id,
        pos: {
          pos_x: pos.pos_x,
          pos_y: pos.pos_y,
          pos_z: pos.pos_z,
          altura: pos.altura,
          ancho: pos.ancho ?? null,
          profundidad: pos.profundidad ?? null,
        },
      },
      { onSuccess: () => hist.registrar(entry) },
    );
  };

  /** El arrastre 3D confirma: registra el historial cuando el backend acepta. */
  const moverDesdeEscena = (
    tipo: TipoNodo,
    id: string,
    x: number,
    y: number,
    posZ: number | null,
    altura: number | null,
  ) => {
    const actual = nodos.find((n) => n.id === id);
    const entry = actual
      ? {
          kind: "mover" as const,
          tipo,
          nodoId: id,
          antes: snapshotDe(actual),
          despues: {
            pos_x: x,
            pos_y: y,
            pos_z: posZ,
            altura,
            ancho: actual.ancho,
            profundidad: actual.profundidad,
          },
        }
      : undefined;
    moverMut.mutate(
      { tipo, nodoId: id, pos: { pos_x: x, pos_y: y, pos_z: posZ, altura } },
      { onSuccess: entry ? () => hist.registrar(entry) : undefined },
    );
  };

  const alBloquear = (codigo: string) => {
    toast(`Movimiento bloqueado: se solaparía con ${codigo}.`, "error");
  };

  /** Guarda el movimiento grupal y lo registra como UNA entrada de historial. */
  const moverGrupoDesdeEscena = (movimientos: MovimientoGrupo[]) => {
    Promise.all(
      movimientos.map((m) =>
        moverMut
          .mutateAsync({
            tipo: m.tipo,
            nodoId: m.nodoId,
            pos: {
              pos_x: m.despues.pos_x ?? 0,
              pos_y: m.despues.pos_y ?? 0,
              pos_z: m.despues.pos_z,
              altura: m.despues.altura,
            },
          })
          .then(() => undefined),
      ),
    )
      .then(() => hist.registrar({ kind: "grupo", movimientos }))
      .catch((err) => toast(mensajeError(err), "error"));
  };

  /** Nudge grupal: flechas mueven TODA la selección; si cualquiera chocaría,
   * nadie se mueve. */
  const nudgear = (dx: number, dy: number) => {
    const miembros =
      grupoIds.length > 1
        ? nodos.filter((n) => grupoIds.includes(n.id))
        : nodos.filter((n) => n.id === seleccionadoId);
    if (miembros.length === 0) return;
    const movimientos: MovimientoGrupo[] = [];
    for (const m of miembros) {
      if (m.pos_x === null || m.pos_y === null) continue;
      const nx = m.pos_x + dx;
      const ny = m.pos_y + dy;
      const otros = otrosParaChoque(nodos).filter((o) => !miembros.some((x) => x.id === o.id));
      const choque = primerChoque(
        m.tipo,
        m.id,
        { x: nx, y: ny, ancho: m.ancho, profundo: m.profundidad },
        otros,
      );
      if (choque) {
        alBloquear(choque);
        return;
      }
      movimientos.push({
        tipo: m.tipo,
        nodoId: m.id,
        antes: snapshotDe(m),
        despues: {
          pos_x: nx,
          pos_y: ny,
          pos_z: m.pos_z,
          altura: m.altura,
          ancho: m.ancho,
          profundidad: m.profundidad,
        },
      });
    }
    if (movimientos.length === 0) return;
    if (movimientos.length === 1) {
      nudgearSingle(movimientos[0].despues, movimientos[0].tipo, movimientos[0].nodoId);
      return;
    }
    moverGrupoDesdeEscena(movimientos);
  };

  /** Nudge de un solo nodo vía la misma ruta de historial. */
  const nudgearSingle = (d: SnapshotPos, tipo: TipoNodo, nodoId: string) => {
    aplicarConHistorial(
      tipo,
      nodoId,
      { pos_x: d.pos_x ?? 0, pos_y: d.pos_y ?? 0, pos_z: d.pos_z, altura: d.altura },
      d,
    );
  };

  /** Aplica una transformación (mover/rotar/nudge) registrando historial. */
  const aplicarConHistorial = (
    tipo: TipoNodo,
    nodoId: string,
    pos: {
      pos_x: number;
      pos_y: number;
      pos_z: number | null;
      altura: number | null;
      ancho?: number;
      profundidad?: number;
    },
    despues: ReturnType<typeof snapshotDe>,
  ) => {
    const actual = nodos.find((n) => n.id === nodoId);
    moverMut.mutate(
      { tipo, nodoId, pos },
      {
        onSuccess: actual
          ? () =>
              hist.registrar({ kind: "mover", tipo, nodoId, antes: snapshotDe(actual), despues })
          : undefined,
      },
    );
  };

  /** Rotar 90° el seleccionado alrededor de su centro (tecla R). */
  const rotarSeleccionado = () => {
    if (!seleccionado || seleccionado.pos_x === null || seleccionado.pos_y === null) return;
    const cx = seleccionado.pos_x + seleccionado.ancho / 2;
    const cy = seleccionado.pos_y + seleccionado.profundidad / 2;
    const nx = cx - seleccionado.profundidad / 2;
    const ny = cy - seleccionado.ancho / 2;
    const choque = primerChoque(
      seleccionado.tipo,
      seleccionado.id,
      { x: nx, y: ny, ancho: seleccionado.profundidad, profundo: seleccionado.ancho },
      otrosParaChoque(nodos),
    );
    if (choque) {
      alBloquear(choque);
      return;
    }
    aplicarConHistorial(
      seleccionado.tipo,
      seleccionado.id,
      {
        pos_x: Math.round(nx),
        pos_y: Math.round(ny),
        pos_z: seleccionado.pos_z,
        altura: seleccionado.altura,
        ancho: seleccionado.profundidad,
        profundidad: seleccionado.ancho,
      },
      {
        pos_x: Math.round(nx),
        pos_y: Math.round(ny),
        pos_z: seleccionado.pos_z,
        altura: seleccionado.altura,
        ancho: seleccionado.profundidad,
        profundidad: seleccionado.ancho,
      },
    );
  };

  /** Enfocar (tecla F / doble clic): centra el target en el nodo conservando
   * la dirección de la cámara — el equivalente a "frame selected". */
  const enfocarNodo = (id: string) => {
    const controls = controlsRef.current;
    const n = nodos.find((x) => x.id === id);
    if (!controls || !n || n.pos_x === null || n.pos_y === null) return;
    const cx = (n.pos_x + n.ancho / 2) * ESCALA_3D;
    const cz = (n.pos_y + n.profundidad / 2) * ESCALA_3D;
    const diag = Math.max(n.ancho, n.profundidad) * ESCALA_3D;
    const d = Math.max(diag * 3, 14);
    const direccion = controls.object.position.clone().sub(controls.target).normalize();
    controls.target.set(cx, 0, cz);
    controls.object.position.set(
      cx + direccion.x * d,
      Math.max(direccion.y * d, d * 0.35),
      cz + direccion.z * d,
    );
    controls.update();
  };

  /** Duplicar (estilo Blender Shift+D): copia el elemento en un hueco libre
   * junto al original; la copia queda seleccionada y en el historial. */
  const duplicarSeleccionado = () => {
    if (!seleccionado || seleccionado.pos_x === null || seleccionado.pos_y === null) return;
    if (seleccionado.tipo === "ubicacion") {
      toast("Las ubicaciones se gestionan desde su catálogo.", "error");
      return;
    }
    const destino = posicionLibreCercana(
      seleccionado.tipo,
      seleccionado.ancho,
      seleccionado.profundidad,
      { x: seleccionado.pos_x + seleccionado.ancho + 20, y: seleccionado.pos_y },
      otrosParaChoque(nodos),
    ) ?? { x: seleccionado.pos_x, y: seleccionado.pos_y + seleccionado.profundidad + 20 };
    // La copia hereda la zona del original (donde sea que quepa el hueco).
    const zonaId = seleccionado.tipo === "zona" ? undefined : (seleccionado.zona_id ?? undefined);
    crearMut.mutate({
      tipo: seleccionado.tipo,
      almacen_id: almacenId ?? "",
      zona_id: zonaId,
      x: Math.round(destino.x),
      y: Math.round(destino.y),
      ancho: seleccionado.ancho,
      profundidad: seleccionado.profundidad,
    });
  };

  function deshacer() {
    const e = hist.deshacer();
    if (!e) return;
    if (e.kind === "creacion") {
      desactivarMut.mutate({ tipo: e.tipo, nodoId: e.nodoId, codigo: e.codigo });
      toast(`Creación deshecha: ${e.codigo || "elemento"} desactivado.`, "success");
      return;
    }
    if (e.kind === "grupo") {
      for (const m of e.movimientos) {
        moverMut.mutate({
          tipo: m.tipo,
          nodoId: m.nodoId,
          pos: {
            pos_x: m.antes.pos_x ?? 0,
            pos_y: m.antes.pos_y ?? 0,
            pos_z: m.antes.pos_z,
            altura: m.antes.altura,
            ancho: m.antes.ancho,
            profundidad: m.antes.profundidad,
          },
        });
      }
      toast(`Cambios deshechos (${e.movimientos.length} nodos).`, "success");
      return;
    }
    moverMut.mutate({
      tipo: e.tipo,
      nodoId: e.nodoId,
      pos: {
        pos_x: e.antes.pos_x ?? 0,
        pos_y: e.antes.pos_y ?? 0,
        pos_z: e.antes.pos_z,
        altura: e.antes.altura,
        ancho: e.antes.ancho,
        profundidad: e.antes.profundidad,
      },
    });
    toast("Cambio deshecho.", "success");
  }

  function rehacer() {
    const e = hist.rehacer();
    if (!e) return;
    if (e.kind === "grupo") {
      for (const m of e.movimientos) {
        moverMut.mutate({
          tipo: m.tipo,
          nodoId: m.nodoId,
          pos: {
            pos_x: m.despues.pos_x ?? 0,
            pos_y: m.despues.pos_y ?? 0,
            pos_z: m.despues.pos_z,
            altura: m.despues.altura,
            ancho: m.despues.ancho,
            profundidad: m.despues.profundidad,
          },
        });
      }
      toast(`Cambios rehechos (${e.movimientos.length} nodos).`, "success");
      return;
    }
    if (e.kind !== "mover") return;
    moverMut.mutate({
      tipo: e.tipo,
      nodoId: e.nodoId,
      pos: {
        pos_x: e.despues.pos_x ?? 0,
        pos_y: e.despues.pos_y ?? 0,
        pos_z: e.despues.pos_z,
        altura: e.despues.altura,
        ancho: e.despues.ancho,
        profundidad: e.despues.profundidad,
      },
    });
    toast("Cambio rehecho.", "success");
  }

  const ALTURA_OJOS = 1.7;

  /** Modo caminar: cámara a la altura de los ojos; WASD desplaza cámara y
   * target juntos en la dirección en la que miras (estilo recorrer). */
  const alternarCaminar = () => {
    const controls = controlsRef.current;
    if (!controls) return;
    if (!caminando) {
      const c = centroYDistancia();
      const cx = c?.cx ?? 15;
      const cz = c?.cz ?? 15;
      controls.target.set(cx, 1, cz);
      controls.object.position.set(cx, ALTURA_OJOS, cz + 14);
      controls.update();
      setCaminando(true);
      toast("Caminando: WASD te mueve, Esc para salir.", "success");
    } else {
      setCaminando(false);
      encuadrarTodo();
    }
  };

  const deshacerRef = useRef(deshacer);
  deshacerRef.current = deshacer;
  const rehacerRef = useRef(rehacer);
  rehacerRef.current = rehacer;
  const nudgearRef = useRef(nudgear);
  nudgearRef.current = nudgear;
  const rotarRef = useRef(rotarSeleccionado);
  rotarRef.current = rotarSeleccionado;
  const duplicarRef = useRef(duplicarSeleccionado);
  duplicarRef.current = duplicarSeleccionado;
  const enfocarRef = useRef(enfocarNodo);
  enfocarRef.current = enfocarNodo;
  const caminarRef = useRef(alternarCaminar);
  caminarRef.current = alternarCaminar;
  const caminandoRef = useRef(caminando);
  caminandoRef.current = caminando;
  // Atajos estilo editor 3D: Ctrl+Z/Y historial; flechas nudge; R rotar;
  // F enfocar; Shift+D duplicar; Z alambre; Esc deselecciona (su propio efecto).
  useEffect(() => {
    const onKeyDown = (ev: KeyboardEvent) => {
      if (esCampoDeTexto(ev.target)) return;
      const k = ev.key.toLowerCase();
      // Mientras caminas: WASD desplaza (dirección de la mirada), Esc sale.
      if (caminandoRef.current) {
        const controles = controlsRef.current;
        if (!controles) return;
        if (k === "escape") {
          caminarRef.current();
          return;
        }
        const paso = 5;
        const adelante = new Vector3().subVectors(controles.target, controles.object.position);
        adelante.y = 0;
        if (adelante.lengthSq() === 0) return;
        adelante.normalize();
        const derecha = new Vector3().crossVectors(adelante, new Vector3(0, 1, 0)).normalize();
        let delta: Vector3 | null = null;
        if (k === "w") delta = adelante.multiplyScalar(paso);
        else if (k === "s") delta = adelante.multiplyScalar(-paso);
        else if (k === "d") delta = derecha.multiplyScalar(paso);
        else if (k === "a") delta = derecha.multiplyScalar(-paso);
        if (delta) {
          ev.preventDefault();
          controles.target.add(delta);
          controles.object.position.add(delta);
          controles.update();
        }
        return;
      }
      if (ev.ctrlKey || ev.metaKey) {
        if (ev.altKey) return;
        if (k === "z") {
          ev.preventDefault();
          if (ev.shiftKey) rehacerRef.current();
          else deshacerRef.current();
        } else if (k === "y") {
          ev.preventDefault();
          rehacerRef.current();
        }
        return;
      }
      if (ev.shiftKey && k === "d") {
        ev.preventDefault();
        duplicarRef.current();
        return;
      }
      if (ev.shiftKey) return;
      if (k === "arrowleft") {
        ev.preventDefault();
        nudgearRef.current(-PASO_REJILLA, 0);
      } else if (k === "arrowright") {
        ev.preventDefault();
        nudgearRef.current(PASO_REJILLA, 0);
      } else if (k === "arrowup") {
        ev.preventDefault();
        nudgearRef.current(0, -PASO_REJILLA);
      } else if (k === "arrowdown") {
        ev.preventDefault();
        nudgearRef.current(0, PASO_REJILLA);
      } else if (k === "r") {
        ev.preventDefault();
        rotarRef.current();
      } else if (k === "f") {
        ev.preventDefault();
        if (seleccionadoId) enfocarRef.current(seleccionadoId);
      } else if (k === "z") {
        ev.preventDefault();
        setAlambre((v) => !v);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [seleccionadoId]);

  // Estados de carga/vacío/WebGL: página normal dentro del shell.
  if (cargando || nodos.length === 0 || !webglDisponible) {
    return (
      <>
        <PageHeader
          title="Mapa 3D"
          description="Arrastra sobre el piso para reposicionar, rota/haz zoom con el mouse, o selecciona un nodo para ver y editar sus detalles."
          actions={
            <ButtonLink variant="ghost" icon="ubicacion" href={almacenMapa(almacenId ?? "")}>
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
          <ErrorPanel title="El mapa 3D requiere WebGL">
            Este equipo o navegador no pudo crear un contexto WebGL (sin aceleración gráfica o
            driver sin soporte). El mapa 2D ofrece las mismas posiciones y ediciones:{" "}
            <Link href={almacenMapa(almacenId ?? "")}>abrir el mapa 2D</Link>.
          </ErrorPanel>
        )}
      </>
    );
  }

  // Editor inmersivo estilo Figma/Blender: el lienzo ocupa toda la ventana y
  // la UI (barra superior + panel del nodo) flota encima, estática.
  return (
    <div ref={editorRef} className="mapa3d-full">
      <div className="mapa3d-full__lienzo">
        <Canvas
          camera={{ position: CAMARA_INICIAL, fov: 45 }}
          frameloop={prefs.autoRotar ? "always" : "demand"}
        >
          <ambientLight intensity={0.7} />
          <directionalLight position={[30, 40, 20]} intensity={0.7} />
          <Escena3D
            nodos={nodosVisibles}
            posicionBase={posicionBase}
            resumenPorNodo={resumenPorNodo}
            resaltarId={resaltarId}
            seleccionId={seleccionadoId}
            grupoIds={grupoIds}
            onAlternarGrupo={alternarGrupo}
            onClicSimple={alClicSimple}
            mostrarGrilla={mostrarGrilla}
            mostrarEtiquetas={prefs.etiquetas}
            autoRotar={prefs.autoRotar}
            alambre={alambre}
            controlsRef={controlsRef}
            onMover={moverDesdeEscena}
            onMoverGrupo={moverGrupoDesdeEscena}
            onBloquear={alBloquear}
            onEnfocar={enfocarNodo}
            onSeleccionar={(id) => {
              setSeleccionadoId(id);
              if (id === null) setGrupoIds([]);
            }}
          />
        </Canvas>
      </div>
      <div className="mapa3d-full__barra">
        <div className="mapa3d-full__grupo">
          <ButtonLink
            variant="secondary"
            size="sm"
            icon="atras"
            href={almacenMapa(almacenId ?? "")}
          >
            Mapa 2D
          </ButtonLink>
          <span className="mapa3d-full__titulo">
            Mapa 3D{almacenQ.data ? ` — ${almacenQ.data.codigo}` : ""}
          </span>
        </div>
        <div className="mapa3d-full__grupo mapa3d-full__herramientas">
          <Button
            variant="ghost"
            size="sm"
            icon="deshacer"
            disabled={!hist.puedeDeshacer || moverMut.isPending}
            onClick={deshacer}
          >
            Deshacer
          </Button>
          <Button
            variant="ghost"
            size="sm"
            icon="rehacer"
            disabled={!hist.puedeRehacer || moverMut.isPending}
            onClick={rehacer}
          >
            Rehacer
          </Button>
          <Button variant="ghost" size="sm" icon="encuadrar" onClick={encuadrarTodo}>
            Encuadrar todo
          </Button>
          <Button variant="ghost" size="sm" icon="refrescar" onClick={resetearVista}>
            Resetear vista
          </Button>
          <Button variant="ghost" size="sm" onClick={() => irAVista("iso")}>
            Isométrica
          </Button>
          <Button variant="ghost" size="sm" onClick={() => irAVista("planta")}>
            Planta
          </Button>
          <Button variant="ghost" size="sm" onClick={() => irAVista("frente")}>
            Frente
          </Button>
          <Button
            variant={prefs.etiquetas ? "secondary" : "ghost"}
            size="sm"
            icon="nota"
            onClick={() => cambiarPref({ etiquetas: !prefs.etiquetas })}
          >
            Etiquetas
          </Button>
          <Button
            variant={prefs.autoRotar ? "secondary" : "ghost"}
            size="sm"
            icon="rotar"
            onClick={() => cambiarPref({ autoRotar: !prefs.autoRotar })}
          >
            Auto-rotar
          </Button>
          <Button
            variant={caminando ? "secondary" : "ghost"}
            size="sm"
            icon="caminar"
            onClick={alternarCaminar}
          >
            {caminando ? "Salir de caminar" : "Caminar"}
          </Button>
          <Button
            variant={mostrarGrilla ? "secondary" : "ghost"}
            size="sm"
            icon="cuadricula"
            onClick={() => setMostrarGrilla((v) => !v)}
          >
            Cuadrícula
          </Button>
          <Button
            variant={alambre ? "secondary" : "ghost"}
            size="sm"
            icon="alambre"
            onClick={() => setAlambre((v) => !v)}
          >
            Alambre
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
          >
            {pantallaCompleta ? "Salir" : "Pantalla completa"}
          </Button>
        </div>
      </div>
      {caminando ? (
        <div className="mapa3d-full__aviso">
          Caminando — WASD te mueve · arrastrar para mirar · Esc para salir
        </div>
      ) : null}
      <div className="mapa3d-full__panel">
        <NodoSeleccionadoPanel
          nodo={seleccionado}
          onCerrar={() => setSeleccionadoId(null)}
          onGuardarPosicion={guardarPosicionSeleccionado}
          guardandoPosicion={moverMut.isPending || crearMut.isPending}
          onDuplicar={duplicarSeleccionado}
          duplicando={crearMut.isPending}
        />
      </div>
    </div>
  );
}

interface NodoArrastre {
  id: string;
  tipo: TipoNodo;
  inicioX: number;
  inicioY: number;
  posZ: number | null;
  altura: number | null;
  /** Agarre: distancia esquina↔cursor al agarrar (el nodo va "pegado"). */
  offsetX: number;
  offsetY: number;
  /** Posición final en vivo (se escribe en cada movimiento del gesto). */
  actualX: number;
  actualY: number;
}

interface EstadoArrastre {
  grupo: NodoArrastre[];
  plano: Plane;
  startClientX: number;
  startClientY: number;
  movidoPx: number;
}

/** Tamaño real desde BD con fallback a las constantes históricas. */
const tamRealDe = (n: NodoMapa) => ({
  ancho: typeof n.ancho === "number" && n.ancho > 0 ? n.ancho : ANCHO_NODO[n.tipo],
  profundo:
    typeof n.profundidad === "number" && n.profundidad > 0 ? n.profundidad : ALTO_NODO[n.tipo],
});

/** Tinte emissive del nodo: resaltado por deep-link gana; luego el semáforo
 * del arrastre (rojo si chocaría, verde si puede soltar); durante un gesto,
 * los obstáculos (par prohibido con lo arrastrado) brillan rojo tenue para
 * mostrar qué NO se puede pisar; resto apagado. */
function tinteDe(
  resaltado: boolean,
  enArrastre: boolean,
  choque: string | null,
  obstaculo: boolean,
): string {
  if (resaltado) return "--color-blue-500";
  if (choque) return "--color-danger-500";
  if (enArrastre) return "--color-success-500";
  if (obstaculo) return "--color-danger-500";
  return "#000000";
}

function intensidadDe(
  resaltado: boolean,
  enArrastre: boolean,
  choque: string | null,
  obstaculo: boolean,
): number {
  if (resaltado) return 0.5;
  if (choque || enArrastre) return 0.45;
  if (obstaculo) return 0.28;
  return 0;
}

function Escena3D({
  nodos,
  posicionBase,
  resumenPorNodo,
  resaltarId,
  mostrarGrilla,
  mostrarEtiquetas,
  autoRotar,
  alambre,
  controlsRef,
  seleccionId,
  grupoIds,
  onAlternarGrupo,
  onClicSimple,
  onMover,
  onMoverGrupo,
  onBloquear,
  onEnfocar,
  onSeleccionar,
}: {
  nodos: NodoMapa[];
  posicionBase: Map<string, { x: number; y: number }>;
  resumenPorNodo: Map<string, ResumenNodo>;
  resaltarId?: string | null;
  seleccionId?: string | null;
  mostrarGrilla: boolean;
  mostrarEtiquetas: boolean;
  autoRotar: boolean;
  /** Vista de alambre (tecla Z): prismas como rejillas técnicas. */
  alambre: boolean;
  /** Selección múltiple (Shift+clic): se mueven juntos. */
  grupoIds: string[];
  onAlternarGrupo: (id: string) => void;
  /** Clic simple (sin shift, sin arrastre): selección de un nodo — reinicia
   * el grupo a solo ese nodo (semántica Blender). */
  onClicSimple: (id: string) => void;
  onMoverGrupo: (movimientos: MovimientoGrupo[]) => void;
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
  /** El drop chocaría con un par prohibido: no se guarda nada y el nodo
   * vuelve a su lugar (misma semántica que el mapa 2D). */
  onBloquear: (codigo: string) => void;
  /** Doble clic sobre un nodo: enfocarlo (frame selected). */
  onEnfocar: (id: string) => void;
  onSeleccionar: (id: string | null) => void;
}) {
  const { camera, gl, raycaster } = useThree();
  // Suscripción al tema: al cambiar paleta/modo el componente re-renderiza y
  // la paleta resuelta (getComputedStyle) se refresca en el acto.
  useTema((s) => s.tema);
  const [posOverride, setPosOverride] = useState<Record<string, { x: number; y: number }>>({});
  const [arrastrando, setArrastrando] = useState(false);
  const arrastre = useRef<EstadoArrastre | null>(null);
  const centradoHecho = useRef(false);
  // Paleta de la escena resuelta UNA vez por render (getComputedStyle por
  // nodo en cada render era despilfarro; aquí son 4 consultas fijas).
  const coloresNodo: Record<TipoNodo, string> = {
    zona: resolverColorCss(COLOR_NODO.zona),
    pasillo: resolverColorCss(COLOR_NODO.pasillo),
    rack: resolverColorCss(COLOR_NODO.rack),
    ubicacion: resolverColorCss(COLOR_NODO.ubicacion),
  };

  const posicionDe = (id: string) => posOverride[id] ?? posicionBase.get(id) ?? { x: 0, y: 0 };

  // Asistente de depuración: proyecta coordenadas del plano a pantalla para
  // pruebas E2E determinísticas (solo expone un proyector de coordenadas).
  useEffect(() => {
    console.debug("[rustock3d] asistente de depuración instalado");
    const w = window as unknown as {
      rustock3dDepur?: { proyectar: (x: number, y: number) => [number, number] };
    };
    w.rustock3dDepur = {
      proyectar: (xSvg: number, ySvg: number) => {
        const v = new Vector3(xSvg * ESCALA_3D, 0, ySvg * ESCALA_3D).project(camera);
        const rect = gl.domElement.getBoundingClientRect();
        return [
          Math.round(rect.left + ((v.x + 1) / 2) * rect.width),
          Math.round(rect.top + ((1 - v.y) / 2) * rect.height),
        ];
      },
    };
  }, [camera, gl]);

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
      // Cada nodo conserva su punto de agarre (delta común del gesto) con
      // snap RELATIVO a su posición de partida: soltar donde estaba cae
      // EXACTO aunque no esté alineado a la rejilla.
      const overrides: Record<string, { x: number; y: number }> = {};
      for (const g of est.grupo) {
        let ax = punto.x / ESCALA_3D + g.offsetX;
        let ay = punto.z / ESCALA_3D + g.offsetY;
        if (mostrarGrilla) {
          ax = g.inicioX + snap(ax - g.inicioX);
          ay = g.inicioY + snap(ay - g.inicioY);
        }
        g.actualX = ax;
        g.actualY = ay;
        overrides[g.id] = { x: ax, y: ay };
      }
      setPosOverride((prev) => ({ ...prev, ...overrides }));
    };

    const onUp = () => {
      const est = arrastre.current;
      if (!est) return;
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
      // Semáforo en cliente para TODO el grupo (misma matriz que el backend):
      // si cualquiera chocaría, nadie se mueve y no se guarda nada.
      const idsGrupo = new Set(est.grupo.map((g) => g.id));
      const otros = otrosParaChoque(nodos).filter((o) => !idsGrupo.has(o.id));
      const movimientos: MovimientoGrupo[] = [];
      for (const g of est.grupo) {
        const nodoG = nodos.find((n) => n.id === g.id);
        const tam = nodoG ? tamRealDe(nodoG) : { ancho: 0, profundo: 0 };
        const choque = primerChoque(
          g.tipo,
          g.id,
          { x: g.actualX, y: g.actualY, ancho: tam.ancho, profundo: tam.profundo },
          otros,
        );
        if (choque) {
          setPosOverride((prev) => {
            const copia = { ...prev };
            for (const id of idsGrupo) delete copia[id];
            return copia;
          });
          onBloquear(choque);
          return;
        }
        movimientos.push({
          tipo: g.tipo,
          nodoId: g.id,
          antes: {
            pos_x: g.inicioX,
            pos_y: g.inicioY,
            pos_z: g.posZ,
            altura: g.altura,
            ancho: tam.ancho,
            profundidad: tam.profundo,
          },
          despues: {
            pos_x: Math.round(g.actualX),
            pos_y: Math.round(g.actualY),
            pos_z: g.posZ,
            altura: g.altura,
            ancho: tam.ancho,
            profundidad: tam.profundo,
          },
        });
      }
      if (movimientos.length === 0) return;
      if (movimientos.length === 1) {
        const unico = movimientos[0];
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
      onMoverGrupo(movimientos);
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
    onClicSimple,
    nodos,
    mostrarGrilla,
    controlsRef,
  ]);

  const iniciarArrastre = (e: ThreeEvent<PointerEvent>, n: NodoMapa) => {
    e.stopPropagation();
    onSeleccionar(n.id);
    // Shift+clic: alternar en la selección múltiple sin arrastrar (Blender).
    if (e.shiftKey) {
      onAlternarGrupo(n.id);
      return;
    }
    const pos = posicionDe(n.id);
    const y = n.pos_z ?? 0;
    // Plano horizontal a la altura base del nodo (normal +Y, a distancia y del origen).
    const plano = new Plane(new Vector3(0, 1, 0), -y);
    // Punto exacto del plano bajo el cursor al agarrar → offset de agarre.
    const hit0 = new Vector3();
    if (!e.ray.intersectPlane(plano, hit0)) {
      hit0.set(pos.x * ESCALA_3D, y, pos.y * ESCALA_3D);
    }
    // Miembros del gesto: si el nodo pertenece a la selección múltiple,
    // arrastra a TODO el grupo con el mismo delta.
    const miembros = grupoIds.includes(n.id) && grupoIds.length > 0 ? grupoIds : [n.id];
    const grupo: NodoArrastre[] = miembros.map((id) => {
      const m = nodos.find((x) => x.id === id) ?? n;
      const p = posicionDe(id);
      return {
        id,
        tipo: m.tipo,
        inicioX: p.x,
        inicioY: p.y,
        posZ: m.pos_z,
        altura: m.altura,
        offsetX: p.x - hit0.x / ESCALA_3D,
        offsetY: p.y - hit0.z / ESCALA_3D,
        actualX: p.x,
        actualY: p.y,
      };
    });
    arrastre.current = {
      grupo,
      plano,
      startClientX: e.nativeEvent.clientX,
      startClientY: e.nativeEvent.clientY,
      movidoPx: 0,
    };
    // Desactivar la órbita SÍNCRONAMENTE: setArrastrando(true) llega con el
    // re-render y los primeros pointermove ya rotaban la cámara — ese giro
    // desplazaba el mapeo píxel→plano y "volver donde estaba" caía desviado.
    if (controlsRef.current) controlsRef.current.enabled = false;
    setArrastrando(true);
  };

  // Sugerencia: si el nodo arrastrado choca, la posición válida más cercana
  // se marca en el piso con un marco verde (mismo motor que el mapa 2D).
  const nodoArrastrado = arrastre.current
    ? nodos.find((n) => n.id === arrastre.current?.grupo[0]?.id)
    : undefined;
  const posArrastrado = nodoArrastrado ? posicionDe(nodoArrastrado.id) : null;
  const sugerenciaEscena =
    nodoArrastrado && posArrastrado && arrastre.current?.movidoPx !== undefined
      ? sugerirPosicion(
          nodoArrastrado.tipo,
          nodoArrastrado.ancho,
          nodoArrastrado.profundidad,
          { x: posArrastrado.x, y: posArrastrado.y },
          otrosParaChoque(nodos),
          nodoArrastrado.id,
        )
      : null;

  // Piso/rejilla adaptativos: crecen con el layout (antes 80×80 fijos se
  // quedaban cortos cuando el almacén crecía más allá de ~65 unidades).
  const largoPiso = useMemo(() => {
    let maxExt = 60;
    for (const n of nodos) {
      if (n.pos_x === null || n.pos_y === null) continue;
      maxExt = Math.max(
        maxExt,
        (n.pos_x + n.ancho) * ESCALA_3D,
        (n.pos_y + n.profundidad) * ESCALA_3D,
      );
    }
    return Math.max(80, Math.ceil((maxExt + 20) / 20) * 20);
  }, [nodos]);
  const centroPiso = largoPiso / 2 - 10;
  // Clic sin arrastre sobre el piso deselecciona (el drag orbita, como siempre).
  const pisoDown = useRef<{ x: number; y: number } | null>(null);

  return (
    <>
      <OrbitControls
        ref={controlsRef}
        enabled={!arrastrando}
        enableDamping
        dampingFactor={0.08}
        autoRotate={autoRotar}
        autoRotateSpeed={0.8}
        makeDefault
      />
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={[centroPiso, -0.01, centroPiso]}
        onPointerDown={(e) => {
          pisoDown.current = { x: e.nativeEvent.clientX, y: e.nativeEvent.clientY };
        }}
        onPointerUp={(e) => {
          const p = pisoDown.current;
          pisoDown.current = null;
          if (!p) return;
          if (
            Math.hypot(e.nativeEvent.clientX - p.x, e.nativeEvent.clientY - p.y) < UMBRAL_CLIC_PX
          ) {
            onSeleccionar(null);
          }
        }}
      >
        <planeGeometry args={[largoPiso, largoPiso]} />
        <meshStandardMaterial color={resolverColorCss("--color-gray-200")} />
      </mesh>
      {mostrarGrilla ? (
        <gridHelper
          args={[
            largoPiso,
            largoPiso / 2,
            resolverColorCss("--color-gray-300"),
            resolverColorCss("--color-gray-200"),
          ]}
          position={[centroPiso, 0.001, centroPiso]}
        />
      ) : null}
      {nodoArrastrado &&
      posArrastrado &&
      arrastre.current &&
      arrastre.current.movidoPx >= UMBRAL_CLIC_PX ? (
        <Html
          position={[
            (posArrastrado.x + nodoArrastrado.ancho / 2) * ESCALA_3D,
            (nodoArrastrado.altura ?? ALTURA_DEFECTO[nodoArrastrado.tipo]) + 0.35,
            (posArrastrado.y + nodoArrastrado.profundidad / 2) * ESCALA_3D,
          ]}
          center
        >
          <div className="mapa-almacen-3d__hud">
            {Math.round(posArrastrado.x)} · {Math.round(posArrastrado.y)}
          </div>
        </Html>
      ) : null}
      {sugerenciaEscena && nodoArrastrado ? (
        <mesh
          position={[
            (sugerenciaEscena.x + nodoArrastrado.ancho / 2) * ESCALA_3D,
            0.16,
            (sugerenciaEscena.y + nodoArrastrado.profundidad / 2) * ESCALA_3D,
          ]}
        >
          <boxGeometry
            args={[nodoArrastrado.ancho * ESCALA_3D, 0.04, nodoArrastrado.profundidad * ESCALA_3D]}
          />
          <meshBasicMaterial
            color={resolverColorCss("--color-success-500")}
            transparent
            opacity={0.55}
          />
        </mesh>
      ) : null}
      {nodos.map((n) => {
        const pos = posicionDe(n.id);
        const tam = tamRealDe(n);
        const ancho = tam.ancho * ESCALA_3D;
        const profundidad = tam.profundo * ESCALA_3D;
        const altura = n.altura ?? ALTURA_DEFECTO[n.tipo];
        const base = n.pos_z ?? 0;
        const resaltado = n.id === resaltarId || n.id === seleccionId || grupoIds.includes(n.id);
        // Semáforo en vivo del nodo arrastrado (verde/rojo según candidato).
        const enArrastre = arrastre.current?.grupo.some((g) => g.id === n.id) ?? false;
        const choqueDrag = enArrastre
          ? primerChoque(
              n.tipo,
              n.id,
              { x: pos.x, y: pos.y, ancho: tam.ancho, profundo: tam.profundo },
              otrosParaChoque(nodos),
            )
          : null;
        const tipoArrastre = arrastre.current?.grupo[0]?.tipo;
        const esObstaculo =
          tipoArrastre !== undefined && !enArrastre && solapeProhibido(tipoArrastre, n.tipo);
        const tinte = tinteDe(resaltado, enArrastre, choqueDrag, esObstaculo);
        const resumen = resumenPorNodo.get(n.id);
        const centro: [number, number, number] = [
          pos.x * ESCALA_3D + ancho / 2,
          base + altura / 2,
          pos.y * ESCALA_3D + profundidad / 2,
        ];
        return (
          <mesh
            key={n.id}
            position={centro}
            onPointerDown={(e) => iniciarArrastre(e, n)}
            onDoubleClick={() => onEnfocar(n.id)}
          >
            <boxGeometry args={[ancho, altura, profundidad]} />
            <meshStandardMaterial
              wireframe={alambre}
              color={
                n.tipo === "ubicacion"
                  ? resolverColorCss(colorOcupacion(n.ocupacion))
                  : coloresNodo[n.tipo]
              }
              emissive={tinte === "#000000" ? "#000000" : resolverColorCss(tinte)}
              emissiveIntensity={intensidadDe(resaltado, enArrastre, choqueDrag, esObstaculo)}
            />
            {mostrarEtiquetas ? (
              <Html position={[0, altura / 2 + 0.12, 0]} center distanceFactor={18} sprite>
                <div className="mapa-almacen-3d__etiqueta">
                  <span>{n.codigo}</span>
                  {n.ocupacion !== null ? (
                    <span className="mapa-almacen-3d__sku">{Math.round(n.ocupacion * 100)}%</span>
                  ) : null}
                  {resumen && resumen.productosDistintos > 0 ? (
                    <span className="mapa-almacen-3d__sku">{resumen.productosDistintos} SKU</span>
                  ) : null}
                </div>
              </Html>
            ) : null}
          </mesh>
        );
      })}
    </>
  );
}
