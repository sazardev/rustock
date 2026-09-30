import { catalogoDetalle } from "../../app/route-paths";
import { useT } from "../../shared/i18n";
import {
  Badge,
  ButtonLink,
  Card,
  DetailList,
  EmptyState,
  Icon,
  Link,
  type DetailItem,
} from "../../shared/ui";
import type { CeldaRack } from "../mapa/celdas/derivarCeldasRack";
import type { InfoCelda } from "../mapa/celdas/infoCeldas";
import { formatearLongitud, type UnidadLongitud } from "../mapa/unidades";
import { AlzadoRack } from "./alzado/AlzadoRack";
import { construirAlzado } from "./alzado/geometria-alzado";
import { LeyendaOcupacion } from "./alzado/LeyendaOcupacion";
import type { NodoMapa, ResumenNodo } from "./nodo-tipos";
import { SLUG_POR_TIPO } from "./nodo-tipos";
import { pasilloEstrecho } from "./PasilloDecor";
import { ETIQUETA_TIPO } from "./trazo";

interface Props {
  nodo: NodoMapa | null;
  nodoPorId: Map<string, NodoMapa>;
  resumen: ResumenNodo | undefined;
  celdas: CeldaRack[] | undefined;
  infoCeldas: Map<string, InfoCelda>;
  unidad: UnidadLongitud;
  onCerrar: () => void;
}

/** Detalle inline del nodo seleccionado; en racks, su alzado con las celdas. */
export function PanelDetalleNodo({
  nodo,
  nodoPorId,
  resumen,
  celdas,
  infoCeldas,
  unidad,
  onCerrar,
}: Props) {
  const t = useT();
  if (!nodo) {
    return (
      <Card title={t.lienzo2D.detalle}>
        <EmptyState
          icon="zona"
          title={t.lienzo2D.sinSeleccionTitulo}
          description={t.lienzo2D.sinSeleccionDescripcion}
        />
      </Card>
    );
  }
  const zona = nodo.zona_id ? nodoPorId.get(nodo.zona_id) : undefined;
  const items: DetailItem[] = [
    { label: t.lienzo2D.campo.tipo, value: ETIQUETA_TIPO[nodo.tipo] },
    {
      label: t.lienzo2D.campo.dimensiones,
      value: `${formatearLongitud(nodo.ancho, unidad)} × ${formatearLongitud(nodo.profundidad, unidad)}`,
    },
  ];
  if (zona) {
    items.push({
      label: t.lienzo2D.campo.zona,
      value: <Link href={catalogoDetalle(SLUG_POR_TIPO.zona, zona.id)}>{zona.codigo}</Link>,
    });
  }
  if (nodo.ocupacion !== null) {
    items.push({
      label: t.lienzo2D.campo.ocupacion,
      value: `${Math.round(nodo.ocupacion * 100)}%`,
    });
  }
  if (resumen && resumen.productosDistintos > 0) {
    items.push({
      label: t.lienzo2D.campo.contenido,
      value: t.lienzo2D.contenidoValor({
        sku: resumen.productosDistintos,
        unidades: resumen.unidadesTotales,
      }),
    });
  }
  const estrecho = nodo.tipo === "pasillo" && pasilloEstrecho(nodo.ancho, nodo.profundidad);
  const alzado =
    nodo.tipo === "rack" && celdas && celdas.length > 0
      ? construirAlzado(nodo, celdas, infoCeldas)
      : null;
  return (
    <Card
      title={`${ETIQUETA_TIPO[nodo.tipo]} ${nodo.codigo}`}
      actions={
        <>
          <ButtonLink
            variant="secondary"
            size="sm"
            icon="ver"
            href={catalogoDetalle(SLUG_POR_TIPO[nodo.tipo], nodo.id)}
          >
            {t.lienzo2D.abrirFicha}
          </ButtonLink>
          <button
            type="button"
            className="mapa-panel__cerrar"
            onClick={onCerrar}
            aria-label={t.lienzo2D.cerrarDetalle}
          >
            <Icon name="cerrarPanel" size={16} />
          </button>
        </>
      }
    >
      <div className="mapa-detalle">
        {estrecho ? (
          <Badge tone="warning" icon="alerta">
            {t.lienzo2D.pasilloEstrechoBadge}
          </Badge>
        ) : null}
        <DetailList items={items} />
        {nodo.tipo === "rack" ? (
          alzado ? (
            <section className="mapa-detalle__alzado" aria-label={t.lienzo2D.alzado}>
              <h3 className="mapa-detalle__subtitulo">{t.lienzo2D.alzado}</h3>
              <AlzadoRack alzado={alzado} unidad={unidad} />
              <LeyendaOcupacion />
            </section>
          ) : (
            <p className="mapa-detalle__vacio">{t.lienzo2D.rackSinUbicaciones}</p>
          )
        ) : null}
      </div>
    </Card>
  );
}
