import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ignorarAlerta, listarAlertas, resolverAlerta } from "../shared/backend";
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
  { value: "IGNORADA", label: "Ignoradas" },
];

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

  const resolverMut = useMutation({
    mutationFn: (id: string) => resolverAlerta(id),
    onSuccess: () => {
      invalidar();
      toast("Alerta marcada como resuelta.", "success");
    },
    onError: (err) => toast(mensajeError(err), "error"),
  });

  const ignorarMut = useMutation({
    mutationFn: (id: string) => ignorarAlerta(id),
    onSuccess: () => {
      invalidar();
      toast("Alerta ignorada.", "success");
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
    { key: "entidad", header: "Entidad", render: (a) => a.entidad },
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
                      icon="aprobar"
                      onClick={() => resolverMut.mutate(a.id)}
                      disabled={resolverMut.isPending || ignorarMut.isPending}
                    >
                      Resolver
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      icon="cerrar"
                      onClick={() => ignorarMut.mutate(a.id)}
                      disabled={resolverMut.isPending || ignorarMut.isPending}
                    >
                      Ignorar
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
