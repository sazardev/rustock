/**
 * Tarjeta reutilizable para editar la posición en el mapa (pos_x/pos_y/
 * pos_z/altura) desde el formulario de Zona/Rack/Pasillo/Ubicación, sin
 * necesidad de arrastrar en `AlmacenMapaPage`. Guarda con su propia
 * mutación `moverX`, deliberadamente aislada del submit de datos de
 * negocio (mismo criterio que separó `mover_x` de `editar_x` en el backend).
 *
 * `tamanio` (opcional) habilita ancho/profundidad + rotar 90° para los
 * tipos redimensionables del modo construcción (zona/pasillo/rack).
 */
import { type ChangeEvent, useEffect, useState } from "react";
import { Button, Card, Field, FormActions, FormGrid, Input } from "./ui";

export interface PosicionValores {
  pos_x: number | null;
  pos_y: number | null;
  pos_z: number | null;
  altura: number | null;
  ancho?: number;
  profundidad?: number;
}

export function PosicionFormCard({
  valores,
  onGuardar,
  guardando,
  tamanio = false,
}: {
  valores: PosicionValores;
  onGuardar: (v: PosicionValores) => void;
  guardando: boolean;
  /** Muestra ancho/profundidad y la acción Rotar 90°. */
  tamanio?: boolean;
}) {
  const [local, setLocal] = useState(valores);

  useEffect(() => {
    setLocal(valores);
  }, [valores]);

  const campo = (clave: keyof PosicionValores) => ({
    value: local[clave] ?? "",
    onChange: (e: ChangeEvent<HTMLInputElement>) => {
      const bruto = e.target.value;
      setLocal((prev) => ({ ...prev, [clave]: bruto === "" ? undefined : Number(bruto) }));
    },
  });

  /** Rotar 90° alrededor del centro: intercambia ancho/profundidad y
   * reubica la esquina para que el centro quede donde estaba. */
  const rotar = () => {
    if (local.pos_x === null || local.pos_y === null || !tamanio) return;
    const ancho = local.ancho ?? 0;
    const profundidad = local.profundidad ?? 0;
    if (ancho <= 0 || profundidad <= 0) return;
    const cx = local.pos_x + ancho / 2;
    const cy = local.pos_y + profundidad / 2;
    setLocal((prev) => ({
      ...prev,
      pos_x: cx - profundidad / 2,
      pos_y: cy - ancho / 2,
      ancho: profundidad,
      profundidad: ancho,
    }));
  };

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
          <Field label="Z" htmlFor="pos_z" help="Para el mapa 3D (apilado vertical).">
            <Input id="pos_z" type="number" step="any" number {...campo("pos_z")} />
          </Field>
          <Field label="Altura" htmlFor="altura" help="Para el mapa 3D.">
            <Input id="altura" type="number" step="any" number {...campo("altura")} />
          </Field>
          {tamanio ? (
            <>
              <Field label="Ancho" htmlFor="mapa_ancho">
                <Input id="mapa_ancho" type="number" step="any" number {...campo("ancho")} />
              </Field>
              <Field label="Profundidad" htmlFor="mapa_profundidad">
                <Input
                  id="mapa_profundidad"
                  type="number"
                  step="any"
                  number
                  {...campo("profundidad")}
                />
              </Field>
            </>
          ) : null}
        </FormGrid>
        <FormActions>
          {tamanio ? (
            <Button
              type="button"
              variant="secondary"
              icon="rotar"
              disabled={guardando}
              onClick={rotar}
            >
              Rotar 90°
            </Button>
          ) : null}
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
