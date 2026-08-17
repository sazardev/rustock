import { useState } from "react";
import {
  Badge,
  Button,
  ButtonLink,
  Card,
  Code,
  DetailList,
  EmptyState,
  ErrorPanel,
  Field,
  FilterBar,
  FilterChip,
  FilterChips,
  FilterField,
  Icon,
  Input,
  PageHeader,
  Pagination,
  Radio,
  Search,
  Select,
  Skeleton,
  Table,
  Text,
  Textarea,
  useToast,
} from "../shared/ui";
import type { TableColumn, TableSort } from "../shared/ui";

interface Producto {
  id: string;
  sku: string;
  nombre: string;
  stock: number;
  estado: "Disponible" | "Agotado";
}

const PRODUCTOS: Producto[] = [
  { id: "1", sku: "SKU-1001", nombre: "Tornillo M6", stock: 340, estado: "Disponible" },
  { id: "2", sku: "SKU-1002", nombre: "Arandela 5/16", stock: 0, estado: "Agotado" },
  { id: "3", sku: "SKU-1003", nombre: "Cinta embalaje 48mm", stock: 125, estado: "Disponible" },
];

function DemoBotones() {
  const { toast } = useToast();
  const demo = (msg: string) => () => toast(`Acción de ejemplo: ${msg}`, "default");

  return (
    <div className="flex flex-wrap items-center gap-4">
      <Button variant="primary" onClick={demo("Primario")}>
        Primario
      </Button>
      <Button variant="secondary" onClick={demo("Secundario")}>
        Secundario
      </Button>
      <Button variant="danger" onClick={demo("Peligro")}>
        Peligro
      </Button>
      <Button variant="ghost" onClick={demo("Fantasma")}>
        Fantasma
      </Button>
      <Button variant="link" onClick={demo("Enlace")}>
        Enlace
      </Button>
      <Button variant="primary" size="sm" onClick={demo("Compacto")}>
        Compacto
      </Button>
      <Button variant="primary" size="lg" onClick={demo("Grande")}>
        Grande
      </Button>
      <Button variant="primary" icon="agregar" onClick={demo("Con icono")}>
        Con icono
      </Button>
      <Button variant="ghost" size="icon" aria-label="Acción con icono" onClick={demo("Icono")}>
        <Icon name="ver" size={16} aria-hidden="true" />
      </Button>
      <Button variant="secondary" disabled>
        Deshabilitado
      </Button>
      <ButtonLink variant="primary" href="/galeria#botones">
        Enlace botón
      </ButtonLink>
    </div>
  );
}

function DemoBadges() {
  return (
    <div className="flex flex-wrap items-center gap-4">
      <Badge tone="success" icon="aprobar">
        Aprobado
      </Badge>
      <Badge tone="warning" icon="alerta">
        Pendiente
      </Badge>
      <Badge tone="danger" icon="anular">
        Anulado
      </Badge>
      <Badge tone="info" icon="alerta">
        Información
      </Badge>
      <Badge tone="neutral">Borrador</Badge>
      <Badge tone="success">Entrada</Badge>
      <Badge tone="danger">Salida</Badge>
      <Badge tone="warning">Stock bajo</Badge>
      <Badge tone="warning">Vence pronto</Badge>
    </div>
  );
}

function DemoTipografia() {
  return (
    <div className="flex flex-col gap-4">
      <Text as="p" size="2xl" weight="bold" color="strong">
        Título de sección grande
      </Text>
      <Text as="p" size="xl" weight="semibold" color="strong">
        Título de página
      </Text>
      <Text as="p" size="lg" weight="semibold" color="strong">
        Subtítulo de panel
      </Text>
      <Text as="p" size="base" color="default">
        Cuerpo principal. Lorem ipsum dolor sit amet consectetur adipiscing elit.
      </Text>
      <Text as="p" size="sm" color="muted">
        Cuerpo secundario y celdas de tabla.
      </Text>
      <Text as="p" size="xs" color="muted">
        Metadatos, labels y códigos de pie.
      </Text>
      <div className="flex flex-wrap items-center gap-6">
        <Code>SKU-1001</Code>
        <Code>ALM-003</Code>
        <Code>LOTE-2026-04</Code>
        <Code>128.50</Code>
      </div>
    </div>
  );
}

