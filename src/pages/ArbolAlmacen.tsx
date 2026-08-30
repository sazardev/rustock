import { useQuery } from "@tanstack/react-query";
import {
  listarPasillos,
  listarRacks,
  listarSecciones,
  listarUbicaciones,
  listarZonas,
} from "../shared/backend";
import {
  esPaginado,
  type Pasillo,
  type Rack,
  type Seccion,
  type Ubicacion,
  type Zona,
} from "../shared/types";
import { Card, Link, Text } from "../shared/ui";
import { catalogoDetalle, catalogoNuevo } from "../app/route-paths";
import { formatearFecha } from "../shared/format";
import { useT } from "../shared/i18n";

/**
 * Árbol físico navegable de un almacén (SPEC §3.13): Almacén → Zona → Rack →
 * Sección → Ubicación. Cada nodo enlaza a su página de detalle; los niveles
 * se cargan con filtros por padre (no se trae todo el catálogo).
 */
export function ArbolAlmacen({ almacenId }: { almacenId: string }) {
  const t = useT();
  const zonasQ = useQuery({
    queryKey: ["arbol-almacen", "zonas", almacenId],
    queryFn: () =>
      listarZonas({ filters: [`almacen_id:eq:${almacenId}`], sort: "codigo", page_size: -1 }),
  });
  const zonas = zonasQ.data && esPaginado(zonasQ.data) ? zonasQ.data.data : [];
  const zonaIds = zonas.map((z) => z.id);

  const pasillosQ = useQuery({
    queryKey: ["arbol-almacen", "pasillos", almacenId, zonaIds],
    queryFn: () =>
      listarPasillos({
        filters: [`zona_id:in:${zonaIds.join(",")}`],
        sort: "codigo",
        page_size: -1,
      }),
    enabled: zonaIds.length > 0,
  });
  const pasillos = pasillosQ.data && esPaginado(pasillosQ.data) ? pasillosQ.data.data : [];

  const racksQ = useQuery({
    queryKey: ["arbol-almacen", "racks", almacenId, zonaIds],
    queryFn: () =>
      listarRacks({ filters: [`zona_id:in:${zonaIds.join(",")}`], sort: "codigo", page_size: -1 }),
    enabled: zonaIds.length > 0,
  });
  const racks = racksQ.data && esPaginado(racksQ.data) ? racksQ.data.data : [];
  const rackIds = racks.map((r) => r.id);

  const seccionesQ = useQuery({
    queryKey: ["arbol-almacen", "secciones", almacenId, rackIds],
    queryFn: () =>
      listarSecciones({
        filters: [`rack_id:in:${rackIds.join(",")}`],
        sort: "codigo",
        page_size: -1,
      }),
    enabled: rackIds.length > 0,
  });
  const secciones = seccionesQ.data && esPaginado(seccionesQ.data) ? seccionesQ.data.data : [];
  const seccionIds = secciones.map((s) => s.id);

  const ubicacionesQ = useQuery({
    queryKey: ["arbol-almacen", "ubicaciones", almacenId, seccionIds, rackIds, zonaIds],
    queryFn: () => {
      const filtros = [
        seccionIds.length ? `seccion_id:in:${seccionIds.join(",")}` : "",
        rackIds.length ? `rack_id:in:${rackIds.join(",")}` : "",
        zonaIds.length ? `zona_id:in:${zonaIds.join(",")}` : "",
      ].filter(Boolean);
      return listarUbicaciones({
        filters: filtros,
        filter_logic: "OR",
        sort: "codigo",
        page_size: -1,
      });
    },
    enabled: seccionIds.length > 0 || rackIds.length > 0 || zonaIds.length > 0,
  });
  const ubicaciones =
    ubicacionesQ.data && esPaginado(ubicacionesQ.data) ? ubicacionesQ.data.data : [];

  const cargando =
    zonasQ.isLoading ||
    pasillosQ.isLoading ||
    racksQ.isLoading ||
    seccionesQ.isLoading ||
    ubicacionesQ.isLoading;

  const pasillosDe = (zonaId: string) => pasillos.filter((p) => p.zona_id === zonaId);
  // Racks colgados directo de la zona (sin pasillo asignado, SPEC §3.3b).
  const racksDe = (zonaId: string) => racks.filter((r) => r.zona_id === zonaId && !r.pasillo_id);
  const racksDePasillo = (pasilloId: string) => racks.filter((r) => r.pasillo_id === pasilloId);
  const seccionesDe = (rackId: string) => secciones.filter((s) => s.rack_id === rackId);
  const ubicacionesDe = (padre: { zona?: string; rack?: string; seccion?: string }) =>
    ubicaciones.filter(
      (u) =>
        (padre.zona !== undefined && u.zona_id === padre.zona) ||
        (padre.rack !== undefined && u.rack_id === padre.rack) ||
        (padre.seccion !== undefined && u.seccion_id === padre.seccion),
    );

  return (
    <Card title={t.mapa3d.arbolFisico} className="mt-6">
      <Card.Body>
        {cargando ? (
          <Text as="p" size="sm" color="muted">
            {t.comun.cargandoEstructura}
          </Text>
        ) : zonas.length === 0 ? (
          <Text as="p" size="sm" color="muted">
            Este almacén aún no tiene zonas.{" "}
            <Link href={catalogoNuevo("zonas")}>Crear una zona</Link>.
          </Text>
        ) : (
          <ul className="arbol-almacen">
            {zonas.map((z: Zona) => (
              <li key={z.id}>
                <NodoZona
                  zona={z}
                  pasillos={pasillosDe(z.id)}
                  racks={racksDe(z.id)}
                  racksDePasillo={racksDePasillo}
                  seccionesDe={seccionesDe}
                  ubicacionesDe={ubicacionesDe}
                />
              </li>
            ))}
          </ul>
        )}
      </Card.Body>
    </Card>
  );
}

