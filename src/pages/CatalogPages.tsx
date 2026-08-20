import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router";
import type { CatalogAdapter } from "./catalog-adapters";
import {
  esPaginado,
  type Pasillo,
  type Producto,
  type Rack,
  type Ubicacion,
  type Zona,
} from "../shared/types";
import { crearComentario, listarComentarios } from "../shared/backend";
import { mensajeError } from "../shared/format";
import { almacenMapa, catalogoDetalle, catalogoLista } from "../app/route-paths";
import { ArbolAlmacen } from "./ArbolAlmacen";
import { MapaContextoCard } from "./MapaContextoCard";
import { ContenidoInventarioCard } from "./ContenidoInventarioCard";
import { ProductoUbicacionesCard } from "./ProductoUbicacionesCard";
import { FavoritosFiltros } from "../shared/favoritos";
import {
  Button,
  ButtonLink,
  Card,
  DetailList,
  ErrorPanel,
  FilterBar,
  FilterField,
  Link,
  PageHeader,
  Pagination,
  Search,
  Table,
  Text,
  Textarea,
  useToast,
} from "../shared/ui";

const PAGE_SIZE = 20;

/** Concordancia de género para la copia genérica de catálogos (AGENTS.md:
 * "UI copy es profesional en español"). `adapter.genero` marca los pocos
 * sustantivos femeninos (Ubicación, Categoría, Unidad, Zona, Sección, Caja);
 * el resto usa las formas masculinas por defecto. */
function esFemenino<T extends { id: string }>(adapter: CatalogAdapter<T>) {
  return adapter.genero === "F";
}

function articuloNuevo<T extends { id: string }>(adapter: CatalogAdapter<T>) {
  return esFemenino(adapter) ? "Nueva" : "Nuevo";
}

function articuloPrimero<T extends { id: string }>(adapter: CatalogAdapter<T>) {
  return esFemenino(adapter) ? "la primera" : "el primer";
}

function participioEncontrado<T extends { id: string }>(adapter: CatalogAdapter<T>) {
  return esFemenino(adapter) ? "encontrada" : "encontrado";
}

function participioDesactivado<T extends { id: string }>(adapter: CatalogAdapter<T>) {
  return esFemenino(adapter) ? "desactivada" : "desactivado";
}

