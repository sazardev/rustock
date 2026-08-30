import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate, useSearchParams } from "react-router";
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
import { useT } from "../shared/i18n";
import {
  TIPO_ETIQUETA_POR_SLUG,
  almacenMapa,
  catalogoDetalle,
  catalogoLista,
  etiquetasDe,
} from "../app/route-paths";
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
  const t = useT();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // Filtros en la URL (DESIGN §6.10): deep-link, recarga segura y
  // compartible — igual que MovimientosPage. `page`/`q` son la única fuente
  // de verdad, no estado local que se pierde al refrescar o volver atrás.
  const [searchParams, setSearchParams] = useSearchParams();
  const page = Number(searchParams.get("page")) || 1;
  const q = searchParams.get("q") ?? "";

  function actualizarFiltros(cambios: { q?: string; page?: number }) {
    const next = new URLSearchParams(searchParams);
    const setear = (clave: string, valor: string | number | undefined) => {
      if (valor === undefined || valor === "" || valor === 1) next.delete(clave);
      else next.set(clave, String(valor));
    };
    if (cambios.q !== undefined) setear("q", cambios.q);
    if (cambios.page !== undefined) setear("page", cambios.page);
    setSearchParams(next);
  }
  const setPage = (p: number) => actualizarFiltros({ page: p });
  const setQ = (nuevoQ: string) => actualizarFiltros({ q: nuevoQ, page: 1 });

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
      <PageHeader title={adapter.titulo} />

      {query.error ? (
        <ErrorPanel title={t.listado.noSePudoCargar}>{mensajeError(query.error)}</ErrorPanel>
      ) : null}

      <FilterBar
        action={
          adapter.crearHref ? (
            <ButtonLink variant="primary" icon="agregar" href={adapter.crearHref}>
              {esFemenino(adapter)
                ? t.listado.nueva({ entidad: adapter.singular.toLowerCase() })
                : t.listado.nuevo({ entidad: adapter.singular.toLowerCase() })}
            </ButtonLink>
          ) : undefined
        }
      >
        <FilterField grow>
          <Search
            aria-label={t.listado.buscarAria({ entidad: adapter.singular.toLowerCase() })}
            placeholder={t.listado.buscar({ entidad: adapter.singular.toLowerCase() })}
            value={q}
            onChange={(e) => setQ(e.target.value)}
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
          emptyTitle={t.listado.sinRegistros({ entidad: adapter.singular.toLowerCase() })}
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
  const t = useT();
  const query = useQuery({
    queryKey: ["catalogo-detalle", slug, id],
    queryFn: () => adapter.obtener(id),
  });

  const row = query.data;

  if (query.isLoading) {
    return <PageHeader title={adapter.singular} description={t.comun.cargando} />;
  }

  if (!row) {
    return (
      <ErrorPanel title={`${adapter.singular} no ${participioEncontrado(adapter)}`}>
        {t.listado.noSeEncontroRegistro}{" "}
        <Link href={catalogoLista(slug)}>{t.listado.volverAlListado}</Link>.
      </ErrorPanel>
    );
  }

  return (
    <>
      <PageHeader
        title={adapter.tituloDetalle(row)}
        actions={
          <div className="flex gap-2">
            {slug === "almacenes" ? (
              <ButtonLink variant="secondary" icon="ubicacion" href={almacenMapa(id)}>
                {t.comun.verMapa}
              </ButtonLink>
            ) : null}
            {TIPO_ETIQUETA_POR_SLUG[slug] ? (
              <ButtonLink
                variant="secondary"
                icon="codigoBarras"
                href={etiquetasDe(TIPO_ETIQUETA_POR_SLUG[slug], [id])}
              >
                {t.campos.etiqueta}
              </ButtonLink>
            ) : null}
            {adapter.duplicarHref ? (
              <ButtonLink variant="secondary" icon="agregar" href={adapter.duplicarHref(id)}>
                {t.comun.duplicarAccion}
              </ButtonLink>
            ) : null}
            {adapter.editarHref ? (
              <ButtonLink variant="secondary" icon="editar" href={adapter.editarHref(id)}>
                {t.comun.editar}
              </ButtonLink>
            ) : null}
            {adapter.eliminarHref ? (
              <ButtonLink variant="ghost" icon="eliminar" href={adapter.eliminarHref(id)}>
                {t.comun.eliminar}
              </ButtonLink>
            ) : null}
          </div>
        }
      />

      <Card title={t.listado.datosGenerales}>
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
  const t = useT();
  const q = useQuery({
    queryKey: ["historial-caja", cajaId],
    queryFn: () => import("../shared/backend").then((m) => m.historialCaja(cajaId)),
  });
  const filas = q.data ?? [];
  return (
    <Card title={t.movimientos.historialCaja} className="mt-6">
      <Card.Body>
        {q.isLoading ? (
          <Text as="p" size="sm" color="muted">
            {t.comun.cargandoHistorial}
          </Text>
        ) : filas.length === 0 ? (
          <Text as="p" size="sm" color="muted">
            {t.comun.cajaSinMovimientos}
          </Text>
        ) : (
          <Table
            columns={[
              {
                key: "numero",
                header: t.movimientos.singular,
                code: true,
                render: (r: any) => r.numero,
              },
              { key: "tipo", header: t.comun.tipo, render: (r: any) => r.tipo },
              {
                key: "fecha",
                header: t.comun.fecha,
                render: (r: any) => r.fecha_movimiento.slice(0, 10),
              },
              { key: "rol", header: t.usuarios.rol, render: (r: any) => r.rol },
              {
                key: "cantidad",
                header: t.comun.cantidad,
                num: true,
                render: (r: any) => r.cantidad,
              },
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
  const t = useT();
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
    <Card title={t.comentarios.titulo} className="mt-6">
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
            {t.comun.sinComentarios}
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
            aria-label={t.comentarios.nuevo}
            placeholder={t.comentarios.marcador}
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
              {comentarMut.isPending ? t.comentarios.enviando : t.comentarios.enviar}
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
  const t = useT();
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
      <PageHeader
        title={`Eliminar ${adapter.singular.toLowerCase()}`}
        description={t.comun.cargando}
      />
    );
  }

  if (!row) {
    return (
      <ErrorPanel title={`${adapter.singular} no ${participioEncontrado(adapter)}`}>
        <Link href={catalogoLista(slug)}>{t.listado.volverAlListado}</Link>
      </ErrorPanel>
    );
  }

  return (
    <>
      <PageHeader
        title={t.listado.eliminarEntidad({ entidad: adapter.tituloDetalle(row) })}
        description="{t.listado.avisoDesactivacion}"
      />

      <Card title={t.listado.datosGenerales}>
        <Card.Body>
          <DetailList items={adapter.datosGenerales(row)} />
        </Card.Body>
      </Card>

      {error ? (
        <ErrorPanel title={t.listado.noSePudoDesactivar} className="mt-4">
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
          {desactivarMut.isPending ? t.listado.desactivando : t.listado.eliminarDefinitivamente}
        </Button>
        <Link href={catalogoDetalle(slug, id)}>Cancelar</Link>
      </div>
    </>
  );
}
