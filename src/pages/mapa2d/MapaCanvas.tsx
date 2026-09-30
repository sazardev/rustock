import { useId, useMemo, useRef, useState, type PointerEvent } from "react";
import { useT } from "../../shared/i18n";
import { useToast } from "../../shared/ui";
import type { CeldaRack } from "../mapa/celdas/derivarCeldasRack";
import type { InfoCelda } from "../mapa/celdas/infoCeldas";
import { usePrefsMapa } from "../mapa/personalizacion";
import { PASO_REJILLA } from "../mapa/reglas";
import { candidatoDe, evaluarColocacion, useMotorColocacion, type RectMapa } from "../mapa/motor";
import { calcularApoyoGesto, evaluarDibujo } from "./apoyo-gesto";
import type { useCapasMapa } from "./capas/useCapasMapa";
import { CapaGuias } from "./CapaGuias";
import { Obstaculos, Sugerencia, VistaPreviaDibujo } from "./CapasGesto";
import { CotasNodo } from "./cotas/CotasNodo";
import { CotasVecinos } from "./cotas/CotasVecinos";
import { distanciasAVecinos } from "./cotas/distancias-vecinos";
import { EtiquetaMotivo } from "./EtiquetaMotivo";
import { posicionesBase } from "./geometria-lienzo";
import type { NodoMapa, ResumenNodo, TipoNodo } from "./nodo-tipos";
import { NodoSvg } from "./NodoSvg";
import type { Herramienta, HerramientaDibujo, OnMoverNodo } from "./tipos";
import { useEscapeLienzo, useFlechasNodo } from "./useAtajosLienzo";
import { useGestosLienzo } from "./useGestosLienzo";
import { useUnidadMapa } from "./useUnidadMapa";
import { useViewBox } from "./useViewBox";
import { AyudaAtajos } from "./vista/AyudaAtajos";
import { BarraEscala } from "./vista/BarraEscala";
import { BarraVista } from "./vista/BarraVista";
import { PanelCapas } from "./vista/PanelCapas";
import { useAtajosVista } from "./vista/useAtajosVista";
import { usePinzaLienzo } from "./vista/usePinzaLienzo";

interface Props {
  nodos: NodoMapa[];
  resumenPorNodo: Map<string, ResumenNodo>;
  celdasPorRack: Map<string, CeldaRack[]>;
  infoCeldas: Map<string, InfoCelda>;
  capasCtl: ReturnType<typeof useCapasMapa>;
  resaltarId?: string | null;
  construir: boolean;
  herramienta: Herramienta;
  rejilla: boolean;
  seleccionId: string | null;
  onSeleccionar: (id: string | null) => void;
  onMover: OnMoverNodo;
  onClickNodo: (tipo: TipoNodo, id: string) => void;
  onCrear: (tipo: HerramientaDibujo, rect: RectMapa) => void;
}

