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
      toast(t.sesionInventario.iniciada, "success");
    },
    onError: (err) => toast(mensajeError(err), "error"),
  });

  const conteoColumns: Array<TableColumn<Conteo>> = [
    {
      key: "ubicacion_id",
      header: t.campos.ubicacion,
      render: (c) => <UbicacionRef id={c.ubicacion_id} />,
    },
    {
      key: "producto_id",
      header: t.campos.producto,
      render: (c) => <ProductoRef id={c.producto_id} />,
    },
    {
      key: "lote_id",
      header: t.campos.lote,
      render: (c) => (c.lote_id ? <LoteRef id={c.lote_id} /> : "—"),
    },
    {
      key: "cantidad_contada",
      header: t.comun.cantidad,
      num: true,
      render: (c) => c.cantidad_contada,
    },
    {
      key: "conteo_numero",
      header: t.sesionInventario.nroConteo,
      num: true,
      render: (c) => c.conteo_numero,
    },
    {
      key: "timestamp",
      header: t.sesionInventario.cuando,
      render: (c) => formatearFecha(c.timestamp),
    },
    { key: "nota", header: t.sesionInventario.nota, render: (c) => c.nota ?? "—" },
  ];

  const diferenciaColumns: Array<TableColumn<DiferenciaInventario>> = [
    {
      key: "ubicacion_id",
      header: t.campos.ubicacion,
      render: (d) => <UbicacionRef id={d.ubicacion_id} />,
    },
    {
      key: "producto_id",
      header: t.campos.producto,
      render: (d) => <ProductoRef id={d.producto_id} />,
    },
    {
      key: "saldo_sistema",
      header: t.sesionInventario.saldoSistema,
      num: true,
      render: (d) => d.saldo_sistema,
    },
    {
      key: "cantidad_contada",
      header: t.sesionInventario.contado,
      num: true,
      render: (d) => d.cantidad_contada,
    },
    {
      key: "diferencia",
      header: t.sesionInventario.diferencia,
      num: true,
      render: (d) => d.diferencia,
    },
    {
      key: "tipo",
      header: t.comun.tipo,
      render: (d) => (
        <Badge tone={TIPO_DIFERENCIA_TONE[d.tipo]}>{t.dominio.tipoDiferencia[d.tipo]}</Badge>
      ),
    },
  ];

  if (sesionQuery.isLoading) {
    return <PageHeader title={t.sesionInventario.titulo} description={t.comun.cargando} />;
  }

  if (!sesion) {
    return (
      <ErrorPanel title={t.sesionInventario.noEncontrada}>
        <Link href={PATH.inventario}>{t.listado.volverAlListado}</Link>
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
                {t.sesionInventario.registrarConteos}
              </ButtonLink>
              <ButtonLink variant="primary" icon="cerrar" href={sesionInventarioCerrar(sesionId)}>
                {t.sesionInventario.cerrar}
              </ButtonLink>
            </div>
          ) : sesion.estado === "PLANEADA" ? (
            <Button
              variant="primary"
              icon="aprobar"
              onClick={() => iniciarMut.mutate()}
              disabled={iniciarMut.isPending}
            >
              {iniciarMut.isPending ? t.sesionInventario.iniciando : t.sesionInventario.iniciar}
            </Button>
          ) : undefined
        }
      />

      {sesionQuery.error ? (
        <ErrorPanel title={t.sesionInventario.noSePudoCargar}>
          {mensajeError(sesionQuery.error)}
        </ErrorPanel>
      ) : null}

      <Card title={t.sesionInventario.resumen}>
        <Card.Body>
          <DetailList
            items={[
              {
                label: t.comun.tipo,
                value:
                  sesion.tipo === "COMPLETO"
                    ? t.sesionInventario.completo
                    : t.sesionInventario.ciclico,
              },
              { label: t.campos.almacen, value: <AlmacenRef id={sesion.almacen_id} /> },
              { label: t.sesionInventario.alcance, value: sesion.alcance ?? "—" },
              {
                label: t.sesionInventario.responsable,
                value: sesion.responsable_id ?? "—",
                code: true,
              },
              {
                label: t.sesionInventario.conteoCiego,
                value: sesion.conteo_ciego ? t.comun.si : t.comun.no,
              },
              {
                label: t.sesionInventario.exigeDobleConteo,
                value: sesion.exige_doble_conteo ? t.comun.si : t.comun.no,
              },
              { label: t.sesionInventario.fechaInicio, value: formatearFecha(sesion.fecha_inicio) },
              { label: t.sesionInventario.fechaFin, value: formatearFecha(sesion.fecha_fin) },
              { label: t.sesionInventario.creadoPor, value: sesion.created_by, code: true },
              { label: t.sesionInventario.creado, value: formatearFecha(sesion.created_at) },
              { label: t.sesionInventario.cerradoPor, value: sesion.closed_by ?? "—", code: true },
              { label: t.sesionInventario.cerrado, value: formatearFecha(sesion.closed_at) },
            ]}
          />
        </Card.Body>
      </Card>

      {sesion.estado === "CERRADA" && precisionQuery.data ? (
        <div className="mt-6">
          <Card title={t.sesionInventario.precision}>
            <Card.Body>
              <DetailList
                items={[
                  {
                    label: t.sesionInventario.precisionSku,
                    value: `${precisionQuery.data.precision_sku.toFixed(1)}% (${precisionQuery.data.skus_exactos}/${precisionQuery.data.skus_contados})`,
                    code: true,
                  },
                  {
                    label: t.sesionInventario.precisionCantidad,
                    value: `${precisionQuery.data.precision_cantidad.toFixed(1)}% (${precisionQuery.data.unidades_correctas}/${precisionQuery.data.unidades_contadas})`,
                    code: true,
                  },
                  {
                    label: t.sesionInventario.exactitudUbicacion,
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
        <Card title={t.sesionInventario.conteos}>
          <Table
            columns={conteoColumns}
            rows={conteosQuery.data ?? []}
            rowKey={(c) => c.id}
            loading={conteosQuery.isLoading}
            emptyTitle={t.sesionInventario.sinConteos}
            emptyDescription={t.sesionInventario.sinConteosDesc}
          />
        </Card>
      </div>

      <div className="mt-6">
        <Card title={t.sesionInventario.diferencias}>
          <Table
            columns={diferenciaColumns}
            rows={diferenciasQuery.data ?? []}
            rowKey={(d) => `${d.ubicacion_id}-${d.producto_id}-${d.lote_id ?? ""}`}
            loading={diferenciasQuery.isLoading}
            emptyTitle={t.sesionInventario.sinDiferencias}
            emptyDescription={t.sesionInventario.sinDiferenciasDesc}
          />
        </Card>
      </div>
    </>
  );
}
