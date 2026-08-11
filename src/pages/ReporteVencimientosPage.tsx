import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { lotesPorVencer } from "../shared/backend";
import type { LotePorVencer } from "../shared/types";
import {
  Badge,
  ButtonLink,
  Card,
  ErrorPanel,
  PageHeader,
  Select,
  Table,
  type TableColumn,
} from "../shared/ui";
import { PATH } from "../app/route-paths";
import { formatearFechaCorta, mensajeError } from "../shared/format";

const OPCIONES_DIAS = [30, 60, 90];

export function ReporteVencimientosPage() {
  const [dias, setDias] = useState(30);
  const query = useQuery({
    queryKey: ["lotes-por-vencer", dias],
    queryFn: () => lotesPorVencer(dias),
  });

  const columns: Array<TableColumn<LotePorVencer>> = [
    { key: "sku", header: "SKU", code: true, render: (l) => l.sku },
    { key: "numero", header: "Lote", code: true, render: (l) => l.numero },
    {
      key: "fecha_vencimiento",
      header: "Vencimiento",
      render: (l) => formatearFechaCorta(l.fecha_vencimiento),
    },
    { key: "cantidad", header: "Cantidad", num: true, render: (l) => l.cantidad.toLocaleString() },
    {
      key: "vencido",
      header: "Estado",
      render: (l) =>
        l.vencido ? (
          <Badge tone="danger" icon="alerta">
            Vencido
          </Badge>
        ) : (
          <Badge tone="warning">Por vencer</Badge>
        ),
    },
  ];

  return (
    <>
      <PageHeader
        title="Vencimientos"
        description="Lotes vencidos o próximos a vencer, por producto y ubicación."
        actions={
          <ButtonLink variant="secondary" icon="atras" href={PATH.reportes}>
            Volver a reportes
          </ButtonLink>
        }
      />

      {query.error ? (
        <ErrorPanel title="No se pudo cargar el reporte">{mensajeError(query.error)}</ErrorPanel>
      ) : null}

      <Card
        title="Lotes por vencer"
        actions={
          <Select
            aria-label="Rango de días"
            value={String(dias)}
            onChange={(e) => setDias(Number(e.target.value))}
          >
            {OPCIONES_DIAS.map((d) => (
              <option key={d} value={d}>
                Próximos {d} días
              </option>
            ))}
          </Select>
        }
      >
        <Table
          columns={columns}
          rows={query.data ?? []}
          rowKey={(l) => `${l.lote_id}`}
          loading={query.isLoading}
          emptyTitle="Sin lotes por vencer"
          emptyDescription="No hay lotes vencidos ni próximos a vencer en el rango seleccionado."
        />
      </Card>
    </>
  );
}
