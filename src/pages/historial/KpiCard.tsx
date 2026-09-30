import { Card } from "../../shared/ui";

/** Tarjeta compacta de KPI para el resumen del centro de actividad. */
export function KpiCard({
  titulo,
  valor,
  detalle,
}: {
  titulo: string;
  valor: string;
  detalle?: string;
}) {
  return (
    <Card>
      <Card.Body>
        <p className="text-xs uppercase tracking-wide text-gray-500">{titulo}</p>
        <p className="mt-1 font-mono text-xl font-semibold text-gray-800">{valor}</p>
        {detalle ? <p className="mt-1 text-xs text-gray-500">{detalle}</p> : null}
      </Card.Body>
    </Card>
  );
}
