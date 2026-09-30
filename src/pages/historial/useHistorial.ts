import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { listarHistorial, listarUsuarios, metricasActividad } from "../../shared/backend";
import { formatearFecha } from "../../shared/format";
import { esPaginado } from "../../shared/types";
import { PAGE_SIZE } from "./formato";

/** Filtros de periodo (métricas) + filtros de la tabla de eventos. */
export interface FiltrosHistorial {
  desde: string;
  hasta: string;
  usuarioId: string;
  tipoEvento: string;
  modulo: string;
  resultado: string;
  comando: string;
}

const FILTROS_INICIALES: FiltrosHistorial = {
  desde: "",
  hasta: "",
  usuarioId: "",
  tipoEvento: "",
  modulo: "",
  resultado: "",
  comando: "",
};

/** Datos, filtros y paginación del centro de actividad. */
export function useHistorial() {
  const [filtros, setFiltros] = useState<FiltrosHistorial>(FILTROS_INICIALES);
  const [page, setPage] = useState(1);
  const { desde, hasta, usuarioId, tipoEvento, modulo, resultado, comando } = filtros;

  const cambiarFiltro = <K extends keyof FiltrosHistorial>(
    clave: K,
    valor: FiltrosHistorial[K],
  ) => {
    setFiltros((f) => ({ ...f, [clave]: valor }));
    setPage(1);
  };

  const usuariosQuery = useQuery({
    queryKey: ["usuarios", "historial"],
    queryFn: () => listarUsuarios({ page_size: -1, sort: "nombre_usuario" }),
  });
  const usuarios = useMemo(
    () => (usuariosQuery.data && esPaginado(usuariosQuery.data) ? usuariosQuery.data.data : []),
    [usuariosQuery.data],
  );
  const usuarioPorId = useMemo(() => new Map(usuarios.map((u) => [u.id, u])), [usuarios]);

  const metricasQuery = useQuery({
    queryKey: ["metricas-actividad", { desde, hasta, usuarioId }],
    queryFn: () =>
      metricasActividad({
        desde: desde ? `${desde}T00:00:00` : undefined,
        hasta: hasta ? `${hasta}T23:59:59` : undefined,
        usuario_id: usuarioId || undefined,
      }),
  });
  const metricas = metricasQuery.data;

  const tablaQuery = useQuery({
    queryKey: [
      "historial",
      { desde, hasta, usuarioId, tipoEvento, modulo, resultado, comando, page },
    ],
    queryFn: () =>
      listarHistorial({
        desde: desde ? `${desde}T00:00:00` : undefined,
        hasta: hasta ? `${hasta}T23:59:59` : undefined,
        usuario_id: usuarioId || undefined,
        tipo_evento: tipoEvento || undefined,
        modulo: modulo || undefined,
        exito: resultado === "" ? undefined : resultado === "EXITO",
        comando: comando.trim() || undefined,
        page,
        page_size: PAGE_SIZE,
      }),
  });
  const listado = tablaQuery.data && esPaginado(tablaQuery.data) ? tablaQuery.data : null;
  const eventos = useMemo(() => listado?.data ?? [], [listado?.data]);

  // Lista de módulos disponibles para el filtro (de las métricas o la tabla).
  const modulosDisponibles = useMemo(() => {
    const deMetricas = (metricas?.por_modulo ?? []).map((m) => m.modulo);
    const deTabla = eventos.map((e) => e.modulo ?? "").filter(Boolean);
    return [...new Set([...deMetricas, ...deTabla])].toSorted((a, b) => a.localeCompare(b));
  }, [metricas?.por_modulo, eventos]);

  const filasExport = useMemo(
    () =>
      eventos.map((e) => ({
        fecha: formatearFecha(e.timestamp),
        tipo: e.tipo_evento,
        usuario: e.usuario_id
          ? (usuarioPorId.get(e.usuario_id)?.nombre_usuario ?? e.usuario_id)
          : "",
        modulo: e.modulo ?? "",
        accion: e.comando ?? e.accion,
        entidad: e.entidad,
        ruta: e.ruta ?? "",
        proceso: e.proceso ?? "",
        nivel: e.nivel,
        resultado: e.exito ? "Éxito" : "Error",
        duracion_ms: e.duracion_ms ?? e.duracion_vista_ms ?? "",
        tenant: e.tenant ?? "",
      })),
    [eventos, usuarioPorId],
  );

  return {
    filtros,
    cambiarFiltro,
    setPage,
    usuarios,
    usuarioPorId,
    metricas,
    eventos,
    meta: listado?.meta ?? null,
    modulosDisponibles,
    filasExport,
    error: metricasQuery.error ?? tablaQuery.error,
    loading: metricasQuery.isLoading || tablaQuery.isLoading,
    tablaLoading: tablaQuery.isLoading,
  };
}
