import { useQuery } from "@tanstack/react-query";
import { useT } from "../../shared/i18n";
import { listarLotes } from "../../shared/backend";
import { esPaginado } from "../../shared/types";
import { Select } from "../../shared/ui";

export function LoteSelect({
  productoId,
  ...rest
}: { productoId: string } & Record<string, unknown>) {
  const t = useT();
  const lotesQuery = useQuery({
    queryKey: ["lotes", "por-producto", productoId],
    queryFn: () => listarLotes({ filters: [`producto_id:eq:${productoId}`], page_size: 200 }),
    enabled: Boolean(productoId),
  });
  const lotes = lotesQuery.data && esPaginado(lotesQuery.data) ? lotesQuery.data.data : [];

  return (
    <Select aria-label={t.campos.lote} placeholder={t.movForm.seleccionaLote} {...rest}>
      {lotes.map((l) => (
        <option key={l.id} value={l.id}>
          {l.numero}
          {l.fecha_vencimiento ? ` — vence ${l.fecha_vencimiento.slice(0, 10)}` : ""}
        </option>
      ))}
    </Select>
  );
}
