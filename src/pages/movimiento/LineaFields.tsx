import { Controller, useWatch, type Control } from "react-hook-form";
import { useT } from "../../shared/i18n";
import type { Producto, SubTipoMovimiento, TipoMovimiento } from "../../shared/types";
import { Button, Field, FormGrid, Input, Select } from "../../shared/ui";
import { catalogoNuevo } from "../../app/route-paths";
import { CrearRapido } from "../../shared/creacion-rapida";
import { requiereDestino, requiereOrigen } from "./reglas";
import type { FormValues } from "./tipos";
import { LoteSelect } from "./LoteSelect";
import { CampoConCrear } from "./CampoConCrear";

interface LineaFieldsProps {
  control: Control<FormValues>;
  index: number;
  tipo: TipoMovimiento;
  subTipo: SubTipoMovimiento | "";
  productos: Producto[];
  ubicaciones: Array<{ id: string; codigo: string }>;
  onRemove: () => void;
  canRemove: boolean;
}

export function LineaFields({
  control,
  index,
  tipo,
  subTipo,
  productos,
  ubicaciones,
  onRemove,
  canRemove,
}: LineaFieldsProps) {
  const t = useT();
  const productoId = useWatch({ control, name: `lineas.${index}.producto_id` });
  const producto = productos.find((p) => p.id === productoId);

  return (
    <div className="mb-4 rounded-md border border-gray-200 p-4">
      <FormGrid columns={2}>
        <Field label={t.campos.producto} required>
          <CampoConCrear
            crear={
              <CrearRapido campo="producto_id" rutaNueva={catalogoNuevo("productos")}>
                {t.comun.nuevoProducto}
              </CrearRapido>
            }
          >
            <Controller
              control={control}
              name={`lineas.${index}.producto_id`}
              render={({ field }) => (
                <Select
                  {...field}
                  aria-label={t.campos.producto}
                  placeholder={t.movForm.seleccionaProducto}
                >
                  {productos.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.sku} — {p.nombre}
                    </option>
                  ))}
                </Select>
              )}
            />
          </CampoConCrear>
        </Field>

        {producto?.controla_lote ? (
          <Field label={t.campos.lote} required>
            <CampoConCrear
              crear={
                <CrearRapido campo="lote_id" rutaNueva={catalogoNuevo("lotes")}>
                  {t.comun.nuevoLote}
                </CrearRapido>
              }
            >
              <Controller
                control={control}
                name={`lineas.${index}.lote_id`}
                render={({ field }) => <LoteSelect productoId={productoId} {...field} />}
              />
            </CampoConCrear>
          </Field>
        ) : null}

        <Field label={t.comun.cantidad} required>
          <Controller
            control={control}
            name={`lineas.${index}.cantidad`}
            render={({ field }) => <Input {...field} type="number" min="0" step="1" number />}
          />
        </Field>

        {requiereOrigen(tipo, subTipo) ? (
          <Field label={t.movForm.ubicacionOrigen} required>
            <CampoConCrear
              crear={
                <CrearRapido campo="origen_ubicacion_id" rutaNueva={catalogoNuevo("ubicaciones")}>
                  {t.comun.nuevaUbicacion}
                </CrearRapido>
              }
            >
              <Controller
                control={control}
                name={`lineas.${index}.origen_ubicacion_id`}
                render={({ field }) => (
                  <Select
                    {...field}
                    aria-label={t.movForm.ubicacionOrigen}
                    placeholder={t.movForm.seleccionaOrigen}
                  >
                    {ubicaciones.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.codigo}
                      </option>
                    ))}
                  </Select>
                )}
              />
            </CampoConCrear>
          </Field>
        ) : null}

        {requiereDestino(tipo, subTipo) ? (
          <Field label={t.movForm.ubicacionDestino} required>
            <CampoConCrear
              crear={
                <CrearRapido campo="destino_ubicacion_id" rutaNueva={catalogoNuevo("ubicaciones")}>
                  {t.comun.nuevaUbicacion}
                </CrearRapido>
              }
            >
              <Controller
                control={control}
                name={`lineas.${index}.destino_ubicacion_id`}
                render={({ field }) => (
                  <Select
                    {...field}
                    aria-label={t.movForm.ubicacionDestino}
                    placeholder={t.movForm.seleccionaDestino}
                  >
                    {ubicaciones.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.codigo}
                      </option>
                    ))}
                  </Select>
                )}
              />
            </CampoConCrear>
          </Field>
        ) : null}
      </FormGrid>

      {canRemove ? (
        <Button type="button" variant="ghost" size="sm" icon="eliminar" onClick={onRemove}>
          {t.comun.quitarLinea}
        </Button>
      ) : null}
    </div>
  );
}
