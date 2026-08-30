import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
  type WheelEvent as ReactWheelEvent,
} from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate, useParams, useSearchParams } from "react-router";
import {
  crearEnMapa,
  desactivarPasillo,
  desactivarRack,
  desactivarZona,
  obtenerAlmacen,
} from "../shared/backend";
import { Button, ButtonLink, Card, Icon, PageHeader, Text, useToast } from "../shared/ui";
import { catalogoDetalle, almacenMapa3D, almacenMapaAsistente } from "../app/route-paths";
import { mensajeError } from "../shared/format";
import {
  colorRellenoNodo,
  type NodoMapa,
  posicionPorDefecto,
  type ResumenNodo,
  SLUG_POR_TIPO,
  type TipoNodo,
  otrosParaChoque,
  useMapaAlmacenDatos,
  useMoverNodoMapa,
} from "./mapa-almacen-datos";
import {
  LADO_MINIMO,
  PASO_REJILLA,
  primerChoque,
  snap,
  type RectMapa,
  solapeProhibido,
  sugerirPosicion,
  zonaContenedoraDePunto,
} from "./mapa-geometria";
import { snapshotDe, useHistorialMapa, type EntradaHistorial } from "./use-historial-mapa";
import { useT, type Diccionario } from "../shared/i18n";

// DESIGN §7: Zona/Rack/Sección comparten ícono (LayoutGrid), aquí mapeado a "zona".
const ICONO_NODO: Record<TipoNodo, "zona" | "ubicacion"> = {
  zona: "zona",
  pasillo: "zona",
  rack: "zona",
  ubicacion: "ubicacion",
};

const UMBRAL_CLIC_PX = 4;
const TAM_TIRADOR = 9;

type Herramienta = "seleccionar" | "zona" | "pasillo" | "rack";
type Esquina = "nw" | "ne" | "sw" | "se";

/** Las herramientas del modo construcción, en el idioma activo. */
function herramientasDe(t: Diccionario): {
  id: Herramienta;
  etiqueta: string;
  icono: Parameters<typeof Icon>[0]["name"];
  ayuda: string;
}[] {
  return [
    {
      id: "seleccionar",
      etiqueta: t.mapa.seleccionar,
      icono: "ver",
      ayuda: t.mapa.arrastrarRedimensionar,
    },
    { id: "zona", etiqueta: t.mapa.zona, icono: "zona", ayuda: t.mapa.dibujaZonaNueva },
    { id: "pasillo", etiqueta: t.mapa.pasillo, icono: "ordenar", ayuda: t.mapa.dibujaPasillo },
    { id: "rack", etiqueta: t.mapa.rack, icono: "producto", ayuda: t.mapa.dibujaRack },
  ];
}

