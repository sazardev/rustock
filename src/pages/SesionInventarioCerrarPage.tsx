import { useState } from "react";
import { useT } from "../shared/i18n";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate, useParams } from "react-router";
import {
  cerrarSesionInventario,
  diferenciasSesion,
  obtenerSesionInventario,
} from "../shared/backend";
import type { DiferenciaInventario } from "../shared/types";
import {
  Badge,
  Button,
  Card,
  ErrorPanel,
  Link,
  PageHeader,
  Table,
  type TableColumn,
} from "../shared/ui";
import { ProductoRef, UbicacionRef } from "../shared/refs";
import { PATH, sesionInventarioDetalle } from "../app/route-paths";
import { TIPO_DIFERENCIA_TONE, mensajeError } from "../shared/format";

export function SesionInventarioCerrarPage() {
  const t = useT();
  const { id } = useParams<{ id: string }>();
  const sesionId = id as string;
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [error, setError] = useState<string | null>(null);

  const sesionQuery = useQuery({
    queryKey: ["sesion-inventario", sesionId],
    queryFn: () => obtenerSesionInventario(sesionId),
  });
  const diferenciasQuery = useQuery({
    queryKey: ["diferencias-sesion", sesionId],
    queryFn: () => diferenciasSesion(sesionId),
  });

  const cerrarMut = useMutation({
    mutationFn: () => cerrarSesionInventario(sesionId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sesion-inventario", sesionId] });
      queryClient.invalidateQueries({ queryKey: ["sesiones-inventario"] });
      navigate(sesionInventarioDetalle(sesionId));
    },
    onError: (err) => setError(mensajeError(err)),
  });

  const sesion = sesionQuery.data;
  const diferenciasNoConciliadas = (diferenciasQuery.data ?? []).filter(
    (d) => d.tipo !== "conciliado",
  );

  const columns: Array<TableColumn<DiferenciaInventario>> = [
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
      header: t.cierreInventario.saldoSistema,
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
      header: t.cierreInventario.ajusteQueSeGenerara,
      render: (d) => (
        <Badge tone={TIPO_DIFERENCIA_TONE[d.tipo]}>
          {d.tipo === "sobrante"
            ? t.cierreInventario.entradaPorAjuste
            : t.cierreInventario.salidaPorAjuste}{" "}
          ({t.dominio.tipoDiferencia[d.tipo]})
        </Badge>
      ),
    },
  ];

  if (sesionQuery.isLoading) {
    return <PageHeader title={t.cierreInventario.titulo} description={t.comun.cargando} />;
  }

  if (!sesion) {
    return (
      <ErrorPanel title={t.cierreInventario.noEncontrada}>
        <Link href={PATH.inventario}>Volver al listado</Link>
      </ErrorPanel>
    );
  }

  const puedeCerrar = sesion.estado === "EN_CURSO";

  return (
    <>
      <PageHeader title={`Cerrar sesión ${sesion.numero}`} description={t.cierreInventario.aviso} />

      {!puedeCerrar ? (
        <ErrorPanel title={t.cierreInventario.noSePuedeCerrar}>
          Esta sesión está en estado {t.dominio.estadoSesion[sesion.estado]}; solo las sesiones
          EN_CURSO pueden cerrarse.
        </ErrorPanel>
      ) : null}

      {error ? (
        <ErrorPanel title={t.cierreInventario.noSePudoCerrar} className="mt-4">
          {error}
        </ErrorPanel>
      ) : null}

      <div className="mt-4">
        <Card title={t.cierreInventario.diferencias}>
          <Table
            columns={columns}
            rows={diferenciasNoConciliadas}
            rowKey={(d) => `${d.ubicacion_id}-${d.producto_id}-${d.lote_id ?? ""}`}
            loading={diferenciasQuery.isLoading}
            emptyTitle={t.cierreInventario.sinDiferencias}
            emptyDescription={t.cierreInventario.sinDiferenciasDesc}
          />
        </Card>
      </div>

      <div className="mt-6 flex gap-3">
        <Button
          variant="primary"
          icon="cerrar"
          onClick={() => cerrarMut.mutate()}
          disabled={!puedeCerrar || cerrarMut.isPending}
        >
          {cerrarMut.isPending ? "Cerrando…" : t.cierreInventario.titulo}
        </Button>
        <Link href={sesionInventarioDetalle(sesionId)}>{t.comun.cancelar}</Link>
      </div>
    </>
  );
}
