import { useMemo, useState } from "react";
import {
  AlertsIndicator,
  AppShell,
  Badge,
  Brand,
  Breadcrumbs,
  Button,
  ButtonLink,
  Card,
  EmptyState,
  Field,
  FilterBar,
  FilterChip,
  FilterChips,
  FilterField,
  Icon,
  Input,
  PageHeader,
  Pagination,
  Search,
  Select,
  Sidebar,
  Table,
  ToastProvider,
  Topbar,
  TopbarNavToggle,
  TopbarUser,
  useToast,
} from "./shared/ui";
import type { SortDirection, TableColumn, TableSort } from "./shared/ui";

interface Almacen {
  id: string;
  codigo: string;
  nombre: string;
  zona: string;
  estado: "Activo" | "Mantenimiento";
}

const NAV_GROUPS = [
  {
    title: "Operación",
    items: [
      { label: "Dashboard", href: "/", icon: "dashboard" as const },
      { label: "Movimientos", href: "/movimientos", icon: "movements" as const },
      { label: "Inventario físico", href: "/inventario", icon: "inventario" as const },
      { label: "Alertas", href: "/alertas", icon: "alerta" as const },
    ],
  },
  {
    title: "Catálogos",
    items: [
      { label: "Almacenes", href: "/almacenes", icon: "almacen" as const, active: true },
      { label: "Ubicaciones", href: "/ubicaciones", icon: "ubicacion" as const },
      { label: "Productos", href: "/productos", icon: "producto" as const },
      { label: "Lotes", href: "/lotes", icon: "lote" as const },
      { label: "Proveedores", href: "/proveedores", icon: "proveedor" as const },
      { label: "Clientes", href: "/clientes", icon: "cliente" as const },
    ],
  },
  {
    title: "Análisis",
    items: [{ label: "Reportes", href: "/reportes", icon: "reportes" as const }],
  },
  {
    title: "Administración",
    items: [
      { label: "Usuarios y roles", href: "/usuarios", icon: "rol" as const },
      { label: "Configuración", href: "/configuracion", icon: "configuracion" as const },
    ],
  },
];

const ALMACENES: Almacen[] = [
  { id: "1", codigo: "ALM-001", nombre: "Almacén Central", zona: "Zona Norte", estado: "Activo" },
  { id: "2", codigo: "ALM-002", nombre: "Almacén Sur", zona: "Zona Sur", estado: "Activo" },
  {
    id: "3",
    codigo: "ALM-003",
    nombre: "Depósito Frío",
    zona: "Zona Norte",
    estado: "Mantenimiento",
  },
  { id: "4", codigo: "ALM-004", nombre: "Planta Baja", zona: "Zona Este", estado: "Activo" },
  { id: "5", codigo: "ALM-005", nombre: "Mezzanine", zona: "Zona Oeste", estado: "Activo" },
  {
    id: "6",
    codigo: "ALM-006",
    nombre: "Patio Externo",
    zona: "Zona Sur",
    estado: "Mantenimiento",
  },
];

