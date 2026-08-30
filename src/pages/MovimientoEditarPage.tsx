import { useQuery } from "@tanstack/react-query";
import { useParams } from "react-router";
import { listarLineasMovimiento, obtenerMovimiento } from "../shared/backend";
import { esPaginado } from "../shared/types";
import { ErrorPanel, Link, PageHeader } from "../shared/ui";
import { PATH } from "../app/route-paths";
import { MovimientoGenericoForm, TrasladoForm } from "./movimiento-form";
import { useSession } from "../shared/session";
import { useT } from "../shared/i18n";

/**
 * Página de edición de un movimiento (SPEC §6.2): solo los que están en
 * `BORRADOR`/`PENDIENTE_APROBACION` pueden editarse y solo por su creador
 * (lo valida el backend). El tipo/sub-tipo/número son estables; se actualizan
 * los campos operativos y las líneas. Ruta: `/movimientos/:id/editar`.
 */
export function MovimientoEditarPage() {
  const t = useT();
  const { id = "" } = useParams();
  const sesion = useSession((s) => s.usuario);

  const movQuery = useQuery({
    queryKey: ["movimiento", id],
    queryFn: () => obtenerMovimiento(id),
  });
  const lineasQuery = useQuery({
    queryKey: ["movimiento-lineas", id],
    queryFn: () => listarLineasMovimiento(id, { page_size: -1 }),
  });

  if (movQuery.isLoading) {
    return <PageHeader title={t.movimientoAcciones.editarTitulo} description="Cargando…" />;
  }

  const movimiento = movQuery.data;
  if (!movimiento) {
    return (
      <ErrorPanel title={t.movimientoDetalle.noEncontrado}>
        No se encontró el movimiento solicitado.{" "}
        <Link href={PATH.movimientos}>Volver al listado</Link>.
      </ErrorPanel>
    );
  }

  const lineas = lineasQuery.data && esPaginado(lineasQuery.data) ? lineasQuery.data.data : [];

  const esCreador = Boolean(sesion && movimiento.created_by === sesion.id);
  const estadoEditable =
    movimiento.estado === "BORRADOR" || movimiento.estado === "PENDIENTE_APROBACION";
  if (!estadoEditable || !esCreador) {
    return (
      <ErrorPanel title={t.movimientoAcciones.noSePuedeEditar}>
        Solo el creador puede editar un movimiento en estado borrador o pendiente de aprobación.{" "}
        <Link href={PATH.movimientos}>Volver al listado</Link>.
      </ErrorPanel>
    );
  }

  return (
    <>
      <PageHeader
        title={`Editar ${movimiento.numero}`}
        description={t.movimientoAcciones.soloBorrador}
      />
      {movimiento.tipo === "TRASLADO" ? (
        <TrasladoForm movimiento={movimiento} linea={lineas[0]} />
      ) : (
        <MovimientoGenericoForm
          tipo={movimiento.tipo}
          movimiento={movimiento}
          lineasIniciales={lineas}
        />
      )}
    </>
  );
}