export function AlmacenMapaPage() {
  const t = useT();
  const { id: almacenId } = useParams<{ id: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const resaltarId = searchParams.get("resaltar");
  const construir = searchParams.get("modo") === "construir";
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const almacenQ = useQuery({
    queryKey: ["mapa-almacen", "almacen", almacenId],
    queryFn: () => obtenerAlmacen(almacenId!),
    enabled: !!almacenId,
  });

  const { nodos, cargando, resumenPorNodo } = useMapaAlmacenDatos(almacenId);
  const moverMut = useMoverNodoMapa();

  const [herramienta, setHerramienta] = useState<Herramienta>("seleccionar");
  const [rejilla, setRejilla] = useState(true);
  const [seleccionId, setSeleccionId] = useState<string | null>(null);

  const crearMut = useMutation({
    mutationFn: crearEnMapa,
    onSuccess: (creado) => {
      queryClient.invalidateQueries({ queryKey: ["mapa-almacen"] });
      setSeleccionId(creado.id);
      hist.registrar({
        kind: "creacion",
        tipo: creado.tipo,
        nodoId: creado.id,
        codigo: creado.codigo,
      });
      toast(t.mapa.creado({ codigo: creado.codigo }), "success");
    },
    onError: (err) => toast(mensajeError(err), "error"),
  });

  const hist = useHistorialMapa();

  /** Aplica posición/tamaño vía mover_*; con `entry` lo registra en el
   * historial solo cuando el backend confirma (un rechazo no ensucia la
   * pila de deshacer). */
  function aplicarPosicion(
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
    entry?: EntradaHistorial,
  ) {
    moverMut.mutate(
      { tipo, nodoId, pos },
      { onSuccess: entry ? () => hist.registrar(entry) : undefined },
    );
  }

  const desactivarMut = useMutation({
    mutationFn: async ({ tipo, nodoId }: { tipo: TipoNodo; nodoId: string; codigo?: string }) => {
      if (tipo === "zona") await desactivarZona(nodoId);
      else if (tipo === "pasillo") await desactivarPasillo(nodoId);
      else await desactivarRack(nodoId);
    },
    onSuccess: (_d, vars) => {
      queryClient.invalidateQueries({ queryKey: ["mapa-almacen"] });
      toast(t.mapa.creacionDeshecha({ codigo: vars.codigo || t.mapa.elemento }), "success");
    },
    onError: (err) => toast(mensajeError(err), "error"),
  });

  function deshacer() {
    const e = hist.deshacer();
    if (!e || desactivarMut.isPending) return;
    if (e.kind === "mover" && e.antes) {
      aplicarPosicion(e.tipo, e.nodoId, {
        pos_x: e.antes.pos_x ?? 0,
        pos_y: e.antes.pos_y ?? 0,
        pos_z: e.antes.pos_z,
        altura: e.antes.altura,
        ancho: e.antes.ancho,
        profundidad: e.antes.profundidad,
      });
      toast(t.mapa.cambioDeshecho, "success");
      return;
    }
    if (e.kind !== "creacion") return; // el 2D no genera entradas grupales
    desactivarMut.mutate({ tipo: e.tipo, nodoId: e.nodoId, codigo: e.codigo });
  }

  function rehacer() {
    const e = hist.rehacer();
    if (!e || e.kind !== "mover" || !e.despues) return;
    aplicarPosicion(e.tipo, e.nodoId, {
      pos_x: e.despues.pos_x ?? 0,
      pos_y: e.despues.pos_y ?? 0,
      pos_z: e.despues.pos_z,
      altura: e.despues.altura,
      ancho: e.despues.ancho,
      profundidad: e.despues.profundidad,
    });
    toast(t.mapa.cambioRehecho, "success");
  }

  // Ctrl/Cmd+Z deshace, Ctrl/Cmd+Shift+Z o Ctrl+Y rehace (fuera de campos).
  const deshacerRef = useRef(deshacer);
  deshacerRef.current = deshacer;
  const rehacerRef = useRef(rehacer);
  rehacerRef.current = rehacer;
  useEffect(() => {
    const onKeyDown = (ev: KeyboardEvent) => {
      if (!(ev.ctrlKey || ev.metaKey) || ev.altKey) return;
      const k = ev.key.toLowerCase();
      if (k !== "z" && k !== "y") return;
      const t = ev.target as HTMLElement | null;
      if (t && ["INPUT", "TEXTAREA", "SELECT"].includes(t.tagName)) return;
      ev.preventDefault();
      if (k === "z" && !ev.shiftKey) deshacerRef.current();
      else rehacerRef.current();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  const irADetalle = (tipo: TipoNodo, id: string) => {
    navigate(catalogoDetalle(SLUG_POR_TIPO[tipo], id));
  };

  const alternarConstruccion = () => {
    const params = new URLSearchParams(searchParams);
    setSeleccionId(null);
    if (construir) {
      params.delete("modo");
      setHerramienta("seleccionar");
    } else {
      params.set("modo", "construir");
    }
    setSearchParams(params);
  };

  /** Creación por dibujo: resuelve la zona contenedora por punto central
   * para pasillo/rack (el backend la reválida). */
  const crearDesdeDibujo = (tipo: Exclude<Herramienta, "seleccionar">, rect: RectMapa) => {
    if (!almacenId) return;
    let zonaId: string | null = null;
    if (tipo !== "zona") {
      zonaId = zonaContenedoraDePunto(
        rect.x + rect.ancho / 2,
        rect.y + rect.profundo / 2,
        nodos.filter((n): n is NodoMapa & { tipo: "zona" } => n.tipo === "zona"),
      );
      if (!zonaId) {
        toast(t.mapa.dibujaDentroDeZona, "error");
        return;
      }
    }
    crearMut.mutate({
      tipo,
      almacen_id: almacenId,
      zona_id: zonaId,
      x: rect.x,
      y: rect.y,
      ancho: rect.ancho,
      profundidad: rect.profundo,
    });
  };

  if (!almacenId) {
    return null;
  }

  const ayudaActual = herramientasDe(t).find((h) => h.id === herramienta)?.ayuda ?? "";
  const hayZonas = nodos.some((n) => n.tipo === "zona");

  /** Rota 90° el nodo seleccionado alrededor de su centro y guarda si el
   * resultado no choca con nadie (misma matriz que el backend). */
  function rotarSeleccion(id: string) {
    const n = nodos.find((x) => x.id === id);
    if (!n || n.pos_x === null || n.pos_y === null) return;
    const cx = n.pos_x + n.ancho / 2;
    const cy = n.pos_y + n.profundidad / 2;
    const nuevo: RectMapa = {
      x: cx - n.profundidad / 2,
      y: cy - n.ancho / 2,
      ancho: n.profundidad,
      profundo: n.ancho,
    };
    const choque = primerChoque(n.tipo, n.id, nuevo, otrosParaChoque(nodos));
    if (choque) {
      toast(t.mapa.noCabeGirado({ choque }), "error");
      return;
    }
    aplicarPosicion(
      n.tipo,
      n.id,
      {
        pos_x: Math.round(nuevo.x),
        pos_y: Math.round(nuevo.y),
        pos_z: n.pos_z,
        altura: n.altura,
        ancho: nuevo.ancho,
        profundidad: nuevo.profundo,
      },
      {
        kind: "mover",
        tipo: n.tipo,
        nodoId: n.id,
        antes: snapshotDe(n),
        despues: {
          pos_x: Math.round(nuevo.x),
          pos_y: Math.round(nuevo.y),
          pos_z: n.pos_z,
          altura: n.altura,
          ancho: nuevo.ancho,
          profundidad: nuevo.profundo,
        },
      },
    );
  }

  return (
    <>
      <PageHeader
        title={almacenQ.data ? t.mapa.conCodigo({ codigo: almacenQ.data.codigo }) : t.mapa.titulo}
        description={construir ? t.mapa.modoConstruccion : t.mapa.descripcion}
        actions={
          <>
            <Button
              variant="ghost"
              icon="deshacer"
              disabled={!hist.puedeDeshacer || moverMut.isPending || desactivarMut.isPending}
              onClick={deshacer}
            >
              {t.mapa.deshacer}
            </Button>
            <Button
              variant="ghost"
              icon="rehacer"
              disabled={!hist.puedeRehacer || moverMut.isPending}
              onClick={rehacer}
            >
              {t.mapa.rehacer}
            </Button>
            <Button
              variant={construir ? "primary" : "secondary"}
              icon="editar"
              onClick={alternarConstruccion}
            >
              {construir ? t.mapa.terminarConstruccion : t.mapa.construir}
            </Button>
            <ButtonLink variant="ghost" icon="ubicacion" href={almacenMapa3D(almacenId)}>
              {t.mapa.verMapa3D}
            </ButtonLink>
          </>
        }
      />
      {construir ? (
        <div className="mapa-toolbar" role="toolbar" aria-label={t.mapa.herramientas}>
          {herramientasDe(t).map((h) => (
            <button
              key={h.id}
              type="button"
              className={`mapa-herramienta${herramienta === h.id ? " mapa-herramienta--activa" : ""}`}
              onClick={() => setHerramienta(h.id)}
              aria-pressed={herramienta === h.id}
            >
              <Icon name={h.icono} size={16} />
              <span>{h.etiqueta}</span>
            </button>
          ))}
          <span className="mapa-toolbar__sep" aria-hidden="true" />
          <button
            type="button"
            className={`mapa-herramienta${rejilla ? " mapa-herramienta--activa" : ""}`}
            onClick={() => setRejilla((v) => !v)}
            aria-pressed={rejilla}
          >
            <Icon name="cuadricula" size={16} />
            <span>{t.mapa.rejilla}</span>
          </button>
          <button
            type="button"
            className="mapa-herramienta"
            disabled={!seleccionId}
            onClick={() => {
              if (seleccionId) rotarSeleccion(seleccionId);
            }}
          >
            <Icon name="rotar" size={16} />
            <span>{t.mapa.rotar}</span>
          </button>
          {hayZonas ? null : (
            <ButtonLink
              variant="secondary"
              icon="agregar"
              href={almacenMapaAsistente(almacenId ?? "")}
            >
              {t.mapa.generarLayout}
            </ButtonLink>
          )}
          <span className="mapa-toolbar__ayuda">{ayudaActual}</span>
        </div>
      ) : null}
      <Card title={t.mapa.mapa2D}>
        <Card.Body>
          {cargando ? (
            <Text as="p" size="sm" color="muted">
              {t.mapa.cargandoEstructura}
            </Text>
          ) : nodos.length === 0 && !construir ? (
            <Text as="p" size="sm" color="muted">
              {t.mapa.sinEstructura}
            </Text>
          ) : nodos.length === 0 && construir ? (
            <Text as="p" size="sm" color="muted">
              {t.mapa.lienzoVacio}
            </Text>
          ) : (
            <MapaCanvas
              nodos={nodos}
              resumenPorNodo={resumenPorNodo}
              resaltarId={resaltarId}
              construir={construir}
              herramienta={herramienta}
              rejilla={rejilla}
              seleccionId={seleccionId}
              onSeleccionar={setSeleccionId}
              onMover={(tipo, nodoId, x, y, pos_z, altura, ancho, profundidad) => {
                const actual = nodos.find((n) => n.id === nodoId);
                const entry: EntradaHistorial | undefined = actual
                  ? {
                      kind: "mover",
                      tipo,
                      nodoId,
                      antes: snapshotDe(actual),
                      despues: {
                        pos_x: x,
                        pos_y: y,
                        pos_z,
                        altura,
                        ancho: ancho ?? actual.ancho,
                        profundidad: profundidad ?? actual.profundidad,
                      },
                    }
                  : undefined;
                aplicarPosicion(
                  tipo,
                  nodoId,
                  { pos_x: x, pos_y: y, pos_z, altura, ancho, profundidad },
                  entry,
                );
              }}
              onClickNodo={irADetalle}
              onCrear={crearDesdeDibujo}
            />
          )}
        </Card.Body>
      </Card>
    </>
  );
}

/** Trazo del nodo: resaltado por deep-link o selección gana; el solape pinta
 * peligro; resto borde estándar. */
function trazoNodo(resaltado: boolean, seleccionado: boolean, choque: string | null): string {
  if (resaltado || seleccionado) return "var(--color-blue-500)";
  if (choque) return "var(--color-danger-500)";
  return "var(--border-color-strong)";
}

function grosorNodo(destacado: boolean, choque: string | null): number {
  if (destacado) return 2.5;
  if (choque) return 2;
  return 1;
}

interface ViewBox {
  x: number;
  y: number;
  w: number;
  h: number;
}

type SesionArrastre =
  | {
      kind: "pan";
      pointerId: number;
      startClientX: number;
      startClientY: number;
      startX: number;
      startY: number;
      movidoPx: number;
    }
  | {
      kind: "nodo";
      pointerId: number;
      nodoId: string;
      tipo: TipoNodo;
      posZ: number | null;
      altura: number | null;
      /** pos_z/altura del nodo al iniciar el arrastre: el drag 2D solo mueve
       * x/y, así que se reenvían sin cambios al guardar (antes se perdían,
       * quedando en `null` en cada arrastre — bug corregido junto con el 3D). */
      startClientX: number;
      startClientY: number;
      inicio: RectMapa;
      movidoPx: number;
      alt: boolean;
    }
  | {
      kind: "resize";
      pointerId: number;
      nodoId: string;
      tipo: TipoNodo;
      esquina: Esquina;
      posZ: number | null;
      altura: number | null;
      startClientX: number;
      startClientY: number;
      inicio: RectMapa;
      movidoPx: number;
      alt: boolean;
    }
  | {
      kind: "dibujo";
      pointerId: number;
      startClientX: number;
      startClientY: number;
      x0: number;
      y0: number;
      movidoPx: number;
      alt: boolean;
    };

function MapaCanvas({
  nodos,
  resumenPorNodo,
  resaltarId,
  construir,
  herramienta,
  rejilla,
  seleccionId,
  onSeleccionar,
  onMover,
  onClickNodo,
  onCrear,
}: {
  nodos: NodoMapa[];
  resumenPorNodo: Map<string, ResumenNodo>;
  resaltarId?: string | null;
  construir: boolean;
  herramienta: Herramienta;
  rejilla: boolean;
  seleccionId: string | null;
  onSeleccionar: (id: string | null) => void;
  onMover: (
    tipo: TipoNodo,
    id: string,
    x: number,
    y: number,
    pos_z: number | null,
    altura: number | null,
    ancho?: number,
    profundidad?: number,
  ) => void;
  onClickNodo: (tipo: TipoNodo, id: string) => void;
  onCrear: (tipo: Exclude<Herramienta, "seleccionar">, rect: RectMapa) => void;
}) {
  const svgRef = useRef<SVGSVGElement>(null);
  const { toast } = useToast();
  const [viewBox, setViewBox] = useState<ViewBox>({ x: 0, y: 0, w: 1100, h: 620 });
  const [posOverride, setPosOverride] = useState<Record<string, { x: number; y: number }>>({});
  const [tamOverride, setTamOverride] = useState<Record<string, RectMapa>>({});
  const [dibujo, setDibujo] = useState<RectMapa | null>(null);
  const arrastre = useRef<SesionArrastre | null>(null);
  const posicionBase = useMemo(() => {
    // El índice usado para la rejilla de respaldo es la posición del nodo
    // dentro de la lista completa de su tipo (no solo entre los "sin
    // posición"): así un nodo ya posicionado no libera su índice y otro nodo
    // sin posición no termina colisionando con sus coordenadas reales.
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

  const nodoPorId = useMemo(() => new Map(nodos.map((n) => [n.id, n])), [nodos]);

  /** Rectángulo efectivo del nodo: posición (base o override) + tamaño
   * (entidad o override de resize en curso). */
  const rectDe = (n: NodoMapa): RectMapa => {
    const pos = posOverride[n.id] ?? posicionBase.get(n.id) ?? { x: 0, y: 0 };
    const t = tamOverride[n.id];
    return {
      x: pos.x,
      y: pos.y,
      ancho: t?.ancho ?? n.ancho,
      profundo: t?.profundo ?? n.profundidad,
    };
  };

  const snapSi = (valor: number, alt: boolean) =>
    construir && rejilla && !alt ? snap(valor) : valor;

  /** Nodo que se está arrastrando/redimensionando ahora (para no calcular
   * colisiones de todo el lienzo en cada frame — solo el nodo en edición). */
  const editandoId =
    arrastre.current && (arrastre.current.kind === "nodo" || arrastre.current.kind === "resize")
      ? arrastre.current.nodoId
      : null;

  /** Choque del estado actual del nodo en edición contra el resto (ghost rojo
   * durante el gesto). Fuera de construcción o para otros nodos: null. */
  const choqueActualDe = (n: NodoMapa): string | null => {
    if (!construir || n.id !== editandoId) return null;
    return primerChoque(n.tipo, n.id, rectDe(n), otrosParaChoque(nodos));
  };

  // Centra el lienzo sobre el nodo indicado por `?resaltar=<id>` una sola
  // vez, apenas se conoce su posición (llegada desde MapaContextoCard).
  const centradoHecho = useRef(false);
  useEffect(() => {
    if (!resaltarId || centradoHecho.current) return;
    const pos = posicionBase.get(resaltarId);
    if (!pos) return;
    centradoHecho.current = true;
    setViewBox((v) => ({ ...v, x: pos.x - v.w / 2, y: pos.y - v.h / 2 }));
  }, [resaltarId, posicionBase]);

  // Esc deselecciona (y aborta un dibujo en curso) en modo construcción.
  useEffect(() => {
    if (!construir) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      if (!(e.target instanceof HTMLElement)) return;
      if (["INPUT", "TEXTAREA", "SELECT"].includes(e.target.tagName)) return;
      setDibujo(null);
      arrastre.current = null;
      onSeleccionar(null);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [construir, onSeleccionar]);

  const escala = () => {
    const rect = svgRef.current?.getBoundingClientRect();
    if (!rect || rect.width === 0) {
      return 1;
    }
    return viewBox.w / rect.width;
  };

  const onWheel = (e: ReactWheelEvent<SVGSVGElement>) => {
    e.preventDefault();
    const factor = e.deltaY > 0 ? 1.1 : 0.9;
    setViewBox((v) => {
      const nuevoAncho = Math.min(3000, Math.max(300, v.w * factor));
      const nuevoAlto = Math.min(1800, Math.max(180, v.h * factor));
      return {
        x: v.x - (nuevoAncho - v.w) / 2,
        y: v.y - (nuevoAlto - v.h) / 2,
        w: nuevoAncho,
        h: nuevoAlto,
      };
    });
  };

  const onFondoPointerDown = (e: ReactPointerEvent<SVGRectElement>) => {
    (e.target as Element).setPointerCapture(e.pointerId);
    if (construir && herramienta !== "seleccionar") {
      const s = escala();
      arrastre.current = {
        kind: "dibujo",
        pointerId: e.pointerId,
        startClientX: e.clientX,
        startClientY: e.clientY,
        x0: snapSi(viewBox.x + (e.clientX - rectIzq()) * s, e.altKey),
        y0: snapSi(viewBox.y + (e.clientY - rectTop()) * s, e.altKey),
        movidoPx: 0,
        alt: e.altKey,
      };
      return;
    }
    arrastre.current = {
      kind: "pan",
      pointerId: e.pointerId,
      startClientX: e.clientX,
      startClientY: e.clientY,
      startX: viewBox.x,
      startY: viewBox.y,
      movidoPx: 0,
    };
  };

  const rectIzq = () => svgRef.current?.getBoundingClientRect().left ?? 0;
  const rectTop = () => svgRef.current?.getBoundingClientRect().top ?? 0;

  const onNodoPointerDown = (e: ReactPointerEvent<SVGGElement>, nodo: NodoMapa) => {
    if (construir && herramienta !== "seleccionar") {
      // Dibujando con una herramienta: el gesto sobre un nodo inicia el trazo
      // igual que sobre el fondo (estilo Sims: se construye encima de todo).
      (e.currentTarget as Element).setPointerCapture(e.pointerId);
      const s = escala();
      arrastre.current = {
        kind: "dibujo",
        pointerId: e.pointerId,
        startClientX: e.clientX,
        startClientY: e.clientY,
        x0: snapSi(viewBox.x + (e.clientX - rectIzq()) * s, e.altKey),
        y0: snapSi(viewBox.y + (e.clientY - rectTop()) * s, e.altKey),
        movidoPx: 0,
        alt: e.altKey,
      };
      return;
    }
    e.stopPropagation();
    (e.target as Element).setPointerCapture(e.pointerId);
    const r = rectDe(nodo);
    arrastre.current = {
      kind: "nodo",
      pointerId: e.pointerId,
      nodoId: nodo.id,
      tipo: nodo.tipo,
      posZ: nodo.pos_z,
      altura: nodo.altura,
      startClientX: e.clientX,
      startClientY: e.clientY,
      inicio: r,
      movidoPx: 0,
      alt: e.altKey,
    };
  };

  const onTiradorPointerDown = (
    e: ReactPointerEvent<SVGRectElement>,
    nodo: NodoMapa,
    esquina: Esquina,
  ) => {
    e.stopPropagation();
    (e.target as Element).setPointerCapture(e.pointerId);
    arrastre.current = {
      kind: "resize",
      pointerId: e.pointerId,
      nodoId: nodo.id,
      tipo: nodo.tipo,
      esquina,
      posZ: nodo.pos_z,
      altura: nodo.altura,
      startClientX: e.clientX,
      startClientY: e.clientY,
      inicio: rectDe(nodo),
      movidoPx: 0,
      alt: e.altKey,
    };
  };

  const onPointerMove = (e: ReactPointerEvent<SVGSVGElement>) => {
    const est = arrastre.current;
    if (!est || est.pointerId !== e.pointerId) {
      return;
    }
    const s = escala();
    const dxPx = e.clientX - est.startClientX;
    const dyPx = e.clientY - est.startClientY;
    est.movidoPx = Math.max(est.movidoPx, Math.hypot(dxPx, dyPx));

    if (est.kind === "pan") {
      setViewBox((v) => ({ ...v, x: est.startX - dxPx * s, y: est.startY - dyPx * s }));
      return;
    }

    if (est.kind === "dibujo") {
      const crudoX = viewBox.x + (e.clientX - rectIzq()) * s;
      const crudoY = viewBox.y + (e.clientY - rectTop()) * s;
      const x1 = est.x0 + snapSi(crudoX - est.x0, e.altKey || est.alt);
      const y1 = est.y0 + snapSi(crudoY - est.y0, e.altKey || est.alt);
      const r = {
        x: Math.min(est.x0, x1),
        y: Math.min(est.y0, y1),
        ancho: Math.abs(x1 - est.x0),
        profundo: Math.abs(y1 - est.y0),
      };
      setDibujo(r);
      return;
    }

    const dx = dxPx * s;
    const dy = dyPx * s;

    if (est.kind === "nodo") {
      // Snap RELATIVO al punto de partida: soltar donde estaba vuelve al
      // punto EXACTO aunque no esté alineado a la rejilla (posiciones como
      // 364, de columnas de 172, serían inalcanzables con snap absoluto).
      const x = est.inicio.x + snapSi(dx, e.altKey || est.alt);
      const y = est.inicio.y + snapSi(dy, e.altKey || est.alt);
      setPosOverride((prev) => ({ ...prev, [est.nodoId]: { x, y } }));
      return;
    }

    // resize: las aristas fijas son las opuestas a la esquina tomada.
    const izq0 = est.inicio.x;
    const der0 = est.inicio.x + est.inicio.ancho;
    const top0 = est.inicio.y;
    const bot0 = est.inicio.y + est.inicio.profundo;
    let izq = izq0;
    let der = der0;
    let top = top0;
    let bot = bot0;
    if (est.esquina.includes("e")) der = der0 + snapSi(dx, e.altKey || est.alt);
    if (est.esquina.includes("w")) izq = izq0 + snapSi(dx, e.altKey || est.alt);
    if (est.esquina.includes("s")) bot = bot0 + snapSi(dy, e.altKey || est.alt);
    if (est.esquina.includes("n")) top = top0 + snapSi(dy, e.altKey || est.alt);
    // Mínimo por lado: la esquina movida cede antes que invertir el rect.
    if (der - izq < LADO_MINIMO) {
      if (est.esquina.includes("e")) der = izq + LADO_MINIMO;
      else izq = der - LADO_MINIMO;
    }
    if (bot - top < LADO_MINIMO) {
      if (est.esquina.includes("s")) bot = top + LADO_MINIMO;
      else top = bot - LADO_MINIMO;
    }
    setPosOverride((prev) => ({ ...prev, [est.nodoId]: { x: izq, y: top } }));
    setTamOverride((prev) => ({
      ...prev,
      [est.nodoId]: { x: izq, y: top, ancho: der - izq, profundo: bot - top },
    }));
  };

  const revertir = (id: string) => {
    setPosOverride((prev) => {
      const copia = { ...prev };
      delete copia[id];
      return copia;
    });
    setTamOverride((prev) => {
      const copia = { ...prev };
      delete copia[id];
      return copia;
    });
  };

  const onPointerUp = (e: ReactPointerEvent<SVGSVGElement>) => {
    const est = arrastre.current;
    if (!est || est.pointerId !== e.pointerId) {
      return;
    }
    arrastre.current = null;

    if (est.kind === "dibujo") {
      const r = dibujo;
      setDibujo(null);
      if (r && r.ancho >= LADO_MINIMO && r.profundo >= LADO_MINIMO) {
        onCrear(herramienta as Exclude<Herramienta, "seleccionar">, {
          x: Math.round(r.x),
          y: Math.round(r.y),
          ancho: Math.round(r.ancho),
          profundo: Math.round(r.profundo),
        });
      }
      return;
    }

    const nodo = "nodoId" in est ? nodoPorId.get(est.nodoId) : undefined;
    if (est.kind === "pan" || !nodo) return;

    if (est.movidoPx < UMBRAL_CLIC_PX) {
      // Clic simple: navegar (modo ver) o seleccionar (modo construcción).
      if (construir) {
        onSeleccionar(seleccionId === nodo.id ? null : nodo.id);
      } else {
        onClickNodo(est.tipo, nodo.id);
      }
      revertir(nodo.id);
      return;
    }

    const r = rectDe(nodo);
    const choque = construir ? primerChoque(nodo.tipo, nodo.id, r, otrosParaChoque(nodos)) : null;
    if (choque) {
      revertir(nodo.id);
      toast(`Movimiento bloqueado: se solaparía con ${choque}.`, "error");
      return;
    }
    onMover(
      est.tipo,
      nodo.id,
      Math.round(r.x),
      Math.round(r.y),
      nodo.pos_z,
      nodo.altura,
      Math.round(r.ancho),
      Math.round(r.profundo),
    );
  };

  // Teclado sobre nodo seleccionado en construcción: flechas mueven,
  // Shift+flechas redimensionan (accesibilidad de los tiradores).
  useEffect(() => {
    if (!construir || !seleccionId) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (
        e.key !== "ArrowLeft" &&
        e.key !== "ArrowRight" &&
        e.key !== "ArrowUp" &&
        e.key !== "ArrowDown"
      ) {
        return;
      }
      if (
        e.target instanceof HTMLElement &&
        ["INPUT", "TEXTAREA", "SELECT"].includes(e.target.tagName)
      ) {
        return;
      }
      const n = nodoPorId.get(seleccionId);
      if (!n || n.pos_x === null || n.pos_y === null) return;
      e.preventDefault();
      const paso = PASO_REJILLA * (e.shiftKey ? 1 : 1);
      const dx = e.key === "ArrowLeft" ? -paso : e.key === "ArrowRight" ? paso : 0;
      const dy = e.key === "ArrowUp" ? -paso : e.key === "ArrowDown" ? paso : 0;
      if (e.shiftKey) {
        onMover(
          n.tipo,
          n.id,
          n.pos_x,
          n.pos_y,
          n.pos_z,
          n.altura,
          Math.max(LADO_MINIMO, Math.round(n.ancho + dx)),
          Math.max(LADO_MINIMO, Math.round(n.profundidad + dy)),
        );
      } else {
        onMover(
          n.tipo,
          n.id,
          Math.round(n.pos_x + dx),
          Math.round(n.pos_y + dy),
          n.pos_z,
          n.altura,
          n.ancho,
          n.profundidad,
        );
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [construir, seleccionId, nodoPorId, onMover]);

  // Apoyo visual durante un gesto: los obstáculos (nodos con par prohibido
  // para lo que arrastro) se marcan en rojo y, si el candidato actual choca,
  // se SUGIERE la posición válida más cercana con un fantasma verde.
  const sesionGesto = arrastre.current;
  const tipoGesto =
    sesionGesto?.kind === "nodo" || sesionGesto?.kind === "resize"
      ? sesionGesto.tipo
      : sesionGesto?.kind === "dibujo" && herramienta !== "seleccionar"
        ? herramienta
        : null;
  const idGesto =
    sesionGesto?.kind === "nodo" || sesionGesto?.kind === "resize"
      ? sesionGesto.nodoId
      : sesionGesto?.kind === "dibujo"
        ? "__dibujo__"
        : null;
  const obstaculosGesto = tipoGesto
    ? nodos.filter(
        (n) =>
          n.id !== idGesto &&
          solapeProhibido(tipoGesto, n.tipo) &&
          n.pos_x !== null &&
          n.pos_y !== null,
      )
    : [];
  const candidatoGesto = (() => {
    if (!tipoGesto) return null;
    if (sesionGesto?.kind === "dibujo") return dibujo;
    if (idGesto && idGesto !== "__dibujo__") {
      const n = nodoPorId.get(idGesto);
      if (n) return rectDe(n);
    }
    return null;
  })();
  const sugerenciaGesto =
    tipoGesto &&
    candidatoGesto &&
    candidatoGesto.ancho >= LADO_MINIMO &&
    candidatoGesto.profundo >= LADO_MINIMO
      ? sugerirPosicion(
          tipoGesto,
          candidatoGesto.ancho,
          candidatoGesto.profundo,
          { x: candidatoGesto.x, y: candidatoGesto.y },
          otrosParaChoque(nodos),
          idGesto ?? undefined,
        )
      : null;

  const dibujoValido =
    dibujo && herramienta !== "seleccionar"
      ? primerChoque(herramienta, "__dibujo__", dibujo, otrosParaChoque(nodos)) === null &&
        (herramienta === "zona" ||
          zonaContenedoraDePunto(
            dibujo.x + dibujo.ancho / 2,
            dibujo.y + dibujo.profundo / 2,
            nodos.filter((n): n is NodoMapa & { tipo: "zona" } => n.tipo === "zona"),
          ) !== null)
      : false;

  return (
    <svg
      ref={svgRef}
      className="mapa-almacen__lienzo"
      viewBox={`${viewBox.x} ${viewBox.y} ${viewBox.w} ${viewBox.h}`}
      onWheel={onWheel}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      role="group"
      aria-label="Mapa físico del almacén: nodos navegables con Tab y activables con Enter"
    >
      <defs>
        <pattern
          id="mapa-rejilla"
          width={PASO_REJILLA}
          height={PASO_REJILLA}
          patternUnits="userSpaceOnUse"
        >
          <path
            d={`M ${PASO_REJILLA} 0 L 0 0 0 ${PASO_REJILLA}`}
            fill="none"
            stroke="var(--color-gray-200)"
            strokeWidth={0.5}
          />
        </pattern>
      </defs>
      <rect
        x={viewBox.x - 2000}
        y={viewBox.y - 2000}
        width={4000}
        height={4000}
        fill="var(--color-gray-50, #faf9f7)"
        onPointerDown={onFondoPointerDown}
      />
      {construir && rejilla ? (
        <rect
          x={viewBox.x}
          y={viewBox.y}
          width={viewBox.w}
          height={viewBox.h}
          fill="url(#mapa-rejilla)"
          pointerEvents="none"
        />
      ) : null}
      {nodos.map((n) => {
        const r = rectDe(n);
        const resumen = resumenPorNodo.get(n.id);
        const choque = choqueActualDe(n);
        const seleccionado = construir && seleccionId === n.id;
        const etiquetaTipo =
          n.tipo === "zona"
            ? "Zona"
            : n.tipo === "pasillo"
              ? "Pasillo"
              : n.tipo === "rack"
                ? "Rack"
                : "Ubicación";
        const ocupacionTxt =
          n.ocupacion !== null ? `, ${Math.round(n.ocupacion * 100)}% de ocupación` : "";
        return (
          <g
            key={n.id}
            transform={`translate(${r.x}, ${r.y})`}
            onPointerDown={(e) => onNodoPointerDown(e, n)}
            onDoubleClick={() => onClickNodo(n.tipo, n.id)}
            onKeyDown={(e) => {
              // Activa con teclado (WCAG 2.1.1): los <g> role=button no
              // disparan click nativo.
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                if (construir) {
                  onSeleccionar(seleccionId === n.id ? null : n.id);
                } else {
                  onClickNodo(n.tipo, n.id);
                }
              }
            }}
            className={`mapa-almacen__nodo${choque ? " mapa-almacen__nodo--invalido" : ""}`}
            role="button"
            tabIndex={0}
            aria-label={`${etiquetaTipo} ${n.codigo}${ocupacionTxt}${choque ? ", se solapa con " + choque : ""}`}
            aria-pressed={seleccionado || undefined}
          >
            <rect
              width={r.ancho}
              height={r.profundo}
              rx={8}
              fillOpacity={choque ? 0.35 : undefined}
              fill={choque ? "var(--color-danger-bg)" : `var(${colorRellenoNodo(n)})`}
              stroke={trazoNodo(n.id === resaltarId, seleccionado, choque)}
              strokeWidth={grosorNodo(n.id === resaltarId || seleccionado, choque)}
            />
            <foreignObject
              x={6}
              y={4}
              width={Math.max(r.ancho - 12, 10)}
              height={Math.max(r.profundo - 8, 8)}
            >
              <div className="mapa-almacen__etiqueta">
                <Icon name={ICONO_NODO[n.tipo]} size={12} />
                <span>{n.codigo}</span>
                {n.ocupacion !== null ? (
                  <span className="mapa-almacen__ocupacion">{Math.round(n.ocupacion * 100)}%</span>
                ) : null}
                {resumen && resumen.productosDistintos > 0 ? (
                  <span className="mapa-almacen__sku">{resumen.productosDistintos} SKU</span>
                ) : null}
              </div>
            </foreignObject>
            {seleccionado
              ? (["nw", "ne", "sw", "se"] as Esquina[]).map((esq) => {
                  const tiradorX = esq.includes("w") ? -TAM_TIRADOR / 2 : r.ancho - TAM_TIRADOR / 2;
                  const tiradorY = esq.includes("n")
                    ? -TAM_TIRADOR / 2
                    : r.profundo - TAM_TIRADOR / 2;
                  return (
                    <rect
                      key={esq}
                      className={`mapa-tirador mapa-tirador--${esq}`}
                      x={tiradorX}
                      y={tiradorY}
                      width={TAM_TIRADOR}
                      height={TAM_TIRADOR}
                      rx={2}
                      aria-hidden="true"
                      onPointerDown={(e) => onTiradorPointerDown(e, n, esq)}
                    />
                  );
                })
              : null}
          </g>
        );
      })}
      {obstaculosGesto.map((o) => (
        <rect
          key={`obstaculo-${o.id}`}
          x={o.pos_x as number}
          y={o.pos_y as number}
          width={o.ancho}
          height={o.profundidad}
          rx={8}
          fill="var(--color-danger-500)"
          fillOpacity={0.12}
          stroke="var(--color-danger-500)"
          strokeOpacity={0.55}
          strokeDasharray="6 4"
          pointerEvents="none"
        />
      ))}
      {sugerenciaGesto && candidatoGesto ? (
        <rect
          x={sugerenciaGesto.x}
          y={sugerenciaGesto.y}
          width={candidatoGesto.ancho}
          height={candidatoGesto.profundo}
          rx={8}
          fill="var(--color-success-500)"
          fillOpacity={0.18}
          stroke="var(--color-success-500)"
          strokeWidth={2}
          strokeDasharray="8 5"
          pointerEvents="none"
        />
      ) : null}
      {dibujo ? (
        <g pointerEvents="none">
          <rect
            className="mapa-dibujo-preview"
            x={dibujo.x}
            y={dibujo.y}
            width={dibujo.ancho}
            height={dibujo.profundo}
            rx={8}
            fill={dibujoValido ? "var(--color-success-bg)" : "var(--color-danger-bg)"}
            stroke={dibujoValido ? "var(--color-success-500)" : "var(--color-danger-500)"}
          />
          {dibujo.ancho >= LADO_MINIMO && dibujo.profundo >= LADO_MINIMO ? (
            <text x={dibujo.x + 6} y={dibujo.y - 6} fontSize={12} fill="var(--color-gray-600)">
              {Math.round(dibujo.ancho)} × {Math.round(dibujo.profundo)}
            </text>
          ) : null}
        </g>
      ) : null}
    </svg>
  );
}
