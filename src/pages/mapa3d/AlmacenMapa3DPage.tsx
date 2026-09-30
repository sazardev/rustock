import { useId, useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Canvas } from "@react-three/fiber";
import { useParams, useSearchParams } from "react-router";
import { obtenerAlmacen } from "../../shared/backend";
import { useMapaAlmacenDatos, type TipoNodo } from "../mapa-almacen-datos";
import { NodoSeleccionadoPanel } from "../NodoSeleccionadoPanel";
import { cn } from "../../shared/lib/cn";
import { BarraMapa3D } from "./BarraMapa3D";
import { HudCaminata } from "./caminata/HudCaminata";
import { useCaminata } from "./caminata/useCaminata";
import { useMotorColocacion } from "../mapa/motor";
import { PERFILES_CALIDAD, usePrefsMapa } from "../mapa/personalizacion";
import { useStockMapa } from "../mapa/stock/useStockMapa";
import { CAMARA_CERCA, CAMARA_INICIAL, CAMARA_LEJOS, TIPOS_VISIBLES_INICIAL } from "./constantes";
import { Escena3D } from "./Escena3D";
import { EstadoMapa3D } from "./EstadoMapa3D";
import { PanelPersonalizacion } from "./personalizacion/PanelPersonalizacion";
import { MedidorDev } from "./MedidorDev";
import { usePosicionBase } from "./posicionBase";
import { cantidadSintetica, datosSinteticos, SINTETICO_PERMITIDO } from "./sintetico";
import { useAtajosEditor } from "./useAtajosEditor";
import { useAtajosSeleccion } from "./useAtajosSeleccion";
import { useCamara } from "./useCamara";
import { useDeshacerRehacer } from "./useDeshacerRehacer";
import { useMovimientosMapa } from "./useMovimientosMapa";
import { useMutacionesMapa } from "./useMutacionesMapa";
import { usePantallaCompleta } from "./usePantallaCompleta";
import { useSeleccionMapa } from "./useSeleccionMapa";
import { useTransformacionesMapa } from "./useTransformacionesMapa";
import { tieneWebGL } from "./utils";

/** Editor 3D inmersivo estilo Figma/Blender: el lienzo ocupa toda la ventana y
 * la UI (barra superior + panel del nodo) flota encima, estática. */
