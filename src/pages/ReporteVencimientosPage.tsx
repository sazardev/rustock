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
import { useT, type Diccionario } from "../shared/i18n";
import { PATH } from "../app/route-paths";
import { formatearFechaCorta, mensajeError } from "../shared/format";

type RangoId = "vencidos" | "proximos_30" | "proximos_60" | "proximos_90";

/** Los cuatro rangos del reporte, en el idioma activo. */
function rangosDe(t: Diccionario): { id: RangoId; titulo: string }[] {
  return [
    { id: "vencidos", titulo: t.reportes.vencimientos.rangos.vencidos },
    { id: "proximos_30", titulo: t.reportes.vencimientos.rangos.proximos_30 },
    { id: "proximos_60", titulo: t.reportes.vencimientos.rangos.proximos_60 },
    { id: "proximos_90", titulo: t.reportes.vencimientos.rangos.proximos_90 },
  ];
}

function columnasDe(t: Diccionario): Array<TableColumn<LotePorVencer>> {
  return [
    { key: "sku", header: t.campos.sku, code: true, render: (l) => l.sku },
    { key: "numero", header: t.reportes.vencimientos.lote, code: true, render: (l) => l.numero },
    {
      key: "fecha_vencimiento",
      header: t.reportes.vencimientos.vencimiento,
      render: (l) => formatearFechaCorta(l.fecha_vencimiento),
    },
    {
      key: "cantidad",
      header: t.comun.cantidad,
      num: true,
      render: (l) => l.cantidad.toLocaleString(),
    },
    {
      key: "vencido",
      header: t.comun.estado,
      render: (l) =>
        l.vencido ? (
          <Badge tone="danger" icon="alerta">
            {t.dominio.vencido}
          </Badge>
        ) : (
          <Badge tone="warning">{t.dominio.porVencer}</Badge>
        ),
    },
  ];
}

export function ReporteVencimientosPage() {
  const t = useT();
  const [rango, setRango] = useState<RangoId>("vencidos");
  const query = useQuery({
    queryKey: ["vencimientos-por-rango"],
    queryFn: vencimientosPorRango,
  });

  const buckets = query.data;
  const bucketActivo: BucketVencimiento | undefined = buckets?.[rango];
  const resumenItems = buckets
    ? rangosDe(t).map(({ id, titulo }) => ({
        label: titulo,
        value: `${buckets[id].total_lotes.toLocaleString()} lotes / ${buckets[id].total_unidades.toLocaleString()} unidades`,
      }))
    : [];

  return (
    <>
      <PageHeader
        title={t.reportes.vencimientos.titulo}
        description={t.reportes.vencimientos.descripcion}
        actions={
          <ButtonLink variant="secondary" icon="atras" href={PATH.reportes}>
            {t.reportes.volver}
          </ButtonLink>
        }
      />

      {query.error ? (
        <ErrorPanel title={t.reportes.noSePudoCargar}>{mensajeError(query.error)}</ErrorPanel>
      ) : null}

      <Card title={t.reportes.vencimientos.resumenPorRango}>
        <Card.Body>
          {query.isLoading ? (
            <p className="text-base text-gray-500">{t.comun.cargando}</p>
          ) : (
            <DetailList items={resumenItems} />
          )}
        </Card.Body>
      </Card>

      <div className="mt-6">
        <Card
          title={rangosDe(t).find((r) => r.id === rango)?.titulo ?? t.reportes.vencimientos.lotes}
          actions={
            <Select
              aria-label={t.campos.rango}
              value={rango}
              onChange={(e) => setRango(e.target.value as RangoId)}
            >
              {rangosDe(t).map((r) => (
                <option key={r.id} value={r.id}>
                  {r.titulo}
                </option>
              ))}
            </Select>
          }
        >
          <Table
            columns={columnasDe(t)}
            rows={bucketActivo?.lotes ?? []}
            rowKey={(l) => l.lote_id}
            loading={query.isLoading}
            emptyTitle={t.reportes.vencimientos.sinLotes}
            emptyDescription={t.reportes.vencimientos.sinLotesDesc}
          />
        </Card>
      </div>
    </>
  );
}