export function CatalogListPage<T extends { id: string }>({
  adapter,
  slug,
}: {
  adapter: CatalogAdapter<T>;
  slug: string;
}) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [q, setQ] = useState("");

  const query = useQuery({
    queryKey: ["catalogo", slug, { page, q }],
    queryFn: () =>
      adapter.listar({ page, page_size: PAGE_SIZE, q: q || undefined, sort: "-created_at" }),
  });

  const listado = query.data && esPaginado(query.data) ? query.data : null;
  const filas = listado?.data ?? [];

  // Prefetch bajo demanda (STACK §8.4): el detalle al pasar el ratón sobre la
  // fila, y la página siguiente al pasar sobre los controles de paginación.
  function prefetchDetalle(row: T) {
    void queryClient.prefetchQuery({
      queryKey: ["catalogo-detalle", slug, row.id],
      queryFn: () => adapter.obtener(row.id),
    });
  }

  function prefetchPagina(p: number) {
    void queryClient.prefetchQuery({
      queryKey: ["catalogo", slug, { page: p, q }],
      queryFn: () =>
        adapter.listar({ page: p, page_size: PAGE_SIZE, q: q || undefined, sort: "-created_at" }),
    });
  }

  return (
    <>
      <PageHeader
        title={adapter.titulo}
        description={adapter.descripcion}
        actions={
          adapter.crearHref ? (
            <ButtonLink variant="primary" icon="agregar" href={adapter.crearHref}>
              {articuloNuevo(adapter)} {adapter.singular.toLowerCase()}
            </ButtonLink>
          ) : undefined
        }
      />

      {query.error ? (
        <ErrorPanel title="No se pudo cargar el catálogo">{mensajeError(query.error)}</ErrorPanel>
      ) : null}

      <FilterBar>
        <FilterField grow>
          <Search
            aria-label={`Buscar ${adapter.singular.toLowerCase()}`}
            placeholder={`Buscar ${adapter.singular.toLowerCase()}…`}
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              setPage(1);
            }}
          />
        </FilterField>
      </FilterBar>

      <FavoritosFiltros
        clave={`catalogo:${slug}`}
        estadoActual={() => ({ q })}
        onAplicar={(estado) => {
          setQ(String(estado.q ?? ""));
          setPage(1);
        }}
      />

      <Card>
        <Table
          columns={adapter.columnas}
          rows={filas}
          rowKey={(r) => r.id}
          loading={query.isLoading}
          onRowClick={(r) => navigate(catalogoDetalle(slug, r.id))}
          prefetch={prefetchDetalle}
          emptyTitle={`No hay ${adapter.singular.toLowerCase()} todavía`}
          emptyDescription={
            adapter.crearHref
              ? `Cree ${articuloPrimero(adapter)} ${adapter.singular.toLowerCase()} para comenzar a operar.`
              : undefined
          }
          emptyAction={
            adapter.crearHref ? (
              <ButtonLink variant="primary" size="sm" icon="agregar" href={adapter.crearHref}>
                Crear {adapter.singular.toLowerCase()}
              </ButtonLink>
            ) : undefined
          }
        />
        {listado && listado.meta.total > 0 ? (
          <Pagination
            page={listado.meta.page}
            pageCount={listado.meta.total_pages}
            total={listado.meta.total}
            from={(listado.meta.page - 1) * listado.meta.page_size + 1}
            to={Math.min(listado.meta.page * listado.meta.page_size, listado.meta.total)}
            onPageChange={setPage}
            onPrefetch={prefetchPagina}
          />
        ) : null}
      </Card>
    </>
  );
}

export function CatalogDetailPage<T extends { id: string }>({
  adapter,
  slug,
  id,
}: {
  adapter: CatalogAdapter<T>;
  slug: string;
  id: string;
}) {
  const query = useQuery({
    queryKey: ["catalogo-detalle", slug, id],
    queryFn: () => adapter.obtener(id),
  });

  const row = query.data;

  if (query.isLoading) {
    return <PageHeader title={adapter.singular} description="Cargando…" />;
  }

  if (!row) {
    return (
      <ErrorPanel title={`${adapter.singular} no ${participioEncontrado(adapter)}`}>
        No se encontró el registro solicitado.{" "}
        <Link href={catalogoLista(slug)}>Volver al listado</Link>.
      </ErrorPanel>
    );
  }

  return (
    <>
      <PageHeader
        title={adapter.tituloDetalle(row)}
        description={`Detalle de ${adapter.singular.toLowerCase()}.`}
        actions={
          <div className="flex gap-2">
            {slug === "almacenes" ? (
              <ButtonLink variant="secondary" icon="ubicacion" href={almacenMapa(id)}>
                Ver mapa
              </ButtonLink>
            ) : null}
            {adapter.duplicarHref ? (
              <ButtonLink variant="secondary" icon="agregar" href={adapter.duplicarHref(id)}>
                Duplicar
              </ButtonLink>
            ) : null}
            {adapter.editarHref ? (
              <ButtonLink variant="secondary" icon="editar" href={adapter.editarHref(id)}>
                Editar
              </ButtonLink>
            ) : null}
            {adapter.eliminarHref ? (
              <ButtonLink variant="ghost" icon="eliminar" href={adapter.eliminarHref(id)}>
                Eliminar
              </ButtonLink>
            ) : null}
          </div>
        }
      />

      <Card title="Datos generales">
        <Card.Body>
          <DetailList items={adapter.datosGenerales(row)} />
        </Card.Body>
      </Card>

      {slug === "almacenes" ? <ArbolAlmacen almacenId={id} /> : null}
      {slug === "zonas" ? (
        <>
          <MapaContextoCard tipo="zona" row={row as unknown as Zona} />
          <ContenidoInventarioCard tipo="zona" row={row as unknown as Zona} />
        </>
      ) : null}
      {slug === "pasillos" ? (
        <>
          <MapaContextoCard tipo="pasillo" row={row as unknown as Pasillo} />
          <ContenidoInventarioCard tipo="pasillo" row={row as unknown as Pasillo} />
        </>
      ) : null}
      {slug === "racks" ? (
        <>
          <MapaContextoCard tipo="rack" row={row as unknown as Rack} />
          <ContenidoInventarioCard tipo="rack" row={row as unknown as Rack} />
        </>
      ) : null}
      {slug === "ubicaciones" ? (
        <>
          <MapaContextoCard tipo="ubicacion" row={row as unknown as Ubicacion} />
          <ContenidoInventarioCard tipo="ubicacion" row={row as unknown as Ubicacion} />
        </>
      ) : null}
      {slug === "productos" ? <ProductoUbicacionesCard row={row as unknown as Producto} /> : null}
      {slug === "cajas" ? <HistorialCajaCard cajaId={id} /> : null}
      <ComentariosCatalogo entidad={entidadComentario(slug)} entidadId={id} />
    </>
  );
}

