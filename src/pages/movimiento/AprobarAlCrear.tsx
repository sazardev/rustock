import { useT } from "../../shared/i18n";
import { Checkbox, Text } from "../../shared/ui";

export function AprobarAlCrear({
  id,
  esEdicion,
  checked,
  onChange,
  leyenda,
}: {
  id: string;
  esEdicion: boolean;
  checked: boolean;
  onChange: (valor: boolean) => void;
  leyenda: string;
}) {
  const t = useT();
  return (
    <div className="mb-4">
      <Checkbox
        id={id}
        label={esEdicion ? t.movForm.aprobarAlGuardar : t.movForm.crearYAprobar}
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
      />
      <Text size="xs" color="muted" as="p">
        {leyenda}
      </Text>
    </div>
  );
}
