import { memo } from "react";
import { useQuery } from "@tanstack/react-query";
import { listarAlertas, listarRoles } from "../../shared/backend";
import { puedeCon, useSession } from "../../shared/session";
import {
  AlertsIndicator,
  SelectorIdioma,
  Topbar,
  TopbarNavToggle,
  TopbarScan,
  TopbarUser,
} from "../../shared/ui";
import { useT } from "../../shared/i18n";
import { PATH } from "../route-paths";
import { SmartBreadcrumbs } from "../SmartBreadcrumbs";
import { PaletteTrigger } from "./PaletteTrigger";

interface BarraSuperiorProps {
  navAbierta: boolean;
  onAbrirNavegacion: () => void;
}

/** Barra superior del shell. Es `memo` y trae sus propios datos (alertas,
 * roles, permisos): colapsar el sidebar o abrir el drawer no la reconstruye. */
export const BarraSuperior = memo(function BarraSuperior({
  navAbierta,
  onAbrirNavegacion,
}: BarraSuperiorProps) {
  const t = useT();
  const usuario = useSession((s) => s.usuario);
  const permisos = useSession((s) => s.permisos);

  const { data: alertasAbiertas } = useQuery({
    queryKey: ["alertas", "ABIERTA"],
    queryFn: () => listarAlertas("ABIERTA"),
    enabled: Boolean(usuario),
    refetchInterval: 60_000,
  });

  const { data: roles } = useQuery({
    queryKey: ["roles"],
    queryFn: listarRoles,
    enabled: Boolean(usuario),
    staleTime: 5 * 60_000,
  });

  if (!usuario) {
    return null;
  }
  // Solo para mostrar el nombre del rol junto al avatar. Lo que se puede hacer
  // ya no se deduce de aquí: el permiso viene del backend, no del código de rol.
  const rolCodigo = roles?.find((r) => r.id === usuario.rol_id)?.codigo;
  const puedeEscanear = puedeCon(permisos, "escaneo", "usar");

  return (
    <Topbar
      navToggle={
        <TopbarNavToggle
          expanded={navAbierta}
          ariaLabel={t.shell.abrirNavegacion}
          onClick={onAbrirNavegacion}
        />
      }
      breadcrumbs={<SmartBreadcrumbs />}
      search={<PaletteTrigger />}
      scan={
        <>
          <SelectorIdioma />
          {puedeEscanear ? <TopbarScan href={PATH.escanear} /> : null}
        </>
      }
      alerts={<AlertsIndicator count={alertasAbiertas?.length ?? 0} href={PATH.alertas} />}
      user={
        <TopbarUser
          name={usuario.nombre_completo}
          role={rolCodigo ? (t.roles[rolCodigo as keyof typeof t.roles] ?? rolCodigo) : undefined}
          href={PATH.perfil}
          avatarOnly
        />
      }
    />
  );
});
