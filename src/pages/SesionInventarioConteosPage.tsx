import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocation, useParams } from "react-router";
import {
  listarConteos,
  listarLotes,
  listarProductos,
  listarUbicaciones,
  obtenerSesionInventario,
  registrarConteo,
} from "../shared/backend";
import { esPaginado, type Conteo } from "../shared/types";
import {
  Button,
  ButtonLink,
  Card,
  ErrorPanel,
  Field,
  FormActions,
  FormGrid,
  Input,
  Link,
  PageHeader,
  Select,
  Table,
  Text,
  type TableColumn,
} from "../shared/ui";
import { ProductoRef, UbicacionRef } from "../shared/refs";
import { PATH, sesionInventarioDetalle } from "../app/route-paths";
import { catalogoNuevo } from "../app/route-paths";
import { formatearFecha, mensajeError } from "../shared/format";
import { CrearRapido, usePreservarFormulario, useSeleccionCreada } from "../shared/creacion-rapida";

const VACIO = {
  ubicacion_id: "",
  producto_id: "",
  lote_id: "",
  cantidad_contada: "",
  conteo_numero: "1",
  nota: "",
};

const INVALIDAR_UBICACIONES = ["ubicaciones", "selector-conteo"] as const;
const INVALIDAR_PRODUCTOS = ["productos", "selector-conteo"] as const;
// Prefijo: invalida los lotes de cualquier producto (["lotes","por-producto",...]).
const INVALIDAR_LOTES = ["lotes", "por-producto"] as const;

