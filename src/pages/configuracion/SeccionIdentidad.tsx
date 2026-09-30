import type { UseFormReturn } from "react-hook-form";
import { useT } from "../../shared/i18n";
import { PAISES } from "../../shared/types";
import { Card, Field, FormGrid, Input, Select, Textarea } from "../../shared/ui";
import type { FormValues } from "./esquema";

/** Datos generales, fiscales y de contacto de la empresa. */
export function SeccionIdentidad({ form }: { form: UseFormReturn<FormValues> }) {
  const t = useT();
  const { register } = form;

  return (
    <>
      <Card title={t.configuracion.datosEmpresa}>
        <Card.Body>
          <FormGrid columns={2}>
            <Field label={t.comun.nombre} htmlFor="nombre">
              <Input id="nombre" {...register("nombre")} />
            </Field>
            <Field label={t.comun.codigo} htmlFor="codigo" help={t.configuracion.codigoAyuda}>
              <Input id="codigo" code {...register("codigo")} />
            </Field>
            <Field label={t.campos.pais} htmlFor="pais" help={t.configuracion.paisAyuda}>
              <Select id="pais" placeholder={t.configuracion.seleccionaPais} {...register("pais")}>
                {PAISES.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label={t.campos.ciudad} htmlFor="ciudad">
              <Input id="ciudad" {...register("ciudad")} />
            </Field>
            <Field label={t.configuracion.direccionSucursal} htmlFor="direccion">
              <Input id="direccion" {...register("direccion")} />
            </Field>
            <Field label={t.configuracion.codigoPostal} htmlFor="codigo_postal">
              <Input id="codigo_postal" code {...register("codigo_postal")} />
            </Field>
            <Field label={t.comun.descripcion} htmlFor="descripcion" className="lg:col-span-2">
              <Textarea id="descripcion" rows={2} {...register("descripcion")} />
            </Field>
          </FormGrid>
        </Card.Body>
      </Card>

      <Card title={t.configuracion.datosFiscales} className="mt-6">
        <Card.Body>
          <FormGrid columns={2}>
            <Field
              label={t.configuracion.razonSocial}
              htmlFor="razon_social"
              help={t.configuracion.razonSocialAyuda}
            >
              <Input id="razon_social" {...register("razon_social")} />
            </Field>
            <Field
              label={t.configuracion.documentoFiscal}
              htmlFor="documento_fiscal"
              help={t.configuracion.documentoFiscalAyuda}
            >
              <Input id="documento_fiscal" code {...register("documento_fiscal")} />
            </Field>
            <Field
              label={t.configuracion.direccionFiscal}
              htmlFor="direccion_fiscal"
              className="lg:col-span-2"
            >
              <Input id="direccion_fiscal" {...register("direccion_fiscal")} />
            </Field>
          </FormGrid>
        </Card.Body>
      </Card>

      <Card title={t.configuracion.contacto} className="mt-6">
        <Card.Body>
          <FormGrid columns={2}>
            <Field label={t.configuracion.telefono} htmlFor="telefono">
              <Input id="telefono" code {...register("telefono")} />
            </Field>
            <Field label={t.configuracion.emailContacto} htmlFor="email_contacto">
              <Input id="email_contacto" type="email" {...register("email_contacto")} />
            </Field>
            <Field label={t.configuracion.sitioWeb} htmlFor="sitio_web">
              <Input id="sitio_web" {...register("sitio_web")} />
            </Field>
          </FormGrid>
        </Card.Body>
      </Card>
    </>
  );
}
