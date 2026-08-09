import { Badge, Card, PageHeader, Table } from "../shared/ui";
import type { TableColumn } from "../shared/ui";

interface Alerta {
  id: string;
  tipo: "Stock bajo" | "Vence pronto" | "Movimiento pendiente";
  producto: string;
  detalle: string;
  severidad: "Alta" | "Media" | "Baja";
}

const ALERTAS: Alerta[] = [
  {
    id: "1",
    tipo: "Stock bajo",
    producto: "Arandela 5/16",
    detalle: "Quedan 4 pza, umbral mínimo 10",
    severidad: "Alta",
  },
  {
    id: "2",
    tipo: "Vence pronto",
    producto: "Cinta embalaje",
    detalle: "Vence en 12 días",
    severidad: "Media",
  },
  {
    id: "3",
    tipo: "Movimiento pendiente",
    producto: "Tornillo M6",
    detalle: "Salida MOV-0002 sin aprobar",
    severidad: "Baja",
  },
];

const TIPO_TONE: Record<Alerta["tipo"], "danger" | "warning" | "info"> = {
  "Stock bajo": "danger",
  "Vence pronto": "warning",
  "Movimiento pendiente": "info",
};

const columns: Array<TableColumn<Alerta>> = [
  {
    key: "tipo",
    header: "Tipo",
    sortable: true,
    render: (a) => (
      <Badge tone={TIPO_TONE[a.tipo]} icon="alerta">
        {a.tipo}
      </Badge>
    ),
  },
  { key: "producto", header: "Producto", sortable: true, render: (a) => a.producto },
  { key: "detalle", header: "Detalle", render: (a) => a.detalle },
  { key: "severidad", header: "Severidad", sortable: true, render: (a) => a.severidad },
];

export function AlertasPage() {
  return (
    <>
      <PageHeader
        title="Alertas"
        description="Avisos de stock, vencimientos y movimientos pendientes."
      />

      <Card>
        <Card.Body>
          <Table
            columns={columns}
            rows={ALERTAS}
            rowKey={(a) => a.id}
            emptyTitle="Sin alertas activas"
            emptyDescription="Los niveles de stock están dentro de los umbrales configurados."
          />
        </Card.Body>
      </Card>
    </>
  );
}
