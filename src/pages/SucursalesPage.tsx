import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router";
import { listarSucursales } from "../shared/backend";
import type { Sucursal } from "../shared/types";
import { mensajeError } from "../shared/format";
import { PATH } from "../app/route-paths";
import {
  Badge,
  ButtonLink,
  Card,
  ErrorPanel,
  FilterBar,
  PageHeader,
  Table,
  type TableColumn,
} from "../shared/ui";

export function SucursalesPage() {
  const navigate = useNavigate();
  const query = useQuery({
    queryKey: ["sucursales"],
    queryFn: listarSucursales,
  });

  const filas = query.data ?? [];

  const columns: Array<TableColumn<Sucursal>> = [
    { key: "codigo", header: "Código", code: true, render: (s) => s.codigo },
    { key: "nombre", header: "Nombre", render: (s) => s.nombre },
    { key: "pais", header: "País", render: (s) => s.pais ?? "—" },
    { key: "ciudad", header: "Ciudad", render: (s) => s.ciudad ?? "—" },
    { key: "direccion", header: "Dirección", render: (s) => s.direccion ?? "—" },
    {
      key: "coordenadas",
      header: "Coordenadas",
      code: true,
      render: (s) =>
        s.latitud !== null && s.longitud !== null
          ? `${s.latitud.toFixed(4)}, ${s.longitud.toFixed(4)}`
          : "—",
    },
    {
      key: "activo",
      header: "Estado",
      render: (s) =>
        s.activo ? <Badge tone="success">Activa</Badge> : <Badge tone="danger">Inactiva</Badge>,
    },
  ];

  return (
    <>
      <PageHeader title="Sucursales" />

      <FilterBar
        action={
          <ButtonLink variant="primary" icon="agregar" href={`${PATH.sucursales}/nuevo`}>
            Nueva sucursal
          </ButtonLink>
        }
      />

      {query.error ? (
        <ErrorPanel title="No se pudieron cargar las sucursales">
          {mensajeError(query.error)}
        </ErrorPanel>
      ) : null}

      <Card>
        <Table
          columns={columns}
          rows={filas}
          rowKey={(s) => s.id}
          loading={query.isLoading}
          onRowClick={(s) => navigate(`${PATH.sucursales}/${s.id}`)}
          emptyTitle="No hay sucursales todavía"
          emptyDescription="Registra tu primer punto de operación para asociarle una ubicación."
        />
      </Card>
    </>
  );
}
