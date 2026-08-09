import { useState } from "react";
import {
  AlertsIndicator,
  AppShell,
  Badge,
  Brand,
  Breadcrumbs,
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
  Link,
  PageHeader,
  Pagination,
  Radio,
  Search,
  Select,
  Sidebar,
  Skeleton,
  Table,
  Text,
  Textarea,
  ToastProvider,
  Topbar,
  TopbarNavToggle,
  TopbarUser,
  useToast,
} from "./shared/ui";
import type { TableColumn, TableSort } from "./shared/ui";

const NAV_GROUPS = [
  {
    title: "Diseño",
    items: [
      { label: "Iconografía", href: "#iconos", icon: "dashboard" as const },
      { label: "Tipografía", href: "#tipografia", icon: "producto" as const },
      { label: "Paleta", href: "#paleta", icon: "reportes" as const },
    ],
  },
  {
    title: "Acciones",
    items: [
      { label: "Botones", href: "#botones", icon: "agregar" as const },
      { label: "Enlaces", href: "#enlaces", icon: "atras" as const },
      { label: "Notificaciones", href: "#toast", icon: "alerta" as const },
    ],
  },
  {
    title: "Formularios",
    items: [
      { label: "Campos", href: "#campos", icon: "editar" as const },
      { label: "Selectores", href: "#selectores", icon: "filtrar" as const },
    ],
  },
  {
    title: "Datos",
    items: [
      { label: "Tablas", href: "#tablas", icon: "historial" as const },
      { label: "Paginación", href: "#paginacion", icon: "reportes" as const },
      { label: "Estados", href: "#estados", icon: "stock" as const },
    ],
  },
  {
    title: "Contenedores",
    items: [
      { label: "Tarjetas", href: "#tarjetas", icon: "stock" as const },
      { label: "Detalle", href: "#detalle", icon: "ver" as const },
      { label: "Búsqueda y filtros", href: "#filtros", icon: "buscar" as const },
    ],
  },
];

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
      <ButtonLink variant="primary" href="#botones">
        Enlace botón
      </ButtonLink>
    </div>
  );
}

function DemoEnlaces() {
  return (
    <div className="flex flex-wrap items-center gap-6">
      <Link href="#enlaces">Enlace simple</Link>
      <Link href="#enlaces">Enlace con subrayado al pasar</Link>
      <p className="text-base text-gray-600">
        Texto con un <Link href="#enlaces">enlace dentro de párrafo</Link> y más contenido.
      </p>
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
  const [enviado, setEnviado] = useState(false);
  const [nombre, setNombre] = useState("");

  const enviar = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nombre.trim()) {
      setEnviado(true);
      return;
    }
    setEnviado(false);
  };

  return (
    <form onSubmit={enviar}>
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <Field
          label="Nombre del almacén"
          required
          error={enviado && !nombre.trim() ? "El nombre es obligatorio" : undefined}
          htmlFor="demo-nombre"
        >
          <Input
            id="demo-nombre"
            placeholder="Almacén Central"
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
          />
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
      <div className="mt-6 flex items-center gap-2">
        <Button variant="primary" type="submit">
          Guardar cambios
        </Button>
        <Button variant="secondary" type="reset" onClick={() => setEnviado(false)}>
          Limpiar
        </Button>
      </div>
    </form>
  );
}

function DemoSelectores() {
  return (
    <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
      <Field label="Tipo de movimiento" htmlFor="demo-tipo">
        <Select id="demo-tipo" code placeholder="Seleccione el tipo">
          <option value="entrada">Entrada</option>
          <option value="salida">Salida</option>
          <option value="traslado">Traslado</option>
          <option value="ajuste">Ajuste</option>
        </Select>
      </Field>
      <Field label="Unidad de medida" htmlFor="demo-uom">
        <Select id="demo-uom">
          <option value="pza">pza</option>
          <option value="kg">kg</option>
          <option value="caja">caja</option>
          <option value="lt">lt</option>
        </Select>
      </Field>
    </div>
  );
}