export function SesionInventarioConteosPage() {
  const { id } = useParams<{ id: string }>();
  const sesionId = id as string;
  const location = useLocation();
  const queryClient = useQueryClient();
  const [form, setForm] = useState(VACIO);
  const [error, setError] = useState<string | null>(null);

  // Conserva el formulario de conteo al salir a crear una ubicación, producto
  // o lote (creación rápida) y lo restaura al volver.
  usePreservarFormulario(
    location.pathname,
    () => form,
    (valores) => setForm(valores as typeof VACIO),
  );

  const sesionQuery = useQuery({
    queryKey: ["sesion-inventario", sesionId],
    queryFn: () => obtenerSesionInventario(sesionId),
  });
  const conteosQuery = useQuery({
    queryKey: ["conteos", sesionId],
    queryFn: () => listarConteos(sesionId),
  });
  const ubicacionesQuery = useQuery({
    queryKey: ["ubicaciones", "selector-conteo"],
    queryFn: () => listarUbicaciones({ page_size: 200, sort: "codigo" }),
  });
  const productosQuery = useQuery({
    queryKey: ["productos", "selector-conteo"],
    queryFn: () => listarProductos({ page_size: 200, sort: "nombre" }),
  });
  const ubicaciones =
    ubicacionesQuery.data && esPaginado(ubicacionesQuery.data) ? ubicacionesQuery.data.data : [];
  const productos =
    productosQuery.data && esPaginado(productosQuery.data) ? productosQuery.data.data : [];
  const productoSeleccionado = productos.find((p) => p.id === form.producto_id);

  const lotesQuery = useQuery({
    queryKey: ["lotes", "por-producto", form.producto_id],
    queryFn: () => listarLotes({ filters: [`producto_id:eq:${form.producto_id}`], page_size: 200 }),
    enabled: Boolean(form.producto_id) && Boolean(productoSeleccionado?.controla_lote),
  });
  const lotes = lotesQuery.data && esPaginado(lotesQuery.data) ? lotesQuery.data.data : [];

  const registrarMut = useMutation({
    mutationFn: () =>
      registrarConteo({
        sesion_id: sesionId,
        ubicacion_id: form.ubicacion_id,
        producto_id: form.producto_id,
        lote_id: form.lote_id || null,
        cantidad_contada: Number(form.cantidad_contada),
        conteo_numero: Number(form.conteo_numero),
        nota: form.nota || null,
      }),
    onSuccess: () => {
      setError(null);
      queryClient.invalidateQueries({ queryKey: ["conteos", sesionId] });
      setForm((f) => ({ ...VACIO, conteo_numero: f.conteo_numero }));
    },
    onError: (err) => setError(mensajeError(err)),
  });

  // Creación rápida: al volver de /productos/nuevo o /ubicaciones/nuevo, el
  // registro recién creado queda preseleccionado en el formulario de conteo.
  useSeleccionCreada(
    "ubicacion_id",
    (nuevoId) => setForm((f) => ({ ...f, ubicacion_id: nuevoId })),
    INVALIDAR_UBICACIONES,
  );
  useSeleccionCreada(
    "producto_id",
    (nuevoId) => setForm((f) => ({ ...f, producto_id: nuevoId, lote_id: "" })),
    INVALIDAR_PRODUCTOS,
  );
  useSeleccionCreada(
    "lote_id",
    (nuevoId) => setForm((f) => ({ ...f, lote_id: nuevoId })),
    INVALIDAR_LOTES,
  );

  const columns: Array<TableColumn<Conteo>> = [
    {
      key: "ubicacion_id",
      header: "Ubicación",
      render: (c) => <UbicacionRef id={c.ubicacion_id} />,
    },
    { key: "producto_id", header: "Producto", render: (c) => <ProductoRef id={c.producto_id} /> },
    { key: "cantidad_contada", header: "Cantidad", num: true, render: (c) => c.cantidad_contada },
    { key: "conteo_numero", header: "N.º conteo", num: true, render: (c) => c.conteo_numero },
    { key: "timestamp", header: "Cuándo", render: (c) => formatearFecha(c.timestamp) },
  ];

  const sesion = sesionQuery.data;
  const puedeContar = sesion?.estado === "EN_CURSO";

  return (
    <>
      <PageHeader
        title="Registrar conteos"
        description={
          sesion?.conteo_ciego
            ? "Conteo ciego activo: el saldo del sistema no se muestra durante la captura."
            : "Captura el conteo físico por ubicación, producto y lote."
        }
        actions={
          <ButtonLink variant="secondary" icon="atras" href={sesionInventarioDetalle(sesionId)}>
            Volver a la sesión
          </ButtonLink>
        }
      />

      {sesion && !puedeContar ? (
        <ErrorPanel title="Esta sesión no admite conteos">
          Solo se pueden registrar conteos mientras la sesión está EN_CURSO. Estado actual:{" "}
          {sesion.estado}. <Link href={sesionInventarioDetalle(sesionId)}>Volver a la sesión</Link>.
        </ErrorPanel>
      ) : null}

      <Card title="Nuevo conteo">
        <Card.Body>
          {error ? (
            <ErrorPanel title="No se pudo registrar el conteo" className="mb-4">
              {error}
            </ErrorPanel>
          ) : null}
          <FormGrid columns={2}>
            <Field label="Ubicación" required>
              <div className="flex items-center gap-2">
                <div className="flex-1">
                  <Select
                    aria-label="Ubicación"
                    placeholder="Selecciona"
                    value={form.ubicacion_id}
                    onChange={(e) => setForm({ ...form, ubicacion_id: e.target.value })}
                  >
                    {ubicaciones.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.codigo}
                      </option>
                    ))}
                  </Select>
                </div>
                <CrearRapido campo="ubicacion_id" rutaNueva={catalogoNuevo("ubicaciones")}>
                  Nueva ubicación
                </CrearRapido>
              </div>
            </Field>
            <Field label="Producto" required>
              <div className="flex items-center gap-2">
                <div className="flex-1">
                  <Select
                    aria-label="Producto"
                    placeholder="Selecciona"
                    value={form.producto_id}
                    onChange={(e) => setForm({ ...form, producto_id: e.target.value, lote_id: "" })}
                  >
                    {productos.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.sku} — {p.nombre}
                      </option>
                    ))}
                  </Select>
                </div>
                <CrearRapido campo="producto_id" rutaNueva={catalogoNuevo("productos")}>
                  Nuevo producto
                </CrearRapido>
              </div>
            </Field>
            {productoSeleccionado?.controla_lote ? (
              <Field label="Lote" required>
                <div className="flex items-center gap-2">
                  <div className="flex-1">
                    <Select
                      aria-label="Lote"
                      placeholder="Selecciona"
                      value={form.lote_id}
                      onChange={(e) => setForm({ ...form, lote_id: e.target.value })}
                    >
                      {lotes.map((l) => (
                        <option key={l.id} value={l.id}>
                          {l.numero}
                        </option>
                      ))}
                    </Select>
                  </div>
                  <CrearRapido campo="lote_id" rutaNueva={catalogoNuevo("lotes")}>
                    Nuevo lote
                  </CrearRapido>
                </div>
              </Field>
            ) : null}
            <Field label="Cantidad contada" required help="0 = producto ausente en esta ubicación.">
              <Input
                type="number"
                min="0"
                step="1"
                number
                value={form.cantidad_contada}
                onChange={(e) => setForm({ ...form, cantidad_contada: e.target.value })}
              />
            </Field>
            <Field label="N.º de conteo" required>
              <Input
                type="number"
                min="1"
                step="1"
                number
                value={form.conteo_numero}
                onChange={(e) => setForm({ ...form, conteo_numero: e.target.value })}
              />
            </Field>
            <Field label="Nota">
              <Input
                placeholder="Ej. caja dañada"
                value={form.nota}
                onChange={(e) => setForm({ ...form, nota: e.target.value })}
              />
            </Field>
          </FormGrid>
          <FormActions>
            <Button
              type="button"
              variant="primary"
              disabled={
                !puedeContar ||
                !form.ubicacion_id ||
                !form.producto_id ||
                form.cantidad_contada === "" ||
                registrarMut.isPending
              }
              onClick={() => registrarMut.mutate()}
            >
              {registrarMut.isPending ? "Registrando…" : "Registrar conteo"}
            </Button>
          </FormActions>
        </Card.Body>
      </Card>

      <div className="mt-6">
        <Card title="Conteos de esta sesión">
          <Table
            columns={columns}
            rows={conteosQuery.data ?? []}
            rowKey={(c) => c.id}
            loading={conteosQuery.isLoading}
            emptyTitle="Sin conteos todavía"
          />
        </Card>
      </div>

      <div className="mt-4">
        <Text as="p" size="sm" color="muted">
          <Link href={PATH.inventario}>Volver al listado de sesiones</Link>
        </Text>
      </div>
    </>
  );
}
