import { useMemo } from "react";
import { OrbitControls } from "@react-three/drei";
import {
  COLOR_NODO,
  resolverColorCss,
  type NodoMapa,
  type ResumenNodo,
  type TipoNodo,
} from "../mapa-almacen-datos";
import { useTema } from "../../shared/tema";
import type { CeldaRack } from "../mapa/celdas/derivarCeldasRack";
import type { InfoCelda } from "../mapa/celdas/infoCeldas";
import type { IndiceEspacial, OpcionesColocacion } from "../mapa/motor";
import { PERFILES_CALIDAD, type PrefsMapa } from "../mapa/personalizacion";
import { M_POR_UNIDAD } from "../mapa/unidades";
import type { MovimientoGrupo } from "../use-historial-mapa";
import { evaluarGrupo } from "./arrastreSoltar";
import { candidatasEtiqueta } from "./etiquetas/candidatasEtiqueta";
import { EtiquetaLOD } from "./etiquetas/EtiquetaLOD";
import { CeldasRacks } from "./estructura/CeldasRacks";
import { construirGruposRacks } from "./estructura/construirRack";
import { EstructuraRacks } from "./estructura/EstructuraRacks";
import { racksDeNodos } from "./estructura/racksDeNodos";
import { RackSeleccion } from "./estructura/RackSeleccion";
import type { Origen } from "./estructura/useCajasInstanciadas";
import { extensionEscena } from "./extensionEscena";
import type { StockPorCelda } from "../mapa/stock/stockPorCelda";
import { StockInstanciado } from "./stock/StockInstanciado";
import { useDisposicionStock } from "./stock/useDisposicionStock";
import { GuiaArrastre } from "./GuiaArrastre";
import { LucesEscena } from "./luces/LucesEscena";
import { NodoMesh } from "./NodoMesh";
import { MarcasPasillo } from "./piso/MarcasPasillo";
import { colorDeZona } from "./piso/colorDeZona";
import { PisoEscena } from "./PisoEscena";
import type { ControlsRef, PosicionXY } from "./tipos";
import { useArrastreEscena } from "./useArrastreEscena";
import { useCentrarResaltado } from "./useCentrarResaltado";
import { useDepuradorE2E } from "./useDepuradorE2E";
import { useEncuadreInicial } from "./useEncuadreInicial";
import { baseNodoCm } from "../mapa/alturas";
import { ControladorCaminata } from "./caminata/ControladorCaminata";
import { EntornoCaminata } from "./caminata/EntornoCaminata";
import type { PropsEscenaCaminata } from "./caminata/tiposCaminata";

export interface PropsEscena3D {
  nodos: NodoMapa[];
  posicionBase: Map<string, PosicionXY>;
  resumenPorNodo: Map<string, ResumenNodo>;
  /** Celdas de cada rack (por nivel y bahía) y su ocupación. */
  celdasPorRack: Map<string, CeldaRack[]>;
  infoCeldas: Map<string, InfoCelda>;
  /** Preferencias del mapa: color, etiquetas, unidad, rejilla, sombras, calidad. */
  prefs: PrefsMapa;
  /** Stock por ubicación (se dibuja si `prefs.stock`). */
  stock?: StockPorCelda;
  /** Encuadre inicial del almacén (una vez, al montar la escena). */
  onEncuadrarInicial: () => void;
  resaltarId?: string | null;
  seleccionId?: string | null;
  /** Vista de alambre (tecla Z): prismas como rejillas técnicas. */
  alambre: boolean;
  /** Selección múltiple (Shift+clic): se mueven juntos. */
  grupoIds: string[];
  onAlternarGrupo: (id: string) => void;
  /** Clic simple (sin shift, sin arrastre): selección de un nodo — reinicia
   * el grupo a solo ese nodo (semántica Blender). */
  onClicSimple: (id: string) => void;
  onMoverGrupo: (movimientos: MovimientoGrupo[]) => void;
  controlsRef: ControlsRef;
  /** Índice espacial de TODOS los nodos (también los ocultos por tipo). */
  indice: IndiceEspacial;
  opcionesColocacion: OpcionesColocacion;
  onMover: (
    tipo: TipoNodo,
    id: string,
    x: number,
    y: number,
    posZ: number | null,
    altura: number | null,
  ) => void;
  /** El drop quedaría bloqueado (choque o fuera de zona): no se guarda nada
   * y el nodo vuelve a su lugar (misma semántica que el mapa 2D). */
  onBloquear: (motivo: string) => void;
  /** El drop se guarda pero con advertencia (pasillo estrecho). */
  onAdvertir: (motivo: string) => void;
  /** Doble clic sobre un nodo: enfocarlo (frame selected). */
  onEnfocar: (id: string) => void;
  onSeleccionar: (id: string | null) => void;
  /** Caminata en primera persona: activa = la cámara la gobierna el caminante. */
  caminata: PropsEscenaCaminata & { activa: boolean };
}

