/**
 * Panel fijo (no drawer — DESIGN §5.1 prohíbe paneles deslizantes/flotantes)
 * dentro del layout del mapa 3D: muestra el nodo seleccionado con acceso
 * directo a su detalle, posición editable, contenido y metadata. Siempre
 * ocupa su espacio en la página; vacío si no hay selección.
 */
import { useQuery } from "@tanstack/react-query";
import { obtenerPasillo, obtenerRack, obtenerUbicacion, obtenerZona } from "../shared/backend";
import type { Pasillo, Rack, Ubicacion, Zona } from "../shared/types";
import { Badge, Button, ButtonLink, Card, DetailList, Text } from "../shared/ui";
import { PosicionFormCard, type PosicionValores } from "../shared/posicion-form-card";
import { ContenidoInventarioCard } from "./ContenidoInventarioCard";
import { catalogoDetalle } from "../app/route-paths";
import { formatearFecha } from "../shared/format";
import { SLUG_POR_TIPO, type NodoMapa, type TipoNodo } from "./mapa-almacen-datos";

const ETIQUETA_TIPO: Record<TipoNodo, string> = {
  zona: "Zona",
  pasillo: "Pasillo",
  rack: "Rack",
  ubicacion: "Ubicación",
};

export function NodoSeleccionadoPanel({
  nodo,
  onCerrar,
  onGuardarPosicion,
  guardandoPosicion,
}: {
  nodo: NodoMapa | null;
  onCerrar: () => void;
  onGuardarPosicion: (pos: PosicionValores) => void;
  guardandoPosicion: boolean;
}) {
  const zonaQ = useQuery({
    queryKey: ["panel-nodo", "zona", nodo?.id],
    queryFn: () => obtenerZona(nodo?.id as string),
    enabled: nodo?.tipo === "zona",
  });
  const pasilloQ = useQuery({
    queryKey: ["panel-nodo", "pasillo", nodo?.id],
    queryFn: () => obtenerPasillo(nodo?.id as string),
    enabled: nodo?.tipo === "pasillo",
  });
  const rackQ = useQuery({
    queryKey: ["panel-nodo", "rack", nodo?.id],
    queryFn: () => obtenerRack(nodo?.id as string),
    enabled: nodo?.tipo === "rack",
  });
  const ubicacionQ = useQuery({
    queryKey: ["panel-nodo", "ubicacion", nodo?.id],
    queryFn: () => obtenerUbicacion(nodo?.id as string),
    enabled: nodo?.tipo === "ubicacion",
  });

  if (!nodo) {
    return (
      <div className="mapa-almacen-3d__panel">
        <Card title="Nodo seleccionado">
          <Card.Body>
            <Text as="p" size="sm" color="muted">
              Selecciona un nodo del mapa para ver sus detalles.
            </Text>
          </Card.Body>
        </Card>
      </div>
    );
  }

  return (
    <div className="mapa-almacen-3d__panel">
      <Card
        title={nodo.codigo}
        actions={
          <Button
            variant="ghost"
            size="icon"
            icon="cerrarPanel"
            aria-label="Cerrar selección"
            onClick={onCerrar}
          />
        }
      >
        <Card.Body>
          <Badge tone="info">{ETIQUETA_TIPO[nodo.tipo]}</Badge>
          <div className="mt-3">
            <ButtonLink
              variant="secondary"
              icon="ver"
              href={catalogoDetalle(SLUG_POR_TIPO[nodo.tipo], nodo.id)}
            >
              Ir hacia
            </ButtonLink>
          </div>
        </Card.Body>
      </Card>

      <PosicionFormCard
        valores={{ pos_x: nodo.pos_x, pos_y: nodo.pos_y, pos_z: nodo.pos_z, altura: nodo.altura }}
        onGuardar={onGuardarPosicion}
        guardando={guardandoPosicion}
      />

      {nodo.tipo === "zona" && zonaQ.data ? (
        <ContenidoDeNodo tipo="zona" entidad={zonaQ.data} />
      ) : null}
      {nodo.tipo === "pasillo" && pasilloQ.data ? (
        <ContenidoDeNodo tipo="pasillo" entidad={pasilloQ.data} />
      ) : null}
      {nodo.tipo === "rack" && rackQ.data ? (
        <ContenidoDeNodo tipo="rack" entidad={rackQ.data} />
      ) : null}
      {nodo.tipo === "ubicacion" && ubicacionQ.data ? (
        <ContenidoDeNodo tipo="ubicacion" entidad={ubicacionQ.data} />
      ) : null}
    </div>
  );
}

type EntidadConAuditoria = {
  created_at: string;
  updated_at: string;
  created_by: string | null;
  updated_by: string | null;
};

function ContenidoDeNodo(
  props:
    | { tipo: "zona"; entidad: Zona }
    | { tipo: "pasillo"; entidad: Pasillo }
    | { tipo: "rack"; entidad: Rack }
    | { tipo: "ubicacion"; entidad: Ubicacion },
) {
  const entidad: EntidadConAuditoria = props.entidad;
  return (
    <>
      {props.tipo === "zona" ? <ContenidoInventarioCard tipo="zona" row={props.entidad} /> : null}
      {props.tipo === "pasillo" ? (
        <ContenidoInventarioCard tipo="pasillo" row={props.entidad} />
      ) : null}
      {props.tipo === "rack" ? <ContenidoInventarioCard tipo="rack" row={props.entidad} /> : null}
      {props.tipo === "ubicacion" ? (
        <ContenidoInventarioCard tipo="ubicacion" row={props.entidad} />
      ) : null}
      <Card title="Metadata" className="mt-6">
        <Card.Body>
          <DetailList
            items={[
              { label: "Creado", value: formatearFecha(entidad.created_at) },
              { label: "Actualizado", value: formatearFecha(entidad.updated_at) },
              { label: "Creado por", value: entidad.created_by ?? "—" },
              { label: "Actualizado por", value: entidad.updated_by ?? "—" },
            ]}
          />
        </Card.Body>
      </Card>
    </>
  );
}
