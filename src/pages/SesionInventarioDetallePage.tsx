import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useT } from "../shared/i18n";
import { useParams } from "react-router";
import {
  diferenciasSesion,
  iniciarSesionInventario,
  listarConteos,
  obtenerSesionInventario,
  precisionSesion,
} from "../shared/backend";
import type { Conteo, DiferenciaInventario } from "../shared/types";
import {
  Badge,
  Button,
  ButtonLink,
  Card,
  DetailList,
  ErrorPanel,
  Link,
  PageHeader,
  Table,
  useToast,
  type TableColumn,
} from "../shared/ui";
import { AlmacenRef, LoteRef, ProductoRef, UbicacionRef } from "../shared/refs";
import { PATH, sesionInventarioCerrar, sesionInventarioConteos } from "../app/route-paths";
import {
  ESTADO_SESION_TONE,
  TIPO_DIFERENCIA_TONE,
  formatearFecha,
  mensajeError,
} from "../shared/format";

export function SesionInventarioDetallePage() {
  const t = useT();
  const { id } = useParams<{ id: string }>();
  const sesionId = id as string;
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const sesionQuery = useQuery({
    queryKey: ["sesion-inventario", sesionId],
    queryFn: () => obtenerSesionInventario(sesionId),
  });
  const conteosQuery = useQuery({
    queryKey: ["conteos", sesionId],
    queryFn: () => listarConteos(sesionId),
  });
  const diferenciasQuery = useQuery({
    queryKey: ["diferencias-sesion", sesionId],
    queryFn: () => diferenciasSesion(sesionId),
    enabled: (conteosQuery.data?.length ?? 0) > 0,
  });
  const sesion = sesionQuery.data;
  const precisionQuery = useQuery({
    queryKey: ["precision-sesion", sesionId],
    queryFn: () => precisionSesion(sesionId),
    enabled: sesion?.estado === "CERRADA",
  });

  const iniciarMut = useMutation({
    mutationFn: () => iniciarSesionInventario(sesionId),
    onSuccess: (sesionIniciada) => {
      queryClient.setQueryData(["sesion-inventario", sesionId], sesionIniciada);
      queryClient.invalidateQueries({ queryKey: ["sesiones-inventario"] });
      toast("Sesión iniciada: ya puedes registrar conteos.", "success");
    },
    onError: (err) => toast(mensajeError(err), "error"),
  });

  const conteoColumns: Array<TableColumn<Conteo>> = [
    {
      key: "ubicacion_id",
      header: "Ubicación",
      render: (c) => <UbicacionRef id={c.ubicacion_id} />,
    },
    { key: "producto_id", header: "Producto", render: (c) => <ProductoRef id={c.producto_id} /> },
    {
      key: "lote_id",
      header: "Lote",
      render: (c) => (c.lote_id ? <LoteRef id={c.lote_id} /> : "—"),
    },
    { key: "cantidad_contada", header: "Cantidad", num: true, render: (c) => c.cantidad_contada },
    { key: "conteo_numero", header: "N.º conteo", num: true, render: (c) => c.conteo_numero },
    { key: "timestamp", header: "Cuándo", render: (c) => formatearFecha(c.timestamp) },
    { key: "nota", header: "Nota", render: (c) => c.nota ?? "—" },
  ];

  const diferenciaColumns: Array<TableColumn<DiferenciaInventario>> = [
    {
      key: "ubicacion_id",
      header: "Ubicación",
      render: (d) => <UbicacionRef id={d.ubicacion_id} />,
    },
    { key: "producto_id", header: "Producto", render: (d) => <ProductoRef id={d.producto_id} /> },
    { key: "saldo_sistema", header: "Saldo sistema", num: true, render: (d) => d.saldo_sistema },
    { key: "cantidad_contada", header: "Contado", num: true, render: (d) => d.cantidad_contada },
    { key: "diferencia", header: "Diferencia", num: true, render: (d) => d.diferencia },
    {
      key: "tipo",
      header: "Tipo",
      render: (d) => (
        <Badge tone={TIPO_DIFERENCIA_TONE[d.tipo]}>{t.dominio.tipoDiferencia[d.tipo]}</Badge>
      ),
    },
  ];

  if (sesionQuery.isLoading) {
    return <PageHeader title="Sesión de inventario" description="Cargando…" />;
  }

  if (!sesion) {
    return (
      <ErrorPanel title="Sesión no encontrada">
        <Link href={PATH.inventario}>Volver al listado</Link>
      </ErrorPanel>
    );
  }

  return (
    <>
      <PageHeader
        title={sesion.numero}
        description={
          <Badge tone={ESTADO_SESION_TONE[sesion.estado]}>
            {t.dominio.estadoSesion[sesion.estado]}
          </Badge>
        }
        actions={
          sesion.estado === "EN_CURSO" ? (
            <div className="flex gap-2">
              <ButtonLink
                variant="secondary"
                icon="agregar"
                href={sesionInventarioConteos(sesionId)}
              >
                Registrar conteos
              </ButtonLink>
              <ButtonLink variant="primary" icon="cerrar" href={sesionInventarioCerrar(sesionId)}>
                Cerrar sesión
              </ButtonLink>
            </div>
          ) : sesion.estado === "PLANEADA" ? (
            <Button
              variant="primary"
              icon="aprobar"
              onClick={() => iniciarMut.mutate()}
              disabled={iniciarMut.isPending}
            >
              {iniciarMut.isPending ? "Iniciando…" : "Iniciar sesión"}
            </Button>
          ) : undefined
        }
      />

      {sesionQuery.error ? (
        <ErrorPanel title="No se pudo cargar la sesión">
          {mensajeError(sesionQuery.error)}
        </ErrorPanel>
      ) : null}

      <Card title="Resumen">
        <Card.Body>
          <DetailList
            items={[
              { label: "Tipo", value: sesion.tipo === "COMPLETO" ? "Completo" : "Cíclico" },
              { label: "Almacén", value: <AlmacenRef id={sesion.almacen_id} /> },
              { label: "Alcance", value: sesion.alcance ?? "—" },
              { label: "Responsable", value: sesion.responsable_id ?? "—", code: true },
              { label: "Conteo ciego", value: sesion.conteo_ciego ? "Sí" : "No" },
              { label: "Exige doble conteo", value: sesion.exige_doble_conteo ? "Sí" : "No" },
              { label: "Fecha de inicio", value: formatearFecha(sesion.fecha_inicio) },
              { label: "Fecha de fin", value: formatearFecha(sesion.fecha_fin) },
              { label: "Creado por", value: sesion.created_by, code: true },
              { label: "Creado", value: formatearFecha(sesion.created_at) },
              { label: "Cerrado por", value: sesion.closed_by ?? "—", code: true },
              { label: "Cerrado", value: formatearFecha(sesion.closed_at) },
            ]}
          />
        </Card.Body>
      </Card>

      {sesion.estado === "CERRADA" && precisionQuery.data ? (
        <div className="mt-6">
          <Card title="Precisión de la sesión">
            <Card.Body>
              <DetailList
                items={[
                  {
                    label: "Precisión por SKU",
                    value: `${precisionQuery.data.precision_sku.toFixed(1)}% (${precisionQuery.data.skus_exactos}/${precisionQuery.data.skus_contados})`,
                    code: true,
                  },
                  {
                    label: "Precisión por cantidad",
                    value: `${precisionQuery.data.precision_cantidad.toFixed(1)}% (${precisionQuery.data.unidades_correctas}/${precisionQuery.data.unidades_contadas})`,
                    code: true,
                  },
                  {
                    label: "Exactitud por ubicación",
                    value: `${precisionQuery.data.exactitud_ubicacion.toFixed(1)}% (${precisionQuery.data.ubicaciones_exactas}/${precisionQuery.data.ubicaciones_contadas})`,
                    code: true,
                  },
                ]}
              />
            </Card.Body>
          </Card>
        </div>
      ) : null}

      <div className="mt-6">
        <Card title="Conteos registrados">
          <Table
            columns={conteoColumns}
            rows={conteosQuery.data ?? []}
            rowKey={(c) => c.id}
            loading={conteosQuery.isLoading}
            emptyTitle="Sin conteos todavía"
            emptyDescription="Registra conteos para esta sesión desde su página dedicada."
          />
        </Card>
      </div>

      <div className="mt-6">
        <Card title="Diferencias">
          <Table
            columns={diferenciaColumns}
            rows={diferenciasQuery.data ?? []}
            rowKey={(d) => `${d.ubicacion_id}-${d.producto_id}-${d.lote_id ?? ""}`}
            loading={diferenciasQuery.isLoading}
            emptyTitle="Sin diferencias"
            emptyDescription="Las diferencias aparecen al comparar los conteos contra el saldo del sistema."
          />
        </Card>
      </div>
    </>
  );
}