function entidadComentario(slug: string): string {
  // Mapea slug plural del catálogo a entidad singular de comentarios (SPEC §12.1).
  const map: Record<string, string> = {
    almacenes: "almacen",
    zonas: "zona",
    pasillos: "pasillo",
    racks: "rack",
    secciones: "seccion",
    ubicaciones: "ubicacion",
    cajas: "caja",
    productos: "producto",
    lotes: "lote",
    categorias: "categoria",
    uoms: "uom",
    proveedores: "proveedor",
    clientes: "cliente",
  };
  return map[slug] ?? slug;
}

function HistorialCajaCard({ cajaId }: { cajaId: string }) {
  const q = useQuery({
    queryKey: ["historial-caja", cajaId],
    queryFn: () => import("../shared/backend").then((m) => m.historialCaja(cajaId)),
  });
  const filas = q.data ?? [];
  return (
    <Card title="Historial de la caja (trazabilidad §13.4)" className="mt-6">
      <Card.Body>
        {q.isLoading ? (
          <Text as="p" size="sm" color="muted">
            Cargando historial…
          </Text>
        ) : filas.length === 0 ? (
          <Text as="p" size="sm" color="muted">
            Esta caja aún no ha participado en ningún movimiento.
          </Text>
        ) : (
          <Table
            columns={[
              { key: "numero", header: "Movimiento", code: true, render: (r: any) => r.numero },
              { key: "tipo", header: "Tipo", render: (r: any) => r.tipo },
              {
                key: "fecha",
                header: "Fecha",
                render: (r: any) => r.fecha_movimiento.slice(0, 10),
              },
              { key: "rol", header: "Rol", render: (r: any) => r.rol },
              { key: "cantidad", header: "Cantidad", num: true, render: (r: any) => r.cantidad },
            ]}
            rows={filas}
            rowKey={(r: any) => r.movimiento_id + r.rol}
          />
        )}
      </Card.Body>
    </Card>
  );
}