function DemoCampos() {
  const [checked, setChecked] = useState(false);
  const [radio, setRadio] = useState("a");

  return (
    <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
      <Field label="Nombre del almacén" required htmlFor="demo-nombre">
        <Input id="demo-nombre" placeholder="Almacén Central" />
      </Field>
      <Field label="Código" help="Código único alfanumérico" htmlFor="demo-codigo">
        <Input id="demo-codigo" code placeholder="ALM-###" />
      </Field>
      <Field label="Cantidad" htmlFor="demo-cantidad">
        <Input id="demo-cantidad" number placeholder="0" />
      </Field>
      <Field label="Estado" htmlFor="demo-estado">
        <Select id="demo-estado" placeholder="Seleccione un estado">
          <option value="activo">Activo</option>
          <option value="mantenimiento">Mantenimiento</option>
        </Select>
      </Field>
      <Field label="Cantidad con error" error="El valor debe ser mayor a 0" htmlFor="demo-error">
        <Input id="demo-error" number defaultValue="0" aria-invalid="true" />
      </Field>
      <Field label="Observaciones" htmlFor="demo-notas">
        <Textarea id="demo-notas" placeholder="Notas internas del registro" />
      </Field>
      <div className="flex flex-wrap items-center gap-6">
        <label className="checkbox">
          <input
            type="checkbox"
            className="checkbox__input"
            checked={checked}
            onChange={(e) => setChecked(e.target.checked)}
          />
          <span className="checkbox__label">Recibir alertas de stock</span>
        </label>
        <div className="flex flex-wrap items-center gap-4">
          <Radio
            name="demo-radio"
            label="Opción A"
            checked={radio === "a"}
            onChange={() => setRadio("a")}
          />
          <Radio
            name="demo-radio"
            label="Opción B"
            checked={radio === "b"}
            onChange={() => setRadio("b")}
          />
        </div>
      </div>
    </div>
  );
}

function DemoTabla() {
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
    { key: "sku", header: "SKU", code: true, sortable: true, render: (p) => p.sku },
    { key: "nombre", header: "Producto", sortable: true, render: (p) => p.nombre },
    { key: "stock", header: "Stock", num: true, sortable: true, render: (p) => p.stock },
    {
      key: "estado",
      header: "Estado",
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
      emptyTitle="No hay productos"
    />
  );
}

