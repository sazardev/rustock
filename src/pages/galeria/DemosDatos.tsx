import { useState } from "react";
import {
  Badge,
  Button,
  Card,
  DetailList,
  Icon,
  Pagination,
  Table,
  useToast,
  type TableColumn,
  type TableSort,
} from "../../shared/ui";
import { useT } from "../../shared/i18n";
import { PRODUCTOS, type Producto } from "./productos";

export function DemoTabla() {
  const t = useT();
  const { toast } = useToast();
  const [sort, setSort] = useState<TableSort | null>(null);
  const [selected, setSelected] = useState<string[]>([]);

  const sorted = PRODUCTOS.toSorted((a, b) => {
    if (!sort) return 0;
    const dir = sort.direction === "asc" ? 1 : -1;
    return (
      String(a[sort.key as keyof Producto]).localeCompare(String(b[sort.key as keyof Producto])) *
      dir
    );
  });
  const columns: Array<TableColumn<Producto>> = [
    { key: "sku", header: t.campos.sku, code: true, sortable: true, render: (p) => p.sku },
    { key: "nombre", header: t.campos.producto, sortable: true, render: (p) => p.nombre },
    { key: "stock", header: t.campos.stock, num: true, sortable: true, render: (p) => p.stock },
    {
      key: "estado",
      header: t.comun.estado,
      render: (p) => (
        <Badge
          tone={p.estado === "Disponible" ? "success" : "danger"}
          icon={p.estado === "Disponible" ? "aprobar" : "anular"}
        >
          {p.estado}
        </Badge>
      ),
    },
  ];

  return (
    <Table
      columns={columns}
      rows={sorted}
      rowKey={(p) => p.id}
      sort={sort}
      onSortChange={setSort}
      selectable
      selectedKeys={selected}
      onToggleRow={(key) =>
        setSelected((cur) => (cur.includes(key) ? cur.filter((k) => k !== key) : [...cur, key]))
      }
      onToggleAll={(checked) => setSelected(checked ? sorted.map((p) => p.id) : [])}
      onRowClick={(p) => toast(`Abriendo detalle de ${p.nombre}`, "default")}
      actions={(p) => (
        <>
          <Button
            variant="ghost"
            size="icon"
            aria-label={`Ver ${p.nombre}`}
            onClick={() => toast(`Ver ${p.sku}`, "default")}
          >
            <Icon name="ver" size={16} aria-hidden="true" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            aria-label={`Editar ${p.nombre}`}
            onClick={() => toast(`Editar ${p.sku}`, "default")}
          >
            <Icon name="editar" size={16} aria-hidden="true" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            aria-label={`Eliminar ${p.nombre}`}
            onClick={() => toast(`Confirmación de borrado para ${p.sku}`, "error")}
          >
            <Icon name="eliminar" size={16} aria-hidden="true" />
          </Button>
        </>
      )}
      emptyTitle={t.galeria.sinProductos}
    />
  );
}

export function DemoPaginacion() {
  const [page, setPage] = useState(1);
  return (
    <Pagination
      page={page}
      pageCount={5}
      total={125}
      from={(page - 1) * 25 + 1}
      to={Math.min(page * 25, 125)}
      onPageChange={setPage}
    />
  );
}

export function DemoTarjetas() {
  const t = useT();
  const { toast } = useToast();
  return (
    <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
      <Card
        title={t.galeria.datosGenerales}
        actions={
          <Button
            variant="ghost"
            size="sm"
            icon="editar"
            onClick={() => toast(t.galeria.toasts.editandoDatos, "default")}
          >
            {t.comun.editar}
          </Button>
        }
      >
        <DetailList
          items={[
            { label: t.comun.codigo, value: "ALM-001", code: true },
            { label: t.comun.nombre, value: "Almacén Central" },
            { label: t.campos.zona, value: "Zona Norte" },
            { label: t.campos.capacidad, value: "1,200", num: true },
          ]}
        />
      </Card>
      <Card title={t.comun.acciones} muted>
        <div className="flex flex-col items-start gap-2">
          <Button
            variant="secondary"
            icon="ver"
            onClick={() => toast(t.galeria.toasts.abriendoDetalle, "default")}
          >
            Ver detalle
          </Button>
          <Button
            variant="secondary"
            icon="editar"
            onClick={() => toast(t.galeria.toasts.abriendoEdicion, "default")}
          >
            Editar registro
          </Button>
          <Button
            variant="ghost"
            icon="eliminar"
            onClick={() => toast(t.galeria.toasts.confirmacionBorrado, "error")}
          >
            {t.comun.eliminar}
          </Button>
        </div>
      </Card>
    </div>
  );
}
