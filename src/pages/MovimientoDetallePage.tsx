import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
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
  ESTADO_MOVIMIENTO_LABEL,
  ESTADO_MOVIMIENTO_TONE,
  SUB_TIPO_MOVIMIENTO_LABEL,
  TIPO_MOVIMIENTO_LABEL,
  TIPO_MOVIMIENTO_TONE,
  formatearFecha,
  mensajeError,
} from "../shared/format";
import { useSession } from "../shared/session";

export function MovimientoDetallePage() {
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
      toast("Movimiento enviado a aprobación.", "success");
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
    { key: "producto_id", header: "Producto", render: (l) => <ProductoRef id={l.producto_id} /> },
    {
      key: "lote_id",
      header: "Lote",
      render: (l) => (l.lote_id ? <LoteRef id={l.lote_id} /> : "—"),
    },
    { key: "cantidad", header: "Cantidad", num: true, render: (l) => l.cantidad.toLocaleString() },
    {
      key: "origen_ubicacion_id",
      header: "Origen",
      render: (l) => (l.origen_ubicacion_id ? <UbicacionRef id={l.origen_ubicacion_id} /> : "—"),
    },
    {
      key: "destino_ubicacion_id",
      header: "Destino",
      render: (l) => (l.destino_ubicacion_id ? <UbicacionRef id={l.destino_ubicacion_id} /> : "—"),
    },
  ];

  if (movimientoQuery.isLoading) {
    return <PageHeader title="Movimiento" description="Cargando…" />;
  }

  if (!movimiento) {
    return (
      <ErrorPanel title="Movimiento no encontrado">
        No se encontró el movimiento solicitado.{" "}
        <Link href={PATH.movimientos}>Volver al listado</Link>.
      </ErrorPanel>
    );
  }

  const datosGenerales = [
    { label: "Tipo", value: TIPO_MOVIMIENTO_LABEL[movimiento.tipo] },
    { label: "Sub-tipo", value: SUB_TIPO_MOVIMIENTO_LABEL[movimiento.sub_tipo], code: true },
    { label: "Fecha del movimiento", value: formatearFecha(movimiento.fecha_movimiento) },
    { label: "Documento de referencia", value: movimiento.documento_referencia ?? "—", code: true },
    // Trazabilidad de contraparte (SPEC §6.4): de quién vino / a quién fue.
    ...(movimiento.proveedor_id
      ? [{ label: "Proveedor", value: <ProveedorRef id={movimiento.proveedor_id} /> }]
      : []),
    ...(movimiento.cliente_id
      ? [{ label: "Cliente", value: <ClienteRef id={movimiento.cliente_id} /> }]
      : []),
    // Origen del ajuste (SPEC §11.5/§13.3): movimientos generados al cerrar
    // una sesión de inventario enlazan a esa sesión.
    ...(movimiento.sesion_inventario_id
      ? [
          {
            label: "Sesión de inventario",
            value: <SesionInventarioRef id={movimiento.sesion_inventario_id} />,
          },
        ]
      : []),
    { label: "Motivo", value: movimiento.motivo ?? "—" },
    { label: "Notas", value: movimiento.notas ?? "—" },
    { label: "Creado por", value: <UsuarioNombre id={movimiento.created_by} /> },
    { label: "Creado", value: formatearFecha(movimiento.created_at) },
    {
      label: "Aprobado por",
      value: movimiento.approved_by ? <UsuarioNombre id={movimiento.approved_by} /> : "—",
    },
    { label: "Aprobado", value: formatearFecha(movimiento.approved_at) },
    {
      label: "Anulado por",
      value: movimiento.anulado_by ? <UsuarioNombre id={movimiento.anulado_by} /> : "—",
    },
    { label: "Anulado", value: formatearFecha(movimiento.anulado_at) },
  ];

  return (
    <>
      <PageHeader
        title={movimiento.numero}
        description={
          <div className="flex items-center gap-2">
            <Badge tone={TIPO_MOVIMIENTO_TONE[movimiento.tipo]}>
              {TIPO_MOVIMIENTO_LABEL[movimiento.tipo]}
            </Badge>
            <Badge tone={ESTADO_MOVIMIENTO_TONE[movimiento.estado]}>
              {ESTADO_MOVIMIENTO_LABEL[movimiento.estado]}
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
              Duplicar
            </ButtonLink>
            {puedeEditar ? (
              <ButtonLink variant="secondary" icon="editar" href={movimientoEditar(movimientoId)}>
                Editar
              </ButtonLink>
            ) : null}
            {movimiento.estado === "BORRADOR" ? (
              <Button
                variant="secondary"
                icon="aprobar"
                onClick={() => enviarMut.mutate()}
                disabled={enviarMut.isPending}
              >
                Enviar a aprobación
              </Button>
            ) : null}
            {movimiento.estado === "BORRADOR" || movimiento.estado === "PENDIENTE_APROBACION" ? (
              <ButtonLink variant="primary" icon="aprobar" href={movimientoAprobar(movimientoId)}>
                Aprobar
              </ButtonLink>
            ) : null}
            {movimiento.estado === "APROBADO" ? (
              <ButtonLink variant="danger" icon="anular" href={movimientoAnular(movimientoId)}>
                Anular
              </ButtonLink>
            ) : null}
          </div>
        }
      />

      {movimiento.estado === "ANULADO" && movimiento.movimiento_inverso_id ? (
        <ErrorPanel title="Movimiento anulado">
          Este movimiento fue anulado. Se generó el movimiento inverso{" "}
          <MovimientoRef id={movimiento.movimiento_inverso_id} />.
        </ErrorPanel>
      ) : null}
      {movimiento.estado !== "ANULADO" && movimiento.movimiento_inverso_id ? (
        // Referencia mutua del backend: este movimiento APROBADO ES el inverso del original.
        <Card muted>
          <Card.Body>
            <Text as="p" size="sm">
              Este movimiento es el <strong>inverso</strong> de{" "}
              <MovimientoRef id={movimiento.movimiento_inverso_id} />, generado automáticamente al
              anular el movimiento original. Su efecto sobre el stock revierte la operación anulada.
            </Text>
          </Card.Body>
        </Card>
      ) : null}

      <Card title="Datos generales">
        <Card.Body>
          <DetailList items={datosGenerales} />
        </Card.Body>
      </Card>

      <div className="mt-6">
        <Card title="Líneas del movimiento">
          <Table
            columns={columns}
            rows={lineas}
            rowKey={(l) => l.id}
            loading={lineasQuery.isLoading}
            emptyTitle="Sin líneas"
          />
        </Card>
      </div>

      <MovimientoComentarios movimientoId={movimientoId} />
    </>
  );
}
