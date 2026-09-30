import { useState } from "react";
import type { UseFormReturn } from "react-hook-form";
import { useT } from "../../shared/i18n";
import { Button, ButtonLink, Card, Field, FormGrid, Icon, Input, useToast } from "../../shared/ui";
import type { FormValues } from "./esquema";
import { osmEmbedUrl } from "./helpers";

/** Coordenadas de la empresa, detección por geolocalización y mapa embebido. */
export function SeccionUbicacion({
  form,
  setError,
}: {
  form: UseFormReturn<FormValues>;
  setError: (mensaje: string | null) => void;
}) {
  const t = useT();
  const { toast } = useToast();
  const [detectando, setDetectando] = useState(false);
  const {
    register,
    watch,
    setValue,
    formState: { errors },
  } = form;

  const latitudTexto = watch("latitud");
  const longitudTexto = watch("longitud");
  const latitud = latitudTexto === "" ? null : Number(latitudTexto);
  const longitud = longitudTexto === "" ? null : Number(longitudTexto);
  const hayCoordenadas =
    latitud !== null && longitud !== null && !Number.isNaN(latitud) && !Number.isNaN(longitud);

  function detectarUbicacion() {
    if (!("geolocation" in navigator)) {
      setError(t.configuracion.sinGeolocalizacion);
      return;
    }
    setDetectando(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setValue("latitud", String(Number(pos.coords.latitude.toFixed(6))), {
          shouldValidate: true,
        });
        setValue("longitud", String(Number(pos.coords.longitude.toFixed(6))), {
          shouldValidate: true,
        });
        setDetectando(false);
        toast(t.configuracion.ubicacionDetectada, "success");
      },
      () => {
        setDetectando(false);
        setError(t.configuracion.noSePudoUbicacion);
      },
      { enableHighAccuracy: true, timeout: 10_000 },
    );
  }

  return (
    <Card title={t.configuracion.ubicacionMapa} className="mt-6">
      <Card.Body>
        <p className="mb-4 text-sm text-gray-600">{t.configuracion.ubicacionIntro}</p>
        <FormGrid columns={2}>
          <Field
            label={t.configuracion.latitud}
            htmlFor="latitud"
            error={errors.latitud?.message}
            help={t.configuracion.latitudAyuda}
          >
            <Input id="latitud" number {...register("latitud")} />
          </Field>
          <Field
            label={t.configuracion.longitud}
            htmlFor="longitud"
            error={errors.longitud?.message}
            help={t.configuracion.longitudAyuda}
          >
            <Input id="longitud" number {...register("longitud")} />
          </Field>
        </FormGrid>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <Button
            type="button"
            variant="secondary"
            disabled={detectando}
            onClick={detectarUbicacion}
          >
            <Icon name="ubicacion" size={16} aria-hidden="true" />
            {detectando ? t.configuracion.detectando : t.configuracion.detectarUbicacion}
          </Button>
          {hayCoordenadas ? (
            <ButtonLink
              variant="ghost"
              href={`https://www.google.com/maps?q=${latitud},${longitud}`}
            >
              {t.configuracion.abrirGoogleMaps}
            </ButtonLink>
          ) : null}
        </div>
        {hayCoordenadas ? (
          <div className="mt-4 overflow-hidden rounded-lg border border-gray-200">
            <iframe
              title={t.configuracion.mapaSucursal}
              src={osmEmbedUrl(latitud, longitud)}
              className="h-72 w-full"
              loading="lazy"
              sandbox="allow-scripts allow-popups"
            />
          </div>
        ) : (
          <p className="mt-4 text-xs text-gray-500">{t.configuracion.agregaCoordenadas}</p>
        )}
      </Card.Body>
    </Card>
  );
}
