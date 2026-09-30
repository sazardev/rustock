import type { RefObject } from "react";
import type { UseMutationResult } from "@tanstack/react-query";
import { useT } from "../../shared/i18n";
import type { ArchivoEmpresa } from "../../shared/types";
import { Button, ButtonLink, Card, Icon } from "../../shared/ui";
import { formatearTamano } from "./helpers";

export function DocumentosCard({
  documentos,
  inputRef,
  subida,
  eliminar,
}: {
  documentos: ArchivoEmpresa[];
  inputRef: RefObject<HTMLInputElement | null>;
  subida: UseMutationResult<unknown, Error, File>;
  eliminar: UseMutationResult<unknown, Error, string>;
}) {
  const t = useT();
  return (
    <Card title={t.configuracion.documentosEmpresa} className="mt-6">
      <Card.Body>
        <input
          ref={inputRef}
          type="file"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) subida.mutate(file);
          }}
        />
        <Button
          type="button"
          variant="secondary"
          disabled={subida.isPending}
          onClick={() => inputRef.current?.click()}
        >
          <Icon name="agregar" size={16} aria-hidden="true" />
          {subida.isPending ? t.configuracion.subiendo : t.configuracion.subirDocumento}
        </Button>
        <p className="mt-2 text-xs text-gray-500">{t.configuracion.documentosAyuda}</p>
        {documentos.length > 0 ? (
          <ul className="mt-4 divide-y divide-gray-100 rounded-lg border border-gray-200">
            {documentos.map((doc) => (
              <li key={doc.id} className="flex items-center gap-3 px-4 py-2">
                <Icon name="nota" size={16} aria-hidden="true" />
                <span className="flex-1 font-mono text-sm text-gray-700">{doc.nombre}</span>
                <span className="text-xs text-gray-500">{formatearTamano(doc.tamano)}</span>
                <ButtonLink variant="ghost" href={`/configuracion/archivos/${doc.id}/ver`}>
                  {t.comun.ver}
                </ButtonLink>
                <Button
                  type="button"
                  variant="ghost"
                  disabled={eliminar.isPending}
                  onClick={() => eliminar.mutate(doc.id)}
                >
                  {t.comun.eliminar}
                </Button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-4 text-sm text-gray-500">{t.configuracion.sinDocumentos}</p>
        )}
      </Card.Body>
    </Card>
  );
}
