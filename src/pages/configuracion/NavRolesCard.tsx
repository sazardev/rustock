import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { guardarConfiguracionEmpresa, listarRoles } from "../../shared/backend";
import { useT } from "../../shared/i18n";
import { usePreferencias } from "../../shared/preferencias";
import { cn } from "../../shared/lib/cn";
import { Button, Card, Icon, useToast } from "../../shared/ui";
import type { ConfiguracionEmpresa, NavConfig } from "../../shared/types";
import { navDe } from "../../app/nav";

interface NavRolesCardProps {
  config: ConfiguracionEmpresa | undefined;
}

/** Defaults de navegación por rol: el ADMIN elige qué secciones ve cada rol. */
export function NavRolesCard({ config }: NavRolesCardProps) {
  const t = useT();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { data: roles } = useQuery({ queryKey: ["roles"], queryFn: listarRoles });
  const grupos = useMemo(() => navDe(t), [t]);

  const [rol, setRol] = useState<string | null>(null);
  const [ocultas, setOcultas] = useState<Record<string, string[]>>({});

  useEffect(() => {
    const mapa: Record<string, string[]> = {};
    for (const [codigo, cfg] of Object.entries(config?.nav_roles ?? {})) {
      mapa[codigo] = cfg.secciones.ocultas;
    }
    setOcultas(mapa);
  }, [config]);

  useEffect(() => {
    if (!rol && roles?.length) setRol(roles[0].codigo);
  }, [roles, rol]);

  const guardar = useMutation({
    mutationFn: () => {
      const nav_roles: Record<string, NavConfig> = {};
      for (const [codigo, ids] of Object.entries(ocultas)) {
        nav_roles[codigo] = {
          fijados: [],
          ocultos: [],
          orden: [],
          secciones: { ocultas: ids, orden: [], visibles: [] },
        };
      }
      return guardarConfiguracionEmpresa({ nav_roles });
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["configuracion-empresa"] });
      void queryClient.invalidateQueries({ queryKey: ["preferencias"] });
      void usePreferencias.getState().refrescar();
      toast(t.shell.navRolesGuardar, "success");
    },
    onError: (error: Error) => toast(error.message, "error"),
  });

  const ids = rol ? (ocultas[rol] ?? []) : [];

  function alternar(id: string) {
    if (!rol) return;
    const actuales = new Set(ids);
    if (actuales.has(id)) actuales.delete(id);
    else actuales.add(id);
    setOcultas((mapa) => ({ ...mapa, [rol]: [...actuales] }));
  }

  return (
    <Card title={t.shell.navRolesTitulo} className="mt-6">
      <Card.Body>
        <p className="text-sm text-gray-500 mb-4">{t.shell.navRolesDesc}</p>
        <div className="flex flex-wrap gap-2 mb-4">
          {(roles ?? []).map((item) => (
            <button
              key={item.id}
              type="button"
              className={cn("btn btn--sm", rol === item.codigo ? "btn--secondary" : "btn--ghost")}
              aria-pressed={rol === item.codigo}
              onClick={() => setRol(item.codigo)}
            >
              {t.roles[item.codigo as keyof typeof t.roles] ?? item.codigo}
            </button>
          ))}
        </div>
        <div className="flex flex-col gap-1">
          {grupos.map((grupo, indice) => {
            const id = `g${indice}`;
            const oculto = ids.includes(id);
            return (
              <button
                key={id}
                type="button"
                className="flex items-center justify-between gap-3 min-h-[var(--tap-target)] px-3 rounded-md text-sm text-left hover:bg-gray-100"
                aria-pressed={!oculto}
                onClick={() => alternar(id)}
              >
                <span>{grupo.title}</span>
                <span className="flex items-center gap-2 text-xs text-gray-500">
                  <Icon name={oculto ? "ocultar" : "ver"} size={14} aria-hidden="true" />
                  {oculto ? t.shell.navRolesOculta : t.shell.navRolesVisible}
                </span>
              </button>
            );
          })}
        </div>
        <div className="mt-4">
          <Button
            type="button"
            variant="secondary"
            icon="aprobar"
            disabled={guardar.isPending}
            onClick={() => guardar.mutate()}
          >
            {t.shell.navRolesGuardar}
          </Button>
        </div>
      </Card.Body>
    </Card>
  );
}
