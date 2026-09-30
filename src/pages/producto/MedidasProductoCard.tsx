/** Sección "Medidas" del formulario de producto: largo/ancho/alto opcionales en cm. */
import type { UseFormRegisterReturn } from "react-hook-form";
import { useT } from "../../shared/i18n";
import { Card, Field, FormGrid, Input } from "../../shared/ui";
import type { ClaveMedida } from "./medidas-producto";

interface Props {
  /** `register` del formulario padre, acotado a las tres medidas. */
  register: (nombre: ClaveMedida) => UseFormRegisterReturn;
  errors: Partial<Record<ClaveMedida, { message?: string }>>;
}

export function MedidasProductoCard({ register, errors }: Props) {
  const t = useT();
  const p = t.formularios.producto;
  const campos: { clave: ClaveMedida; etiqueta: string }[] = [
    { clave: "largo_cm", etiqueta: p.largoCm },
    { clave: "ancho_cm", etiqueta: p.anchoCm },
    { clave: "alto_cm", etiqueta: p.altoCm },
  ];
  return (
    <Card title={p.medidas}>
      <Card.Body>
        <p className="mb-4 text-sm text-muted">{p.medidasAyuda}</p>
        <FormGrid columns={2}>
          {campos.map(({ clave, etiqueta }) => (
            <Field key={clave} label={etiqueta} htmlFor={clave} error={errors[clave]?.message}>
              <Input id={clave} type="number" step="any" min="0" number {...register(clave)} />
            </Field>
          ))}
        </FormGrid>
      </Card.Body>
    </Card>
  );
}
