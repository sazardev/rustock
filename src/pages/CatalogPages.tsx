import { Badge, ButtonLink, Card, PageHeader, Table } from "../shared/ui";
import type { TableColumn } from "../shared/ui";

export interface CatalogRow {
  id: string;
  codigo: string;
  nombre: string;
  estado: "Activo" | "Inactivo";
}

export interface CatalogConfig {
  title: string;
  description: string;
  singular: string;
  createHref: string;
  rows: CatalogRow[];
}

const ESTADO_TONE: Record<CatalogRow["estado"], "success" | "neutral"> = {
  Activo: "success",
  Inactivo: "neutral",
};

export function CatalogListPage({ config }: { config: CatalogConfig }) {
  const columns: Array<TableColumn<CatalogRow>> = [
    { key: "codigo", header: "Código", code: true, sortable: true, render: (r) => r.codigo },
    { key: "nombre", header: "Nombre", sortable: true, render: (r) => r.nombre },
    {
      key: "estado",
      header: "Estado",
      sortable: true,
      render: (r) => (
        <Badge tone={ESTADO_TONE[r.estado]} icon={r.estado === "Activo" ? "aprobar" : "anular"}>
          {r.estado}
        </Badge>
      ),
    },
  ];

  return (
    <>
      <PageHeader
        title={config.title}
        description={config.description}
        actions={
          <ButtonLink variant="primary" icon="agregar" href={config.createHref}>
            Nuevo {config.singular}
          </ButtonLink>
        }
      />

      <Card>
        <Card.Body>
          <Table
            columns={columns}
            rows={config.rows}
            rowKey={(r) => r.id}
            emptyTitle={`No hay ${config.singular.toLowerCase()} todavía`}
            emptyDescription={`Cree el primer ${config.singular.toLowerCase()} para comenzar a operar.`}
            emptyAction={
              <ButtonLink variant="primary" size="sm" icon="agregar" href={config.createHref}>
                Crear {config.singular.toLowerCase()}
              </ButtonLink>
            }
          />
        </Card.Body>
      </Card>
    </>
  );
}

export function CatalogDetailPage({ config, id }: { config: CatalogConfig; id: string }) {
  const row = config.rows.find((r) => r.id === id);

  return (
    <>
      <PageHeader
        title={row ? `${row.codigo} — ${row.nombre}` : "Registro no encontrado"}
        description={`Detalle de ${config.singular.toLowerCase()}.`}
        actions={
          row ? (
            <>
              <ButtonLink
                variant="secondary"
                icon="editar"
                href={`${config.createHref}/${row.id}/editar`}
              >
                Editar
              </ButtonLink>
              <ButtonLink
                variant="ghost"
                icon="eliminar"
                href={`${config.createHref}/${row.id}/eliminar`}
              >
                Eliminar
              </ButtonLink>
            </>
          ) : null
        }
      />

      <Card title="Datos generales">
        <Card.Body>
          {row ? (
            <dl className="detail-list">
              <div className="detail-list__item">
                <dt className="detail-list__label">Código</dt>
                <dd>
                  <code className="font-mono text-sm">{row.codigo}</code>
                </dd>
              </div>
              <div className="detail-list__item">
                <dt className="detail-list__label">Nombre</dt>
                <dd>
                  <span className="detail-list__value">{row.nombre}</span>
                </dd>
              </div>
              <div className="detail-list__item">
                <dt className="detail-list__label">Estado</dt>
                <dd>
                  <Badge
                    tone={ESTADO_TONE[row.estado]}
                    icon={row.estado === "Activo" ? "aprobar" : "anular"}
                  >
                    {row.estado}
                  </Badge>
                </dd>
              </div>
            </dl>
          ) : (
            <p className="text-base text-gray-500">
              No se encontró el registro solicitado. Vuelva al listado para continuar.
            </p>
          )}
        </Card.Body>
      </Card>
    </>
  );
}
