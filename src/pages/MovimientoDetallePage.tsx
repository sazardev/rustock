import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useT } from "../shared/i18n";
import { useParams } from "react-router";
import { enviarAAprobacion, listarLineasMovimiento, obtenerMovimiento } from "../shared/backend";
import { esPaginado, type LineaMovimiento } from "../shared/types";
import {
  ClienteRef,
  LoteRef,
  MovimientoRef,
  ProductoRef,
  ProveedorRef,
  SesionInventarioRef,
  UbicacionRef,
  UsuarioNombre,
} from "../shared/refs";
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
  Text,
  useToast,
  type TableColumn,
} from "../shared/ui";
import { MovimientoComentarios } from "./MovimientoComentarios";
import { movimientoAnular, movimientoAprobar, movimientoEditar, PATH } from "../app/route-paths";
import {
  ESTADO_MOVIMIENTO_TONE,
  TIPO_MOVIMIENTO_TONE,
  formatearFecha,
  mensajeError,
} from "../shared/format";
import { useSession } from "../shared/session";

export function MovimientoDetallePage() {
  const t = useT();
  const { id } = useParams<{ id: string }>();
  const movimientoId = id as string;
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const sesion = useSession((s) => s.usuario);

  const movimientoQuery = useQuery({
    queryKey: ["movimiento", movimientoId],
    queryFn: () => obtenerMovimiento(movimientoId),
  });
  const lineasQuery = useQuery({
    queryKey: ["movimiento-lineas", movimientoId],
    queryFn: () => listarLineasMovimiento(movimientoId, { page_size: -1 }),
  });

  const enviarMut = useMutation({
    mutationFn: () => enviarAAprobacion(movimientoId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["movimiento", movimientoId] });
      toast(t.movimientoDetalle.enviadoAAprobacion, "success");
    },
    onError: (err) => toast(mensajeError(err), "error"),
  });

  const movimiento = movimientoQuery.data;
  const lineas = lineasQuery.data && esPaginado(lineasQuery.data) ? lineasQuery.data.data : [];
  const esCreador = Boolean(sesion && movimiento && sesion.id === movimiento.created_by);
  const puedeEditar =
    esCreador &&
    (movimiento?.estado === "BORRADOR" || movimiento?.estado === "PENDIENTE_APROBACION");

  const columns: Array<TableColumn<LineaMovimiento>> = [
    {
      key: "producto_id",
      header: t.campos.producto,
      render: (l) => <ProductoRef id={l.producto_id} />,
    },
    {
      key: "lote_id",
      header: t.campos.lote,
      render: (l) => (l.lote_id ? <LoteRef id={l.lote_id} /> : "—"),
    },
    {
      key: "cantidad",
      header: t.comun.cantidad,
      num: true,
      render: (l) => l.cantidad.toLocaleString(),
    },
    {
      key: "origen_ubicacion_id",
      header: t.campos.origen,
      render: (l) => (l.origen_ubicacion_id ? <UbicacionRef id={l.origen_ubicacion_id} /> : "—"),
    },
    {
      key: "destino_ubicacion_id",
      header: t.campos.destino,
      render: (l) => (l.destino_ubicacion_id ? <UbicacionRef id={l.destino_ubicacion_id} /> : "—"),
    },
  ];

  if (movimientoQuery.isLoading) {
    return <PageHeader title={t.movimientos.singular} description={t.comun.cargando} />;
  }

  if (!movimiento) {
    return (
      <ErrorPanel title={t.movimientoDetalle.noEncontrado}>
        {t.listado.noSeEncontroRegistro}{" "}
        <Link href={PATH.movimientos}>{t.listado.volverAlListado}</Link>.
      </ErrorPanel>
    );
  }

  const datosGenerales = [
    { label: t.comun.tipo, value: t.dominio.tipoMovimiento[movimiento.tipo] },
    {
      label: t.campos.subTipo,
      value: t.dominio.subTipoMovimiento[movimiento.sub_tipo],
      code: true,
    },
    {
      label: t.movimientoDetalle.fechaMovimiento,
      value: formatearFecha(movimiento.fecha_movimiento),
    },
    {
      label: t.movimientoDetalle.documentoReferencia,
      value: movimiento.documento_referencia ?? "—",
      code: true,
    },
    // Trazabilidad de contraparte (SPEC §6.4): de quién vino / a quién fue.
    ...(movimiento.proveedor_id
      ? [{ label: t.campos.proveedor, value: <ProveedorRef id={movimiento.proveedor_id} /> }]
      : []),
    ...(movimiento.cliente_id
      ? [{ label: t.campos.cliente, value: <ClienteRef id={movimiento.cliente_id} /> }]
      : []),
    // Origen del ajuste (SPEC §11.5/§13.3): movimientos generados al cerrar
    // una sesión de inventario enlazan a esa sesión.
    ...(movimiento.sesion_inventario_id
      ? [
          {
            label: t.movimientoDetalle.sesionInventario,
            value: <SesionInventarioRef id={movimiento.sesion_inventario_id} />,
          },
        ]
      : []),
    { label: t.campos.motivo, value: movimiento.motivo ?? "—" },
    { label: t.comun.notas, value: movimiento.notas ?? "—" },
    { label: t.movimientoDetalle.creadoPor, value: <UsuarioNombre id={movimiento.created_by} /> },
    { label: t.campos.creado, value: formatearFecha(movimiento.created_at) },
    {
      label: t.movimientoDetalle.aprobadoPor,
      value: movimiento.approved_by ? <UsuarioNombre id={movimiento.approved_by} /> : "—",
    },
    { label: t.movimientoDetalle.aprobado, value: formatearFecha(movimiento.approved_at) },
    {
      label: t.movimientoDetalle.anuladoPor,
      value: movimiento.anulado_by ? <UsuarioNombre id={movimiento.anulado_by} /> : "—",
    },
    { label: t.movimientoDetalle.anulado, value: formatearFecha(movimiento.anulado_at) },
  ];

  return (
    <>
      <PageHeader
        title={movimiento.numero}
        description={
          <div className="flex items-center gap-2">
            <Badge tone={TIPO_MOVIMIENTO_TONE[movimiento.tipo]}>
              {t.dominio.tipoMovimiento[movimiento.tipo]}
            </Badge>
            <Badge tone={ESTADO_MOVIMIENTO_TONE[movimiento.estado]}>
              {t.dominio.estadoMovimiento[movimiento.estado]}
            </Badge>
          </div>
        }
        actions={
          <div className="flex gap-2">
            <ButtonLink
              variant="secondary"
              icon="agregar"
              href={`${PATH.movimientosNuevo}?tipo=${movimiento.tipo}&duplicarDe=${movimientoId}`}
            >
              {t.movimientoDetalle.duplicar}
            </ButtonLink>
            {puedeEditar ? (
              <ButtonLink variant="secondary" icon="editar" href={movimientoEditar(movimientoId)}>
                {t.comun.editar}
              </ButtonLink>
            ) : null}
            {movimiento.estado === "BORRADOR" ? (
              <Button
                variant="secondary"
                icon="aprobar"
                onClick={() => enviarMut.mutate()}
                disabled={enviarMut.isPending}
              >
                {t.movimientoDetalle.enviarAAprobacion}
              </Button>
            ) : null}
            {movimiento.estado === "BORRADOR" || movimiento.estado === "PENDIENTE_APROBACION" ? (
              <ButtonLink variant="primary" icon="aprobar" href={movimientoAprobar(movimientoId)}>
                {t.movimientoDetalle.aprobar}
              </ButtonLink>
            ) : null}
            {movimiento.estado === "APROBADO" ? (
              <ButtonLink variant="danger" icon="anular" href={movimientoAnular(movimientoId)}>
                {t.movimientoDetalle.anular}
              </ButtonLink>
            ) : null}
          </div>
        }
      />

      {movimiento.estado === "ANULADO" && movimiento.movimiento_inverso_id ? (
        <ErrorPanel title={t.movimientoDetalle.panelAnulado}>
          {t.movimientoDetalle.fueAnulado} <MovimientoRef id={movimiento.movimiento_inverso_id} />.
        </ErrorPanel>
      ) : null}
      {movimiento.estado !== "ANULADO" && movimiento.movimiento_inverso_id ? (
        // Referencia mutua del backend: este movimiento APROBADO ES el inverso del original.
        <Card muted>
          <Card.Body>
            <Text as="p" size="sm">
              {t.movimientoDetalle.esInversoPre}{" "}
              <strong>{t.movimientoDetalle.esInversoFuerte}</strong>{" "}
              {t.movimientoDetalle.esInversoMedio}{" "}
              <MovimientoRef id={movimiento.movimiento_inverso_id} />
              {t.movimientoDetalle.esInversoPost}
            </Text>
          </Card.Body>
        </Card>
      ) : null}

      <Card title={t.movimientoDetalle.datosGenerales}>
        <Card.Body>
          <DetailList items={datosGenerales} />
        </Card.Body>
      </Card>

      <div className="mt-6">
        <Card title={t.movimientoDetalle.lineas}>
          <Table
            columns={columns}
            rows={lineas}
            rowKey={(l) => l.id}
            loading={lineasQuery.isLoading}
            emptyTitle={t.movimientoDetalle.sinLineas}
          />
        </Card>
      </div>

      <MovimientoComentarios movimientoId={movimientoId} />
    </>
  );
}
