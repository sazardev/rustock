import { useRef } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  eliminarArchivoEmpresa,
  listarArchivosEmpresa,
  obtenerLogoEmpresa,
  subirArchivoEmpresa,
} from "../../shared/backend";
import { mensajeError } from "../../shared/format";
import { useT } from "../../shared/i18n";
import { useToast } from "../../shared/ui";
import { fileToBase64 } from "./helpers";

/** Logo y documentos de la empresa: consultas, subida y eliminación. */
export function useArchivosEmpresa(
  habilitado: boolean,
  setError: (mensaje: string | null) => void,
) {
  const t = useT();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const logoInputRef = useRef<HTMLInputElement | null>(null);
  const docInputRef = useRef<HTMLInputElement | null>(null);

  const logoQuery = useQuery({
    queryKey: ["archivo-logo"],
    queryFn: obtenerLogoEmpresa,
    enabled: habilitado,
  });
  const docsQuery = useQuery({
    queryKey: ["archivos-empresa"],
    queryFn: listarArchivosEmpresa,
    enabled: habilitado,
  });

  const logoSubida = useMutation({
    mutationFn: async (file: File) => {
      const datos_base64 = await fileToBase64(file, t.configuracion.noSePudoLeerArchivo);
      return subirArchivoEmpresa({
        nombre: file.name,
        tipo: "LOGO",
        mime: file.type || "application/octet-stream",
        datos_base64,
      });
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["archivo-logo"] });
      toast(t.configuracion.logoActualizado, "success");
      if (logoInputRef.current) logoInputRef.current.value = "";
    },
    onError: (err) => setError(mensajeError(err)),
  });

  const docSubida = useMutation({
    mutationFn: async (file: File) => {
      const datos_base64 = await fileToBase64(file, t.configuracion.noSePudoLeerArchivo);
      return subirArchivoEmpresa({
        nombre: file.name,
        tipo: "DOCUMENTO",
        mime: file.type || "application/octet-stream",
        datos_base64,
      });
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["archivos-empresa"] });
      toast(t.configuracion.documentoSubido, "success");
      if (docInputRef.current) docInputRef.current.value = "";
    },
    onError: (err) => setError(mensajeError(err)),
  });

  const docEliminar = useMutation({
    mutationFn: (id: string) => eliminarArchivoEmpresa(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["archivos-empresa"] });
      toast(t.configuracion.documentoEliminado, "success");
    },
    onError: (err) => setError(mensajeError(err)),
  });

  const documentos = (docsQuery.data ?? []).filter((a) => a.tipo === "DOCUMENTO");

  return { logoInputRef, docInputRef, logoQuery, logoSubida, docSubida, docEliminar, documentos };
}
