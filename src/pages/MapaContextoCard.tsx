/**
 * Tarjeta "Ubicación en el mapa": mini-vista de solo lectura (sin drag/zoom)
 * con los hermanos directos del nodo (mismo tipo + mismo padre inmediato),
 * más la lista de apilado vertical (mismo pos_x/pos_y, distinto pos_z) para
 * responder "qué hay encima/debajo de esto". Se inserta en el detalle de
 * Zona/Pasillo/Rack/Ubicación (`CatalogPages.tsx`).
 *
 * No reutiliza `MapaCanvas` de `AlmacenMapaPage.tsx` a propósito: ese
 * componente ya está probado end-to-end con drag/pan/zoom y no vale la pena
 * arriesgarlo por un refactor — aquí se reimplementa en pequeño, solo
 * lectura.
 */
import { useQuery } from "@tanstack/react-query";
import {
  listarPasillos,
  listarRacks,
  listarUbicaciones,
  listarZonas,
  obtenerRack,
  obtenerSeccion,
  obtenerZona,
} from "../shared/backend";
import { esPaginado, type Pasillo, type Rack, type Ubicacion, type Zona } from "../shared/types";
import { Card, Icon, Link, Text } from "../shared/ui";
import { almacenMapa, catalogoDetalle } from "../app/route-paths";

type TipoContexto = "zona" | "pasillo" | "rack" | "ubicacion";

type Props =
  | { tipo: "zona"; row: Zona }
  | { tipo: "pasillo"; row: Pasillo }
  | { tipo: "rack"; row: Rack }
  | { tipo: "ubicacion"; row: Ubicacion };

interface NodoSimple {
  id: string;
  codigo: string;
  pos_x: number | null;
  pos_y: number | null;
  pos_z: number | null;
  altura: number | null;
}

const SIN_DATOS: never[] = [];
const TOLERANCIA_MISMA_POSICION = 15;

export function MapaContextoCard({ tipo, row }: Props) {
  // 1) Resolver la cadena hacia arriba hasta la zona (y de ahí el almacén).
  const seccionId = tipo === "ubicacion" ? row.seccion_id : null;
  const seccionQ = useQuery({
    queryKey: ["mapa-contexto", "seccion", seccionId],
    queryFn: () => obtenerSeccion(seccionId as string),
    enabled: !!seccionId,
  });

  const rackIdDirecto =
    tipo === "rack"
      ? row.id
      : tipo === "ubicacion"
        ? (row.rack_id ?? seccionQ.data?.rack_id)
        : null;
  const rackQ = useQuery({
    queryKey: ["mapa-contexto", "rack", rackIdDirecto],
    queryFn: () => obtenerRack(rackIdDirecto as string),
    enabled: !!rackIdDirecto,
  });

  const zonaId =
    tipo === "zona"
      ? row.id
      : tipo === "pasillo" || tipo === "rack"
        ? row.zona_id
        : (row.zona_id ?? rackQ.data?.zona_id ?? null);
  const zonaQ = useQuery({
    queryKey: ["mapa-contexto", "zona", zonaId],
    queryFn: () => obtenerZona(zonaId as string),
    enabled: !!zonaId,
  });
  const almacenId = zonaQ.data?.almacen_id ?? null;

  // 2) Hermanos: mismo tipo + mismo padre inmediato que `row`.
  const zonasHermanasQ = useQuery({
    queryKey: ["mapa-contexto", "hermanos-zonas", almacenId],
    queryFn: () => listarZonas({ filters: [`almacen_id:eq:${almacenId}`], page_size: -1 }),
    enabled: tipo === "zona" && !!almacenId,
  });
  const pasillosHermanosQ = useQuery({
    queryKey: ["mapa-contexto", "hermanos-pasillos", zonaId],
    queryFn: () => listarPasillos({ filters: [`zona_id:eq:${zonaId}`], page_size: -1 }),
    enabled: tipo === "pasillo" && !!zonaId,
  });
  const racksHermanosQ = useQuery({
    queryKey: [
      "mapa-contexto",
      "hermanos-racks",
      tipo === "rack" ? row.zona_id : null,
      tipo === "rack" ? row.pasillo_id : null,
    ],
    queryFn: () => {
      const r = row as Rack;
      const filtro = r.pasillo_id ? `pasillo_id:eq:${r.pasillo_id}` : `zona_id:eq:${r.zona_id}`;
      return listarRacks({ filters: [filtro], page_size: -1 });
    },
    enabled: tipo === "rack",
  });
  const ubicacionesHermanasQ = useQuery({
    queryKey: [
      "mapa-contexto",
      "hermanos-ubicaciones",
      tipo === "ubicacion" ? [row.seccion_id, row.rack_id, row.zona_id] : null,
    ],
    queryFn: () => {
      const u = row as Ubicacion;
      const filtro = u.seccion_id
        ? `seccion_id:eq:${u.seccion_id}`
        : u.rack_id
          ? `rack_id:eq:${u.rack_id}`
          : `zona_id:eq:${u.zona_id}`;
      return listarUbicaciones({ filters: [filtro], page_size: -1 });
    },
    enabled: tipo === "ubicacion",
  });

  const hermanos: NodoSimple[] =
    tipo === "zona"
      ? zonasHermanasQ.data && esPaginado(zonasHermanasQ.data)
        ? zonasHermanasQ.data.data
        : SIN_DATOS
      : tipo === "pasillo"
        ? pasillosHermanosQ.data && esPaginado(pasillosHermanosQ.data)
          ? pasillosHermanosQ.data.data
          : SIN_DATOS
        : tipo === "rack"
          ? racksHermanosQ.data && esPaginado(racksHermanosQ.data)
            ? racksHermanosQ.data.data
            : SIN_DATOS
          : ubicacionesHermanasQ.data && esPaginado(ubicacionesHermanasQ.data)
            ? ubicacionesHermanasQ.data.data
            : SIN_DATOS;

  const cargando =
    zonasHermanasQ.isLoading ||
    pasillosHermanosQ.isLoading ||
    racksHermanosQ.isLoading ||
    ubicacionesHermanasQ.isLoading;

  if (cargando) {
    return (
      <Card title="Ubicación en el mapa" className="mt-6">
        <Card.Body>
          <Text as="p" size="sm" color="muted">
            Cargando…
          </Text>
        </Card.Body>
      </Card>
    );
  }

  const conPosicion = hermanos.filter((h) => h.pos_x !== null && h.pos_y !== null);
  const mismaPosicion = conPosicion
    .filter(
      (h) =>
        row.pos_x !== null &&
        row.pos_y !== null &&
        Math.abs(h.pos_x! - row.pos_x) < TOLERANCIA_MISMA_POSICION &&
        Math.abs(h.pos_y! - row.pos_y) < TOLERANCIA_MISMA_POSICION,
    )
    .toSorted((a, b) => (a.pos_z ?? 0) - (b.pos_z ?? 0));
  const indiceActual = mismaPosicion.findIndex((h) => h.id === row.id);
  const debajo = indiceActual > 0 ? mismaPosicion[indiceActual - 1] : null;
  const encima =
    indiceActual >= 0 && indiceActual < mismaPosicion.length - 1
      ? mismaPosicion[indiceActual + 1]
      : null;

  return (
    <Card title="Ubicación en el mapa" className="mt-6">
      <Card.Body>
        {row.pos_x === null || row.pos_y === null ? (
          <Text as="p" size="sm" color="muted" className="mb-3">
            Este nodo aún no tiene una posición asignada en el mapa.
          </Text>
        ) : (
          <MiniMapa hermanos={conPosicion} actualId={row.id} />
        )}
        {mismaPosicion.length > 1 ? (
          <div className="mt-3">
            <Text as="p" size="sm" weight="medium">
              Apilado en este sitio
            </Text>
            <ul className="mapa-contexto__apilado">
              <li>
                <Text as="span" size="sm" color="muted">
                  ▲ encima:{" "}
                </Text>
                {encima ? <NodoLink tipo={tipo} nodo={encima} /> : <Text as="span">—</Text>}
              </li>
              <li>
                <Text as="span" size="sm" weight="semibold">
                  {row.codigo} (esta)
                </Text>
              </li>
              <li>
                <Text as="span" size="sm" color="muted">
                  ▼ debajo:{" "}
                </Text>
                {debajo ? <NodoLink tipo={tipo} nodo={debajo} /> : <Text as="span">—</Text>}
              </li>
            </ul>
          </div>
        ) : null}
        {almacenId ? (
          <div className="mt-3">
            <Link href={almacenMapa(almacenId, row.id)}>Ver en el mapa completo →</Link>
          </div>
        ) : null}
      </Card.Body>
    </Card>
  );
}

