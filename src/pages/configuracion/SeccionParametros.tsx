import type { UseFormReturn } from "react-hook-form";
import { useT } from "../../shared/i18n";
import { ZONAS_HORARIAS, type FormatoFecha } from "../../shared/types";
import { Card, Field, FormGrid, Input, Select } from "../../shared/ui";
import type { FormValues } from "./esquema";

/** Parámetros generales (zona, formato, avisos, stock) y política de aprobación. */
export function SeccionParametros({ form }: { form: UseFormReturn<FormValues> }) {
  const t = useT();
  const {
    register,
    formState: { errors },
  } = form;

  return (
    <>
      <Card title={t.configuracion.parametrosGenerales} className="mt-6">
        <Card.Body>
          <FormGrid columns={2}>
            <Field
              label={t.configuracion.zonaHoraria}
              htmlFor="zona_horaria"
              required
              error={errors.zona_horaria?.message}
              help={t.configuracion.zonaHorariaAyuda}
            >
              <Select
                id="zona_horaria"
                options={ZONAS_HORARIAS.map((z) => ({
                  value: z,
                  label: t.perfil.zonasHorarias[z as keyof typeof t.perfil.zonasHorarias] ?? z,
                }))}
                {...register("zona_horaria")}
              />
            </Field>
            <Field
              label={t.configuracion.formatoFecha}
              htmlFor="formato_fecha"
              required
              error={errors.formato_fecha?.message}
              help={t.configuracion.formatoFechaAyuda}
            >
              <Select
                id="formato_fecha"
                options={(Object.keys(t.perfil.formatosFecha) as FormatoFecha[]).map((k) => ({
                  value: k,
                  label: t.perfil.formatosFecha[k],
                }))}
                {...register("formato_fecha")}
              />
            </Field>
            <Field
              label={t.configuracion.diasAvisoVencimiento}
              htmlFor="dias_aviso_vencimiento"
              required
              error={errors.dias_aviso_vencimiento?.message}
              help={t.configuracion.diasAvisoAyuda}
            >
              <Input
                id="dias_aviso_vencimiento"
                number
                min={0}
                {...register("dias_aviso_vencimiento")}
              />
            </Field>
            <Field
              label={t.configuracion.stockMinimoDefecto}
              htmlFor="stock_minimo_default"
              error={errors.stock_minimo_default?.message}
              help={t.configuracion.stockMinimoAyuda}
            >
              <Input
                id="stock_minimo_default"
                number
                min={0}
                placeholder={t.configuracion.sinValor}
                {...register("stock_minimo_default")}
              />
            </Field>
          </FormGrid>
        </Card.Body>
      </Card>

      <Card title={t.configuracion.politicaOperacion} className="mt-6">
        <Card.Body>
          <label className="flex items-start gap-3">
            <input type="checkbox" className="mt-1" {...register("requiere_aprobacion")} />
            <span>
              <span className="block text-sm font-medium text-gray-700">
                {t.configuracion.requerirAprobacion}
              </span>
              <span className="block text-xs text-gray-500">
                {t.configuracion.requerirAprobacionAyuda}
              </span>
            </span>
          </label>
        </Card.Body>
      </Card>
    </>
  );
}
