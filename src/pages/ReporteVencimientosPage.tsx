import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { vencimientosPorRango } from "../shared/backend";
import type { BucketVencimiento, LotePorVencer } from "../shared/types";
import {
  Badge,
  ButtonLink,
  Card,
  DetailList,
  ErrorPanel,
  PageHeader,
  Select,
  Table,
  type TableColumn,
} from "../shared/ui";
import { PATH } from "../app/route-paths";
import { formatearFechaCorta, mensajeError } from "../shared/format";

type RangoId = "vencidos" | "proximos_30" | "proximos_60" | "proximos_90";

const RANGOS: Array<{ id: RangoId; titulo: string }> = [
  { id: "vencidos", titulo: "Vencidos" },
  { id: "proximos_30", titulo: "Próximos 30 días" },
  { id: "proximos_60", titulo: "Próximos 31-60 días" },
  { id: "proximos_90", titulo: "Próximos 61-90 días" },
];

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

export function ReporteVencimientosPage() {
  const [rango, setRango] = useState<RangoId>("vencidos");
  const query = useQuery({
    queryKey: ["vencimientos-por-rango"],
    queryFn: vencimientosPorRango,
  });

  const buckets = query.data;
  const bucketActivo: BucketVencimiento | undefined = buckets?.[rango];
  const resumenItems = buckets
    ? RANGOS.map(({ id, titulo }) => ({
        label: titulo,
        value: `${buckets[id].total_lotes.toLocaleString()} lotes / ${buckets[id].total_unidades.toLocaleString()} unidades`,
      }))
    : [];

  return (
    <>
      <PageHeader
        title="Vencimientos"
        description="Lotes vencidos o próximos a vencer, clasificados en un solo reporte por rango (SPEC §16.2)."
        actions={
          <ButtonLink variant="secondary" icon="atras" href={PATH.reportes}>
            Volver a reportes
          </ButtonLink>
        }
      />

      {query.error ? (
        <ErrorPanel title="No se pudo cargar el reporte">{mensajeError(query.error)}</ErrorPanel>
      ) : null}

      <Card title="Resumen por rango">
        <Card.Body>
          {query.isLoading ? (
            <p className="text-base text-gray-500">Cargando…</p>
          ) : (
            <DetailList items={resumenItems} />
          )}
        </Card.Body>
      </Card>

      <div className="mt-6">
        <Card
          title={RANGOS.find((r) => r.id === rango)?.titulo ?? "Lotes"}
          actions={
            <Select
              aria-label="Rango"
              value={rango}
              onChange={(e) => setRango(e.target.value as RangoId)}
            >
              {RANGOS.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.titulo}
                </option>
              ))}
            </Select>
          }
        >
          <Table
            columns={columns}
            rows={bucketActivo?.lotes ?? []}
            rowKey={(l) => l.lote_id}
            loading={query.isLoading}
            emptyTitle="Sin lotes en este rango"
            emptyDescription="No hay lotes vencidos ni próximos a vencer en el rango seleccionado."
          />
        </Card>
      </div>
    </>
  );
}