/** Lienzo SVG del mapa 2D: compone viewBox, gestos, atajos, capas y cotas. */
export function MapaCanvas(props: Props) {
  const { nodos, resumenPorNodo, resaltarId, construir, herramienta, rejilla, seleccionId } = props;
  const { capas } = props.capasCtl;
  const t = useT();
  const { toast } = useToast();
  const unidad = useUnidadMapa();
  const modoColor = usePrefsMapa().prefs.colorModo;
  const idCapas = useId();
  const idAyuda = useId();
  const [capasAbierto, setCapasAbierto] = useState(false);
  const [ayudaAbierta, setAyudaAbierta] = useState(false);
  const svgRef = useRef<SVGSVGElement>(null);
  const posicionBase = useMemo(() => posicionesBase(nodos), [nodos]);
  const nodoPorId = useMemo(() => new Map(nodos.map((n) => [n.id, n])), [nodos]);
  const visibles = useMemo(
    () => nodos.filter((n) => capas.visible[n.tipo]),
    [nodos, capas.visible],
  );
  const contenido = useMemo(
    () =>
      visibles.map((n) => ({
        ...(posicionBase.get(n.id) ?? { x: 0, y: 0 }),
        ancho: n.ancho,
        profundo: n.profundidad,
      })),
    [visibles, posicionBase],
  );
  const { indice, opciones } = useMotorColocacion(nodos);
  const vista = useViewBox(svgRef, resaltarId, posicionBase, contenido);
  const gestos = useGestosLienzo({
    ...props,
    nodoPorId,
    posicionBase,
    viewBox: vista.viewBox,
    setViewBox: vista.setViewBox,
    escala: vista.escala,
    aSvg: vista.aSvg,
    bloqueado: (tipo) => capas.bloqueado[tipo],
    avisar: (mensaje) => toast(mensaje, "error"),
    advertir: (mensaje) => toast(mensaje, "default"),
    indice,
    opciones,
  });
  useEscapeLienzo(gestos.cancelarGesto, props.onSeleccionar);
  useFlechasNodo(construir, seleccionId, nodoPorId, (tipo, ...resto) => {
    if (!capas.bloqueado[tipo]) {
      props.onMover(tipo, ...resto);
    }
  });
  const pinza = usePinzaLienzo({ alIniciar: gestos.cancelarGesto, alMover: vista.pinzaPaso });
  const alTeclear = useAtajosVista({
    flechasSonDeNodo: construir && !!seleccionId,
    zoomCentrado: vista.zoomCentrado,
    panPx: vista.panPx,
    encuadrar: vista.encuadrar,
  });

  const sesion = gestos.arrastre.current;
  /** Nodo que se está arrastrando/redimensionando ahora (para no calcular
   * colisiones de todo el lienzo en cada frame — solo el nodo en edición). */
  const editandoId = sesion?.kind === "nodo" || sesion?.kind === "resize" ? sesion.nodoId : null;
  const editando = editandoId ? nodoPorId.get(editandoId) : undefined;
  const rectEditando = editando ? gestos.rectDe(editando) : null;
  const colocacionEditando =
    editando && rectEditando
      ? evaluarColocacion(indice, candidatoDe(editando, rectEditando), opciones)
      : null;
  const apoyo = calcularApoyoGesto({
    nodos,
    nodoPorId,
    sesion,
    herramienta,
    dibujo: gestos.dibujo,
    rectDe: gestos.rectDe,
    indice,
    opciones,
  });
  const resultadoDibujo = evaluarDibujo(gestos.dibujo, herramienta, indice, opciones);
  const { viewBox } = vista;
  const escala = vista.escalaRender;
  const seleccionado = seleccionId ? nodoPorId.get(seleccionId) : undefined;
  const distancias =
    editando && rectEditando && construir
      ? distanciasAVecinos(indice, rectEditando, editando.id, editando.zona_id)
      : [];
  const activar = (n: NodoMapa) => props.onSeleccionar(seleccionId === n.id ? null : n.id);

  const onPointerUp = (e: PointerEvent<SVGSVGElement>) => {
    const eraPinza = pinza.pinzaActiva();
    pinza.soltar(e);
    // Un dedo que termina una pinza no es un clic ni un arrastre de nodo.
    if (eraPinza) {
      gestos.cancelarGesto();
    } else {
      gestos.onPointerUp(e);
    }
  };

  return (
    <div className="mapa-lienzo">
      <BarraVista
        onAcercar={() => vista.zoomCentrado(0.8)}
        onAlejar={() => vista.zoomCentrado(1.25)}
        onEncuadrar={vista.encuadrar}
        capasAbierto={capasAbierto}
        onAlternarCapas={() => setCapasAbierto((v) => !v)}
        ayudaAbierta={ayudaAbierta}
        onAlternarAyuda={() => setAyudaAbierta((v) => !v)}
        idPanelCapas={idCapas}
        idPanelAyuda={idAyuda}
      />
      {capasAbierto ? (
        <PanelCapas
          id={idCapas}
          capas={capas}
          onVisible={props.capasCtl.alternarVisible}
          onBloqueo={props.capasCtl.alternarBloqueo}
          onEtiqueta={props.capasCtl.fijarEtiqueta}
        />
      ) : null}
      {ayudaAbierta ? <AyudaAtajos id={idAyuda} construir={construir} /> : null}
      <div className="mapa-lienzo__area">
        {/* El lienzo es un widget con teclado propio (zoom y desplazamiento): debe ser enfocable. */}
        {/* oxlint-disable-next-line jsx-a11y/no-noninteractive-element-interactions */}
        <svg
          ref={svgRef}
          className="mapa-almacen__lienzo"
          viewBox={`${viewBox.x} ${viewBox.y} ${viewBox.w} ${viewBox.h}`}
          onPointerDownCapture={pinza.onPointerDownCapture}
          onPointerMove={(e) => {
            pinza.onPointerMove(e);
            if (!pinza.pinzaActiva()) {
              gestos.onPointerMove(e);
            }
          }}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
          onKeyDown={alTeclear}
          // oxlint-disable-next-line jsx-a11y/no-noninteractive-tabindex
          tabIndex={0}
          role="application"
          aria-label={t.mapa3d.lienzo2DAria}
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
            x={viewBox.x - viewBox.w}
            y={viewBox.y - viewBox.h}
            width={viewBox.w * 3}
            height={viewBox.h * 3}
            fill="var(--color-gray-50)"
            onPointerDown={gestos.onFondoPointerDown}
            onDoubleClick={vista.encuadrar}
          />
          {construir && rejilla && PASO_REJILLA / escala >= 6 ? (
            <rect
              x={viewBox.x}
              y={viewBox.y}
              width={viewBox.w}
              height={viewBox.h}
              fill="url(#mapa-rejilla)"
              pointerEvents="none"
            />
          ) : null}
          {visibles.map((n) => (
            <NodoSvg
              key={n.id}
              nodo={n}
              rect={gestos.rectDe(n)}
              resumen={resumenPorNodo.get(n.id)}
              colocacion={n.id === editandoId ? colocacionEditando : null}
              resaltado={n.id === resaltarId}
              seleccionado={seleccionId === n.id}
              fijo={capas.bloqueado[n.tipo]}
              conTiradores={construir}
              modoEtiqueta={capas.etiqueta}
              modoColor={modoColor}
              escala={escala}
              unidad={unidad}
              celdas={props.celdasPorRack.get(n.id)}
              infoCeldas={props.infoCeldas}
              onActivar={() => activar(n)}
              onPointerDown={(e) => gestos.onNodoPointerDown(e, n)}
              onDoubleClick={() => props.onClickNodo(n.tipo, n.id)}
              onTiradorPointerDown={(e, esq) => gestos.onTiradorPointerDown(e, n, esq)}
            />
          ))}
          <Obstaculos nodos={apoyo.obstaculos} />
          {apoyo.sugerencia && apoyo.candidato ? (
            <Sugerencia posicion={apoyo.sugerencia} candidato={apoyo.candidato} />
          ) : null}
          <CapaGuias guias={gestos.guias} escala={escala} />
          <CotasVecinos distancias={distancias} escala={escala} unidad={unidad} />
          {rectEditando ? (
            <CotasNodo rect={rectEditando} escala={escala} unidad={unidad} />
          ) : seleccionado && capas.visible[seleccionado.tipo] ? (
            <CotasNodo rect={gestos.rectDe(seleccionado)} escala={escala} unidad={unidad} />
          ) : null}
          {editando && rectEditando && colocacionEditando ? (
            <EtiquetaMotivo rect={rectEditando} resultado={colocacionEditando} escala={escala} />
          ) : null}
          {gestos.dibujo && resultadoDibujo ? (
            <>
              <VistaPreviaDibujo dibujo={gestos.dibujo} resultado={resultadoDibujo} />
              <CotasNodo rect={gestos.dibujo} escala={escala} unidad={unidad} />
              <EtiquetaMotivo rect={gestos.dibujo} resultado={resultadoDibujo} escala={escala} />
            </>
          ) : null}
        </svg>
        <BarraEscala escala={escala} unidad={unidad} />
        {visibles.length === 0 ? (
          <p className="mapa-lienzo__vacio">{t.lienzo2D.todoOculto}</p>
        ) : null}
      </div>
    </div>
  );
}