function NodoLink({ tipo, nodo }: { tipo: TipoContexto; nodo: NodoSimple }) {
  const slug =
    tipo === "zona"
      ? "zonas"
      : tipo === "pasillo"
        ? "pasillos"
        : tipo === "rack"
          ? "racks"
          : "ubicaciones";
  return <Link href={catalogoDetalle(slug, nodo.id)}>{nodo.codigo}</Link>;
}

/** Vista cenital fija (sin pan/zoom/drag) de un nodo y sus hermanos. */
function MiniMapa({ hermanos, actualId }: { hermanos: NodoSimple[]; actualId: string }) {
  const xs = hermanos.map((h) => h.pos_x!);
  const ys = hermanos.map((h) => h.pos_y!);
  const minX = Math.min(...xs) - 40;
  const maxX = Math.max(...xs) + 40;
  const minY = Math.min(...ys) - 40;
  const maxY = Math.max(...ys) + 40;
  const ancho = Math.max(100, maxX - minX);
  const alto = Math.max(100, maxY - minY);

  return (
    <svg
      className="mapa-contexto__lienzo"
      viewBox={`${minX} ${minY} ${ancho} ${alto}`}
      role="img"
      aria-label="Vista del entorno inmediato en el mapa"
    >
      {hermanos.map((h) => (
        <g key={h.id} transform={`translate(${h.pos_x}, ${h.pos_y})`}>
          <rect
            width={50}
            height={30}
            rx={6}
            fill={h.id === actualId ? "var(--color-blue-100)" : "var(--color-gray-100)"}
            stroke={h.id === actualId ? "var(--color-blue-500)" : "var(--border-color-strong)"}
            strokeWidth={h.id === actualId ? 2.5 : 1}
          />
          <foreignObject x={4} y={2} width={42} height={26}>
            <div className="mapa-contexto__etiqueta">
              <Icon name="ubicacion" size={10} />
              <span>{h.codigo}</span>
            </div>
          </foreignObject>
        </g>
      ))}
    </svg>
  );
}
