import type { KeyboardEvent, PointerEvent } from "react";
import { useT } from "../../shared/i18n";
import type { CeldaRack } from "../mapa/celdas/derivarCeldasRack";
import type { InfoCelda } from "../mapa/celdas/infoCeldas";
import type { RectMapa, Resultado } from "../mapa/motor";
import { medidasRack } from "../mapa/celdas/medidasRack";
import type { EtiquetaNodo as ModoEtiqueta } from "./capas/capas";
import { EtiquetaNodo } from "./EtiquetaNodo";
import { detalleInterior } from "./interior/detalle-interior";
import { RackInterior } from "./interior/RackInterior";
import { colorRellenoSegunModo } from "./nodo-color";
import type { NodoMapa, ResumenNodo } from "./nodo-tipos";
import { PasilloDecor, pasilloEstrecho } from "./PasilloDecor";
import { Tirador } from "./Tirador";
import { ESQUINAS, type Esquina } from "./tipos";
import { ETIQUETA_TIPO, grosorNodo, RELLENO_COLOCACION, trazoNodo } from "./trazo";
import type { UnidadLongitud } from "../mapa/unidades";

interface Props {
  nodo: NodoMapa;
  rect: RectMapa;
  resumen: ResumenNodo | undefined;
  /** Semáforo de colocación mientras se edita este nodo; null si no se edita. */
  colocacion: Resultado | null;
  resaltado: boolean;
  seleccionado: boolean;
  /** Modo construcción: el nodo seleccionado se puede redimensionar. */
  conTiradores: boolean;
  /** Capa bloqueada: no se arrastra ni se redimensiona. */
  fijo: boolean;
  modoEtiqueta: ModoEtiqueta;
  /** Modo de color de las preferencias compartidas con el 3D. */
  modoColor: string;
  /** Unidades de SVG por píxel de pantalla. */
  escala: number;
  unidad: UnidadLongitud;
  celdas: CeldaRack[] | undefined;
  infoCeldas: Map<string, InfoCelda>;
  /** Activa el nodo (seleccionar, o abrir el detalle si ya estaba seleccionado). */
  onActivar: () => void;
  onPointerDown: (e: PointerEvent<SVGGElement>) => void;
  onDoubleClick: () => void;
  onTiradorPointerDown: (e: PointerEvent<SVGRectElement>, esquina: Esquina) => void;
}

/** Un nodo del lienzo: rectángulo, estructura interior, etiqueta y tiradores. */
export function NodoSvg(props: Props) {
  const { nodo: n, rect: r, resumen, colocacion, resaltado, seleccionado, escala } = props;
  const t = useT();
  const estado = colocacion?.estado ?? null;
  const bloqueado = estado === "bloqueado";
  const estrecho = n.tipo === "pasillo" && pasilloEstrecho(r.ancho, r.profundo);
  const ocupacionTxt =
    n.ocupacion === null ? "" : `, ${Math.round(n.ocupacion * 100)}% de ocupación`;
  const notas = [
    colocacion?.motivo,
    estrecho ? t.lienzo2D.pasilloEstrechoAria : null,
    props.fijo ? t.lienzo2D.capaBloqueadaAria : null,
  ].filter(Boolean);
  const onKeyDown = (e: KeyboardEvent<SVGGElement>) => {
    // Activa con teclado (WCAG 2.1.1): los <g> role=button no disparan click nativo.
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      props.onActivar();
    }
  };
  const niveles = n.tipo === "rack" ? medidasRack(n).niveles : 1;
  const maxBahias = props.celdas ? Math.max(0, ...props.celdas.map((c) => c.nBahias)) : 0;
  const detalle =
    n.tipo === "rack"
      ? detalleInterior(r.ancho / escala, r.profundo / escala, maxBahias, niveles)
      : 0;
  const avisoEstrecho = estrecho && !resaltado && !seleccionado && !estado;
  return (
    <g
      transform={`translate(${r.x}, ${r.y})`}
      onPointerDown={props.onPointerDown}
      onDoubleClick={props.onDoubleClick}
      onKeyDown={onKeyDown}
      className={`mapa-almacen__nodo${bloqueado ? " mapa-almacen__nodo--invalido" : ""}${props.fijo ? " mapa-almacen__nodo--fijo" : ""}`}
      role="button"
      tabIndex={0}
      aria-label={`${ETIQUETA_TIPO[n.tipo]} ${n.codigo}${ocupacionTxt}${notas.length ? ", " + notas.join(", ") : ""}`}
      aria-pressed={seleccionado}
    >
      <rect
        width={r.ancho}
        height={r.profundo}
        rx={8}
        fillOpacity={estado === "bloqueado" || estado === "advertencia" ? 0.35 : undefined}
        fill={
          estado === "bloqueado" || estado === "advertencia"
            ? RELLENO_COLOCACION[estado]
            : `var(${colorRellenoSegunModo(n, props.modoColor)})`
        }
        stroke={
          avisoEstrecho ? "var(--color-warning-500)" : trazoNodo(resaltado, seleccionado, estado)
        }
        strokeWidth={avisoEstrecho ? 2 : grosorNodo(resaltado || seleccionado, estado)}
        strokeDasharray={avisoEstrecho ? "6 3" : undefined}
      />
      {n.tipo === "rack" ? (
        <RackInterior
          celdas={props.celdas ?? []}
          info={props.infoCeldas}
          ancho={r.ancho}
          profundo={r.profundo}
          niveles={niveles}
          detalle={detalle}
          escala={escala}
        />
      ) : null}
      {n.tipo === "pasillo" ? (
        <PasilloDecor ancho={r.ancho} profundo={r.profundo} escala={escala} unidad={props.unidad} />
      ) : null}
      <EtiquetaNodo
        nodo={n}
        resumen={resumen}
        modo={props.modoEtiqueta}
        ancho={r.ancho}
        profundo={r.profundo}
        posicion={detalle >= 2 ? "arriba" : n.tipo === "pasillo" ? "chip" : "centro"}
      />
      {seleccionado && props.conTiradores && !props.fijo
        ? ESQUINAS.map((esq) => (
            <Tirador
              key={esq}
              esquina={esq}
              ancho={r.ancho}
              profundo={r.profundo}
              escala={escala}
              onPointerDown={props.onTiradorPointerDown}
            />
          ))
        : null}
    </g>
  );
}