const sinAccion = () => undefined;

/** Contenido de la escena: órbita, luces, piso, estructura de racks (todo
 * instanciado), guías de arrastre, nodos de piso y etiquetas con LOD. */
export function Escena3D(props: PropsEscena3D) {
  const { nodos, posicionBase, resumenPorNodo, resaltarId, seleccionId, grupoIds } = props;
  const { prefs, alambre, controlsRef } = props;
  const perfil = PERFILES_CALIDAD[prefs.calidad];
  // Suscripción al tema: al cambiar paleta/modo el componente re-renderiza y
  // la paleta resuelta (getComputedStyle) se refresca en el acto.
  const tema = useTema((s) => s.tema);
  useDepuradorE2E();
  useCentrarResaltado(resaltarId, posicionBase, controlsRef);
  useEncuadreInicial(controlsRef, props.onEncuadrarInicial, !resaltarId);
  const caminando = props.caminata.activa;
  const gesto = useArrastreEscena({ ...props, mostrarGrilla: prefs.rejilla });
  // Caminando no se arrastra nada: el mismo interruptor apaga órbita, hover y
  // gestos sobre los nodos.
  const { arrastre, posicionDe } = gesto;
  const arrastrando = gesto.arrastrando || caminando;
  const iniciarArrastre = caminando ? sinAccion : gesto.iniciarArrastre;

  const { racks, entradas } = useMemo(
    () => racksDeNodos(nodos, props.celdasPorRack),
    [nodos, props.celdasPorRack],
  );
  const grupos = useMemo(
    () => construirGruposRacks(entradas, props.infoCeldas),
    [entradas, props.infoCeldas],
  );
  const disposicionStock = useDisposicionStock(grupos, props.stock, prefs.stock);
  const origenes: Origen[] = racks.map((n) => {
    const p = posicionDe(n.id);
    return [p.x * M_POR_UNIDAD, baseNodoCm(n) * M_POR_UNIDAD, p.y * M_POR_UNIDAD];
  });
  const { centro, radio } = useMemo(
    () => extensionEscena(nodos, posicionBase),
    [nodos, posicionBase],
  );

  // Paleta de la escena resuelta UNA vez por render (getComputedStyle por
  // nodo en cada render era despilfarro; aquí son 4 consultas fijas).
  const coloresNodo: Record<TipoNodo, string> = {
    zona: resolverColorCss(COLOR_NODO.zona),
    pasillo: resolverColorCss(COLOR_NODO.pasillo),
    rack: resolverColorCss(COLOR_NODO.rack),
    ubicacion: resolverColorCss(COLOR_NODO.ubicacion),
  };
  const colorZonas = new Map<string, string>();
  nodos
    .filter((n) => n.tipo === "zona")
    .forEach((z, i) => colorZonas.set(z.id, resolverColorCss(colorDeZona(i))));

  const estadoArrastre = arrastre.current;
  const nodoArrastrado = estadoArrastre
    ? nodos.find((n) => n.id === estadoArrastre.grupo[0]?.id)
    : undefined;
  const colocaciones = estadoArrastre
    ? evaluarGrupo(estadoArrastre, props.indice, props.opcionesColocacion)
    : null;
  const resaltado = (id: string) =>
    id === resaltarId || id === seleccionId || grupoIds.includes(id);
  const forzados = new Set(nodos.filter((n) => resaltado(n.id)).map((n) => n.id));
  const pasillos = nodos.filter((n) => n.tipo === "pasillo");

  return (
    <>
      <LucesEscena
        sombras={prefs.sombras}
        centro={centro}
        radio={radio}
        mapaSombras={perfil.mapaSombras}
      />
      <OrbitControls
        ref={controlsRef}
        enabled={!arrastrando}
        enableDamping
        dampingFactor={0.08}
        autoRotate={prefs.autoRotar}
        autoRotateSpeed={0.8}
        makeDefault
      />
      <PisoEscena
        nodos={nodos}
        mostrarGrilla={prefs.rejilla}
        celdaGrillaM={prefs.rejillaM}
        onSeleccionar={props.onSeleccionar}
      />
      {caminando ? <EntornoCaminata nodos={nodos} posicionBase={posicionBase} /> : null}
      {estadoArrastre && nodoArrastrado ? (
        <GuiaArrastre
          nodo={nodoArrastrado}
          pos={posicionDe(nodoArrastrado.id)}
          movidoPx={estadoArrastre.movidoPx}
          resultado={colocaciones?.get(nodoArrastrado.id)}
          guias={estadoArrastre.guias}
          indice={props.indice}
          ignorar={new Set(estadoArrastre.grupo.map((g) => g.id))}
        />
      ) : null}
      <EstructuraRacks grupos={grupos} origenes={origenes} sombras />
      <CeldasRacks
        grupos={grupos}
        origenes={origenes}
        tema={tema}
        deshabilitado={arrastrando}
        conStock={disposicionStock.ubicaciones}
        modoColor={prefs.colorModo}
      />
      <StockInstanciado
        disposicion={disposicionStock}
        origenes={origenes}
        deshabilitado={arrastrando}
        modoColor={prefs.colorModo}
        radioLod={perfil.radioLodStockM}
      />
      <MarcasPasillo pasillos={pasillos} posicionDe={posicionDe} />
      {nodos.map((n) =>
        n.tipo === "rack" ? (
          <RackSeleccion
            key={n.id}
            nodo={n}
            colocacion={colocaciones?.get(n.id) ?? null}
            pos={posicionDe(n.id)}
            resaltado={resaltado(n.id)}
            arrastre={estadoArrastre}
            onPointerDown={iniciarArrastre}
            onEnfocar={props.onEnfocar}
          />
        ) : (
          <NodoMesh
            key={n.id}
            nodo={n}
            colocacion={colocaciones?.get(n.id) ?? null}
            pos={posicionDe(n.id)}
            resaltado={resaltado(n.id)}
            arrastre={estadoArrastre}
            colorTipo={
              n.tipo === "zona" ? (colorZonas.get(n.id) ?? coloresNodo.zona) : coloresNodo[n.tipo]
            }
            modoColor={prefs.colorModo}
            alambre={alambre}
            sombras={prefs.sombras}
            onPointerDown={iniciarArrastre}
            onEnfocar={props.onEnfocar}
          />
        ),
      )}
      {caminando ? (
        <ControladorCaminata
          nodos={nodos}
          posicionBase={posicionBase}
          celdasPorRack={props.celdasPorRack}
          infoCeldas={props.infoCeldas}
          seleccionId={seleccionId ?? null}
          controlsRef={controlsRef}
          {...props.caminata}
        />
      ) : null}
      <EtiquetaLOD
        activas={prefs.etiquetas && !caminando}
        maximo={perfil.maxEtiquetas}
        distanciaM={prefs.etiquetaDistanciaM}
        candidatas={candidatasEtiqueta(nodos, posicionDe, resumenPorNodo, forzados, prefs.unidad, {
          codigo: prefs.etiquetaCodigo,
          ocupacion: prefs.etiquetaOcupacion,
          sku: prefs.etiquetaSku,
          dimensiones: prefs.etiquetaDimensiones,
        })}
      />
    </>
  );
}
