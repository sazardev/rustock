import { Badge, ButtonLink, Card, PageHeader, Table, Text } from "../shared/ui";
import type { TableColumn } from "../shared/ui";

interface Movimiento {
  id: string;
  numero: string;
  tipo: "Entrada" | "Salida" | "Traslado" | "Ajuste";
  producto: string;
  cantidad: number;
  uom: string;
  estado: "Aprobado" | "Pendiente" | "Borrador";
}

const MOVIMIENTOS: Movimiento[] = [
  {
    id: "1",
    numero: "MOV-0001",
    tipo: "Entrada",
    producto: "Tornillo M6",
    cantidad: 120,
    uom: "pza",
    estado: "Aprobado",
  },
  {
    id: "2",
    numero: "MOV-0002",
    tipo: "Salida",
    producto: "Arandela 5/16",
    cantidad: 40,
    uom: "pza",
    estado: "Pendiente",
  },
  {
    id: "3",
    numero: "MOV-0003",
    tipo: "Traslado",
    producto: "Cinta embalaje",
    cantidad: 8,
    uom: "caja",
    estado: "Aprobado",
  },
  {
    id: "4",
    numero: "MOV-0004",
    tipo: "Ajuste",
    producto: "Tornillo M6",
    cantidad: -5,
    uom: "pza",
    estado: "Borrador",
  },
];

const TIPO_TONE: Record<Movimiento["tipo"], "success" | "danger" | "info" | "warning"> = {
  Entrada: "success",
  Salida: "danger",
  Traslado: "info",
  Ajuste: "warning",
};

const ESTADO_TONE: Record<Movimiento["estado"], "success" | "warning" | "neutral"> = {
  Aprobado: "success",
  Pendiente: "warning",
  Borrador: "neutral",
};

const columns: Array<TableColumn<Movimiento>> = [
  { key: "numero", header: "Número", code: true, sortable: true, render: (m) => m.numero },
  {
    key: "tipo",
    header: "Tipo",
    sortable: true,
    render: (m) => (
      <Badge
        tone={TIPO_TONE[m.tipo]}
        icon={
          m.tipo === "Entrada"
            ? "entrada"
            : m.tipo === "Salida"
              ? "salida"
              : m.tipo === "Traslado"
                ? "traslado"
                : "ajuste"
        }
      >
        {m.tipo}
      </Badge>
    ),
  },
  { key: "producto", header: "Producto", sortable: true, render: (m) => m.producto },
  {
    key: "cantidad",
    header: "Cantidad",
    num: true,
    sortable: true,
    render: (m) => `${m.cantidad} ${m.uom}`,
  },
  {
    key: "estado",
    header: "Estado",
    sortable: true,
    render: (m) => <Badge tone={ESTADO_TONE[m.estado]}>{m.estado}</Badge>,
  },
];

export function MovimientosPage() {
  return (
    <>
      <PageHeader
        title="Movimientos"
        description="Entradas, salidas, traslados y ajustes de inventario."
        actions={
          <ButtonLink variant="primary" icon="agregar" href="/movimientos/nuevo">
            Nuevo movimiento
          </ButtonLink>
        }
      />

      <Card>
        <Card.Body>
          <Table
            columns={columns}
            rows={MOVIMIENTOS}
            rowKey={(m) => m.id}
            emptyTitle="No hay movimientos todavía"
            emptyDescription="Registre el primer movimiento para comenzar a operar."
            emptyAction={
              <ButtonLink variant="primary" size="sm" icon="agregar" href="/movimientos/nuevo">
                Crear movimiento
              </ButtonLink>
            }
          />
        </Card.Body>
      </Card>

      <Card muted>
        <Card.Body>
          <Text as="p" size="sm" color="muted">
            Los movimientos se aprueban en su página de detalle. Cada anulación genera un movimiento
            inverso.
          </Text>
        </Card.Body>
      </Card>
    </>
  );
}
