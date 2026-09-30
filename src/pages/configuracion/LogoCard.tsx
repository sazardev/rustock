import type { RefObject } from "react";
import type { UseMutationResult } from "@tanstack/react-query";
import { useT } from "../../shared/i18n";
import type { ArchivoEmpresaCompleto } from "../../shared/types";
import { Button, Card, Icon } from "../../shared/ui";

export function LogoCard({
  logo,
  inputRef,
  subida,
}: {
  logo: ArchivoEmpresaCompleto | null | undefined;
  inputRef: RefObject<HTMLInputElement | null>;
  subida: UseMutationResult<unknown, Error, File>;
}) {
  const t = useT();
  return (
    <Card title={t.configuracion.logoEmpresa} className="mt-6">
      <Card.Body>
        <div className="flex items-center gap-6">
          {logo ? (
            <img
              src={`data:${logo.mime};base64,${logo.datos_base64}`}
              alt={t.configuracion.logoEmpresa}
              className="h-20 w-20 rounded-lg border border-gray-200 object-contain"
            />
          ) : (
            <div className="flex h-20 w-20 items-center justify-center rounded-lg border border-dashed border-gray-300 text-gray-400">
              <Icon name="caja" size={24} aria-hidden="true" />
            </div>
          )}
          <div>
            <input
              ref={inputRef}
              type="file"
              accept="image/png,image/jpeg,image/svg+xml"
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
              {subida.isPending
                ? t.configuracion.subiendo
                : logo
                  ? t.configuracion.cambiarLogo
                  : t.configuracion.subirLogo}
            </Button>
            <p className="mt-2 text-xs text-gray-500">{t.configuracion.logoAyuda}</p>
          </div>
        </div>
      </Card.Body>
    </Card>
  );
}