function ComentariosCatalogo({ entidad, entidadId }: { entidad: string; entidadId: string }) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [texto, setTexto] = useState("");
  const comentariosQuery = useQuery({
    queryKey: ["comentarios", entidad, entidadId],
    queryFn: () => listarComentarios(entidad, entidadId),
  });
  const comentarMut = useMutation({
    mutationFn: () => crearComentario({ entidad, entidad_id: entidadId, texto }),
    onSuccess: () => {
      setTexto("");
      queryClient.invalidateQueries({ queryKey: ["comentarios", entidad, entidadId] });
    },
    onError: (err) => toast(mensajeError(err), "error"),
  });
  return (
    <Card title="Comentarios" className="mt-6">
      <Card.Body>
        {comentariosQuery.data && comentariosQuery.data.filter((c) => !c.oculto).length > 0 ? (
          <ul className="list-none p-0 m-0 flex flex-col gap-3">
            {comentariosQuery.data
              .filter((c) => !c.oculto)
              .map((c) => (
                <li key={c.id} className="border-b border-gray-100 pb-3 last:border-0">
                  <Text as="p" size="sm">
                    {c.texto}
                  </Text>
                  <Text as="p" size="xs" color="muted">
                    {c.created_at}
                  </Text>
                </li>
              ))}
          </ul>
        ) : (
          <Text as="p" size="sm" color="muted">
            Sin comentarios todavía.
          </Text>
        )}
        <form
          className="mt-4"
          onSubmit={(e) => {
            e.preventDefault();
            if (texto.trim()) {
              comentarMut.mutate();
            }
          }}
        >
          <Textarea
            aria-label="Nuevo comentario"
            placeholder="Agregar un comentario…"
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            rows={3}
          />
          <div className="mt-2">
            <Button
              type="submit"
              variant="secondary"
              size="sm"
              disabled={!texto.trim() || comentarMut.isPending}
            >
              {comentarMut.isPending ? "Enviando…" : "Comentar"}
            </Button>
          </div>
        </form>
      </Card.Body>
    </Card>
  );
}

export function CatalogEliminarPage<T extends { id: string }>({
  adapter,
  slug,
  id,
}: {
  adapter: CatalogAdapter<T>;
  slug: string;
  id: string;
}) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [error, setError] = useState<string | null>(null);

  const query = useQuery({
    queryKey: ["catalogo-detalle", slug, id],
    queryFn: () => adapter.obtener(id),
  });

  const desactivarMut = useMutation({
    mutationFn: () => adapter.desactivar!(id),
    onSuccess: () => {
      // Listado universal + selectores/reportes que consumen el mismo recurso.
      queryClient.invalidateQueries({ queryKey: ["catalogo", slug] });
      queryClient.invalidateQueries({ queryKey: [slug] });
      toast(`${adapter.singular} ${participioDesactivado(adapter)}.`, "success");
      navigate(catalogoLista(slug));
    },
    onError: (err) => setError(mensajeError(err)),
  });

  const row = query.data;

  if (query.isLoading) {
    return (
      <PageHeader title={`Eliminar ${adapter.singular.toLowerCase()}`} description="Cargando…" />
    );
  }

  if (!row) {
    return (
      <ErrorPanel title={`${adapter.singular} no ${participioEncontrado(adapter)}`}>
        <Link href={catalogoLista(slug)}>Volver al listado</Link>
      </ErrorPanel>
    );
  }

  return (
    <>
      <PageHeader
        title={`Eliminar ${adapter.tituloDetalle(row)}`}
        description="Rustock no borra físicamente entidades con historial: esta acción desactiva el registro. No se elimina su historial ni los movimientos asociados."
      />

      <Card title="Datos generales">
        <Card.Body>
          <DetailList items={adapter.datosGenerales(row)} />
        </Card.Body>
      </Card>

      {error ? (
        <ErrorPanel title="No se pudo desactivar" className="mt-4">
          {error}
        </ErrorPanel>
      ) : null}

      <div className="mt-6 flex gap-3">
        <Button
          variant="danger"
          icon="eliminar"
          onClick={() => desactivarMut.mutate()}
          disabled={desactivarMut.isPending}
        >
          {desactivarMut.isPending ? "Desactivando…" : "Eliminar definitivamente"}
        </Button>
        <Link href={catalogoDetalle(slug, id)}>Cancelar</Link>
      </div>
    </>
  );
}