function AlmacenesPage() {
  const { toast } = useToast();
  const [query, setQuery] = useState("");
  const [zona, setZona] = useState("");
  const [sort, setSort] = useState<TableSort | null>(null);
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<string[]>([]);

  const PAGE_SIZE = 3;

  const filtered = useMemo(() => {
    let rows = ALMACENES;
    if (query)
      rows = rows.filter(
        (a) =>
          a.codigo.toLowerCase().includes(query.toLowerCase()) ||
          a.nombre.toLowerCase().includes(query.toLowerCase()),
      );
    if (zona) rows = rows.filter((a) => a.zona === zona);
    if (sort) {
      const dir = sort.direction === "asc" ? 1 : -1;
      const sorted: Almacen[] = [...rows];
      sorted.sort((a, b) => {
        const av = String(a[sort.key as keyof Almacen]);
        const bv = String(b[sort.key as keyof Almacen]);
        return av.localeCompare(bv) * dir;
      });
      rows = sorted;
    }
    return rows;
  }, [query, zona, sort]);

  const pageRows = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const total = filtered.length;
  const from = total === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const to = Math.min(page * PAGE_SIZE, total);

  const columns: Array<TableColumn<Almacen>> = [
    { key: "codigo", header: "Código", code: true, sortable: true, render: (a) => a.codigo },
    {
      key: "nombre",
      header: "Nombre",
      sortable: true,
      render: (a) => (
        <ButtonLink variant="link" href={`/almacenes/${a.id}`}>
          {a.nombre}
        </ButtonLink>
      ),
    },
    { key: "zona", header: "Zona", sortable: true, render: (a) => a.zona },
    {
      key: "estado",
      header: "Estado",
      sortable: true,
      render: (a) => (
        <Badge
          tone={a.estado === "Activo" ? "success" : "warning"}
          icon={a.estado === "Activo" ? "aprobar" : "alerta"}
        >
          {a.estado}
        </Badge>
      ),
    },
  ];

  function handleSort(next: TableSort) {
    const dir: SortDirection = next.key === sort?.key && sort.direction === "asc" ? "desc" : "asc";
    setSort({ key: next.key, direction: dir });
  }

  function simulateDelete(id: string) {
    toast(`Almacén ${id} marcado para eliminación`, "default");
  }

  return (
    <>
      <PageHeader
        title="Almacenes"
        description="Catálogo de almacenes y su estado operativo."
        actions={
          <>
            <Button
              variant="secondary"
              icon="exportar"
              onClick={() => toast("Reporte en preparación", "default")}
            >
              Exportar
            </Button>
            <ButtonLink variant="primary" icon="agregar" href="/almacenes/nuevo">
              Nuevo almacén
            </ButtonLink>
          </>
        }
      />

      <FilterBar
        action={
          <Button variant="secondary" onClick={() => toast("Filtros aplicados", "default")}>
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
              onChange={(e) => {
                setQuery(e.target.value);
                setPage(1);
              }}
            />
          </Field>
        </FilterField>
        <FilterField>
          <Field label="Zona">
            <Select
              aria-label="Zona"
              value={zona}
              onChange={(e) => {
                setZona(e.target.value);
                setPage(1);
              }}
            >
              <option value="">Todas las zonas</option>
              <option value="Zona Norte">Zona Norte</option>
              <option value="Zona Sur">Zona Sur</option>
              <option value="Zona Este">Zona Este</option>
              <option value="Zona Oeste">Zona Oeste</option>
            </Select>
          </Field>
        </FilterField>
      </FilterBar>

      {(query || zona) && (
        <FilterChips>
          {query ? <FilterChip label={`q: ${query}`} onRemove={() => setQuery("")} /> : null}
          {zona ? <FilterChip label={`zona: ${zona}`} onRemove={() => setZona("")} /> : null}
        </FilterChips>
      )}

      <Card>
        <Table
          columns={columns}
          rows={pageRows}
          rowKey={(a) => a.id}
          sort={sort}
          onSortChange={handleSort}
          selectable
          selectedKeys={selected}
          onToggleRow={(key) =>
            setSelected((current) =>
              current.includes(key) ? current.filter((k) => k !== key) : [...current, key],
            )
          }
          onToggleAll={(checked) => setSelected(checked ? pageRows.map((a) => a.id) : [])}
          actions={(a) => (
            <>
              <Button variant="ghost" size="icon" aria-label={`Ver ${a.nombre}`}>
                <Icon name="ver" size={16} aria-hidden="true" />
              </Button>
              <Button variant="ghost" size="icon" aria-label={`Editar ${a.nombre}`}>
                <Icon name="editar" size={16} aria-hidden="true" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                aria-label={`Eliminar ${a.nombre}`}
                onClick={() => simulateDelete(a.codigo)}
              >
                <Icon name="eliminar" size={16} aria-hidden="true" />
              </Button>
            </>
          )}
          emptyTitle="No hay almacenes todavía"
          emptyDescription="Cree el primer almacén para comenzar a operar."
          emptyAction={
            <ButtonLink variant="primary" size="sm" icon="agregar" href="/almacenes/nuevo">
              Crear almacén
            </ButtonLink>
          }
        />
      </Card>

      <Pagination
        page={page}
        pageCount={Math.max(1, Math.ceil(total / PAGE_SIZE))}
        total={total}
        from={from}
        to={to}
        onPageChange={setPage}
      />

      <div className="mt-6">
        <Card title="Estado de la operación" muted>
          <EmptyState
            icon="reportes"
            title="Sin alertas activas"
            description="Los niveles de stock se encuentran dentro de los umbrales configurados."
          />
        </Card>
      </div>
    </>
  );
}

function Shell() {
  const [navOpen, setNavOpen] = useState(false);
  const { toast } = useToast();

  return (
    <AppShell
      navOpen={navOpen}
      onCloseNav={() => setNavOpen(false)}
      topbar={
        <Topbar
          navToggle={<TopbarNavToggle onClick={() => setNavOpen(true)} />}
          brand={<Brand name="Rustock" />}
          breadcrumbs={<Breadcrumbs items={[{ label: "Almacenes" }]} />}
          search={<Search placeholder="Buscar en todo Rustock" aria-label="Búsqueda global" />}
          alerts={
            <AlertsIndicator count={3} onClick={() => toast("3 alertas activas", "default")} />
          }
          user={<TopbarUser name="Jorge Reyes" role="Administrador" />}
        />
      }
      sidebar={<Sidebar groups={NAV_GROUPS} />}
    >
      <AlmacenesPage />
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
