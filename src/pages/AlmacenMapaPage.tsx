import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
  type WheelEvent as ReactWheelEvent,
} from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate, useParams, useSearchParams } from "react-router";
import { obtenerAlmacen } from "../shared/backend";
import { Icon, ButtonLink, Card, PageHeader, Text } from "../shared/ui";
import { catalogoDetalle, almacenMapa3D } from "../app/route-paths";
import {
  ANCHO_NODO,
  ALTO_NODO,
  colorOcupacion,
  type NodoMapa,
  posicionPorDefecto,
  type ResumenNodo,
  SLUG_POR_TIPO,
  type TipoNodo,
  useMapaAlmacenDatos,
  useMoverNodoMapa,
} from "./mapa-almacen-datos";

// DESIGN §7: Zona/Rack/Sección comparten ícono (LayoutGrid), aquí mapeado a "zona".
const ICONO_NODO: Record<TipoNodo, "zona" | "ubicacion"> = {
  zona: "zona",
  pasillo: "zona",
  rack: "zona",
  ubicacion: "ubicacion",
};

const UMBRAL_CLIC_PX = 4;

export function AlmacenMapaPage() {
  const { id: almacenId } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const resaltarId = searchParams.get("resaltar");
  const navigate = useNavigate();

  const almacenQ = useQuery({
    queryKey: ["mapa-almacen", "almacen", almacenId],
    queryFn: () => obtenerAlmacen(almacenId!),
    enabled: !!almacenId,
  });

  const { nodos, cargando, resumenPorNodo } = useMapaAlmacenDatos(almacenId);
  const moverMut = useMoverNodoMapa();

  const irADetalle = (tipo: TipoNodo, id: string) => {
    navigate(catalogoDetalle(SLUG_POR_TIPO[tipo], id));
  };

  if (!almacenId) {
    return null;
  }

  return (
    <>
      <PageHeader
        title={almacenQ.data ? `Mapa — ${almacenQ.data.codigo}` : "Mapa del almacén"}
        description="Arrastra zonas, racks y ubicaciones para posicionarlos. Haz clic para ver el detalle."
        actions={
          <ButtonLink variant="ghost" icon="ubicacion" href={almacenMapa3D(almacenId)}>
            Ver mapa 3D
          </ButtonLink>
        }
      />
      <Card title="Mapa 2D">
        <Card.Body>
          {cargando ? (
            <Text as="p" size="sm" color="muted">
              Cargando estructura…
            </Text>
          ) : nodos.length === 0 ? (
            <Text as="p" size="sm" color="muted">
              Este almacén aún no tiene zonas, racks o ubicaciones para mostrar en el mapa.
            </Text>
          ) : (
            <MapaCanvas
              nodos={nodos}
              resumenPorNodo={resumenPorNodo}
              resaltarId={resaltarId}
              onMover={(tipo, nodoId, x, y, pos_z, altura) =>
                moverMut.mutate({ tipo, nodoId, pos: { pos_x: x, pos_y: y, pos_z, altura } })
              }
              onClickNodo={irADetalle}
            />
          )}
        </Card.Body>
      </Card>
    </>
  );
}

interface ViewBox {
  x: number;
  y: number;
  w: number;
  h: number;
}

