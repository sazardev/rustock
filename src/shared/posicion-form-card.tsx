/**
 * Tarjeta reutilizable para editar la posición en el mapa (pos_x/pos_y/
 * pos_z/altura) desde el formulario de Zona/Rack/Pasillo/Ubicación, sin
 * necesidad de arrastrar en `AlmacenMapaPage`. Guarda con su propia
 * mutación `moverX`, deliberadamente aislada del submit de datos de
 * negocio (mismo criterio que separó `mover_x` de `editar_x` en el backend).
 */
import { type ChangeEvent, useEffect, useState } from "react";
import { Button, Card, Field, FormActions, FormGrid, Input } from "./ui";

export interface PosicionValores {
  pos_x: number | null;
  pos_y: number | null;
  pos_z: number | null;
  altura: number | null;
}

export function PosicionFormCard({
  valores,
  onGuardar,
  guardando,
}: {
  valores: PosicionValores;
  onGuardar: (v: PosicionValores) => void;
  guardando: boolean;
}) {
  const [local, setLocal] = useState(valores);

  useEffect(() => {
    setLocal(valores);
  }, [valores]);

  const campo = (clave: keyof PosicionValores) => ({
    value: local[clave] ?? "",
    onChange: (e: ChangeEvent<HTMLInputElement>) => {
      const bruto = e.target.value;
      setLocal((prev) => ({ ...prev, [clave]: bruto === "" ? null : Number(bruto) }));
    },
  });

  return (
    <Card title="Posición en el mapa" className="mt-6">
      <Card.Body>
        <FormGrid columns={2}>
          <Field label="X" htmlFor="pos_x">
            <Input id="pos_x" type="number" step="any" number {...campo("pos_x")} />
          </Field>
          <Field label="Y" htmlFor="pos_y">
            <Input id="pos_y" type="number" step="any" number {...campo("pos_y")} />
          </Field>
          <Field label="Z" htmlFor="pos_z" help="Para el futuro mapa 3D (apilado vertical).">
            <Input id="pos_z" type="number" step="any" number {...campo("pos_z")} />
          </Field>
          <Field label="Altura" htmlFor="altura" help="Para el futuro mapa 3D.">
            <Input id="altura" type="number" step="any" number {...campo("altura")} />
          </Field>
        </FormGrid>
        <FormActions>
          <Button
            type="button"
            variant="secondary"
            disabled={guardando}
            onClick={() => onGuardar(local)}
          >
            {guardando ? "Guardando…" : "Guardar posición"}
          </Button>
        </FormActions>
      </Card.Body>
    </Card>
  );
}
