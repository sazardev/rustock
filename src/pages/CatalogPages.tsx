import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router";
import type { CatalogAdapter } from "./catalog-adapters";
import { esPaginado } from "../shared/types";
import { mensajeError } from "../shared/format";
import { catalogoDetalle, catalogoLista } from "../app/route-paths";
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
  useToast,
} from "../shared/ui";

const PAGE_SIZE = 20;

export function CatalogListPage<T extends { id: string }>({
  adapter,
  slug,
}: {
  adapter: CatalogAdapter<T>;
  slug: string;
}) {
  const navigate = useNavigate();
  const [page, setPage] = useState(1);
  const [q, setQ] = useState("");

  const query = useQuery({
    queryKey: ["catalogo", slug, { page, q }],
    queryFn: () =>
      adapter.listar({ page, page_size: PAGE_SIZE, q: q || undefined, sort: "-created_at" }),
  });

  const listado = query.data && esPaginado(query.data) ? query.data : null;
  const filas = listado?.data ?? [];

  return (
    <>
      <PageHeader
        title={adapter.titulo}
        description={adapter.descripcion}
        actions={
          adapter.crearHref ? (
            <ButtonLink variant="primary" icon="agregar" href={adapter.crearHref}>
              Nuevo {adapter.singular.toLowerCase()}
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

      <Card>
        <Table
          columns={adapter.columnas}
          rows={filas}
          rowKey={(r) => r.id}
          loading={query.isLoading}
          onRowClick={(r) => navigate(catalogoDetalle(slug, r.id))}
          emptyTitle={`No hay ${adapter.singular.toLowerCase()} todavía`}
          emptyDescription={
            adapter.crearHref
              ? `Cree el primer ${adapter.singular.toLowerCase()} para comenzar a operar.`
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
      <ErrorPanel title={`${adapter.singular} no encontrado`}>
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
    </>
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
      queryClient.invalidateQueries({ queryKey: ["catalogo", slug] });
      toast(`${adapter.singular} desactivado.`, "success");
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
      <ErrorPanel title={`${adapter.singular} no encontrado`}>
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
