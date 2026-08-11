import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useParams } from "react-router";
import {
  crearComentario,
  enviarAAprobacion,
  listarComentarios,
  listarLineasMovimiento,
  obtenerLote,
  obtenerMovimiento,
  obtenerProducto,
  obtenerUbicacion,
} from "../shared/backend";
import { esPaginado, type LineaMovimiento } from "../shared/types";
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
  Textarea,
  useToast,
  type TableColumn,
} from "../shared/ui";
import {
  catalogoDetalle,
  movimientoAnular,
  movimientoAprobar,
  movimientoDetalle,
  PATH,
} from "../app/route-paths";
import {
  ESTADO_MOVIMIENTO_LABEL,
  ESTADO_MOVIMIENTO_TONE,
  TIPO_MOVIMIENTO_LABEL,
  TIPO_MOVIMIENTO_TONE,
  formatearFecha,
  mensajeError,
} from "../shared/format";

function ProductoRef({ id }: { id: string }) {
  const query = useQuery({ queryKey: ["producto", id], queryFn: () => obtenerProducto(id) });
  if (!query.data) return <span>{query.isLoading ? "…" : id}</span>;
  return <Link href={catalogoDetalle("productos", id)}>{query.data.sku}</Link>;
}

function UbicacionRef({ id }: { id: string }) {
  const query = useQuery({ queryKey: ["ubicacion", id], queryFn: () => obtenerUbicacion(id) });
  if (!query.data) return <span>{query.isLoading ? "…" : id}</span>;
  return <Link href={catalogoDetalle("ubicaciones", id)}>{query.data.codigo}</Link>;
}

function LoteRef({ id }: { id: string }) {
  const query = useQuery({ queryKey: ["lote", id], queryFn: () => obtenerLote(id) });
  if (!query.data) return <span>{query.isLoading ? "…" : id}</span>;
  return <Link href={catalogoDetalle("lotes", id)}>{query.data.numero}</Link>;
}

export function MovimientoDetallePage() {
  const { id } = useParams<{ id: string }>();
  const movimientoId = id as string;
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [textoComentario, setTextoComentario] = useState("");

  const movimientoQuery = useQuery({
    queryKey: ["movimiento", movimientoId],
    queryFn: () => obtenerMovimiento(movimientoId),
  });
  const lineasQuery = useQuery({
    queryKey: ["movimiento-lineas", movimientoId],
    queryFn: () => listarLineasMovimiento(movimientoId, { page_size: -1 }),
  });
  const comentariosQuery = useQuery({
    queryKey: ["comentarios", "movimiento", movimientoId],
    queryFn: () => listarComentarios("movimiento", movimientoId),
  });

  const enviarMut = useMutation({
    mutationFn: () => enviarAAprobacion(movimientoId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["movimiento", movimientoId] });
      toast("Movimiento enviado a aprobación.", "success");
    },
    onError: (err) => toast(mensajeError(err), "error"),
  });

  const comentarMut = useMutation({
    mutationFn: () =>
      crearComentario({ entidad: "movimiento", entidad_id: movimientoId, texto: textoComentario }),
    onSuccess: () => {
      setTextoComentario("");
      queryClient.invalidateQueries({ queryKey: ["comentarios", "movimiento", movimientoId] });
    },
    onError: (err) => toast(mensajeError(err), "error"),
  });

  const movimiento = movimientoQuery.data;
  const lineas = lineasQuery.data && esPaginado(lineasQuery.data) ? lineasQuery.data.data : [];

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
    { label: "Sub-tipo", value: movimiento.sub_tipo, code: true },
    { label: "Fecha del movimiento", value: formatearFecha(movimiento.fecha_movimiento) },
    { label: "Documento de referencia", value: movimiento.documento_referencia ?? "—", code: true },
    { label: "Motivo", value: movimiento.motivo ?? "—" },
    { label: "Notas", value: movimiento.notas ?? "—" },
    { label: "Creado por", value: movimiento.created_by, code: true },
    { label: "Creado", value: formatearFecha(movimiento.created_at) },
    { label: "Aprobado por", value: movimiento.approved_by ?? "—", code: true },
    { label: "Aprobado", value: formatearFecha(movimiento.approved_at) },
    { label: "Anulado por", value: movimiento.anulado_by ?? "—", code: true },
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

      {movimiento.movimiento_inverso_id ? (
        <ErrorPanel title="Movimiento anulado">
          Este movimiento fue anulado. Se generó el movimiento inverso{" "}
          <Link href={movimientoDetalle(movimiento.movimiento_inverso_id)}>
            {movimiento.movimiento_inverso_id}
          </Link>
          .
        </ErrorPanel>
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

      <div className="mt-6">
        <Card title="Comentarios">
          <Card.Body>
            {comentariosQuery.data && comentariosQuery.data.length > 0 ? (
              <ul className="list-none p-0">
                {comentariosQuery.data
                  .filter((c) => !c.oculto)
                  .map((c) => (
                    <li key={c.id} className="border-b border-gray-100 py-2">
                      <div className="flex items-center gap-2">
                        <Text size="sm" weight="medium">
                          {c.usuario_id}
                        </Text>
                        <Text size="xs" color="muted">
                          {formatearFecha(c.created_at)}
                        </Text>
                        {c.editado ? (
                          <Badge tone="neutral" className="text-xs">
                            Editado
                          </Badge>
                        ) : null}
                      </div>
                      <Text as="p" size="sm">
                        {c.texto}
                      </Text>
                    </li>
                  ))}
              </ul>
            ) : (
              <Text as="p" size="sm" color="muted">
                Sin comentarios todavía.
              </Text>
            )}

            <form
              className="mt-4"
              onSubmit={(e) => {
                e.preventDefault();
                if (textoComentario.trim()) comentarMut.mutate();
              }}
            >
              <Textarea
                aria-label="Nuevo comentario"
                placeholder="Agregar un comentario…"
                value={textoComentario}
                onChange={(e) => setTextoComentario(e.target.value)}
                rows={3}
              />
              <div className="mt-2">
                <Button
                  type="submit"
                  variant="secondary"
                  size="sm"
                  disabled={comentarMut.isPending || !textoComentario.trim()}
                >
                  Comentar
                </Button>
              </div>
            </form>
          </Card.Body>
        </Card>
      </div>
    </>
  );
}