export function AlmacenMapa3DPage() {
  const { id: almacenId } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const resaltarUrl = searchParams.get("resaltar");
  // Una sola detección por montaje: la capacidad WebGL no cambia en caliente.
  const [webglDisponible] = useState(tieneWebGL);
  const reales = useMapaAlmacenDatos(almacenId);
  const nSintetico = cantidadSintetica(searchParams.get("sintetico"));
  // Solo desarrollo/mediciones: `?sintetico=N` sustituye los datos por N racks falsos.
  const sintetico = useMemo(
    () => (nSintetico > 0 ? datosSinteticos(nSintetico) : null),
    [nSintetico],
  );
  const { resolverResaltado } = reales;
  const nodos = sintetico?.nodos ?? reales.nodos;
  const cargando = sintetico ? false : reales.cargando;
  const resumenPorNodo = sintetico?.resumenPorNodo ?? reales.resumenPorNodo;
  const celdasPorRack = sintetico?.celdasPorRack ?? reales.celdasPorRack;
  const infoCeldas = sintetico?.infoCeldas ?? reales.infoCeldas;
  const resaltarId = resolverResaltado(resaltarUrl);
  const almacenQ = useQuery({
    queryKey: ["mapa-almacen", "almacen", almacenId],
    queryFn: () => obtenerAlmacen(almacenId!),
    enabled: Boolean(almacenId),
  });
  const editorRef = useRef<HTMLDivElement>(null);

  const sel = useSeleccionMapa(resaltarId);
  const [tiposVisibles, setTiposVisibles] = useState(TIPOS_VISIBLES_INICIAL);
  const [panelAbierto, setPanelAbierto] = useState(false);
  const idPanel = useId();
  const [alambre, setAlambre] = useState(false);
  const { prefs, cambiarPref } = usePrefsMapa();
  const stockReal = useStockMapa(!sintetico && prefs.stock).stock;
  const perfil = PERFILES_CALIDAD[prefs.calidad];
  const { pantallaCompleta, alternarPantallaCompleta } = usePantallaCompleta(editorRef);

  const seleccionado = nodos.find((n) => n.id === sel.seleccionadoId) ?? null;
  const nodosVisibles = useMemo(
    () => nodos.filter((n) => tiposVisibles[n.tipo]),
    [nodos, tiposVisibles],
  );
  const posicionBase = usePosicionBase(nodos);
  const { indice, opciones: opcionesColocacion } = useMotorColocacion(nodos);

  const cam = useCamara(nodos, posicionBase);
  const caminata = useCaminata(prefs.sensibilidadMirada, cam.controlsRef);
  const mut = useMutacionesMapa(sel.setSeleccionadoId);
  const mov = useMovimientosMapa(nodos, seleccionado, mut, posicionBase);
  const { deshacer, rehacer } = useDeshacerRehacer(mut);
  const { nudgear, rotarSeleccionado, duplicarSeleccionado } = useTransformacionesMapa({
    almacenId,
    nodos,
    seleccionado,
    seleccionadoId: sel.seleccionadoId,
    grupoIds: sel.grupoIds,
    posicionBase,
    indice,
    opcionesColocacion,
    crearMut: mut.crearMut,
    mov,
  });

  useAtajosSeleccion({
    seleccionado,
    deseleccionar: () => sel.setSeleccionadoId(null),
  });
  useAtajosEditor(
    {
      deshacer,
      rehacer,
      nudgear,
      rotar: rotarSeleccionado,
      duplicar: duplicarSeleccionado,
      enfocar: cam.enfocarNodo,
      alternarCaminar: caminata.alternar,
      alternarAlambre: () => setAlambre((v) => !v),
      caminando: caminata.activa,
    },
    sel.seleccionadoId,
  );

  if (!almacenId) {
    return null;
  }

  if (cargando || nodos.length === 0 || !webglDisponible) {
    return <EstadoMapa3D almacenId={almacenId} cargando={cargando} vacio={nodos.length === 0} />;
  }

  const alternarTipo = (tipo: TipoNodo) =>
    setTiposVisibles((prev) => ({ ...prev, [tipo]: !prev[tipo] }));

  return (
    <div ref={editorRef} className="mapa3d-full">
      <div className="mapa3d-full__lienzo">
        <Canvas
          camera={{ position: CAMARA_INICIAL, fov: 45, near: CAMARA_CERCA, far: CAMARA_LEJOS }}
          frameloop={prefs.autoRotar || caminata.activa ? "always" : "demand"}
          dpr={perfil.dpr}
          shadows="percentage"
        >
          {SINTETICO_PERMITIDO ? <MedidorDev /> : null}
          <Escena3D
            nodos={nodosVisibles}
            posicionBase={posicionBase}
            resumenPorNodo={resumenPorNodo}
            celdasPorRack={celdasPorRack}
            infoCeldas={infoCeldas}
            prefs={prefs}
            stock={sintetico?.stock ?? stockReal}
            onEncuadrarInicial={cam.encuadrarTodo}
            resaltarId={resaltarId}
            seleccionId={sel.seleccionadoId}
            grupoIds={sel.grupoIds}
            onAlternarGrupo={sel.alternarGrupo}
            onClicSimple={sel.alClicSimple}
            alambre={alambre}
            controlsRef={cam.controlsRef}
            caminata={{ activa: caminata.activa, ...caminata.escena }}
            onMover={mov.moverDesdeEscena}
            onMoverGrupo={mov.moverGrupoDesdeEscena}
            indice={indice}
            opcionesColocacion={opcionesColocacion}
            onBloquear={mov.alBloquear}
            onAdvertir={mov.alAdvertir}
            onEnfocar={cam.enfocarNodo}
            onSeleccionar={sel.alSeleccionar}
          />
        </Canvas>
      </div>
      {caminata.activa ? null : (
        <div className="mapa3d-full__ui">
          <BarraMapa3D
            almacenId={almacenId}
            codigoAlmacen={almacenQ.data?.codigo}
            puedeDeshacer={mut.hist.puedeDeshacer}
            puedeRehacer={mut.hist.puedeRehacer}
            moviendo={mut.moverMut.isPending}
            onDeshacer={deshacer}
            onRehacer={rehacer}
            onEncuadrar={cam.encuadrarTodo}
            onResetear={cam.resetearVista}
            onVista={cam.irAVista}
            prefs={prefs}
            onCambiarPref={cambiarPref}
            caminando={caminata.activa}
            onCaminar={caminata.alternar}
            alambre={alambre}
            onAlternarAlambre={() => setAlambre((v) => !v)}
            tiposVisibles={tiposVisibles}
            onAlternarTipo={alternarTipo}
            pantallaCompleta={pantallaCompleta}
            onPantallaCompleta={alternarPantallaCompleta}
            panelAbierto={panelAbierto}
            onAlternarPanel={() => setPanelAbierto((v) => !v)}
            idPanel={idPanel}
          />
          <div
            className={cn(
              "mapa3d-full__cuerpo",
              panelAbierto && "mapa3d-full__cuerpo--personalizando",
            )}
          >
            <div className="mapa3d-full__panel">
              <NodoSeleccionadoPanel
                nodo={seleccionado}
                onCerrar={() => sel.setSeleccionadoId(null)}
                onGuardarPosicion={mov.guardarPosicionSeleccionado}
                guardandoPosicion={mut.moverMut.isPending || mut.crearMut.isPending}
                onDuplicar={duplicarSeleccionado}
                duplicando={mut.crearMut.isPending}
              />
            </div>
            {panelAbierto ? (
              <PanelPersonalizacion
                id={idPanel}
                prefs={prefs}
                onCambiar={cambiarPref}
                onCerrar={() => setPanelAbierto(false)}
              />
            ) : null}
          </div>
        </div>
      )}
      {caminata.activa ? (
        <HudCaminata
          nodos={nodosVisibles}
          posicionBase={posicionBase}
          onSalir={caminata.alternar}
          {...caminata.hud}
        />
      ) : null}
    </div>
  );
}
