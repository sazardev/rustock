import { useQuery } from "@tanstack/react-query";
import { puedo } from "../../shared/backend";
import { usePreferencias } from "../../shared/preferencias";

/**
 * Ofrece "aprobar de inmediato" cuando la política de la empresa no exige
 * aprobación (`requiere_aprobacion = false`) y el usuario puede aprobar
 * (`movimiento:aprobar`, SPEC §4.3/§4.4). El backend sigue validando en la
 * aprobación real; este toggle solo encadena crear + aprobar.
 */
export function useOfrecerAprobar() {
  const requiereAprobacion = usePreferencias((s) => s.resueltas?.requiere_aprobacion);
  const puedoAprobar = useQuery({
    queryKey: ["puedo", "movimiento", "aprobar"],
    queryFn: () => puedo("movimiento", "aprobar"),
  });
  return Boolean(requiereAprobacion === false && puedoAprobar.data);
}
