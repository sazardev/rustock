import { useState } from "react";
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
import {
  ESTADO_SESION_LABEL,
  TIPO_DIFERENCIA_LABEL,
  TIPO_DIFERENCIA_TONE,
  mensajeError,
} from "../shared/format";

export function SesionInventarioCerrarPage() {
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
      header: "Ubicación",
      render: (d) => <UbicacionRef id={d.ubicacion_id} />,
    },
    { key: "producto_id", header: "Producto", render: (d) => <ProductoRef id={d.producto_id} /> },
    { key: "saldo_sistema", header: "Saldo sistema", num: true, render: (d) => d.saldo_sistema },
    { key: "cantidad_contada", header: "Contado", num: true, render: (d) => d.cantidad_contada },
    { key: "diferencia", header: "Diferencia", num: true, render: (d) => d.diferencia },
    {
      key: "tipo",
      header: "Ajuste que se generará",
      render: (d) => (
        <Badge tone={TIPO_DIFERENCIA_TONE[d.tipo]}>
          {d.tipo === "sobrante" ? "Entrada por ajuste" : "Salida por ajuste"} (
          {TIPO_DIFERENCIA_LABEL[d.tipo]})
        </Badge>
      ),
    },
  ];

  if (sesionQuery.isLoading) {
    return <PageHeader title="Cerrar sesión" description="Cargando…" />;
  }

  if (!sesion) {
    return (
      <ErrorPanel title="Sesión no encontrada">
        <Link href={PATH.inventario}>Volver al listado</Link>
      </ErrorPanel>
    );
  }

  const puedeCerrar = sesion.estado === "EN_CURSO";

  return (
    <>
      <PageHeader
        title={`Cerrar sesión ${sesion.numero}`}
        description="Al cerrar, se generan automáticamente los ajustes de las diferencias detectadas. Una vez cerrada, la sesión no admite más conteos."
      />

      {!puedeCerrar ? (
        <ErrorPanel title="No se puede cerrar">
          Esta sesión está en estado {ESTADO_SESION_LABEL[sesion.estado]}; solo las sesiones
          EN_CURSO pueden cerrarse.
        </ErrorPanel>
      ) : null}

      {error ? (
        <ErrorPanel title="No se pudo cerrar la sesión" className="mt-4">
          {error}
        </ErrorPanel>
      ) : null}

      <div className="mt-4">
        <Card title="Diferencias que generarán ajustes al cerrar">
          <Table
            columns={columns}
            rows={diferenciasNoConciliadas}
            rowKey={(d) => `${d.ubicacion_id}-${d.producto_id}-${d.lote_id ?? ""}`}
            loading={diferenciasQuery.isLoading}
            emptyTitle="Sin diferencias pendientes"
            emptyDescription="Todos los conteos coinciden con el saldo del sistema; no se generará ningún ajuste."
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
          {cerrarMut.isPending ? "Cerrando…" : "Cerrar sesión"}
        </Button>
        <Link href={sesionInventarioDetalle(sesionId)}>Cancelar</Link>
      </div>
    </>
  );
}
