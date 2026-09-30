import { useEffect, useMemo } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { guardarConfiguracionEmpresa, obtenerConfiguracionEmpresa } from "../../shared/backend";
import { mensajeError } from "../../shared/format";
import { usePreferencias } from "../../shared/preferencias";
import { useT } from "../../shared/i18n";
import { useToast } from "../../shared/ui";
import {
  cargaDesde,
  esquemaDe,
  VALORES_POR_DEFECTO,
  valoresDesde,
  type FormValues,
} from "./esquema";

/** Consulta de la configuración, formulario (zod) y mutación de guardado. */
export function useConfiguracionFormulario(setError: (mensaje: string | null) => void) {
  const t = useT();
  const esquema = useMemo(() => esquemaDe(t), [t]);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: config, isLoading } = useQuery({
    queryKey: ["configuracion-empresa"],
    queryFn: obtenerConfiguracionEmpresa,
    retry: false,
  });

  const form = useForm<FormValues>({
    resolver: zodResolver(esquema),
    defaultValues: VALORES_POR_DEFECTO,
  });
  const { reset } = form;

  useEffect(() => {
    if (config) {
      reset(valoresDesde(config));
    }
  }, [config, reset]);

  const guardarMut = useMutation({
    mutationFn: (v: FormValues) => guardarConfiguracionEmpresa(cargaDesde(v)),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["configuracion-empresa"] });
      // Si el ADMIN no tiene preferencia propia, su tema hereda de la empresa:
      // se recargan las preferencias para re-aplicar la apariencia al instante.
      void usePreferencias.getState().refrescar();
      toast(t.configuracion.guardada, "success");
    },
    onError: (err) => setError(mensajeError(err)),
  });

  return { config, isLoading, form, guardarMut };
}