function DemoPaginacion() {
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

function DemoEstados() {
  const { toast } = useToast();
  return (
    <div className="flex flex-col gap-6">
      <div>
        <Text as="p" size="sm" color="muted" className="mb-2">
          Carga
        </Text>
        <div className="flex flex-col gap-2">
          <Skeleton variant="control" />
          <Skeleton variant="text" />
          <Skeleton variant="block" />
        </div>
      </div>
      <EmptyState
        icon="stock"
        title="No hay productos todavía"
        description="Cree el primer producto para comenzar a operar."
        action={
          <Button
            variant="primary"
            size="sm"
            icon="agregar"
            onClick={() => toast("Creación de producto iniciada", "default")}
          >
            Crear producto
          </Button>
        }
      />
      <ErrorPanel
        title="Saldo insuficiente"
        action={
          <Button
            variant="secondary"
            size="sm"
            onClick={() => toast("Consultando saldo de RACK-A1-N2-P3", "default")}
          >
            Revisar saldo
          </Button>
        }
      >
        No hay stock suficiente en RACK-A1-N2-P3 para completar la salida.
      </ErrorPanel>
    </div>
  );
}

function DemoTarjetas() {
  const { toast } = useToast();
  return (
    <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
      <Card
        title="Datos generales"
        actions={
          <Button
            variant="ghost"
            size="sm"
            icon="editar"
            onClick={() => toast("Editando datos generales", "default")}
          >
            Editar
          </Button>
        }
      >
        <DetailList
          items={[
            { label: "Código", value: "ALM-001", code: true },
            { label: "Nombre", value: "Almacén Central" },
            { label: "Zona", value: "Zona Norte" },
            { label: "Capacidad", value: "1,200", num: true },
          ]}
        />
      </Card>
      <Card title="Acciones" muted>
        <div className="flex flex-col items-start gap-2">
          <Button
            variant="secondary"
            icon="ver"
            onClick={() => toast("Abriendo detalle", "default")}
          >
            Ver detalle
          </Button>
          <Button
            variant="secondary"
            icon="editar"
            onClick={() => toast("Abriendo edición", "default")}
          >
            Editar registro
          </Button>
          <Button
            variant="ghost"
            icon="eliminar"
            onClick={() => toast("Confirmación de borrado", "error")}
          >
            Eliminar
          </Button>
        </div>
      </Card>
    </div>
  );
}

function DemoFiltros() {
  const { toast } = useToast();
  const [query, setQuery] = useState("");
  const [zona, setZona] = useState("");

  return (
    <div className="flex flex-col gap-4">
      <FilterBar
        action={
          <Button
            variant="secondary"
            onClick={() => toast(`Filtros aplicados${query ? ` para "${query}"` : ""}`, "default")}
          >
            Aplicar
          </Button>
        }
      >
        <FilterField grow>
          <Field label="Buscar">
            <Input
              aria-label="Buscar"
              placeholder="Código o nombre"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </Field>
        </FilterField>
        <FilterField>
          <Field label="Zona">
            <Select aria-label="Zona" value={zona} onChange={(e) => setZona(e.target.value)}>
              <option value="">Todas las zonas</option>
              <option value="norte">Zona Norte</option>
              <option value="sur">Zona Sur</option>
            </Select>
          </Field>
        </FilterField>
      </FilterBar>
      <FilterChips>
        {query ? <FilterChip label={`q: ${query}`} onRemove={() => setQuery("")} /> : null}
        {zona ? (
          <FilterChip
            label={`zona: ${zona === "norte" ? "Zona Norte" : "Zona Sur"}`}
            onRemove={() => setZona("")}
          />
        ) : null}
      </FilterChips>
      <div className="w-full max-w-md">
        <Field label="Búsqueda global">
          <Search placeholder="Buscar en todo Rustock" aria-label="Búsqueda global" />
        </Field>
      </div>
    </div>
  );
}

function DemoToast() {
  const { toast } = useToast();
  return (
    <div className="flex flex-wrap items-center gap-4">
      <Button variant="primary" onClick={() => toast("Movimiento aprobado", "success")}>
        Notificación de éxito
      </Button>
      <Button
        variant="secondary"
        onClick={() => toast("No se pudo guardar: campo obligatorio faltante", "error")}
      >
        Notificación de error
      </Button>
      <Button variant="ghost" onClick={() => toast("Cambios guardados", "default")}>
        Notificación neutra
      </Button>
    </div>
  );
}

function DemoIconos() {
  const names = [
    "dashboard",
    "movements",
    "entrada",
    "salida",
    "traslado",
    "ajuste",
    "inventario",
    "alerta",
    "stock",
    "producto",
    "caja",
    "lote",
    "almacen",
    "zona",
    "ubicacion",
    "proveedor",
    "cliente",
    "usuario",
    "rol",
    "categoria",
    "uom",
    "comentario",
    "historial",
    "buscar",
    "filtrar",
    "ordenar",
    "ver",
    "editar",
    "eliminar",
    "aprobar",
    "anular",
    "cerrar",
    "exportar",
    "agregar",
    "atras",
    "refrescar",
    "calendario",
    "nota",
    "codigoBarras",
    "configuracion",
    "reportes",
    "cerrarSesion",
  ] as const;

  return (
    <div className="grid grid-cols-4 gap-4 md:grid-cols-6 lg:grid-cols-8">
      {names.map((name) => (
        <div key={name} className="flex flex-col items-center gap-2 text-center">
          <span className="flex h-10 w-10 items-center justify-center border border-gray-200 bg-white">
            <Icon name={name} size={16} aria-hidden="true" />
          </span>
          <Code size="xs">{name}</Code>
        </div>
      ))}
    </div>
  );
}

function DemoPaleta() {
  const swatches = [
    ["ink-900", "var(--color-ink-900)"],
    ["ink-700", "var(--color-ink-700)"],
    ["ink-400", "var(--color-ink-400)"],
    ["blue-500", "var(--color-blue-500)"],
    ["blue-600", "var(--color-blue-600)"],
    ["blue-700", "var(--color-blue-700)"],
    ["blue-800", "var(--color-blue-800)"],
    ["blue-900", "var(--color-blue-900)"],
    ["gray-100", "var(--color-gray-100)"],
    ["gray-300", "var(--color-gray-300)"],
    ["gray-500", "var(--color-gray-500)"],
    ["gray-700", "var(--color-gray-700)"],
    ["gray-900", "var(--color-gray-900)"],
    ["success-500", "var(--color-success-500)"],
    ["warning-500", "var(--color-warning-500)"],
    ["danger-500", "var(--color-danger-500)"],
    ["info-500", "var(--color-info-500)"],
  ] as const;

  return (
    <div className="grid grid-cols-4 gap-3">
      {swatches.map(([name, value]) => (
        <div
          key={name}
          className="bg-white"
          style={{ border: "1px solid var(--color-gray-200)", borderRadius: "var(--radius-md)" }}
        >
          <div
            style={{
              height: "3rem",
              backgroundColor: value,
              borderRadius: "var(--radius-md) var(--radius-md) 0 0",
            }}
          />
          <div className="p-2">
            <Code size="xs">{name}</Code>
          </div>
        </div>
      ))}
    </div>
  );
}

function DemoSombras() {
  const levels = [
    ["shadow-xs", "var(--shadow-xs)"],
    ["shadow-sm", "var(--shadow-sm)"],
    ["shadow-md", "var(--shadow-md)"],
    ["shadow-lg", "var(--shadow-lg)"],
    ["shadow-glow-primary", "var(--shadow-glow-primary)"],
  ] as const;

  return (
    <div
      className="grid grid-cols-3 gap-6"
      style={{
        backgroundColor: "var(--color-gray-100)",
        borderRadius: "var(--radius-lg)",
        padding: "var(--space-6)",
      }}
    >
      {levels.map(([name, value]) => (
        <div key={name} className="flex flex-col items-center gap-2">
          <div
            className="w-full bg-white"
            style={{
              height: "4rem",
              borderRadius: "var(--radius-lg)",
              border: "1px solid var(--color-gray-200)",
              boxShadow: value,
            }}
          />
          <Code size="xs">{name}</Code>
        </div>
      ))}
    </div>
  );
}

interface ShowcaseSectionProps {
  id: string;
  title: string;
  description: string;
  children: React.ReactNode;
}

function ShowcaseSection({ id, title, description, children }: ShowcaseSectionProps) {
  return (
    <section id={id} className="mb-6 scroll-mt-20">
      <Card>
        <Card.Header>
          <h2 className="card__title">{title}</h2>
        </Card.Header>
        <Card.Body>
          <p className="mb-4 text-base text-gray-500">{description}</p>
          {children}
        </Card.Body>
      </Card>
    </section>
  );
}

export function GaleriaPage() {
  return (
    <>
      <PageHeader
        title="Sistema de diseño"
        description="Galería de componentes del design system Rustock."
      />

      <ShowcaseSection
        id="iconos"
        title="Iconografía"
        description="Set oficial de iconos con semántica canónica."
      >
        <DemoIconos />
      </ShowcaseSection>

      <ShowcaseSection
        id="paleta"
        title="Paleta de colores"
        description="Tokens de color declarados en el sistema de diseño."
      >
        <DemoPaleta />
      </ShowcaseSection>

      <ShowcaseSection
        id="sombras"
        title="Sombras y elevación"
        description="Elevación deliberada, nunca decorativa."
      >
        <DemoSombras />
      </ShowcaseSection>

      <ShowcaseSection
        id="tipografia"
        title="Tipografía"
        description="Open Sans para la interfaz y JetBrains Mono para códigos, con cifras tabulares."
      >
        <DemoTipografia />
      </ShowcaseSection>

      <ShowcaseSection
        id="botones"
        title="Botones"
        description="Variantes, tamaños y estados de los botones."
      >
        <DemoBotones />
      </ShowcaseSection>

      <ShowcaseSection
        id="campos"
        title="Campos de formulario"
        description="Inputs, textareas, checks y radios con sus estados."
      >
        <DemoCampos />
      </ShowcaseSection>

      <ShowcaseSection
        id="tablas"
        title="Tablas"
        description="Columnas ordenables, celdas mono y acciones por fila."
      >
        <DemoTabla />
      </ShowcaseSection>

      <ShowcaseSection
        id="paginacion"
        title="Paginación"
        description="Controles de paginación con resumen de registros."
      >
        <DemoPaginacion />
      </ShowcaseSection>

      <ShowcaseSection
        id="estados"
        title="Estados vacíos y carga"
        description="Skeletons, empty states y paneles de error."
      >
        <DemoEstados />
      </ShowcaseSection>

      <ShowcaseSection
        id="insignias"
        title="Insignias y etiquetas"
        description="Estados con fondo tintado, borde y texto semántico."
      >
        <DemoBadges />
      </ShowcaseSection>

      <ShowcaseSection
        id="tarjetas"
        title="Tarjetas y paneles"
        description="Paneles con encabezado y detalle en grid."
      >
        <DemoTarjetas />
      </ShowcaseSection>

      <ShowcaseSection
        id="filtros"
        title="Búsqueda y filtros"
        description="Barra de filtros con chips removibles."
      >
        <DemoFiltros />
      </ShowcaseSection>

      <ShowcaseSection
        id="toast"
        title="Notificaciones"
        description="Toasts transitorios para feedback de mutaciones."
      >
        <DemoToast />
      </ShowcaseSection>

      <div className="flex flex-wrap items-center gap-4">
        <Badge tone="info">Indicador informativo</Badge>
        <Text as="p" size="sm" color="muted">
          Cada componente de esta galería está disponible en <Code>src/shared/ui</Code>.
        </Text>
      </div>
    </>
  );
}
