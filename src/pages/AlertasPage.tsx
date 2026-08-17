import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ignorarAlerta, listarAlertas } from "../shared/backend";
import type { Alerta, EstadoAlerta } from "../shared/types";
import {
  Badge,
  Button,
  Card,
  ErrorPanel,
  PageHeader,
  Select,
  Table,
  useToast,
  type TableColumn,
} from "../shared/ui";
import {
  LoteRef,
  MovimientoRef,
  ProductoRef,
  SesionInventarioRef,
  UbicacionRef,
} from "../shared/refs";
import {
  ESTADO_ALERTA_LABEL,
  ESTADO_ALERTA_TONE,
  SEVERIDAD_ALERTA_TONE,
  TIPO_ALERTA_LABEL,
  formatearFecha,
  mensajeError,
} from "../shared/format";

const ESTADOS: Array<{ value: EstadoAlerta; label: string }> = [
  { value: "ABIERTA", label: "Abiertas" },
  { value: "RESUELTA", label: "Resueltas" },
  { value: "IGNORADA", label: "Archivadas" },
];

/** Cómo se resuelve de verdad cada alerta (SPEC §17.2): la resolución es la
 * acción de negocio que elimina la causa, no el botón. */
const GUIA_RESOLUCION: Record<string, string> = {
  STOCK_BAJO: "registra una entrada o sube el stock mínimo del producto",
  STOCK_EXCEDIDO: "registra una salida o sube el stock máximo del producto",
  UBICACION_SOBRECAPACIDAD: "traslada stock fuera de la ubicación",
  LOTE_POR_VENCER: "da salida al lote antes del vencimiento",
  LOTE_VENCIDO: "da de baja el lote por merma o ajuste",
  DIFERENCIA_INVENTARIO: "cierra o concilia la sesión de inventario",
  MOVIMIENTO_PENDIENTE: "aprueba el movimiento pendiente",
};

/** Enlaza la entidad de la alerta a su página de detalle para actuar sobre
 * la causa raíz (DESIGN §5.5: todo dato identificable es un enlace). */
function AlertaEntidadRef({ entidad, entidadId }: { entidad: string; entidadId: string | null }) {
  if (!entidadId) return <span>{entidad}</span>;
  switch (entidad) {
    case "producto":
      return <ProductoRef id={entidadId} />;
    case "lote":
      return <LoteRef id={entidadId} />;
    case "ubicacion":
      return <UbicacionRef id={entidadId} />;
    case "movimiento":
      return <MovimientoRef id={entidadId} />;
    case "inventario":
      return <SesionInventarioRef id={entidadId} />;
    default:
      return <span>{entidad}</span>;
  }
}

export function AlertasPage() {
  const [estado, setEstado] = useState<EstadoAlerta>("ABIERTA");
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const alertasQuery = useQuery({
    queryKey: ["alertas", estado],
    queryFn: () => listarAlertas(estado),
  });

  function invalidar() {
    queryClient.invalidateQueries({ queryKey: ["alertas"] });
  }

  const ignorarMut = useMutation({
    mutationFn: (id: string) => ignorarAlerta(id),
    onSuccess: (_, id) => {
      // Quita la alerta de la lista al instante (feedback inmediato) y luego
      // recarga desde el backend para confirmar el estado real.
      queryClient.setQueryData<Alerta[]>(["alertas", "ABIERTA"], (old) =>
        (old ?? []).filter((a) => a.id !== id),
      );
      invalidar();
      const alerta = (alertasQuery.data ?? []).find((a) => a.id === id);
      const guia = alerta ? GUIA_RESOLUCION[alerta.tipo] : undefined;
      toast(
        guia
          ? `Alerta archivada: ya no aparecerá en "Abiertas". Para resolverla de raíz, ${guia}.`
          : 'Alerta archivada: ya no aparecerá en "Abiertas".',
        "success",
      );
    },
    onError: (err) => toast(mensajeError(err), "error"),
  });

  const columns: Array<TableColumn<Alerta>> = [
    {
      key: "tipo",
      header: "Tipo",
      render: (a) => (
        <Badge tone={SEVERIDAD_ALERTA_TONE[a.severidad]} icon="alerta">
          {TIPO_ALERTA_LABEL[a.tipo] ?? a.tipo}
        </Badge>
      ),
    },
    {
      key: "entidad",
      header: "Entidad",
      render: (a) => <AlertaEntidadRef entidad={a.entidad} entidadId={a.entidad_id} />,
    },
    { key: "detalle", header: "Detalle", render: (a) => a.detalle ?? "—" },
    { key: "severidad", header: "Severidad", render: (a) => a.severidad },
    {
      key: "fecha_deteccion",
      header: "Detectada",
      render: (a) => formatearFecha(a.fecha_deteccion),
    },
    {
      key: "estado",
      header: "Estado",
      render: (a) => (
        <Badge tone={ESTADO_ALERTA_TONE[a.estado]}>{ESTADO_ALERTA_LABEL[a.estado]}</Badge>
      ),
    },
  ];

  return (
    <>
      <PageHeader
        title="Alertas"
        description="Avisos de stock, vencimientos y movimientos pendientes."
      />

      {alertasQuery.error ? (
        <ErrorPanel title="No se pudieron cargar las alertas">
          {mensajeError(alertasQuery.error)}
        </ErrorPanel>
      ) : null}

      <Card
        actions={
          <Select
            aria-label="Filtrar por estado"
            value={estado}
            onChange={(e) => setEstado(e.target.value as EstadoAlerta)}
          >
            {ESTADOS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </Select>
        }
      >
        <Table
          columns={columns}
          rows={alertasQuery.data ?? []}
          rowKey={(a) => a.id}
          loading={alertasQuery.isLoading}
          emptyTitle="Sin alertas en este estado"
          emptyDescription="Los niveles de stock están dentro de los umbrales configurados."
          actions={
            estado === "ABIERTA"
              ? (a) => (
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      icon="anular"
                      onClick={() => ignorarMut.mutate(a.id)}
                      disabled={ignorarMut.isPending}
                    >
                      Archivar
                    </Button>
                  </div>
                )
              : undefined
          }
        />
      </Card>
    </>
  );
}
