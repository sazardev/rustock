import { useQuery } from "@tanstack/react-query";
import type { UseFormReturn } from "react-hook-form";
import { listarTemas } from "../../shared/backend";
import { useT } from "../../shared/i18n";
import { useTema } from "../../shared/tema";
import { PATH } from "../../app/route-paths";
import { ButtonLink, Card, Field, FormGrid, ModoPicker, PaletaPicker } from "../../shared/ui";
import type { FormValues } from "./esquema";

/** Paleta y modo de color de la empresa, con vista previa inmediata. */
export function SeccionApariencia({ form }: { form: UseFormReturn<FormValues> }) {
  const t = useT();
  const { watch, setValue } = form;
  const temasQuery = useQuery({
    queryKey: ["temas"],
    queryFn: listarTemas,
    staleTime: Infinity,
  });

  return (
    <Card title={t.configuracion.apariencia} className="mt-6">
      <Card.Body>
        <p className="mb-4 text-sm text-gray-600">
          {t.configuracion.aparienciaIntro}{" "}
          <ButtonLink variant="link" href={PATH.perfil}>
            {t.configuracion.miPerfil}
          </ButtonLink>
          .
        </p>
        <FormGrid columns={1}>
          <Field label={t.configuracion.paleta} htmlFor="paleta" help={t.configuracion.paletaAyuda}>
            <PaletaPicker
              temas={temasQuery.data ?? []}
              seleccionado={watch("tema_id")}
              onSeleccionar={(id) => {
                setValue("tema_id", id, { shouldValidate: true });
                void useTema.getState().previsualizar(id, watch("modo_oscuro"));
              }}
              ariaLabel={t.configuracion.paletaAria}
            />
          </Field>
          <Field label={t.configuracion.modoColor} htmlFor="modo">
            <ModoPicker
              seleccionado={watch("modo_oscuro") ? "OSCURO" : "CLARO"}
              onSeleccionar={(m) => {
                setValue("modo_oscuro", m === "OSCURO", { shouldValidate: true });
                void useTema.getState().previsualizar(watch("tema_id"), m === "OSCURO");
              }}
              ariaLabel={t.configuracion.modoColorAria}
            />
          </Field>
        </FormGrid>
      </Card.Body>
    </Card>
  );
}