function MapaCanvas({
  nodos,
  resumenPorNodo,
  resaltarId,
  onMover,
  onClickNodo,
}: {
  nodos: NodoMapa[];
  resumenPorNodo: Map<string, ResumenNodo>;
  resaltarId?: string | null;
  onMover: (
    tipo: TipoNodo,
    id: string,
    x: number,
    y: number,
    pos_z: number | null,
    altura: number | null,
  ) => void;
  onClickNodo: (tipo: TipoNodo, id: string) => void;
}) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [viewBox, setViewBox] = useState<ViewBox>({ x: 0, y: 0, w: 1100, h: 620 });
  const [posOverride, setPosOverride] = useState<Record<string, { x: number; y: number }>>({});
  const arrastre = useRef<{
    pointerId: number;
    kind: "pan" | "nodo";
    nodoId?: string;
    tipo?: TipoNodo;
    /** pos_z/altura del nodo al iniciar el arrastre: el drag 2D solo mueve
     * x/y, así que se reenvían sin cambios al guardar (antes se perdían,
     * quedando en `null` en cada arrastre — bug corregido junto con el 3D). */
    posZ: number | null;
    altura: number | null;
    startClientX: number;
    startClientY: number;
    startX: number;
    startY: number;
    /** Última posición calculada en vivo (ref, no state): evita leer un
     * `posOverride` desactualizado por closures si el pointerup llega antes
     * de que React re-renderice con el último `setPosOverride`. */
    actualX: number;
    actualY: number;
    movidoPx: number;
  } | null>(null);

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

  const posicionDe = (id: string) => posOverride[id] ?? posicionBase.get(id) ?? { x: 0, y: 0 };

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
    arrastre.current = {
      pointerId: e.pointerId,
      kind: "pan",
      posZ: null,
      altura: null,
      startClientX: e.clientX,
      startClientY: e.clientY,
      startX: viewBox.x,
      startY: viewBox.y,
      actualX: viewBox.x,
      actualY: viewBox.y,
      movidoPx: 0,
    };
  };

  const onNodoPointerDown = (e: ReactPointerEvent<SVGGElement>, nodo: NodoMapa) => {
    e.stopPropagation();
    (e.target as Element).setPointerCapture(e.pointerId);
    const pos = posicionDe(nodo.id);
    arrastre.current = {
      pointerId: e.pointerId,
      kind: "nodo",
      nodoId: nodo.id,
      tipo: nodo.tipo,
      posZ: nodo.pos_z,
      altura: nodo.altura,
      startClientX: e.clientX,
      startClientY: e.clientY,
      startX: pos.x,
      startY: pos.y,
      actualX: pos.x,
      actualY: pos.y,
      movidoPx: 0,
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
      est.actualX = est.startX - dxPx * s;
      est.actualY = est.startY - dyPx * s;
      setViewBox((v) => ({ ...v, x: est.actualX, y: est.actualY }));
    } else if (est.nodoId) {
      est.actualX = est.startX + dxPx * s;
      est.actualY = est.startY + dyPx * s;
      setPosOverride((prev) => ({
        ...prev,
        [est.nodoId!]: { x: est.actualX, y: est.actualY },
      }));
    }
  };

  const onPointerUp = (e: ReactPointerEvent<SVGSVGElement>) => {
    const est = arrastre.current;
    if (!est || est.pointerId !== e.pointerId) {
      return;
    }
    arrastre.current = null;
    if (est.kind === "nodo" && est.nodoId && est.tipo) {
      if (est.movidoPx < UMBRAL_CLIC_PX) {
        onClickNodo(est.tipo, est.nodoId);
      } else {
        onMover(
          est.tipo,
          est.nodoId,
          Math.round(est.actualX),
          Math.round(est.actualY),
          est.posZ,
          est.altura,
        );
      }
    }
  };

  return (
    <svg
      ref={svgRef}
      className="mapa-almacen__lienzo"
      viewBox={`${viewBox.x} ${viewBox.y} ${viewBox.w} ${viewBox.h}`}
      onWheel={onWheel}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      role="img"
      aria-label="Mapa físico del almacén"
    >
      <rect
        x={viewBox.x - 2000}
        y={viewBox.y - 2000}
        width={4000}
        height={4000}
        fill="var(--color-gray-50, #faf9f7)"
        onPointerDown={onFondoPointerDown}
      />
      {nodos.map((n) => {
        const pos = posicionDe(n.id);
        const ancho = ANCHO_NODO[n.tipo];
        const alto = ALTO_NODO[n.tipo];
        const resumen = resumenPorNodo.get(n.id);
        return (
          <g
            key={n.id}
            transform={`translate(${pos.x}, ${pos.y})`}
            onPointerDown={(e) => onNodoPointerDown(e, n)}
            className="mapa-almacen__nodo"
            role="button"
            tabIndex={0}
          >
            <rect
              width={ancho}
              height={alto}
              rx={8}
              fill={`var(${colorOcupacion(n.ocupacion)})`}
              stroke={n.id === resaltarId ? "var(--color-blue-500)" : "var(--border-color-strong)"}
              strokeWidth={n.id === resaltarId ? 2.5 : 1}
            />
            <foreignObject x={6} y={4} width={ancho - 12} height={alto - 8}>
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
          </g>
        );
      })}
    </svg>
  );
}
