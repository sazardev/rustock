import type { Control, FieldArrayWithId } from "react-hook-form";
import { useT } from "../../shared/i18n";
import type { Producto, SubTipoMovimiento, TipoMovimiento } from "../../shared/types";
import { Button, Card, ErrorPanel } from "../../shared/ui";
import { LINEA_VACIA, type FormValues } from "./tipos";
import { LineaFields } from "./LineaFields";

/** Tarjeta "Líneas": error de guardado, filas de línea y botón de agregar. */
export function LineasMovimiento({
  control,
  fields,
  tipo,
  subTipo,
  productos,
  ubicaciones,
  esEdicion,
  error,
  onAdd,
  onRemove,
}: {
  control: Control<FormValues>;
  fields: Array<FieldArrayWithId<FormValues, "lineas", "id">>;
  tipo: TipoMovimiento;
  subTipo: SubTipoMovimiento | "";
  productos: Producto[];
  ubicaciones: Array<{ id: string; codigo: string }>;
  esEdicion: boolean;
  error: string | null;
  onAdd: (linea: FormValues["lineas"][number]) => void;
  onRemove: (index: number) => void;
}) {
  const t = useT();
  return (
    <Card title={t.movForm.lineas}>
      <Card.Body>
        {error ? (
          <ErrorPanel
            title={esEdicion ? t.movForm.errores.noSePudoGuardar : t.movForm.errores.noSePudoCrear}
            className="mb-4"
          >
            {error}
          </ErrorPanel>
        ) : null}
        {fields.map((field, index) => (
          <LineaFields
            key={field.id}
            control={control}
            index={index}
            tipo={tipo}
            subTipo={subTipo}
            productos={productos}
            ubicaciones={ubicaciones}
            onRemove={() => onRemove(index)}
            canRemove={fields.length > 1}
          />
        ))}
        <Button
          type="button"
          variant="secondary"
          size="sm"
          icon="agregar"
          onClick={() => onAdd(LINEA_VACIA)}
        >
          {t.comun.agregarLinea}
        </Button>
      </Card.Body>
    </Card>
  );
}