function etiquetaNodo(codigo: string, nombre: string | null): string {
  return nombre ? `${codigo} — ${nombre}` : codigo;
}

function NodoZona({
  zona,
  pasillos,
  racks,
  racksDePasillo,
  seccionesDe,
  ubicacionesDe,
}: {
  zona: Zona;
  pasillos: Pasillo[];
  racks: Rack[];
  racksDePasillo: (pasilloId: string) => Rack[];
  seccionesDe: (rackId: string) => Seccion[];
  ubicacionesDe: (p: { zona?: string; rack?: string; seccion?: string }) => Ubicacion[];
}) {
  const ubiDirectas = ubicacionesDe({ zona: zona.id });
  return (
    <>
      <div className="arbol-almacen__nodo">
        <Link href={catalogoDetalle("zonas", zona.id)}>
          {etiquetaNodo(zona.codigo, zona.nombre)}
        </Link>
        <Text size="xs" color="muted" as="span">
          {" "}
          · creada {formatearFecha(zona.created_at)}
        </Text>
      </div>
      {pasillos.length > 0 || racks.length > 0 || ubiDirectas.length > 0 ? (
        <ul>
          {pasillos.map((p) => (
            <li key={p.id}>
              <NodoPasillo
                pasillo={p}
                racks={racksDePasillo(p.id)}
                seccionesDe={seccionesDe}
                ubicacionesDe={ubicacionesDe}
              />
            </li>
          ))}
          {racks.map((r) => (
            <li key={r.id}>
              <NodoRack rack={r} secciones={seccionesDe(r.id)} ubicacionesDe={ubicacionesDe} />
            </li>
          ))}
          {ubiDirectas.map((u) => (
            <li key={u.id}>
              <UbicacionNodo u={u} />
            </li>
          ))}
        </ul>
      ) : null}
    </>
  );
}

function NodoPasillo({
  pasillo,
  racks,
  seccionesDe,
  ubicacionesDe,
}: {
  pasillo: Pasillo;
  racks: Rack[];
  seccionesDe: (rackId: string) => Seccion[];
  ubicacionesDe: (p: { zona?: string; rack?: string; seccion?: string }) => Ubicacion[];
}) {
  return (
    <>
      <div className="arbol-almacen__nodo">
        <Link href={catalogoDetalle("pasillos", pasillo.id)}>
          {etiquetaNodo(pasillo.codigo, pasillo.nombre)}
        </Link>
      </div>
      {racks.length > 0 ? (
        <ul>
          {racks.map((r) => (
            <li key={r.id}>
              <NodoRack rack={r} secciones={seccionesDe(r.id)} ubicacionesDe={ubicacionesDe} />
            </li>
          ))}
        </ul>
      ) : null}
    </>
  );
}

function NodoRack({
  rack,
  secciones,
  ubicacionesDe,
}: {
  rack: Rack;
  secciones: Seccion[];
  ubicacionesDe: (p: { zona?: string; rack?: string; seccion?: string }) => Ubicacion[];
}) {
  const ubiDirectas = ubicacionesDe({ rack: rack.id });
  return (
    <>
      <div className="arbol-almacen__nodo">
        <Link href={catalogoDetalle("racks", rack.id)}>
          {etiquetaNodo(rack.codigo, rack.nombre)}
        </Link>
      </div>
      {secciones.length > 0 || ubiDirectas.length > 0 ? (
        <ul>
          {secciones.map((s) => (
            <li key={s.id}>
              <NodoSeccion seccion={s} ubicaciones={ubicacionesDe({ seccion: s.id })} />
            </li>
          ))}
          {ubiDirectas.map((u) => (
            <li key={u.id}>
              <UbicacionNodo u={u} />
            </li>
          ))}
        </ul>
      ) : null}
    </>
  );
}

function NodoSeccion({ seccion, ubicaciones }: { seccion: Seccion; ubicaciones: Ubicacion[] }) {
  return (
    <>
      <div className="arbol-almacen__nodo">
        <Link href={catalogoDetalle("secciones", seccion.id)}>
          {etiquetaNodo(seccion.codigo, seccion.nombre)}
        </Link>
      </div>
      {ubicaciones.length > 0 ? (
        <ul>
          {ubicaciones.map((u) => (
            <li key={u.id}>
              <UbicacionNodo u={u} />
            </li>
          ))}
        </ul>
      ) : null}
    </>
  );
}

function UbicacionNodo({ u }: { u: Ubicacion }) {
  return (
    <div className="arbol-almacen__nodo">
      <Link href={catalogoDetalle("ubicaciones", u.id)}>{etiquetaNodo(u.codigo, u.nombre)}</Link>
    </div>
  );
}
