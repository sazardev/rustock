import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate, useParams, useSearchParams } from "react-router";
import { obtenerAlmacen } from "../../shared/backend";
import { Button, ButtonLink, Card, EmptyState, PageHeader } from "../../shared/ui";
import { almacenMapa3D, catalogoDetalle } from "../../app/route-paths";
import { useT } from "../../shared/i18n";
import { SLUG_POR_TIPO, type TipoNodo } from "./nodo-tipos";
import { useCapasMapa } from "./capas/useCapasMapa";
import { BarraHerramientas } from "./BarraHerramientas";
import { MapaCanvas } from "./MapaCanvas";
import type { Herramienta } from "./tipos";
import { useAccionesMapa } from "./useAccionesMapa";
import { useEdicionMapa } from "./useEdicionMapa";
import { useMapaAlmacenDatos } from "./useMapaAlmacenDatos";
import { useUnidadMapa } from "./useUnidadMapa";
import { PanelDetalleNodo } from "./PanelDetalleNodo";

export function AlmacenMapaPage() {
  const t = useT();
  const { id: almacenId } = useParams<{ id: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const resaltarUrl = searchParams.get("resaltar");
  const construir = searchParams.get("modo") === "construir";
  const navigate = useNavigate();

  const almacenQ = useQuery({
    queryKey: ["mapa-almacen", "almacen", almacenId],
    queryFn: () => obtenerAlmacen(almacenId!),
    enabled: !!almacenId,
  });
  const { nodos, cargando, resumenPorNodo, celdasPorRack, infoCeldas, resolverResaltado } =
    useMapaAlmacenDatos(almacenId);
  const resaltarId = resolverResaltado(resaltarUrl);

  const [herramienta, setHerramienta] = useState<Herramienta>("seleccionar");
  const [rejilla, setRejilla] = useState(true);
  const [seleccionId, setSeleccionId] = useState<string | null>(null);
  const capasCtl = useCapasMapa();
  const unidad = useUnidadMapa();
  const nodoPorId = useMemo(() => new Map(nodos.map((n) => [n.id, n])), [nodos]);
  const seleccionado = seleccionId ? (nodoPorId.get(seleccionId) ?? null) : null;

  const acciones = useAccionesMapa(setSeleccionId);
  const edicion = useEdicionMapa(almacenId, nodos, acciones);

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

  if (!almacenId) {
    return null;
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
              disabled={!acciones.puedeDeshacer}
              onClick={acciones.deshacer}
            >
              {t.mapa.deshacer}
            </Button>
            <Button
              variant="ghost"
              icon="rehacer"
              disabled={!acciones.puedeRehacer}
              onClick={acciones.rehacer}
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
        <BarraHerramientas
          almacenId={almacenId}
          herramienta={herramienta}
          onHerramienta={setHerramienta}
          rejilla={rejilla}
          onAlternarRejilla={() => setRejilla((v) => !v)}
          puedeRotar={!!seleccionado && !capasCtl.capas.bloqueado[seleccionado.tipo]}
          onRotar={() => {
            if (seleccionado && !capasCtl.capas.bloqueado[seleccionado.tipo]) {
              edicion.rotar(seleccionado.id);
            }
          }}
          hayZonas={nodos.some((n) => n.tipo === "zona")}
        />
      ) : null}
      <div className="mapa-2d-layout">
        <Card title={t.mapa.mapa2D} className="mapa-2d-layout__lienzo">
          {cargando ? (
            <p className="mapa-estado">{t.mapa.cargandoEstructura}</p>
          ) : nodos.length === 0 ? (
            <EmptyState
              icon="zona"
              title={construir ? t.mapa.lienzoVacioTitulo : t.mapa.sinEstructuraTitulo}
              description={construir ? t.mapa.lienzoVacio : t.mapa.sinEstructura}
            />
          ) : (
            <MapaCanvas
              nodos={nodos}
              resumenPorNodo={resumenPorNodo}
              celdasPorRack={celdasPorRack}
              infoCeldas={infoCeldas}
              capasCtl={capasCtl}
              resaltarId={resaltarId}
              construir={construir}
              herramienta={herramienta}
              rejilla={rejilla}
              seleccionId={seleccionId}
              onSeleccionar={setSeleccionId}
              onMover={edicion.mover}
              onClickNodo={(tipo: TipoNodo, id: string) =>
                navigate(catalogoDetalle(SLUG_POR_TIPO[tipo], id))
              }
              onCrear={edicion.crearDesdeDibujo}
            />
          )}
        </Card>
        {nodos.length > 0 ? (
          <aside className="mapa-2d-layout__detalle" aria-label={t.lienzo2D.detalle}>
            <PanelDetalleNodo
              nodo={seleccionado}
              nodoPorId={nodoPorId}
              resumen={seleccionado ? resumenPorNodo.get(seleccionado.id) : undefined}
              celdas={seleccionado ? celdasPorRack.get(seleccionado.id) : undefined}
              infoCeldas={infoCeldas}
              unidad={unidad}
              onCerrar={() => setSeleccionId(null)}
            />
          </aside>
        ) : null}
      </div>
    </>
  );
}