function DemoTabla() {
  const { toast } = useToast();
  const [sort, setSort] = useState<TableSort | null>(null);
  const [selected, setSelected] = useState<string[]>([]);

  const sorted = [...PRODUCTOS];
  sorted.sort((a, b) => {
    if (!sort) return 0;
    const dir = sort.direction === "asc" ? 1 : -1;
    const av = String(a[sort.key as keyof Producto]);
    const bv = String(b[sort.key as keyof Producto]);
    return av.localeCompare(bv) * dir;
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
        setSelected((current) =>
          current.includes(key) ? current.filter((k) => k !== key) : [...current, key],
        )
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

function DemoDetalle() {
  return (
    <Card title="Saldo por lote">
      <DetailList
        items={[
          { label: "Lote", value: "LOTE-2026-04", code: true },
          { label: "Producto", value: "Tornillo M6" },
          { label: "Stock total", value: "340 pza", num: true },
          { label: "Stock reservado", value: "40 pza", num: true },
          { label: "Stock disponible", value: "300 pza", num: true },
          { label: "Ubicación", value: "RACK-A1-N2-P3", code: true },
        ]}
      />
    </Card>
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
    ["blue-50", "var(--color-blue-50)"],
    ["blue-100", "var(--color-blue-100)"],
    ["blue-200", "var(--color-blue-200)"],
    ["blue-300", "var(--color-blue-300)"],
    ["blue-400", "var(--color-blue-400)"],
    ["blue-500", "var(--color-blue-500)"],
    ["blue-600", "var(--color-blue-600)"],
    ["blue-700", "var(--color-blue-700)"],
    ["blue-800", "var(--color-blue-800)"],
    ["blue-900", "var(--color-blue-900)"],
    ["blue-950", "var(--color-blue-950)"],
    ["gray-50", "var(--color-gray-50)"],
    ["gray-100", "var(--color-gray-100)"],
    ["gray-200", "var(--color-gray-200)"],
    ["gray-300", "var(--color-gray-300)"],
    ["gray-400", "var(--color-gray-400)"],
    ["gray-500", "var(--color-gray-500)"],
    ["gray-600", "var(--color-gray-600)"],
    ["gray-700", "var(--color-gray-700)"],
    ["gray-800", "var(--color-gray-800)"],
    ["gray-900", "var(--color-gray-900)"],
    ["success-500", "var(--color-success-500)"],
    ["warning-500", "var(--color-warning-500)"],
    ["danger-500", "var(--color-danger-500)"],
    ["info-500", "var(--color-info-500)"],
  ] as const;

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
      {swatches.map(([name, value]) => (
        <div key={name} className="border border-gray-200 bg-white">
          <div className="h-12" style={{ backgroundColor: value }} />
          <div className="p-2">
            <Code size="xs">{name}</Code>
          </div>
        </div>
      ))}
    </div>
  );
}

interface ShowcaseSection {
  id: string;
  title: string;
  description: string;
  children: React.ReactNode;
}

function ShowcaseSection({ id, title, description, children }: ShowcaseSection) {
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

function GaleriaPage() {
  const { toast } = useToast();

  return (
    <>
      <PageHeader
        title="Sistema de diseño"
        description="Galería de componentes del design system Rustock."
        actions={
          <Button
            variant="secondary"
            icon="exportar"
            onClick={() => toast("Referencia exportada", "success")}
          >
            Exportar referencia
          </Button>
        }
      />

      <ShowcaseSection
        id="iconos"
        title="Iconografía"
        description="Set oficial Lucide con semántica canónica (§6.13)."
      >
        <DemoIconos />
      </ShowcaseSection>

      <ShowcaseSection
        id="paleta"
        title="Paleta de colores"
        description="Tokens de color declarados en DESIGN §3.1."
      >
        <DemoPaleta />
      </ShowcaseSection>

      <ShowcaseSection
        id="tipografia"
        title="Tipografía"
        description="Open Sans para la interfaz y JetBrains Mono para códigos y cantidades (§3.2)."
      >
        <DemoTipografia />
      </ShowcaseSection>

      <ShowcaseSection
        id="botones"
        title="Botones"
        description="Variantes, tamaños y estados de los botones (§6.2)."
      >
        <DemoBotones />
      </ShowcaseSection>

      <ShowcaseSection
        id="enlaces"
        title="Enlaces"
        description="Enlaces de texto y acciones de bajo énfasis (§6.3)."
      >
        <DemoEnlaces />
      </ShowcaseSection>

      <ShowcaseSection
        id="campos"
        title="Campos de formulario"
        description="Inputs, textareas, checks y radios con sus estados (§6.4)."
      >
        <DemoCampos />
      </ShowcaseSection>

      <ShowcaseSection
        id="selectores"
        title="Selectores"
        description="Selects planos con flecha cuadrada propia (§6.4)."
      >
        <DemoSelectores />
      </ShowcaseSection>

      <ShowcaseSection
        id="tablas"
        title="Tablas"
        description="Columnas ordenables, celdas mono y acciones por fila (§6.5)."
      >
        <DemoTabla />
      </ShowcaseSection>

      <ShowcaseSection
        id="paginacion"
        title="Paginación"
        description="Controles de paginación con resumen de registros (§7.1)."
      >
        <DemoPaginacion />
      </ShowcaseSection>

      <ShowcaseSection
        id="estados"
        title="Estados vacíos y carga"
        description="Skeletons, empty states y paneles de error (§6.11, §8.4)."
      >
        <DemoEstados />
      </ShowcaseSection>

      <ShowcaseSection
        id="tarjetas"
        title="Tarjetas y paneles"
        description="Paneles con encabezado, acciones y detalle en grid (§6.6)."
      >
        <DemoTarjetas />
      </ShowcaseSection>

      <ShowcaseSection
        id="detalle"
        title="Listado de detalle"
        description="Grid de label y valor con códigos en mono (§7.2)."
      >
        <DemoDetalle />
      </ShowcaseSection>

      <ShowcaseSection
        id="filtros"
        title="Búsqueda y filtros"
        description="Barra de filtros con chips removibles y búsqueda global (§6.10)."
      >
        <DemoFiltros />
      </ShowcaseSection>

      <ShowcaseSection
        id="toast"
        title="Notificaciones"
        description="Toasts transitorios para feedback de mutaciones (§6.12)."
      >
        <DemoToast />
      </ShowcaseSection>
    </>
  );
}

function Shell() {
  const [navOpen, setNavOpen] = useState(false);

  return (
    <AppShell
      navOpen={navOpen}
      onCloseNav={() => setNavOpen(false)}
      topbar={
        <Topbar
          navToggle={<TopbarNavToggle onClick={() => setNavOpen(true)} />}
          brand={<Brand name="Rustock" />}
          breadcrumbs={<Breadcrumbs items={[{ label: "Diseño" }, { label: "Galería" }]} />}
          search={<Search placeholder="Buscar en todo Rustock" aria-label="Búsqueda global" />}
          alerts={<AlertsIndicator count={3} />}
          user={<TopbarUser name="Jorge Reyes" role="Administrador" />}
        />
      }
      sidebar={<Sidebar groups={NAV_GROUPS} onNavigate={() => setNavOpen(false)} />}
    >
      <GaleriaPage />
    </AppShell>
  );
}

function App() {
  return (
    <ToastProvider>
      <Shell />
    </ToastProvider>
  );
}

export default App;
